<?php

declare(strict_types=1);

require_once __DIR__ . '/AccountDeletionService.php';
require_once __DIR__ . '/PatientArchive.php';
require_once __DIR__ . '/../DbSchemaCache.php';

/**
 * Durées de conservation (registre RGPD) appliquées chaque mois par cron/data-retention.php :
 *  - conversations de l'assistant : supprimées 1 an après le dernier message ;
 *  - comptes patients sans aucun soin (ni RDV ni document) : avertis 30 jours avant les 3 ans d'inactivité,
 *    puis supprimés ;
 *  - dossiers avec des soins : archivés après 5 ans sans activité (connexion, RDV, document), réactivés à la
 *    reprise d'activité, supprimés 15 ans après l'archivage (20 ans au total).
 * Une suppression est refusée tant qu'un RDV, un abonnement ou une commande est en cours.
 * Les dossiers des proches suivent le titulaire et ne sont jamais traités seuls.
 */
final class DataRetentionService
{
    public const INACTIVE_ACCOUNT_YEARS = 3;
    public const WARNING_DAYS = 30;
    public const ACTIVE_DOSSIER_YEARS = 5;
    public const ARCHIVE_YEARS = 15;

    public function __construct(
        private PDO $db,
        private User $users,
        private Email $email,
        private AccountDeletionService $deletion,
    ) {
    }

    /**
     * @return array{assistant_conversations: int, warned: int, warn_failed: int, deleted_accounts: int,
     *   deletion_skipped: int, archived: int, restored: int, purged_dossiers: int}
     */
    public function run(DateTimeImmutable $now, bool $apply): array
    {
        $result = [
            'assistant_conversations' => $this->purgeAssistantConversations($now, $apply),
            'warned' => 0,
            'warn_failed' => 0,
            'deleted_accounts' => 0,
            'deletion_skipped' => 0,
            'archived' => 0,
            'restored' => 0,
            'purged_dossiers' => 0,
        ];
        if (!DbSchemaCache::tableHasColumn($this->db, 'profiles', 'last_active_at')) {
            return $result;
        }
        $this->processAccountsWithoutCare($now, $apply, $result);
        if (PatientArchive::isAvailable($this->db)) {
            $this->processDossiers($now, $apply, $result);
        }

        return $result;
    }

    private function purgeAssistantConversations(DateTimeImmutable $now, bool $apply): int
    {
        if (!DbSchemaCache::tableExists($this->db, 'assistant_conversations')) {
            return 0;
        }
        $cutoff = $now->modify('-1 year')->format('Y-m-d H:i:s');
        if (!$apply) {
            $stmt = $this->db->prepare('SELECT COUNT(*) FROM assistant_conversations WHERE updated_at < ?');
            $stmt->execute([$cutoff]);

            return (int) $stmt->fetchColumn();
        }
        // Les messages suivent (ON DELETE CASCADE).
        $stmt = $this->db->prepare('DELETE FROM assistant_conversations WHERE updated_at < ?');
        $stmt->execute([$cutoff]);

        return $stmt->rowCount();
    }

    /** Comptes sans soin : avertissement à 3 ans moins 30 jours, suppression 30 jours après. */
    private function processAccountsWithoutCare(DateTimeImmutable $now, bool $apply, array &$result): void
    {
        $deadline = $now->modify('-' . self::INACTIVE_ACCOUNT_YEARS . ' years');
        $warnFrom = $deadline->modify('+' . self::WARNING_DAYS . ' days');
        $warnedBefore = $now->modify('-' . self::WARNING_DAYS . ' days');
        $withoutCare = 'NOT (' . $this->careHistorySql() . ')';

        foreach ($this->owners("p.last_active_at < ? AND p.retention_warned_at IS NULL AND {$withoutCare}", [$warnFrom]) as $patientId) {
            if (!$apply) {
                $result['warned']++;
                continue;
            }
            $email = $this->users->getDecryptedEmail($patientId);
            $deletionDate = $now->modify('+' . self::WARNING_DAYS . ' days')->format('d/m/Y');
            if ($email === null || !filter_var($email, FILTER_VALIDATE_EMAIL)
                || !$this->email->sendInactivityDeletionWarning($email, $deletionDate)) {
                // Sans e-mail joignable, le compte est quand même marqué : la suppression a lieu 30 jours plus tard.
                $result['warn_failed']++;
            } else {
                $result['warned']++;
            }
            $this->db->prepare('UPDATE profiles SET retention_warned_at = ?, updated_at = updated_at WHERE id = ?')
                ->execute([$now->format('Y-m-d H:i:s'), $patientId]);
        }

        $toDelete = $this->owners(
            "p.last_active_at < ? AND p.retention_warned_at IS NOT NULL AND p.retention_warned_at <= ? AND {$withoutCare}",
            [$deadline, $warnedBefore]
        );
        foreach ($toDelete as $patientId) {
            $this->deleteAccount($patientId, $apply, $result, 'deleted_accounts');
        }
    }

    /** Dossiers avec soins : archivage à 5 ans sans activité, réactivation, suppression 15 ans après l'archivage. */
    private function processDossiers(DateTimeImmutable $now, bool $apply, array &$result): void
    {
        $activity = $this->lastActivitySql();

        foreach ($this->owners("p.archived_at IS NOT NULL AND {$activity} > p.archived_at", []) as $patientId) {
            $result['restored']++;
            if ($apply) {
                PatientArchive::restore($this->db, $patientId);
            }
        }

        $archiveBefore = $now->modify('-' . self::ACTIVE_DOSSIER_YEARS . ' years');
        foreach ($this->owners('p.archived_at IS NULL AND ' . $this->careHistorySql() . " AND {$activity} < ?", [$archiveBefore]) as $patientId) {
            $result['archived']++;
            if ($apply) {
                PatientArchive::archive($this->db, $patientId, $now);
            }
        }

        $purgeBefore = $now->modify('-' . self::ARCHIVE_YEARS . ' years');
        foreach ($this->owners('p.archived_at IS NOT NULL AND p.archived_at < ?', [$purgeBefore]) as $patientId) {
            if ($apply && !$this->deleteAppointmentDocuments($patientId)) {
                $result['deletion_skipped']++;
                continue;
            }
            $this->deleteAccount($patientId, $apply, $result, 'purged_dossiers');
        }
    }

    private function deleteAccount(string $patientId, bool $apply, array &$result, string $counter): void
    {
        if (!$apply) {
            $result[$counter]++;

            return;
        }
        try {
            $this->deletion->deleteInactivePatientAccount($patientId);
            $result[$counter]++;
        } catch (AccountDeletionDenied $e) {
            // RDV, abonnement ou commande en cours : nouvel essai le mois suivant.
            $result['deletion_skipped']++;
        } catch (Throwable $e) {
            $result['deletion_skipped']++;
            error_log('DataRetentionService: suppression du compte ' . $patientId . ' impossible : ' . $e->getMessage());
        }
    }

    /** Fin de conservation du dossier : documents des RDV du patient (et de ses proches), fichiers compris. */
    private function deleteAppointmentDocuments(string $patientId): bool
    {
        try {
            $stmt = $this->db->prepare('
                SELECT md.id, md.file_path FROM medical_documents md
                INNER JOIN appointments a ON a.id = md.appointment_id
                WHERE a.patient_id = ?
            ');
            $stmt->execute([$patientId]);
            $documents = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
            if ($documents === []) {
                return true;
            }
            $placeholders = implode(',', array_fill(0, count($documents), '?'));
            $this->db->prepare("DELETE FROM medical_documents WHERE id IN ({$placeholders})")->execute(array_keys($documents));
            foreach ($documents as $path) {
                MedicalDocumentsInternal::deleteStoredFile((string) $path);
            }

            return true;
        } catch (Throwable $e) {
            error_log('DataRetentionService: documents du dossier ' . $patientId . ' non supprimés : ' . $e->getMessage());

            return false;
        }
    }

    /** Le patient a un historique de soins : un RDV ou un document médical. */
    private function careHistorySql(): string
    {
        return '(EXISTS (SELECT 1 FROM appointments a WHERE a.patient_id = p.id)
            OR EXISTS (SELECT 1 FROM medical_documents md WHERE md.patient_id = p.id OR md.uploaded_by = p.id))';
    }

    /** Dernière activité : connexion, RDV (création ou date prévue), document. */
    private function lastActivitySql(): string
    {
        return "GREATEST(
            COALESCE(p.last_active_at, p.created_at),
            COALESCE((SELECT MAX(GREATEST(a.created_at, COALESCE(a.scheduled_at, a.created_at))) FROM appointments a WHERE a.patient_id = p.id), '1970-01-01'),
            COALESCE((SELECT MAX(md.created_at) FROM medical_documents md WHERE md.patient_id = p.id OR md.uploaded_by = p.id), '1970-01-01')
        )";
    }

    /**
     * Comptes patients titulaires (hors dossiers de proches) répondant à la condition.
     *
     * @param list<DateTimeImmutable|string> $params
     * @return list<string>
     */
    private function owners(string $condition, array $params): array
    {
        $relativeFilter = DbSchemaCache::tableHasColumn($this->db, 'patient_relatives', 'profile_id')
            ? 'AND p.id NOT IN (SELECT profile_id FROM patient_relatives WHERE profile_id IS NOT NULL)'
            : '';
        $stmt = $this->db->prepare("
            SELECT p.id FROM profiles p
            WHERE p.role = 'patient'
              AND p.last_active_at IS NOT NULL
              AND {$condition}
              {$relativeFilter}
            ORDER BY p.last_active_at
            LIMIT 500
        ");
        $stmt->execute(array_map(
            static fn ($v): string => $v instanceof DateTimeImmutable ? $v->format('Y-m-d H:i:s') : (string) $v,
            $params
        ));

        return array_map('strval', $stmt->fetchAll(PDO::FETCH_COLUMN));
    }
}

<?php

declare(strict_types=1);

require_once __DIR__ . '/AccountDeletionService.php';
require_once __DIR__ . '/../DbSchemaCache.php';

/**
 * Durées de conservation (registre RGPD) appliquées chaque mois par cron/data-retention.php :
 *  - conversations de l'assistant : supprimées 1 an après le dernier message ;
 *  - comptes patients inactifs : avertis 30 jours avant les 3 ans d'inactivité, puis supprimés
 *    (mêmes garde-fous que la suppression par le patient : rien en cours).
 * Les dossiers des proches suivent le compte du titulaire et ne sont jamais traités seuls.
 */
final class DataRetentionService
{
    public const ASSISTANT_RETENTION = '1 YEAR';
    public const INACTIVE_ACCOUNT_YEARS = 3;
    public const WARNING_DAYS = 30;

    public function __construct(
        private PDO $db,
        private User $users,
        private Email $email,
        private AccountDeletionService $deletion,
    ) {
    }

    /**
     * @return array{assistant_conversations: int, warned: int, warn_failed: int, deleted_accounts: int, deletion_skipped: int}
     */
    public function run(DateTimeImmutable $now, bool $apply): array
    {
        return [
            'assistant_conversations' => $this->purgeAssistantConversations($now, $apply),
            ...$this->processInactivePatients($now, $apply),
        ];
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

    /** @return array{warned: int, warn_failed: int, deleted_accounts: int, deletion_skipped: int} */
    private function processInactivePatients(DateTimeImmutable $now, bool $apply): array
    {
        $result = ['warned' => 0, 'warn_failed' => 0, 'deleted_accounts' => 0, 'deletion_skipped' => 0];
        if (!DbSchemaCache::tableHasColumn($this->db, 'profiles', 'last_active_at')) {
            return $result;
        }

        $deadline = $now->modify('-' . self::INACTIVE_ACCOUNT_YEARS . ' years');
        $warnFrom = $deadline->modify('+' . self::WARNING_DAYS . ' days');
        $warnedBefore = $now->modify('-' . self::WARNING_DAYS . ' days');

        foreach ($this->inactivePatients($warnFrom, 'retention_warned_at IS NULL') as $patientId) {
            if (!$apply) {
                $result['warned']++;
                continue;
            }
            $email = $this->users->getDecryptedEmail($patientId);
            $deletionDate = $now->modify('+' . self::WARNING_DAYS . ' days')->format('d/m/Y');
            if ($email === null || !filter_var($email, FILTER_VALIDATE_EMAIL)
                || !$this->email->sendInactivityDeletionWarning($email, $deletionDate)) {
                $result['warn_failed']++;
                // Sans e-mail joignable, le compte est quand même marqué : la suppression a lieu 30 jours plus tard.
            } else {
                $result['warned']++;
            }
            $this->db->prepare('UPDATE profiles SET retention_warned_at = ? WHERE id = ?')
                ->execute([$now->format('Y-m-d H:i:s'), $patientId]);
        }

        $toDelete = $this->inactivePatients(
            $deadline,
            'retention_warned_at IS NOT NULL AND retention_warned_at <= ?',
            [$warnedBefore->format('Y-m-d H:i:s')]
        );
        foreach ($toDelete as $patientId) {
            if (!$apply) {
                $result['deleted_accounts']++;
                continue;
            }
            try {
                $this->deletion->deleteInactivePatientAccount($patientId);
                $result['deleted_accounts']++;
            } catch (AccountDeletionDenied $e) {
                // RDV, abonnement ou commande en cours : on réessaiera le mois suivant.
                $result['deletion_skipped']++;
            } catch (Throwable $e) {
                $result['deletion_skipped']++;
                error_log('DataRetentionService: suppression du compte ' . $patientId . ' impossible : ' . $e->getMessage());
            }
        }

        return $result;
    }

    /**
     * Comptes patients titulaires (hors dossiers de proches) inactifs depuis $inactiveSince.
     *
     * @param list<string> $params
     * @return list<string>
     */
    private function inactivePatients(DateTimeImmutable $inactiveSince, string $condition, array $params = []): array
    {
        $relativeFilter = DbSchemaCache::tableHasColumn($this->db, 'patient_relatives', 'profile_id')
            ? 'AND p.id NOT IN (SELECT profile_id FROM patient_relatives WHERE profile_id IS NOT NULL)'
            : '';
        $stmt = $this->db->prepare("
            SELECT p.id FROM profiles p
            WHERE p.role = 'patient'
              AND p.last_active_at IS NOT NULL
              AND p.last_active_at < ?
              AND {$condition}
              {$relativeFilter}
            ORDER BY p.last_active_at
            LIMIT 500
        ");
        $stmt->execute([$inactiveSince->format('Y-m-d H:i:s'), ...$params]);

        return array_map('strval', $stmt->fetchAll(PDO::FETCH_COLUMN));
    }
}

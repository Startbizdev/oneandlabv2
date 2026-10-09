<?php

declare(strict_types=1);

require_once __DIR__ . '/RelativeProfile.php';
require_once __DIR__ . '/users/PatientProfessionalAccessService.php';

/**
 * Rattrapage après la migration 126 : dossier patient pour chaque proche existant, RDV saisis sur ce dossier
 * ramenés sous le titulaire, puis liens soignant ↔ dossier du proche déduits de ses RDV.
 * Idempotent ; ne supprime aucun lien existant.
 */
final class RelativeProfileBackfill
{
    /** Statuts postérieurs à l'acceptation : l'assigné a pris le RDV en charge. */
    private const ACCEPTED_STATUSES = ['confirmed', 'planned', 'inProgress', 'completed'];

    /** Créateurs de RDV reliés au dossier, comme PatientProfessionalAccessService::linkPatientAccessAfterAppointmentCreate. */
    private const CREATOR_ROLES = ['pro', 'nurse', 'lab', 'subaccount'];

    private const CHUNK = 500;

    /**
     * @return array{
     *     relatives_total: int,
     *     relatives_without_profile: int,
     *     profiles_created: int,
     *     appointments_on_relative_dossier: int,
     *     appointments_normalized: int,
     *     relative_links_missing: int,
     *     relative_links_created: int,
     *     overgranted_owner_links: int
     * }
     */
    public static function run(PDO $db, bool $apply): array
    {
        $relativesTotal = (int) $db->query('SELECT COUNT(*) FROM patient_relatives')->fetchColumn();
        $withoutProfile = $db->query('SELECT id FROM patient_relatives WHERE profile_id IS NULL ORDER BY created_at, id')
            ->fetchAll(PDO::FETCH_COLUMN);

        $profilesCreated = 0;
        if ($apply) {
            foreach ($withoutProfile as $relativeId) {
                RelativeProfile::ensureProfile($db, (string) $relativeId);
                $profilesCreated++;
            }
        }

        $onRelativeDossier = self::countAppointmentsOnRelativeDossier($db);
        $normalized = $apply && $onRelativeDossier > 0 ? self::normalizeAppointmentsOnRelativeDossier($db) : 0;

        $missingLinks = self::missingRelativeLinks($db);
        $linksCreated = 0;
        if ($apply && $missingLinks !== []) {
            $access = new PatientProfessionalAccessService($db);
            foreach ($missingLinks as $link) {
                $access->linkPatientProfessional($link['profile_id'], $link['professional_id'], $link['appointment_id'], $link['source'], true);
            }
            $linksCreated = count($missingLinks) - count(self::missingRelativeLinks($db));
        }

        return [
            'relatives_total' => $relativesTotal,
            'relatives_without_profile' => count($withoutProfile),
            'profiles_created' => $profilesCreated,
            'appointments_on_relative_dossier' => $onRelativeDossier,
            'appointments_normalized' => $normalized,
            'relative_links_missing' => count($missingLinks),
            'relative_links_created' => $linksCreated,
            'overgranted_owner_links' => self::countOvergrantedOwnerLinks($db),
        ];
    }

    /**
     * RDV enregistrés sous le dossier d'un proche (patient_id = profil du proche) avant la normalisation à la création.
     */
    private static function countAppointmentsOnRelativeDossier(PDO $db): int
    {
        return (int) $db->query('
            SELECT COUNT(*) FROM appointments a
            INNER JOIN patient_relatives pr ON pr.profile_id = a.patient_id
        ')->fetchColumn();
    }

    /**
     * Même représentation que RelativeProfile::normalizeSubject : titulaire + relative_id.
     * Un RDV déjà rattaché à un autre proche n'est pas modifié (reste compté).
     */
    private static function normalizeAppointmentsOnRelativeDossier(PDO $db): int
    {
        $stmt = $db->prepare('
            UPDATE appointments a
            INNER JOIN patient_relatives pr ON pr.profile_id = a.patient_id
            SET a.patient_id = pr.patient_id, a.relative_id = pr.id
            WHERE a.relative_id IS NULL OR a.relative_id = pr.id
        ');
        $stmt->execute();

        return $stmt->rowCount();
    }

    /**
     * Soignants des RDV de proches sans lien vers le dossier du proche (dossier déjà créé ou à créer).
     *
     * @return list<array{profile_id: string, professional_id: string, appointment_id: string, source: string}>
     */
    private static function missingRelativeLinks(PDO $db): array
    {
        $accepted = implode(',', array_fill(0, count(self::ACCEPTED_STATUSES), '?'));
        $creatorRoles = implode(',', array_fill(0, count(self::CREATOR_ROLES), '?'));
        $stmt = $db->prepare("
            SELECT a.id, a.status, a.assigned_nurse_id, a.assigned_pro_id, a.assigned_lab_id,
                   CASE WHEN a.created_by_role IN ($creatorRoles) THEN a.created_by ELSE NULL END AS staff_creator_id,
                   a.relative_id, pr.profile_id,
                   (a.status IN ($accepted)) AS accepted
            FROM appointments a
            INNER JOIN patient_relatives pr ON pr.id = a.relative_id AND pr.patient_id = a.patient_id
            ORDER BY a.created_at, a.id
        ");
        $stmt->execute([...self::CREATOR_ROLES, ...self::ACCEPTED_STATUSES]);

        /** @var array<string, array{profile_id: string, professional_id: string, appointment_id: string, source: string}> $links */
        $links = [];
        $profileIds = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $dossier = !empty($row['profile_id']) ? (string) $row['profile_id'] : 'relative:' . (string) $row['relative_id'];
            $candidates = [];
            if ((int) $row['accepted'] === 1) {
                $candidates[(string) ($row['assigned_nurse_id'] ?? '')] = 'appointment_accepted';
                $candidates[(string) ($row['assigned_lab_id'] ?? '')] = 'appointment_accepted';
            }
            $candidates[(string) ($row['assigned_pro_id'] ?? '')] ??= 'appointment_linked';
            $candidates[(string) ($row['staff_creator_id'] ?? '')] ??= 'appointment_linked';
            unset($candidates['']);
            foreach ($candidates as $professionalId => $source) {
                $links[$dossier . '|' . $professionalId] ??= [
                    'profile_id' => $dossier,
                    'professional_id' => (string) $professionalId,
                    'appointment_id' => (string) $row['id'],
                    'source' => $source,
                ];
            }
            if (!empty($row['profile_id'])) {
                $profileIds[(string) $row['profile_id']] = true;
            }
        }

        foreach (array_chunk(array_keys($profileIds), self::CHUNK) as $chunk) {
            $placeholders = implode(',', array_fill(0, count($chunk), '?'));
            $existing = $db->prepare("SELECT patient_id, professional_id FROM patient_professional_access WHERE patient_id IN ($placeholders)");
            $existing->execute($chunk);
            while ($pair = $existing->fetch(PDO::FETCH_ASSOC)) {
                unset($links[$pair['patient_id'] . '|' . $pair['professional_id']]);
            }
        }

        // Soignant supprimé ou non soignant : aucun lien possible (FK / rôle), donc rien à rattraper.
        $professionalIds = array_values(array_unique(array_column($links, 'professional_id')));
        $staff = [];
        foreach (array_chunk($professionalIds, self::CHUNK) as $chunk) {
            $placeholders = implode(',', array_fill(0, count($chunk), '?'));
            $roles = User::patientListStaffRoles();
            $rolePlaceholders = implode(',', array_fill(0, count($roles), '?'));
            $existing = $db->prepare("SELECT id FROM profiles WHERE id IN ($placeholders) AND role IN ($rolePlaceholders)");
            $existing->execute([...$chunk, ...$roles]);
            foreach ($existing->fetchAll(PDO::FETCH_COLUMN) as $id) {
                $staff[(string) $id] = true;
            }
        }

        return array_values(array_filter($links, static fn (array $link): bool => isset($staff[$link['professional_id']])));
    }

    /**
     * Liens titulaire hérités des RDV de proches : le soignant n'a soigné que des proches du titulaire
     * (aucun RDV du titulaire lui-même, pas créateur du dossier). Signalés, jamais supprimés automatiquement.
     */
    private static function countOvergrantedOwnerLinks(PDO $db): int
    {
        $stmt = $db->query("
            SELECT COUNT(*) FROM patient_professional_access ppa
            WHERE ppa.source IN ('appointment_accepted', 'appointment_linked')
              AND EXISTS (
                  SELECT 1 FROM appointments a
                  WHERE a.patient_id = ppa.patient_id AND a.relative_id IS NOT NULL
                    AND ppa.professional_id IN (a.assigned_nurse_id, a.assigned_pro_id, a.assigned_lab_id, a.created_by)
              )
              AND NOT EXISTS (
                  SELECT 1 FROM appointments a
                  WHERE a.patient_id = ppa.patient_id AND a.relative_id IS NULL
                    AND ppa.professional_id IN (a.assigned_nurse_id, a.assigned_pro_id, a.assigned_lab_id, a.created_by)
              )
              AND NOT EXISTS (
                  SELECT 1 FROM profiles p WHERE p.id = ppa.patient_id AND p.created_by = ppa.professional_id
              )
        ");

        return (int) $stmt->fetchColumn();
    }
}

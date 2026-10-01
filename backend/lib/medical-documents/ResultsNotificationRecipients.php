<?php

declare(strict_types=1);

/**
 * Professionnels à notifier quand des résultats sont déposés sur un rendez-vous.
 *
 * Seuls les pros du rendez-vous (créateur au rôle pro, assigned_pro_id) sont retenus,
 * comme pour l'accès direct de MedicalDocumentAccess. Un pro dont le lien avec le patient
 * est masqué par celui-ci (hidden_by_patient = 1) n'est pas notifié.
 */
final class ResultsNotificationRecipients
{
    /**
     * @param array<string, mixed> $appointment patient_id, created_by, created_by_role, assigned_pro_id
     * @return list<string>
     */
    public static function proIds(PDO $db, array $appointment): array
    {
        $candidates = [];
        $creatorId = (string) ($appointment['created_by'] ?? '');
        if ($creatorId !== '' && (string) ($appointment['created_by_role'] ?? '') === 'pro') {
            $candidates[$creatorId] = true;
        }
        $assignedProId = (string) ($appointment['assigned_pro_id'] ?? '');
        if ($assignedProId !== '') {
            $candidates[$assignedProId] = true;
        }
        if ($candidates === []) {
            return [];
        }

        $ids = array_keys($candidates);
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $db->prepare("SELECT id FROM profiles WHERE role = 'pro' AND id IN ($placeholders)");
        $stmt->execute($ids);
        $pros = array_map('strval', $stmt->fetchAll(PDO::FETCH_COLUMN) ?: []);
        if ($pros === []) {
            return [];
        }

        $patientId = (string) ($appointment['patient_id'] ?? '');
        if ($patientId === '') {
            return $pros;
        }
        $placeholders = implode(',', array_fill(0, count($pros), '?'));
        $hiddenStmt = $db->prepare(
            "SELECT professional_id FROM patient_professional_access
             WHERE patient_id = ? AND hidden_by_patient = 1 AND professional_id IN ($placeholders)"
        );
        $hiddenStmt->execute(array_merge([$patientId], $pros));
        $hidden = array_map('strval', $hiddenStmt->fetchAll(PDO::FETCH_COLUMN) ?: []);

        return array_values(array_diff($pros, $hidden));
    }
}

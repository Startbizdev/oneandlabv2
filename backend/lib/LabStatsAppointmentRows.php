<?php
declare(strict_types=1);

/** The dashboard counters need no patient identity, medical form or document decryption. */
final class LabStatsAppointmentRows
{
    public static function load(PDO $db, array $teamIds, bool $statsOnly, callable $loadDetails): array
    {
        $teamIds = array_values(array_unique(array_filter($teamIds, static fn($id) => is_string($id) && $id !== '')));
        if ($teamIds === []) return [];
        $placeholders = implode(',', array_fill(0, count($teamIds), '?'));
        $statement = $db->prepare("SELECT id, type, status, scheduled_at, created_at,
                duration_minutes, started_at, completed_at, assigned_lab_id
            FROM appointments
            WHERE assigned_lab_id IN ($placeholders) AND type = 'blood_test'
                AND merged_into_appointment_id IS NULL
            ORDER BY scheduled_at DESC");
        $statement->execute($teamIds);
        $rows = $statement->fetchAll(PDO::FETCH_ASSOC);
        if ($statsOnly) return $rows;

        $appointments = [];
        foreach ($rows as $row) {
            try {
                $details = $loadDetails($row['id']);
                if ($details) $appointments[] = $details;
            } catch (Exception) {
                // Retain the existing reporting fallback when a historical detail is unreadable.
                $appointments[] = $row;
            }
        }
        return $appointments;
    }
}

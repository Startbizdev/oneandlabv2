<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/CareGapEngine.php';

final class CareGapActionService
{
    private PDO $db;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? health_db();
    }

    /**
     * @return array<string, mixed>
     */
    public function record(string $patientId, string $gapKey, string $actionKey, string $status = 'clicked'): array
    {
        $id = health_uuid();
        $this->db->prepare('
            INSERT INTO care_gap_actions (id, patient_id, gap_key, action_key, status)
            VALUES (?, ?, ?, ?, ?)
        ')->execute([$id, $patientId, $gapKey, $actionKey, $status]);

        if ($status === 'dismissed') {
            $this->db->prepare('
                UPDATE care_gaps SET status = \'dismissed\', resolved_at = NOW() WHERE patient_id = ? AND gap_key = ?
            ')->execute([$patientId, $gapKey]);
        }

        return ['id' => $id, 'gap_key' => $gapKey, 'action_key' => $actionKey, 'status' => $status];
    }

    public function markConverted(string $patientId, string $gapKey, ?string $appointmentId = null): void
    {
        $this->db->prepare('
            UPDATE care_gaps SET status = \'converted\', resolved_at = NOW() WHERE patient_id = ? AND gap_key = ?
        ')->execute([$patientId, $gapKey]);
        $this->db->prepare('
            INSERT INTO care_gap_actions (id, patient_id, gap_key, action_key, status, appointment_id)
            VALUES (?, ?, ?, \'convert\', \'converted\', ?)
        ')->execute([health_uuid(), $patientId, $gapKey, $appointmentId]);
    }
}

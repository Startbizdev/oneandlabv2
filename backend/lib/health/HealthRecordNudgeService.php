<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/HealthRecordService.php';
require_once __DIR__ . '/CareGapEngine.php';
require_once __DIR__ . '/../NotificationService.php';

final class HealthRecordNudgeService
{
    private PDO $db;
    private HealthRecordService $records;
    private CareGapEngine $gaps;
    private NotificationService $notifications;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? health_db();
        $this->records = new HealthRecordService($this->db);
        $this->gaps = new CareGapEngine($this->db);
        $this->notifications = new NotificationService($this->db);
    }

    /**
     * @return array{sent: int, scanned: int}
     */
    public function runDaily(int $limit = 200): array
    {
        $stmt = $this->db->prepare('
            SELECT id FROM profiles WHERE role = \'patient\' ORDER BY updated_at DESC LIMIT ?
        ');
        $stmt->bindValue(1, $limit, PDO::PARAM_INT);
        $stmt->execute();
        $sent = 0;
        $scanned = 0;
        while ($pid = $stmt->fetchColumn()) {
            $scanned++;
            $patientId = (string) $pid;
            try {
                $this->gaps->detectAndSync($patientId);
                $completion = $this->records->getCompletion($patientId);
                if (($completion['percent'] ?? 100) < 70 && $this->hasGap($completion, 'carnet_incomplete_pre_rdv')) {
                    if ($this->sendIfAllowed($patientId, 'carnet_pre_rdv', 'Préparez votre rendez-vous', 'Complétez votre carnet de santé avant votre prochain soin.', 48)) {
                        $sent++;
                    }
                }
                if ($this->hasGap($completion, 'health_sync_stale')) {
                    if ($this->sendIfAllowed($patientId, 'health_sync_stale', 'Synchronisez vos données santé', 'Reconnectez Apple Santé ou Health Connect pour un suivi plus pertinent.', 336)) {
                        $sent++;
                    }
                }
                if ($this->hasGap($completion, 'lipid_panel_unknown')) {
                    if ($this->sendIfAllowed($patientId, 'lipid_gap', 'Suivi suggéré', 'Une information manque dans votre carnet — un bilan pourrait vous être utile.', 720)) {
                        $sent++;
                    }
                }
            } catch (Throwable) {
                continue;
            }
        }

        return ['sent' => $sent, 'scanned' => $scanned];
    }

    /**
     * @param array<string, mixed> $completion
     */
    private function hasGap(array $completion, string $gapKey): bool
    {
        foreach ($completion['open_gaps'] ?? [] as $gap) {
            if (($gap['gap_key'] ?? '') === $gapKey) {
                return true;
            }
        }

        return false;
    }

    private function sendIfAllowed(
        string $patientId,
        string $nudgeKey,
        string $title,
        string $body,
        int $cooldownHours,
    ): bool {
        $check = $this->db->prepare('
            SELECT id FROM health_record_nudges
            WHERE patient_id = ? AND nudge_key = ?
              AND sent_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
            LIMIT 1
        ');
        $check->execute([$patientId, $nudgeKey, $cooldownHours]);
        if ($check->fetchColumn()) {
            return false;
        }
        $this->notifications->createNotification(
            $patientId,
            'health_record_nudge',
            $title,
            $body,
            ['nudge_key' => $nudgeKey],
        );
        $this->db->prepare('
            INSERT INTO health_record_nudges (id, patient_id, nudge_key, channel, sent_at)
            VALUES (?, ?, ?, \'push\', NOW())
        ')->execute([health_uuid(), $patientId, $nudgeKey]);

        return true;
    }
}

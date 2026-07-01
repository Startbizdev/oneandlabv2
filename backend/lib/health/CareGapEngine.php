<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/HealthRecordSchema.php';
require_once __DIR__ . '/HealthPatientProfile.php';
require_once __DIR__ . '/CompletionEngine.php';

final class CareGapEngine
{
    private PDO $db;
    private CompletionEngine $completion;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? health_db();
        $this->completion = new CompletionEngine($this->db);
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function detectAndSync(string $patientId): array
    {
        $gaps = [];
        $profile = $this->loadProfile($patientId);
        $answers = $this->loadAnswersMap($patientId);
        $completion = $this->completion->compute($patientId);
        $age = $this->ageFromBirthDate($profile['birth_date'] ?? null);

        if ($this->answerIsUnknown($answers, 'cholesterol_known') && $age !== null && $age >= 40) {
            $gaps[] = $this->upsertGap($patientId, 'lipid_panel_unknown', ['age' => $age]);
        }

        if (($completion['percent'] ?? 0) < 70 && $this->hasUpcomingAppointmentWithinHours($patientId, 48)) {
            $gaps[] = $this->upsertGap($patientId, 'carnet_incomplete_pre_rdv', [
                'percent' => $completion['percent'],
            ]);
        }

        if (!$this->hasRecentHealthSync($patientId, 14)) {
            $gaps[] = $this->upsertGap($patientId, 'health_sync_stale', []);
        }

        $smoking = $this->answerValue($answers, 'smoking');
        if ($smoking === 'yes' && !$this->hasPreventionAppointmentWithinMonths($patientId, 12)) {
            $gaps[] = $this->upsertGap($patientId, 'smoking_no_followup', []);
        }

        if ($this->hasRecentLabWithoutFollowup($patientId) && !$this->hasUpcomingAppointmentWithinHours($patientId, 720)) {
            $gaps[] = $this->upsertGap($patientId, 'book_followup_lab', []);
        }

        return array_values(array_filter($gaps));
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listOpen(string $patientId): array
    {
        $stmt = $this->db->prepare('
            SELECT gap_key, status, metadata_json, detected_at
            FROM care_gaps WHERE patient_id = ? AND status = \'open\'
            ORDER BY detected_at DESC
        ');
        $stmt->execute([$patientId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $out = [];
        foreach ($rows as $row) {
            $key = (string) ($row['gap_key'] ?? '');
            $meta = HealthRecordSchema::gapMeta($key) ?? [];
            $out[] = [
                'gap_key' => $key,
                'status' => $row['status'],
                'label_fr' => $meta['label_fr'] ?? $key,
                'action' => $meta['action'] ?? null,
                'cta_fr' => $meta['cta_fr'] ?? null,
                'detected_at' => $row['detected_at'],
            ];
        }

        return $out;
    }

    /**
     * @param array<string, mixed> $metadata
     * @return array<string, mixed>
     */
    private function upsertGap(string $patientId, string $gapKey, array $metadata): array
    {
        $meta = HealthRecordSchema::gapMeta($gapKey) ?? [];
        $this->db->prepare('
            INSERT INTO care_gaps (id, patient_id, gap_key, status, metadata_json, detected_at)
            VALUES (?, ?, ?, \'open\', ?, NOW())
            ON DUPLICATE KEY UPDATE
                status = IF(status = \'converted\', status, \'open\'),
                metadata_json = VALUES(metadata_json),
                updated_at = NOW()
        ')->execute([
            health_uuid(),
            $patientId,
            $gapKey,
            json_encode($metadata, JSON_UNESCAPED_UNICODE),
        ]);

        return [
            'gap_key' => $gapKey,
            'status' => 'open',
            'label_fr' => $meta['label_fr'] ?? $gapKey,
            'action' => $meta['action'] ?? null,
            'cta_fr' => $meta['cta_fr'] ?? null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function loadProfile(string $patientId): array
    {
        return HealthPatientProfile::load($this->db, $patientId);
    }

    /**
     * @return array<string, mixed>
     */
    private function loadAnswersMap(string $patientId): array
    {
        $stmt = $this->db->prepare('SELECT question_key, value_json FROM health_record_answers WHERE patient_id = ?');
        $stmt->execute([$patientId]);
        $map = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $decoded = json_decode((string) ($row['value_json'] ?? '{}'), true);
            $map[(string) $row['question_key']] = is_array($decoded) ? $decoded : [];
        }

        return $map;
    }

    /**
     * @param array<string, mixed> $answers
     */
    private function answerIsUnknown(array $answers, string $key): bool
    {
        $v = $this->answerValue($answers, $key);

        return $v === null || $v === '' || $v === 'unknown' || $v === 'je_ne_sais_pas';
    }

    /**
     * @param array<string, mixed> $answers
     */
    private function answerValue(array $answers, string $key): mixed
    {
        $entry = $answers[$key] ?? null;
        if (!is_array($entry)) {
            return null;
        }

        return $entry['value'] ?? null;
    }

    private function ageFromBirthDate(?string $birthDate): ?int
    {
        if ($birthDate === null || trim($birthDate) === '') {
            return null;
        }
        try {
            $bd = new DateTimeImmutable(substr($birthDate, 0, 10));
            $now = new DateTimeImmutable('today');

            return (int) $bd->diff($now)->y;
        } catch (Throwable) {
            return null;
        }
    }

    private function hasUpcomingAppointmentWithinHours(string $patientId, int $hours): bool
    {
        $stmt = $this->db->prepare('
            SELECT COUNT(*) FROM appointments
            WHERE patient_id = ?
              AND status IN (\'pending\', \'confirmed\', \'planned\')
              AND scheduled_at IS NOT NULL
              AND scheduled_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL ? HOUR)
        ');
        $stmt->execute([$patientId, $hours]);

        return (int) $stmt->fetchColumn() > 0;
    }

    private function hasRecentHealthSync(string $patientId, int $days): bool
    {
        $stmt = $this->db->prepare('
            SELECT COUNT(*) FROM health_syncs
            WHERE patient_id = ? AND status = \'completed\'
              AND started_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        ');
        $stmt->execute([$patientId, $days]);

        return (int) $stmt->fetchColumn() > 0;
    }

    private function hasPreventionAppointmentWithinMonths(string $patientId, int $months): bool
    {
        $stmt = $this->db->prepare('
            SELECT COUNT(*) FROM appointments
            WHERE patient_id = ?
              AND status IN (\'completed\', \'confirmed\', \'planned\', \'pending\')
              AND scheduled_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
        ');
        $stmt->execute([$patientId, $months]);

        return (int) $stmt->fetchColumn() > 0;
    }

    private function hasRecentLabWithoutFollowup(string $patientId): bool
    {
        $stmt = $this->db->prepare('
            SELECT COUNT(*) FROM medical_documents
            WHERE patient_id = ? AND document_type = \'resultats\'
              AND created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
        ');
        $stmt->execute([$patientId]);

        return (int) $stmt->fetchColumn() > 0;
    }
}

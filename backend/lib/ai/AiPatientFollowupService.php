<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/../Uuid.php';
require_once __DIR__ . '/../NotificationService.php';
require_once __DIR__ . '/AiBookingService.php';

final class AiPatientFollowupService
{
    private PDO $db;
    private AiBookingService $booking;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? rag_db();
        $this->booking = new AiBookingService();
    }

    public function runDailyScan(int $patientLimit = 200): array
    {
        $runId = Uuid::v4();
        $scanned = 0;
        $created = 0;
        $errors = [];

        $stmt = $this->db->prepare('
            SELECT id FROM profiles WHERE role = \'patient\' ORDER BY updated_at DESC LIMIT ?
        ');
        $stmt->bindValue(1, $patientLimit, PDO::PARAM_INT);
        $stmt->execute();
        $patients = $stmt->fetchAll(PDO::FETCH_COLUMN) ?: [];

        foreach ($patients as $patientId) {
            $scanned++;
            try {
                $created += $this->scanPatient((string) $patientId);
            } catch (Throwable $e) {
                $errors[] = $patientId . ': ' . $e->getMessage();
            }
        }

        $this->db->prepare('
            INSERT INTO ai_agent_runs (id, job_name, patients_scanned, signals_created, error_message, run_at)
            VALUES (?, \'ai-patient-followup\', ?, ?, ?, NOW())
        ')->execute([
            $runId,
            $scanned,
            $created,
            $errors !== [] ? mb_substr(implode('; ', $errors), 0, 500) : null,
        ]);

        return ['patients_scanned' => $scanned, 'signals_created' => $created, 'run_id' => $runId];
    }

    private function scanPatient(string $patientId): int
    {
        $created = 0;
        if ($this->detectLabOverdue($patientId)) {
            $created += $this->createSignal($patientId, 'lab_overdue', [
                'message' => 'Aucun bilan de laboratoire récent dans votre dossier.',
                'months_threshold' => 12,
            ]);
        }
        if ($this->detectNewLabResult($patientId)) {
            $created += $this->createSignal($patientId, 'new_lab_result', [
                'message' => 'Un nouveau résultat de laboratoire est disponible.',
            ]);
        }
        if ($this->detectNoShow($patientId)) {
            $created += $this->createSignal($patientId, 'appointment_no_show', [
                'message' => 'Un rendez-vous récent n\'a pas été honoré.',
            ]);
        }
        if ($this->detectPrescriptionExpiring($patientId)) {
            $created += $this->createSignal($patientId, 'prescription_expiring', [
                'message' => 'Une ordonnance pourrait nécessiter un renouvellement.',
            ]);
        }
        if ($this->detectProfileIncomplete($patientId)) {
            $created += $this->createSignal($patientId, 'profile_incomplete', [
                'message' => 'Votre profil Cary est incomplet.',
            ]);
        }

        return $created;
    }

    private function createSignal(string $patientId, string $type, array $payload): int
    {
        $check = $this->db->prepare('
            SELECT id FROM ai_patient_signals
            WHERE patient_id = ? AND signal_type = ? AND dismissed_at IS NULL AND acted_at IS NULL
              AND detected_at > DATE_SUB(NOW(), INTERVAL 14 DAY)
            LIMIT 1
        ');
        $check->execute([$patientId, $type]);
        if ($check->fetch(PDO::FETCH_ASSOC)) {
            return 0;
        }
        $id = Uuid::v4();
        $this->db->prepare('
            INSERT INTO ai_patient_signals (id, patient_id, signal_type, severity, payload_json, detected_at)
            VALUES (?, ?, ?, \'informational\', ?, NOW())
        ')->execute([$id, $patientId, $type, json_encode($payload, JSON_UNESCAPED_UNICODE)]);

        $this->notifySignal($patientId, $type, $payload);

        return 1;
    }

    private function notifySignal(string $patientId, string $type, array $payload): void
    {
        try {
            $notif = new NotificationService();
            $notif->createNotification(
                $patientId,
                'ai_signal_detected',
                'Suggestion Cary',
                (string) ($payload['message'] ?? 'Une suggestion santé est disponible.'),
                ['signal_type' => $type],
            );
        } catch (Throwable) {
            // non bloquant
        }
    }

    private function detectLabOverdue(string $patientId): bool
    {
        $stmt = $this->db->prepare('
            SELECT MAX(created_at) AS last_at FROM medical_documents
            WHERE patient_id = ? AND document_type = \'resultats\'
        ');
        $stmt->execute([$patientId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        $last = $row['last_at'] ?? null;
        if ($last === null) {
            return true;
        }

        return strtotime((string) $last) < strtotime('-12 months');
    }

    private function detectNewLabResult(string $patientId): bool
    {
        $stmt = $this->db->prepare('
            SELECT COUNT(*) FROM medical_documents
            WHERE patient_id = ? AND document_type = \'resultats\'
              AND created_at > DATE_SUB(NOW(), INTERVAL 3 DAY)
        ');
        $stmt->execute([$patientId]);

        return (int) $stmt->fetchColumn() > 0;
    }

    private function detectNoShow(string $patientId): bool
    {
        $stmt = $this->db->prepare('
            SELECT COUNT(*) FROM appointments
            WHERE patient_id = ? AND status IN (\'cancelled\', \'no_show\')
              AND updated_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
        ');
        $stmt->execute([$patientId]);

        return (int) $stmt->fetchColumn() > 0;
    }

    private function detectPrescriptionExpiring(string $patientId): bool
    {
        $stmt = $this->db->prepare('
            SELECT COUNT(*) FROM medical_documents
            WHERE patient_id = ? AND document_type = \'ordonnance\'
              AND created_at < DATE_SUB(NOW(), INTERVAL 10 MONTH)
              AND created_at > DATE_SUB(NOW(), INTERVAL 12 MONTH)
        ');
        $stmt->execute([$patientId]);

        return (int) $stmt->fetchColumn() > 0;
    }

    private function detectProfileIncomplete(string $patientId): bool
    {
        $stmt = $this->db->prepare('
            SELECT phone, email_encrypted FROM profiles WHERE id = ? LIMIT 1
        ');
        $stmt->execute([$patientId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return false;
        }

        return trim((string) ($row['phone'] ?? '')) === '';
    }

    /**
     * @return array<string, mixed>
     */
    public function actOnSignal(string $signalId, array $user): array
    {
        $userId = (string) ($user['user_id'] ?? '');
        $stmt = $this->db->prepare('SELECT * FROM ai_patient_signals WHERE id = ? AND patient_id = ? LIMIT 1');
        $stmt->execute([$signalId, $userId]);
        $signal = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$signal) {
            throw new RuntimeException('Signal introuvable');
        }
        $draft = $this->booking->createDraft($user, [
            'patient_id' => $userId,
            'payload' => [
                'type' => 'blood_test',
                'patient_mode' => 'self',
                'booking_step' => 'services',
                'signal_type' => (string) $signal['signal_type'],
            ],
        ]);
        $draftId = (string) ($draft['id'] ?? '');
        $this->db->prepare('UPDATE ai_patient_signals SET acted_at = NOW(), draft_id = ? WHERE id = ?')
            ->execute([$draftId !== '' ? $draftId : null, $signalId]);

        return ['draft_id' => $draftId, 'draft' => $draft];
    }

    public function dismissSignal(string $signalId, string $userId): void
    {
        $this->db->prepare('
            UPDATE ai_patient_signals SET dismissed_at = NOW()
            WHERE id = ? AND patient_id = ? AND dismissed_at IS NULL
        ')->execute([$signalId, $userId]);
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listActiveSignals(string $userId): array
    {
        $stmt = $this->db->prepare('
            SELECT id, signal_type, severity, payload_json, detected_at, draft_id
            FROM ai_patient_signals
            WHERE patient_id = ? AND dismissed_at IS NULL AND acted_at IS NULL
            ORDER BY detected_at DESC
            LIMIT 20
        ');
        $stmt->execute([$userId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        foreach ($rows as &$row) {
            $row['payload'] = json_decode((string) ($row['payload_json'] ?? '{}'), true);
            unset($row['payload_json']);
        }

        return $rows;
    }
}

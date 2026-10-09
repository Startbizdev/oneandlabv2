<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/../Uuid.php';
require_once __DIR__ . '/../NotificationService.php';

/**
 * Signaux de suivi informatifs (cron quotidien) : bilan ancien, passage manqué, ordonnance à renouveler,
 * téléphone manquant. Chaque signal crée au plus une notification `ai_signal_detected` tous les 14 jours.
 */
final class AiPatientFollowupService
{
    public const NOTIFICATION_TYPE = 'ai_signal_detected';
    private const LAB_OVERDUE_MONTHS = 12;
    private const SIGNAL_COOLDOWN_DAYS = 14;

    private PDO $db;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? ai_db();
    }

    /**
     * @return array{patients_scanned: int, signals_created: int, errors: int, run_id: string}
     */
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
                error_log('ai-patient-followup patient ' . $patientId . ' : ' . $e->getMessage());
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

        return ['patients_scanned' => $scanned, 'signals_created' => $created, 'errors' => count($errors), 'run_id' => $runId];
    }

    public function scanPatient(string $patientId): int
    {
        $created = 0;
        if ($this->detectLabOverdue($patientId)) {
            $created += $this->createSignal($patientId, 'lab_overdue', [
                'message' => 'Votre dernier bilan de laboratoire date de plus d\'un an.',
                'months_threshold' => self::LAB_OVERDUE_MONTHS,
            ]);
        }
        $missedAppointmentId = $this->findRecentMissedVisit($patientId);
        if ($missedAppointmentId !== null) {
            $created += $this->createSignal($patientId, 'appointment_no_show', [
                'message' => 'Un professionnel n\'a pas pu vous rencontrer lors d\'un passage récent. Vous pouvez reprogrammer depuis le rendez-vous.',
                'appointment_id' => $missedAppointmentId,
            ]);
        }
        if ($this->detectPrescriptionExpiring($patientId)) {
            $created += $this->createSignal($patientId, 'prescription_expiring', [
                'message' => 'Une ordonnance de votre dossier arrive bientôt à un an : pensez à la faire renouveler.',
            ]);
        }
        if ($this->detectPhoneMissing($patientId)) {
            $created += $this->createSignal($patientId, 'profile_incomplete', [
                'message' => 'Ajoutez votre numéro de téléphone pour être joint le jour du passage.',
            ]);
        }

        return $created;
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function createSignal(string $patientId, string $type, array $payload): int
    {
        $check = $this->db->prepare('
            SELECT id FROM ai_patient_signals
            WHERE patient_id = ? AND signal_type = ? AND dismissed_at IS NULL AND acted_at IS NULL
              AND detected_at > DATE_SUB(NOW(), INTERVAL ' . self::SIGNAL_COOLDOWN_DAYS . ' DAY)
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

        $this->notifySignal($patientId, $id, $type, $payload);

        return 1;
    }

    /**
     * Notification typée : ouvre le rendez-vous concerné, sinon reste informative (pas de navigation).
     *
     * @param array<string, mixed> $payload
     */
    private function notifySignal(string $patientId, string $signalId, string $type, array $payload): void
    {
        $data = ['signal_type' => $type, 'signal_id' => $signalId];
        if (!empty($payload['appointment_id'])) {
            $data['appointment_id'] = (string) $payload['appointment_id'];
        } else {
            $data['no_navigate'] = true;
        }
        try {
            (new NotificationService())->createNotification(
                $patientId,
                self::NOTIFICATION_TYPE,
                'Suggestion Cary',
                (string) $payload['message'],
                $data,
            );
        } catch (Throwable $e) {
            error_log('ai-patient-followup notification ' . $type . ' non envoyée (' . $patientId . ') : ' . $e->getMessage());
        }
    }

    /** Uniquement si un bilan existe déjà et date de plus de 12 mois : un dossier sans bilan n'est pas « en retard ». */
    private function detectLabOverdue(string $patientId): bool
    {
        $stmt = $this->db->prepare('
            SELECT MAX(created_at) FROM medical_documents
            WHERE patient_id = ? AND document_type = \'resultats\'
        ');
        $stmt->execute([$patientId]);
        $last = $stmt->fetchColumn();
        if ($last === false || $last === null) {
            return false;
        }

        return strtotime((string) $last) < strtotime('-' . self::LAB_OVERDUE_MONTHS . ' months');
    }

    /** Passage annulé par le professionnel pour « patient absent » dans les 7 derniers jours (pas les autres annulations). */
    private function findRecentMissedVisit(string $patientId): ?string
    {
        $stmt = $this->db->prepare('
            SELECT id FROM appointments
            WHERE patient_id = ? AND status = \'canceled\' AND cancellation_reason = \'patient_absent\'
              AND canceled_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
            ORDER BY canceled_at DESC
            LIMIT 1
        ');
        $stmt->execute([$patientId]);
        $id = $stmt->fetchColumn();

        return $id !== false ? (string) $id : null;
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

    private function detectPhoneMissing(string $patientId): bool
    {
        $stmt = $this->db->prepare('SELECT phone_encrypted FROM profiles WHERE id = ? LIMIT 1');
        $stmt->execute([$patientId]);
        $phone = $stmt->fetchColumn();

        return $phone !== false && trim((string) $phone) === '';
    }
}

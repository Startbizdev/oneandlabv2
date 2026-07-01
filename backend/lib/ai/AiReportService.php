<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/AIGateway.php';
require_once __DIR__ . '/MemoryComposer.php';
require_once __DIR__ . '/../Uuid.php';
require_once __DIR__ . '/../PatientDossierAccess.php';
require_once __DIR__ . '/../../models/User.php';

final class AiReportService
{
    private PDO $db;
    private AIGateway $gateway;
    private MemoryComposer $memory;
    private User $userModel;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? ai_db();
        $this->gateway = new AIGateway($this->db);
        $this->memory = new MemoryComposer();
        $this->userModel = new User();
    }

    /**
     * @param array<string, mixed> $user
     * @return array<string, mixed>
     */
    public function createFromDictation(array $user, array $input): array
    {
        $role = (string) ($user['role'] ?? '');
        if (!in_array($role, ['nurse', 'pro', 'preleveur'], true)) {
            throw new RuntimeException('Réservé aux professionnels');
        }
        $patientId = trim((string) ($input['patient_id'] ?? ''));
        $appointmentId = isset($input['appointment_id']) ? trim((string) $input['appointment_id']) : null;
        $transcript = trim((string) ($input['transcript'] ?? $input['text'] ?? ''));
        if ($patientId === '' || $transcript === '') {
            throw new InvalidArgumentException('patient_id et transcript requis');
        }
        if (!PatientDossierAccess::canAccess($this->db, $this->userModel, $user, $patientId)) {
            throw new RuntimeException('Accès patient refusé');
        }

        $context = $this->memory->compose($user, $patientId, 'professional', false, $transcript);
        $result = $this->gateway->chat(
            $user,
            [[
                'role' => 'user',
                'content' => "À partir de cette dictée post-consultation, produis un brouillon structuré (résumé, points clés, suivi suggéré) SANS diagnostic ni prescription :\n\n{$transcript}",
            ]],
            'medical_summary',
            $context,
            null,
            $patientId,
        );
        $content = trim((string) ($result['content'] ?? ''));
        $id = Uuid::v4();
        $this->db->prepare('
            INSERT INTO ai_reports (id, patient_id, appointment_id, created_by, report_type, status, content_text, content_json, source_ai_audit_id)
            VALUES (?, ?, ?, ?, \'consultation_summary\', \'draft\', ?, ?, ?)
        ')->execute([
            $id,
            $patientId,
            $appointmentId,
            $user['user_id'],
            $content,
            json_encode(['transcript' => $transcript], JSON_UNESCAPED_UNICODE),
            $result['audit_id'] ?? null,
        ]);

        return $this->getById($id, (string) $user['user_id']) ?? [];
    }

    public function validate(string $id, string $userId): ?array
    {
        $report = $this->getById($id, $userId);
        if (!$report || ($report['status'] ?? '') !== 'draft') {
            return null;
        }
        $this->db->prepare('UPDATE ai_reports SET status = \'validated\', updated_at = NOW() WHERE id = ?')
            ->execute([$id]);

        return $this->getById($id, $userId);
    }

    public function publish(string $id, string $userId): ?array
    {
        $report = $this->getById($id, $userId);
        if (!$report || !in_array($report['status'] ?? '', ['draft', 'validated'], true)) {
            return null;
        }
        $this->db->prepare('UPDATE ai_reports SET status = \'published\', updated_at = NOW() WHERE id = ?')
            ->execute([$id]);

        return $this->getById($id, $userId);
    }

    /**
     * @return array<string, mixed>|null
     */
    public function getById(string $id, string $userId): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM ai_reports WHERE id = ? AND created_by = ? LIMIT 1');
        $stmt->execute([$id, $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? $this->map($row) : null;
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private function map(array $row): array
    {
        return [
            'id' => (string) $row['id'],
            'patient_id' => (string) $row['patient_id'],
            'appointment_id' => $row['appointment_id'],
            'report_type' => $row['report_type'],
            'status' => $row['status'],
            'content_text' => $row['content_text'],
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at'],
        ];
    }
}

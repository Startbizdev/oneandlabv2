<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/AIGateway.php';
require_once __DIR__ . '/MemoryComposer.php';
require_once __DIR__ . '/../Uuid.php';
require_once __DIR__ . '/../PatientDossierAccess.php';
require_once __DIR__ . '/../MedicalDocumentAccess.php';
require_once __DIR__ . '/../HttpStatusException.php';
require_once __DIR__ . '/../Validation.php';
require_once __DIR__ . '/../DatabaseTransaction.php';
require_once __DIR__ . '/AiChatService.php';
require_once __DIR__ . '/../../models/User.php';

final class AiReportService
{
    public const ROLES = ['nurse', 'pro', 'preleveur'];
    public const MAX_CONTENT_LENGTH = 10000;

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
        if (!in_array($role, self::ROLES, true)) {
            throw HttpStatusException::forbidden('Réservé aux professionnels');
        }
        $patientId = trim((string) ($input['patient_id'] ?? ''));
        $appointmentId = trim((string) ($input['appointment_id'] ?? ''));
        $appointmentId = $appointmentId !== '' ? $appointmentId : null;
        $transcript = trim((string) ($input['transcript'] ?? $input['text'] ?? ''));
        if ($patientId === '' || $transcript === '') {
            throw new InvalidArgumentException('patient_id et transcript requis');
        }
        if (!Validation::uuid($patientId) || ($appointmentId !== null && !Validation::uuid($appointmentId))) {
            throw new InvalidArgumentException('patient_id ou appointment_id invalide');
        }
        if (mb_strlen($transcript) > AiChatService::MAX_MESSAGE_LENGTH) {
            throw new HttpStatusException(
                'Dictée trop longue (' . AiChatService::MAX_MESSAGE_LENGTH . ' caractères maximum)',
                400,
                'AI_MESSAGE_TOO_LONG',
            );
        }
        if (!PatientDossierAccess::canAccess($this->db, $this->userModel, $user, $patientId)) {
            throw HttpStatusException::forbidden('Accès à ce patient refusé');
        }
        $reportPatientId = $patientId;
        if ($appointmentId !== null) {
            $stmt = $this->db->prepare('SELECT patient_id, relative_id FROM appointments WHERE id = ? LIMIT 1');
            $stmt->execute([$appointmentId]);
            $appointment = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($appointment === false) {
                throw HttpStatusException::notFound('Rendez-vous introuvable pour ce patient');
            }
            $ownerId = (string) ($appointment['patient_id'] ?? '');
            $relativeId = isset($appointment['relative_id']) ? (string) $appointment['relative_id'] : null;
            $subjectId = MedicalDocumentAccess::subjectDossierId($this->db, $ownerId, $relativeId);
            if (($subjectId === null || $subjectId === '') && $relativeId !== null && $relativeId !== '') {
                $subjectId = RelativeProfile::ensureProfile($this->db, $relativeId);
            }
            $matchesOwner = $patientId === $ownerId;
            $matchesSubject = $subjectId !== null && $subjectId !== '' && $patientId === $subjectId;
            if (!$matchesOwner && !$matchesSubject) {
                throw HttpStatusException::notFound('Rendez-vous introuvable pour ce patient');
            }
            if ($subjectId !== null && $subjectId !== '') {
                $reportPatientId = $subjectId;
            }
        }

        $context = $this->memory->compose($user, $reportPatientId, 'professional', false, $transcript);
        $result = $this->gateway->chat(
            $user,
            [[
                'role' => 'user',
                'content' => "À partir de cette dictée post-consultation, produis un brouillon structuré (résumé, points clés, suivi suggéré) SANS diagnostic ni prescription :\n\n{$transcript}",
            ]],
            'medical_summary',
            $context,
            null,
            $reportPatientId,
        );
        $content = trim((string) ($result['content'] ?? ''));
        $id = Uuid::v4();
        $this->db->prepare('
            INSERT INTO ai_reports (id, patient_id, appointment_id, created_by, report_type, status, content_text, content_json, source_ai_audit_id)
            VALUES (?, ?, ?, ?, \'consultation_summary\', \'draft\', ?, ?, ?)
        ')->execute([
            $id,
            $reportPatientId,
            $appointmentId,
            $user['user_id'],
            $content,
            json_encode(['transcript' => $transcript], JSON_UNESCAPED_UNICODE),
            $result['audit_id'] ?? null,
        ]);

        return $this->getById($id, (string) $user['user_id']) ?? [];
    }

    /**
     * Correction du texte par son auteur tant que le compte rendu n'est pas validé.
     * Le premier texte produit par l'IA reste dans content_json.ai_text.
     *
     * @return array<string, mixed>
     */
    public function updateDraftText(string $id, string $userId, mixed $text): array
    {
        if (!is_string($text) || trim($text) === '') {
            throw new InvalidArgumentException('content_text requis');
        }
        $text = trim($text);
        if (mb_strlen($text) > self::MAX_CONTENT_LENGTH) {
            throw new HttpStatusException(
                'Compte rendu trop long (' . self::MAX_CONTENT_LENGTH . ' caractères maximum)',
                400,
                'AI_REPORT_TOO_LONG',
            );
        }
        DatabaseTransaction::run($this->db, function () use ($id, $userId, $text): void {
            $row = $this->lockOwned($id, $userId);
            if ($row['status'] !== 'draft') {
                throw new HttpStatusException('Ce compte rendu est déjà validé : il ne peut plus être modifié.', 409, 'AI_REPORT_ALREADY_VALIDATED');
            }
            $content = json_decode((string) ($row['content_json'] ?? ''), true);
            $content = is_array($content) ? $content : [];
            $content['ai_text'] ??= (string) $row['content_text'];
            $this->db->prepare('UPDATE ai_reports SET content_text = ?, content_json = ?, updated_at = NOW() WHERE id = ?')
                ->execute([$text, json_encode($content, JSON_UNESCAPED_UNICODE), $id]);
        });

        return $this->getById($id, $userId) ?? [];
    }

    /** @return array<string, mixed> */
    public function validate(string $id, string $userId): array
    {
        return $this->transition($id, $userId, ['draft'], 'validated', 'Ce compte rendu est déjà validé.', 'AI_REPORT_ALREADY_VALIDATED');
    }

    /** @return array<string, mixed> */
    public function publish(string $id, string $userId): array
    {
        return $this->transition($id, $userId, ['draft', 'validated'], 'published', 'Ce compte rendu est déjà publié.', 'AI_REPORT_ALREADY_PUBLISHED');
    }

    /**
     * @param list<string> $from
     * @return array<string, mixed>
     */
    private function transition(string $id, string $userId, array $from, string $to, string $conflict, string $conflictCode): array
    {
        DatabaseTransaction::run($this->db, function () use ($id, $userId, $from, $to, $conflict, $conflictCode): void {
            $row = $this->lockOwned($id, $userId);
            if (!in_array($row['status'], $from, true)) {
                throw new HttpStatusException($conflict, 409, $conflictCode);
            }
            $this->db->prepare('UPDATE ai_reports SET status = ?, updated_at = NOW() WHERE id = ?')->execute([$to, $id]);
        });

        return $this->getById($id, $userId) ?? [];
    }

    /** @return array<string, mixed> */
    private function lockOwned(string $id, string $userId): array
    {
        if (!Validation::uuid($id)) {
            throw new InvalidArgumentException('Identifiant de compte rendu invalide');
        }
        $stmt = $this->db->prepare('
            SELECT status, content_text, content_json FROM ai_reports WHERE id = ? AND created_by = ? FOR UPDATE
        ');
        $stmt->execute([$id, $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            throw HttpStatusException::notFound('Compte rendu introuvable');
        }

        return $row;
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

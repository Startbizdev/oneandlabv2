<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/../Uuid.php';
require_once __DIR__ . '/../PatientDossierAccess.php';
require_once __DIR__ . '/../rag/AiDocumentJobService.php';
require_once __DIR__ . '/../../models/User.php';

final class AiAttachmentService
{
    private PDO $db;
    private User $userModel;
    private AiDocumentJobService $docJobs;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? rag_db();
        $this->userModel = new User();
        $this->docJobs = new AiDocumentJobService($this->db);
    }

    /**
     * @return array<string, mixed>
     */
    public function attachToConversation(array $user, string $conversationId, array $input): array
    {
        $userId = (string) ($user['user_id'] ?? '');
        $conv = $this->getConversation($conversationId, $userId);
        if (!$conv) {
            throw new RuntimeException('Conversation introuvable');
        }
        $medicalDocumentId = trim((string) ($input['medical_document_id'] ?? ''));
        if ($medicalDocumentId === '') {
            throw new InvalidArgumentException('medical_document_id requis');
        }
        $doc = $this->getDocument($medicalDocumentId);
        if (!$doc) {
            throw new RuntimeException('Document introuvable');
        }
        $patientId = (string) ($doc['patient_id'] ?? $conv['patient_id'] ?? $userId);
        if (!PatientDossierAccess::canAccess($this->db, $this->userModel, $user, $patientId)) {
            throw new RuntimeException('Accès document refusé');
        }
        $attachmentType = $this->mapAttachmentType((string) ($doc['document_type'] ?? 'other'), (string) ($doc['mime_type'] ?? ''));

        $existing = $this->findExistingAttachment($conversationId, $medicalDocumentId);
        if ($existing !== null) {
            return $existing;
        }

        $id = Uuid::v4();
        try {
            $stmt = $this->db->prepare('
                INSERT INTO ai_conversation_attachments
                (id, conversation_id, user_id, medical_document_id, attachment_type, storage_key, mime_type, file_name)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ');
            $stmt->execute([
                $id,
                $conversationId,
                $userId,
                $medicalDocumentId,
                $attachmentType,
                (string) ($doc['file_path'] ?? ''),
                (string) ($doc['mime_type'] ?? ''),
                (string) ($doc['file_name'] ?? 'document'),
            ]);
        } catch (PDOException $e) {
            error_log('AiAttachmentService INSERT: ' . $e->getMessage());
            throw new RuntimeException('Pièce jointe impossible (base de données). Contactez le support si le problème persiste.');
        }

        $summaryId = null;
        try {
            $summaryId = $this->docJobs->queueDocument($patientId, $medicalDocumentId, 'document_analysis');
        } catch (Throwable $e) {
            error_log('AiAttachmentService queueDocument: ' . $e->getMessage());
        }

        return [
            'id' => $id,
            'conversation_id' => $conversationId,
            'medical_document_id' => $medicalDocumentId,
            'file_name' => (string) ($doc['file_name'] ?? ''),
            'attachment_type' => $attachmentType,
            'summary_job_id' => $summaryId,
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listForConversation(string $conversationId, string $userId): array
    {
        if (!$this->getConversation($conversationId, $userId)) {
            throw new RuntimeException('Conversation introuvable');
        }
        $stmt = $this->db->prepare('
            SELECT id, conversation_id, message_id, medical_document_id, attachment_type,
                   mime_type, file_name, created_at
            FROM ai_conversation_attachments
            WHERE conversation_id = ?
            ORDER BY created_at ASC
        ');
        $stmt->execute([$conversationId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    /**
     * @return array<string, mixed>|null
     */
    public function getDocumentRow(string $id): ?array
    {
        return $this->getDocument($id);
    }

    /**
     * @return array<string, mixed>|null
     */
    private function findExistingAttachment(string $conversationId, string $medicalDocumentId): ?array
    {
        $stmt = $this->db->prepare('
            SELECT id, conversation_id, medical_document_id, attachment_type, file_name
            FROM ai_conversation_attachments
            WHERE conversation_id = ? AND medical_document_id = ?
            ORDER BY created_at DESC
            LIMIT 1
        ');
        $stmt->execute([$conversationId, $medicalDocumentId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    private function getConversation(string $conversationId, string $userId): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM ai_conversations WHERE id = ? AND user_id = ? LIMIT 1');
        $stmt->execute([$conversationId, $userId]);

        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private function getDocument(string $id): ?array
    {
        $stmt = $this->db->prepare('
            SELECT md.*, COALESCE(md.patient_id, a.patient_id) AS patient_id
            FROM medical_documents md
            LEFT JOIN appointments a ON a.id = md.appointment_id
            WHERE md.id = ?
            LIMIT 1
        ');
        $stmt->execute([$id]);

        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private function mapAttachmentType(string $documentType, string $mime): string
    {
        if ($documentType === 'ordonnance') {
            return 'ordonnance';
        }
        if ($documentType === 'resultats') {
            return 'resultats';
        }
        if (str_contains(strtolower($mime), 'pdf')) {
            return 'pdf';
        }
        if (str_starts_with(strtolower($mime), 'image/')) {
            return 'image';
        }

        return 'other';
    }
}

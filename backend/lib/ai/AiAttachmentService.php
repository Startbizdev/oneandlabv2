<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/../Uuid.php';
require_once __DIR__ . '/../HttpStatusException.php';
require_once __DIR__ . '/../MedicalDocumentAccess.php';
require_once __DIR__ . '/../rag/AiDocumentJobService.php';

final class AiAttachmentService
{
    private PDO $db;
    private AiDocumentJobService $docJobs;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? rag_db();
        $this->docJobs = new AiDocumentJobService($this->db);
    }

    /**
     * Document médical que l'utilisateur a le droit de lire (même règle que le téléchargement), sinon 404 / 403.
     * À appeler AVANT toute analyse ou injection du contenu dans le prompt.
     *
     * @return array<string, mixed>
     */
    public function requireAccessibleDocument(array $user, string $medicalDocumentId): array
    {
        $doc = $medicalDocumentId !== '' ? $this->getDocument($medicalDocumentId) : null;
        if ($doc === null) {
            throw HttpStatusException::notFound('Document introuvable');
        }
        if (!MedicalDocumentAccess::userCanAccess($this->db, $user, $doc)) {
            throw HttpStatusException::forbidden('Accès à ce document refusé');
        }

        return $doc;
    }

    /**
     * @return array<string, mixed>
     */
    public function attachToConversation(array $user, string $conversationId, array $input): array
    {
        $userId = (string) ($user['user_id'] ?? '');
        $conv = $this->getConversation($conversationId, $userId);
        if (!$conv) {
            throw HttpStatusException::notFound('Conversation introuvable');
        }
        $medicalDocumentId = trim((string) ($input['medical_document_id'] ?? ''));
        if ($medicalDocumentId === '') {
            throw new InvalidArgumentException('medical_document_id requis');
        }
        $doc = $this->requireAccessibleDocument($user, $medicalDocumentId);
        $patientId = (string) ($doc['patient_id'] ?? $conv['patient_id'] ?? $userId);
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
            throw HttpStatusException::notFound('Conversation introuvable');
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
     * Lie les pièces jointes d'un message utilisateur (après INSERT ai_messages).
     *
     * @param list<string> $medicalDocumentIds
     */
    public function linkAttachmentsToMessage(string $conversationId, string $messageId, array $medicalDocumentIds): void
    {
        foreach ($medicalDocumentIds as $medicalDocumentId) {
            $medicalDocumentId = trim($medicalDocumentId);
            if ($medicalDocumentId === '') {
                continue;
            }
            $sel = $this->db->prepare('
                SELECT id FROM ai_conversation_attachments
                WHERE conversation_id = ? AND medical_document_id = ? AND message_id IS NULL
                ORDER BY created_at DESC
                LIMIT 1
            ');
            $sel->execute([$conversationId, $medicalDocumentId]);
            $row = $sel->fetch(PDO::FETCH_ASSOC);
            if (!$row) {
                continue;
            }
            $upd = $this->db->prepare('UPDATE ai_conversation_attachments SET message_id = ? WHERE id = ?');
            $upd->execute([$messageId, (string) $row['id']]);
        }
    }

    /**
     * @param list<array<string, mixed>> $messages
     * @return list<array<string, mixed>>
     */
    public function enrichMessagesWithAttachments(string $conversationId, string $userId, array $messages): array
    {
        if ($messages === []) {
            return $messages;
        }

        $attachments = $this->listForConversation($conversationId, $userId);

        $byMessageId = [];
        $orphans = [];
        foreach ($attachments as $row) {
            $msgId = trim((string) ($row['message_id'] ?? ''));
            if ($msgId !== '') {
                $byMessageId[$msgId][] = $row;
            } else {
                $orphans[] = $row;
            }
        }

        $enriched = [];
        foreach ($messages as $message) {
            $meta = is_array($message['metadata'] ?? null) ? $message['metadata'] : [];
            if (empty($meta['attachment']) && ($message['role'] ?? '') === 'user') {
                $msgId = (string) ($message['id'] ?? '');
                $rows = $byMessageId[$msgId] ?? [];
                if ($rows === [] && $orphans !== []) {
                    $msgTime = strtotime((string) ($message['created_at'] ?? '')) ?: 0;
                    $bestIdx = null;
                    $bestDelta = PHP_INT_MAX;
                    foreach ($orphans as $idx => $orphan) {
                        $attTime = strtotime((string) ($orphan['created_at'] ?? '')) ?: 0;
                        $delta = abs($msgTime - $attTime);
                        if ($delta < $bestDelta && $delta <= 120) {
                            $bestDelta = $delta;
                            $bestIdx = $idx;
                        }
                    }
                    if ($bestIdx !== null) {
                        $rows = [$orphans[$bestIdx]];
                        unset($orphans[$bestIdx]);
                        $orphans = array_values($orphans);
                    }
                }
                if ($rows !== []) {
                    $meta['attachment'] = $this->mapAttachmentMeta($rows[0], $meta['attachment'] ?? null);
                }
            }
            $message['metadata'] = $meta !== [] ? $meta : ($message['metadata'] ?? null);
            $enriched[] = $message;
        }

        return $enriched;
    }

    /**
     * @param array<string, mixed>|null $existing
     * @return array<string, mixed>
     */
    private function mapAttachmentMeta(array $row, ?array $existing = null): array
    {
        $doc = $this->getDocument((string) ($row['medical_document_id'] ?? ''));
        $documentType = (string) ($doc['document_type'] ?? 'other');

        return [
            'medicalDocumentId' => (string) ($row['medical_document_id'] ?? ''),
            'fileName' => (string) ($row['file_name'] ?? $existing['fileName'] ?? $existing['file_name'] ?? 'document'),
            'mimeType' => (string) ($row['mime_type'] ?? $existing['mimeType'] ?? $existing['mime_type'] ?? 'application/octet-stream'),
            'documentType' => (string) ($existing['documentType'] ?? $existing['document_type'] ?? $documentType),
            'attachmentType' => (string) ($row['attachment_type'] ?? 'other'),
        ];
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
        $stmt = $this->db->prepare('SELECT * FROM ai_conversations WHERE id = ? AND user_id = ? AND deleted_at IS NULL LIMIT 1');
        $stmt->execute([$conversationId, $userId]);

        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private function getDocument(string $id): ?array
    {
        $stmt = $this->db->prepare('
            SELECT md.*, COALESCE(md.patient_id, a.patient_id) AS patient_id,
                   a.patient_id AS apt_patient_id, a.relative_id AS apt_relative_id, a.assigned_to, a.assigned_nurse_id, a.assigned_lab_id,
                   a.assigned_pro_id, a.created_by AS apt_created_by
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

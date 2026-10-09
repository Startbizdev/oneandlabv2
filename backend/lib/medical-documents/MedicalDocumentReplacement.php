<?php

declare(strict_types=1);

require_once __DIR__ . '/../Crypto.php';
require_once __DIR__ . '/../DatabaseTransaction.php';
require_once __DIR__ . '/../HttpStatusException.php';
require_once __DIR__ . '/../Logger.php';
require_once __DIR__ . '/../MedicalDocumentAccess.php';
require_once __DIR__ . '/../MedicalDocumentsInternal.php';
require_once __DIR__ . '/../pharmacy/PharmacyModuleConfig.php';
require_once __DIR__ . '/../pharmacy/PharmacyOrderService.php';
require_once __DIR__ . '/../rag/AiDocumentJobService.php';

/**
 * Remplacement d'une ordonnance par un soignant ayant accès au document : la nouvelle reprend le RDV, le patient
 * et la nature de l'ancienne ; l'ancienne est archivée (jamais supprimée) et remplacée dans les commandes pharmacie.
 */
final class MedicalDocumentReplacement
{
    public const ROLES = ['pro', 'nurse', 'lab', 'subaccount', 'super_admin'];

    public function __construct(
        private readonly PDO $db,
        private readonly Crypto $crypto,
        private readonly Logger $logger,
    ) {
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed>|null $file entrée de $_FILES
     * @return array{id: string, file_name: string, file_size: int, mime_type: string}
     */
    public function replace(array $user, string $documentId, ?array $file): array
    {
        $userId = (string) ($user['user_id'] ?? '');
        if (!in_array((string) ($user['role'] ?? ''), self::ROLES, true)) {
            throw HttpStatusException::forbidden('Seuls les soignants peuvent remplacer une ordonnance');
        }
        $document = MedicalDocumentAccess::loadForAccess($this->db, $documentId);
        if ($document === null) {
            throw HttpStatusException::notFound('Document introuvable');
        }
        if (!MedicalDocumentAccess::userCanAccess($this->db, $user, $document)) {
            throw HttpStatusException::forbidden('Accès refusé');
        }
        if (($document['document_type'] ?? '') !== 'ordonnance') {
            throw HttpStatusException::unprocessable('Seule une ordonnance peut être remplacée');
        }
        if (!empty($document['replaced_by_document_id'])) {
            throw self::alreadyReplaced();
        }

        $stored = MedicalDocumentsInternal::storeUploadedFile($file, $this->crypto);
        try {
            DatabaseTransaction::run($this->db, function () use ($document, $documentId, $stored, $userId): void {
                $lock = $this->db->prepare('SELECT replaced_by_document_id FROM medical_documents WHERE id = ? FOR UPDATE');
                $lock->execute([$documentId]);
                if (!empty($lock->fetchColumn())) {
                    throw self::alreadyReplaced();
                }
                $this->db->prepare('
                    INSERT INTO medical_documents (
                        id, appointment_id, patient_id, uploaded_by, file_name, file_path,
                        file_size, mime_type, document_type, prescription_kind, encrypted, file_dek, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NOW())
                ')->execute([
                    $stored['id'],
                    $document['appointment_id'],
                    $document['patient_id'],
                    $userId,
                    $stored['file_name'],
                    $stored['file_path'],
                    $stored['file_size'],
                    $stored['mime_type'],
                    $document['document_type'],
                    $document['prescription_kind'],
                    $stored['file_dek'],
                ]);
                $this->db->prepare('
                    UPDATE medical_documents
                    SET replaced_by_document_id = ?, replaced_at = NOW(), replaced_by_user_id = ?
                    WHERE id = ?
                ')->execute([$stored['id'], $userId, $documentId]);
                (new PharmacyOrderService($this->db, new PharmacyModuleConfig($this->db)))
                    ->replacePrescriptionDocument($documentId, $stored['id'], $userId);
            });
        } catch (Throwable $e) {
            if (!MedicalDocumentsInternal::deleteStoredFile($stored['file_path'])) {
                error_log('[medical-documents/replace] fichier orphelin ' . $stored['file_path']);
            }
            throw $e;
        }

        $this->logger->log($userId, (string) $user['role'], 'create', 'medical_document', $stored['id'], [
            'appointment_id' => $document['appointment_id'],
            'replaces_document_id' => $documentId,
            'file_name' => $stored['file_name'],
        ]);
        $this->queueOcr($document, $stored['id']);

        return MedicalDocumentsInternal::uploadPayload($stored);
    }

    /**
     * @param array<string, mixed> $document ancienne ordonnance (colonnes de loadForAccess)
     */
    private function queueOcr(array $document, string $newDocumentId): void
    {
        $patientId = (string) ($document['patient_id'] ?? '') ?: (string) ($document['apt_patient_id'] ?? '');
        if ($patientId === '') {
            return;
        }
        try {
            (new AiDocumentJobService($this->db))->queueDocument($patientId, $newDocumentId);
        } catch (Throwable $e) {
            error_log('[medical-documents/replace] file OCR IA : ' . $e->getMessage());
        }
    }

    private static function alreadyReplaced(): HttpStatusException
    {
        return HttpStatusException::conflict('Cette ordonnance a déjà été remplacée', 'ALREADY_REPLACED');
    }
}

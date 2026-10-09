<?php

declare(strict_types=1);

require_once __DIR__ . '/UploadMimeTypes.php';
require_once __DIR__ . '/MedicalDocumentSubject.php';
require_once __DIR__ . '/BookingFileJournal.php';
require_once __DIR__ . '/Crypto.php';
require_once __DIR__ . '/HttpStatusException.php';
require_once __DIR__ . '/../config/upload-limits.php';

/**
 * Création / copie de pièces médicales sans requête HTTP (webhook, brouillon patient).
 */
final class MedicalDocumentsInternal
{
    public static function backendRoot(): string
    {
        $backendDir = realpath(__DIR__ . '/..');
        if ($backendDir === false) {
            return dirname(__DIR__);
        }
        return $backendDir;
    }

    /**
     * Contrôle un fichier reçu en multipart (présence, taille, type), le chiffre et l'écrit dans uploads/medical/{id}/.
     * Le fichier est sur disque au retour : l'appelant le supprime (deleteStoredFile) si l'enregistrement en base échoue.
     *
     * @param array<string, mixed>|null $file entrée de $_FILES
     * @return array{id: string, file_name: string, file_path: string, file_size: int, mime_type: string, file_dek: string}
     */
    public static function storeUploadedFile(?array $file, Crypto $crypto): array
    {
        if ($file === null || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            throw new HttpStatusException('Fichier requis ou erreur d\'upload', 400, 'FILE_REQUIRED');
        }
        if ((int) $file['size'] > ONEANDLAB_MAX_UPLOAD_BYTES) {
            throw new HttpStatusException('Fichier trop volumineux (max 25 Mo)', 400, 'FILE_TOO_LARGE');
        }
        $mimeType = (string) finfo_file(finfo_open(FILEINFO_MIME_TYPE), (string) $file['tmp_name']);
        if (!in_array($mimeType, UploadMimeTypes::MEDICAL_DOCUMENT, true)) {
            throw new HttpStatusException('Type de fichier non autorisé', 400, 'FILE_TYPE_NOT_ALLOWED');
        }
        $fileContent = file_get_contents((string) $file['tmp_name']);
        if ($fileContent === false) {
            throw new HttpStatusException('Erreur lors de la lecture du fichier', 500, 'FILE_READ_FAILED');
        }

        $encryptedData = $crypto->encryptFile($fileContent);
        $id = bin2hex(random_bytes(16));
        $fileName = UploadMimeTypes::safeFilename((string) $file['name'], $mimeType);
        $documentDir = self::backendRoot() . '/uploads/medical/' . $id . '/';
        if (!is_dir($documentDir)) {
            mkdir($documentDir, 0755, true);
        }
        $encryptedBytes = base64_decode($encryptedData['encrypted']);
        if ($encryptedBytes === false) {
            throw new RuntimeException('Erreur lors du décodage base64 du fichier');
        }
        $filePath = $documentDir . $fileName . '.encrypted';
        if (file_put_contents($filePath, $encryptedBytes) === false || !file_exists($filePath)) {
            throw new RuntimeException('Erreur lors de l\'écriture du fichier sur le serveur. Vérifiez les permissions du dossier uploads/medical/');
        }

        return [
            'id' => $id,
            'file_name' => $fileName,
            'file_path' => '/uploads/medical/' . $id . '/' . $fileName . '.encrypted',
            'file_size' => (int) $file['size'],
            'mime_type' => $mimeType,
            'file_dek' => (string) $encryptedData['dek'],
        ];
    }

    /**
     * Réponse d'un dépôt de document (POST /medical-documents et remplacement d'ordonnance).
     *
     * @param array{id: string, file_name: string, file_size: int, mime_type: string} $stored
     * @return array{id: string, file_name: string, file_size: int, mime_type: string}
     */
    public static function uploadPayload(array $stored): array
    {
        return [
            'id' => $stored['id'],
            'file_name' => $stored['file_name'],
            'file_size' => $stored['file_size'],
            'mime_type' => $stored['mime_type'],
        ];
    }

    /**
     * Supprime le fichier chiffré d'un document (chemin medical_documents.file_path) et son dossier
     * s'il est vide. Refuse tout chemin hors de uploads/medical/.
     *
     * @return bool true si le fichier n'existe plus
     */
    public static function deleteStoredFile(string $filePathFromDb): bool
    {
        $uploadRoot = realpath(self::backendRoot() . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'medical');
        $relative = str_replace('/', DIRECTORY_SEPARATOR, ltrim($filePathFromDb, '/\\'));
        $directory = realpath(dirname(self::backendRoot() . DIRECTORY_SEPARATOR . $relative));
        if ($uploadRoot === false || $directory === false) {
            return true;
        }
        if (!str_starts_with($directory . DIRECTORY_SEPARATOR, $uploadRoot . DIRECTORY_SEPARATOR)) {
            return false;
        }
        $path = $directory . DIRECTORY_SEPARATOR . basename($relative);
        if (is_file($path) && !unlink($path)) {
            return false;
        }
        if ($directory !== $uploadRoot && count(scandir($directory) ?: []) === 2) {
            rmdir($directory);
        }

        return true;
    }

    /**
     * Copie un document existant (profil ou RDV) vers un RDV pour le patient $uploadedBy — mêmes principes que api/medical-documents/copy.php (rôle patient uniquement).
     */
    public static function copyDocumentToAppointmentAsPatient(
        PDO $db,
        Logger $logger,
        string $patientUserId,
        string $sourceMedicalDocumentId,
        string $appointmentId,
        ?string $documentType = null,
        ?BookingFileJournal $fileJournal = null
    ): void {
        $stmt = $db->prepare(
            'SELECT md.id, md.file_name, md.file_path, md.file_size, md.mime_type, md.document_type, md.file_dek, md.appointment_id, a.patient_id AS src_apt_patient, md.patient_id AS standalone_patient_id, a.relative_id AS src_relative_id
             FROM medical_documents md
             LEFT JOIN appointments a ON md.appointment_id = a.id
             WHERE md.id = ?'
        );
        $stmt->execute([$sourceMedicalDocumentId]);
        $sourceDoc = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$sourceDoc) {
            throw new RuntimeException('Document source introuvable');
        }

        $stmt = $db->prepare('SELECT patient_id, relative_id FROM appointments WHERE id = ?');
        $stmt->execute([$appointmentId]);
        $appointment = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$appointment) {
            throw new RuntimeException('Rendez-vous cible introuvable');
        }
        $appointmentPatientId = $appointment['patient_id'];
        $appointmentRelativeId = $appointment['relative_id'] ?? null;
        $sourceDocumentPatientId = $sourceDoc['src_apt_patient'];

        $sourceDocumentRelativeId = $sourceDoc['src_relative_id'] ?? null;
        if ($sourceDocumentPatientId === null) {
            $pdStmt = $db->prepare('SELECT patient_id FROM patient_documents WHERE medical_document_id = ? LIMIT 1');
            $pdStmt->execute([$sourceMedicalDocumentId]);
            $pd = $pdStmt->fetch(PDO::FETCH_ASSOC);
            if ($pd) {
                $sourceDocumentPatientId = $pd['patient_id'];
            } else {
                $tableExists = $db->query("SHOW TABLES LIKE 'patient_relative_documents'")->rowCount() > 0;
                if ($tableExists) {
                    $prdStmt = $db->prepare('SELECT patient_id, relative_id FROM patient_relative_documents WHERE medical_document_id = ? LIMIT 1');
                    $prdStmt->execute([$sourceMedicalDocumentId]);
                    $prd = $prdStmt->fetch(PDO::FETCH_ASSOC);
                    if ($prd) {
                        $sourceDocumentPatientId = $prd['patient_id'];
                        $sourceDocumentRelativeId = $prd['relative_id'];
                    }
                }
            }
        }

        $sourceDocumentPatientId ??= $sourceDoc['standalone_patient_id'] ?? null;

        if ($sourceDocumentPatientId !== $patientUserId || $appointmentPatientId !== $patientUserId) {
            throw new RuntimeException('Patient non autorisé pour cette copie de document');
        }
        if (!MedicalDocumentSubject::matches($sourceDocumentPatientId, $sourceDocumentRelativeId, $appointmentPatientId, $appointmentRelativeId)) {
            throw new RuntimeException('Document proche incompatible avec ce rendez-vous');
        }

        $backendDir = self::backendRoot();
        $filePathFromDb = ltrim((string) ($sourceDoc['file_path'] ?? ''), DIRECTORY_SEPARATOR . '/');
        $sourceFilePath = $backendDir . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $filePathFromDb);
        $resolvedSrc = realpath(dirname($sourceFilePath));
        if ($resolvedSrc !== false) {
            $baseName = basename($sourceFilePath);
            $candidate = $resolvedSrc . DIRECTORY_SEPARATOR . $baseName;
            if (is_file($candidate)) {
                $sourceFilePath = $candidate;
            }
        }

        if (!is_file($sourceFilePath)) {
            throw new RuntimeException('Fichier source absent sur disque');
        }

        $fileContent = file_get_contents($sourceFilePath);
        if ($fileContent === false) {
            throw new RuntimeException('Lecture fichier source impossible');
        }

        $uploadDir = $backendDir . '/uploads/medical/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $newId = bin2hex(random_bytes(16));
        $fileName = UploadMimeTypes::safeFilename(
            (string) $sourceDoc['file_name'],
            (string) $sourceDoc['mime_type']
        );
        $documentDir = $uploadDir . $newId . '/';
        if (!is_dir($documentDir)) {
            mkdir($documentDir, 0755, true);
        }
        $newFilePath = $documentDir . $fileName . '.encrypted';
        $fileJournal?->trackNewFile($newFilePath);
        if (file_put_contents($newFilePath, $fileContent) === false) {
            throw new RuntimeException('Écriture fichier copie impossible');
        }
        $relativePath = '/uploads/medical/' . $newId . '/' . $fileName . '.encrypted';
        $docTypeFinal = $documentType ?: ($sourceDoc['document_type'] ?: 'other');

        $ins = $db->prepare(
            'INSERT INTO medical_documents (
                id, appointment_id, uploaded_by, file_name, file_path,
                file_size, mime_type, document_type, encrypted, file_dek, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())'
        );
        $ins->execute([
            $newId,
            $appointmentId,
            $patientUserId,
            $fileName,
            $relativePath,
            $sourceDoc['file_size'],
            $sourceDoc['mime_type'],
            $docTypeFinal,
            1,
            $sourceDoc['file_dek'],
        ]);

        $logger->log(
            $patientUserId,
            'patient',
            'create',
            'medical_document',
            $newId,
            [
                'appointment_id' => $appointmentId,
                'source_medical_document_id' => $sourceMedicalDocumentId,
                'file_name' => $fileName,
                'action' => 'copy_internal',
            ]
        );
    }

    /**
     * Enregistre un fichier brut (PDF/JPEG…), le chiffre et le rattache au RDV (comme POST medical-documents).
     */
    public static function uploadFromPathToAppointment(
        PDO $db,
        Crypto $crypto,
        Logger $logger,
        string $patientUserId,
        string $appointmentId,
        string $localPath,
        string $originalFilename,
        string $documentType,
        ?BookingFileJournal $fileJournal = null
    ): void {
        $allowedTypes = ['carte_vitale', 'carte_mutuelle', 'ordonnance', 'autres_assurances', 'resultats', 'other', 'cancellation_photo'];
        if (!in_array($documentType, $allowedTypes, true)) {
            $documentType = 'other';
        }

        $maxSize = defined('ONEANDLAB_MAX_UPLOAD_BYTES') ? ONEANDLAB_MAX_UPLOAD_BYTES : 26214400;
        if (!is_file($localPath)) {
            throw new RuntimeException('Fichier brouillon introuvable');
        }
        $size = filesize($localPath);
        if ($size !== false && $size > $maxSize) {
            throw new RuntimeException('Fichier trop volumineux');
        }

        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $localPath);

        $allowedMimes = UploadMimeTypes::MEDICAL_DOCUMENT;
        if (!in_array($mimeType, $allowedMimes, true)) {
            throw new RuntimeException('Type de fichier non autorisé pour la pièce');
        }

        $fileContent = file_get_contents($localPath);
        if ($fileContent === false) {
            throw new RuntimeException('Lecture fichier impossible');
        }

        $encryptedData = $crypto->encryptFile($fileContent);
        $backendDir = self::backendRoot();
        $uploadDir = rtrim($backendDir, DIRECTORY_SEPARATOR) . '/uploads/medical/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $id = bin2hex(random_bytes(16));
        $fileName = UploadMimeTypes::safeFilename($originalFilename, (string) $mimeType);
        $documentDir = $uploadDir . $id . '/';
        if (!is_dir($documentDir)) {
            mkdir($documentDir, 0755, true);
        }
        $filePath = $documentDir . $fileName . '.encrypted';
        $fileJournal?->trackNewFile($filePath);
        $decryptedContent = base64_decode($encryptedData['encrypted'], true);
        if ($decryptedContent === false) {
            throw new RuntimeException('Décodage chiffrement fichier');
        }
        if (file_put_contents($filePath, $decryptedContent) === false) {
            throw new RuntimeException('Écriture fichier chiffré impossible');
        }
        $relativePath = '/uploads/medical/' . $id . '/' . $fileName . '.encrypted';

        $stmt = $db->prepare(
            'INSERT INTO medical_documents (
                id, appointment_id, uploaded_by, file_name, file_path,
                file_size, mime_type, document_type, encrypted, file_dek, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())'
        );

        $stmt->execute([
            $id,
            $appointmentId,
            $patientUserId,
            $fileName,
            $relativePath,
            $size !== false ? (int) $size : strlen($fileContent),
            $mimeType,
            $documentType,
            1,
            $encryptedData['dek'],
        ]);

        self::maybeLinkProfileDocuments($db, $appointmentId, $patientUserId, $id, $documentType);

        $logger->log($patientUserId, 'patient', 'create', 'medical_document', $id, [
            'appointment_id' => $appointmentId,
            'file_name' => $fileName,
            'upload_source' => 'patient_booking_draft',
        ]);
    }

    private static function maybeLinkProfileDocuments(PDO $db, string $appointmentId, string $patientId, string $medicalDocId, string $documentType): void
    {
        $profileDocumentTypes = ['carte_vitale', 'carte_mutuelle', 'autres_assurances'];
        if (!in_array($documentType, $profileDocumentTypes, true)) {
            return;
        }
        $stmt = $db->prepare('SELECT patient_id, relative_id FROM appointments WHERE id = ?');
        $stmt->execute([$appointmentId]);
        $apt = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$apt) {
            return;
        }
        $patientIdForProfile = $apt['patient_id'] ?? null;
        $relativeIdForProfile = $apt['relative_id'] ?? null;
        if (!$patientIdForProfile) {
            return;
        }

        try {
            if ($relativeIdForProfile) {
                $tableExists = $db->query("SHOW TABLES LIKE 'patient_relative_documents'")->rowCount() > 0;
                if ($tableExists) {
                    $checkRel = $db->prepare('SELECT id FROM patient_relatives WHERE id = ? AND patient_id = ?');
                    $checkRel->execute([$relativeIdForProfile, $patientIdForProfile]);
                    if (!$checkRel->fetch()) {
                        return;
                    }
                    $checkStmt = $db->prepare('SELECT id FROM patient_relative_documents WHERE patient_id = ? AND relative_id = ? AND document_type = ?');
                    $checkStmt->execute([$patientIdForProfile, $relativeIdForProfile, $documentType]);
                    $existingDoc = $checkStmt->fetch(PDO::FETCH_ASSOC);
                    if ($existingDoc) {
                        $u = $db->prepare('UPDATE patient_relative_documents SET medical_document_id = ?, updated_at = NOW() WHERE id = ?');
                        $u->execute([$medicalDocId, $existingDoc['id']]);
                    } else {
                        $prDocId = bin2hex(random_bytes(16));
                        $insertStmt = $db->prepare('INSERT INTO patient_relative_documents (
                            id, patient_id, relative_id, document_type, medical_document_id, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())');
                        $insertStmt->execute([$prDocId, $patientIdForProfile, $relativeIdForProfile, $documentType, $medicalDocId]);
                    }
                }
            } else {
                $checkStmt = $db->prepare('SELECT id FROM patient_documents WHERE patient_id = ? AND document_type = ?');
                $checkStmt->execute([$patientIdForProfile, $documentType]);
                $existingDoc = $checkStmt->fetch(PDO::FETCH_ASSOC);
                if ($existingDoc) {
                    $u = $db->prepare('UPDATE patient_documents SET medical_document_id = ?, updated_at = NOW() WHERE id = ?');
                    $u->execute([$medicalDocId, $existingDoc['id']]);
                } else {
                    $pdId = bin2hex(random_bytes(16));
                    $insertStmt = $db->prepare('INSERT INTO patient_documents (
                        id, patient_id, document_type, medical_document_id, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, NOW(), NOW())');
                    $insertStmt->execute([$pdId, $patientIdForProfile, $documentType, $medicalDocId]);
                }
            }
        } catch (Throwable $e) {
            error_log('MedicalDocumentsInternal::maybeLinkProfileDocuments: ' . $e->getMessage());
        }
    }
}

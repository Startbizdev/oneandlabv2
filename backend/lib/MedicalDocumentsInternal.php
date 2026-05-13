<?php

declare(strict_types=1);

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
     * Copie un document existant (profil ou RDV) vers un RDV pour le patient $uploadedBy — mêmes principes que api/medical-documents/copy.php (rôle patient uniquement).
     */
    public static function copyDocumentToAppointmentAsPatient(
        PDO $db,
        Logger $logger,
        string $patientUserId,
        string $sourceMedicalDocumentId,
        string $appointmentId,
        ?string $documentType = null
    ): void {
        $stmt = $db->prepare(
            'SELECT md.id, md.file_name, md.file_path, md.file_size, md.mime_type, md.document_type, md.file_dek, md.appointment_id, a.patient_id AS src_apt_patient
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

        $sourceDocumentRelativeId = null;
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

        if ($sourceDocumentPatientId !== $patientUserId || $appointmentPatientId !== $patientUserId) {
            throw new RuntimeException('Patient non autorisé pour cette copie de document');
        }
        if ($appointmentRelativeId && $sourceDocumentRelativeId !== $appointmentRelativeId) {
            throw new RuntimeException('Document proche incompatible avec ce rendez-vous');
        }
        if (($appointmentRelativeId === null || $appointmentRelativeId === '') && $sourceDocumentRelativeId !== null && $sourceDocumentRelativeId !== '') {
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
        $fileExtension = pathinfo((string) $sourceDoc['file_name'], PATHINFO_EXTENSION);
        $safeFileName = preg_replace('/[^a-zA-Z0-9._-]/', '_', pathinfo((string) $sourceDoc['file_name'], PATHINFO_FILENAME));
        $fileName = $safeFileName . '.' . $fileExtension;
        $documentDir = $uploadDir . $newId . '/';
        if (!is_dir($documentDir)) {
            mkdir($documentDir, 0755, true);
        }
        $newFilePath = $documentDir . $fileName . '.encrypted';
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
        string $documentType
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

        $allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
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
        $fileExtension = pathinfo($originalFilename, PATHINFO_EXTENSION);
        $safeFileName = preg_replace('/[^a-zA-Z0-9._-]/', '_', pathinfo($originalFilename, PATHINFO_FILENAME));
        $fileName = $safeFileName . '.' . $fileExtension;
        $documentDir = $uploadDir . $id . '/';
        if (!is_dir($documentDir)) {
            mkdir($documentDir, 0755, true);
        }
        $filePath = $documentDir . $fileName . '.encrypted';
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

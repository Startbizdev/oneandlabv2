<?php

declare(strict_types=1);

require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/Crypto.php';
require_once __DIR__ . '/Crypto.php';

/**
 * Galerie photos de soins : RDV nursing créés par un professionnel de santé (pro).
 */
final class CarePhotoGallery
{
    /** Fil texte sans pièce jointe (ancre des commentaires avant la 1re photo). */
    public const THREAD_MIME = 'application/vnd.cary.exchange-thread';

    public static function isThreadAnchor(array $doc): bool
    {
        return ($doc['mime_type'] ?? '') === self::THREAD_MIME;
    }

    /**
     * Crée ou retourne le document « fil de discussion » pour un RDV (commentaires texte sans photo).
     */
    public static function ensureThreadDocument(
        PDO $db,
        Crypto $crypto,
        string $appointmentId,
        string $userId
    ): string {
        $stmt = $db->prepare('
            SELECT id FROM medical_documents
            WHERE appointment_id = ? AND document_type = \'care_photo\' AND mime_type = ?
            LIMIT 1
        ');
        $stmt->execute([$appointmentId, self::THREAD_MIME]);
        $existing = $stmt->fetchColumn();
        if ($existing) {
            return (string) $existing;
        }

        $encryptedData = $crypto->encryptFile('');
        $backendDir = realpath(__DIR__ . '/..');
        if ($backendDir === false) {
            $backendDir = dirname(__DIR__);
        }
        $uploadDir = rtrim($backendDir, DIRECTORY_SEPARATOR) . '/uploads/medical/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $id = self::newUuid();
        $documentDir = $uploadDir . $id . '/';
        if (!is_dir($documentDir)) {
            mkdir($documentDir, 0755, true);
        }
        $fileName = 'Fil de discussion';
        $filePath = $documentDir . 'thread.encrypted';
        $decryptedContent = base64_decode($encryptedData['encrypted'], true);
        if ($decryptedContent === false) {
            throw new RuntimeException('Décodage fil de discussion');
        }
        if (file_put_contents($filePath, $decryptedContent) === false) {
            throw new RuntimeException('Écriture fil de discussion');
        }
        $relativePath = '/uploads/medical/' . $id . '/thread.encrypted';

        $ins = $db->prepare('
            INSERT INTO medical_documents (
                id, appointment_id, uploaded_by, file_name, file_path,
                file_size, mime_type, document_type, encrypted, file_dek, created_at
            ) VALUES (?, ?, ?, ?, ?, 0, ?, \'care_photo\', 1, ?, NOW())
        ');
        $ins->execute([
            $id,
            $appointmentId,
            $userId,
            $fileName,
            $relativePath,
            self::THREAD_MIME,
            $encryptedData['dek'],
        ]);

        return $id;
    }

    public static function isEligibleContext(array $appointment): bool
    {
        $type = $appointment['type'] ?? '';
        $role = $appointment['created_by_role'] ?? '';

        return $type === 'nursing' && $role === 'pro';
    }

    public static function canView(array $user, array $appointment): bool
    {
        if (($user['role'] ?? '') === 'super_admin') {
            return true;
        }
        if (!self::isEligibleContext($appointment)) {
            return false;
        }

        $uid = $user['user_id'] ?? '';
        if ($appointment['assigned_nurse_id'] === $uid) {
            return true;
        }
        if (($appointment['created_by'] ?? '') === $uid && ($user['role'] ?? '') === 'pro') {
            return true;
        }
        if (($user['role'] ?? '') === 'pro') {
            $userModel = new User();

            return $userModel->hasProfessionalAccessToPatient(
                (string) $uid,
                (string) ($appointment['patient_id'] ?? '')
            );
        }

        return false;
    }

    public static function canUpload(array $user, array $appointment): bool
    {
        if (!self::isEligibleContext($appointment)) {
            return false;
        }

        $st = $appointment['status'] ?? '';
        if (!in_array($st, ['confirmed', 'planned', 'inProgress', 'in_progress', 'completed'], true)) {
            return false;
        }

        $userId = (string) ($user['user_id'] ?? '');
        $role = (string) ($user['role'] ?? '');

        if ($role === 'nurse' && (string) ($appointment['assigned_nurse_id'] ?? '') === $userId) {
            return true;
        }
        if ($role === 'pro' && (string) ($appointment['created_by'] ?? '') === $userId) {
            return true;
        }

        return false;
    }

    public static function canComment(array $user, array $appointment): bool
    {
        if (!self::isEligibleContext($appointment)) {
            return false;
        }
        $userId = $user['user_id'] ?? '';

        if (($user['role'] ?? '') === 'nurse' && ($appointment['assigned_nurse_id'] ?? '') === $userId) {
            return true;
        }
        if (($user['role'] ?? '') === 'pro' && ($appointment['created_by'] ?? '') === $userId) {
            return true;
        }

        return false;
    }

    public static function newUuid(): string
    {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}

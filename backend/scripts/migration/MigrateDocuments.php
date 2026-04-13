<?php

/**
 * Migration des fichiers médicaux (.enc)
 * Legacy prescriptionFile, carteVitaleFile, mutuelleFile, attestationFile, analysisResults
 * → medical_documents
 */

require_once __DIR__ . '/LegacyCrypto.php';
require_once __DIR__ . '/../../lib/Crypto.php';

class MigrateDocuments
{
    private PDO $db;
    private Crypto $crypto;
    private string $legacyKey;
    private string $uploadsBasePath;
    private string $legacyUploadsPath;
    private bool $dryRun;

    private const DOC_TYPE_MAP = [
        'prescriptionFile' => 'ordonnance',
        'carteVitaleFile' => 'carte_vitale',
        'mutuelleFile' => 'carte_mutuelle',
        'attestationFile' => 'autres_assurances',
        'analysisResults' => 'resultats',
    ];

    private const FILE_SIGNATURES = [
        'pdf' => "%PDF",
        'jpg' => "\xFF\xD8",
        'jpeg' => "\xFF\xD8",
        'png' => "\x89PNG\r\n\x1A\n",
    ];

    public function __construct(
        PDO $db,
        string $legacyEncryptionKey,
        string $legacyUploadsPath,
        string $uploadsBasePath,
        bool $dryRun = false
    ) {
        $this->db = $db;
        $this->crypto = new Crypto();
        $this->legacyKey = $legacyEncryptionKey;
        $this->legacyUploadsPath = rtrim($legacyUploadsPath, '/');
        $this->uploadsBasePath = rtrim($uploadsBasePath, '/');
        $this->dryRun = $dryRun;
    }

    private function uuid(): string
    {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }

    private function validateFileSignature(string $content, ?string $mimeType): bool
    {
        $ext = 'pdf';
        if ($mimeType) {
            if (strpos($mimeType, 'jpeg') !== false || strpos($mimeType, 'jpg') !== false) $ext = 'jpg';
            elseif (strpos($mimeType, 'png') !== false) $ext = 'png';
        }
        $sig = self::FILE_SIGNATURES[$ext] ?? self::FILE_SIGNATURES['pdf'];
        return strpos($content, $sig) === 0;
    }

    public function migrateDocument(
        string $fieldKey,
        ?array $fileMeta,
        string $appointmentUuid,
        string $uploadedByUuid
    ): ?array {
        if (!$fileMeta || empty($fileMeta['path']) && empty($fileMeta['filename'])) {
            return ['status' => 'missing'];
        }

        $docType = self::DOC_TYPE_MAP[$fieldKey] ?? 'other';
        if (!$this->dryRun) {
            $chk = $this->db->prepare('SELECT id FROM medical_documents WHERE appointment_id = ? AND document_type = ? LIMIT 1');
            $chk->execute([$appointmentUuid, $docType]);
            if ($chk->fetch()) {
                return ['status' => 'skipped', 'reason' => 'already_exists'];
            }
        }

        $path = $fileMeta['path'] ?? $fileMeta['filename'] ?? '';
        if (empty($path)) return ['status' => 'missing'];

        $path = ltrim(str_replace('\\', '/', $path), '/');
        $path = preg_replace('#^uploads/encrypted/#', '', $path);
        if (preg_match('#^(var|home)/#', $path) || preg_match('#^[a-z]:/#', $path)) {
            $path = basename($path);
        }
        $basename = basename($path);

        $candidates = [
            $this->legacyUploadsPath . '/' . $basename,
            $this->legacyUploadsPath . '/' . $path,
            $this->legacyUploadsPath . '/documents/' . $path,
            $this->legacyUploadsPath . '/documents/carte-vitale/' . $basename,
            $this->legacyUploadsPath . '/documents/mutuelle/' . $basename,
            $this->legacyUploadsPath . '/documents/attestation/' . $basename,
        ];
        $fullPath = null;
        foreach ($candidates as $c) {
            if (file_exists($c)) {
                $fullPath = $c;
                break;
            }
        }
        if (!$fullPath) {
            return ['status' => 'missing', 'path' => $path];
        }

        $raw = file_get_contents($fullPath);
        if ($raw === false) return ['status' => 'error', 'message' => 'Cannot read file'];

        $decrypted = null;
        try {
            if (strlen($raw) >= 32 && strpos($raw, ':') !== false && ctype_xdigit(substr($raw, 0, 32))) {
                $decrypted = LegacyCrypto::decrypt($raw, $this->legacyKey);
            } else {
                $decrypted = LegacyCrypto::decryptFileBinary($raw, $this->legacyKey);
            }
        } catch (Exception $e) {
            return ['status' => 'corrupted', 'message' => $e->getMessage()];
        }

        if (!$this->validateFileSignature($decrypted, $fileMeta['mimetype'] ?? null)) {
            return ['status' => 'corrupted', 'message' => 'Invalid file signature'];
        }

        $fileName = $fileMeta['originalname'] ?? $fileMeta['filename'] ?? 'document-' . $this->uuid();
        $mimeType = $fileMeta['mimetype'] ?? 'application/octet-stream';
        $fileSize = strlen($decrypted);

        $encResult = $this->crypto->encryptFile($decrypted);

        $docId = $this->uuid();
        $datePath = date('Y/m/d') . '/' . $docId . '.enc';
        $relativePath = 'uploads/medical/' . $datePath;
        $targetPath = rtrim($this->uploadsBasePath, '/') . '/' . $datePath;

        if (!$this->dryRun) {
            $dir = dirname($targetPath);
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }
            $encPayload = base64_decode($encResult['encrypted'], true);
            if ($encPayload) {
                file_put_contents($targetPath, $encPayload);
            }
        }

        if (!$this->dryRun) {
            $stmt = $this->db->prepare('
                INSERT INTO medical_documents (id, appointment_id, uploaded_by, file_name, file_path, file_size, mime_type, document_type, encrypted, file_dek)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
            ');
            $stmt->execute([
                $docId,
                $appointmentUuid,
                $uploadedByUuid,
                $fileName,
                $relativePath,
                $fileSize,
                $mimeType,
                $docType,
                $encResult['dek'],
            ]);
        }

        return [
            'status' => 'migrated',
            'id' => $docId,
            'document_type' => $docType,
        ];
    }
}

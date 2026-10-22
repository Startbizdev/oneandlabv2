<?php

declare(strict_types=1);

require_once __DIR__ . '/../Crypto.php';
require_once __DIR__ . '/../Logger.php';
require_once __DIR__ . '/../MedicalDocumentAccess.php';
require_once __DIR__ . '/../MedicalDocumentsInternal.php';
require_once __DIR__ . '/AssistantError.php';

/**
 * Document joint explicitement à un message : PDF → texte (pdftotext, la barrière s'applique ensuite),
 * image → data URL pour le modèle vision. Rien n'est stocké ; le fichier déchiffré temporaire est supprimé.
 */
final class AssistantDocumentReader
{
    private const MAX_TEXT = 12000;
    private const MAX_IMAGE_BYTES = 5_000_000;

    /** @return array{kind: 'text', text: string}|array{kind: 'image', data_url: string} */
    public static function read(PDO $db, array $user, string $documentId): array
    {
        $document = preg_match('/^[0-9a-f-]{32,36}$/i', $documentId) === 1 ? MedicalDocumentAccess::loadForAccess($db, $documentId) : null;
        if ($document === null) {
            throw new AssistantError('Document introuvable', 404, 'NOT_FOUND');
        }
        if (!MedicalDocumentAccess::userCanAccess($db, $user, $document)) {
            throw new AssistantError('Accès au document refusé', 403, 'FORBIDDEN');
        }
        $bytes = self::decryptedContent($document);
        (new Logger($db))->logDecrypt((string) $user['user_id'], (string) $user['role'], 'medical_document', $documentId, ['assistant' => true]);
        $mime = strtolower((string) ($document['mime_type'] ?? ''));
        if (str_starts_with($mime, 'image/')) {
            if (strlen($bytes) > self::MAX_IMAGE_BYTES) {
                throw AssistantError::validation('Image trop volumineuse pour l\'assistant');
            }

            return ['kind' => 'image', 'data_url' => 'data:' . $mime . ';base64,' . base64_encode($bytes)];
        }
        if ($mime !== 'application/pdf') {
            throw AssistantError::validation('Seuls les PDF et les images peuvent être lus par l\'assistant');
        }

        return ['kind' => 'text', 'text' => mb_substr(self::pdfText($bytes), 0, self::MAX_TEXT)];
    }

    private static function decryptedContent(array $document): string
    {
        $root = realpath(MedicalDocumentsInternal::backendRoot() . '/uploads/medical');
        $path = realpath(MedicalDocumentsInternal::backendRoot() . '/' . ltrim((string) $document['file_path'], '/'));
        if ($root === false || $path === false || !str_starts_with($path, $root . DIRECTORY_SEPARATOR) || !is_file($path)) {
            throw new AssistantError('Fichier du document introuvable', 404, 'NOT_FOUND');
        }
        $raw = (string) file_get_contents($path);
        if (empty($document['file_dek']) || !($document['encrypted'] ?? true)) {
            return $raw;
        }

        return (new Crypto())->decryptFile(base64_encode($raw), (string) $document['file_dek']);
    }

    private static function pdfText(string $bytes): string
    {
        $tmp = tempnam(sys_get_temp_dir(), 'cary_asst_');
        if ($tmp === false) {
            return '';
        }
        try {
            file_put_contents($tmp, $bytes);
            $out = shell_exec('pdftotext -layout -nopgbrk ' . escapeshellarg($tmp) . ' - 2>/dev/null');

            return is_string($out) ? trim((string) preg_replace('/[ \t]+/', ' ', $out)) : '';
        } finally {
            @unlink($tmp);
        }
    }
}

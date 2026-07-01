<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/../Crypto.php';

/**
 * Extraction texte basique (pdftotext / lecture texte) pour OCR Phase 3.
 */
final class DocumentOcrService
{
    private Crypto $crypto;

    public function __construct(?Crypto $crypto = null)
    {
        $this->crypto = $crypto ?? new Crypto();
    }

    /**
     * @param array<string, mixed> $documentRow
     */
    public function resolveReadablePath(array $documentRow): ?string
    {
        return $this->resolveDecryptedPath($documentRow);
    }

    /**
     * @param array<string, mixed> $documentRow row medical_documents
     */
    public function extractText(array $documentRow): string
    {
        $path = $this->resolveDecryptedPath($documentRow);
        if ($path === null) {
            return '';
        }
        $mime = strtolower((string) ($documentRow['mime_type'] ?? ''));
        $ext = strtolower(pathinfo((string) ($documentRow['file_name'] ?? ''), PATHINFO_EXTENSION));
        try {
            if (str_contains($mime, 'pdf') || $ext === 'pdf') {
                return $this->extractPdf($path);
            }
            if (str_starts_with($mime, 'image/') || in_array($ext, ['jpg', 'jpeg', 'png', 'webp'], true)) {
                return $this->extractImagePlaceholder($documentRow);
            }
            if (str_starts_with($mime, 'text/') || $ext === 'txt') {
                $content = file_get_contents($path);

                return is_string($content) ? trim($content) : '';
            }
        } finally {
            if (isset($this->tempFiles[$path])) {
                @unlink($path);
                unset($this->tempFiles[$path]);
            }
        }

        return '';
    }

    /** @var array<string, true> */
    private array $tempFiles = [];

    /**
     * @param array<string, mixed> $documentRow
     */
    private function resolveDecryptedPath(array $documentRow): ?string
    {
        $backendDir = realpath(__DIR__ . '/..') ?: dirname(__DIR__);
        $projectRoot = dirname($backendDir);
        $filePathFromDb = ltrim((string) ($documentRow['file_path'] ?? ''), '/');
        $fileName = basename($filePathFromDb);

        $candidates = [
            $projectRoot . '/' . $filePathFromDb,
            $backendDir . '/' . $filePathFromDb,
            $backendDir . '/uploads/medical/' . $fileName,
            $projectRoot . '/uploads/medical/' . $fileName,
        ];
        if (str_contains($filePathFromDb, '/')) {
            $candidates[] = $backendDir . '/uploads/medical/' . preg_replace('#^uploads/medical/#', '', $filePathFromDb);
        }

        $encryptedPath = false;
        foreach ($candidates as $candidate) {
            $resolved = realpath($candidate);
            if ($resolved !== false && is_file($resolved)) {
                $encryptedPath = $resolved;
                break;
            }
        }
        if ($encryptedPath === false) {
            return null;
        }
        $encryptedContent = file_get_contents($encryptedPath);
        if ($encryptedContent === false) {
            return null;
        }
        $dek = (string) ($documentRow['file_dek'] ?? '');
        if ($dek === '' || !($documentRow['encrypted'] ?? true)) {
            return $encryptedPath;
        }
        try {
            $decrypted = $this->crypto->decryptFile(base64_encode($encryptedContent), $dek);
        } catch (Throwable) {
            return null;
        }
        $tmp = tempnam(sys_get_temp_dir(), 'cary_ocr_');
        if ($tmp === false) {
            return null;
        }
        file_put_contents($tmp, $decrypted);
        $this->tempFiles[$tmp] = true;

        return $tmp;
    }

    private function extractPdf(string $path): string
    {
        $pdftotext = rag_env('PDFTOTEXT_BIN', 'pdftotext') ?? 'pdftotext';
        if ($this->commandExists($pdftotext)) {
            $cmd = escapeshellarg($pdftotext) . ' -layout -nopgbrk ' . escapeshellarg($path) . ' - 2>/dev/null';
            $out = shell_exec($cmd);

            return is_string($out) ? trim($out) : '';
        }
        $content = file_get_contents($path);
        if (!is_string($content)) {
            return '';
        }
        if (preg_match_all('/\(([^()\\\\]*(?:\\\\.[^()\\\\]*)*)\)/s', $content, $m)) {
            $parts = array_map(static function (string $s): string {
                return str_replace(['\\n', '\\r', '\\t'], ["\n", "\r", "\t"], $s);
            }, $m[1]);

            return trim(implode(' ', $parts));
        }

        return '';
    }

    /**
     * @param array<string, mixed> $documentRow
     */
    private function extractImagePlaceholder(array $documentRow): string
    {
        $name = (string) ($documentRow['file_name'] ?? 'image');
        $type = (string) ($documentRow['document_type'] ?? 'document');

        return sprintf('Image médicale « %s » (type %s) — analyse visuelle requise.', $name, $type);
    }

    private function commandExists(string $bin): bool
    {
        if (str_contains($bin, '/') || str_contains($bin, '\\')) {
            return is_executable($bin);
        }
        $which = PHP_OS_FAMILY === 'Windows' ? 'where' : 'command -v';
        $out = shell_exec($which . ' ' . escapeshellarg($bin) . ' 2>/dev/null');

        return is_string($out) && trim($out) !== '';
    }
}

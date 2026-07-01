<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/DocumentOcrService.php';
require_once __DIR__ . '/LabResultAnalysisPrompt.php';

/**
 * Analyse vision pour images médicales (ordonnance, carte vitale, résultats photo…).
 */
final class DocumentVisionService
{
    private DocumentOcrService $ocr;

    public function __construct(?DocumentOcrService $ocr = null)
    {
        $this->ocr = $ocr ?? new DocumentOcrService();
    }

    /**
     * @param array<string, mixed> $documentRow
     */
    public function analyzeMedicalImage(array $documentRow, string $intentLabel = 'Document médical'): string
    {
        $path = $this->ocr->resolveReadablePath($documentRow);
        if ($path === null) {
            return '';
        }

        $mime = strtolower((string) ($documentRow['mime_type'] ?? 'image/jpeg'));
        if (!str_starts_with($mime, 'image/')) {
            $mime = 'image/jpeg';
        }

        $bytes = file_get_contents($path);
        if (!is_string($bytes) || $bytes === '') {
            return '';
        }

        $fileName = (string) ($documentRow['file_name'] ?? 'image');

        return $this->callVisionApi(
            $intentLabel,
            $fileName,
            [['mime' => $mime, 'bytes' => $bytes]],
            'photo',
        );
    }

    /**
     * PDF scanné ou non extractible — conversion en pages PNG puis Grok vision.
     *
     * @param array<string, mixed> $documentRow
     */
    public function analyzeMedicalPdf(array $documentRow, string $intentLabel = 'Document médical'): string
    {
        $path = $this->ocr->resolveReadablePath($documentRow);
        if ($path === null) {
            return '';
        }

        $pageImages = $this->pdfToPngPages($path, 3);
        if ($pageImages === []) {
            return '';
        }

        $frames = [];
        foreach ($pageImages as $pngPath) {
            $bytes = file_get_contents($pngPath);
            if (is_string($bytes) && $bytes !== '') {
                $frames[] = ['mime' => 'image/png', 'bytes' => $bytes];
            }
        }
        $this->cleanupPaths($pageImages);

        if ($frames === []) {
            return '';
        }

        $fileName = (string) ($documentRow['file_name'] ?? 'document.pdf');

        return $this->callVisionApi(
            $intentLabel,
            $fileName,
            $frames,
            'pdf',
        );
    }

    /**
     * @param list<array{mime: string, bytes: string}> $frames
     */
    private function callVisionApi(
        string $intentLabel,
        string $fileName,
        array $frames,
        string $kind,
    ): string {
        $apiKey = rag_env('XAI_API_KEY') ?? '';
        if ($apiKey === '') {
            return '';
        }

        $model = rag_env('XAI_VISION_MODEL', 'grok-2-vision-1212') ?? 'grok-2-vision-1212';
        $kindLabel = $kind === 'pdf' ? 'document PDF' : 'photo';
        $isLab = (bool) preg_match('/r[ée]sultat|analyse|bilan|biolog/i', $intentLabel . ' ' . $fileName);
        $instruction = $isLab
            ? LabResultAnalysisPrompt::buildVisionInstruction($intentLabel, $fileName, $kind)
            : "Tu analyses un {$kindLabel} de {$intentLabel} (« {$fileName} »). "
                . 'Extrais et résume en français tout le contenu médical utile (valeurs de labo, dates, médicaments, noms). '
                . 'Vulgarise pour un patient. Pas de diagnostic. Si ce n\'est pas un document médical, dis-le clairement.';

        $content = [[
            'type' => 'text',
            'text' => $instruction,
        ]];

        foreach ($frames as $frame) {
            $dataUrl = 'data:' . $frame['mime'] . ';base64,' . base64_encode($frame['bytes']);
            $content[] = [
                'type' => 'image_url',
                'image_url' => ['url' => $dataUrl, 'detail' => 'high'],
            ];
        }

        $payload = [
            'model' => $model,
            'temperature' => 0.2,
            'messages' => [['role' => 'user', 'content' => $content]],
        ];

        $ch = curl_init('https://api.x.ai/v1/chat/completions');
        if ($ch === false) {
            return '';
        }
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $apiKey,
            ],
            CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
            CURLOPT_TIMEOUT => 120,
        ]);
        $raw = curl_exec($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if (!is_string($raw) || $raw === '' || $httpCode >= 400) {
            error_log('DocumentVisionService HTTP ' . $httpCode . ': ' . mb_substr((string) $raw, 0, 300));

            return '';
        }
        $json = json_decode($raw, true);
        if (!is_array($json)) {
            return '';
        }

        return trim((string) ($json['choices'][0]['message']['content'] ?? ''));
    }

    /**
     * @return list<string>
     */
    private function pdfToPngPages(string $pdfPath, int $maxPages): array
    {
        $pdftoppm = rag_env('PDFTOPPM_BIN', 'pdftoppm') ?? 'pdftoppm';
        if (!$this->commandExists($pdftoppm)) {
            return [];
        }

        $tmpdir = sys_get_temp_dir() . '/cary_pdf_' . uniqid('', true);
        if (!@mkdir($tmpdir) && !is_dir($tmpdir)) {
            return [];
        }

        $prefix = $tmpdir . '/page';
        $cmd = escapeshellarg($pdftoppm) . ' -png -f 1 -l ' . max(1, $maxPages) . ' -r 150 '
            . escapeshellarg($pdfPath) . ' ' . escapeshellarg($prefix) . ' 2>/dev/null';
        shell_exec($cmd);

        $files = glob($tmpdir . '/page-*.png') ?: glob($tmpdir . '/page*.png') ?: [];
        sort($files, SORT_NATURAL);

        return array_values($files);
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

    /**
     * @param list<string> $paths
     */
    private function cleanupPaths(array $paths): void
    {
        $dirs = [];
        foreach ($paths as $path) {
            @unlink($path);
            $dirs[dirname($path)] = true;
        }
        foreach (array_keys($dirs) as $dir) {
            @rmdir($dir);
        }
    }
}

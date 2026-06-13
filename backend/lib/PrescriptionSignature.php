<?php

/**
 * Validation et normalisation de la signature manuscrite (PNG base64).
 */
class PrescriptionSignature
{
    private const MAX_BYTES = 200_000;

    public static function normalizePngBase64(?string $input): ?string
    {
        if ($input === null) {
            return null;
        }
        $raw = trim($input);
        if ($raw === '') {
            return null;
        }
        if (preg_match('#^data:image/png;base64,(.+)$#i', $raw, $m)) {
            $raw = trim($m[1]);
        }
        $raw = preg_replace('/\s+/', '', $raw) ?? $raw;
        if ($raw === '' || !preg_match('#^[A-Za-z0-9+/=]+$#', $raw)) {
            return null;
        }

        return $raw;
    }

    public static function validateForStorage(?string $input): ?string
    {
        $normalized = self::normalizePngBase64($input);
        if ($normalized === null) {
            return 'Signature invalide (PNG attendu).';
        }
        $bytes = base64_decode($normalized, true);
        if ($bytes === false || $bytes === '') {
            return 'Signature invalide (décodage base64 impossible).';
        }
        if (strlen($bytes) > self::MAX_BYTES) {
            return 'Signature trop volumineuse (maximum 200 Ko).';
        }
        if (strncmp($bytes, "\x89PNG\r\n\x1a\n", 8) !== 0) {
            return 'Signature invalide (format PNG requis).';
        }

        return null;
    }

    public static function toDataUri(string $pngBase64): string
    {
        $normalized = self::normalizePngBase64($pngBase64) ?? $pngBase64;

        return 'data:image/png;base64,' . $normalized;
    }
}

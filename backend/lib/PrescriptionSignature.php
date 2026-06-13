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

    /**
     * Convertit une signature PNG/JPEG (base64) en data URI JPEG pour Dompdf (évite GD sur PNG embarqué).
     *
     * @throws RuntimeException si GD absent
     */
    public static function toJpegDataUriForPdf(?string $input): ?string
    {
        $normalized = self::normalizePngBase64($input);
        if ($normalized === null) {
            return null;
        }
        if (!function_exists('imagecreatefromstring') || !function_exists('imagejpeg')) {
            throw new RuntimeException(
                'Extension PHP GD requise pour inclure la signature manuscrite dans le PDF.',
            );
        }

        $bytes = base64_decode($normalized, true);
        if ($bytes === false || $bytes === '') {
            return null;
        }

        $image = @imagecreatefromstring($bytes);
        if ($image === false) {
            return null;
        }

        $width = imagesx($image);
        $height = imagesy($image);
        if ($width <= 0 || $height <= 0) {
            imagedestroy($image);

            return null;
        }

        $canvas = imagecreatetruecolor($width, $height);
        if ($canvas === false) {
            imagedestroy($image);

            return null;
        }

        $white = imagecolorallocate($canvas, 255, 255, 255);
        imagefill($canvas, 0, 0, $white);
        imagecopy($canvas, $image, 0, 0, 0, 0, $width, $height);
        imagedestroy($image);

        ob_start();
        $ok = imagejpeg($canvas, null, 88);
        imagedestroy($canvas);
        $jpeg = ob_get_clean();

        if (!$ok || !is_string($jpeg) || $jpeg === '') {
            return null;
        }

        return 'data:image/jpeg;base64,' . base64_encode($jpeg);
    }
}

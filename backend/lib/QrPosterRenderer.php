<?php

require_once __DIR__ . '/third_party/phpqrcode/phpqrcode.php';

/**
 * Composition PNG : poster brandé Cary ou QR brut.
 */
class QrPosterRenderer
{
    /** Cary brand #1CC7B5 */
    private const PRIMARY = [28, 199, 181];
    /** Cary canvas #F4FAFA */
    private const CANVAS = [244, 250, 250];
    private const WHITE = [255, 255, 255];
    /** slate-800 */
    private const TEXT = [30, 41, 59];
    /** slate-500 */
    private const MUTED = [100, 116, 139];
    /** slate-200 border */
    private const BORDER = [226, 232, 240];
    /** Référence layout (A4 portrait 150 dpi). */
    private const LAYOUT_REF_HEIGHT = 1754;

    public static function normalizeFormat(string $format): string
    {
        $format = strtolower(trim($format));
        if (in_array($format, ['print', 'a4'], true)) {
            return 'a4';
        }
        if (in_array($format, ['story', 'square'], true)) {
            return $format;
        }

        return 'a4';
    }

    /** @return array{width:int,height:int} */
    public static function dimensionsForFormat(string $format): array
    {
        switch (self::normalizeFormat($format)) {
            case 'square':
                return ['width' => 1080, 'height' => 1080];
            case 'story':
                return ['width' => 1080, 'height' => 1350];
            case 'a4':
            default:
                return ['width' => 1240, 'height' => 1754];
        }
    }

    /**
     * @param array<string, mixed> $qr
     * @param array<string, mixed> $profile
     */
    public function renderBrandedPoster(array $qr, array $profile, string $format = 'a4'): string
    {
        $format = self::normalizeFormat($format);
        $dims = self::dimensionsForFormat($format);
        $w = $dims['width'];
        $h = $dims['height'];

        $img = imagecreatetruecolor($w, $h);
        if ($img === false) {
            throw new RuntimeException('Impossible de créer l\'image poster');
        }

        $canvas = imagecolorallocate($img, ...self::CANVAS);
        $primary = imagecolorallocate($img, ...self::PRIMARY);
        $white = imagecolorallocate($img, ...self::WHITE);
        $text = imagecolorallocate($img, ...self::TEXT);
        $muted = imagecolorallocate($img, ...self::MUTED);
        $border = imagecolorallocate($img, ...self::BORDER);
        imagefill($img, 0, 0, $canvas);

        $logoPath = __DIR__ . '/../assets/qr-poster/logo-cary.png';
        $scale = $h / self::LAYOUT_REF_HEIGHT;
        $gap = static fn (float $px): int => (int) round($px * $scale);
        $fontBold = $this->fontPath('Nunito-Bold.ttf');
        $fontRegular = $this->fontPath('Nunito-Regular.ttf');
        $fontSemi = $this->fontPath('Nunito-SemiBold.ttf');
        $maxTextW = (int) ($w * 0.84);

        $marginTop = $gap(56);
        $marginBottom = $gap(56);
        $logoBottom = $this->drawBrandLogo($img, $logoPath, $w, $marginTop, $h, $fontBold, $primary, $scale);

        $displayName = trim((string) ($profile['display_name'] ?? 'Professionnel Cary'));
        $displayName = $this->truncateUtf($displayName, 30);
        $nameSize = 56 * $scale;
        $nameHeight = $this->measureTtfHeight($fontBold, $nameSize, $displayName);

        $tagline = trim((string) ($qr['effective_tagline'] ?? ''));
        $tagSize = 34 * $scale;
        $tagLines = $this->wrapTextToWidth($tagline, $fontRegular, $tagSize, $maxTextW);
        $tagLineHeight = $tagLines !== []
            ? $this->measureTtfHeight($fontRegular, $tagSize, $tagLines[0])
            : 0;
        $tagBlockHeight = $tagLines === []
            ? 0
            : (count($tagLines) * $tagLineHeight) + (max(0, count($tagLines) - 1) * $gap(14));

        $qrSize = (int) min($w * 0.54, 560 * $scale);
        $cardPad = (int) round(30 * $scale);
        $cardHeight = $qrSize + ($cardPad * 2);

        $footer1 = 'Scannez pour prendre rendez-vous';
        $ctaSize = 44 * $scale;
        $ctaHeight = $this->measureTtfHeight($fontSemi, $ctaSize, $footer1);

        $gapAfterName = $gap(24);
        $gapAfterTag = $tagBlockHeight > 0 ? $gap(48) : 0;
        $gapAfterQr = $gap(36);

        $contentHeight = $nameHeight
            + $gapAfterName
            + $tagBlockHeight
            + $gapAfterTag
            + $cardHeight
            + $gapAfterQr
            + $ctaHeight;

        $contentAreaTop = $logoBottom + $gap(28);
        $contentAreaBottom = $h - $marginBottom;
        $y = $contentAreaTop + (int) max(0, ($contentAreaBottom - $contentAreaTop - $contentHeight) / 2);

        $y = $this->drawCenteredTtf($img, $displayName, $nameSize, $fontBold, $text, $y, $w);
        $y += $gapAfterName;

        foreach ($tagLines as $i => $line) {
            $y = $this->drawCenteredTtf($img, $line, $tagSize, $fontRegular, $muted, $y, $w);
            if ($i < count($tagLines) - 1) {
                $y += $gap(14);
            }
        }
        if ($tagBlockHeight > 0) {
            $y += $gapAfterTag;
        }

        $qrPng = $this->renderRawQrPng((string) ($qr['scan_url'] ?? ''), $qrSize);
        $qrImg = @imagecreatefromstring($qrPng);
        if ($qrImg !== false) {
            $cardW = $qrSize + ($cardPad * 2);
            $cardX = (int) (($w - $cardW) / 2);
            $this->drawRoundedCard($img, $cardX, $y, $cardW, $cardHeight, $white, $border, (int) round(24 * $scale));
            $qx = $cardX + $cardPad;
            $qy = $y + $cardPad;
            imagecopyresampled($img, $qrImg, $qx, $qy, 0, 0, $qrSize, $qrSize, imagesx($qrImg), imagesy($qrImg));
            imagedestroy($qrImg);
            $y += $cardHeight + $gapAfterQr;
        }

        $this->drawCenteredTtf($img, $footer1, $ctaSize, $fontSemi, $primary, $y, $w);

        return $this->encodePng($img);
    }

    public function renderRawQrPng(string $url, int $size = 400): string
    {
        $tmp = tempnam(sys_get_temp_dir(), 'caryqr');
        if ($tmp === false) {
            throw new RuntimeException('Impossible de créer un fichier temporaire QR');
        }
        try {
            QRcode::png($url, $tmp, QR_ECLEVEL_H, max(4, (int) floor($size / 40)), 2);
            $bytes = (string) file_get_contents($tmp);
        } finally {
            @unlink($tmp);
        }
        if ($bytes === '') {
            throw new RuntimeException('Génération QR échouée');
        }

        $src = @imagecreatefromstring($bytes);
        if ($src === false) {
            return $bytes;
        }
        $dst = imagecreatetruecolor($size, $size);
        if ($dst === false) {
            imagedestroy($src);
            return $bytes;
        }
        $white = imagecolorallocate($dst, 255, 255, 255);
        imagefill($dst, 0, 0, $white);
        imagecopyresampled($dst, $src, 0, 0, 0, 0, $size, $size, imagesx($src), imagesy($src));
        imagedestroy($src);

        return $this->encodePng($dst);
    }

    private function drawBrandLogo(
        $img,
        string $logoPath,
        int $canvasW,
        int $y,
        int $canvasH,
        string $fontBold,
        int $primaryColor,
        float $scale
    ): int {
        if (!is_file($logoPath)) {
            $fallbackSize = 44 * $scale;

            return $this->drawCenteredTtf($img, 'CARY', $fallbackSize, $fontBold, $primaryColor, $y, $canvasW);
        }
        $logo = @imagecreatefrompng($logoPath);
        if ($logo === false) {
            return $y;
        }
        $lw = imagesx($logo);
        $lh = imagesy($logo);
        $maxW = (int) ($canvasW * 0.46);
        $maxH = (int) ($canvasH * 0.11);
        $logoScale = min($maxW / max(1, $lw), $maxH / max(1, $lh));
        $targetW = (int) round($lw * $logoScale);
        $targetH = (int) round($lh * $logoScale);
        $lx = (int) (($canvasW - $targetW) / 2);
        imagealphablending($img, true);
        imagecopyresampled($img, $logo, $lx, $y, 0, 0, $targetW, $targetH, $lw, $lh);
        imagedestroy($logo);

        return $y + $targetH;
    }

    private function drawRoundedCard($img, int $x, int $y, int $w, int $h, int $fill, int $stroke, int $r = 24): void
    {
        imagefilledrectangle($img, $x + $r, $y, $x + $w - $r, $y + $h, $fill);
        imagefilledrectangle($img, $x, $y + $r, $x + $w, $y + $h - $r, $fill);
        imagefilledellipse($img, $x + $r, $y + $r, $r * 2, $r * 2, $fill);
        imagefilledellipse($img, $x + $w - $r, $y + $r, $r * 2, $r * 2, $fill);
        imagefilledellipse($img, $x + $r, $y + $h - $r, $r * 2, $r * 2, $fill);
        imagefilledellipse($img, $x + $w - $r, $y + $h - $r, $r * 2, $r * 2, $fill);
        imagerectangle($img, $x, $y, $x + $w, $y + $h, $stroke);
    }

    private function encodePng(\GdImage $img): string
    {
        $stream = fopen('php://temp', 'w+');
        if ($stream === false) {
            throw new RuntimeException('Impossible d\'encoder l\'image');
        }
        imagepng($img, $stream);
        rewind($stream);
        $bytes = (string) stream_get_contents($stream);
        fclose($stream);
        imagedestroy($img);

        return $bytes;
    }

    private function fontPath(string $file): string
    {
        $path = __DIR__ . '/../assets/qr-poster/fonts/' . $file;
        if (is_file($path)) {
            return $path;
        }
        $variable = __DIR__ . '/../assets/qr-poster/fonts/Nunito-Variable.ttf';
        if (is_file($variable)) {
            return $variable;
        }

        throw new RuntimeException('Police introuvable : ' . $file);
    }

    private function drawCenteredTtf(
        \GdImage $img,
        string $text,
        float $size,
        string $font,
        int $color,
        int $topY,
        int $canvasW
    ): int {
        $text = trim($text);
        if ($text === '' || !function_exists('imagettftext')) {
            return $topY + (int) $size;
        }

        $bbox = imagettfbbox($size, 0, $font, $text);
        if ($bbox === false) {
            return $topY + (int) $size;
        }

        $textWidth = abs($bbox[2] - $bbox[0]);
        $textHeight = abs($bbox[7] - $bbox[1]);
        $x = (int) (($canvasW - $textWidth) / 2);
        $baselineY = (int) ($topY - $bbox[7]);
        imagettftext($img, $size, 0, max(12, $x), $baselineY, $color, $font, $text);

        return $topY + $textHeight;
    }

    private function measureTtfWidth(string $font, float $size, string $text): int
    {
        if (!function_exists('imagettfbbox')) {
            return strlen($text) * 12;
        }
        $bbox = imagettfbbox($size, 0, $font, $text);

        return $bbox === false ? 0 : abs($bbox[2] - $bbox[0]);
    }

    private function measureTtfHeight(string $font, float $size, string $text): int
    {
        $text = trim($text);
        if ($text === '' || !function_exists('imagettfbbox')) {
            return (int) round($size);
        }
        $bbox = imagettfbbox($size, 0, $font, $text);

        return $bbox === false ? (int) round($size) : abs($bbox[7] - $bbox[1]);
    }

    /** @return list<string> */
    private function wrapTextToWidth(string $text, string $font, float $size, int $maxWidth): array
    {
        $text = trim($text);
        if ($text === '') {
            return [];
        }

        $words = preg_split('/\s+/u', $text) ?: [];
        $lines = [];
        $current = '';
        foreach ($words as $word) {
            $candidate = $current === '' ? $word : $current . ' ' . $word;
            if ($this->measureTtfWidth($font, $size, $candidate) > $maxWidth && $current !== '') {
                $lines[] = $current;
                $current = $word;
            } else {
                $current = $candidate;
            }
        }
        if ($current !== '') {
            $lines[] = $current;
        }

        return $lines;
    }

    private function truncateUtf(string $text, int $maxChars): string
    {
        if (mb_strlen($text) <= $maxChars) {
            return $text;
        }

        return mb_substr($text, 0, $maxChars - 1) . '…';
    }

    private function drawCenteredText($img, int $font, string $text, int $color, int $y, int $canvasW, ?int $offsetX = null): void
    {
        $text = $this->toLatin1($text);
        $tw = imagefontwidth($font) * strlen($text);
        $x = $offsetX !== null
            ? (int) ($offsetX + (($canvasW - $tw) / 2))
            : (int) (($canvasW - $tw) / 2);
        imagestring($img, $font, max(8, $x), $y, $text, $color);
    }

    /** @return list<string> */
    private function wrapLines(string $text, int $maxLen): array
    {
        if ($text === '') {
            return [''];
        }
        $words = preg_split('/\s+/', $text) ?: [];
        $lines = [];
        $current = '';
        foreach ($words as $word) {
            $candidate = $current === '' ? $word : $current . ' ' . $word;
            if (strlen($candidate) > $maxLen && $current !== '') {
                $lines[] = $current;
                $current = $word;
            } else {
                $current = $candidate;
            }
        }
        if ($current !== '') {
            $lines[] = $current;
        }

        return $lines;
    }

    private function truncate(string $s, int $max): string
    {
        if (strlen($s) <= $max) {
            return $s;
        }

        return substr($s, 0, $max - 1) . '…';
    }

    private function toLatin1(string $text): string
    {
        $converted = @iconv('UTF-8', 'ISO-8859-1//TRANSLIT//IGNORE', $text);
        if ($converted === false) {
            return preg_replace('/[^\x20-\x7E]/', '?', $text) ?? $text;
        }

        return $converted;
    }
}

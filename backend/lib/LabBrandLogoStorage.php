<?php

declare(strict_types=1);

/**
 * Logos de marques labo déposés par l'admin (fichiers publics servis par api/public/lab-brands/logo.php).
 */
final class LabBrandLogoStorage
{
    public const MAX_BYTES = 2 * 1024 * 1024;

    /** SVG exclu : un SVG peut embarquer du script. */
    private const EXTENSIONS_BY_MIME = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
    ];

    public static function uploadDir(string $backendRoot): string
    {
        return rtrim($backendRoot, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'lab-brands';
    }

    public static function extensionForMime(string $mime): ?string
    {
        return self::EXTENSIONS_BY_MIME[$mime] ?? null;
    }

    public static function newBasename(string $extension): string
    {
        return 'brand-' . bin2hex(random_bytes(8)) . '.' . $extension;
    }

    public static function publicUrl(string $siteUrl, string $basename): string
    {
        return rtrim($siteUrl, '/') . '/api/public/lab-brands/logo?name=' . rawurlencode($basename);
    }

    /**
     * @param array{tmp_name: string, size: int, error: int} $file
     * @return string URL publique absolue du logo enregistré
     */
    public static function store(string $backendRoot, string $siteUrl, array $file, callable $moveUploadedFile): string
    {
        if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            throw new InvalidArgumentException('Fichier requis ou envoi interrompu.');
        }
        if ((int) $file['size'] > self::MAX_BYTES) {
            throw new InvalidArgumentException('Image trop volumineuse (2 Mo maximum).');
        }
        $mime = (string) (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
        $extension = self::extensionForMime($mime);
        if ($extension === null) {
            throw new InvalidArgumentException('Formats acceptés : PNG, JPEG ou WebP.');
        }
        $dir = self::uploadDir($backendRoot);
        if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
            throw new RuntimeException('Dossier des logos impossible à créer : ' . $dir);
        }
        $basename = self::newBasename($extension);
        if (!$moveUploadedFile($file['tmp_name'], $dir . DIRECTORY_SEPARATOR . $basename)) {
            throw new RuntimeException('Enregistrement du logo impossible dans ' . $dir);
        }
        return self::publicUrl($siteUrl, $basename);
    }
}

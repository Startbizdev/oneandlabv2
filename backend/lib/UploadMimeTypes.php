<?php

declare(strict_types=1);

/** MIME autorisés pour uploads documents / photos (iOS HEIC inclus). */
final class UploadMimeTypes
{
    /** @var list<string> */
    public const MEDICAL_DOCUMENT = [
        'image/jpeg',
        'image/png',
        'image/jpg',
        'image/heic',
        'image/heif',
        'image/webp',
        'application/pdf',
    ];

    /** @var list<string> */
    public const CARE_PHOTO = [
        'image/jpeg',
        'image/png',
        'image/jpg',
        'image/heic',
        'image/heif',
        'image/webp',
        'application/pdf',
    ];

    public static function extensionForMime(string $mimeType): string
    {
        $extensions = [
            'image/jpeg' => 'jpg',
            'image/jpg' => 'jpg',
            'image/png' => 'png',
            'image/heic' => 'heic',
            'image/heif' => 'heif',
            'image/webp' => 'webp',
            'application/pdf' => 'pdf',
        ];

        if (!isset($extensions[$mimeType])) {
            throw new InvalidArgumentException('Type MIME non pris en charge');
        }

        return $extensions[$mimeType];
    }

    public static function safeFilename(string $originalFilename, string $mimeType): string
    {
        $base = preg_replace(
            '/[^a-zA-Z0-9._-]/',
            '_',
            pathinfo(str_replace(["\r", "\n", "\0"], '', $originalFilename), PATHINFO_FILENAME)
        );
        $base = trim((string) $base, '._-');
        if ($base === '') {
            $base = 'document';
        }

        return substr($base, 0, 120) . '.' . self::extensionForMime($mimeType);
    }
}

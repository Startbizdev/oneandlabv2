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
    ];
}

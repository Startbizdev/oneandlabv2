<?php

declare(strict_types=1);

final class PatientBookingDraftStorage
{
    public static function backendRoot(): string
    {
        $b = realpath(__DIR__ . '/..');
        return $b !== false ? $b : dirname(__DIR__);
    }

    public static function draftsRoot(): string
    {
        $root = self::backendRoot() . '/storage/patient-booking-drafts';
        if (!is_dir($root) && !@mkdir($root, 0775, true) && !is_dir($root)) {
            throw new RuntimeException('Impossible de créer le dossier des brouillons RDV patient.');
        }
        return $root;
    }

    public static function draftDir(string $subdir): string
    {
        $path = self::draftsRoot() . '/' . $subdir;
        if (!is_dir($path) && !@mkdir($path, 0775, true) && !is_dir($path)) {
            throw new RuntimeException('Impossible de créer le dossier brouillon RDV patient.');
        }
        return $path;
    }

    public static function makeStorageSubdir(): string
    {
        return bin2hex(random_bytes(16));
    }
}

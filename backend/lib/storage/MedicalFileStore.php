<?php

declare(strict_types=1);

require_once __DIR__ . '/ObjectStore.php';
require_once __DIR__ . '/LocalObjectStore.php';

/**
 * Fichiers chiffrés des documents médicaux, adressés par leur chemin en base (medical_documents.file_path,
 * ex. /uploads/medical/{id}/{nom}.encrypted). Disque local par défaut ; S3 si MEDICAL_FILES_DRIVER=s3.
 * En mode S3, un fichier absent du bucket est lu sur le disque (fichiers pas encore migrés).
 */
final class MedicalFileStore
{
    private const PATH_PATTERN = '#^/uploads/medical/[A-Za-z0-9_-]+/[^/\\\\]+$#';

    private static ?ObjectStore $store = null;

    public static function pathFor(string $documentId, string $fileName): string
    {
        return '/uploads/medical/' . $documentId . '/' . $fileName;
    }

    public static function put(string $path, string $bytes): void
    {
        self::store()->put(self::key($path), $bytes);
    }

    public static function get(string $path): ?string
    {
        return self::store()->get(self::key($path));
    }

    public static function exists(string $path): bool
    {
        return self::store()->exists(self::key($path));
    }

    /** @return bool true si le fichier n'existe plus */
    public static function delete(string $path): bool
    {
        return self::store()->delete(self::key($path));
    }

    /** Tests : remplace le stockage (null = configuration de l'environnement). */
    public static function useStore(?ObjectStore $store): void
    {
        self::$store = $store;
    }

    public static function store(): ObjectStore
    {
        if (self::$store === null) {
            self::$store = self::fromEnvironment();
        }

        return self::$store;
    }

    /** Clé d'objet : le chemin en base sans « / » initial. Refuse tout chemin hors de uploads/medical/. */
    private static function key(string $path): string
    {
        $path = '/' . ltrim(trim($path), '/');
        if (!preg_match(self::PATH_PATTERN, $path) || str_contains($path, '..')) {
            throw new InvalidArgumentException('Chemin de document invalide');
        }

        return ltrim($path, '/');
    }

    private static function fromEnvironment(): ObjectStore
    {
        $local = new LocalObjectStore(self::backendRoot());
        if (self::env('MEDICAL_FILES_DRIVER') !== 's3') {
            return $local;
        }
        $bucket = (string) self::env('MEDICAL_FILES_BUCKET');
        if ($bucket === '') {
            throw new RuntimeException('MEDICAL_FILES_BUCKET requis quand MEDICAL_FILES_DRIVER=s3');
        }
        require_once __DIR__ . '/S3ObjectStore.php';

        return new S3ObjectStore(
            S3ObjectStore::client((string) (self::env('MEDICAL_FILES_REGION') ?: 'eu-west-3')),
            $bucket,
            $local,
        );
    }

    private static function backendRoot(): string
    {
        return realpath(__DIR__ . '/../..') ?: dirname(__DIR__, 2);
    }

    private static function env(string $key): ?string
    {
        if (!isset($_ENV['DB_HOST'])) {
            require_once __DIR__ . '/../../config/database.php';
        }
        $value = $_ENV[$key] ?? getenv($key);

        return $value === false || $value === null ? null : trim((string) $value);
    }
}

<?php

declare(strict_types=1);

require_once __DIR__ . '/ObjectStore.php';

/** Objets sous un dossier racine (backend/) : la clé uploads/medical/a/b.encrypted → {racine}/uploads/medical/a/b.encrypted. */
final class LocalObjectStore implements ObjectStore
{
    public function __construct(private readonly string $root)
    {
    }

    public function put(string $key, string $bytes): void
    {
        $path = $this->path($key);
        $directory = dirname($path);
        if (!is_dir($directory) && !mkdir($directory, 0755, true) && !is_dir($directory)) {
            throw new RuntimeException('Création du dossier de document impossible');
        }
        if (file_put_contents($path, $bytes) !== strlen($bytes)) {
            throw new RuntimeException('Écriture du fichier de document impossible');
        }
    }

    public function get(string $key): ?string
    {
        $path = $this->path($key);
        if (!is_file($path)) {
            return null;
        }
        $bytes = file_get_contents($path);

        return $bytes === false ? null : $bytes;
    }

    public function exists(string $key): bool
    {
        return is_file($this->path($key));
    }

    public function delete(string $key): bool
    {
        $path = $this->path($key);
        if (is_file($path) && !unlink($path)) {
            return false;
        }
        // Un dossier par document : on le retire s'il est vide.
        $directory = dirname($path);
        if (is_dir($directory) && count(scandir($directory) ?: []) === 2) {
            @rmdir($directory);
        }

        return !is_file($path);
    }

    private function path(string $key): string
    {
        return rtrim($this->root, '/\\') . '/' . ltrim($key, '/');
    }
}

<?php

/**
 * Stockage fichiers image pour care_categories (non chiffré, usage décoratif public).
 */
final class CareCategoryImage
{
    public static function uploadDir(string $backendRoot): string
    {
        return rtrim($backendRoot, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'care-categories';
    }

    public static function ensureUploadDir(string $backendRoot): string
    {
        $dir = self::uploadDir($backendRoot);
        if (!is_dir($dir)) {
            if (!@mkdir($dir, 0755, true)) {
                throw new RuntimeException('Impossible de créer le dossier: ' . $dir);
            }
        }
        return $dir;
    }

    /**
     * Stem fichier (que des hex minuscules, sans tirets), commun aux ids :
     * - UUID MySQL (`CHAR(36)` avec tirets) ;
     * - chaîne hex pure (ex. `bin2hex(random_bytes(18))`, 36 caractères).
     */
    public static function storageStemFromCategoryId(string $categoryId): ?string
    {
        $id = trim($categoryId);
        if ($id === '') {
            return null;
        }
        // UUID canonique (seed / migrations MySQL)
        if (preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $id)) {
            return strtolower(str_replace('-', '', $id));
        }
        // Hex seul (création admin actuelle)
        if (preg_match('/^[a-f0-9]+$/i', $id) && strlen($id) <= 80) {
            return strtolower($id);
        }

        return null;
    }

    public static function isValidCategoryId(string $id): bool
    {
        return self::storageStemFromCategoryId($id) !== null;
    }

    public static function deleteAllForCategory(string $backendRoot, string $categoryId): void
    {
        $stem = self::storageStemFromCategoryId($categoryId);
        if ($stem === null) {
            return;
        }
        $dir = self::uploadDir($backendRoot);
        if (!is_dir($dir)) {
            return;
        }
        foreach (glob($dir . DIRECTORY_SEPARATOR . $stem . '.*') ?: [] as $path) {
            if (is_file($path)) {
                @unlink($path);
            }
        }
    }

    /**
     * Chemin relatif API pour affichage (prefix navigateur).
     */
    public static function publicPathForBasename(string $basename): string
    {
        return '/api/categories/care-image?name=' . rawurlencode($basename);
    }
}

<?php

/**
 * Cache process-local des introspections information_schema (évite 3–5 requêtes par GET /appointments).
 */
final class DbSchemaCache
{
    /** @var array<string, bool> */
    private static array $columnCache = [];

    /** @var array<string, bool> */
    private static array $tableCache = [];

    public static function tableHasColumn(PDO $db, string $table, string $column): bool
    {
        $key = $table . '.' . $column;
        if (!array_key_exists($key, self::$columnCache)) {
            $stmt = $db->prepare('
                SELECT COUNT(*) FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = ?
                  AND COLUMN_NAME = ?
            ');
            $stmt->execute([$table, $column]);
            self::$columnCache[$key] = (int) $stmt->fetchColumn() > 0;
        }

        return self::$columnCache[$key];
    }

    public static function tableExists(PDO $db, string $table): bool
    {
        if (!array_key_exists($table, self::$tableCache)) {
            $stmt = $db->prepare('
                SELECT COUNT(*) FROM information_schema.TABLES
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = ?
            ');
            $stmt->execute([$table]);
            self::$tableCache[$table] = (int) $stmt->fetchColumn() > 0;
        }

        return self::$tableCache[$table];
    }
}

<?php

declare(strict_types=1);

require_once __DIR__ . '/CitySlug.php';
require_once __DIR__ . '/DbSchemaCache.php';

/**
 * Villes distinctes des profils publics (SEO GEO : annuaire infirmiers / laboratoires).
 */
final class DirectoryCities
{
    public const KIND_NURSES = 'nurses';
    public const KIND_LABS = 'labs';

    /**
     * @throws InvalidArgumentException
     */
    public static function normalizeKind(?string $kind): string
    {
        $normalized = trim((string) $kind);
        if ($normalized !== self::KIND_NURSES && $normalized !== self::KIND_LABS) {
            throw new InvalidArgumentException('Le paramètre kind doit être « nurses » ou « labs ».');
        }

        return $normalized;
    }

    public static function roleCondition(string $kind): string
    {
        return match (self::normalizeKind($kind)) {
            self::KIND_NURSES => "role = 'nurse'",
            self::KIND_LABS => "role IN ('lab', 'subaccount')",
        };
    }

    public static function publicProfileCondition(): string
    {
        return "is_public_profile_enabled = TRUE AND public_slug IS NOT NULL AND public_slug != ''";
    }

    /**
     * @return list<array{city: string, slug: string, count: int}>
     */
    public static function list(PDO $db, string $kind): array
    {
        $kind = self::normalizeKind($kind);
        if (!DbSchemaCache::tableHasColumn($db, 'profiles', 'city_plain')) {
            return [];
        }

        $role = self::roleCondition($kind);
        $public = self::publicProfileCondition();
        $sql = "
            SELECT MIN(TRIM(city_plain)) AS city, COUNT(*) AS cnt
            FROM profiles
            WHERE {$role}
              AND {$public}
              AND city_plain IS NOT NULL
              AND TRIM(city_plain) != ''
            GROUP BY LOWER(TRIM(city_plain))
            ORDER BY city ASC
        ";
        $stmt = $db->query($sql);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $data = [];
        foreach ($rows as $row) {
            $city = trim((string) ($row['city'] ?? ''));
            if ($city === '') {
                continue;
            }
            $slug = CitySlug::from($city);
            if ($slug === '') {
                continue;
            }
            $data[] = [
                'city' => $city,
                'slug' => $slug,
                'count' => (int) ($row['cnt'] ?? 0),
            ];
        }

        return $data;
    }

    /**
     * Filtre ville pour listes publiques : nom brut ou slug.
     *
     * @param list<mixed> $baseParams
     * @return array{clause: string, params: list<string>}
     */
    public static function cityFilterClause(PDO $db, string $baseWhere, array $baseParams, string $cityQuery): array
    {
        $cityQuery = trim($cityQuery);
        if ($cityQuery === '') {
            return ['clause' => '', 'params' => []];
        }
        if (!DbSchemaCache::tableHasColumn($db, 'profiles', 'city_plain')) {
            // Fail-closed: never ignore an explicit city filter if the column is missing.
            return ['clause' => ' AND 1=0', 'params' => []];
        }

        $sql = "
            SELECT DISTINCT TRIM(city_plain) AS city
            FROM profiles
            WHERE {$baseWhere}
              AND city_plain IS NOT NULL
              AND TRIM(city_plain) != ''
        ";
        $stmt = $db->prepare($sql);
        $stmt->execute($baseParams);
        $cities = array_column($stmt->fetchAll(PDO::FETCH_ASSOC), 'city');
        $matched = CitySlug::filterMatching($cities, $cityQuery);
        if ($matched === []) {
            return ['clause' => ' AND 1=0', 'params' => []];
        }

        $placeholders = implode(',', array_fill(0, count($matched), '?'));

        return [
            'clause' => " AND TRIM(city_plain) IN ({$placeholders})",
            'params' => $matched,
        ];
    }
}

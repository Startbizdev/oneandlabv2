<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

/**
 * Charge le schéma questionnaire carnet (fichier JSON versionné).
 */
final class HealthRecordSchema
{
    private const CONFIG_PATH = __DIR__ . '/../../config/health-record-schema-v1.json';

    /** @var array<string, mixed>|null */
    private static ?array $cached = null;

    /**
     * @return array<string, mixed>
     */
    public static function definition(): array
    {
        if (self::$cached !== null) {
            return self::$cached;
        }
        $raw = file_get_contents(self::CONFIG_PATH);
        if ($raw === false) {
            throw new RuntimeException('Schéma carnet introuvable');
        }
        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            throw new RuntimeException('Schéma carnet invalide');
        }
        self::$cached = $decoded;

        return $decoded;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public static function sections(?string $gender = null): array
    {
        $def = self::definition();
        $sections = $def['sections'] ?? [];
        if (!is_array($sections)) {
            return [];
        }
        $out = [];
        foreach ($sections as $section) {
            if (!is_array($section)) {
                continue;
            }
            $cond = $section['conditional_gender'] ?? null;
            if ($cond === 'female' && $gender !== 'female') {
                continue;
            }
            $out[] = $section;
        }

        return $out;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public static function allQuestions(?string $gender = null): array
    {
        $questions = [];
        foreach (self::sections($gender) as $section) {
            foreach ($section['questions'] ?? [] as $q) {
                if (is_array($q) && isset($q['key'])) {
                    $questions[] = array_merge($q, [
                        'section_id' => $section['id'],
                        'section_label_fr' => $section['label_fr'] ?? $section['id'],
                        'block' => $section['block'] ?? 'clinical',
                    ]);
                }
            }
        }

        return $questions;
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function questionByKey(string $key, ?string $gender = null): ?array
    {
        foreach (self::allQuestions($gender) as $q) {
            if ((string) ($q['key'] ?? '') === $key) {
                return $q;
            }
        }

        return null;
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function sectionById(string $sectionId, ?string $gender = null): ?array
    {
        foreach (self::sections($gender) as $section) {
            if ((string) ($section['id'] ?? '') === $sectionId) {
                return $section;
            }
        }

        return null;
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function gapMeta(string $gapKey): ?array
    {
        $gaps = self::definition()['gap_labels'] ?? [];

        return is_array($gaps[$gapKey] ?? null) ? $gaps[$gapKey] : null;
    }

    public static function ensureDbSeed(PDO $db): void
    {
        $stmt = $db->query('SELECT id FROM health_record_schema WHERE version = \'1\' LIMIT 1');
        if ($stmt && $stmt->fetchColumn()) {
            return;
        }
        $def = self::definition();
        $db->prepare('
            INSERT INTO health_record_schema (id, version, sections_json, active_from)
            VALUES (?, ?, ?, NOW())
        ')->execute([
            health_uuid(),
            (string) ($def['version'] ?? '1'),
            json_encode($def, JSON_UNESCAPED_UNICODE),
        ]);
    }
}

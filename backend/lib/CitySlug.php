<?php

declare(strict_types=1);

/**
 * Normalisation de noms de villes en slugs SEO (ex. « Saint-Étienne » → « saint-etienne »).
 */
final class CitySlug
{
    public static function from(string $city): string
    {
        $s = trim($city);
        if ($s === '') {
            return '';
        }

        $s = mb_strtolower($s, 'UTF-8');
        if (function_exists('transliterator_transliterate')) {
            $transliterated = transliterator_transliterate('Any-Latin; Latin-ASCII', $s);
            if (is_string($transliterated) && $transliterated !== '') {
                $s = $transliterated;
            }
        } else {
            $converted = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $s);
            if (is_string($converted) && $converted !== '') {
                $s = $converted;
            }
        }

        $s = strtolower($s);
        $s = preg_replace('/[^a-z0-9]+/', '-', $s) ?? '';
        $s = preg_replace('/-+/', '-', $s) ?? '';

        return trim($s, '-');
    }

    /**
     * Accepte un nom de ville brut ou un slug déjà normalisé.
     */
    public static function matches(string $cityPlain, string $query): bool
    {
        $plain = trim($cityPlain);
        $q = trim($query);
        if ($plain === '' || $q === '') {
            return false;
        }

        if (mb_strtolower($plain, 'UTF-8') === mb_strtolower($q, 'UTF-8')) {
            return true;
        }

        $plainSlug = self::from($plain);
        if ($plainSlug === '') {
            return false;
        }

        return $plainSlug === self::from($q) || $plainSlug === $q;
    }

    /**
     * @param list<string> $cityPlains
     * @return list<string>
     */
    public static function filterMatching(array $cityPlains, string $query): array
    {
        $matched = [];
        foreach ($cityPlains as $city) {
            $trimmed = trim((string) $city);
            if ($trimmed !== '' && self::matches($trimmed, $query)) {
                $matched[$trimmed] = $trimmed;
            }
        }

        return array_values($matched);
    }
}

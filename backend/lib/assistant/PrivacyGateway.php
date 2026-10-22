<?php

declare(strict_types=1);

/**
 * Barrière de données : tout ce qui part vers le fournisseur LLM y passe.
 * Noms connus → alias stables pour le tour (« Patient A », « Proche B », « Soignant A ») ; téléphone, e-mail, NIR, IBAN,
 * numéros de dossier, adresse, GPS et code postal masqués ; date de naissance → âge.
 * Les alias renvoyés par le modèle sont réhydratés (y compris en streaming : un alias coupé entre deux chunks est retenu).
 */
final class PrivacyGateway
{
    public const KINDS = ['Patient', 'Proche', 'Soignant'];

    private const ACCENTS = [
        'a' => 'aàâäáã', 'e' => 'eéèêë', 'i' => 'iîïí', 'o' => 'oôöóõ', 'u' => 'uùûüú', 'c' => 'cç', 'y' => 'yÿ', 'n' => 'nñ',
    ];

    private const REGEX_MASKS = [
        '/[\p{L}\p{N}._%+\-]+@[\p{L}\p{N}.\-]+\.[a-z]{2,}/iu' => '[e-mail masqué]',
        '/(?<![\p{L}\p{N}])[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){3,7}(?:\s?[A-Z0-9]{1,4})?(?![\p{L}\p{N}])/iu' => '[IBAN masqué]',
        '/(?<![\p{L}\p{N}])[12][\s.]?\d{2}[\s.]?(?:0[1-9]|1[0-2]|[2-9]\d)[\s.]?(?:\d{2}|2[AB])[\s.]?\d{3}[\s.]?\d{3}(?:[\s.]?\d{2})?(?![\p{L}\p{N}])/iu' => '[n° de sécurité sociale masqué]',
        '/(?<![\p{L}\p{N}+])(?:(?:\+|00)33\s?(?:\(0\)\s?)?|0)[1-9](?:[\s.\-]?\d{2}){4}(?![\p{L}\p{N}])/u' => '[téléphone masqué]',
        '/-?\d{1,3}[.,]\d{4,}\s*[,;\/ ]\s*-?\d{1,3}[.,]\d{4,}/u' => '[position masquée]',
        '/(?<![\p{L}\p{N}])\d{1,4}\s*(?:bis|ter)?\s*,?\s*(?:rue|avenue|av\.?|boulevard|bd|chemin|all[ée]e|impasse|place|route|quai|cours|faubourg|square|r[ée]sidence|lotissement|lieu-dit|voie|passage|mont[ée]e|hameau)(?![\p{L}])[^\n,.;]{0,60}/iu' => '[adresse masquée]',
        '/(?<![\p{L}])(?:rue|avenue|boulevard|impasse|all[ée]e|chemin|quai) (?:de la |de l\'|du |des |de |d\')?\p{Lu}[^\n,.;]{0,40}/u' => '[adresse masquée]',
        '/code postal\s*:?\s*\d{5}/iu' => '[code postal masqué]',
        '/(?<![\p{L}\p{N}])\d{5}\s+(?=\p{Lu}\p{Ll})/u' => '',
    ];

    /** @var array<string, string> alias → nom réel */
    private array $aliases = [];
    /** @var array<string, string> nom normalisé → alias */
    private array $byName = [];
    /** @var array<string, string> alias → type */
    private array $kinds = [];
    /** @var array<string, int> */
    private array $counters = [];
    /** @var list<array{0: string, 1: string, 2: bool}>|null motif, alias, majuscule initiale exigée */
    private ?array $patterns = null;
    private string $pending = '';

    /** Alias stable du nom pour ce tour (même alias pour le nom complet, le prénom seul et le nom seul). */
    public function alias(string $fullName, string $kind = 'Patient'): string
    {
        $fullName = trim((string) preg_replace('/\s+/u', ' ', $fullName));
        $kind = in_array($kind, self::KINDS, true) ? $kind : 'Patient';
        $key = self::fold($fullName);
        if ($key === '') {
            return $kind === 'Patient' ? 'le patient' : mb_strtolower($kind);
        }
        if (isset($this->byName[$key])) {
            return $this->byName[$key];
        }
        $n = $this->counters[$kind] = ($this->counters[$kind] ?? 0) + 1;
        $alias = $kind . ' ' . self::suffix($n);
        $this->aliases[$alias] = $fullName;
        $this->kinds[$alias] = $kind;
        $this->byName[$key] = $alias;
        $this->patterns = null;

        return $alias;
    }

    /** @return list<array{0: string, 1: string}> noms connus et leur type (stockés chiffrés avec le message) */
    public function names(): array
    {
        $out = [];
        foreach ($this->aliases as $alias => $name) {
            $out[] = [$name, $this->kinds[$alias]];
        }

        return $out;
    }

    public function mask(string $text): string
    {
        $text = (string) preg_replace_callback(
            '/(?<![\p{L}])(?:n[ée]e?s?|naissance|ddn)\s*(?:le|:)?\s*(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/iu',
            static function (array $m): string {
                $age = self::ageFromBirthDate(sprintf('%04d-%02d-%02d', $m[3], $m[2], $m[1]));

                return $age !== null ? 'âgé(e) de ' . $age . ' ans' : '[date masquée]';
            },
            $text,
        );
        $text = (string) preg_replace_callback(
            '/(?<![\p{L}])(n°|no\.|num[ée]ro|dossier|ipp|r[ée]f[ée]rence|r[ée]f\.)(\s*(?:de dossier)?\s*:?\s*)([A-Z0-9][A-Z0-9\-\/]{4,})/iu',
            static fn (array $m): string => preg_match('/\d/', $m[3]) === 1 ? $m[1] . $m[2] . '[numéro masqué]' : $m[0],
            $text,
        );
        foreach (self::REGEX_MASKS as $pattern => $replacement) {
            $text = (string) preg_replace($pattern, $replacement, $text);
        }
        foreach ($this->patterns() as [$pattern, $alias, $capitalOnly]) {
            $text = (string) preg_replace_callback($pattern, static function (array $m) use ($alias, $capitalOnly): string {
                $first = mb_substr($m[0], 0, 1);

                return !$capitalOnly || ($first !== mb_strtolower($first)) ? $alias : $m[0];
            }, $text);
        }

        return $text;
    }

    /** Masque récursivement les chaînes d'un résultat d'outil (les identifiants techniques sont conservés). */
    public function maskData(mixed $data, string $key = ''): mixed
    {
        if (is_array($data)) {
            $out = [];
            foreach ($data as $k => $v) {
                $out[$k] = $this->maskData($v, (string) $k);
            }

            return $out;
        }
        if (!is_string($data) || preg_match('/(?:^|_)id$|^date$/', $key) === 1) {
            return $data;
        }

        return $this->mask($data);
    }

    public function rehydrate(string $text): string
    {
        if ($this->aliases === []) {
            return $text;
        }
        $keys = array_keys($this->aliases);
        usort($keys, static fn (string $a, string $b): int => strlen($b) <=> strlen($a));
        $quoted = array_map(static fn (string $a): string => preg_quote($a, '/'), $keys);

        return (string) preg_replace_callback(
            '/(?<![\p{L}\p{N}])(?:' . implode('|', $quoted) . ')(?![\p{L}\p{N}])/u',
            fn (array $m): string => $this->aliases[$m[0]],
            $text,
        );
    }

    /** Réhydrate un chunk de stream ; retient la fin qui pourrait être le début d'un alias. */
    public function rehydrateStream(string $chunk): string
    {
        $buffer = $this->pending . $chunk;
        $this->pending = '';
        if ($this->aliases === []) {
            return $buffer;
        }
        $length = strlen($buffer);
        $maxAlias = max(array_map('strlen', array_keys($this->aliases)));
        for ($p = max(0, $length - $maxAlias); $p < $length; $p++) {
            if ($p > 0 && preg_match('/[\p{L}\p{N}]$/u', substr($buffer, 0, $p)) === 1) {
                continue;
            }
            $tail = substr($buffer, $p);
            foreach (array_keys($this->aliases) as $alias) {
                if (str_starts_with($alias, $tail)) {
                    $this->pending = $tail;

                    return $this->rehydrate(substr($buffer, 0, $p));
                }
            }
        }

        return $this->rehydrate($buffer);
    }

    public function flush(): string
    {
        $rest = $this->pending;
        $this->pending = '';

        return $this->rehydrate($rest);
    }

    public static function ageFromBirthDate(?string $ymd): ?int
    {
        $date = $ymd !== null ? DateTimeImmutable::createFromFormat('!Y-m-d', substr(trim($ymd), 0, 10)) : false;
        if ($date === false) {
            return null;
        }
        $age = $date->diff(new DateTimeImmutable('today'))->y;

        return $age >= 0 && $age < 130 ? $age : null;
    }

    /** @return list<array{0: string, 1: string, 2: bool}> */
    private function patterns(): array
    {
        if ($this->patterns !== null) {
            return $this->patterns;
        }
        $full = [];
        $tokens = [];
        foreach ($this->aliases as $alias => $name) {
            $parts = preg_split('/\s+/u', $name) ?: [];
            if (count($parts) > 1) {
                $full[] = [self::namePattern($parts), $alias];
                $full[] = [self::namePattern(array_reverse($parts)), $alias];
            }
            foreach ($parts as $part) {
                if (mb_strlen($part) >= 3) {
                    $tokens[] = [self::namePattern([$part]), $alias, mb_strlen($part)];
                }
            }
        }
        usort($full, static fn (array $a, array $b): int => strlen($b[0]) <=> strlen($a[0]));
        usort($tokens, static fn (array $a, array $b): int => $b[2] <=> $a[2]);
        $this->patterns = [];
        foreach ($full as [$pattern, $alias]) {
            $this->patterns[] = [$pattern, $alias, false];
        }
        foreach ($tokens as [$pattern, $alias]) {
            $this->patterns[] = [$pattern, $alias, true];
        }

        return $this->patterns;
    }

    /** @param list<string> $parts */
    private static function namePattern(array $parts): string
    {
        $words = [];
        foreach ($parts as $part) {
            $chars = '';
            foreach (mb_str_split(self::fold($part)) as $char) {
                if (isset(self::ACCENTS[$char])) {
                    $chars .= '[' . self::ACCENTS[$char] . ']';
                } elseif ($char === '-' || $char === "'" || $char === '’') {
                    $chars .= '[\s\-\'’]?';
                } else {
                    $chars .= preg_quote($char, '/');
                }
            }
            $words[] = $chars;
        }

        return '/(?<![\p{L}\p{N}])' . implode('[\s\-]+', $words) . '(?![\p{L}\p{N}])/iu';
    }

    /** Minuscules sans accents (comparaison des noms). */
    private static function fold(string $value): string
    {
        $value = mb_strtolower(trim($value));
        foreach (self::ACCENTS as $base => $variants) {
            $value = str_replace(mb_str_split(mb_substr($variants, 1)), $base, $value);
        }

        return $value;
    }

    private static function suffix(int $n): string
    {
        $suffix = '';
        for (; $n > 0; $n = intdiv($n - 1, 26)) {
            $suffix = chr(65 + ($n - 1) % 26) . $suffix;
        }

        return $suffix;
    }
}

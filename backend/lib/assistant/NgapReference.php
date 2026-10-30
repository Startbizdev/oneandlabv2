<?php

declare(strict_types=1);

/**
 * NGAP officielle (Assurance Maladie) découpée en passages : l'assistant répond aux questions de cotation
 * à partir de ce texte seulement. Index construit par scripts/build-ngap-index.php depuis le PDF d'ameli.fr ;
 * pour une nouvelle version, on remplace le PDF et on relance le script, sans toucher au code.
 */
final class NgapReference
{
    public const INDEX = __DIR__ . '/../../resources/ngap/ngap-index.json';
    private const CHUNK_MAX = 2800;
    private const PASSAGE_MAX = 2500;
    /** En-têtes et pieds de page répétés à chaque page du PDF (version, numéro, partie). */
    private const PAGE_NOISE = '/^(?:Version en vigueur (?:au|du) .*|\d{1,3}|(?:Première|Deuxième|Troisième) partie\s*:.*)$/u';
    private const STOPWORDS = [
        'les', 'des', 'une', 'pour', 'par', 'sur', 'dans', 'avec', 'est', 'sont', 'que', 'qui', 'quel', 'quelle',
        'quels', 'quelles', 'comment', 'coter', 'cote', 'cotation', 'cotations', 'acte', 'actes', 'faut', 'peut',
        'aux', 'mon', 'mes', 'son', 'ses', 'leur', 'plus', 'pas', 'fait', 'faire', 'cette', 'ces', 'entre', 'ngap',
    ];

    /** Mots du quotidien → termes de la nomenclature. */
    private const SYNONYMS = [
        'sang' => ['prelevement', 'ponction', 'veineuse'],
        'piqure' => ['injection'],
        'pansements' => ['pansement'],
        'nuit' => ['majoration'],
        'dimanche' => ['majoration'],
    ];

    /** @var array{version: string, chunks: list<array{title: string, text: string}>}|null */
    private static ?array $index = null;

    public static function available(): bool
    {
        return is_file(self::INDEX);
    }

    public static function version(): ?string
    {
        return self::load()['version'] ?? null;
    }

    /**
     * Passages les plus pertinents pour la question (au plus $limit), dans l'index chargé ou celui fourni.
     *
     * @param array{version: string, chunks: list<array{title: string, text: string}>}|null $index
     * @return list<array{titre: string, texte: string}>
     */
    public static function search(string $query, int $limit = 4, ?array $index = null): array
    {
        $index ??= self::load();
        if ($index === null || $index['chunks'] === []) {
            return [];
        }
        $terms = [];
        foreach (self::tokens($query) as $token) {
            if (!in_array($token, self::STOPWORDS, true)) {
                array_push($terms, $token, ...(self::SYNONYMS[$token] ?? []));
            }
        }
        $terms = array_values(array_unique($terms));
        if ($terms === []) {
            return [];
        }
        $docs = [];
        $df = array_fill_keys($terms, 0);
        foreach ($index['chunks'] as $i => $chunk) {
            $counts = array_count_values(self::tokens($chunk['title'] . ' ' . $chunk['text']));
            $title = array_flip(self::tokens($chunk['title']));
            $docs[$i] = [$counts, $title];
            foreach ($terms as $term) {
                if (isset($counts[$term])) {
                    $df[$term]++;
                }
            }
        }
        $n = count($index['chunks']);
        $scores = [];
        foreach ($docs as $i => [$counts, $title]) {
            $score = 0.0;
            foreach ($terms as $term) {
                if (!isset($counts[$term])) {
                    continue;
                }
                $idf = log(1 + $n / max(1, $df[$term]));
                $score += $idf * (1 + log($counts[$term])) * (isset($title[$term]) ? 2 : 1);
            }
            if ($score > 0) {
                $scores[$i] = $score;
            }
        }
        arsort($scores);

        $out = [];
        foreach (array_slice(array_keys($scores), 0, max(1, min(6, $limit))) as $i) {
            $chunk = $index['chunks'][$i];
            $out[] = ['titre' => $chunk['title'], 'texte' => mb_substr($chunk['text'], 0, self::PASSAGE_MAX)];
        }

        return $out;
    }

    /**
     * Découpe le texte extrait du PDF : un passage par article, sous son titre et son chapitre.
     *
     * @return array{version: string, chunks: list<array{title: string, text: string}>}
     */
    public static function buildIndex(string $text, string $fallbackVersion): array
    {
        $text = str_replace(["\r\n", "\r", "\f"], "\n", $text);
        $version = preg_match('/version\s+(?:du|en vigueur (?:au|du))\s+(\d{1,2}(?:er)?\s+\p{L}+\s+\d{4}|\d{2}\/\d{2}\/\d{4})/iu', mb_substr($text, 0, 6000), $m) === 1
            ? trim($m[1])
            : $fallbackVersion;

        $titre = $chapitre = '';
        $article = 'Dispositions';
        $buffer = [];
        $chunks = [];
        $flush = static function () use (&$buffer, &$chunks, &$titre, &$chapitre, &$article): void {
            $body = trim((string) preg_replace(['/[ \t]+/', '/\n{2,}/'], [' ', "\n"], implode("\n", $buffer)));
            $buffer = [];
            if (mb_strlen($body) < 40) {
                return;
            }
            $title = implode(' › ', array_filter([$titre, $chapitre, $article]));
            foreach (self::split($body) as $k => $piece) {
                $chunks[] = ['title' => $k === 0 ? $title : $title . ' (suite)', 'text' => $piece];
            }
        };
        foreach (explode("\n", $text) as $line) {
            $trim = trim($line);
            if (preg_match(self::PAGE_NOISE, $trim) === 1) {
                continue;
            }
            if (preg_match('/^TITRE\s+[IVXLC]+\b/u', $trim) === 1) {
                $flush();
                $titre = self::heading($trim);
                $chapitre = '';
                $article = '';
            } elseif (preg_match('/^CHAPITRE\s+[IVXLC]+\b/u', $trim) === 1) {
                $flush();
                $chapitre = self::heading($trim);
                $article = '';
            } elseif (preg_match('/^Article\s+\d+[\w\-]*/u', $trim) === 1) {
                $flush();
                $article = self::heading($trim);
            } else {
                $buffer[] = $trim;
            }
        }
        $flush();

        return ['version' => $version, 'chunks' => $chunks];
    }

    /** @return list<string> mots en minuscules sans accents */
    public static function tokens(string $text): array
    {
        $text = mb_strtolower($text);
        $text = strtr($text, ['à' => 'a', 'â' => 'a', 'ä' => 'a', 'é' => 'e', 'è' => 'e', 'ê' => 'e', 'ë' => 'e', 'î' => 'i', 'ï' => 'i', 'ô' => 'o', 'ö' => 'o', 'ù' => 'u', 'û' => 'u', 'ü' => 'u', 'ç' => 'c', 'œ' => 'oe']);
        preg_match_all('/[a-z0-9]{2,}/', $text, $m);

        return $m[0];
    }

    /** @return list<string> */
    private static function split(string $body): array
    {
        if (mb_strlen($body) <= self::CHUNK_MAX) {
            return [$body];
        }
        $pieces = [];
        $current = '';
        foreach (explode("\n", $body) as $line) {
            if ($current !== '' && mb_strlen($current) + mb_strlen($line) > self::CHUNK_MAX) {
                $pieces[] = trim($current);
                $current = '';
            }
            $current .= $line . "\n";
        }
        if (trim($current) !== '') {
            $pieces[] = trim($current);
        }

        return $pieces;
    }

    private static function heading(string $line): string
    {
        return mb_substr(trim((string) preg_replace('/\s+/', ' ', $line)), 0, 120);
    }

    /** @return array{version: string, chunks: list<array{title: string, text: string}>}|null */
    private static function load(): ?array
    {
        if (self::$index === null && self::available()) {
            $data = json_decode((string) file_get_contents(self::INDEX), true);
            self::$index = is_array($data) && isset($data['chunks']) && is_array($data['chunks']) ? $data : null;
        }

        return self::$index;
    }
}

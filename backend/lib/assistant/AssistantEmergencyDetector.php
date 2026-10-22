<?php

declare(strict_types=1);

/**
 * Détection déterministe des urgences vitales, appliquée AVANT le modèle : réponse fixe (15 / 112 / 3114),
 * aucun appel au fournisseur. Écarte les négations, les questions informatives et les épisodes anciens ;
 * le risque suicidaire est toujours signalé. Règles reprises de l'ancien détecteur Cary.
 */
final class AssistantEmergencyDetector
{
    /** Suite qui transforme « parler », « difficulté à parler » en sujet social, pas en trouble neurologique. */
    private const SPEECH_TOPIC = '(?! (?:en public|de |d |avec |a (?:mon|ma|mes|son|sa|ses|un|une|des|quelqu)|aux ))';

    /** Ordre = priorité quand plusieurs familles correspondent. */
    private const PATTERNS = [
        'suicide' => [
            '/\b(?:suicid|suissid|suicd)\w*/',
            '/\b(?:envie|idees?|pense|pensees?) (?:de |d )?(?:mourir|me tuer|en finir)\b/',
            '/\b(?:veux|voudrais|vais|aimerais) (?:mourir|me tuer)\b/',
            '/(?<!va )(?<!vont )(?<!vas )\bme (?:tuer|pendre|foutre en l air|jeter sous)\b/',
            '/\bmettre fin a (?:mes jours|ma vie|mon existence)\b/',
            '/\b(?:plus|pas) envie de vivre\b/',
            '/\ben finir(?! avec (?:ce|cette|ces|le|la|les|mon|mes|un|une|son|sa|ses)\b(?! vie))\b/',
        ],
        'cardiac' => [
            '/\b(?:douleur|douleure|doleur|douler|mal|serrement|oppression)s? (?:\w+ ){0,4}(?:poitrine|poitrinne|poitrin|thorax|thoraci\w*|toraci\w*|thorassi\w*|thoraxi\w*)\b/',
            '/\b(?:poitrine|poitrinne|thorax) (?:qui )?(?:serre|comprime|ecrase)\w*/',
            '/\b(?:crise cardiaque|infarctus|infractus|arret cardiaque)\b/',
        ],
        'stroke' => [
            '/\ba ?v ?c\b/',
            '/\b(?:paralys|paralis|hemipleg)\w*+(?! (?:par|de) (?:la |le )?(?:peur|stress|angoisse|trac|timidite))/',
            '/\b(?:visage|bouche|levre) (?:qui )?(?:tombe|de travers|deform\w*|paralys\w*)/',
            '/\b(?:n arrive|arrive|peut|peux|parvient) (?:plus|pas) a parler\b' . self::SPEECH_TOPIC . '/',
            '/\b(?:trouble|difficulte)s? (?:de la |a )?(?:parole|parler)\b' . self::SPEECH_TOPIC . '/',
            '/\bparle (?:bizarrement|de travers|tres mal|plus du tout)\b/',
            '/\b(?:peux|peut|arrive) (?:plus|pas) (?:a )?bouger (?:\w+ ){0,2}(?:bras|jambe|cote)\b/',
            '/\bplus de force dans (?:\w+ ){0,2}(?:bras|jambe)\b/',
            '/\bperte (?:brutale |soudaine )?de (?:la )?(?:vue|vision)(?: brutale| soudaine)?\b/',
        ],
        'respiratory' => [
            '/\b(?:n arrive|arrive|peux|peut|parviens|parvient) (?:plus|pas) a (?:respirer|respirrer|reprendre (?:mon|son) souffle)\b/',
            '/\bne (?:peux|peut) (?:plus|pas) respirer\b/',
            '/\bne respire plus\b/',
            '/\b(?:j |m |s )?etouf+e\w*+(?! (?:de chaleur|dans (?:ce|cette|mon|ma|le|la)))|\bsuffoqu\w*/',
            '/\bdetresse respiratoire\b/',
            '/\b(?:grosse|grande|forte|serieuse)s? difficultes? a respirer\b/',
            '/\bmanque d air (?:important|grave|terrible|brutal)\b/',
            '/\blevres? (?:toutes? )?bleue?s?\b/',
        ],
        'bleeding' => [
            '/\b(?:hemorragie|hemoragie|hemorrhagie)\w*/',
            '/\bsaigne\w* (?:enormement|beaucoup|abondamment|sans arret|de partout)\b/',
            '/\bsaigne\w* (?:\w+ ){0,3}(?:ne s arrete pas|s arrete pas)\b/',
            '/\bsaignement\w* (?:abondant|important|massif|qui ne s arrete pas)\w*/',
            '/\bperd\w* beaucoup de sang\b/',
            '/\b(?:vomi|crache)\w* du sang\b/',
        ],
        'poisoning' => [
            '/\b(?:intoxication|intoxique|empoisonn\w*|overdose|surdose)\b/',
            '/\b(?:avale|bu|bois|pris) (?:\w+ ){0,2}(?:javel|detergent|produit menager|produit toxique|white spirit|antigel)\b/',
            '/\b(?:avale|pris) (?:\w+ ){0,2}(?:toute la boite|tous les comprimes|trop de (?:medicaments|comprimes|cachets|pilules))\b/',
            '/\bmonoxyde de carbone\b/',
        ],
        'other' => [
            '/\b(?:inconscient|inconsciente|ne se reveille pas|perd connaissance|a perdu connaissance|vient de perdre connaissance)\b/',
            '/\b(?:convuls\w*|crise d epilepsie)\b/',
            '/\b(?:gorge|langue) (?:qui )?gonfl\w*/',
            '/\b(?:oedeme de quincke|anaphyla\w*|choc allergique|reaction allergique grave)\b/',
        ],
    ];

    /** Situations courantes qui ressemblent à une famille d'urgence sans en être une. */
    private const KIND_EXCLUSIONS = [
        'bleeding' => '/\b(?:gencives?|regles|menstruations?)\b/',
        'poisoning' => '/\bintoxication alimentaire\b/',
        'stroke' => '/\bparalysie du sommeil\b/',
    ];

    /** Négation juste avant le symptôme, séparée de lui par de simples mots outils (« pas eu de », « plus de »). */
    private const NEGATION_BEFORE = '/(?:\b(?:pas|aucune?|sans|jamais)|\bne? (?:\w+ )?plus|\bplus de)(?: (?:eu|de|d|du|des|une?|vraiment|encore|trop|tellement))*\s*$/';

    private const INFORMATIONAL = '/^(?:c est quoi|qu est ce qu|quels? (?:sont|est)|quelle est|comment (?:reconnaitre|savoir|prevenir|eviter|soigner)|que faire en cas|definition|explique|parle moi)\b|\b(?:symptomes?|signes?) (?:d un|d une|de l|du|des)\b|\ben cas d\b/';

    private const PERSONAL_MARKERS = '/\b(?:j ai|jai|je|j|me|moi|mon|ma|mes|depuis|maintenant|en ce moment|actuellement|il a|elle a|mari|femme|enfant|fils|fille|pere|mere|patient|patiente)\b/';

    private const PAST_MARKERS = '/\bil y a (?:\d+|un|une|deux|trois|quatre|cinq|six|dix|quelques|plusieurs) (?:ans?|annees?|mois|semaines?)\b|\b(?:l an dernier|l annee derniere|l an passe|en (?:19|20)\d\d|quand j etais|autrefois|dans le passe|antecedents?|par le passe|post|sequelles?)\b/';

    /**
     * @return array{kind: string, message: string, number: string, numbers: list<string>}|null
     */
    public static function detect(string $message): ?array
    {
        $text = self::normalize($message);
        if ($text === '') {
            return null;
        }
        $informational = preg_match(self::INFORMATIONAL, $text) === 1 && preg_match(self::PERSONAL_MARKERS, $text) !== 1;
        $past = preg_match(self::PAST_MARKERS, $text) === 1;
        foreach (self::PATTERNS as $kind => $patterns) {
            if ($kind !== 'suicide' && ($informational || $past)) {
                continue;
            }
            if (isset(self::KIND_EXCLUSIONS[$kind]) && preg_match(self::KIND_EXCLUSIONS[$kind], $text) === 1) {
                continue;
            }
            foreach ($patterns as $pattern) {
                if (self::matchesWithoutNegation($pattern, $text)) {
                    return self::response($kind);
                }
            }
        }

        return null;
    }

    /** @return array{kind: string, message: string, number: string, numbers: list<string>} */
    public static function response(string $kind): array
    {
        if ($kind === 'suicide') {
            return [
                'kind' => 'suicide',
                'message' => 'Vous n\'êtes pas seul(e). Appelez le 3114 (prévention du suicide, gratuit, 24h/24) ou le 15 '
                    . 'en cas de danger immédiat. Si vous le pouvez, restez auprès d\'une personne de confiance.',
                'number' => '3114',
                'numbers' => ['3114', '15'],
            ];
        }

        return [
            'kind' => $kind,
            'message' => 'Ce que vous décrivez peut être une urgence vitale. Appelez immédiatement le 15 (SAMU) ou le 112. '
                . 'Ne prenez pas la route vous-même et ne restez pas seul(e).',
            'number' => '15',
            'numbers' => ['15', '112'],
        ];
    }

    private static function matchesWithoutNegation(string $pattern, string $text): bool
    {
        if (preg_match_all($pattern, $text, $matches, PREG_OFFSET_CAPTURE) < 1) {
            return false;
        }
        foreach ($matches[0] as [, $offset]) {
            $before = substr($text, max(0, $offset - 40), min(40, $offset));
            if (preg_match(self::NEGATION_BEFORE, $before) !== 1) {
                return true;
            }
        }

        return false;
    }

    private static function normalize(string $message): string
    {
        $text = mb_strtolower(trim($message));
        $text = strtr($text, [
            'à' => 'a', 'â' => 'a', 'ä' => 'a', 'á' => 'a',
            'é' => 'e', 'è' => 'e', 'ê' => 'e', 'ë' => 'e',
            'î' => 'i', 'ï' => 'i', 'í' => 'i',
            'ô' => 'o', 'ö' => 'o', 'ó' => 'o',
            'ù' => 'u', 'û' => 'u', 'ü' => 'u', 'ú' => 'u',
            'ç' => 'c', 'œ' => 'oe', 'æ' => 'ae', 'ÿ' => 'y',
        ]);
        $text = preg_replace('/[^a-z0-9]+/', ' ', $text) ?? $text;
        $text = preg_replace('/\s+/', ' ', $text) ?? $text;

        return trim(str_replace('de plus en plus', 'davantage', $text));
    }
}

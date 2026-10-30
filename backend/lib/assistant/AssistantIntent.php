<?php

declare(strict_types=1);

/**
 * Détection déterministe des demandes courantes (prise de rendez-vous, type de soin, jour et heure souhaités).
 * Partagée par le fournisseur mock et par le service de chat, qui garantit la bonne carte d'action quel que soit le modèle.
 */
final class AssistantIntent
{
    private const BOOK = '/\b(prendre|r[ée]server|planifier|programmer|organiser|nouveau|nouvelle|besoin d.?un|je (voudrais|veux|souhaite)( faire)?( un| une)?)\b.{0,40}(rendez-vous|\brdv\b|prise de sang|bilan|soin|infirmi|pansement|injection|pr[ée]l[èe]vement)|^(un|une) (rdv|rendez-vous|prise de sang)/iu';
    private const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    private const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    /** Plage proposée : 2 heures à partir de l'heure citée, dans les horaires de passage (7 h – 19 h). */
    private const FIRST_HOUR = 7;
    private const LAST_HOUR = 19;

    /** Un moment cité (« demain matin », « jeudi », « 8 h ») avec un besoin de soin vaut aussi demande de rendez-vous. */
    private const WHEN = '/(?<!\p{L})(aujourd.?hui|demain|apr[èe]s-demain|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|semaine prochaine|matin|apr[èe]s-midi|\d{1,2}\s*h)(?!\p{L})/iu';
    private const NEED = '/(?<!\p{L})(passer|venir|domicile|soin|suivi|vaccin\p{L}*|pansement|plaie|injection|piq[uû]re|perfusion|prise de sang|pr[ée]l[èe]vement|infirmi\p{L}*|rendez-vous|rdv)(?!\p{L})/iu';
    /** Questions sur l'existant (« quand est mon rendez-vous ? ») : jamais une demande de réservation. */
    private const ASKS_EXISTING = '/^\s*(quand|quel|quels|quelle|quelles|o[ùu]|est-ce)(?!\p{L})|(?<!\p{L})(mes|mon|ma) (prochains?|rendez-vous|rdv|r[ée]sultats?|tourn[ée]e)(?!\p{L})/iu';

    public static function wantsBooking(string $question): bool
    {
        if (preg_match(self::BOOK, $question) === 1) {
            return true;
        }

        return preg_match(self::ASKS_EXISTING, $question) !== 1
            && preg_match(self::WHEN, $question) === 1
            && preg_match(self::NEED, $question) === 1;
    }

    /** blood_test, nursing ou null si la demande ne précise pas le soin. */
    public static function careType(string $question): ?string
    {
        if (preg_match('/prise de sang|bilan|analyse|pr[ée]l[èe]vement/iu', $question) === 1) {
            return 'blood_test';
        }
        if (preg_match('/infirmi|pansement|injection|soin/iu', $question) === 1) {
            return 'nursing';
        }

        return null;
    }

    /**
     * Jour (AAAA-MM-JJ, jamais dans le passé) et plage horaire cités dans la demande ; clés absentes si non cités.
     *
     * @return array{date?: string, time_from?: string, time_to?: string}
     */
    public static function slot(string $question, DateTimeImmutable $today): array
    {
        $text = mb_strtolower($question);
        $today = $today->setTime(0, 0);
        $out = [];
        $date = null;
        if (preg_match('/\baujourd.?hui\b/u', $text) === 1) {
            $date = $today;
        } elseif (preg_match('/\bapr[èe]s-?demain\b/u', $text) === 1) {
            $date = $today->modify('+2 days');
        } elseif (preg_match('/\bdemain\b/u', $text) === 1) {
            $date = $today->modify('+1 day');
        } elseif (preg_match('/\b(\d{1,2})(?:er)?\s+(' . implode('|', self::MONTHS) . ')\b/u', $text, $m) === 1) {
            $date = self::nextDate($today, (int) (array_search($m[2], self::MONTHS, true)) + 1, (int) $m[1]);
        } elseif (preg_match('/\b(\d{1,2})\/(\d{1,2})\b/u', $text, $m) === 1) {
            $date = self::nextDate($today, (int) $m[2], (int) $m[1]);
        } elseif (preg_match('/\b(' . implode('|', self::WEEKDAYS) . ')\b/u', $text, $m) === 1) {
            $target = (int) array_search($m[1], self::WEEKDAYS, true);
            $ahead = ($target - (int) $today->format('w') + 7) % 7;
            $date = $today->modify('+' . ($ahead === 0 ? 7 : $ahead) . ' days');
        }
        if ($date !== null) {
            $out['date'] = $date->format('Y-m-d');
        }

        $hour = null;
        if (preg_match('/\b(\d{1,2})\s*(?:h|heures?)(?:\s*\d{2})?\b/u', $text, $m) === 1) {
            $hour = (int) $m[1];
        } elseif (preg_match('/\bmatin/u', $text) === 1) {
            $hour = 8;
        } elseif (preg_match('/\bapr[èe]s-?midi\b/u', $text) === 1) {
            $hour = 14;
        } elseif (preg_match('/\bsoir/u', $text) === 1) {
            $hour = 17;
        }
        if ($hour !== null && $hour >= 0 && $hour <= 23) {
            $from = max(self::FIRST_HOUR, min(self::LAST_HOUR - 2, $hour));
            $out['time_from'] = (string) $from;
            $out['time_to'] = (string) ($from + 2);
        }

        return $out;
    }

    /**
     * Le soin (nom + description de la catégorie) répond-il au besoin décrit ? Comparaison par racines de 5 lettres
     * (« diabétique » ↔ « Suivi diabète », « plaie » ↔ « Pansement-plaie ») ; les mots trop généraux ne comptent pas,
     * pour qu'une simple « prise de sang » ne choisisse pas un bilan au hasard.
     */
    public static function careMatches(string $name, string $description, string $question): bool
    {
        $asked = self::stems($question);
        foreach (self::QUESTION_SYNONYMS as $pattern => $stem) {
            if (preg_match($pattern, self::fold($question)) === 1) {
                $asked[] = $stem;
            }
        }
        $care = array_diff(self::stems($name . ' ' . $description), self::GENERIC_STEMS);

        return array_intersect($care, $asked) !== [];
    }

    /** Racines (5 premières lettres) des mots de 5 lettres ou plus, sans accents. */
    private static function stems(string $text): array
    {
        $out = [];
        foreach (preg_split('/[^a-z]+/', self::fold($text)) ?: [] as $word) {
            if (strlen($word) >= 5) {
                $out[] = substr($word, 0, 5);
            }
        }

        return array_values(array_unique($out));
    }

    private static function fold(string $text): string
    {
        return strtr(mb_strtolower($text), [
            'é' => 'e', 'è' => 'e', 'ê' => 'e', 'ë' => 'e', 'à' => 'a', 'â' => 'a', 'î' => 'i', 'ï' => 'i',
            'ô' => 'o', 'û' => 'u', 'ù' => 'u', 'ü' => 'u', 'ç' => 'c', 'œ' => 'oe',
        ]);
    }

    /** Mots trop généraux pour désigner un soin précis (racines). */
    private const GENERIC_STEMS = [
        'bilan', 'soins', 'exame', 'suivi', 'autre', 'prele', 'selon', 'presc', 'compl', 'trait', 'medic', 'infir',
        'domic', 'sante', 'perso', 'admin', 'preci', 'deman', 'catal', 'cible', 'confo',
    ];

    /** Expressions courantes → racine du soin correspondant. */
    private const QUESTION_SYNONYMS = [
        '/prise de sang|analyse de sang|analyses? sanguines?/' => 'sangu',
        '/piqure|piqûre/' => 'injec',
        '/enceinte|grossesse/' => 'gross',
        '/toilette|se laver/' => 'hygie',
        '/glycemie|sucre/' => 'diabe',
        '/fils|agrafes?|points de suture/' => 'agraf',
        '/tension|constantes/' => 'const',
        '/sortie d.hopital|retour d.hopital|hospitalis/' => 'hospi',
    ];

    /** Prochaine occurrence du jour/mois (cette année, sinon la suivante) ; null si la date n'existe pas. */
    private static function nextDate(DateTimeImmutable $today, int $month, int $day): ?DateTimeImmutable
    {
        foreach ([(int) $today->format('Y'), (int) $today->format('Y') + 1] as $year) {
            if (checkdate($month, $day, $year)) {
                $date = $today->setDate($year, $month, $day);
                if ($date >= $today) {
                    return $date;
                }
            }
        }

        return null;
    }
}

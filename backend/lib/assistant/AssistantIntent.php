<?php

declare(strict_types=1);

/**
 * Détection déterministe des demandes courantes (prise de rendez-vous, type de soin). Partagée par le fournisseur
 * mock et par le service de chat, qui garantit la bonne carte d'action quel que soit le modèle.
 */
final class AssistantIntent
{
    private const BOOK = '/\b(prendre|r[ée]server|planifier|programmer|organiser|nouveau|nouvelle|besoin d.?un|je (voudrais|veux|souhaite)( faire)?( un| une)?)\b.{0,40}(rendez-vous|\brdv\b|prise de sang|bilan|soin|infirmi|pansement|injection|pr[ée]l[èe]vement)|^(un|une) (rdv|rendez-vous|prise de sang)/iu';

    public static function wantsBooking(string $question): bool
    {
        return preg_match(self::BOOK, $question) === 1;
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
}

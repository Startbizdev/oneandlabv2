<?php

/**
 * Identifiant professionnel infirmier : RPPS (11 chiffres) ou Adeli (9 chiffres), un seul champ.
 */
class ProfessionalId
{
    public const LABEL = 'RPPS ou Adeli';
    public const PRO_IPA_EMPLOI = 'Infirmier IPA';

    public static function isProIpaEmploi(?string $emploi): bool
    {
        return trim((string) $emploi) === self::PRO_IPA_EMPLOI;
    }

    public static function normalize(string $raw): string
    {
        return preg_replace('/\s+/', '', trim($raw)) ?? '';
    }

    /** @return string|null Message d'erreur ou null si valide */
    public static function validate(string $raw): ?string
    {
        $n = self::normalize($raw);
        if ($n === '') {
            return 'Le numéro ' . self::LABEL . ' est obligatoire.';
        }
        if (!ctype_digit($n)) {
            return 'Le numéro ' . self::LABEL . ' ne doit contenir que des chiffres.';
        }
        if (strlen($n) === 9 || strlen($n) === 11) {
            return null;
        }

        return 'Saisissez 9 chiffres (Adeli) ou 11 chiffres (RPPS).';
    }

    /**
     * @return array{rpps: ?string, adeli: ?string}
     */
    public static function split(string $raw): array
    {
        $n = self::normalize($raw);
        if (strlen($n) === 11) {
            return ['rpps' => $n, 'adeli' => null];
        }
        if (strlen($n) === 9) {
            return ['rpps' => null, 'adeli' => $n];
        }

        return ['rpps' => null, 'adeli' => null];
    }

    /** Valeur affichée (rpps prioritaire si les deux existent). */
    public static function display(?string $rpps, ?string $adeli): string
    {
        $r = trim((string) ($rpps ?? ''));
        if ($r !== '') {
            return $r;
        }

        return trim((string) ($adeli ?? ''));
    }

    /** Libellé court pour listes admin (ex. « RPPS 123… » ou « Adeli 123… »). */
    public static function displayWithKind(?string $rpps, ?string $adeli): ?string
    {
        $r = trim((string) ($rpps ?? ''));
        if ($r !== '') {
            return 'RPPS ' . $r;
        }
        $a = trim((string) ($adeli ?? ''));
        if ($a !== '') {
            return 'Adeli ' . $a;
        }

        return null;
    }

    /**
     * Extrait la valeur depuis un body HTTP (rpps, adeli ou professional_id).
     */
    public static function fromRequestBody(array $body): string
    {
        $direct = trim((string) ($body['professional_id'] ?? ''));
        if ($direct !== '') {
            return $direct;
        }
        $rpps = array_key_exists('rpps', $body) ? trim((string) $body['rpps']) : '';
        if ($rpps !== '') {
            return self::normalize($rpps);
        }

        $adeli = array_key_exists('adeli', $body) ? trim((string) $body['adeli']) : '';

        return $adeli !== '' ? self::normalize($adeli) : '';
    }
}

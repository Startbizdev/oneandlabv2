<?php

/**
 * Libellés d'adresse pour affichage public — aligné sur le front (address-display.ts).
 */
final class AddressDisplayFr
{
    /**
     * Enrichit un libellé d'adresse avec street / CP / ville depuis form_data.address.
     */
    public static function enrichLabelWithFormData(string $label, array $formData): string
    {
        $addr = $formData['address'] ?? null;
        if (!is_array($addr)) {
            return trim($label);
        }

        $street = trim((string) ($addr['street'] ?? ''));
        $city = trim((string) ($addr['city'] ?? ''));
        $postcode = trim((string) ($addr['postcode'] ?? $addr['postal_code'] ?? ''));
        $postcode = preg_replace('/\s+/', '', $postcode);

        $line = trim($label);
        if ($line === '' && $street !== '') {
            $line = $street;
        }
        if ($postcode !== '' && !preg_match('/\b' . preg_quote($postcode, '/') . '\b/u', $line)) {
            $line = $line !== '' ? $line . ', ' . $postcode : $postcode;
        }
        if ($city !== '' && stripos($line, $city) === false) {
            if ($postcode !== '' && preg_match('/\b' . preg_quote($postcode, '/') . '\b/u', $line)) {
                $line = preg_replace(
                    '/\b' . preg_quote($postcode, '/') . '\b/u',
                    $postcode . ' ' . $city,
                    $line,
                    1
                );
            } else {
                $line = trim($line) . ' ' . $city;
            }
        }

        return trim((string) $line);
    }

    /** Villes à arrondissements : codes postaux `{prefix}0NN`, NN de 1 à count. Miroir de `FRENCH_CITY_DISTRICTS` (shared-utils). */
    private const CITY_DISTRICTS = [
        ['prefix' => '75', 'city' => 'Paris', 'count' => 20],
        ['prefix' => '13', 'city' => 'Marseille', 'count' => 16],
        ['prefix' => '69', 'city' => 'Lyon', 'count' => 9],
    ];

    /**
     * Ville + arrondissement depuis le code postal : « Marseille 3e », « Paris 1er », « Lyon 9e ».
     */
    public static function cityDistrictLabel(string $postcode): ?string
    {
        $pc = substr((string) preg_replace('/\D/', '', $postcode), 0, 5);
        if (strlen($pc) !== 5 || $pc[2] !== '0') {
            return null;
        }
        foreach (self::CITY_DISTRICTS as $district) {
            if (!str_starts_with($pc, $district['prefix'])) {
                continue;
            }
            $n = (int) substr($pc, 3, 2);
            if ($n < 1 || $n > $district['count']) {
                return null;
            }

            return $district['city'] . ' ' . ($n === 1 ? '1er' : $n . 'e');
        }

        return null;
    }

    /**
     * Ligne courte pour partage (WhatsApp, SMS) : nom de voie **sans numéro** + arrondissement
     * (« Marseille 3e ») à Paris, Lyon et Marseille, ou voie + CP + ville ailleurs (ex. libellé Google Maps).
     * Sans complément d’étage/bâtiment, sans pays.
     */
    public static function shareWhatsAppAddressLine(string $full): string
    {
        $trimmed = trim($full);
        if ($trimmed === '') {
            return '';
        }

        $parts = array_map('trim', explode(',', $trimmed));
        $parts = array_values(array_filter($parts, static function ($p) {
            return $p !== '';
        }));
        if ($parts === []) {
            return '';
        }

        // Première partie = voie (souvent "12 rue …" depuis Maps/BAN) : on retire le n° en tête
        $streetLine = self::stripLeadingStreetNumber($parts[0]);

        if (preg_match('/\b(\d{5})\b/u', $trimmed, $m)) {
            $district = self::cityDistrictLabel($m[1]);
            if ($district !== null) {
                return $streetLine . ', ' . $district;
            }
        }

        foreach ($parts as $seg) {
            if (preg_match('/^(\d{5})\s+(.+)$/u', $seg, $cm)) {
                $cp = $cm[1];
                if (str_starts_with($cp, '75')) {
                    continue;
                }
                $city = trim(preg_replace('/\s+/u', ' ', $cm[2]));
                $city = preg_replace('/\bFrance$/iu', '', $city);
                $city = trim((string) $city);

                return $streetLine . ', ' . $cp . ' ' . $city;
            }
        }

        $last = $parts[count($parts) - 1];
        if (count($parts) >= 2 && preg_match('/^France$/iu', $last)) {
            $prev = $parts[count($parts) - 2];

            return $streetLine . ', ' . $prev;
        }

        if (count($parts) >= 2) {
            return $streetLine . ', ' . $last;
        }

        return $streetLine;
    }

    /**
     * Retire un n° de rue en tête (12, 12bis, …) sur un segment d’adresse.
     */
    private static function stripLeadingStreetNumber(string $segment): string
    {
        $s = trim($segment);
        if ($s === '') {
            return '';
        }
        $s = preg_replace('/^\d+[a-zA-Zàâäéèêëïîôùûç\-]*\s+/u', '', $s);

        return trim((string) $s);
    }
}

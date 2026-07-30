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

    /**
     * Ligne courte pour partage (WhatsApp, SMS) : nom de voie **sans numéro** + arrondissement + Paris,
     * ou voie + CP + ville ailleurs (ex. libellé Google Maps). Sans complément d’étage/bâtiment, sans pays.
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

        if (preg_match('/\b(75\d{3})\b/u', $trimmed, $m)) {
            $arr = (int) substr($m[1], 3, 2);
            if ($arr >= 1 && $arr <= 20) {
                $arrLabel = $arr === 1 ? '1er arrondissement' : $arr . 'e arrondissement';

                return $streetLine . ', ' . $arrLabel . ', Paris';
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

    /**
     * Rue + arrondissement (Paris) ou ville, sans numéro de rue.
     */
    public static function streetAndDistrictWithoutStreetNumber(string $full): string
    {
        $trimmed = trim($full);
        if ($trimmed === '') {
            return '';
        }

        if (preg_match('/\b(75\d{3})\b/u', $trimmed, $m)) {
            $cp = $m[1];
            if (str_starts_with($cp, '75')) {
                $arr = (int) substr($cp, 3, 2);
                $rest = preg_replace('/^\d+[a-zA-Zàâäéèêëïîôùûç\-]*\s+/u', '', $trimmed);
                $parts = array_values(array_filter(array_map('trim', explode(',', (string) $rest))));
                $streetLine = $parts[0] ?? '';
                $arrLabel = $arr === 1 ? '1er arrondissement' : $arr . 'e arrondissement';
                if ($streetLine !== '') {
                    return $streetLine . ', ' . $arrLabel . ', Paris';
                }
            }
        }

        $rest = preg_replace('/^\d+[a-zA-Zàâäéèêëïîôùûç\-]*\s+/u', '', $trimmed);
        $parts = array_values(array_filter(array_map('trim', explode(',', (string) $rest))));
        if (count($parts) >= 2) {
            return $parts[0] . ', ' . implode(', ', array_slice($parts, 1));
        }
        return $parts[0] ?? $trimmed;
    }
}

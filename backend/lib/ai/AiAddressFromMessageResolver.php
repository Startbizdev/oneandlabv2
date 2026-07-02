<?php

declare(strict_types=1);

require_once __DIR__ . '/../GoogleAddressSearch.php';

/**
 * Géocode address.label du brouillon si coords manquantes (infra — pas de NLP).
 */
final class AiAddressFromMessageResolver
{
    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function apply(array $payload): array
    {
        if (!empty($payload['use_profile_address']) || !empty($payload['use_staff_practice_address'])) {
            return $payload;
        }

        $address = $payload['address'] ?? null;
        if (!is_array($address)) {
            return $payload;
        }

        $label = trim((string) ($address['label'] ?? ''));
        if ($label === '') {
            return $payload;
        }

        $lat = $address['lat'] ?? null;
        $lng = $address['lng'] ?? null;
        if (is_numeric($lat) && is_numeric($lng) && ((float) $lat !== 0.0 || (float) $lng !== 0.0)) {
            return $payload;
        }

        try {
            $search = new GoogleAddressSearch();
            $rows = $search->search($label, 1);
            $row = $rows[0] ?? null;
            if ($row === null) {
                return $payload;
            }

            $payload['address'] = [
                'label' => (string) ($row['label'] ?? $label),
                'lat' => (float) ($row['lat'] ?? 0),
                'lng' => (float) ($row['lng'] ?? 0),
                'city' => ($row['city'] ?? '') !== '' ? (string) $row['city'] : null,
                'postal_code' => ($row['postcode'] ?? '') !== '' ? (string) $row['postcode'] : null,
                'complement' => $address['complement'] ?? null,
            ];
        } catch (Throwable) {
            return $payload;
        }

        return $payload;
    }
}

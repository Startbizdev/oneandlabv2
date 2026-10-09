<?php

/**
 * Recherche d'adresses via Places API (New), France.
 * Sortie alignée sur l’ancien contrat BAN pour le front (label, street, city, postcode, lat, lng).
 */
class GoogleAddressSearch
{
    private const SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';

    private function getApiKey(): string
    {
        $key = (string) ($_ENV['GOOGLE_PLACES_API_KEY'] ?? getenv('GOOGLE_PLACES_API_KEY') ?: '');
        return trim($key);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function search(string $query, int $limit = 10): array
    {
        $key = $this->getApiKey();
        if ($key === '') {
            throw new Exception('Configuration adresse incomplète (GOOGLE_PLACES_API_KEY)');
        }

        $queryTrim = trim($query);
        if ($queryTrim === '') {
            return [];
        }

        if ($limit < 1) {
            $limit = 1;
        }
        if ($limit > 20) {
            $limit = 20;
        }

        $payload = json_encode([
            'textQuery' => $queryTrim,
            'languageCode' => 'fr',
            'regionCode' => 'FR',
            'pageSize' => $limit,
        ], JSON_UNESCAPED_UNICODE);
        if ($payload === false) {
            throw new Exception('Requête adresse invalide');
        }

        $ch = curl_init(self::SEARCH_URL);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 8);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'X-Goog-Api-Key: ' . $key,
            'X-Goog-FieldMask: places.formattedAddress,places.location,places.addressComponents',
        ]);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if (!is_string($response)) {
            throw new Exception('Erreur API Google Places: HTTP ' . $httpCode);
        }

        $data = json_decode($response, true);
        if ($httpCode !== 200 || !is_array($data)) {
            $msg = is_array($data) ? (string) ($data['error']['message'] ?? '') : '';
            throw new Exception('Google Places: ' . ($msg !== '' ? $msg : 'HTTP ' . $httpCode));
        }

        $results = $data['places'] ?? [];
        if (!is_array($results)) {
            return [];
        }

        $out = [];
        foreach (array_slice($results, 0, $limit) as $place) {
            if (!is_array($place)) {
                continue;
            }
            $row = $this->resultToRow($place);
            if ($row !== null) {
                $out[] = $row;
            }
        }

        return $out;
    }

    /**
     * @param array<string, mixed> $r
     * @return array<string, mixed>|null
     */
    private function resultToRow(array $r): ?array
    {
        $loc = $r['location'] ?? null;
        if (!is_array($loc) || !isset($loc['latitude'], $loc['longitude'])) {
            return null;
        }

        $lat = (float) $loc['latitude'];
        $lng = (float) $loc['longitude'];
        $label = (string) ($r['formattedAddress'] ?? '');

        $streetNumber = '';
        $route = '';
        $city = '';
        $postcode = '';
        $components = $r['addressComponents'] ?? [];
        if (is_array($components)) {
            foreach ($components as $c) {
                if (!is_array($c)) {
                    continue;
                }
                $types = $c['types'] ?? [];
                if (!is_array($types)) {
                    $types = [];
                }
                $long = (string) ($c['longText'] ?? '');
                if (in_array('street_number', $types, true)) {
                    $streetNumber = $long;
                }
                if (in_array('route', $types, true)) {
                    $route = $long;
                }
                if (in_array('locality', $types, true) || in_array('postal_town', $types, true)) {
                    if ($city === '') {
                        $city = $long;
                    }
                }
                if (in_array('postal_code', $types, true)) {
                    $postcode = $long;
                }
            }
        }

        $street = trim($streetNumber !== '' && $route !== '' ? $streetNumber . ' ' . $route : ($route !== '' ? $route : ''));

        return [
            'label' => $label !== '' ? $label : ($street . ($postcode !== '' ? ', ' . $postcode : '') . ($city !== '' ? ' ' . $city : '')),
            'street' => $street,
            'city' => $city,
            'postcode' => $postcode,
            'lat' => $lat,
            'lng' => $lng,
            '_source' => 'google',
        ];
    }
}

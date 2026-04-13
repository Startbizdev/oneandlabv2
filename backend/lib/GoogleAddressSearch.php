<?php

/**
 * Recherche d'adresses via Google Geocoding API (France).
 * Sortie alignée sur l’ancien contrat BAN pour le front (label, street, city, postcode, lat, lng).
 */
class GoogleAddressSearch
{
    private const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

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

        $params = [
            'address' => $queryTrim,
            'components' => 'country:FR',
            'language' => 'fr',
            'key' => $key,
        ];
        $url = self::GEOCODE_URL . '?' . http_build_query($params);

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 8);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200 || !is_string($response)) {
            throw new Exception('Erreur API Google Geocoding: HTTP ' . $httpCode);
        }

        $data = json_decode($response, true);
        if (!$data || ($data['status'] ?? '') === 'REQUEST_DENIED') {
            $msg = $data['error_message'] ?? ($data['status'] ?? 'Erreur inconnue');
            throw new Exception('Google Geocoding: ' . $msg);
        }

        if (($data['status'] ?? '') !== 'OK' && ($data['status'] ?? '') !== 'ZERO_RESULTS') {
            return [];
        }

        $results = $data['results'] ?? [];
        if (!is_array($results)) {
            return [];
        }

        $out = [];
        foreach (array_slice($results, 0, $limit) as $r) {
            $row = $this->resultToRow($r);
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
        $loc = $r['geometry']['location'] ?? null;
        if (!is_array($loc) || !isset($loc['lat'], $loc['lng'])) {
            return null;
        }

        $lat = (float) $loc['lat'];
        $lng = (float) $loc['lng'];
        $label = (string) ($r['formatted_address'] ?? '');

        $streetNumber = '';
        $route = '';
        $city = '';
        $postcode = '';
        $components = $r['address_components'] ?? [];
        if (is_array($components)) {
            foreach ($components as $c) {
                if (!is_array($c)) {
                    continue;
                }
                $types = $c['types'] ?? [];
                $long = (string) ($c['long_name'] ?? '');
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

<?php

/**
 * Wrapper pour l'API BAN (Base Adresse Nationale)
 * https://api-adresse.data.gouv.fr/search/
 *
 * La recherche « rue + code postal » renvoie surtout des tronçons (type street).
 * Les adresses au numéro (housenumber) nécessitent souvent une requête séparée
 * et l’API ne renvoie pas les housenumber si un code postal à 5 chiffres est
 * présent dans le même paramètre q — on le retire pour ce second appel.
 */

class BAN
{
    private const API_URL = 'https://api-adresse.data.gouv.fr/search/';
    private array $cache = [];

    /**
     * Retire les codes postaux français (5 chiffres) du texte de recherche.
     */
    private static function stripFrenchPostcodes(string $query): string
    {
        $q = preg_replace('/\b\d{5}\b/u', ' ', $query);
        return trim(preg_replace('/\s+/u', ' ', $q));
    }

    /**
     * Appelle l’API BAN et renvoie la liste de features GeoJSON.
     *
     * @return array<int, array<string, mixed>>
     */
    private function fetchFeatures(array $params): array
    {
        $url = self::API_URL . '?' . http_build_query($params);

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

        if ($httpCode !== 200) {
            throw new Exception('Erreur API BAN: HTTP ' . $httpCode);
        }

        $data = json_decode($response, true);

        if (!$data || !isset($data['features']) || !is_array($data['features'])) {
            return [];
        }

        return $data['features'];
    }

    /**
     * Convertit une feature BAN en ligne pour le front.
     *
     * @param array<string, mixed> $feature
     * @return array<string, mixed>
     */
    private static function featureToRow(array $feature): array
    {
        $props = $feature['properties'] ?? [];
        $coords = $feature['geometry']['coordinates'] ?? [0, 0];
        $banLabel = $props['label'] ?? '';
        $housenumber = $props['housenumber'] ?? '';
        if ($housenumber !== '' && $banLabel !== '' && !preg_match('/^\d+[a-zA-Z]?\s/', $banLabel)) {
            $banLabel = $housenumber . ' ' . $banLabel;
        }

        return [
            'label' => $banLabel,
            'street' => $props['name'] ?? '',
            'city' => $props['city'] ?? '',
            'postcode' => $props['postcode'] ?? '',
            'lat' => (float) $coords[1],
            'lng' => (float) $coords[0],
            '_ban_type' => $props['type'] ?? '',
            '_ban_score' => isset($props['score']) ? (float) $props['score'] : 0.0,
            '_ban_id' => $props['id'] ?? null,
        ];
    }

    /**
     * Recherche une adresse
     */
    public function search(string $query, int $limit = 10): array
    {
        $cacheKey = md5($query . $limit);
        if (isset($this->cache[$cacheKey])) {
            return $this->cache[$cacheKey];
        }

        $queryTrim = trim($query);
        if ($queryTrim === '') {
            return [];
        }

        $features = $this->fetchFeatures([
            'q' => $queryTrim,
            'limit' => $limit,
        ]);

        $hadPostcode = (bool) preg_match('/\b\d{5}\b/', $queryTrim);
        $startsWithNumber = (bool) preg_match('/^\d+[a-zA-Z]?\s+/u', $queryTrim);
        $qNoPostcode = self::stripFrenchPostcodes($queryTrim);

        $shouldFetchHousenumber = mb_strlen($qNoPostcode) >= 3
            && ($hadPostcode || $startsWithNumber);

        if ($shouldFetchHousenumber) {
            $hnFeatures = $this->fetchFeatures([
                'q' => $qNoPostcode,
                'limit' => $limit,
                'type' => 'housenumber',
            ]);
            $features = array_merge($hnFeatures, $features);
        }

        $seen = [];
        $rows = [];
        foreach ($features as $feature) {
            $props = $feature['properties'] ?? [];
            $id = $props['id'] ?? null;
            $coords = $feature['geometry']['coordinates'] ?? [0, 0];
            $key = $id ?? (($props['label'] ?? '') . '|' . ($coords[0] ?? '') . ',' . ($coords[1] ?? ''));
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $rows[] = self::featureToRow($feature);
        }

        usort($rows, static function (array $a, array $b): int {
            $ta = $a['_ban_type'] ?? '';
            $tb = $b['_ban_type'] ?? '';
            $aIsH = $ta === 'housenumber' ? 1 : 0;
            $bIsH = $tb === 'housenumber' ? 1 : 0;
            if ($aIsH !== $bIsH) {
                return $bIsH <=> $aIsH;
            }
            $sa = $a['_ban_score'] ?? 0.0;
            $sb = $b['_ban_score'] ?? 0.0;
            if ($sa !== $sb) {
                return $sb <=> $sa;
            }
            return 0;
        });

        $rows = array_slice($rows, 0, $limit);

        foreach ($rows as &$row) {
            unset($row['_ban_type'], $row['_ban_score'], $row['_ban_id']);
        }
        unset($row);

        // Si la requête commence par un numéro mais aucun résultat ne le reprend, garder le repli géocodé rue
        if (preg_match('/^\d+[a-zA-Z]?\s+/u', $queryTrim) && count($rows) > 0) {
            $firstLabel = $rows[0]['label'] ?? '';
            if ($firstLabel !== '' && !preg_match('/^\d+[a-zA-Z]?\s/', $firstLabel)) {
                $synthetic = [
                    'label' => $queryTrim,
                    'street' => $rows[0]['street'] ?? '',
                    'city' => $rows[0]['city'] ?? '',
                    'postcode' => $rows[0]['postcode'] ?? '',
                    'lat' => $rows[0]['lat'] ?? 0,
                    'lng' => $rows[0]['lng'] ?? 0,
                ];
                array_unshift($rows, $synthetic);
                if (count($rows) > $limit) {
                    $rows = array_slice($rows, 0, $limit);
                }
            }
        }

        $this->cache[$cacheKey] = $rows;

        return $rows;
    }
}

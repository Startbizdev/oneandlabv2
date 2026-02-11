<?php

/**
 * Wrapper pour l'API BAN (Base Adresse Nationale)
 * https://api-adresse.data.gouv.fr/search/
 */

class BAN
{
    private const API_URL = 'https://api-adresse.data.gouv.fr/search/';
    private array $cache = [];

    /**
     * Recherche une adresse
     */
    public function search(string $query, int $limit = 10): array
    {
        // Vérifier le cache
        $cacheKey = md5($query . $limit);
        if (isset($this->cache[$cacheKey])) {
            return $this->cache[$cacheKey];
        }
        
        $url = self::API_URL . '?' . http_build_query([
            'q' => $query,
            'limit' => $limit,
        ]);
        
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        // curl_close($ch); // Deprecated in PHP 8.5, no longer needed
        
        if ($httpCode !== 200) {
            throw new Exception('Erreur API BAN: HTTP ' . $httpCode);
        }
        
        $data = json_decode($response, true);
        
        if (!$data || !isset($data['features'])) {
            return [];
        }
        
        $results = [];
        foreach ($data['features'] as $feature) {
            $props = $feature['properties'] ?? [];
            $coords = $feature['geometry']['coordinates'] ?? [0, 0];
            
            $results[] = [
                'label' => $props['label'] ?? '',
                'street' => $props['name'] ?? '',
                'city' => $props['city'] ?? '',
                'postcode' => $props['postcode'] ?? '',
                'lat' => (float) $coords[1],
                'lng' => (float) $coords[0],
            ];
        }
        
        // Mettre en cache
        $this->cache[$cacheKey] = $results;
        
        return $results;
    }
}





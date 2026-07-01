<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

/**
 * Client HTTP minimal pour l'API REST Qdrant.
 */
final class QdrantClient
{
    private string $baseUrl;
    private ?string $apiKey;
    private string $collection;

    public function __construct(?string $baseUrl = null, ?string $apiKey = null, ?string $collection = null)
    {
        $this->baseUrl = rtrim($baseUrl ?? rag_env('QDRANT_URL', 'http://127.0.0.1:6333') ?? 'http://127.0.0.1:6333', '/');
        $key = $apiKey ?? rag_env('QDRANT_API_KEY');
        $this->apiKey = ($key !== null && $key !== '') ? $key : null;
        $this->collection = $collection ?? rag_env('QDRANT_COLLECTION', 'cary_patient_rag') ?? 'cary_patient_rag';
    }

    public function isConfigured(): bool
    {
        return $this->baseUrl !== '';
    }

    public function getCollectionName(): string
    {
        return $this->collection;
    }

    public function ensureCollection(int $vectorSize = 384): void
    {
        try {
            $existing = $this->request('GET', '/collections/' . rawurlencode($this->collection));
            if (($existing['status'] ?? '') === 'ok') {
                return;
            }
        } catch (RuntimeException $e) {
            if (!str_contains($e->getMessage(), 'Not found') && !str_contains($e->getMessage(), '404')) {
                throw $e;
            }
        }
        $this->request('PUT', '/collections/' . rawurlencode($this->collection), [
            'vectors' => [
                'size' => $vectorSize,
                'distance' => 'Cosine',
            ],
        ]);
    }

    /**
     * @param list<array{id: string, vector: list<float>, payload: array<string, mixed>}> $points
     */
    public function upsertPoints(array $points): void
    {
        if ($points === []) {
            return;
        }
        $this->request('PUT', '/collections/' . rawurlencode($this->collection) . '/points', [
            'points' => $points,
        ]);
    }

    /**
     * @param list<float> $vector
     * @return list<array<string, mixed>>
     */
    public function search(array $vector, string $patientId, int $limit = 8, float $scoreThreshold = 0.35): array
    {
        $response = $this->request('POST', '/collections/' . rawurlencode($this->collection) . '/points/search', [
            'vector' => $vector,
            'limit' => $limit,
            'score_threshold' => $scoreThreshold,
            'filter' => [
                'must' => [
                    ['key' => 'patient_id', 'match' => ['value' => $patientId]],
                ],
            ],
            'with_payload' => true,
        ]);
        $result = $response['result'] ?? [];

        return is_array($result) ? $result : [];
    }

    /**
     * @param array<string, mixed>|null $body
     * @return array<string, mixed>
     */
    private function request(string $method, string $path, ?array $body = null): array
    {
        $url = $this->baseUrl . $path;
        $ch = curl_init($url);
        if ($ch === false) {
            throw new RuntimeException('curl_init failed');
        }
        $headers = ['Content-Type: application/json'];
        if ($this->apiKey !== null) {
            $headers[] = 'api-key: ' . $this->apiKey;
        }
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_TIMEOUT => 30,
        ]);
        if ($body !== null) {
            $json = json_encode($body);
            if ($json === false) {
                throw new RuntimeException('JSON encode failed');
            }
            curl_setopt($ch, CURLOPT_POSTFIELDS, $json);
        }
        $raw = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);
        if ($raw === false) {
            throw new RuntimeException('Qdrant request failed: ' . $err);
        }
        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            throw new RuntimeException('Qdrant invalid JSON (HTTP ' . $code . ')');
        }
        if ($code >= 400) {
            $msg = (string) ($decoded['status']['error'] ?? $decoded['message'] ?? 'HTTP ' . $code);
            throw new RuntimeException('Qdrant error: ' . $msg);
        }

        return $decoded;
    }
}

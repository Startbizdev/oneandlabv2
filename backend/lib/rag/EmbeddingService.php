<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

/**
 * Embeddings RAG : un seul fournisseur par environnement (xAI si la clé est présente, sinon vecteur local
 * déterministe pour le développement et les tests) et une dimension fixe. Aucun repli d'un fournisseur
 * vers un autre : des vecteurs de modèles différents dans la même collection Qdrant fausseraient la recherche.
 */
final class EmbeddingService
{
    public const LOCAL_VECTOR_SIZE = 384;
    public const PROVIDER_XAI = 'xai';
    public const PROVIDER_LOCAL = 'local';

    private string $provider;
    private int $vectorSize;

    public function __construct()
    {
        $key = rag_env('XAI_API_KEY');
        $this->provider = $key !== null && $key !== '' ? self::PROVIDER_XAI : self::PROVIDER_LOCAL;
        $this->vectorSize = $this->provider === self::PROVIDER_XAI
            ? (int) (rag_env('EMBEDDING_VECTOR_SIZE', '1536') ?? '1536')
            : self::LOCAL_VECTOR_SIZE;
        if ($this->vectorSize < 1) {
            throw new RuntimeException('EMBEDDING_VECTOR_SIZE invalide');
        }
    }

    public function getProvider(): string
    {
        return $this->provider;
    }

    public function getVectorSize(): int
    {
        return $this->vectorSize;
    }

    /**
     * @return list<float>
     */
    public function embed(string $text): array
    {
        $text = trim($text);
        if ($text === '') {
            return array_fill(0, $this->vectorSize, 0.0);
        }
        $vector = $this->provider === self::PROVIDER_XAI ? $this->embedXai($text) : $this->embedLocal($text);
        if (count($vector) !== $this->vectorSize) {
            throw new RuntimeException(sprintf(
                'Embedding %s de dimension %d au lieu de %d (EMBEDDING_VECTOR_SIZE)',
                $this->provider,
                count($vector),
                $this->vectorSize,
            ));
        }

        return $vector;
    }

    /**
     * @return list<float>
     */
    private function embedXai(string $text): array
    {
        $apiKey = rag_env('XAI_API_KEY') ?? '';
        $model = rag_env('XAI_EMBEDDING_MODEL', 'text-embedding-3-large') ?? 'text-embedding-3-large';
        $ch = curl_init('https://api.x.ai/v1/embeddings');
        if ($ch === false) {
            throw new RuntimeException('curl_init failed');
        }
        $payload = json_encode(['model' => $model, 'input' => mb_substr($text, 0, 8000)]);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $apiKey,
            ],
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_TIMEOUT => 45,
        ]);
        $raw = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($raw === false || $code >= 400) {
            throw new RuntimeException('xAI embeddings failed (HTTP ' . $code . ')');
        }
        $decoded = json_decode($raw, true);
        $vector = $decoded['data'][0]['embedding'] ?? null;
        if (!is_array($vector)) {
            throw new RuntimeException('xAI embeddings invalid response');
        }

        return array_values(array_map('floatval', $vector));
    }

    /**
     * @return list<float>
     */
    private function embedLocal(string $text): array
    {
        $tokens = preg_split('/\s+/u', mb_strtolower($text)) ?: [];
        $size = $this->vectorSize;
        $vector = array_fill(0, $size, 0.0);
        foreach ($tokens as $token) {
            if ($token === '') {
                continue;
            }
            $hash = crc32($token);
            $idx = abs($hash) % $size;
            $vector[$idx] += 1.0;
            $idx2 = abs(crc32($token . '_2')) % $size;
            $vector[$idx2] += 0.5;
        }
        $norm = sqrt(array_sum(array_map(static fn (float $v): float => $v * $v, $vector)));
        if ($norm < 1e-9) {
            return $vector;
        }
        foreach ($vector as $i => $v) {
            $vector[$i] = $v / $norm;
        }

        return $vector;
    }
}

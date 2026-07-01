<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

/**
 * Embeddings pour RAG : xAI (Grok) en priorité, OpenAI optionnel, fallback local 384-dim.
 */
final class EmbeddingService
{
    public const LOCAL_VECTOR_SIZE = 384;

    public function getVectorSize(): int
    {
        if ($this->hasXaiKey() || $this->hasOpenAiKey()) {
            return (int) (rag_env('EMBEDDING_VECTOR_SIZE', '1536') ?? '1536');
        }

        return self::LOCAL_VECTOR_SIZE;
    }

    public function embed(string $text): array
    {
        $text = trim($text);
        if ($text === '') {
            return array_fill(0, $this->getVectorSize(), 0.0);
        }
        if ($this->hasXaiKey()) {
            try {
                return $this->embedXai($text);
            } catch (Throwable) {
                // fallback
            }
        }
        $openAiKey = rag_env('OPENAI_API_KEY');
        if ($openAiKey !== null && $openAiKey !== '') {
            try {
                return $this->embedOpenAi($text, $openAiKey);
            } catch (Throwable) {
                // fallback
            }
        }

        return $this->embedLocal($text);
    }

    private function hasXaiKey(): bool
    {
        $key = rag_env('XAI_API_KEY');

        return $key !== null && $key !== '';
    }

    private function hasOpenAiKey(): bool
    {
        $key = rag_env('OPENAI_API_KEY');

        return $key !== null && $key !== '';
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

        return array_map('floatval', $vector);
    }

    /**
     * @return list<float>
     */
    private function embedOpenAi(string $text, string $apiKey): array
    {
        $model = rag_env('EMBEDDING_MODEL', 'text-embedding-3-small') ?? 'text-embedding-3-small';
        $ch = curl_init('https://api.openai.com/v1/embeddings');
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
            throw new RuntimeException('OpenAI embeddings failed');
        }
        $decoded = json_decode($raw, true);
        $vector = $decoded['data'][0]['embedding'] ?? null;
        if (!is_array($vector)) {
            throw new RuntimeException('OpenAI embeddings invalid response');
        }

        return array_map('floatval', $vector);
    }

    /**
     * @return list<float>
     */
    private function embedLocal(string $text): array
    {
        $tokens = preg_split('/\s+/u', mb_strtolower($text)) ?: [];
        $size = $this->getVectorSize();
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

<?php

declare(strict_types=1);

require_once __DIR__ . '/AIProviderInterface.php';
require_once __DIR__ . '/bootstrap.php';

final class GrokProvider implements AIProviderInterface
{
    private string $apiKey;
    private string $defaultModel;

    public function __construct(?string $apiKey = null, ?string $defaultModel = null)
    {
        $this->apiKey = $apiKey ?? (string) (ai_env('XAI_API_KEY') ?? '');
        $this->defaultModel = $defaultModel ?? (string) (ai_env('XAI_MODEL', 'grok-3') ?? 'grok-3');
    }

    public function getName(): string
    {
        return 'grok';
    }

    public function chat(array $messages, array $options = []): array
    {
        $payload = $this->buildPayload($messages, $options, false);
        $response = $this->request($payload);
        $choice = $response['choices'][0]['message']['content'] ?? '';
        $usage = $response['usage'] ?? [];

        return [
            'content' => is_string($choice) ? $choice : '',
            'model' => (string) ($response['model'] ?? ($options['model'] ?? $this->defaultModel)),
            'tokens_input' => isset($usage['prompt_tokens']) ? (int) $usage['prompt_tokens'] : null,
            'tokens_output' => isset($usage['completion_tokens']) ? (int) $usage['completion_tokens'] : null,
        ];
    }

    public function chatStream(array $messages, callable $onDelta, array $options = []): array
    {
        $payload = $this->buildPayload($messages, $options, true);
        $content = '';
        $model = (string) ($options['model'] ?? $this->defaultModel);
        $tokensInput = null;
        $tokensOutput = null;

        $this->streamRequest($payload, function (array $chunk) use (&$content, &$model, &$tokensInput, &$tokensOutput, $onDelta): void {
            if (!empty($chunk['model'])) {
                $model = (string) $chunk['model'];
            }
            if (!empty($chunk['usage'])) {
                $tokensInput = isset($chunk['usage']['prompt_tokens']) ? (int) $chunk['usage']['prompt_tokens'] : $tokensInput;
                $tokensOutput = isset($chunk['usage']['completion_tokens']) ? (int) $chunk['usage']['completion_tokens'] : $tokensOutput;
            }
            $delta = $chunk['choices'][0]['delta']['content'] ?? '';
            if ($delta !== '') {
                $content .= $delta;
                $onDelta($delta);
            }
        });

        return [
            'content' => $content,
            'model' => $model,
            'tokens_input' => $tokensInput,
            'tokens_output' => $tokensOutput,
        ];
    }

    /**
     * @param list<array{role: string, content: string}> $messages
     * @return array<string, mixed>
     */
    private function buildPayload(array $messages, array $options, bool $stream): array
    {
        if ($this->apiKey === '') {
            throw new RuntimeException('XAI_API_KEY manquante');
        }

        return [
            'model' => (string) ($options['model'] ?? $this->defaultModel),
            'messages' => $messages,
            'temperature' => isset($options['temperature']) ? (float) $options['temperature'] : 0.4,
            'stream' => $stream,
        ];
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    private function request(array $payload): array
    {
        $ch = curl_init('https://api.x.ai/v1/chat/completions');
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $this->apiKey,
            ],
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_TIMEOUT => 120,
        ]);
        $raw = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);

        if ($raw === false) {
            throw new RuntimeException('Erreur Grok: ' . $err);
        }
        $decoded = json_decode($raw, true);
        if ($code >= 400 || !is_array($decoded)) {
            $msg = is_array($decoded) ? ($decoded['error']['message'] ?? $raw) : $raw;
            throw new RuntimeException('Erreur Grok HTTP ' . $code . ': ' . $msg);
        }

        return $decoded;
    }

    /**
     * @param array<string, mixed> $payload
     * @param callable(array<string, mixed>): void $onChunk
     */
    private function streamRequest(array $payload, callable $onChunk): void
    {
        $buffer = '';
        $ch = curl_init('https://api.x.ai/v1/chat/completions');
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $this->apiKey,
            ],
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_TIMEOUT => 120,
            CURLOPT_WRITEFUNCTION => function ($ch, string $data) use (&$buffer, $onChunk): int {
                $buffer .= $data;
                while (($pos = strpos($buffer, "\n")) !== false) {
                    $line = trim(substr($buffer, 0, $pos));
                    $buffer = substr($buffer, $pos + 1);
                    if ($line === '' || !str_starts_with($line, 'data:')) {
                        continue;
                    }
                    $json = trim(substr($line, 5));
                    if ($json === '[DONE]') {
                        continue;
                    }
                    $chunk = json_decode($json, true);
                    if (is_array($chunk)) {
                        $onChunk($chunk);
                    }
                }

                return strlen($data);
            },
        ]);
        curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($code >= 400) {
            throw new RuntimeException('Erreur Grok stream HTTP ' . $code);
        }
    }
}

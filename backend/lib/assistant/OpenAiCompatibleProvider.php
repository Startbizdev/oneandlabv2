<?php

declare(strict_types=1);

require_once __DIR__ . '/AssistantProvider.php';

/**
 * Chat Completions compatible OpenAI (xAI, Azure OpenAI, Mistral…) en streaming SSE, avec accumulation des
 * deltas d'appels d'outils. Pas de nouvel essai : une erreur après le premier token est remontée telle quelle.
 */
final class OpenAiCompatibleProvider implements AssistantProvider
{
    private const MAX_TOKENS = 800;
    private const TEMPERATURE = 0.3;
    private const CONNECT_TIMEOUT = 5;
    private const TIMEOUT = 45;

    public function __construct(
        private readonly string $baseUrl,
        private readonly string $apiKey,
        private readonly string $model,
        private readonly string $visionModel,
    ) {
        if ($this->apiKey === '') {
            throw AssistantError::unavailable('ASSISTANT_API_KEY manquante');
        }
    }

    public function stream(array $messages, array $tools, callable $onDelta, callable $onToolCall): array
    {
        $payload = [
            'model' => self::hasImage($messages) ? $this->visionModel : $this->model,
            'messages' => $messages,
            'max_tokens' => self::MAX_TOKENS,
            'temperature' => self::TEMPERATURE,
            'stream' => true,
        ];
        if ($tools !== []) {
            $payload['tools'] = $tools;
            $payload['tool_choice'] = 'auto';
        }

        $result = ['content' => '', 'tool_calls' => [], 'model' => $payload['model'], 'input_tokens' => null, 'output_tokens' => null];
        $calls = [];
        $buffer = '';
        $errorBody = '';
        $ch = curl_init(rtrim($this->baseUrl, '/') . '/chat/completions');
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Accept: text/event-stream', 'Authorization: Bearer ' . $this->apiKey],
            CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
            CURLOPT_CONNECTTIMEOUT => self::CONNECT_TIMEOUT,
            CURLOPT_TIMEOUT => self::TIMEOUT,
            CURLOPT_WRITEFUNCTION => function ($ch, string $data) use (&$buffer, &$errorBody, &$result, &$calls, $onDelta, $onToolCall): int {
                if ((int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE) >= 400) {
                    $errorBody .= $data;

                    return strlen($data);
                }
                $buffer .= $data;
                while (($pos = strpos($buffer, "\n")) !== false) {
                    $line = trim(substr($buffer, 0, $pos));
                    $buffer = substr($buffer, $pos + 1);
                    if (!str_starts_with($line, 'data:') || ($json = trim(substr($line, 5))) === '[DONE]') {
                        continue;
                    }
                    $chunk = json_decode($json, true);
                    if (is_array($chunk)) {
                        self::applyChunk($chunk, $result, $calls, $onDelta, $onToolCall);
                    }
                }

                return strlen($data);
            },
        ]);
        $ok = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $errno = curl_errno($ch);
        curl_close($ch);
        if ($errno === CURLE_OPERATION_TIMEDOUT) {
            throw AssistantError::timeout();
        }
        if ($ok === false || $status >= 400) {
            // Seuls le statut et le code d'erreur sont journalisés (jamais le contenu échangé).
            $code = is_array($decoded = json_decode($errorBody, true)) ? (string) ($decoded['error']['code'] ?? $decoded['error']['type'] ?? '') : '';
            throw AssistantError::unavailable('Fournisseur LLM HTTP ' . $status . ' curl ' . $errno . ($code !== '' ? ' ' . $code : ''));
        }
        foreach ($calls as $call) {
            $arguments = json_decode($call['arguments'] !== '' ? $call['arguments'] : '{}', true);
            $result['tool_calls'][] = ['id' => $call['id'], 'name' => $call['name'], 'arguments' => is_array($arguments) ? $arguments : []];
        }

        return $result;
    }

    /**
     * @param array<string, mixed> $chunk
     * @param array<string, mixed> $result
     * @param array<int, array{id: string, name: string, arguments: string}> $calls
     */
    private static function applyChunk(array $chunk, array &$result, array &$calls, callable $onDelta, callable $onToolCall): void
    {
        if (!empty($chunk['model'])) {
            $result['model'] = (string) $chunk['model'];
        }
        if (is_array($chunk['usage'] ?? null)) {
            $result['input_tokens'] = isset($chunk['usage']['prompt_tokens']) ? (int) $chunk['usage']['prompt_tokens'] : null;
            $result['output_tokens'] = isset($chunk['usage']['completion_tokens']) ? (int) $chunk['usage']['completion_tokens'] : null;
        }
        $delta = $chunk['choices'][0]['delta'] ?? [];
        $text = is_array($delta) ? ($delta['content'] ?? '') : '';
        if (is_string($text) && $text !== '') {
            $result['content'] .= $text;
            $onDelta($text);
        }
        foreach (is_array($delta['tool_calls'] ?? null) ? $delta['tool_calls'] : [] as $part) {
            $index = (int) ($part['index'] ?? 0);
            $isNew = !isset($calls[$index]);
            $calls[$index] ??= ['id' => '', 'name' => '', 'arguments' => ''];
            $calls[$index]['id'] .= (string) ($part['id'] ?? '');
            $calls[$index]['name'] .= (string) ($part['function']['name'] ?? '');
            $calls[$index]['arguments'] .= (string) ($part['function']['arguments'] ?? '');
            if ($isNew) {
                $onToolCall($calls[$index]['name']);
            }
        }
    }

    /** @param list<array<string, mixed>> $messages */
    private static function hasImage(array $messages): bool
    {
        foreach ($messages as $message) {
            foreach (is_array($message['content'] ?? null) ? $message['content'] : [] as $part) {
                if (($part['type'] ?? '') === 'image_url') {
                    return true;
                }
            }
        }

        return false;
    }
}

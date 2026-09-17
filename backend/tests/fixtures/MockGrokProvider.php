<?php

declare(strict_types=1);

require_once __DIR__ . '/../../lib/ai/AIProviderInterface.php';

/**
 * Provider LLM scriptable pour tests d'intégration (sans appel xAI).
 */
final class MockGrokProvider implements AIProviderInterface
{
    /** @var list<array{content?: string, tool_calls?: list<array<string, mixed>>}> */
    private array $script = [];

    private int $callIndex = 0;

    /** @var list<array{messages: list<array<string, string>>, options: array<string, mixed>}> */
    public array $calls = [];

    /**
     * @param array{content?: string, tool_calls?: list<array<string, mixed>>} $response
     */
    public function pushResponse(array $response): self
    {
        $this->script[] = $response;

        return $this;
    }

    public function reset(): self
    {
        $this->script = [];
        $this->callIndex = 0;
        $this->calls = [];

        return $this;
    }

    public function getName(): string
    {
        return 'mock_grok';
    }

    public function chat(array $messages, array $options = []): array
    {
        $this->calls[] = ['messages' => $messages, 'options' => $options];
        $item = $this->script[$this->callIndex] ?? ['content' => 'Réponse mock Cary.'];
        $this->callIndex++;

        return [
            'content' => (string) ($item['content'] ?? ''),
            'tool_calls' => is_array($item['tool_calls'] ?? null) ? $item['tool_calls'] : [],
            'model' => 'mock-grok',
            'tokens_input' => 12,
            'tokens_output' => 18,
        ];
    }

    public function chatStream(array $messages, callable $onDelta, array $options = []): array
    {
        $result = $this->chat($messages, $options);
        $content = (string) ($result['content'] ?? '');
        if ($content !== '') {
            $onDelta($content);
        }

        return [
            'content' => $content,
            'model' => 'mock-grok',
            'tokens_input' => 12,
            'tokens_output' => 18,
        ];
    }
}

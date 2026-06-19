<?php

declare(strict_types=1);

require_once __DIR__ . '/AIProviderInterface.php';

/** Stub OpenAI — Phase ultérieure. */
final class OpenAIProvider implements AIProviderInterface
{
    public function getName(): string
    {
        return 'openai';
    }

    public function chat(array $messages, array $options = []): array
    {
        throw new RuntimeException('Provider openai non configuré (Phase ultérieure)');
    }

    public function chatStream(array $messages, callable $onDelta, array $options = []): array
    {
        throw new RuntimeException('Provider openai non configuré (Phase ultérieure)');
    }
}

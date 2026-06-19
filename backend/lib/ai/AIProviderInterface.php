<?php

declare(strict_types=1);

interface AIProviderInterface
{
    public function getName(): string;

    /**
     * @param list<array{role: string, content: string}> $messages
     * @param array<string, mixed> $options
     * @return array{content: string, model: string, tokens_input: ?int, tokens_output: ?int}
     */
    public function chat(array $messages, array $options = []): array;

    /**
     * @param list<array{role: string, content: string}> $messages
     * @param callable(string): void $onDelta
     * @param array<string, mixed> $options
     * @return array{content: string, model: string, tokens_input: ?int, tokens_output: ?int}
     */
    public function chatStream(array $messages, callable $onDelta, array $options = []): array;
}

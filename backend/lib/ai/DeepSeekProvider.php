<?php

declare(strict_types=1);

require_once __DIR__ . '/AIProviderInterface.php';

/** Stub DeepSeek — Phase ultérieure. */
final class DeepSeekProvider implements AIProviderInterface
{
    public function getName(): string
    {
        return 'deepseek';
    }

    public function chat(array $messages, array $options = []): array
    {
        throw new RuntimeException('Provider deepseek non configuré (Phase ultérieure)');
    }

    public function chatStream(array $messages, callable $onDelta, array $options = []): array
    {
        throw new RuntimeException('Provider deepseek non configuré (Phase ultérieure)');
    }
}

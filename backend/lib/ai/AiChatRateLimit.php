<?php

declare(strict_types=1);

require_once __DIR__ . '/../../lib/RateLimit.php';

final class AiChatRateLimit
{
    public static function assertAllowed(array $user, string $endpoint = 'chat'): void
    {
        $userId = (string) ($user['user_id'] ?? '');
        if ($userId === '') {
            return;
        }

        $limits = [
            'chat' => [80, 3600],
            'stream' => [80, 3600],
            'search' => [120, 3600],
            'analyze' => [30, 3600],
        ];
        [$max, $window] = $limits[$endpoint] ?? [80, 3600];
        if (!RateLimit::allow('ai_' . $endpoint, $userId, $max, $window)) {
            throw new RuntimeException('Trop de messages Cary — réessayez dans quelques minutes', 429);
        }
    }
}

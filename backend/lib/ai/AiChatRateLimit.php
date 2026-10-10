<?php

declare(strict_types=1);

require_once __DIR__ . '/../../lib/RateLimit.php';
require_once __DIR__ . '/AiRateLimitedException.php';

final class AiChatRateLimit
{
    /** @var array<string, array{0: int, 1: int}> quota par fenêtre (secondes) */
    private const LIMITS = [
        'chat' => [80, 3600],
        'stream' => [80, 3600],
        'search' => [120, 3600],
        'analyze' => [30, 3600],
        'voice_session' => [30, 3600],
        'voice_turn' => [120, 3600],
        'voice_event' => [600, 3600],
        'voice_tool' => [120, 3600],
    ];

    public static function assertAllowed(array $user, string $endpoint = 'chat'): void
    {
        $userId = (string) ($user['user_id'] ?? '');
        if ($userId === '') {
            return;
        }

        if ($endpoint === 'stream') {
            $endpoint = 'chat';
        }

        [$max, $window] = self::LIMITS[$endpoint] ?? self::LIMITS['chat'];
        $bucket = 'ai_' . $endpoint;
        if (!RateLimit::allow($bucket, $userId, $max, $window)) {
            throw new AiRateLimitedException(
                'Trop de messages Cary — réessayez dans quelques minutes',
                RateLimit::retryAfterSeconds($bucket, $userId, $window),
            );
        }
    }
}

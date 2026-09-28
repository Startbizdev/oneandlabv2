<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/ai/AiChatRateLimit.php';
require_once __DIR__ . '/../../lib/RateLimit.php';

/**
 * Cary chat rate limits (sans réseau).
 */
final class AiChatRateLimitTest extends TestCase
{
    public function testEmptyUserIdDoesNotThrow(): void
    {
        AiChatRateLimit::assertAllowed([], 'chat');
        AiChatRateLimit::assertAllowed(['user_id' => ''], 'stream');
        $this->assertTrue(true);
    }

    public function testKnownEndpointsUseConfiguredBuckets(): void
    {
        $user = ['user_id' => '00000000-0000-4000-8000-00000000rate1'];
        // Première salve sous le plafond : ne doit pas lever.
        for ($i = 0; $i < 5; $i++) {
            AiChatRateLimit::assertAllowed($user, 'chat');
            AiChatRateLimit::assertAllowed($user, 'search');
        }
        $this->assertTrue(true);
    }

    public function testExceedingLimitThrows429(): void
    {
        $userId = '00000000-0000-4000-8000-00000000rate2';
        $user = ['user_id' => $userId];
        $thrown = false;
        try {
            // analyze = 30 / heure — on force le dépassement via RateLimit direct puis assertAllowed.
            for ($i = 0; $i < 31; $i++) {
                RateLimit::allow('ai_analyze', $userId, 30, 3600);
            }
            AiChatRateLimit::assertAllowed($user, 'analyze');
        } catch (RuntimeException $e) {
            $thrown = true;
            $this->assertSame(429, $e->getCode());
            $this->assertStringContainsString('Trop de messages Cary', $e->getMessage());
        }
        $this->assertTrue($thrown, 'expected 429 after analyze quota');
    }
}

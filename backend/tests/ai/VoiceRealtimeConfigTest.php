<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/ai/VoiceRealtimeConfig.php';

final class VoiceRealtimeConfigTest extends TestCase
{
    private array $envBackup = [];

    protected function setUp(): void
    {
        foreach ([
            'AI_VOICE_REALTIME_ENABLED',
            'AI_VOICE_REALTIME_ALLOWLIST',
            'XAI_REALTIME_MODEL',
            'AI_VOICE_REALTIME_TOKEN_TTL_SECONDS',
        ] as $key) {
            $this->envBackup[$key] = $_ENV[$key] ?? getenv($key);
        }
    }

    protected function tearDown(): void
    {
        foreach ($this->envBackup as $key => $value) {
            if ($value === false || $value === null) {
                unset($_ENV[$key]);
                putenv($key);
            } else {
                $_ENV[$key] = $value;
                putenv($key . '=' . $value);
            }
        }
    }

    private function setEnv(string $key, ?string $value): void
    {
        if ($value === null) {
            unset($_ENV[$key]);
            putenv($key);
            return;
        }
        $_ENV[$key] = $value;
        putenv($key . '=' . $value);
    }

    public function testDisabledByDefault(): void
    {
        $this->setEnv('AI_VOICE_REALTIME_ENABLED', '0');
        $this->assertFalse(VoiceRealtimeConfig::isEnabled());
        $this->assertFalse(VoiceRealtimeConfig::isAllowedForUser('abc-123'));
    }

    public function testAllowlistRequiresExplicitUser(): void
    {
        $this->setEnv('AI_VOICE_REALTIME_ENABLED', '1');
        $this->setEnv('AI_VOICE_REALTIME_ALLOWLIST', 'User-UUID-1, user-uuid-2');
        $this->assertTrue(VoiceRealtimeConfig::isAllowedForUser('user-uuid-1'));
        $this->assertFalse(VoiceRealtimeConfig::isAllowedForUser('other-user'));
    }

    public function testTokenTtlBounds(): void
    {
        $this->setEnv('AI_VOICE_REALTIME_TOKEN_TTL_SECONDS', '99999');
        $this->assertSame(3600, VoiceRealtimeConfig::tokenTtlSeconds());
        $this->setEnv('AI_VOICE_REALTIME_TOKEN_TTL_SECONDS', '10');
        $this->assertSame(60, VoiceRealtimeConfig::tokenTtlSeconds());
    }

    public function testWebsocketUrlContainsModel(): void
    {
        $this->setEnv('XAI_REALTIME_MODEL', 'grok-voice-latest');
        $this->assertStringContainsString('grok-voice-latest', VoiceRealtimeConfig::websocketUrl());
    }
}

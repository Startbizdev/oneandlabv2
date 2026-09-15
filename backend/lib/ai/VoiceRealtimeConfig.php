<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

/**
 * Feature flag et configuration voix temps réel xAI.
 */
final class VoiceRealtimeConfig
{
    public static function isEnabled(): bool
    {
        $raw = ai_env('AI_VOICE_REALTIME_ENABLED', '0') ?? '0';

        return in_array(strtolower(trim($raw)), ['1', 'true', 'yes', 'on'], true);
    }

    public static function isAllowedForUser(string $userId): bool
    {
        if (!self::isEnabled()) {
            return false;
        }

        $allowlist = self::allowlist();
        if ($allowlist === []) {
            return false;
        }

        return in_array(strtolower(trim($userId)), $allowlist, true);
    }

    /**
     * @return list<string>
     */
    public static function allowlist(): array
    {
        $raw = trim((string) (ai_env('AI_VOICE_REALTIME_ALLOWLIST', '') ?? ''));
        if ($raw === '') {
            return [];
        }

        return array_values(array_filter(array_map(
            static fn (string $id): string => strtolower(trim($id)),
            explode(',', $raw),
        )));
    }

    public static function model(): string
    {
        return trim((string) (ai_env('XAI_REALTIME_MODEL', 'grok-voice-latest') ?? 'grok-voice-latest'));
    }

    public static function voiceId(): string
    {
        return trim((string) (ai_env('XAI_TTS_VOICE_ID', 'ara') ?? 'ara'));
    }

    public static function tokenTtlSeconds(): int
    {
        $raw = (int) (ai_env('AI_VOICE_REALTIME_TOKEN_TTL_SECONDS', '300') ?? 300);

        return max(60, min(3600, $raw));
    }

    public static function sampleRate(): int
    {
        return 24000;
    }

    public static function websocketUrl(): string
    {
        $model = rawurlencode(self::model());

        return "wss://api.x.ai/v1/realtime?model={$model}";
    }
}

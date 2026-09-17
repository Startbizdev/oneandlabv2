<?php

declare(strict_types=1);

/**
 * Feature flags déploiement progressif Cary IA.
 */
final class AiFeatureFlags
{
    public static function isEnabled(string $flag): bool
    {
        $envKey = 'AI_FLAG_' . strtoupper(str_replace('-', '_', $flag));
        $env = ai_env($envKey);
        if ($env !== null) {
            return in_array(strtolower($env), ['1', 'true', 'yes', 'on'], true);
        }

        return match ($flag) {
            'memory_summary', 'response_guard', 'tool_dedupe', 'realtime_context_refresh' => true,
            default => false,
        };
    }
}

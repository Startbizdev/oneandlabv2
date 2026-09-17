<?php

declare(strict_types=1);

require_once __DIR__ . '/Cary360Assertions.php';

/**
 * Score de compréhension 0–100 pour evals Cary-360 (local + live).
 */
final class CaryComprehensionScorer
{
    /**
     * @param array<string, mixed> $scenario
     * @param array<string, mixed> $result
     */
    public static function scoreTurn(array $scenario, array $result): int
    {
        $score = 0.0;

        $expectFocus = (string) ($scenario['expect_focus'] ?? '');
        $gotFocus = (string) ($result['focus'] ?? '');
        if ($expectFocus !== '' && $gotFocus === $expectFocus) {
            $score += 30;
        } elseif ($expectFocus === '') {
            $score += 15;
        }

        $expectTools = $scenario['expect_tools'] ?? null;
        $gotTools = is_array($result['tool_calls'] ?? null) ? $result['tool_calls'] : [];
        if ($expectTools === null) {
            $score += 12.5;
        } elseif (is_array($expectTools)) {
            $match = self::toolsMatch($expectTools, $gotTools);
            $score += $match ? 25 : 0;
        }

        $text = (string) ($result['assistant_text'] ?? '');
        $forbidden = is_array($scenario['forbidden'] ?? null) ? $scenario['forbidden'] : [];
        $textErrors = Cary360Assertions::validateAssistantText(
            $text,
            (int) ($scenario['min_length'] ?? 8),
            $forbidden,
            is_array($scenario['soft_contains'] ?? null) ? $scenario['soft_contains'] : [],
            !empty($scenario['require_any_contains']),
        );
        if ($textErrors === []) {
            $score += 15;
        }

        if (!self::repeatsUser($scenario['message'] ?? '', $text)) {
            $score += 20;
        }

        if (Cary360Assertions::validateAssistantText($text, 1, [], [], false, true) === []) {
            $score += 10;
        }

        return (int) round(min(100, max(0, $score)));
    }

    /**
     * @param list<string> $expected
     * @param list<string> $got
     */
    private static function toolsMatch(array $expected, array $got): bool
    {
        if ($expected === [] && $got === []) {
            return true;
        }
        foreach ($expected as $name) {
            if (!in_array($name, $got, true)) {
                return false;
            }
        }

        return true;
    }

    private static function repeatsUser(string $user, string $assistant): bool
    {
        $u = mb_strtolower(trim($user));
        $a = mb_strtolower(trim($assistant));
        if ($u === '' || mb_strlen($u) < 10) {
            return false;
        }
        if (str_contains($a, $u)) {
            return true;
        }
        similar_text($u, $a, $pct);

        return $pct >= 50;
    }
}

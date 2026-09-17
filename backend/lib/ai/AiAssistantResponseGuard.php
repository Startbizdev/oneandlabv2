<?php

declare(strict_types=1);

require_once __DIR__ . '/AiChatHelper.php';
require_once __DIR__ . '/AiVoiceAssistantGuard.php';

/**
 * Garde unifiée chat + voix REST + Realtime : anti-répétition, fausses confirmations, texte vide.
 */
final class AiAssistantResponseGuard
{
    /**
     * @param array<string, mixed>|null $draft
     * @return array{text: string, repaired: bool, reason: ?string}
     */
    public static function normalize(string $userMessage, string $assistantText, ?array $draft = null): array
    {
        $original = trim($assistantText);

        if (self::containsFalseConfirmation($original, $draft)) {
            $text = is_array($draft) && ($draft['status'] ?? '') === 'ready'
                ? 'Voici le récap — appuyez sur Valider pour créer le rendez-vous.'
                : 'Presque fini — complétez le récap à l\'écran puis appuyez sur Valider.';

            return ['text' => $text, 'repaired' => true, 'reason' => 'false_confirmation'];
        }

        $normalized = AiVoiceAssistantGuard::normalize($userMessage, $original, $draft);
        $repaired = $normalized !== $original;
        $reason = $repaired ? 'voice_guard' : null;

        if (self::echoesUser($userMessage, $normalized)) {
            $normalized = 'Bien noté. Que souhaitez-vous faire ensuite ?';
            $repaired = true;
            $reason = 'echo_repair';
        }

        if (trim($normalized) === '' || $normalized === '…') {
            $fallback = self::emptyFallback($draft);

            return ['text' => $fallback, 'repaired' => true, 'reason' => 'empty_response'];
        }

        $sanitized = AiChatHelper::sanitizeVisibleAssistantText($normalized);
        if ($sanitized !== $normalized) {
            $repaired = true;
            $reason = $reason ?? 'internal_leak';
        }

        $warnings = AiChatHelper::readabilityWarnings($sanitized);
        if ($warnings !== [] && mb_strlen($sanitized) > 400) {
            $formatted = AiChatHelper::formatReadableChatText($sanitized);
            if ($formatted !== $sanitized) {
                $sanitized = $formatted;
                $repaired = true;
                $reason = $reason ?? 'readability';
            }
        }

        return ['text' => $sanitized, 'repaired' => $repaired, 'reason' => $reason];
    }

    private static function echoesUser(string $user, string $assistant): bool
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

    /**
     * @param array<string, mixed>|null $draft
     */
    private static function emptyFallback(?array $draft): string
    {
        if (is_array($draft) && ($draft['status'] ?? '') === 'ready') {
            return 'Voici le récap — appuyez sur Valider pour créer le rendez-vous.';
        }

        return 'Je n\'ai pas bien compris. Pouvez-vous reformuler ?';
    }

    /**
     * @param array<string, mixed>|null $draft
     */
    private static function containsFalseConfirmation(string $text, ?array $draft): bool
    {
        if (!is_array($draft) || ($draft['status'] ?? '') === 'confirmed') {
            return false;
        }

        $a = mb_strtolower($text);

        return (bool) preg_match(
            '/\b(?:rdv confirm[ée]|rendez[- ]vous\s+(?:est\s+)?confirm[ée]|rdv cr[ée][ée]|rendez[- ]vous cr[ée][ée]|c[\']?est enregistr[ée])\b/u',
            $a,
        );
    }
}

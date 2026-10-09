<?php

declare(strict_types=1);

require_once __DIR__ . '/AiChatHelper.php';
require_once __DIR__ . '/AiVoiceAssistantGuard.php';

/**
 * Garde unifiée chat + voix REST + Realtime : anti-répétition, fausses confirmations, texte vide.
 */
final class AiAssistantResponseGuard
{
    private const CONFIRMATION_CLAIM = '/\b(?:rdv|rendez[- ]vous)\b(?:[^.!?\n]{0,30}?\b(?:est|a\s+(?:bien\s+)?[ée]t[ée])(?:\s+bien)?)?\s+(?:confirm[ée]|cr[ée][ée]|enregistr[ée]|valid[ée])(?![a-z])|\bc\s?[\'’]?\s?est enregistr[ée]/u';

    private const CONFIRMATION_REQUEST = '/\b(?:confirme|confirmez|confirmer|valide|validez|valider|r[ée]serve|r[ée]servez|r[ée]server|enregistre|enregistrez|enregistrer)(?![a-zàâçéèêëîïôûùüÿ])/u';

    /** Consigne d'appel d'un numéro d'urgence ; « le 15 mars » ou « à 15 h » n'en sont pas. */
    private const EMERGENCY_GUIDANCE = '/\b(?:appel\w*|compos\w*|contact\w*|joign\w*|joindre)\b[^.!?\n]{0,25}?\b(?:15|112|114|3114)\b(?!\s*(?:h\b|heures?|min|janvier|f[ée]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[ée]cembre))|\bSAMU\b/iu';

    /**
     * Une réparation remplace le texte du modèle, mais ne retire jamais une consigne d'appel d'urgence.
     *
     * @param array<string, mixed>|null $draft
     * @return array{text: string, repaired: bool, reason: ?string}
     */
    public static function normalize(string $userMessage, string $assistantText, ?array $draft = null): array
    {
        $result = self::repair($userMessage, $assistantText, $draft);
        if ($result['repaired']) {
            $result['text'] = self::withEmergencyGuidance(trim($assistantText), $result['text']);
        }

        return $result;
    }

    private static function withEmergencyGuidance(string $original, string $text): string
    {
        $missing = [];
        foreach (preg_split('/(?<=[.!?…])\s+|\n+/u', $original) ?: [] as $sentence) {
            $clauses = preg_match(self::CONFIRMATION_CLAIM, mb_strtolower($sentence)) === 1
                ? preg_split('/\s*[,;:]\s*/u', $sentence) ?: []
                : [$sentence];
            foreach ($clauses as $clause) {
                $clause = trim($clause);
                if (preg_match(self::EMERGENCY_GUIDANCE, $clause, $guidance) !== 1
                    || preg_match(self::CONFIRMATION_CLAIM, mb_strtolower($clause)) === 1
                    || str_contains(self::words($text . ' ' . implode(' ', $missing)), self::words($guidance[0]))) {
                    continue;
                }
                $missing[] = mb_strtoupper(mb_substr($clause, 0, 1)) . mb_substr($clause, 1);
            }
        }

        return $missing === [] ? $text : $text . "\n\n" . implode(' ', $missing);
    }

    private static function words(string $text): string
    {
        return trim(preg_replace('/[^\p{L}\p{N}]+/u', ' ', mb_strtolower($text)) ?? '');
    }

    /**
     * @param array<string, mixed>|null $draft
     * @return array{text: string, repaired: bool, reason: ?string}
     */
    private static function repair(string $userMessage, string $assistantText, ?array $draft): array
    {
        $original = trim($assistantText);

        if (self::containsFalseConfirmation($userMessage, $original, $draft)) {
            $text = match (true) {
                !is_array($draft) => 'Je ne confirme jamais un rendez-vous à votre place : je prépare le récapitulatif, puis vous le validez à l\'écran.',
                ($draft['status'] ?? '') === 'ready' => 'Voici le récap — appuyez sur Valider pour créer le rendez-vous.',
                default => 'Presque fini — complétez le récap à l\'écran puis appuyez sur Valider.',
            };

            return ['text' => $text, 'repaired' => true, 'reason' => 'false_confirmation'];
        }

        $normalized = AiVoiceAssistantGuard::normalize($userMessage, $original, $draft);
        $repaired = $normalized !== $original;
        $reason = $repaired ? 'voice_guard' : null;

        if (AiVoiceAssistantGuard::isNearExactEcho($userMessage, $normalized)) {
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
     * Seul le bouton Valider confirme un rendez-vous. Sans brouillon, l'affirmation n'est bloquée que si
     * l'utilisateur vient de demander une confirmation : « votre rendez-vous du 12 est confirmé » reste une
     * réponse légitime à une question sur un rendez-vous existant.
     *
     * @param array<string, mixed>|null $draft
     */
    private static function containsFalseConfirmation(string $userMessage, string $text, ?array $draft): bool
    {
        if (is_array($draft) && ($draft['status'] ?? '') === 'confirmed') {
            return false;
        }
        if (!is_array($draft) && preg_match(self::CONFIRMATION_REQUEST, mb_strtolower($userMessage)) !== 1) {
            return false;
        }

        return preg_match(self::CONFIRMATION_CLAIM, mb_strtolower($text)) === 1;
    }
}

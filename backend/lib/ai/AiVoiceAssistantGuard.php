<?php

declare(strict_types=1);

/**
 * Évite les réponses vocales qui répètent l'utilisateur ou bouclent sur la même question.
 */
final class AiVoiceAssistantGuard
{
    public static function normalize(string $userTranscript, string $assistantText, ?array $draft): string
    {
        $assistant = trim($assistantText);
        if ($assistant === '') {
            return self::fallbackForDraft($draft) ?? 'Comment puis-je vous aider ?';
        }

        if (self::echoesUser($userTranscript, $assistant)) {
            $fallback = self::fallbackForDraft($draft);
            if ($fallback !== null) {
                return $fallback;
            }
        }

        if (self::repeatsBlockedQuestion($assistant, $draft)) {
            $fallback = self::fallbackForDraft($draft);
            if ($fallback !== null && !self::sameIntent($assistant, $fallback)) {
                return $fallback;
            }
        }

        if (self::claimsConfirmedWithoutDraft($assistant, $draft)) {
            if (($draft['status'] ?? '') === 'ready') {
                return 'Voici le récap — appuyez sur Valider pour créer le rendez-vous.';
            }

            return 'Presque fini — complétez le récap à l\'écran puis appuyez sur Valider.';
        }

        return $assistant;
    }

    private static function claimsConfirmedWithoutDraft(string $assistant, ?array $draft): bool
    {
        if (!is_array($draft) || ($draft['status'] ?? '') === 'confirmed') {
            return false;
        }

        $a = mb_strtolower($assistant);

        return (bool) preg_match(
            '/\b(?:c[\']?est enregistr[ée]|enregistr[ée]|confirm[ée]|cr[ée][ée]|valid[ée])\b/u',
            $a,
        );
    }

    private static function echoesUser(string $user, string $assistant): bool
    {
        $u = self::normalizeText($user);
        $a = self::normalizeText($assistant);
        if ($u === '' || mb_strlen($u) < 10) {
            return false;
        }

        if (str_contains($a, $u)) {
            return true;
        }

        similar_text($u, $a, $pct);

        return $pct >= 50;
    }

    private static function repeatsBlockedQuestion(string $assistant, ?array $draft): bool
    {
        if (!is_array($draft)) {
            return false;
        }

        $payload = is_array($draft['payload'] ?? null) ? $draft['payload'] : [];
        $a = mb_strtolower($assistant);

        if (!empty($payload['category_id']) || !empty($payload['category_name'])) {
            if (preg_match('/\b(?:quel soin|quel type de soin|quelle type de soin)\b/u', $a)) {
                return true;
            }
        }

        $missing = is_array($draft['missing_fields'] ?? null) ? $draft['missing_fields'] : [];
        if (!in_array('scheduled_at', $missing, true) && !in_array('availability', $missing, true)) {
            if (preg_match('/\b(?:quelle heure|à quelle heure)\b/u', $a)) {
                return false;
            }
        }

        return false;
    }

    private static function sameIntent(string $a, string $b): bool
    {
        return self::normalizeText($a) === self::normalizeText($b);
    }

    private static function normalizeText(string $text): string
    {
        $t = mb_strtolower(trim($text));
        $t = preg_replace('/[^\p{L}\p{N}\s]/u', ' ', $t) ?? $t;

        return trim(preg_replace('/\s+/u', ' ', $t) ?? $t);
    }

    private static function fallbackForDraft(?array $draft): ?string
    {
        if (!is_array($draft)) {
            return null;
        }

        $payload = is_array($draft['payload'] ?? null) ? $draft['payload'] : [];
        $missing = is_array($draft['missing_fields'] ?? null) ? $draft['missing_fields'] : [];
        $form = is_array($payload['form_data'] ?? null) ? $payload['form_data'] : [];
        $firstName = trim((string) ($form['first_name'] ?? $payload['first_name'] ?? ''));
        $nameSuffix = $firstName !== '' ? " pour {$firstName}" : '';

        if (in_array('type', $missing, true) || (empty($payload['category_id']) && empty($payload['category_name']))) {
            return "Quel type de soin{$nameSuffix} ?";
        }

        if (in_array('scheduled_at', $missing, true) || in_array('availability', $missing, true)) {
            $dateHint = trim((string) ($payload['scheduled_at'] ?? ''));
            if ($dateHint !== '' && strlen($dateHint) <= 10) {
                return 'À quelle heure ?';
            }

            return 'Quand souhaitez-vous le rendez-vous ?';
        }

        if (in_array('address', $missing, true)) {
            return 'Chez le patient ou à votre cabinet ?';
        }

        if (($payload['booking_step'] ?? '') === 'documents') {
            return 'Vous avez une ordonnance, ou elle sera remise au passage ?';
        }

        if (($payload['booking_step'] ?? '') === 'recap' || ($draft['status'] ?? '') === 'ready') {
            return 'Voici le récap — appuyez sur Valider pour créer le rendez-vous.';
        }

        return null;
    }
}

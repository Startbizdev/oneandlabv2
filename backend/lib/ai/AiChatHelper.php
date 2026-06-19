<?php

declare(strict_types=1);

final class AiChatHelper
{
    /**
     * Extrait un bloc booking_patch (ou json équivalent) de la réponse assistant.
     *
     * @return array{content: string, patch: ?array<string, mixed>}
     */
    public static function extractBookingPatch(string $content): array
    {
        $patterns = [
            '/```booking_patch\s*\n?([\s\S]*?)```/i',
            '/```json\s*\n?([\s\S]*?)```/i',
            '/```\s*\n?([\s\S]*?)```/i',
        ];

        foreach ($patterns as $pattern) {
            if (!preg_match($pattern, $content, $matches)) {
                continue;
            }
            $json = trim($matches[1]);
            $decoded = json_decode($json, true);
            if (!is_array($decoded)) {
                continue;
            }
            if (!self::looksLikeBookingPatch($decoded)) {
                continue;
            }
            $clean = trim(preg_replace($pattern, '', $content) ?? $content);
            $clean = self::sanitizeVisibleAssistantText($clean);

            return [
                'content' => $clean,
                'patch' => $decoded,
            ];
        }

        return ['content' => self::sanitizeVisibleAssistantText(trim($content)), 'patch' => null];
    }

    /**
     * @param array<string, mixed> $decoded
     */
    private static function looksLikeBookingPatch(array $decoded): bool
    {
        $keys = ['category_id', 'category_name', 'selected_services', 'booking_step', 'type', 'scheduled_at'];
        foreach ($keys as $key) {
            if (array_key_exists($key, $decoded) && $decoded[$key] !== null && $decoded[$key] !== '') {
                return true;
            }
        }

        return false;
    }

    /**
     * Retire les tokens internes Cary IA du texte visible.
     */
    public static function sanitizeVisibleAssistantText(string $text): string
    {
        $patterns = [
            '/\((?:patient_mode|booking_step|ordonnance_status|relative_id|category_id|service_id)\s*=\s*[^)]+\)/iu',
            '/(?:patient_mode|booking_step|ordonnance_status|relative_id|category_id|service_id)\s*=\s*[\w-]+/iu',
            '/\*\*\((?:patient_mode|booking_step)[^)]+\)\*\*/iu',
        ];
        $out = trim($text);
        foreach ($patterns as $pattern) {
            $out = trim(preg_replace($pattern, '', $out) ?? $out);
        }

        return preg_replace('/\s{2,}/u', ' ', $out) ?? $out;
    }

    /** Cary annonce le récap interactif (carte Valider côté app). */
    public static function assistantSignalsRecap(string $text): bool
    {
        $t = trim($text);
        if ($t === '') {
            return false;
        }

        return (bool) preg_match(
            '/r[eé]cap\b|recap\b|r[eé]capitulatif|recapitulatif|voici le r[eé]?cap|'
            . 'v[eé]rifi(ez|e).*?(dessous|ci-dessous|les d[eé]tails)|'
            . 'appuy(ez|er).*?(valider|confirmer)|confirmez|valider pour confirmer/iu',
            $t,
        );
    }

    /**
     * Rendu markdown minimal (gras, listes) — le mobile peut aussi afficher brut.
     */
    public static function stripMarkdownForPreview(string $text, int $maxLen = 280): string
    {
        $plain = preg_replace('/\*\*(.+?)\*\*/s', '$1', $text) ?? $text;
        $plain = preg_replace('/^[-*]\s+/m', '• ', $plain) ?? $plain;
        $plain = trim($plain);
        if (mb_strlen($plain) > $maxLen) {
            return mb_substr($plain, 0, $maxLen - 1) . '…';
        }

        return $plain;
    }
}

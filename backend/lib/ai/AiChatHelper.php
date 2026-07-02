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
            $clean = self::formatReadableChatText(self::sanitizeVisibleAssistantText($clean));

            return [
                'content' => $clean,
                'patch' => $decoded,
            ];
        }

        return ['content' => self::formatReadableChatText(self::sanitizeVisibleAssistantText(trim($content))), 'patch' => null];
    }

    /**
     * @param array<string, mixed> $decoded
     */
    private static function looksLikeBookingPatch(array $decoded): bool
    {
        $keys = ['category_id', 'category_name', 'selected_services', 'booking_step', 'type', 'scheduled_at',
            'patient_mode', 'first_name', 'last_name', 'patient_id', 'use_staff_contact_email'];
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
        $out = str_replace(["\r\n", "\r"], "\n", trim($text));
        foreach ($patterns as $pattern) {
            $out = trim(preg_replace($pattern, '', $out) ?? $out);
        }

        $lines = explode("\n", $out);
        $lines = array_map(
            static fn (string $line): string => trim(preg_replace('/[ \t]+/u', ' ', $line) ?? $line),
            $lines,
        );
        $out = trim(implode("\n", $lines));

        return trim(preg_replace('/\n{3,}/u', "\n\n", $out) ?? $out);
    }

    /**
     * Aère le texte assistant pour les bulles mobile (paragraphes, listes, sections).
     */
    public static function formatReadableChatText(string $text): string
    {
        $out = str_replace(["\r\n", "\r"], "\n", trim($text));
        if ($out === '') {
            return '';
        }

        $out = preg_replace('/\*\*(.+?)\*\*/su', '$1', $out) ?? $out;
        $out = preg_replace('/^#+\s+/m', '', $out) ?? $out;

        $out = preg_replace(
            '/(?<!\n)\n(?!\n)(?=[-•*]\s)/u',
            "\n\n",
            $out,
        ) ?? $out;

        $out = preg_replace('/:\s+-\s+/u', ":\n\n- ", $out) ?? $out;

        $out = preg_replace(
            '/\s+-\s+(?=[A-ZÀ-Ü0-9«])/u',
            "\n- ",
            $out,
        ) ?? $out;

        $out = preg_replace(
            '/(?<=[.!?…])\s+-\s+(?=[A-ZÀ-Ü0-9«])/u',
            "\n\n- ",
            $out,
        ) ?? $out;

        $out = preg_replace(
            '/(?<!\n\n)(?<=\S)\s+(?=(?:Valeurs|Points|En résumé|Pour résumer|Ce qui|En bref|Côté|NFS|Foie|Rein|Lipides|À retenir)[^\n.]{2,48}:)/iu',
            "\n\n",
            $out,
        ) ?? $out;

        if (!str_contains($out, "\n\n") && mb_strlen($out) > 90) {
            $out = preg_replace(
                '/(?<=[.!?…])\s+(?=[A-ZÀ-Ü«N])/u',
                "\n\n",
                $out,
            ) ?? $out;
        }

        $lines = explode("\n", $out);
        $reflowed = [];
        foreach ($lines as $line) {
            $trimmed = trim($line);
            if ($trimmed === '') {
                $reflowed[] = '';
                continue;
            }
            if (mb_strlen($trimmed) > 320 && !preg_match('/^[-•*]\s/u', $trimmed)) {
                $parts = preg_split('/(?<=[.!?…])\s+(?=[A-ZÀ-Ü«])/u', $trimmed) ?: [$trimmed];
                foreach ($parts as $i => $part) {
                    $part = trim($part);
                    if ($part === '') {
                        continue;
                    }
                    if ($i > 0) {
                        $reflowed[] = '';
                    }
                    $reflowed[] = $part;
                }
                continue;
            }
            $reflowed[] = $trimmed;
        }

        $out = trim(preg_replace("/\n{3,}/u", "\n\n", implode("\n", $reflowed)) ?? '');

        return $out;
    }

    /**
     * @return list<string> avertissements lisibilité (vide = OK)
     */
    public static function readabilityWarnings(string $text): array
    {
        $warnings = [];
        $plain = trim($text);
        if ($plain === '') {
            return ['réponse vide'];
        }

        if (mb_strlen($plain) > 180 && substr_count($plain, "\n") === 0) {
            $warnings[] = 'pavé sans retour à la ligne';
        }

        $blocks = preg_split('/\n{2,}/u', $plain) ?: [$plain];
        foreach ($blocks as $block) {
            $oneLine = trim(preg_replace('/\s+/u', ' ', str_replace("\n", ' ', $block)) ?? $block);
            if (mb_strlen($oneLine) > 420) {
                $warnings[] = 'paragraphe trop long (' . mb_strlen($oneLine) . ' car.)';
                break;
            }
        }

        if (preg_match('/\*\*|^#+\s/m', $plain)) {
            $warnings[] = 'markdown visible';
        }

        if (preg_match('/\b(en tant qu.?assistant|veuillez noter que|il convient de|conformément à)\b/iu', $plain)) {
            $warnings[] = 'ton trop institutionnel';
        }

        return $warnings;
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

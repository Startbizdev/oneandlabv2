<?php

declare(strict_types=1);

require_once __DIR__ . '/AiBookingIdentityParser.php';
require_once __DIR__ . '/CaryBookingPromptRules.php';
require_once __DIR__ . '/AiVoiceDraftReconciler.php';

/**
 * Extraction déterministe depuis la transcription vocale (complète Grok tools).
 */
final class AiVoiceMessageSignals
{
    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed>|null $draft
     * @return array<string, mixed>
     */
    public static function buildDraftPatch(string $transcript, array $user, ?array $draft): array
    {
        $text = trim($transcript);
        if ($text === '') {
            return [];
        }

        $patch = [];
        $role = (string) ($user['role'] ?? '');
        $payload = is_array($draft['payload'] ?? null) ? $draft['payload'] : [];

        if (CaryBookingPromptRules::isStaffRole($role)) {
            $patch = array_merge($patch, self::parseStaffContactFlags($text));
            if (!AiVoiceDraftReconciler::isConversationalReply($text)) {
                $identity = AiBookingIdentityParser::parseContactFromMessage($text);
                if ($identity !== []) {
                    $patch = AiBookingIdentityParser::mergeParsedIdentity($patch, $identity);
                }
            }
        }

        $patch = array_merge($patch, AiVoiceDraftReconciler::buildPatch($payload, $text, $user));

        if (trim((string) ($payload['category_id'] ?? '')) === '') {
            $care = self::parseCareHint($text);
            if ($care !== null) {
                $patch = array_merge($patch, $care);
                $patch['booking_step'] = $payload['booking_step'] ?? 'services';
            }
        }

        $todayParis = (new DateTimeImmutable('now', new DateTimeZone('Europe/Paris')))->format('Y-m-d');
        $schedule = self::parseScheduleHint($text, $todayParis);
        if ($schedule !== null) {
            $patch = array_merge($patch, $schedule);
            if (!empty($patch['scheduled_at']) && empty($patch['booking_step'])) {
                $patch['booking_step'] = 'slot';
            }
        }

        return $patch;
    }

    /**
     * @return array<string, mixed>
     */
    private static function parseStaffContactFlags(string $text): array
    {
        $t = mb_strtolower($text);
        $out = [];

        if (preg_match(
            '/\b(?:pas de mail|pas d[\']?e?-?mail|sans mail|sans e-?mail|utilise(?:r)? mon mail|utilise(?:r)? mon e-?mail|mon mail(?:\s|$)|mon e-?mail(?:\s|$))\b/u',
            $t,
        )) {
            $out['use_staff_contact_email'] = true;
        }

        if (preg_match(
            '/\b(?:pas de t[ée]l(?:[ée]phone)?|sans t[ée]l(?:[ée]phone)?|utilise(?:r)? mon num[ée]ro|mon num[ée]ro|mon t[ée]l(?:[ée]phone)?(?:\s|$))\b/u',
            $t,
        )) {
            $out['use_staff_contact_phone'] = true;
        }

        return $out;
    }

    /**
     * @return array<string, mixed>|null
     */
    private static function parseCareHint(string $text): ?array
    {
        $t = mb_strtolower($text);
        $hints = [
            ['pattern' => '/\b(?:pansement|pansements|placement)\b/u', 'category_name' => 'pansement', 'type' => 'nursing'],
            ['pattern' => '/\b(?:prise de sang|pr[ée]l[èe]vement|blood test)\b/u', 'category_name' => 'sang', 'type' => 'blood_test'],
            ['pattern' => '/\b(?:injection)\b/u', 'category_name' => 'injection', 'type' => 'nursing'],
            ['pattern' => '/\b(?:perfusion)\b/u', 'category_name' => 'perfusion', 'type' => 'nursing'],
        ];

        foreach ($hints as $hint) {
            if (!preg_match($hint['pattern'], $t)) {
                continue;
            }

            return [
                'category_name' => $hint['category_name'],
                'type' => $hint['type'],
                'booking_step' => 'services',
            ];
        }

        return null;
    }

    /**
     * @return array<string, mixed>|null
     */
    private static function parseScheduleHint(string $text, string $todayParis): ?array
    {
        $t = mb_strtolower(trim($text));
        $patch = [];

        if (preg_match('/\baujourd[\']?hui\b/u', $t) || preg_match('/\bce (?:matin|soir)\b/u', $t)) {
            $patch['scheduled_at'] = $todayParis;
        } elseif (preg_match('/\bdemain\b/u', $t)) {
            $patch['scheduled_at'] = (new DateTimeImmutable($todayParis, new DateTimeZone('Europe/Paris')))
                ->modify('+1 day')
                ->format('Y-m-d');
        } elseif (preg_match(
            '/\b(?:le\s+)?(\d{1,2})\s+(janvier|f[ée]vrier|fevrier|mars|avril|mai|juin|juillet|ao[ûu]t|aout|septembre|octobre|novembre|d[ée]cembre|decembre)(?:\s+(\d{4}))?\b/u',
            $t,
            $m,
        )) {
            $day = (int) $m[1];
            $month = self::monthNumber($m[2]);
            $year = isset($m[3]) && $m[3] !== '' ? (int) $m[3] : (int) substr($todayParis, 0, 4);
            if ($month > 0 && $day >= 1 && $day <= 31) {
                $patch['scheduled_at'] = sprintf('%04d-%02d-%02d', $year, $month, $day);
            }
        }

        if (preg_match('/(?:\b(?:à|a)\s*)?(\d{1,2})\s*h(?:\s*(\d{2}))?\b/u', $t, $hm)) {
            $hour = max(0, min(23, (int) $hm[1]));
            $minute = isset($hm[2]) ? max(0, min(59, (int) $hm[2])) : 0;
            $date = substr((string) ($patch['scheduled_at'] ?? $todayParis), 0, 10);
            $patch['scheduled_at'] = sprintf('%s %02d:%02d:00', $date, $hour, $minute);
            $end = min(23, $hour + 1);
            $patch['form_data'] = [
                'availability' => json_encode(['type' => 'custom', 'range' => [$hour, $end]], JSON_UNESCAPED_UNICODE),
            ];
            $patch['booking_step'] = 'slot';
        }

        return $patch === [] ? null : $patch;
    }

    private static function monthNumber(string $raw): int
    {
        $key = preg_replace('/[^a-z]/u', '', mb_strtolower($raw)) ?? '';

        return match ($key) {
            'janvier' => 1,
            'fevrier' => 2,
            'mars' => 3,
            'avril' => 4,
            'mai' => 5,
            'juin' => 6,
            'juillet' => 7,
            'aout' => 8,
            'septembre' => 9,
            'octobre' => 10,
            'novembre' => 11,
            'decembre' => 12,
            default => 0,
        };
    }
}

<?php

/**
 * Libellés courts pour notifications cloche / push — créneaux patient (form_data.availability),
 * pas l’heure technique scheduled_at (souvent minuit).
 */
class NotificationMessageFormatter
{
    private const TZ = 'Europe/Paris';

  private const MONTHS_FR = [
        1 => 'janv.',
        2 => 'févr.',
        3 => 'mars',
        4 => 'avr.',
        5 => 'mai',
        6 => 'juin',
        7 => 'juil.',
        8 => 'août',
        9 => 'sept.',
        10 => 'oct.',
        11 => 'nov.',
        12 => 'déc.',
    ];

    public static function patientDisplayName(?string $first, ?string $last): string
    {
        $n = trim(trim((string) ($first ?? '')) . ' ' . trim((string) ($last ?? '')));
        return $n !== '' ? $n : 'Patient';
    }

    public static function careShortLabel(?string $categoryName, ?string $appointmentType = null): string
    {
        $cat = trim((string) ($categoryName ?? ''));
        if ($cat !== '') {
            return $cat;
        }
        return ($appointmentType ?? '') === 'blood_test' ? 'Prélèvement' : 'Soins';
    }

    public static function appointmentTypeLabel(?string $type): string
    {
        return ($type ?? '') === 'blood_test' ? 'Prélèvement' : 'Soins infirmiers';
    }

    /** « 23 mai » */
    public static function dateShort(?string $scheduledAt): string
    {
        if ($scheduledAt === null || trim($scheduledAt) === '') {
            return '';
        }
        try {
            $dt = new DateTime($scheduledAt);
            $dt->setTimezone(new DateTimeZone(self::TZ));
            $d = (int) $dt->format('j');
            $m = (int) $dt->format('n');
            $month = self::MONTHS_FR[$m] ?? $dt->format('m');
            return $d . ' ' . $month;
        } catch (Exception $e) {
            return '';
        }
    }

    /**
     * Créneau lisible : Toute la journée, 9h-12h, etc.
     *
     * @param array<string,mixed>|string|null $formData
     */
    public static function availabilitySlotLabel($formData, ?string $scheduledAt = null): string
    {
        $av = self::normalizeAvailability($formData);
        if ($av === null) {
            return self::fallbackClockFromScheduled($scheduledAt);
        }

        $type = strtolower(str_replace('-', '_', (string) ($av['type'] ?? '')));

        if (in_array($type, ['all_day', 'fullday', 'full_day'], true)) {
            return 'Toute la journée';
        }

        if (
            ($type === 'custom' || $type === '' || $type === 'specificslot' || $type === 'specific_slot')
            && isset($av['range']) && is_array($av['range']) && count($av['range']) >= 2
        ) {
            $start = (float) $av['range'][0];
            $end = (float) $av['range'][1];
            if (is_finite($start) && is_finite($end) && $end > $start) {
                $h1 = (int) floor($start);
                $h2 = (int) floor($end);
                if ($h2 - $h1 >= 6 && $h1 <= 9 && $h2 >= 17) {
                    return 'Toute la journée';
                }
                return $h1 . 'h-' . $h2 . 'h';
            }
        }

        return self::fallbackClockFromScheduled($scheduledAt);
    }

    /**
     * @param array<string,mixed>|string|null $formData
     */
    public static function whenShort($formData, ?string $scheduledAt = null): string
    {
        $date = self::dateShort($scheduledAt);
        $slot = self::availabilitySlotLabel($formData, $scheduledAt);
        if ($date !== '' && $slot !== '') {
            return $date . ' · ' . $slot;
        }
        return $date !== '' ? $date : $slot;
    }

    /** @param list<string|null> $parts */
    public static function joinParts(array $parts): string
    {
        $out = [];
        foreach ($parts as $p) {
            $t = trim((string) ($p ?? ''));
            if ($t !== '') {
                $out[] = $t;
            }
        }
        return implode(' · ', $out);
    }

    /**
     * @param array<string,mixed>|string|null $formData
     * @return array<string,mixed>|null
     */
    private static function normalizeAvailability($formData): ?array
    {
        if ($formData === null || $formData === '') {
            return null;
        }

        $availability = $formData;
        if (is_array($formData) && array_key_exists('availability', $formData)) {
            $availability = $formData['availability'];
        }

        if (is_string($availability)) {
            $trim = trim($availability);
            if ($trim === '') {
                return null;
            }
            $low = strtolower($trim);
            if (in_array($low, ['allday', 'full_day', 'fullday', 'all_day'], true)) {
                return ['type' => 'all_day'];
            }
            $decoded = json_decode($trim, true);
            return is_array($decoded) ? $decoded : null;
        }

        return is_array($availability) ? $availability : null;
    }

    private static function fallbackClockFromScheduled(?string $scheduledAt): string
    {
        if ($scheduledAt === null || trim($scheduledAt) === '') {
            return '';
        }
        try {
            $dt = new DateTime($scheduledAt);
            $dt->setTimezone(new DateTimeZone(self::TZ));
            $h = (int) $dt->format('G');
            $m = (int) $dt->format('i');
            if ($h === 0 && $m === 0) {
                return '';
            }
            if ($m === 0) {
                return $h . 'h';
            }
            return $dt->format('G\hi');
        } catch (Exception $e) {
            return '';
        }
    }
}

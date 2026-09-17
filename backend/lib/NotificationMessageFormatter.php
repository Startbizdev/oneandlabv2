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

    /**
     * Résumé compact pour SMS / push : soin, options catalogue, durée, fréquence, date/créneau.
     *
     * @param array<string,mixed>|string|null $formData
     * @param array<string, array{label: string, valueLabels: array<string,string>}> $optionMeta
     */
    public static function appointmentContextShort(
        $formData,
        ?string $categoryName,
        ?string $appointmentType,
        ?string $scheduledAt = null,
        array $optionMeta = []
    ): string {
        if (!is_array($formData)) {
            $formData = [];
        }
        $type = ($appointmentType ?? '') === 'blood_test' ? 'blood_test' : 'nursing';

        $parts = [];
        $care = self::careShortLabel($categoryName, $type);
        if ($care !== '') {
            $parts[] = $care;
        }

        $opts = self::careOptionsSummary($formData, $optionMeta);
        if ($opts !== '') {
            $parts[] = $opts;
        }

        if ($type === 'nursing') {
            $dur = self::nursingDurationLabel($formData);
            if ($dur !== '') {
                $parts[] = $dur;
            }
            $freq = self::nursingFrequencyLabel($formData);
            if ($freq !== '') {
                $parts[] = $freq;
            }
            $pref = self::preferredNurseGenderLabel(
                isset($formData['preferred_nurse_gender']) ? (string) $formData['preferred_nurse_gender'] : ''
            );
            if ($pref !== '') {
                $parts[] = $pref;
            }
        } else {
            $bloodDur = self::bloodDurationLabel($formData);
            if ($bloodDur !== '') {
                $parts[] = $bloodDur;
            }
            $bt = self::bloodTestTypeLabel($formData);
            if ($bt !== '') {
                $parts[] = $bt;
            }
        }

        $when = self::whenShort($formData, $scheduledAt);
        if ($when !== '') {
            $parts[] = $when;
        }

        return self::joinParts($parts);
    }

    /**
     * @param array<string,mixed> $formData
     * @param array<string, array{label: string, valueLabels: array<string,string>}> $optionMeta
     */
    public static function careOptionsSummary(array $formData, array $optionMeta = []): string
    {
        $careOpts = $formData['care_options'] ?? null;
        if (!is_array($careOpts) || $careOpts === []) {
            return '';
        }

        $chunks = [];
        foreach ($careOpts as $key => $val) {
            $keyStr = (string) $key;
            if ($val === null || $val === '' || str_ends_with($keyStr, '_autre_detail')) {
                continue;
            }

            $meta = $optionMeta[$keyStr] ?? null;

            if (is_array($val)) {
                $parts = [];
                foreach ($val as $vi) {
                    if ($vi === null || $vi === '') {
                        continue;
                    }
                    $sv = is_scalar($vi) ? trim((string) $vi) : '';
                    if ($sv === '') {
                        continue;
                    }
                    $parts[] = (is_array($meta) && isset($meta['valueLabels'][$sv]))
                        ? $meta['valueLabels'][$sv]
                        : $sv;
                }
                if ($parts !== []) {
                    $chunks[] = implode(', ', $parts);
                }
                continue;
            }

            $displayVal = is_scalar($val) ? trim((string) $val) : '';
            if ($displayVal === '') {
                continue;
            }

            if ($displayVal === 'autre') {
                $detailKey = $keyStr . '_autre_detail';
                $detail = isset($careOpts[$detailKey]) ? trim((string) $careOpts[$detailKey]) : '';
                if ($detail !== '') {
                    $chunks[] = $detail;
                    continue;
                }
            }

            if (is_array($meta) && isset($meta['valueLabels'][$displayVal])) {
                $chunks[] = $meta['valueLabels'][$displayVal];
            } else {
                $chunks[] = $displayVal;
            }
        }

        return self::joinParts($chunks);
    }

    /**
     * Détails lisibles d'un soin Pansement-plaie destiné au partage infirmier.
     * Les valeurs de la ligne normalisée (donc notamment appointment_nursing_items)
     * priment sur les anciens emplacements form_data.
     *
     * @param array<string,mixed> $item
     * @param array<string,mixed> $formData
     * @param array<string, array{label: string, valueLabels: array<string,string>}> $optionMeta
     */
    public static function shareWoundCareDetails(array $item, array $formData, array $optionMeta = []): string
    {
        $details = [];
        foreach (['wound_type', 'location'] as $optionKey) {
            $value = self::shareCareOptionValue($optionKey, $item, $formData);
            if ($value === '') {
                continue;
            }

            $meta = isset($optionMeta[$optionKey]) && is_array($optionMeta[$optionKey])
                ? $optionMeta[$optionKey]
                : [];
            $fieldLabel = trim((string) ($meta['label'] ?? ''));
            if ($fieldLabel === '') {
                $fieldLabel = $optionKey === 'wound_type' ? 'Type de plaie' : 'Localisation';
            }
            $valueLabels = isset($meta['valueLabels']) && is_array($meta['valueLabels'])
                ? $meta['valueLabels']
                : [];
            $valueLabel = isset($valueLabels[$value])
                ? trim((string) $valueLabels[$value])
                : self::humanizeOptionValue($value);
            if ($valueLabel !== '') {
                $details[] = $fieldLabel . ' : ' . $valueLabel;
            }
        }

        return self::joinParts($details);
    }

    /**
     * @param array<string,mixed> $item
     * @param array<string,mixed> $formData
     */
    private static function shareCareOptionValue(string $optionKey, array $item, array $formData): string
    {
        $itemOptions = self::normalizeCareOptions($item['care_options'] ?? null);
        $direct = self::scalarOptionValue($itemOptions[$optionKey] ?? null);
        if ($direct !== '') {
            return $direct;
        }

        $categoryId = trim((string) ($item['category_id'] ?? ''));
        $itemLabel = trim((string) ($item['category_name'] ?? $item['label'] ?? ''));
        $selectedServices = is_array($formData['selected_services'] ?? null)
            ? $formData['selected_services']
            : [];
        $serviceIds = [];
        foreach ($selectedServices as $service) {
            if (!is_array($service)) {
                continue;
            }
            $serviceCategoryId = trim((string) ($service['category_id'] ?? ''));
            $serviceLabel = trim((string) ($service['name'] ?? $service['label'] ?? ''));
            if (
                ($categoryId !== '' && $serviceCategoryId === $categoryId)
                || ($itemLabel !== '' && $serviceLabel === $itemLabel)
            ) {
                $serviceId = trim((string) ($service['id'] ?? ''));
                if ($serviceId !== '') {
                    $serviceIds[] = $serviceId;
                }
            }
        }
        if ($categoryId !== '') {
            $serviceIds[] = $categoryId;
        }

        $byService = is_array($formData['formDataByService'] ?? null)
            ? $formData['formDataByService']
            : [];
        foreach (array_values(array_unique($serviceIds)) as $serviceId) {
            $slice = is_array($byService[$serviceId] ?? null) ? $byService[$serviceId] : [];
            $sliceOptions = self::normalizeCareOptions($slice['care_options'] ?? null);
            $value = self::scalarOptionValue($sliceOptions[$optionKey] ?? null);
            if ($value !== '') {
                return $value;
            }
        }

        $nursingItems = is_array($formData['nursing_items'] ?? null)
            ? $formData['nursing_items']
            : [];
        foreach ($nursingItems as $formItem) {
            if (!is_array($formItem)) {
                continue;
            }
            $formCategoryId = trim((string) ($formItem['category_id'] ?? ''));
            $formLabel = trim((string) ($formItem['category_name'] ?? $formItem['label'] ?? ''));
            if (
                ($categoryId !== '' && $formCategoryId !== $categoryId)
                || ($categoryId === '' && $itemLabel !== '' && $formLabel !== $itemLabel)
            ) {
                continue;
            }
            $formOptions = self::normalizeCareOptions($formItem['care_options'] ?? null);
            $value = self::scalarOptionValue($formOptions[$optionKey] ?? null);
            if ($value !== '') {
                return $value;
            }
        }

        $rootOptions = self::normalizeCareOptions($formData['care_options'] ?? null);
        return self::scalarOptionValue($rootOptions[$optionKey] ?? null);
    }

    /** @param mixed $raw @return array<string,mixed> */
    private static function normalizeCareOptions($raw): array
    {
        if (is_array($raw)) {
            return $raw;
        }
        if (is_string($raw) && trim($raw) !== '') {
            $decoded = json_decode($raw, true);
            return is_array($decoded) ? $decoded : [];
        }
        return [];
    }

    /** @param mixed $value */
    private static function scalarOptionValue($value): string
    {
        return is_scalar($value) ? trim((string) $value) : '';
    }

    private static function humanizeOptionValue(string $value): string
    {
        $readable = trim((string) preg_replace('/[\s_-]+/u', ' ', $value));
        if ($readable === '') {
            return '';
        }
        return function_exists('mb_strtoupper')
            ? mb_strtoupper(mb_substr($readable, 0, 1, 'UTF-8'), 'UTF-8') . mb_substr($readable, 1, null, 'UTF-8')
            : ucfirst($readable);
    }

    /** @param array<string,mixed> $formData */
    public static function nursingFrequencyLabel(array $formData): string
    {
        $durationDays = (string) ($formData['duration_days'] ?? '');
        if ($durationDays === '1' || $durationDays === '' || $durationDays === 'to_define') {
            return '';
        }
        $freq = (string) ($formData['frequency'] ?? '');
        return self::mapFrequencyCode($freq);
    }

    /** @param array<string,mixed> $formData */
    public static function nursingDurationLabel(array $formData): string
    {
        $durationDays = $formData['duration_days'] ?? null;
        $customDays = $formData['custom_days'] ?? null;
        if ($durationDays === null || $durationDays === '') {
            return '';
        }
        $dd = (string) $durationDays;
        if ($dd === 'to_define') {
            return 'À préciser avec le pro';
        }
        if ($dd === 'custom') {
            $n = (int) $customDays;
            return $n > 0 ? $n . ' jours' : 'Durée personnalisée';
        }
        $map = [
            '1' => 'Une seule fois',
            '7' => 'Environ 1 semaine',
            '10' => 'Environ 10 jours',
            '15' => 'Environ 2 semaines',
            '30' => 'Environ 1 mois',
            '60+' => 'Longue durée',
        ];
        return $map[$dd] ?? $dd;
    }

    /** @param array<string,mixed> $formData */
    public static function shareCareDurationPart(array $formData): string
    {
        $passageSource = (string) ($formData['passage_source'] ?? '');
        $passageMinutes = (int) ($formData['passage_duration_minutes'] ?? 0);
        if ($passageSource === 'nurse_passage' || $passageMinutes > 0) {
            if ($passageMinutes === 60) {
                return '1 h';
            }
            if ($passageMinutes > 0 && $passageMinutes % 60 === 0) {
                return (string) ((int) ($passageMinutes / 60)) . ' h';
            }
            if ($passageMinutes > 0) {
                return $passageMinutes . ' min';
            }
        }

        return self::nursingDurationLabel($formData);
    }

    /** Suffixe créneau pour partage WhatsApp (ex. « le matin », « à midi »). @param array<string,mixed> $formData */
    public static function shareCreneauSuffix(array $formData): string
    {
        $slot = trim((string) ($formData['passage_time_slot'] ?? ''));
        if ($slot === 'all_day') {
            return '';
        }

        $slotLabels = [
            'morning' => ' le matin',
            'noon' => ' à midi',
            'afternoon' => ' l\'après-midi',
            'evening' => ' le soir',
            'night' => ' la nuit',
        ];
        if ($slot !== '' && isset($slotLabels[$slot])) {
            return $slotLabels[$slot];
        }
        if ($slot === 'custom') {
            $custom = trim((string) ($formData['custom_time'] ?? ''));
            if ($custom !== '') {
                return ' à ' . substr($custom, 0, 5);
            }
        }

        $availability = $formData['availability'] ?? $formData['availability_type'] ?? null;
        if ($availability === null) {
            return '';
        }
        $av = is_string($availability) ? json_decode($availability, true) : $availability;
        if (!is_array($av) || !isset($av['type'])) {
            return '';
        }
        if ($av['type'] === 'all_day') {
            return '';
        }
        if (
            $av['type'] === 'custom'
            && !empty($av['range'])
            && is_array($av['range'])
            && count($av['range']) >= 2
        ) {
            $start = (int) $av['range'][0];
            $end = (int) $av['range'][1];
            $rangeToSuffix = [
                '8-12' => ' le matin',
                '12-14' => ' à midi',
                '14-18' => ' l\'après-midi',
                '18-21' => ' le soir',
                '21-23' => ' la nuit',
            ];
            $key = $start . '-' . $end;

            return $rangeToSuffix[$key] ?? (' à ' . $start . 'h - ' . $end . 'h');
        }

        return '';
    }

    public static function preferredNurseGenderLabel(?string $gender): string
    {
        $g = trim((string) ($gender ?? ''));
        if ($g === '' || $g === 'any') {
            return '';
        }
        $map = ['female' => 'Une infirmière', 'male' => 'Un infirmier'];
        return $map[$g] ?? '';
    }

    /** @param array<string,mixed> $formData */
    public static function bloodDurationLabel(array $formData): string
    {
        $dd = (string) ($formData['duration_days'] ?? '');
        if ($dd === 'custom') {
            $n = isset($formData['custom_days']) ? (int) $formData['custom_days'] : 0;
            return $n > 0 ? $n . ' jours' : '';
        }
        $map = [
            '7' => 'environ 1 semaine',
            '10' => 'environ 10 jours',
            '15' => 'environ 2 semaines',
            '30' => 'environ 1 mois',
            '60+' => 'plusieurs semaines',
            'to_define' => 'à préciser',
        ];
        return $map[$dd] ?? '';
    }

    /** @param array<string,mixed> $formData */
    public static function bloodTestTypeLabel(array $formData): string
    {
        $t = (string) ($formData['blood_test_type'] ?? '');
        if ($t === 'single') {
            return '1 prélèvement';
        }
        if ($t === 'multiple') {
            $d = self::bloodDurationLabel($formData);
            return $d !== '' ? 'Plusieurs prélèvements · ' . $d : 'Plusieurs prélèvements';
        }
        return '';
    }

    public static function mapFrequencyCode(string $code): string
    {
        if ($code === '') {
            return '';
        }
        $map = [
            'once_daily' => '1 fois par jour',
            'twice_daily' => '2 fois par jour',
            'thrice_daily' => '3 fois par jour',
            'twice_weekly' => '2 fois par semaine',
            'thrice_weekly' => '3 fois par semaine',
            'to_define' => 'Fréquence à définir',
            'daily' => '1 fois par jour',
            'every_other_day' => '1 jour sur 2',
        ];
        return $map[$code] ?? $code;
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

    /** Titre cloche / push — invitation avis post-RDV patient. */
    public static function completedAppointmentReviewTitle(): string
    {
        return 'Comment s\'est passé votre soin ?';
    }

    /** Corps cloche / push — invitation avis post-RDV patient. */
    public static function completedAppointmentReviewMessage(?string $actorDisplayLabel): string
    {
        $actorShort = self::actorShortNameForReview($actorDisplayLabel);
        if ($actorShort !== null) {
            return 'Votre soin avec ' . $actorShort . ' est terminé. Notez votre expérience en 2 minutes — cela aide d\'autres patients Cary.';
        }

        return 'Votre soin est terminé. Notez votre expérience en 2 minutes pour aider la communauté Cary.';
    }

    private static function actorShortNameForReview(?string $actorDisplayLabel): ?string
    {
        if ($actorDisplayLabel === null) {
            return null;
        }
        $label = trim($actorDisplayLabel);
        if ($label === '') {
            return null;
        }

        $prefixes = ['Le laboratoire ', 'Le préleveur ', "L'infirmier "];
        foreach ($prefixes as $prefix) {
            if (str_starts_with($label, $prefix)) {
                $rest = trim(substr($label, strlen($prefix)));
                return $rest !== '' ? $rest : null;
            }
        }

        return $label;
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

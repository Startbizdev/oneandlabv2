<?php

declare(strict_types=1);

/**
 * Construit les payloads Appointment::create depuis un brouillon IA (aligné wizard multi-lots).
 */
final class AiBookingPayloadBuilder
{
    /**
     * @param array<string, mixed> $payload
     * @param array<string, mixed> $user
     * @return list<array<string, mixed>>
     */
    public static function buildFromDraft(array $payload, array $user, string $role): array
    {
        $services = $payload['selected_services'] ?? null;
        if (!is_array($services) || count($services) <= 1) {
            return [self::singlePayload($payload, $user)];
        }

        $blood = [];
        $nursing = [];
        $other = [];
        foreach ($services as $svc) {
            if (!is_array($svc)) {
                continue;
            }
            $type = (string) ($svc['type'] ?? '');
            if ($type === 'blood_test') {
                $blood[] = $svc;
            } elseif ($type === 'nursing') {
                $nursing[] = $svc;
            } else {
                $other[] = $svc;
            }
        }

        $out = [];
        if ($blood !== []) {
            $out[] = self::mergedBloodPayload($payload, $blood, $user);
        }
        if ($nursing !== []) {
            $out[] = self::mergedNursingPayload($payload, $nursing, $user);
        }
        foreach ($other as $svc) {
            $out[] = self::servicePayload($payload, $svc, $user);
        }

        return $out !== [] ? $out : [self::singlePayload($payload, $user)];
    }

    /**
     * @param array<string, mixed> $payload
     * @param array<string, mixed> $user
     * @return array<string, mixed>
     */
    private static function singlePayload(array $payload, array $user): array
    {
        $type = (string) ($payload['type'] ?? 'blood_test');
        $formData = is_array($payload['form_data'] ?? null) ? $payload['form_data'] : [];
        $address = $payload['address'] ?? $formData['address'] ?? null;
        if (is_array($formData['availability'] ?? null)) {
            $formData['availability'] = json_encode($formData['availability'], JSON_UNESCAPED_UNICODE);
        }

        return [
            'type' => $type,
            'form_type' => (string) ($payload['form_type'] ?? $type),
            'patient_id' => (string) ($payload['patient_id'] ?? $user['user_id']),
            'relative_id' => $payload['relative_id'] ?? null,
            'category_id' => $payload['category_id'] ?? null,
            'scheduled_at' => (string) ($payload['scheduled_at'] ?? $formData['scheduled_at']),
            'address' => $address,
            'form_data' => array_merge($formData, [
                'scheduled_at' => $payload['scheduled_at'] ?? $formData['scheduled_at'] ?? null,
                'address' => $address,
                'availability' => $formData['availability'] ?? null,
                'files' => $formData['files'] ?? ($payload['files'] ?? []),
            ]),
            'files' => $payload['files'] ?? $formData['files'] ?? [],
            'notes' => $payload['notes'] ?? null,
        ];
    }

    /**
     * @param array<string, mixed> $payload
     * @param list<array<string, mixed>> $services
     * @param array<string, mixed> $user
     * @return array<string, mixed>
     */
    private static function mergedNursingPayload(array $payload, array $services, array $user): array
    {
        $first = $services[0];
        $formDataByService = is_array($payload['formDataByService'] ?? null) ? $payload['formDataByService'] : [];
        $firstData = is_array($formDataByService[$first['id']] ?? null) ? $formDataByService[$first['id']] : [];
        $sharedForm = is_array($payload['form_data'] ?? null) ? $payload['form_data'] : [];

        $nursingItems = [];
        foreach ($services as $index => $svc) {
            $sid = (string) ($svc['id'] ?? '');
            $svcData = $sid !== '' && is_array($formDataByService[$sid] ?? null)
                ? $formDataByService[$sid]
                : [];
            $careOpts = is_array($svcData['care_options'] ?? null) ? $svcData['care_options'] : [];
            if ($careOpts === [] && is_array($sharedForm['care_options'] ?? null)) {
                $careOpts = $sharedForm['care_options'];
            }
            $nursingItems[] = [
                'category_id' => $svc['category_id'] ?? null,
                'label' => $svc['name'] ?? $svc['category_name'] ?? '',
                'care_options' => $careOpts,
                'sort_order' => $index,
            ];
        }

        $availability = $firstData['availability'] ?? $sharedForm['availability'] ?? null;
        if (is_array($availability)) {
            $availability = json_encode($availability, JSON_UNESCAPED_UNICODE);
        }

        $baseForm = array_merge($sharedForm, [
            'address' => $payload['address'] ?? null,
            'availability' => $availability,
            'scheduled_at' => $payload['scheduled_at'] ?? ($firstData['scheduled_at'] ?? null),
            'files' => $firstData['files'] ?? ($payload['files'] ?? []),
            'nursing_items' => $nursingItems,
        ]);
        if (count($nursingItems) === 1 && !empty($nursingItems[0]['care_options'])) {
            $baseForm['care_options'] = $nursingItems[0]['care_options'];
        }

        return [
            'type' => 'nursing',
            'form_type' => 'nursing',
            'patient_id' => (string) ($payload['patient_id'] ?? $user['user_id']),
            'relative_id' => $payload['relative_id'] ?? null,
            'category_id' => $first['category_id'] ?? null,
            'scheduled_at' => (string) ($payload['scheduled_at'] ?? ($firstData['scheduled_at'] ?? '')),
            'address' => $payload['address'] ?? null,
            'form_data' => $baseForm,
            'files' => $firstData['files'] ?? ($payload['files'] ?? []),
            'nursing_items' => $nursingItems,
            'notes' => $payload['notes'] ?? null,
        ];
    }

    /**
     * @param array<string, mixed> $payload
     * @param list<array<string, mixed>> $services
     * @param array<string, mixed> $user
     * @return array<string, mixed>
     */
    private static function mergedBloodPayload(array $payload, array $services, array $user): array
    {
        $first = $services[0];
        $formDataByService = is_array($payload['formDataByService'] ?? null) ? $payload['formDataByService'] : [];
        $firstData = is_array($formDataByService[$first['id']] ?? null) ? $formDataByService[$first['id']] : [];
        $sharedForm = is_array($payload['form_data'] ?? null) ? $payload['form_data'] : [];

        $bloodItems = [];
        foreach ($services as $index => $svc) {
            $sid = (string) ($svc['id'] ?? '');
            $svcData = $sid !== '' && is_array($formDataByService[$sid] ?? null)
                ? $formDataByService[$sid]
                : [];
            $careOpts = is_array($svcData['care_options'] ?? null) ? $svcData['care_options'] : [];
            if ($careOpts === [] && is_array($sharedForm['care_options'] ?? null)) {
                $careOpts = $sharedForm['care_options'];
            }
            $bloodItems[] = [
                'category_id' => $svc['category_id'] ?? null,
                'label' => $svc['name'] ?? $svc['category_name'] ?? '',
                'care_options' => $careOpts,
                'sort_order' => $index,
            ];
        }

        $availability = $firstData['availability'] ?? $sharedForm['availability'] ?? null;
        if (is_array($availability)) {
            $availability = json_encode($availability, JSON_UNESCAPED_UNICODE);
        }

        $baseForm = array_merge($sharedForm, [
            'address' => $payload['address'] ?? null,
            'availability' => $availability,
            'scheduled_at' => $payload['scheduled_at'] ?? ($firstData['scheduled_at'] ?? null),
            'files' => $firstData['files'] ?? ($payload['files'] ?? []),
            'blood_test_items' => $bloodItems,
        ]);

        return [
            'type' => 'blood_test',
            'form_type' => 'blood_test',
            'patient_id' => (string) ($payload['patient_id'] ?? $user['user_id']),
            'relative_id' => $payload['relative_id'] ?? null,
            'category_id' => $first['category_id'] ?? null,
            'scheduled_at' => (string) ($payload['scheduled_at'] ?? ($firstData['scheduled_at'] ?? '')),
            'address' => $payload['address'] ?? null,
            'form_data' => $baseForm,
            'files' => $firstData['files'] ?? ($payload['files'] ?? []),
            'blood_test_items' => $bloodItems,
            'notes' => $payload['notes'] ?? null,
        ];
    }

    /**
     * @param array<string, mixed> $payload
     * @param array<string, mixed> $svc
     * @param array<string, mixed> $user
     * @return array<string, mixed>
     */
    private static function servicePayload(array $payload, array $svc, array $user): array
    {
        $clone = $payload;
        $clone['type'] = $svc['type'] ?? $payload['type'];
        $clone['category_id'] = $svc['category_id'] ?? null;
        $clone['category_name'] = $svc['name'] ?? $svc['category_name'] ?? null;

        return self::singlePayload($clone, $user);
    }
}

<?php

declare(strict_types=1);

require_once __DIR__ . '/../Validation.php';

final class UnifiedRdvValidator
{
    /**
     * Validation simplifiée alignée sur Appointment::create (Phase 1).
     *
     * @param array<string, mixed> $payload
     * @return array{valid: bool, error: ?string, missing: list<string>}
     */
    public static function validateDraft(array $payload, string $role, bool $patientEmailOptional = false): array
    {
        $missing = [];
        $type = (string) ($payload['type'] ?? $payload['form_type'] ?? '');
        if ($type === '' || !Validation::appointmentType($type)) {
            $missing[] = 'type';
        }

        $address = $payload['address'] ?? ($payload['form_data']['address'] ?? null);
        if (!is_array($address) || trim((string) ($address['label'] ?? '')) === '') {
            $missing[] = 'address';
        } elseif (!isset($address['lat'], $address['lng']) || !is_numeric($address['lat']) || !is_numeric($address['lng'])) {
            $missing[] = 'address';
        } elseif ((float) $address['lat'] === 0.0 && (float) $address['lng'] === 0.0) {
            $missing[] = 'address';
        } elseif (self::isPlaceholderAddressLabel((string) ($address['label'] ?? ''))) {
            $missing[] = 'address';
        }

        $scheduledAt = $payload['scheduled_at'] ?? ($payload['form_data']['scheduled_at'] ?? null);
        if ($scheduledAt === null || trim((string) $scheduledAt) === '') {
            $missing[] = 'scheduled_at';
        }

        $formData = is_array($payload['form_data'] ?? null) ? $payload['form_data'] : [];
        $availabilityRaw = $formData['availability'] ?? $payload['availability'] ?? null;
        if ($availabilityRaw === null || trim((string) $availabilityRaw) === '') {
            $missing[] = 'availability';
        } elseif (!self::isValidAvailability($availabilityRaw)) {
            $missing[] = 'availability';
        }

        if ($type === 'nursing' && empty($payload['category_id'])) {
            $missing[] = 'category_id';
        }

        $patientMode = (string) ($payload['patient_mode'] ?? 'self');
        if (in_array($role, ['pro', 'nurse'], true)) {
            if ($patientMode === 'new') {
                foreach (['first_name', 'last_name'] as $field) {
                    $v = $payload[$field] ?? ($payload['form_data'][$field] ?? null);
                    if ($v === null || trim((string) $v) === '') {
                        $missing[] = $field;
                    }
                }
            } elseif ($patientMode === 'existing') {
                $pid = $payload['patient_id'] ?? null;
                if ($pid === null || !Validation::uuid((string) $pid)) {
                    $missing[] = 'patient_id';
                }
            }
        }

        if ($missing !== []) {
            return ['valid' => false, 'error' => 'Champs manquants : ' . implode(', ', $missing), 'missing' => $missing];
        }

        return ['valid' => true, 'error' => null, 'missing' => []];
    }

    private static function isPlaceholderAddressLabel(string $label): bool
    {
        $normalized = mb_strtolower(trim($label));
        $needles = [
            'adresse du compte',
            'mon compte',
            'même adresse',
            'meme adresse',
            'adresse enregistrée',
            'adresse enregistree',
        ];
        foreach ($needles as $needle) {
            if ($normalized !== '' && str_contains($normalized, $needle)) {
                return true;
            }
        }

        return false;
    }

    private static function isValidAvailability(mixed $raw): bool
    {
        if (is_array($raw)) {
            $data = $raw;
        } elseif (is_string($raw) && trim($raw) !== '') {
            $data = json_decode($raw, true);
            if (!is_array($data)) {
                return false;
            }
        } else {
            return false;
        }

        $type = (string) ($data['type'] ?? '');
        if ($type === 'all_day') {
            return true;
        }
        if ($type === 'custom' && is_array($data['range'] ?? null) && count($data['range']) === 2) {
            $start = (float) $data['range'][0];
            $end = (float) $data['range'][1];

            return $end - $start >= 1;
        }
        if ($type === 'urgent') {
            return true;
        }

        return false;
    }
}

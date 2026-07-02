<?php

declare(strict_types=1);

/**
 * Étapes RDV Cary IA — ordonnance avant récap (aligné wizard mobile).
 * Statuts et étapes viennent du patch Grok (tools), pas de re-parse du message utilisateur.
 */
final class AiBookingWorkflow
{
    /**
     * @param array<string, mixed> $payload
     * @param array<string, mixed>|null $previous
     * @return array<string, mixed>
     */
    public static function apply(array $payload, ?string $userMessage = null, ?array $previous = null): array
    {
        if (!self::requiresOrdonnanceStep($payload)) {
            $payload['ordonnance_status'] = 'not_required';
            if (empty($payload['booking_step'])) {
                $payload['booking_step'] = self::hasCoreBookingFields($payload) ? 'recap' : 'services';
            }

            return $payload;
        }

        $payload['ordonnance_status'] = self::resolveOrdonnanceStatus($payload, $previous);

        if ($payload['ordonnance_status'] === 'pending') {
            $payload['booking_step'] = 'documents';
        } elseif (in_array($payload['ordonnance_status'], ['declined', 'uploaded', 'deferred'], true)
            && self::hasCoreBookingFields($payload)) {
            $payload['booking_step'] = 'recap';
        } elseif (self::hasCoreBookingFields($payload) && empty($payload['booking_step'])) {
            $payload['booking_step'] = 'recap';
        }

        if (self::pendingUploadSatisfied($payload)) {
            unset($payload['pending_upload_type']);
        }

        return $payload;
    }

    /**
     * @param array<string, mixed> $payload
     */
    public static function allowsRecap(array $payload): bool
    {
        if (!self::requiresOrdonnanceStep($payload)) {
            return true;
        }

        $status = (string) ($payload['ordonnance_status'] ?? 'pending');

        return in_array($status, ['declined', 'uploaded', 'not_required', 'deferred'], true);
    }

    /**
     * @param array<string, mixed> $payload
     */
    public static function requiresOrdonnanceStep(array $payload): bool
    {
        $type = (string) ($payload['type'] ?? '');

        return in_array($type, ['nursing', 'blood_test'], true);
    }

    /**
     * @param array<string, mixed> $payload
     */
    private static function hasCoreBookingFields(array $payload): bool
    {
        $scheduled = trim((string) ($payload['scheduled_at'] ?? ''));
        $category = trim((string) ($payload['category_id'] ?? ''));
        if ($scheduled === '' || $category === '') {
            return false;
        }

        if (!empty($payload['use_profile_address']) || !empty($payload['use_staff_practice_address'])) {
            return true;
        }

        $address = $payload['address'] ?? null;

        return is_array($address)
            && trim((string) ($address['label'] ?? '')) !== '';
    }

    /**
     * @param array<string, mixed> $payload
     * @param array<string, mixed>|null $previous
     */
    private static function resolveOrdonnanceStatus(array $payload, ?array $previous): string
    {
        if (self::hasOrdonnanceFile($payload)) {
            return 'uploaded';
        }

        $fromPatch = (string) ($payload['ordonnance_status'] ?? '');
        if (in_array($fromPatch, ['declined', 'uploaded', 'not_required', 'deferred'], true)) {
            return $fromPatch;
        }

        if (is_array($previous)) {
            $prev = (string) ($previous['ordonnance_status'] ?? '');
            if ($prev === 'uploaded' && self::hasOrdonnanceFile($payload)) {
                return 'uploaded';
            }
            if (in_array($prev, ['declined', 'uploaded', 'deferred'], true)) {
                return $prev;
            }
        }

        return 'pending';
    }

    /**
     * @param array<string, mixed> $payload
     */
    private static function hasOrdonnanceFile(array $payload): bool
    {
        $files = is_array($payload['files'] ?? null) ? $payload['files'] : [];
        if (!empty($files['ordonnance'])) {
            return true;
        }
        $formData = is_array($payload['form_data'] ?? null) ? $payload['form_data'] : [];
        $formFiles = is_array($formData['files'] ?? null) ? $formData['files'] : [];

        return !empty($formFiles['ordonnance']);
    }

    /**
     * @param array<string, mixed> $payload
     */
    private static function pendingUploadSatisfied(array $payload): bool
    {
        $pending = trim((string) ($payload['pending_upload_type'] ?? ''));
        if ($pending === '') {
            return false;
        }

        return self::hasFileOfType($payload, $pending);
    }

    /**
     * @param array<string, mixed> $payload
     */
    private static function hasFileOfType(array $payload, string $type): bool
    {
        $files = is_array($payload['files'] ?? null) ? $payload['files'] : [];
        if (!empty($files[$type])) {
            return true;
        }
        $formData = is_array($payload['form_data'] ?? null) ? $payload['form_data'] : [];
        $formFiles = is_array($formData['files'] ?? null) ? $formData['files'] : [];

        return !empty($formFiles[$type]);
    }
}

<?php

declare(strict_types=1);

/**
 * Étapes RDV Cary IA — ordonnance avant récap (aligné wizard mobile).
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

        $payload['ordonnance_status'] = self::resolveOrdonnanceStatus($payload, $userMessage, $previous);

        if ($payload['ordonnance_status'] === 'pending') {
            $payload['booking_step'] = 'documents';
        } elseif (self::hasCoreBookingFields($payload)) {
            $payload['booking_step'] = 'recap';
        }

        $payload = self::applyPendingUploadType($payload, $userMessage);
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

        return in_array($status, ['declined', 'uploaded', 'not_required'], true);
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

        if (!empty($payload['use_profile_address'])) {
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
    private static function resolveOrdonnanceStatus(array $payload, ?string $userMessage, ?array $previous): string
    {
        if (self::hasOrdonnanceFile($payload)) {
            return 'uploaded';
        }

        if ($userMessage !== null && self::userDeclinedOrdonnance($userMessage)) {
            return 'declined';
        }

        $fromPatch = (string) ($payload['ordonnance_status'] ?? '');
        if (in_array($fromPatch, ['declined', 'uploaded', 'not_required'], true)) {
            return $fromPatch;
        }

        if (is_array($previous)) {
            $prev = (string) ($previous['ordonnance_status'] ?? '');
            if ($prev === 'uploaded' && self::hasOrdonnanceFile($payload)) {
                return 'uploaded';
            }
            if (in_array($prev, ['declined', 'uploaded'], true)) {
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

    private static function userDeclinedOrdonnance(string $message): bool
    {
        $m = mb_strtolower(trim($message));
        if ($m === '') {
            return false;
        }

        $patterns = [
            '/^(non\b|no\b)/u',
            "/pas d['']ordonnance/u",
            '/pas\s+ordonnance/u',
            "/j['']ai pas/u",
            '/sans ordonnance/u',
            '/pas besoin.*ordonnance/u',
            '/pas d ordonnance/u',
        ];
        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $m)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param array<string, mixed> $payload
     */
    private static function applyPendingUploadType(array $payload, ?string $userMessage): array
    {
        $detected = self::detectDocumentUploadIntent($userMessage);
        if ($detected !== null) {
            $payload['pending_upload_type'] = $detected;
        }

        return $payload;
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

    private static function detectDocumentUploadIntent(?string $message): ?string
    {
        if ($message === null || trim($message) === '') {
            return null;
        }

        $m = mb_strtolower(trim($message));
        $wantsChange = preg_match('/modif|remplac|changer|mettre à jour|mettre a jour|nouveau|nouvelle|update/u', $m) === 1
            || preg_match('/voici (ma|mon|mes)/u', $m) === 1;

        if (preg_match('/carte[\s-]?vitale/u', $m)) {
            return 'carte_vitale';
        }
        if (preg_match('/mutuelle/u', $m)) {
            return 'carte_mutuelle';
        }
        if (preg_match('/autre(s)?\s+assurance|autres_assurances/u', $m)) {
            return 'autres_assurances';
        }
        if ($wantsChange && preg_match('/ordonnance/u', $m)) {
            return 'ordonnance';
        }

        return null;
    }
}

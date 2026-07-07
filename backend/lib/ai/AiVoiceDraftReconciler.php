<?php

declare(strict_types=1);

require_once __DIR__ . '/CaryBookingPromptRules.php';
require_once __DIR__ . '/AiBookingIdentityParser.php';
require_once __DIR__ . '/AiBookingWorkflow.php';
require_once __DIR__ . '/ContextComposer.php';
require_once __DIR__ . '/../../models/User.php';

/**
 * Réconciliation brouillon RDV après tour vocal (ordonnance, identité, patient staff).
 */
final class AiVoiceDraftReconciler
{
    /** @var list<string> */
    private const GARBAGE_NAMES = [
        'oui', 'non', 'ok', 'daccord', 'bien', 'merci', 'moi', 'je', 'valide', 'confirme',
        'confirmé', 'confirmez', 'bonjour', 'salut', 'hello', 'voila', 'voilà',
    ];

    /**
     * @param array<string, mixed> $payload
     * @param array<string, mixed> $user
     * @return array<string, mixed>
     */
    public static function buildPatch(array $payload, string $transcript, array $user): array
    {
        $patch = [];
        $text = trim($transcript);
        if ($text === '') {
            return [];
        }

        $patch = array_merge($patch, self::parseOrdonnanceIntent($text, $payload));
        $patch = array_merge($patch, self::parseStaffPatientHint($text, $user, $payload));
        $patch = array_merge($patch, self::sanitizeIdentityPatch($payload, $user));

        return $patch;
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    private static function parseOrdonnanceIntent(string $text, array $payload): array
    {
        if (!AiBookingWorkflow::requiresOrdonnanceStep($payload)) {
            return [];
        }

        $step = (string) ($payload['booking_step'] ?? '');
        $status = (string) ($payload['ordonnance_status'] ?? 'pending');
        if ($step === 'recap') {
            return [];
        }
        if (!in_array($step, ['documents', 'address', 'slot', 'services'], true)) {
            return [];
        }
        if (in_array($status, ['declined', 'uploaded', 'deferred'], true)) {
            return [];
        }

        $t = mb_strtolower(trim(preg_replace('/[.!?]+$/u', '', $text) ?? $text));

        if (preg_match('/\b(?:non|pas d[\']?ordonnance|sans ordonnance|j[\']?en ai pas|je n[\']?en ai pas)\b/u', $t)) {
            return [
                'ordonnance_status' => 'declined',
                'booking_step' => 'recap',
            ];
        }

        if (preg_match('/\b(?:au passage|remise au passage|sur place|je l[\']?aurai)\b/u', $t)) {
            return [
                'ordonnance_status' => 'deferred',
                'booking_step' => 'recap',
            ];
        }

        if ($step === 'documents'
            && preg_match('/\b(?:oui|j[\']?ai une ordonnance|j[\']?en ai une)\b/u', $t)
            && !preg_match('/\b(?:non|pas)\b/u', $t)) {
            return [
                'ordonnance_status' => 'pending',
                'booking_step' => 'documents',
            ];
        }

        return [];
    }

    /**
     * @param array<string, mixed> $payload
     * @param array<string, mixed> $user
     * @return array<string, mixed>
     */
    private static function parseStaffPatientHint(string $text, array $user, array $payload): array
    {
        if (!CaryBookingPromptRules::isStaffRole((string) ($user['role'] ?? ''))) {
            return [];
        }

        if (!empty($payload['patient_id']) && ($payload['patient_mode'] ?? '') === 'existing') {
            return [];
        }

        $search = mb_strtolower($text);
        $composer = new ContextComposer();
        $ctx = $composer->compose($user, null, 'utility', true);
        foreach (is_array($ctx['staff_patients'] ?? null) ? $ctx['staff_patients'] : [] as $patient) {
            if (!is_array($patient)) {
                continue;
            }
            $display = mb_strtolower(trim((string) ($patient['display_name'] ?? '')));
            if ($display === '') {
                continue;
            }
            if (!self::nameAppearsInText($display, $search)
                && !self::nameAppearsInText(
                    mb_strtolower(trim((string) ($patient['first_name'] ?? ''))),
                    $search,
                )) {
                continue;
            }

            return [
                'patient_mode' => 'existing',
                'patient_id' => (string) ($patient['id'] ?? ''),
                'booking_step' => $payload['booking_step'] ?? 'services',
            ];
        }

        return [];
    }

    private static function nameAppearsInText(string $displayName, string $text): bool
    {
        $parts = preg_split('/\s+/u', $displayName) ?: [];
        $significant = array_values(array_filter(
            $parts,
            static fn (string $p): bool => mb_strlen($p) >= 3,
        ));
        if ($significant === []) {
            return false;
        }

        $matched = 0;
        foreach ($significant as $part) {
            if (str_contains($text, $part)) {
                $matched++;
            }
        }

        return $matched >= min(2, count($significant));
    }

    private static function lastNamesMatch(string $a, string $b): bool
    {
        $a = mb_strtolower(trim(preg_replace('/\s+/u', '', $a) ?? $a));
        $b = mb_strtolower(trim(preg_replace('/\s+/u', '', $b) ?? $b));
        if ($a === '' || $b === '') {
            return false;
        }
        if ($a === $b || str_starts_with($a, $b) || str_starts_with($b, $a)) {
            return true;
        }

        return levenshtein($a, $b) <= 2;
    }

    /**
     * @param array<string, mixed> $payload
     * @param array<string, mixed> $user
     * @return array<string, mixed>
     */
    private static function sanitizeIdentityPatch(array $payload, array $user): array
    {
        $formData = is_array($payload['form_data'] ?? null) ? $payload['form_data'] : [];
        $firstName = trim((string) ($payload['first_name'] ?? $formData['first_name'] ?? ''));
        $lastName = trim((string) ($payload['last_name'] ?? $formData['last_name'] ?? ''));

        if (!self::isGarbageName($firstName) && !self::isGarbageName($lastName)) {
            return [];
        }

        $patientId = trim((string) ($payload['patient_id'] ?? ''));
        if ($patientId !== '' && ($payload['patient_mode'] ?? '') === 'existing') {
            $identity = self::loadPatientIdentity($patientId, $user);
            if ($identity !== []) {
                return $identity;
            }
        }

        if (self::isGarbageName($firstName) && !self::isGarbageName($lastName)) {
            return self::guessFirstNameFromStaffPatients($lastName, $user);
        }

        return [];
    }

    /**
     * @param array<string, mixed> $user
     * @return array<string, mixed>
     */
    private static function loadPatientIdentity(string $patientId, array $user): array
    {
        try {
            $profile = (new User())->getById(
                $patientId,
                (string) ($user['user_id'] ?? ''),
                (string) ($user['role'] ?? ''),
                'mobile',
            );
        } catch (Throwable) {
            return [];
        }

        if (!$profile) {
            return [];
        }

        $fn = trim((string) ($profile['first_name'] ?? ''));
        $ln = trim((string) ($profile['last_name'] ?? ''));
        if ($fn === '' && $ln === '') {
            return [];
        }

        return [
            'first_name' => $fn,
            'last_name' => $ln,
            'form_data' => array_filter([
                'first_name' => $fn,
                'last_name' => $ln,
                'email' => $profile['email'] ?? null,
                'phone' => $profile['phone'] ?? null,
            ], static fn ($v) => $v !== null && trim((string) $v) !== ''),
        ];
    }

    /**
     * @param array<string, mixed> $user
     * @return array<string, mixed>
     */
    private static function guessFirstNameFromStaffPatients(string $lastName, array $user): array
    {
        $composer = new ContextComposer();
        $ctx = $composer->compose($user, null, 'utility', true);
        foreach (is_array($ctx['staff_patients'] ?? null) ? $ctx['staff_patients'] : [] as $patient) {
            if (!is_array($patient)) {
                continue;
            }
            if (!self::lastNamesMatch($lastName, (string) ($patient['last_name'] ?? ''))) {
                continue;
            }
            $fn = trim((string) ($patient['first_name'] ?? ''));
            if ($fn === '') {
                continue;
            }

            return [
                'patient_mode' => 'existing',
                'patient_id' => (string) ($patient['id'] ?? ''),
                'first_name' => $fn,
                'last_name' => trim((string) ($patient['last_name'] ?? $lastName)),
                'form_data' => [
                    'first_name' => $fn,
                    'last_name' => trim((string) ($patient['last_name'] ?? $lastName)),
                ],
            ];
        }

        return [];
    }

    public static function isGarbageName(string $name): bool
    {
        $normalized = mb_strtolower(trim(preg_replace('/[.!?,;:]+$/u', '', trim($name)) ?? trim($name)));
        $normalized = preg_replace('/\s+/u', '', $normalized) ?? $normalized;

        return $normalized === '' || in_array($normalized, self::GARBAGE_NAMES, true);
    }

    public static function isConversationalReply(string $text): bool
    {
        $t = mb_strtolower(trim(preg_replace('/[.!?,;:]+$/u', '', trim($text)) ?? trim($text)));
        if ($t === '') {
            return true;
        }

        return (bool) preg_match(
            '/^(?:oui|non|ok|d[\']?accord|bien|merci|moi|valide|confirme|confirmez|c[\']?est bon|voil[\àa]|bonjour|salut)$/u',
            preg_replace('/\s+/u', ' ', $t) ?? $t,
        );
    }
}

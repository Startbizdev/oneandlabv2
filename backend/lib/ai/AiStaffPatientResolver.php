<?php

declare(strict_types=1);

require_once __DIR__ . '/CaryBookingPromptRules.php';
require_once __DIR__ . '/AiBookingIdentityParser.php';
require_once __DIR__ . '/../../models/User.php';
require_once __DIR__ . '/../PatientDossierAccess.php';
require_once __DIR__ . '/bootstrap.php';

/**
 * Résout patient existant depuis le patch Grok (pas de re-parse du message utilisateur).
 */
final class AiStaffPatientResolver
{
    private User $userModel;
    private ?PDO $db;

    public function __construct(?User $userModel = null, ?PDO $db = null)
    {
        $this->userModel = $userModel ?? new User();
        $this->db = $db;
    }

    /** Même règle que la fiche patient : le professionnel doit avoir accès au dossier. */
    public function staffCanUsePatient(string $patientId, array $user): bool
    {
        if ($patientId === '' || (string) ($user['user_id'] ?? '') === '') {
            return false;
        }

        return PatientDossierAccess::canAccess($this->db ??= ai_db(), $this->userModel, $user, $patientId);
    }

    /**
     * @param array<string, mixed> $payload
     * @param array<string, mixed> $user
     * @return array<string, mixed>
     */
    public function apply(array $payload, array $user): array
    {
        $role = (string) ($user['role'] ?? '');
        if (!CaryBookingPromptRules::isStaffRole($role)) {
            return AiBookingIdentityParser::sanitizeIdentityFields($payload);
        }

        $payload = AiBookingIdentityParser::sanitizeIdentityFields($payload);
        $payload = $this->resolveByEmail($payload, $user);
        $payload = $this->inferPatientMode($payload);

        return $payload;
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    private function inferPatientMode(array $payload): array
    {
        $mode = (string) ($payload['patient_mode'] ?? '');
        if ($mode !== '' && $mode !== 'self') {
            return $payload;
        }

        if (!empty($payload['patient_id'])) {
            $payload['patient_mode'] = 'existing';

            return $payload;
        }

        $form = is_array($payload['form_data'] ?? null) ? $payload['form_data'] : [];
        $hasName = trim((string) ($payload['first_name'] ?? $form['first_name'] ?? '')) !== ''
            || trim((string) ($payload['last_name'] ?? $form['last_name'] ?? '')) !== '';

        if ($hasName) {
            $payload['patient_mode'] = 'new';
        }

        return $payload;
    }

    /**
     * @param array<string, mixed> $payload
     * @param array<string, mixed> $user
     * @return array<string, mixed>
     */
    private function resolveByEmail(array $payload, array $user): array
    {
        $form = is_array($payload['form_data'] ?? null) ? $payload['form_data'] : [];
        $email = strtolower(trim((string) ($payload['email'] ?? $form['email'] ?? '')));
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $payload;
        }

        $existingId = $this->userModel->findPatientIdByEmailHash(hash('sha256', $email));
        if ($existingId === null) {
            return $payload;
        }

        if (!$this->staffCanUsePatient($existingId, $user)) {
            return $payload;
        }

        $payload['patient_mode'] = 'existing';
        $payload['patient_id'] = $existingId;
        $payload['booking_step'] = $payload['booking_step'] ?? 'services';

        return $payload;
    }
}

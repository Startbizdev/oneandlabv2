<?php

declare(strict_types=1);

require_once __DIR__ . '/CaryBookingPromptRules.php';
require_once __DIR__ . '/AiBookingIdentityParser.php';
require_once __DIR__ . '/../../models/User.php';

/**
 * Résout patient existant depuis le patch Grok (pas de re-parse du message utilisateur).
 */
final class AiStaffPatientResolver
{
    private User $userModel;

    public function __construct(?User $userModel = null)
    {
        $this->userModel = $userModel ?? new User();
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
        $payload = $this->resolveByEmail($payload, $user, $role);
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
    private function resolveByEmail(array $payload, array $user, string $role): array
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

        if (!$this->staffCanUsePatient($existingId, $user, $role)) {
            return $payload;
        }

        $payload['patient_mode'] = 'existing';
        $payload['patient_id'] = $existingId;
        $payload['booking_step'] = $payload['booking_step'] ?? 'services';

        return $payload;
    }

    private function staffCanUsePatient(string $patientId, array $user, string $role): bool
    {
        $staffId = (string) ($user['user_id'] ?? '');
        if ($staffId === '') {
            return false;
        }

        foreach ($this->listStaffPatients($user, $role) as $patient) {
            if ((string) ($patient['id'] ?? '') === $patientId) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param array<string, mixed> $user
     * @return list<array{id: string, display_name: string, first_name: ?string, last_name: ?string}>
     */
    private function listStaffPatients(array $user, string $role): array
    {
        $requesterId = (string) ($user['user_id'] ?? '');
        if ($requesterId === '') {
            return [];
        }

        $filters = ['role' => 'patient', 'created_by' => $requesterId];
        $out = [];
        $page = 1;
        do {
            $result = $this->userModel->getAll($filters, $page, 50, $requesterId, $role);
            foreach ($result['data'] ?? [] as $row) {
                if (empty($row['id'])) {
                    continue;
                }
                $fn = trim((string) ($row['first_name'] ?? ''));
                $ln = trim((string) ($row['last_name'] ?? ''));
                $out[] = [
                    'id' => (string) $row['id'],
                    'first_name' => $fn !== '' ? $fn : null,
                    'last_name' => $ln !== '' ? $ln : null,
                    'display_name' => trim($fn . ' ' . $ln) ?: 'Patient',
                ];
                if (count($out) >= 20) {
                    break 2;
                }
            }
            $pages = (int) ($result['pages'] ?? 1);
            $page++;
        } while ($page <= $pages && $page <= 4);

        return $out;
    }
}

<?php

declare(strict_types=1);

require_once __DIR__ . '/AiBookingService.php';
require_once __DIR__ . '/AiAddressFromMessageResolver.php';
require_once __DIR__ . '/ContextComposer.php';
require_once __DIR__ . '/../GoogleAddressSearch.php';
require_once __DIR__ . '/../../models/User.php';

/**
 * Exécute les tools Grok côté serveur (persistance + infra déterministe).
 */
final class AiBookingToolExecutor
{
    private AiBookingService $booking;
    private ContextComposer $contextComposer;
    private User $userModel;
    private AiAddressFromMessageResolver $addressResolver;

    /** @var array<string, mixed>|null */
    private ?array $draft = null;

    private string $conversationId;

    /** @var array<string, mixed> */
    private array $user;

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed>|null $currentDraft
     */
    public function __construct(
        array $user,
        string $conversationId,
        ?array $currentDraft,
        ?AiBookingService $booking = null,
    ) {
        $this->user = $user;
        $this->conversationId = $conversationId;
        $this->draft = $currentDraft;
        $this->booking = $booking ?? new AiBookingService();
        $this->contextComposer = new ContextComposer();
        $this->userModel = new User();
        $this->addressResolver = new AiAddressFromMessageResolver();
    }

    /**
     * @return array{draft: ?array<string, mixed>, result: array<string, mixed>}
     */
    public function execute(string $name, array $arguments): array
    {
        return match ($name) {
            'update_booking_draft' => $this->updateDraft($arguments),
            'geocode_address' => $this->geocodeAddress($arguments),
            'list_care_categories' => ['draft' => $this->draft, 'result' => $this->listCareCategories($arguments)],
            'list_staff_patients' => ['draft' => $this->draft, 'result' => $this->listStaffPatients()],
            'resolve_staff_patient' => $this->resolveStaffPatient($arguments),
            default => ['draft' => $this->draft, 'result' => ['error' => 'Tool inconnu: ' . $name]],
        };
    }

    /**
     * @return array<string, mixed>|null
     */
    public function getDraft(): ?array
    {
        return $this->draft;
    }

    /**
     * @param array<string, mixed> $arguments
     * @return array{draft: ?array<string, mixed>, result: array<string, mixed>}
     */
    private function updateDraft(array $arguments): array
    {
        $patch = $arguments['patch'] ?? $arguments;
        if (!is_array($patch)) {
            return ['draft' => $this->draft, 'result' => ['ok' => false, 'error' => 'patch invalide']];
        }

        $draftId = is_array($this->draft) ? (string) ($this->draft['id'] ?? '') : '';
        if ($draftId !== '') {
            $updated = $this->booking->patchDraft($draftId, $this->user, $patch, null);
        } else {
            $updated = $this->booking->createDraft($this->user, [
                'conversation_id' => $this->conversationId,
                'payload' => $patch,
                'user_message' => null,
            ]);
        }

        $this->draft = $updated;
        $payload = is_array($updated['payload'] ?? null) ? $updated['payload'] : [];

        return [
            'draft' => $this->draft,
            'result' => [
                'ok' => true,
                'draft_id' => (string) ($updated['id'] ?? ''),
                'status' => $updated['status'] ?? null,
                'missing_fields' => $updated['missing_fields'] ?? [],
                'booking_step' => $payload['booking_step'] ?? null,
            ],
        ];
    }

    /**
     * @param array<string, mixed> $arguments
     * @return array{draft: ?array<string, mixed>, result: array<string, mixed>}
     */
    private function geocodeAddress(array $arguments): array
    {
        $query = trim((string) ($arguments['query'] ?? ''));
        if ($query === '') {
            return ['draft' => $this->draft, 'result' => ['ok' => false, 'error' => 'query vide']];
        }

        try {
            $search = new GoogleAddressSearch();
            $rows = $search->search($query, 1);
            $row = $rows[0] ?? null;
            if ($row === null) {
                return ['draft' => $this->draft, 'result' => ['ok' => false, 'error' => 'Adresse introuvable']];
            }

            $patch = [
                'address' => [
                    'label' => (string) ($row['label'] ?? $query),
                    'lat' => (float) ($row['lat'] ?? 0),
                    'lng' => (float) ($row['lng'] ?? 0),
                    'city' => ($row['city'] ?? '') !== '' ? (string) $row['city'] : null,
                    'postal_code' => ($row['postcode'] ?? '') !== '' ? (string) $row['postcode'] : null,
                ],
                'use_profile_address' => false,
                'use_staff_practice_address' => false,
                'booking_step' => 'address',
            ];

            return $this->updateDraft(['patch' => $patch]);
        } catch (Throwable $e) {
            return ['draft' => $this->draft, 'result' => ['ok' => false, 'error' => $e->getMessage()]];
        }
    }

    /**
     * @param array<string, mixed> $arguments
     * @return array<string, mixed>
     */
    private function listCareCategories(array $arguments): array
    {
        $ctx = $this->contextComposer->compose($this->user, null, 'utility', true);
        $cats = is_array($ctx['care_categories'] ?? null) ? $ctx['care_categories'] : [];
        $filter = (string) ($arguments['type'] ?? 'all');
        if ($filter !== 'all') {
            $cats = array_values(array_filter($cats, static fn ($c) => is_array($c) && ($c['type'] ?? '') === $filter));
        }

        return ['categories' => array_slice($cats, 0, 40)];
    }

    /**
     * @return array<string, mixed>
     */
    private function listStaffPatients(): array
    {
        $ctx = $this->contextComposer->compose($this->user, null, 'utility', true);
        $patients = is_array($ctx['staff_patients'] ?? null) ? $ctx['staff_patients'] : [];

        return ['patients' => array_slice($patients, 0, 25)];
    }

    /**
     * @param array<string, mixed> $arguments
     * @return array{draft: ?array<string, mixed>, result: array<string, mixed>}
     */
    private function resolveStaffPatient(array $arguments): array
    {
        $patientId = trim((string) ($arguments['patient_id'] ?? ''));
        if ($patientId !== '') {
            return $this->updateDraft([
                'patch' => [
                    'patient_mode' => 'existing',
                    'patient_id' => $patientId,
                    'booking_step' => 'services',
                ],
            ]);
        }

        $search = mb_strtolower(trim((string) ($arguments['search_name'] ?? '')));
        $ctx = $this->contextComposer->compose($this->user, null, 'utility', true);
        foreach (is_array($ctx['staff_patients'] ?? null) ? $ctx['staff_patients'] : [] as $patient) {
            if (!is_array($patient)) {
                continue;
            }
            $display = mb_strtolower((string) ($patient['display_name'] ?? ''));
            if ($search !== '' && $display !== '' && str_contains($display, $search)) {
                return $this->updateDraft([
                    'patch' => [
                        'patient_mode' => 'existing',
                        'patient_id' => (string) ($patient['id'] ?? ''),
                        'booking_step' => 'services',
                    ],
                ]);
            }
        }

        return ['draft' => $this->draft, 'result' => ['ok' => false, 'error' => 'Patient non trouvé']];
    }
}

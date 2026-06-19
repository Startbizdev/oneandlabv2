<?php

declare(strict_types=1);

require_once __DIR__ . '/../PatientDossierAccess.php';
require_once __DIR__ . '/../Uuid.php';
require_once __DIR__ . '/UnifiedRdvValidator.php';
require_once __DIR__ . '/AiDraftPayloadEnricher.php';
require_once __DIR__ . '/AiBookingPayloadBuilder.php';
require_once __DIR__ . '/AiBookingWorkflow.php';
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/../../models/Appointment.php';
require_once __DIR__ . '/../../models/User.php';
require_once __DIR__ . '/../Logger.php';
require_once __DIR__ . '/../MedicalDocumentsInternal.php';

final class AiBookingService
{
    private PDO $db;
    private User $userModel;
    private Appointment $appointmentModel;
    private AiDraftPayloadEnricher $enricher;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? ai_db();
        $this->userModel = new User();
        $this->appointmentModel = new Appointment();
        $this->enricher = new AiDraftPayloadEnricher($this->db, $this->userModel);
    }

    /**
     * @param array<string, mixed> $input
     */
    public function createDraft(array $user, array $input): array
    {
        $id = Uuid::v4();
        $role = (string) ($user['role'] ?? '');
        $payload = is_array($input['payload'] ?? null) ? $input['payload'] : [];
        if ($role === 'patient') {
            $payload['patient_mode'] = $payload['patient_mode'] ?? 'self';
            $payload['patient_id'] = $user['user_id'];
        }
        $payload = $this->enricher->enrich($payload, $user);
        $userMessage = isset($input['user_message']) ? trim((string) $input['user_message']) : null;
        if ($userMessage === '') {
            $userMessage = null;
        }
        $payload = AiBookingWorkflow::apply($payload, $userMessage, null);
        $expires = (new DateTimeImmutable('now'))->modify('+24 hours')->format('Y-m-d H:i:s');
        $validation = UnifiedRdvValidator::validateDraft($payload, $role, true);
        $status = ($validation['valid'] && AiBookingWorkflow::allowsRecap($payload)) ? 'ready' : 'collecting';

        $stmt = $this->db->prepare('
            INSERT INTO ai_appointment_drafts
                (id, user_id, patient_id, conversation_id, status, payload_json, missing_fields_json, created_by_role, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ');
        $convId = isset($input['conversation_id']) ? trim((string) $input['conversation_id']) : null;
        $patientId = isset($payload['patient_id']) ? (string) $payload['patient_id'] : null;
        $stmt->execute([
            $id,
            $user['user_id'],
            $patientId,
            $convId ?: null,
            $status,
            json_encode($payload),
            json_encode($validation['missing']),
            $role,
            $expires,
        ]);
        $this->audit($id, 'create', (string) $user['user_id'], null, null);

        return $this->getDraft($id, (string) $user['user_id']) ?? [];
    }

    public function getDraft(string $id, string $userId): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM ai_appointment_drafts WHERE id = ? AND user_id = ? LIMIT 1');
        $stmt->execute([$id, $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? $this->mapDraft($row) : null;
    }

    public function getLatestDraftForConversation(string $conversationId, string $userId): ?array
    {
        $stmt = $this->db->prepare('
            SELECT id FROM ai_appointment_drafts
            WHERE conversation_id = ? AND user_id = ?
              AND status IN (\'collecting\', \'ready\')
            ORDER BY updated_at DESC
            LIMIT 1
        ');
        $stmt->execute([$conversationId, $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row || empty($row['id'])) {
            return null;
        }

        return $this->getDraft((string) $row['id'], $userId);
    }

    /**
     * @param array<string, mixed> $patch
     */
    public function patchDraft(string $id, array $user, array $patch, ?string $userMessage = null): ?array
    {
        $draft = $this->getDraft($id, (string) $user['user_id']);
        if (!$draft || in_array($draft['status'], ['confirmed', 'cancelled', 'expired'], true)) {
            return null;
        }
        $previousPayload = is_array($draft['payload'] ?? null) ? $draft['payload'] : null;
        $payload = array_merge($draft['payload'] ?? [], $patch);
        if (isset($patch['files']) && is_array($patch['files'])) {
            $existingFiles = is_array($draft['payload']['files'] ?? null) ? $draft['payload']['files'] : [];
            $payload['files'] = array_merge($existingFiles, $patch['files']);
        }
        if (isset($patch['form_data']) && is_array($patch['form_data'])) {
            $existingForm = is_array($draft['payload']['form_data'] ?? null) ? $draft['payload']['form_data'] : [];
            $mergedForm = array_merge($existingForm, $patch['form_data']);
            if (isset($patch['form_data']['files']) && is_array($patch['form_data']['files'])) {
                $existingFormFiles = is_array($existingForm['files'] ?? null) ? $existingForm['files'] : [];
                $mergedForm['files'] = array_merge($existingFormFiles, $patch['form_data']['files']);
            }
            $payload['form_data'] = $mergedForm;
        }
        $role = (string) ($user['role'] ?? '');
        if ($role === 'patient') {
            $payload['patient_id'] = $user['user_id'];
        }
        $payload = $this->enricher->enrich($payload, $user);
        if ($userMessage !== null && trim($userMessage) === '') {
            $userMessage = null;
        }
        $payload = AiBookingWorkflow::apply($payload, $userMessage, $previousPayload);
        $validation = UnifiedRdvValidator::validateDraft($payload, $role, true);
        $status = ($validation['valid'] && AiBookingWorkflow::allowsRecap($payload)) ? 'ready' : 'collecting';

        $this->db->prepare('
            UPDATE ai_appointment_drafts
            SET payload_json = ?, missing_fields_json = ?, status = ?, updated_at = NOW()
            WHERE id = ? AND user_id = ?
        ')->execute([
            json_encode($payload),
            json_encode($validation['missing']),
            $status,
            $id,
            $user['user_id'],
        ]);
        $this->audit($id, 'patch', (string) $user['user_id'], null, null);

        return $this->getDraft($id, (string) $user['user_id']);
    }

    /**
     * @param array<string, mixed> $finalPatch
     * @return array{appointment_id: string, draft: array<string, mixed>}
     */
    public function confirmDraft(string $id, array $user, array $finalPatch = []): array
    {
        $draft = $this->getDraft($id, (string) $user['user_id']);
        if (!$draft) {
            throw new RuntimeException('Brouillon introuvable');
        }
        if ($draft['status'] === 'confirmed') {
            throw new RuntimeException('Brouillon déjà confirmé');
        }
        if ($draft['status'] !== 'ready') {
            throw new RuntimeException('Complétez le récapitulatif avant de valider');
        }
        if (strtotime((string) $draft['expires_at']) < time()) {
            $this->db->prepare('UPDATE ai_appointment_drafts SET status = ? WHERE id = ?')->execute(['expired', $id]);
            throw new RuntimeException('Brouillon expiré');
        }

        $payload = array_merge($draft['payload'] ?? [], $finalPatch);
        $role = (string) ($user['role'] ?? '');

        if (in_array($role, ['pro', 'nurse'], true) && ($payload['patient_mode'] ?? '') === 'new') {
            $payload['patient_id'] = $this->createPatientFromPayload($user, $payload);
        } elseif ($role === 'patient') {
            $payload['patient_id'] = $user['user_id'];
        }

        $payload = $this->enricher->enrich($payload, $user);

        $validation = UnifiedRdvValidator::validateDraft($payload, $role, true);
        if (!$validation['valid']) {
            throw new RuntimeException($validation['error'] ?? 'Brouillon incomplet');
        }

        $appointmentInputs = AiBookingPayloadBuilder::buildFromDraft($payload, $user, $role);
        $appointmentIds = [];
        $batchId = count($appointmentInputs) > 1 ? Uuid::v4() : null;

        foreach ($appointmentInputs as $index => $appointmentInput) {
            if ($batchId !== null) {
                $appointmentInput['creation_batch_id'] = $batchId;
                $appointmentInput['creation_batch_size'] = count($appointmentInputs);
            }
            $appointmentId = $this->appointmentModel->create($appointmentInput, (string) $user['user_id'], $role);
            $appointmentIds[] = $appointmentId;
            if ($index === 0) {
                $this->attachDraftDocuments($appointmentId, $payload, $user);
            }
            try {
                $this->appointmentModel->runPostCreateNotifications($appointmentId, $appointmentInput, $role);
            } catch (Throwable $e) {
                error_log('ai_booking runPostCreateNotifications: ' . $e->getMessage());
            }
        }

        $appointmentId = $appointmentIds[0] ?? '';

        if (in_array($role, ['pro', 'nurse'], true) && !empty($payload['patient_id'])) {
            try {
                $this->userModel->linkPatientProfessional((string) $payload['patient_id'], (string) $user['user_id'], $appointmentId, 'appointment_linked');
            } catch (Throwable $e) {
                error_log('ai_booking linkPatientProfessional: ' . $e->getMessage());
            }
        }

        $this->db->prepare('
            UPDATE ai_appointment_drafts
            SET status = ?, appointment_id = ?, patient_id = ?, payload_json = ?, updated_at = NOW()
            WHERE id = ?
        ')->execute([
            'confirmed',
            $appointmentId,
            $payload['patient_id'] ?? null,
            json_encode($payload),
            $id,
        ]);
        $this->audit($id, 'confirm', (string) $user['user_id'], $appointmentId, null);

        return [
            'appointment_id' => $appointmentId,
            'appointment_ids' => $appointmentIds,
            'draft' => $this->getDraft($id, (string) $user['user_id']) ?? [],
        ];
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function createPatientFromPayload(array $user, array $payload): string
    {
        $form = is_array($payload['form_data'] ?? null) ? $payload['form_data'] : [];
        $email = trim((string) ($payload['email'] ?? $form['email'] ?? ''));
        if ($email !== '') {
            $dupHash = hash('sha256', strtolower($email));
            $existingId = $this->userModel->findPatientIdByEmailHash($dupHash);
            if ($existingId !== null) {
                throw new RuntimeException('Un patient existe déjà avec cet email', 409);
            }
        }

        return $this->userModel->create([
            'email' => $email,
            'first_name' => (string) ($payload['first_name'] ?? $form['first_name'] ?? ''),
            'last_name' => (string) ($payload['last_name'] ?? $form['last_name'] ?? ''),
            'phone' => (string) ($payload['phone'] ?? $form['phone'] ?? ''),
            'birth_date' => $payload['birth_date'] ?? $form['birth_date'] ?? null,
            'gender' => $payload['gender'] ?? $form['gender'] ?? null,
            'address' => $payload['address'] ?? $form['address'] ?? null,
            'role' => 'patient',
            'created_by' => $user['user_id'],
        ], (string) $user['user_id'], (string) $user['role']);
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    private function buildAppointmentPayload(array $payload, array $user): array
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
     */
    private function attachDraftDocuments(string $appointmentId, array $payload, array $user): void
    {
        $files = is_array($payload['files'] ?? null) ? $payload['files'] : [];
        $formFiles = is_array($payload['form_data']['files'] ?? null) ? $payload['form_data']['files'] : [];
        $merged = array_merge($formFiles, $files);
        if ($merged === []) {
            return;
        }

        $logger = new Logger();
        $patientUserId = (string) ($payload['patient_id'] ?? $user['user_id']);

        foreach ($merged as $field => $entry) {
            if (!is_array($entry)) {
                continue;
            }
            $medId = $entry['medical_document_id'] ?? null;
            if (!is_string($medId) || $medId === '') {
                continue;
            }
            $docType = is_string($entry['field'] ?? null) ? $entry['field'] : (string) $field;
            try {
                MedicalDocumentsInternal::copyDocumentToAppointmentAsPatient(
                    $this->db,
                    $logger,
                    $patientUserId,
                    $medId,
                    $appointmentId,
                    $docType,
                );
            } catch (Throwable $e) {
                error_log('ai_booking attachDraftDocuments: ' . $e->getMessage());
            }
        }
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private function mapDraft(array $row): array
    {
        $payload = json_decode((string) ($row['payload_json'] ?? '{}'), true);
        $missing = json_decode((string) ($row['missing_fields_json'] ?? '[]'), true);
        $payloadArr = is_array($payload) ? $payload : [];
        $recapPayload = $this->enricher->prepareRecapPayload($payloadArr);
        $recap = AiDraftPayloadEnricher::buildRecap($recapPayload);
        $recap['care_option_lines'] = $this->enricher->formatCareOptionLines($recapPayload);

        return [
            'id' => (string) $row['id'],
            'user_id' => (string) $row['user_id'],
            'patient_id' => $row['patient_id'] ?? null,
            'conversation_id' => $row['conversation_id'] ?? null,
            'status' => $row['status'],
            'payload' => $payloadArr,
            'missing_fields' => is_array($missing) ? $missing : [],
            'created_by_role' => $row['created_by_role'],
            'appointment_id' => $row['appointment_id'] ?? null,
            'expires_at' => $row['expires_at'],
            'recap' => $recap,
            'created_at' => $row['created_at'] ?? null,
            'updated_at' => $row['updated_at'] ?? null,
        ];
    }

    private function audit(string $draftId, string $action, string $userId, ?string $appointmentId, ?string $aiAuditId): void
    {
        $this->db->prepare('
            INSERT INTO ai_booking_audits (id, draft_id, action, user_id, appointment_id, ai_audit_id)
            VALUES (?, ?, ?, ?, ?, ?)
        ')->execute([Uuid::v4(), $draftId, $action, $userId, $appointmentId, $aiAuditId]);
    }
}

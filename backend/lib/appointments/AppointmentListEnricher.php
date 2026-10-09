<?php

declare(strict_types=1);

require_once __DIR__ . '/../../models/User.php';
require_once __DIR__ . '/../AppointmentOfferSnooze.php';
require_once __DIR__ . '/../nurse-collaboration/NurseCollaboration.php';

final class AppointmentListEnricher
{
    /**
     * @param array<int, array<string, mixed>> $appointments
     * @param array<string, mixed> $user
     * @return array<int, array<string, mixed>>
     */
    public function enrich(
        PDO $db,
        Appointment $appointmentModel,
        array $appointments,
        array $user,
        string $effectiveUserId,
        bool $lightListPayload,
        bool $hasMergedColumn,
    ): array {
        if ($appointments === []) {
            return [];
        }

        $decryptedAppointments = [];
        foreach ($appointments as $appointment) {
            try {
                $decrypted = $appointmentModel->decryptRowForList($appointment, $user['user_id'], $user['role']);
                $decryptedAppointments[] = self::trimAppointmentPayloadForList($decrypted);
            } catch (Exception $e) {
                error_log('Erreur déchiffrement RDV ' . ($appointment['id'] ?? '') . ': ' . $e->getMessage());
                $decryptedAppointments[] = [
                    'id' => $appointment['id'],
                    'type' => $appointment['type'],
                    'status' => $appointment['status'],
                    'scheduled_at' => $appointment['scheduled_at'],
                    'address' => null,
                    'form_data' => [],
                    'error' => 'Erreur de déchiffrement',
                ];
            }
        }

        if (($user['role'] ?? '') === 'nurse') {
            $decryptedAppointments = NurseCollaboration::withCoNurses($db, $decryptedAppointments, (string) $user['user_id']);
        }

        if ($lightListPayload) {
            return $decryptedAppointments;
        }

        $this->applyUserDisplayEnrichment($decryptedAppointments);
        $appointmentModel->enrichListAssigneeReviewStats($decryptedAppointments);

        $listRole = (string) ($user['role'] ?? '');
        if (in_array($listRole, ['nurse', 'lab', 'subaccount', 'preleveur'], true)) {
            AppointmentOfferSnooze::enrichListWithSnooze($db, $decryptedAppointments, $effectiveUserId);
        }

        $this->enrichBloodTestItems($db, $appointmentModel, $decryptedAppointments, $hasMergedColumn);
        $this->enrichNursingItems($db, $appointmentModel, $decryptedAppointments, $hasMergedColumn);

        return $decryptedAppointments;
    }

    /**
     * @param array<int, array<string, mixed>> $rows
     */
    private function applyUserDisplayEnrichment(array &$decryptedAppointments): void
    {
        $userIds = [];
        foreach ($decryptedAppointments as $apt) {
            if (!empty($apt['assigned_lab_id'])) {
                $userIds[] = $apt['assigned_lab_id'];
            }
            if (!empty($apt['assigned_nurse_id'])) {
                $userIds[] = $apt['assigned_nurse_id'];
            }
            if (!empty($apt['assigned_to'])) {
                $userIds[] = $apt['assigned_to'];
            }
            if (!empty($apt['patient_id'])) {
                $userIds[] = $apt['patient_id'];
            }
        }
        if ($userIds === []) {
            return;
        }

        $userModel = new User();
        $displayNames = $userModel->getDisplayNamesByIds($userIds);
        $profileImages = $userModel->getProfileImageUrlsByIds($userIds);
        $genders = $userModel->getGendersByIds($userIds);
        foreach ($decryptedAppointments as &$apt) {
            $labId = $apt['assigned_lab_id'] ?? '';
            $nurseId = $apt['assigned_nurse_id'] ?? '';
            $toId = $apt['assigned_to'] ?? '';
            $patientId = $apt['patient_id'] ?? '';
            $apt['assigned_lab_display_name'] = $displayNames[$labId] ?? null;
            $apt['assigned_nurse_display_name'] = $displayNames[$nurseId] ?? null;
            $apt['assigned_to_display_name'] = $displayNames[$toId] ?? null;
            $apt['assigned_lab_profile_image_url'] = $profileImages[$labId] ?? null;
            $apt['assigned_nurse_profile_image_url'] = $profileImages[$nurseId] ?? null;
            $apt['assigned_to_profile_image_url'] = $profileImages[$toId] ?? null;
            $apt['beneficiary_profile_image_url'] = $profileImages[$patientId] ?? null;
            $apt['assigned_lab_gender'] = $genders[$labId] ?? null;
            $apt['assigned_nurse_gender'] = $genders[$nurseId] ?? null;
            $apt['assigned_to_gender'] = $genders[$toId] ?? null;
            $fdGender = null;
            if (!empty($apt['form_data']) && is_array($apt['form_data'])) {
                $fg = $apt['form_data']['gender'] ?? $apt['form_data']['beneficiary_gender'] ?? null;
                if (is_string($fg) && trim($fg) !== '') {
                    $fdGender = strtolower(trim($fg));
                }
            }
            $apt['beneficiary_gender'] = $fdGender ?: ($genders[$patientId] ?? null);
        }
        unset($apt);
    }

    /**
     * @param array<int, array<string, mixed>> $decryptedAppointments
     */
    private function enrichBloodTestItems(
        PDO $db,
        Appointment $appointmentModel,
        array &$decryptedAppointments,
        bool $hasMergedColumn,
    ): void {
        $bloodTestIds = array_values(array_filter(array_map(
            static fn($apt) => (($apt['type'] ?? '') === 'blood_test') ? (string) ($apt['id'] ?? '') : '',
            $decryptedAppointments
        )));
        if ($bloodTestIds === []) {
            return;
        }

        $itemsByAppointment = $appointmentModel->loadBloodTestItemsForAppointments($bloodTestIds);
        $bloodBatchMergedFilter = $hasMergedColumn ? ' AND merged_into_appointment_id IS NULL' : '';
        $bloodBatchIdsCache = [];
        $bloodBatchStmt = $db->prepare('
                SELECT id FROM appointments
                WHERE creation_batch_id = ?
                  AND patient_id = ?
                  AND type = \'blood_test\'
                  ' . $bloodBatchMergedFilter . '
                ORDER BY scheduled_at ASC, created_at ASC, id ASC
            ');
        foreach ($decryptedAppointments as &$apt) {
            if (($apt['type'] ?? '') !== 'blood_test') {
                continue;
            }
            $tid = (string) ($apt['id'] ?? '');
            $pre = $tid !== '' ? ($itemsByAppointment[$tid] ?? []) : [];
            $apt['blood_test_items'] = $appointmentModel->resolveBloodTestItemsForAppointment($apt, $pre);
            $bid = $apt['creation_batch_id'] ?? null;
            $apt['blood_test_items_display'] = $apt['blood_test_items'];
            if (!empty($bid) && !empty($apt['patient_id'])) {
                try {
                    $batchKey = (string) $bid . '|' . (string) $apt['patient_id'];
                    if (!array_key_exists($batchKey, $bloodBatchIdsCache)) {
                        $bloodBatchStmt->execute([(string) $bid, (string) $apt['patient_id']]);
                        $bloodBatchIdsCache[$batchKey] = array_column(
                            $bloodBatchStmt->fetchAll(PDO::FETCH_ASSOC),
                            'id'
                        );
                    }
                    $batchIds = $bloodBatchIdsCache[$batchKey];
                    if (count($batchIds) > 1) {
                        $mergedDisp = $appointmentModel->mergeBloodTestItemsAcrossBatchAppointmentIds($batchIds);
                        if (!empty($mergedDisp)) {
                            $apt['blood_test_items_display'] = $mergedDisp;
                        }
                    }
                } catch (Throwable $e) {
                    error_log('liste RDV blood_test_items_display batch: ' . $e->getMessage());
                }
            }
        }
        unset($apt);
    }

    /**
     * @param array<int, array<string, mixed>> $decryptedAppointments
     */
    private function enrichNursingItems(
        PDO $db,
        Appointment $appointmentModel,
        array &$decryptedAppointments,
        bool $hasMergedColumn,
    ): void {
        $nursingIds = array_values(array_filter(array_map(
            static fn($apt) => (($apt['type'] ?? '') === 'nursing') ? (string) ($apt['id'] ?? '') : '',
            $decryptedAppointments
        )));
        if ($nursingIds === []) {
            return;
        }

        $nursingByAppointment = $appointmentModel->loadNursingItemsForAppointments($nursingIds);
        $nursingBatchMergedFilter = $hasMergedColumn ? ' AND merged_into_appointment_id IS NULL' : '';
        $nursingBatchIdsCache = [];
        $nursingBatchStmt = $db->prepare('
                SELECT id FROM appointments
                WHERE creation_batch_id = ?
                  AND patient_id = ?
                  AND type = \'nursing\'
                  ' . $nursingBatchMergedFilter . '
                ORDER BY scheduled_at ASC, created_at ASC, id ASC
            ');
        foreach ($decryptedAppointments as &$apt) {
            if (($apt['type'] ?? '') !== 'nursing') {
                continue;
            }
            $tid = (string) ($apt['id'] ?? '');
            $pre = $tid !== '' ? ($nursingByAppointment[$tid] ?? []) : [];
            $apt['nursing_items'] = $appointmentModel->resolveNursingItemsForAppointment($apt, $pre);
            $bid = $apt['creation_batch_id'] ?? null;
            $apt['nursing_items_display'] = $apt['nursing_items'];
            if (!empty($bid) && !empty($apt['patient_id'])) {
                try {
                    $batchKey = (string) $bid . '|' . (string) $apt['patient_id'];
                    if (!array_key_exists($batchKey, $nursingBatchIdsCache)) {
                        $nursingBatchStmt->execute([(string) $bid, (string) $apt['patient_id']]);
                        $nursingBatchIdsCache[$batchKey] = array_column(
                            $nursingBatchStmt->fetchAll(PDO::FETCH_ASSOC),
                            'id'
                        );
                    }
                    $batchIds = $nursingBatchIdsCache[$batchKey];
                    if (count($batchIds) > 1) {
                        $mergedDisp = $appointmentModel->mergeNursingItemsAcrossBatchAppointmentIds($batchIds);
                        if (!empty($mergedDisp)) {
                            $apt['nursing_items_display'] = $mergedDisp;
                        }
                    }
                } catch (Throwable $e) {
                    error_log('liste RDV nursing_items_display batch: ' . $e->getMessage());
                }
            }
        }
        unset($apt);
    }

    /** @param array<string, mixed> $appointment */
    public static function trimAppointmentPayloadForList(array $appointment): array
    {
        if (!empty($appointment['form_data']) && is_array($appointment['form_data'])) {
            $fd = $appointment['form_data'];
            $keep = [
                'first_name', 'last_name', 'gender', 'beneficiary_gender', 'birth_date',
                'email', 'phone', 'address', 'address_label', 'address_complement', 'availability',
                'availability_start', 'availability_end', 'availability_type',
            ];
            $trimmed = [];
            foreach ($keep as $key) {
                if (array_key_exists($key, $fd)) {
                    $trimmed[$key] = $fd[$key];
                }
            }
            $appointment['form_data'] = $trimmed;
        }
        foreach (array_keys($appointment) as $key) {
            if (is_string($key) && (str_ends_with($key, '_encrypted') || str_ends_with($key, '_dek'))) {
                unset($appointment[$key]);
            }
        }

        return $appointment;
    }
}

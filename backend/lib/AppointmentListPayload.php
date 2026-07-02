<?php

declare(strict_types=1);

require_once __DIR__ . '/../models/Appointment.php';
require_once __DIR__ . '/../models/User.php';

/**
 * Payload liste RDV mobile / web — déchiffrement + champs cartes (créneau, soins, assignés).
 */
final class AppointmentListPayload
{
    /** Allège le payload liste (form_data complet × centaines de RDV → OOM PHP-FPM 128M). */
    public static function trimForList(array $appointment): array
    {
        if (!empty($appointment['form_data']) && is_array($appointment['form_data'])) {
            $fd = $appointment['form_data'];
            $keep = [
                'first_name', 'last_name', 'gender', 'beneficiary_gender', 'birth_date',
                'email', 'phone', 'address', 'address_label', 'address_complement', 'availability',
                'availability_start', 'availability_end', 'availability_type',
                'duration_days', 'custom_days', 'frequency', 'blood_test_type', 'care_options',
                'passage_time_slot', 'passage_duration_minutes', 'passage_source', 'custom_time', 'at_home',
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

    /**
     * @param list<array<string, mixed>> $rows
     * @return list<array<string, mixed>>
     */
    public static function decryptRowsForList(
        Appointment $appointmentModel,
        array $rows,
        string $requesterId,
        string $requesterRole
    ): array {
        $decryptedAppointments = [];
        foreach ($rows as $appointment) {
            try {
                $decrypted = $appointmentModel->decryptRowForList($appointment, $requesterId, $requesterRole);
                $decryptedAppointments[] = self::trimForList($decrypted);
            } catch (Throwable $e) {
                error_log('Erreur déchiffrement RDV ' . ($appointment['id'] ?? '') . ': ' . $e->getMessage());
                $decryptedAppointments[] = [
                    'id' => $appointment['id'] ?? null,
                    'type' => $appointment['type'] ?? null,
                    'status' => $appointment['status'] ?? null,
                    'scheduled_at' => $appointment['scheduled_at'] ?? null,
                    'address' => null,
                    'form_data' => [],
                    'error' => 'Erreur de déchiffrement',
                ];
            }
        }

        return $decryptedAppointments;
    }

    /**
     * @param list<array<string, mixed>> $decryptedAppointments
     * @return list<array<string, mixed>>
     */
    public static function enrichForListCards(
        PDO $db,
        Appointment $appointmentModel,
        array $decryptedAppointments,
        bool $hasMergedColumn
    ): array {
        if ($decryptedAppointments === []) {
            return [];
        }

        $userIds = [];
        foreach ($decryptedAppointments as $apt) {
            if (!empty($apt['assigned_lab_id'])) {
                $userIds[] = (string) $apt['assigned_lab_id'];
            }
            if (!empty($apt['assigned_nurse_id'])) {
                $userIds[] = (string) $apt['assigned_nurse_id'];
            }
            if (!empty($apt['assigned_to'])) {
                $userIds[] = (string) $apt['assigned_to'];
            }
            if (!empty($apt['patient_id'])) {
                $userIds[] = (string) $apt['patient_id'];
            }
        }
        if ($userIds !== []) {
            $userModel = new User();
            $displayNames = $userModel->getDisplayNamesByIds($userIds);
            $profileImages = $userModel->getProfileImageUrlsByIds($userIds);
            $genders = $userModel->getGendersByIds($userIds);
            foreach ($decryptedAppointments as &$apt) {
                $labId = (string) ($apt['assigned_lab_id'] ?? '');
                $nurseId = (string) ($apt['assigned_nurse_id'] ?? '');
                $toId = (string) ($apt['assigned_to'] ?? '');
                $patientId = (string) ($apt['patient_id'] ?? '');
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

        $bloodTestIds = array_values(array_filter(array_map(
            static fn(array $apt): string => (($apt['type'] ?? '') === 'blood_test') ? (string) ($apt['id'] ?? '') : '',
            $decryptedAppointments
        )));
        if ($bloodTestIds !== []) {
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
                        error_log('blood_test_items_display batch: ' . $e->getMessage());
                    }
                }
            }
            unset($apt);
        }

        $nursingIds = array_values(array_filter(array_map(
            static fn(array $apt): string => (($apt['type'] ?? '') === 'nursing') ? (string) ($apt['id'] ?? '') : '',
            $decryptedAppointments
        )));
        if ($nursingIds !== []) {
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
                        error_log('nursing_items_display batch: ' . $e->getMessage());
                    }
                }
            }
            unset($apt);
        }

        return $decryptedAppointments;
    }

    /**
     * Photos / noms / genres pour fiche détail (GET /appointments/:id) — aligné liste cartes.
     *
     * @param array<string, mixed> $appointment
     * @return array<string, mixed>
     */
    public static function enrichProfileMediaForDetail(array $appointment): array
    {
        $userIds = [];
        foreach (['assigned_lab_id', 'assigned_nurse_id', 'assigned_to', 'patient_id'] as $key) {
            if (!empty($appointment[$key])) {
                $userIds[] = (string) $appointment[$key];
            }
        }
        if ($userIds === []) {
            return $appointment;
        }

        $userModel = new User();
        $displayNames = $userModel->getDisplayNamesByIds($userIds);
        $profileImages = $userModel->getProfileImageUrlsByIds($userIds);
        $genders = $userModel->getGendersByIds($userIds);

        $labId = (string) ($appointment['assigned_lab_id'] ?? '');
        $nurseId = (string) ($appointment['assigned_nurse_id'] ?? '');
        $toId = (string) ($appointment['assigned_to'] ?? '');
        $patientId = (string) ($appointment['patient_id'] ?? '');

        $appointment['assigned_lab_display_name'] = $displayNames[$labId] ?? null;
        $appointment['assigned_nurse_display_name'] = $displayNames[$nurseId] ?? null;
        $appointment['assigned_to_display_name'] = $displayNames[$toId] ?? null;
        $appointment['assigned_lab_profile_image_url'] = $profileImages[$labId] ?? null;
        $appointment['assigned_nurse_profile_image_url'] = $profileImages[$nurseId] ?? null;
        $appointment['assigned_to_profile_image_url'] = $profileImages[$toId] ?? null;
        $appointment['beneficiary_profile_image_url'] = $profileImages[$patientId] ?? null;
        $appointment['assigned_lab_gender'] = $genders[$labId] ?? null;
        $appointment['assigned_nurse_gender'] = $genders[$nurseId] ?? null;
        $appointment['assigned_to_gender'] = $genders[$toId] ?? null;

        $fdGender = null;
        if (!empty($appointment['form_data']) && is_array($appointment['form_data'])) {
            $fg = $appointment['form_data']['gender'] ?? $appointment['form_data']['beneficiary_gender'] ?? null;
            if (is_string($fg) && trim($fg) !== '') {
                $fdGender = strtolower(trim($fg));
            }
        }
        $appointment['beneficiary_gender'] = $fdGender ?: ($genders[$patientId] ?? null);

        return $appointment;
    }
}

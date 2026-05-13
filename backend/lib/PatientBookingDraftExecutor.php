<?php

declare(strict_types=1);

require_once __DIR__ . '/../models/Appointment.php';
require_once __DIR__ . '/Crypto.php';
require_once __DIR__ . '/Logger.php';
require_once __DIR__ . '/MedicalDocumentsInternal.php';
require_once __DIR__ . '/PatientUrgencyConfig.php';
require_once __DIR__ . '/PatientBookingDraftStorage.php';

/**
 * Après paiement Stripe : création RDV depuis le JSON brouillon + pièces.
 */
final class PatientBookingDraftExecutor
{
    /**
     * @return list<string> IDs RDV créés
     */
    public static function run(PDO $db, array $draftRow): array
    {
        $payloads = json_decode($draftRow['payload_json'], true);
        if (!is_array($payloads) || $payloads === []) {
            throw new RuntimeException('Payload brouillon invalide');
        }
        $manifest = json_decode((string) ($draftRow['files_manifest_json'] ?? ''), true);
        if (!is_array($manifest)) {
            $manifest = [];
        }
        $uploads = $manifest['uploads'] ?? [];
        if (!is_array($uploads)) {
            $uploads = [];
        }

        $userId = (string) $draftRow['user_id'];
        $stripeSessionId = (string) ($draftRow['stripe_checkout_session_id'] ?? '');
        $storageDir = PatientBookingDraftStorage::draftDir((string) $draftRow['storage_subdir']);

        $appointmentModel = new Appointment();
        $crypto = new Crypto();
        $logger = new Logger();

        $createdIds = [];

        foreach ($payloads as $idx => $input) {
            if (!is_array($input)) {
                throw new RuntimeException('Élément de payload invalide');
            }
            $sanitized = self::sanitizeAppointmentInput($input);
            if (($sanitized['patient_id'] ?? '') !== $userId) {
                throw new RuntimeException('patient_id incohérent avec le brouillon');
            }
            $fd = $sanitized['form_data'] ?? [];
            if (!is_array($fd)) {
                $fd = [];
            }
            $existingUrgent = isset($fd['patient_urgency']) && is_array($fd['patient_urgency']) ? $fd['patient_urgency'] : [];
            $fd['patient_urgency'] = array_merge($existingUrgent, [
                'paid' => true,
                'amount_cents' => PatientUrgencyConfig::URGENCY_AMOUNT_CENTS,
                'stripe_checkout_session_id' => $stripeSessionId,
            ]);
            $sanitized['form_data'] = $fd;

            $aptId = $appointmentModel->create($sanitized, $userId, 'patient');
            $createdIds[] = $aptId;

            try {
                $appointmentModel->runPostCreateNotifications($aptId, $sanitized, 'patient');
            } catch (Throwable $e) {
                error_log('PatientBookingDraftExecutor runPostCreateNotifications: ' . $e->getMessage());
            }

            self::attachArtifactsForPayload(
                $db,
                $crypto,
                $logger,
                $userId,
                (int) $idx,
                $aptId,
                $input,
                $uploads,
                $storageDir
            );

            /** @disregard Sync patient profile fields (aligné POST /appointments) */
            self::syncPatientProfileFromPayload($db, $userId, $sanitized);
        }

        return $createdIds;
    }

    private static function sanitizeAppointmentInput(array $input): array
    {
        $out = $input;
        unset($out['files']);
        return $out;
    }

    private static function syncPatientProfileFromPayload(PDO $db, string $actorPatientId, array $input): void
    {
        $patientId = $input['patient_id'] ?? null;
        if (!$patientId || (string) $patientId !== $actorPatientId) {
            return;
        }
        $formData = $input['form_data'] ?? [];
        if (!is_array($formData)) {
            $formData = [];
        }
        $profileUpdates = [];
        $checkBirthDate = $formData['birth_date'] ?? $input['birth_date'] ?? null;
        $checkGender = $formData['gender'] ?? $input['gender'] ?? null;
        $checkAddress = $formData['address'] ?? $input['address'] ?? null;
        if (!empty($checkBirthDate)) {
            $profileUpdates['birth_date'] = $checkBirthDate;
        }
        if (!empty($checkGender)) {
            $profileUpdates['gender'] = $checkGender;
        }
        if (!empty($checkAddress)) {
            $addressComplement = $formData['address_complement'] ?? $input['address_complement'] ?? null;
            if (!empty($addressComplement) && empty($checkAddress['complement'])) {
                $checkAddress['complement'] = $addressComplement;
            }
            $profileUpdates['address'] = $checkAddress;
        }
        if ($profileUpdates === []) {
            return;
        }
        try {
            require_once __DIR__ . '/../models/User.php';
            $userModel = new User();
            $userModel->update((string) $patientId, $profileUpdates, $actorPatientId, 'patient');
        } catch (Throwable $e) {
            error_log('PatientBookingDraftExecutor syncPatientProfile: ' . $e->getMessage());
        }
    }

    /**
     * @param list<array<string,mixed>> $uploads
     */
    private static function attachArtifactsForPayload(
        PDO $db,
        Crypto $crypto,
        Logger $logger,
        string $patientUserId,
        int $payloadIndex,
        string $appointmentId,
        array $originalInput,
        array $uploads,
        string $storageDir
    ): void {
        $formData = $originalInput['form_data'] ?? [];
        if (!is_array($formData)) {
            $formData = [];
        }
        $filesMeta = $formData['files'] ?? [];
        if (is_array($filesMeta)) {
            foreach ($filesMeta as $fieldName => $fileData) {
                if (!is_array($fileData)) {
                    continue;
                }
                $isNew = array_key_exists('isNew', $fileData) ? (bool) $fileData['isNew'] : true;
                $mid = $fileData['medical_document_id'] ?? null;
                if (!$isNew && $mid) {
                    try {
                        $docType = (string) ($fileData['field'] ?? $fieldName);
                        MedicalDocumentsInternal::copyDocumentToAppointmentAsPatient(
                            $db,
                            $logger,
                            $patientUserId,
                            (string) $mid,
                            $appointmentId,
                            $docType !== '' ? $docType : null
                        );
                    } catch (Throwable $e) {
                        error_log('Draft copy doc ' . (string) $fieldName . ': ' . $e->getMessage());
                    }
                }
            }
        }

        $fieldToDocType = [
            'carte_vitale' => 'carte_vitale',
            'carte_mutuelle' => 'carte_mutuelle',
            'ordonnance' => 'ordonnance',
            'autres_assurances' => 'autres_assurances',
        ];

        foreach ($uploads as $u) {
            if (!is_array($u)) {
                continue;
            }
            if ((int) ($u['payload_index'] ?? -1) !== $payloadIndex) {
                continue;
            }
            $fieldKey = (string) ($u['field_key'] ?? '');
            $basename = (string) ($u['stored_basename'] ?? '');
            if ($fieldKey === '' || $basename === '') {
                continue;
            }
            $local = $storageDir . '/' . basename($basename);
            if (!is_file($local)) {
                error_log('Draft upload manquant: ' . $local);
                continue;
            }
            $origName = (string) ($u['original_name'] ?? $basename);
            $docType = $fieldToDocType[$fieldKey] ?? 'other';
            try {
                MedicalDocumentsInternal::uploadFromPathToAppointment(
                    $db,
                    $crypto,
                    $logger,
                    $patientUserId,
                    $appointmentId,
                    $local,
                    $origName,
                    $docType
                );
            } catch (Throwable $e) {
                error_log('Draft upload file ' . $fieldKey . ': ' . $e->getMessage());
            }
        }
    }
}

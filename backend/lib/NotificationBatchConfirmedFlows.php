<?php

declare(strict_types=1);

require_once __DIR__ . '/NotificationMessageFormatter.php';
require_once __DIR__ . '/EmailQueue.php';

/** Lots multisoins confirmés (nursing + blood_test) — extrait de NotificationService. */
final class NotificationBatchConfirmedFlows
{
    public function __construct(
        /** @var callable(string,string,string,string,?array): string */
        private $createNotification,
        /** @var callable(?string, array<string,mixed>): void */
        private $sendPatientConfirmedSms
    ) {
    }

    /**
     * @param array<int,array<string,mixed>> $batchRows
     */
    public function notifyNursingBatchConfirmed(
        string $primaryAppointmentId,
        string $batchId,
        string $patientId,
        array $batchRows,
        ?string $patientEmail,
        ?string $patientPhone,
        string $patientFirstName,
        string $patientLastName,
        ?string $assignedNurseId,
        ?string $createdBy,
        ?string $createdByRole,
        ?string $actorId,
        string $addressForMessage = ''
    ): void {
        $n = count($batchRows);
        if ($n < 2) {
            return;
        }

        $ids = [];
        foreach ($batchRows as $r) {
            if (!empty($r['id'])) {
                $ids[] = (string) $r['id'];
            }
        }
        if ($ids === []) {
            return;
        }

        $batchSummaries = [];
        foreach ($batchRows as $r) {
            $cat = isset($r['category_name']) && trim((string) $r['category_name']) !== ''
                ? trim((string) $r['category_name'])
                : 'Soins infirmiers';
            $fd = isset($r['form_data']) && is_array($r['form_data']) ? $r['form_data'] : null;
            $when = NotificationMessageFormatter::whenShort($fd, $r['scheduled_at'] ?? null);
            $batchSummaries[] = $when !== '' ? $cat . ' · ' . $when : $cat;
        }

        $patientName = trim($patientFirstName . ' ' . $patientLastName);
        if ($patientName === '') {
            $patientName = 'le patient';
        }

        $dataPayload = [
            'appointment_id' => $ids[0],
            'appointment_ids' => $ids,
            'creation_batch_id' => $batchId,
        ];

        try {
            ($this->createNotification)(
                $patientId,
                'appointment_confirmed',
                'Rendez-vous confirmés',
                "{$n} RDV confirmés.",
                $dataPayload
            );
        } catch (Exception $e) {
            error_log('notifyNursingBatchConfirmed patient: ' . $e->getMessage());
        }

        if (!empty($patientEmail)) {
            EmailQueue::add('appointment_confirmation', $patientEmail, [
                'id' => $primaryAppointmentId,
                'scheduled_at' => $batchRows[0]['scheduled_at'] ?? null,
                'appointment_type' => 'nursing',
                'category_name' => $batchRows[0]['category_name'] ?? null,
                'batch_summaries' => $batchSummaries,
            ]);
        }

        $fd0 = isset($batchRows[0]['form_data']) && is_array($batchRows[0]['form_data'])
            ? $batchRows[0]['form_data']
            : [];
        ($this->sendPatientConfirmedSms)($patientPhone, [
            'id' => $ids[0],
            'batch_count' => $n,
            'scheduled_at' => $batchRows[0]['scheduled_at'] ?? null,
            'type' => 'nursing',
            'category_name' => $batchRows[0]['category_name'] ?? null,
            'form_data' => $fd0,
        ]);

        if (!empty($assignedNurseId)) {
            $msg = "Lot {$n} soins · {$patientName}.";
            try {
                ($this->createNotification)(
                    (string) $assignedNurseId,
                    'appointment_accepted',
                    'Lot multisoins accepté',
                    $msg,
                    array_merge($dataPayload, [
                        'patient_name' => $patientName,
                        'batch_multisoins' => true,
                    ])
                );
            } catch (Exception $e) {
                error_log('notifyNursingBatchConfirmed nurse: ' . $e->getMessage());
            }
        }

        $createdBy = $createdBy !== null ? (string) $createdBy : '';
        $creatorRole = is_string($createdByRole) ? $createdByRole : '';
        $actorIdStr = $actorId !== null ? (string) $actorId : '';
        $sameAsPatient = $createdBy !== '' && (string) $patientId === $createdBy;

        if (
            $createdBy !== ''
            && in_array($creatorRole, ['pro', 'nurse', 'lab', 'subaccount'], true)
            && $createdBy !== $actorIdStr
            && !$sameAsPatient
        ) {
            $message = in_array($creatorRole, ['nurse', 'lab', 'subaccount'], true)
                ? "Lot {$n} soins confirmé."
                : "Lot {$n} soins confirmé · patient prévenu.";
            try {
                ($this->createNotification)(
                    $createdBy,
                    'appointment_confirmed_for_creator',
                    'Rendez-vous confirmés',
                    $message,
                    $dataPayload
                );
            } catch (Exception $e) {
                error_log('notifyNursingBatchConfirmed creator: ' . $e->getMessage());
            }
        }
    }

    /**
     * @param array<int,array<string,mixed>> $batchRows
     */
    public function notifyBloodTestBatchConfirmed(
        string $primaryAppointmentId,
        string $batchId,
        string $patientId,
        array $batchRows,
        ?string $patientEmail,
        ?string $patientPhone,
        string $patientFirstName,
        string $patientLastName,
        ?string $assignedLabId,
        ?string $createdBy,
        ?string $createdByRole,
        ?string $actorId
    ): void {
        $n = count($batchRows);
        if ($n < 2) {
            return;
        }

        $ids = [];
        foreach ($batchRows as $r) {
            if (!empty($r['id'])) {
                $ids[] = (string) $r['id'];
            }
        }
        if ($ids === []) {
            return;
        }

        $batchSummaries = [];
        foreach ($batchRows as $r) {
            $cat = isset($r['category_name']) && trim((string) $r['category_name']) !== ''
                ? trim((string) $r['category_name'])
                : 'Prélèvement';
            $fd = isset($r['form_data']) && is_array($r['form_data']) ? $r['form_data'] : null;
            $when = NotificationMessageFormatter::whenShort($fd, $r['scheduled_at'] ?? null);
            $batchSummaries[] = $when !== '' ? $cat . ' · ' . $when : $cat;
        }

        $patientName = trim($patientFirstName . ' ' . $patientLastName);
        if ($patientName === '') {
            $patientName = 'le patient';
        }

        $dataPayload = [
            'appointment_id' => $ids[0],
            'appointment_ids' => $ids,
            'creation_batch_id' => $batchId,
        ];

        try {
            ($this->createNotification)(
                $patientId,
                'appointment_confirmed',
                'Rendez-vous confirmés',
                "{$n} prélèvements confirmés.",
                $dataPayload
            );
        } catch (Exception $e) {
            error_log('notifyBloodTestBatchConfirmed patient: ' . $e->getMessage());
        }

        if (!empty($patientEmail)) {
            EmailQueue::add('appointment_confirmation', $patientEmail, [
                'id' => $primaryAppointmentId,
                'scheduled_at' => $batchRows[0]['scheduled_at'] ?? null,
                'appointment_type' => 'blood_test',
                'category_name' => $batchRows[0]['category_name'] ?? null,
                'batch_summaries' => $batchSummaries,
            ]);
        }

        ($this->sendPatientConfirmedSms)($patientPhone, [
            'id' => $ids[0],
            'batch_count' => $n,
            'scheduled_at' => $batchRows[0]['scheduled_at'] ?? null,
            'type' => 'blood_test',
            'category_name' => $batchRows[0]['category_name'] ?? null,
            'form_data' => isset($batchRows[0]['form_data']) && is_array($batchRows[0]['form_data'])
                ? $batchRows[0]['form_data']
                : null,
        ]);

        if (!empty($assignedLabId)) {
            $msg = "Lot {$n} prélèvements · {$patientName}.";
            try {
                ($this->createNotification)(
                    (string) $assignedLabId,
                    'appointment_accepted_lab',
                    'Lot prises de sang accepté',
                    $msg,
                    array_merge($dataPayload, [
                        'patient_name' => $patientName,
                        'batch_multisoins' => true,
                    ])
                );
            } catch (Exception $e) {
                error_log('notifyBloodTestBatchConfirmed lab: ' . $e->getMessage());
            }
        }

        $createdBy = $createdBy !== null ? (string) $createdBy : '';
        $creatorRole = is_string($createdByRole) ? $createdByRole : '';
        $actorIdStr = $actorId !== null ? (string) $actorId : '';
        $sameAsPatient = $createdBy !== '' && (string) $patientId === $createdBy;

        if (
            $createdBy !== ''
            && in_array($creatorRole, ['pro', 'nurse', 'lab', 'subaccount'], true)
            && $createdBy !== $actorIdStr
            && !$sameAsPatient
        ) {
            $message = in_array($creatorRole, ['nurse', 'lab', 'subaccount'], true)
                ? "Lot {$n} prélèvements confirmé."
                : "Lot {$n} prélèvements confirmé · patient prévenu.";
            try {
                ($this->createNotification)(
                    $createdBy,
                    'appointment_confirmed_for_creator',
                    'Rendez-vous confirmés',
                    $message,
                    $dataPayload
                );
            } catch (Exception $e) {
                error_log('notifyBloodTestBatchConfirmed creator: ' . $e->getMessage());
            }
        }
    }
}

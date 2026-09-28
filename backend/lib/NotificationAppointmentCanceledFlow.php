<?php

declare(strict_types=1);

require_once __DIR__ . '/NotificationMessageFormatter.php';
require_once __DIR__ . '/EmailQueue.php';
require_once __DIR__ . '/NotificationRecipientNotifier.php';

/** Flux notifyAppointmentCanceled (extrait de NotificationService). */
final class NotificationAppointmentCanceledFlow
{
    public function __construct(
        /** @var callable(string,string,string,string,?array): string */
        private $createNotification,
        private NotificationRecipientNotifier $recipients
    ) {
    }

    public function dispatch(
        string $appointmentId,
        array $appointmentData,
        string $canceledBy,
        ?string $actorDisplayLabel = null,
        ?string $actorUserId = null
    ): void {
        $patientName = '';
        if (!empty($appointmentData['patient_first_name']) && !empty($appointmentData['patient_last_name'])) {
            $patientName = trim($appointmentData['patient_first_name'] . ' ' . $appointmentData['patient_last_name']);
        }

        $when = NotificationMessageFormatter::whenShort(
            $appointmentData['form_data'] ?? null,
            $appointmentData['scheduled_at'] ?? null
        );
        $careType = NotificationMessageFormatter::careShortLabel(
            $appointmentData['category_name'] ?? null,
            $appointmentData['type'] ?? null
        );

        if ($canceledBy === 'nurse' && !empty($appointmentData['patient_id'])) {
            if ($actorDisplayLabel !== null && $actorDisplayLabel !== '') {
                $message = $actorDisplayLabel . ' a annulé votre RDV.';
            } else {
                $message = NotificationMessageFormatter::joinParts([
                    'RDV annulé',
                    $careType,
                    $when ?: null,
                ]);
            }

            $patientNotifData = [
                'appointment_id' => $appointmentId,
                'canceled_by' => $canceledBy,
            ];
            foreach (['cancellation_reason', 'cancellation_comment', 'cancellation_photo_document_id'] as $ck) {
                if (!empty($appointmentData[$ck])) {
                    $patientNotifData[$ck] = $appointmentData[$ck];
                }
            }
            ($this->createNotification)(
                $appointmentData['patient_id'],
                'appointment_canceled',
                'RDV annulé',
                $message,
                $patientNotifData
            );

            if (!empty($appointmentData['patient_email'])) {
                EmailQueue::add('appointment_canceled_patient', $appointmentData['patient_email'], [
                    'actor_display_label' => $actorDisplayLabel ?? 'Le professionnel de santé',
                    'scheduled_at' => $appointmentData['scheduled_at'] ?? null,
                    'form_data' => $appointmentData['form_data'] ?? null,
                ]);
            }
            if ($actorDisplayLabel !== null && $actorDisplayLabel !== '' && $patientName !== '') {
                $messageToPros = $actorDisplayLabel . ' a annulé le RDV de ' . $patientName . '.';
                $cancelData = ['appointment_id' => $appointmentId];
                foreach (['cancellation_reason', 'cancellation_comment', 'cancellation_photo_document_id'] as $ck) {
                    if (!empty($appointmentData[$ck])) {
                        $cancelData[$ck] = $appointmentData[$ck];
                    }
                }
                $cancelData['scheduled_at'] = $appointmentData['scheduled_at'] ?? null;
                $cancelData['form_data'] = $appointmentData['form_data'] ?? null;
                $this->recipients->notifyAllAdmins('appointment_canceled_by_pro', 'RDV annulé', $messageToPros, $cancelData);
                $this->recipients->notifyAssignees(
                    $appointmentData['assigned_lab_id'] ?? null,
                    $appointmentData['assigned_to'] ?? null,
                    $appointmentData['assigned_nurse_id'] ?? null,
                    'appointment_canceled_by_pro',
                    'RDV annulé',
                    $messageToPros,
                    $cancelData
                );
            }

            if (($appointmentData['type'] ?? '') === 'blood_test') {
                $createdBy = $appointmentData['created_by'] ?? null;
                $createdByRole = $appointmentData['created_by_role'] ?? null;
                if (
                    $createdBy
                    && in_array($createdByRole, ['lab', 'subaccount'], true)
                    && (string) $createdBy !== (string) ($actorUserId ?? '')
                    && (string) $createdBy !== (string) ($appointmentData['assigned_lab_id'] ?? '')
                    && (string) $createdBy !== (string) ($appointmentData['assigned_to'] ?? '')
                ) {
                    $messageCreator = ($actorDisplayLabel !== null && $actorDisplayLabel !== '' && $patientName !== '')
                        ? ($actorDisplayLabel . ' a annulé le RDV de ' . $patientName . '.')
                        : ('Un professionnel a annulé le RDV de ' . ($patientName !== '' ? $patientName : 'patient') . '.');
                    $cancelDataCreator = ['appointment_id' => $appointmentId];
                    foreach (['cancellation_reason', 'cancellation_comment', 'cancellation_photo_document_id'] as $ck) {
                        if (!empty($appointmentData[$ck])) {
                            $cancelDataCreator[$ck] = $appointmentData[$ck];
                        }
                    }
                    try {
                        ($this->createNotification)(
                            (string) $createdBy,
                            'appointment_canceled_by_pro',
                            'RDV annulé',
                            $messageCreator,
                            $cancelDataCreator
                        );
                    } catch (Exception $e) {
                        error_log('notifyAppointmentCanceled created_by: ' . $e->getMessage());
                    }
                }
            }
        }

        if ($canceledBy === 'patient' && !empty($appointmentData['patient_id'])) {
            $message = NotificationMessageFormatter::joinParts([
                'Annulation enregistrée',
                $careType,
                $when ?: null,
            ]);

            ($this->createNotification)(
                $appointmentData['patient_id'],
                'appointment_canceled_confirmation',
                'RDV annulé',
                $message,
                [
                    'appointment_id' => $appointmentId,
                    'canceled_by' => $canceledBy,
                ]
            );
        }

        if ($canceledBy === 'patient' && !empty($appointmentData['assigned_nurse_id'])) {
            $message = NotificationMessageFormatter::joinParts([
                'Annulé par le patient',
                $patientName !== '' ? $patientName : null,
                $careType,
                $when ?: null,
            ]);

            ($this->createNotification)(
                $appointmentData['assigned_nurse_id'],
                'appointment_canceled',
                'RDV annulé',
                $message,
                [
                    'appointment_id' => $appointmentId,
                    'patient_name' => $patientName,
                    'canceled_by' => $canceledBy,
                ]
            );
        }

        if ($canceledBy === 'patient') {
            $messageLab = NotificationMessageFormatter::joinParts([
                'Annulé par le patient',
                $patientName !== '' ? $patientName : null,
                $careType,
                $when ?: null,
            ]);
            $dataLab = ['appointment_id' => $appointmentId, 'patient_name' => $patientName, 'canceled_by' => $canceledBy];
            if (!empty($appointmentData['assigned_lab_id'])) {
                ($this->createNotification)($appointmentData['assigned_lab_id'], 'appointment_canceled', 'RDV annulé', $messageLab, $dataLab);
            }
            if (!empty($appointmentData['assigned_to'])) {
                ($this->createNotification)($appointmentData['assigned_to'], 'appointment_canceled', 'RDV annulé', $messageLab, $dataLab);
            }

            $messageAdmin = ($patientName !== '' ? $patientName : 'Un patient') . ' a annulé son RDV.';
            $this->recipients->notifyAllAdmins(
                'appointment_canceled_by_patient',
                'RDV annulé',
                $messageAdmin,
                [
                    'appointment_id' => $appointmentId,
                    'scheduled_at' => $appointmentData['scheduled_at'] ?? null,
                    'form_data' => $appointmentData['form_data'] ?? null,
                ]
            );
        }

        if ($canceledBy === 'nurse' && !empty($appointmentData['assigned_nurse_id'])) {
            $message = NotificationMessageFormatter::joinParts([
                'Annulation enregistrée',
                $patientName !== '' ? $patientName : null,
                $careType,
                $when ?: null,
            ]);

            ($this->createNotification)(
                $appointmentData['assigned_nurse_id'],
                'appointment_canceled_confirmation',
                'RDV annulé',
                $message,
                [
                    'appointment_id' => $appointmentId,
                    'patient_name' => $patientName,
                    'canceled_by' => $canceledBy,
                ]
            );
        }
    }
}

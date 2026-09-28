<?php

declare(strict_types=1);

require_once __DIR__ . '/../Validation.php';
require_once __DIR__ . '/../NotificationMessageFormatter.php';
require_once __DIR__ . '/../AdminEmailNotifier.php';
require_once __DIR__ . '/AppointmentItemsResolver.php';
require_once __DIR__ . '/AppointmentDispatchService.php';

/**
 * Notifications post-création et changements de statut RDV.
 */
final class AppointmentNotificationService
{
    public function __construct(
        private PDO $db,
        private Crypto $crypto,
        private NotificationService $notificationService,
        private AppointmentItemsResolver $itemsResolver,
        private AppointmentDispatchService $dispatchService,
    ) {
    }

    public function runPostCreateNotifications(string $id, array $data, ?string $createdByRole = null): void
    {
        $lat = isset($data['address']['lat']) ? (float) $data['address']['lat'] : 0.0;
        $lng = isset($data['address']['lng']) ? (float) $data['address']['lng'] : 0.0;
        // Prise de sang déjà assignée : pas de dispatch géo (emails « nouveau RDV » à toute la zone). Utiliser la ligne persistée si le body n’avait pas assigned_lab_id.
        $bloodTestAssignedLabId = $data['assigned_lab_id'] ?? null;
        if (($data['type'] ?? '') === 'blood_test' && empty($bloodTestAssignedLabId)) {
            try {
                $stmtLab = $this->db->prepare('SELECT assigned_lab_id FROM appointments WHERE id = ?');
                $stmtLab->execute([$id]);
                $rowLab = $stmtLab->fetch(PDO::FETCH_ASSOC);
                if (!empty($rowLab['assigned_lab_id'])) {
                    $bloodTestAssignedLabId = $rowLab['assigned_lab_id'];
                }
            } catch (Exception $e) {
                // ne pas bloquer les notifications
            }
        }

        // RDV soins depuis la fiche d'un infirmier : assigned_nurse_id est renseigné → ne pas diffuser à toute la zone
        $nursingAssignedNurseId = $data['assigned_nurse_id'] ?? null;
        if (($data['type'] ?? '') === 'nursing' && (empty($nursingAssignedNurseId) || trim((string) $nursingAssignedNurseId) === '')) {
            try {
                $stmtNurse = $this->db->prepare('SELECT assigned_nurse_id FROM appointments WHERE id = ?');
                $stmtNurse->execute([$id]);
                $rowNurse = $stmtNurse->fetch(PDO::FETCH_ASSOC);
                if (!empty($rowNurse['assigned_nurse_id'])) {
                    $nursingAssignedNurseId = $rowNurse['assigned_nurse_id'];
                }
            } catch (Exception $e) {
                // ne pas bloquer les notifications
            }
        }

        $skipDispatch = ($createdByRole === 'nurse' && ($data['type'] ?? '') === 'nursing')
            || (($data['type'] ?? '') === 'blood_test' && !empty($bloodTestAssignedLabId))
            || (($data['type'] ?? '') === 'nursing' && !empty($nursingAssignedNurseId))
            || !empty($data['skip_zone_dispatch'])
            || !empty($data['external_nurse_invite_sent'])
            || (($data['type'] ?? '') === 'blood_test' && ($data['lab_preference_mode'] ?? '') === 'brand_choice');

        // Attribution marketing QR pro : le pro est notifié, mais le RDV part quand même en zone
        // (sauf si un infirmier / lab est déjà assigné — cas QR infirmier / lab).
        $assignedProId = $data['assigned_pro_id'] ?? null;
        if (empty($assignedProId) || trim((string) $assignedProId) === '') {
            try {
                $stmtPro = $this->db->prepare('SELECT assigned_pro_id FROM appointments WHERE id = ?');
                $stmtPro->execute([$id]);
                $rowPro = $stmtPro->fetch(PDO::FETCH_ASSOC);
                if (!empty($rowPro['assigned_pro_id'])) {
                    $assignedProId = $rowPro['assigned_pro_id'];
                }
            } catch (Exception $e) {
                // ne pas bloquer
            }
        }

        if (!$skipDispatch) {
            $batchIdForDispatch = is_string($data['creation_batch_id'] ?? null) && !empty($data['creation_batch_id']) ? $data['creation_batch_id'] : null;
            $this->dispatchService->dispatchGeographic($id, $data['type'] ?? '', $lat, $lng, $data['scheduled_at'] ?? null, $data['form_data'] ?? null, null, $batchIdForDispatch);
        }

        // Notification ciblée : uniquement l'infirmier concerné (réservation depuis son profil public)
        if (
            ($data['type'] ?? '') === 'nursing'
            && !empty($nursingAssignedNurseId)
            && $createdByRole !== 'nurse'
        ) {
            $this->dispatchService->dispatchDirectedNurseOnly(
                $id,
                (string) $nursingAssignedNurseId,
                $data['scheduled_at'] ?? null,
                $data['form_data'] ?? null
            );
        }

        if (
            !empty($assignedProId)
            && $createdByRole === 'patient'
        ) {
            $this->dispatchService->dispatchDirectedProOnly(
                $id,
                (string) $assignedProId,
                $data['scheduled_at'] ?? null,
                $data['form_data'] ?? null,
                $data['type'] ?? ''
            );
        }

        $batchIdRaw = $data['creation_batch_id'] ?? null;
        $batchSize = isset($data['creation_batch_size']) ? (int) $data['creation_batch_size'] : 0;
        $patientIdForBatch = $data['patient_id'] ?? null;
        $deferBatch = false;
        $batchComplete = false;
        if (
            is_string($batchIdRaw)
            && Validation::uuid($batchIdRaw)
            && $batchSize > 1
            && !empty($patientIdForBatch)
        ) {
            try {
                $stmtCnt = $this->db->prepare('SELECT COUNT(*) FROM appointments WHERE creation_batch_id = ? AND patient_id = ?');
                $stmtCnt->execute([$batchIdRaw, $patientIdForBatch]);
                $cnt = (int) $stmtCnt->fetchColumn();
                if ($cnt < $batchSize) {
                    $deferBatch = true;
                } elseif ($cnt === $batchSize) {
                    $batchComplete = true;
                }
            } catch (Exception $e) {
                error_log('runPostCreateNotifications batch count: ' . $e->getMessage());
            }
        }

        if ($deferBatch) {
            return;
        }

        if ($batchComplete && is_string($batchIdRaw)) {
            $rows = $this->fetchBatchAppointmentRowsForNotifications($batchIdRaw, (string) $patientIdForBatch);
            if ($rows !== []) {
                $this->notificationService->notifyBatchAppointmentCreationCompleted(
                    $batchIdRaw,
                    (string) $patientIdForBatch,
                    $rows,
                    $data
                );
            }
            return;
        }

        try {
            $stmtCreator = $this->db->prepare('
                SELECT status, type, created_by, created_by_role, scheduled_at
                FROM appointments WHERE id = ?
            ');
            $stmtCreator->execute([$id]);
            $aptRow = $stmtCreator->fetch(PDO::FETCH_ASSOC);
            if (
                $aptRow
                && ($aptRow['status'] ?? '') === 'pending'
                && in_array($aptRow['created_by_role'] ?? '', ['pro', 'nurse', 'lab', 'subaccount'], true)
            ) {
                $creatorRole = (string) ($aptRow['created_by_role'] ?? '');
                $aptType = (string) ($aptRow['type'] ?? '');

                // Infirmier + prise de sang : rappel que le laboratoire doit confirmer
                if ($creatorRole === 'nurse' && $aptType === 'blood_test') {
                    $this->notificationService->notifyNurseBloodTestLabAwaitingConfirmation(
                        (string) $aptRow['created_by'],
                        $id,
                        (string) ($aptRow['scheduled_at'] ?? ''),
                    );
                } else {
                    $this->notificationService->notifyProfessionalRequestSent(
                        (string) $aptRow['created_by'],
                        $id,
                        $aptType,
                        $creatorRole
                    );
                }
            }
        } catch (Exception $e) {
            error_log('notifyProfessionalRequestSent (post-create): ' . $e->getMessage());
        }

        $notifyPatientExtras = [];
        if (($data['type'] ?? '') === 'nursing') {
            try {
                $loaded = $this->itemsResolver->loadNursingItemsForAppointments([$id]);
                $pre = $loaded[$id] ?? [];
                $resolvedForNotif = $this->itemsResolver->resolveNursingItemsForAppointment([
                    'id' => $id,
                    'type' => 'nursing',
                    'category_id' => $data['category_id'] ?? null,
                    'form_data' => is_array($data['form_data'] ?? null) ? $data['form_data'] : [],
                ], $pre);
                if (count($resolvedForNotif) > 1) {
                    $parts = [];
                    foreach ($resolvedForNotif as $rw) {
                        $nm = trim((string) ($rw['category_name'] ?? $rw['label'] ?? ''));
                        if ($nm !== '') {
                            $parts[] = $nm;
                        }
                    }
                    if ($parts !== []) {
                        $notifyPatientExtras['category_name'] = implode(' · ', $parts);
                    }
                }
            } catch (Throwable $e) {
                error_log('runPostCreateNotifications nursing category summary: ' . $e->getMessage());
            }
        }

        $this->notificationService->notifyNewAppointment($id, array_merge([
            'patient_id' => $data['patient_id'] ?? null,
            'patient_email' => $data['patient_email'] ?? null,
            'type' => $data['type'] ?? null,
            'scheduled_at' => $data['scheduled_at'] ?? null,
            'form_data' => $data['form_data'] ?? null,
        ], $notifyPatientExtras));
        $this->notifyAllAdmins($id, $data['type'] ?? '', $data['scheduled_at'] ?? '', $data['form_data'] ?? null);
    }

    /**
     * Lignes RDV d’un lot (notifications groupées après création multi).
     *
     * @return array<int,array<string,mixed>>
     */
    private function fetchBatchAppointmentRowsForNotifications(string $batchId, string $patientId): array
    {
        try {
            $stmt = $this->db->prepare('
                SELECT a.id, a.status, a.type, a.scheduled_at, a.category_id, a.created_by, a.created_by_role,
                       a.assigned_lab_id, a.form_data_encrypted, a.form_data_dek,
                       c.name AS category_name
                FROM appointments a
                LEFT JOIN care_categories c ON c.id = a.category_id
                WHERE a.creation_batch_id = ? AND a.patient_id = ?
                ORDER BY a.scheduled_at ASC
            ');
            $stmt->execute([$batchId, $patientId]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

            return $this->attachDecryptedFormDataToRows($rows);
        } catch (Exception $e) {
            error_log('fetchBatchAppointmentRowsForNotifications: ' . $e->getMessage());

            return [];
        }
    }

    /**
     * Lignes d’un lot multisoins (nursing) pour notifications de statut (ex. confirmation groupée).
     *
     * @return array<int,array<string,mixed>>
     */
    private function fetchNursingBatchRowsForStatusNotification(string $batchId, string $patientId): array
    {
        try {
            $stmt = $this->db->prepare('
                SELECT a.id, a.scheduled_at, a.form_data_encrypted, a.form_data_dek, c.name AS category_name
                FROM appointments a
                LEFT JOIN care_categories c ON c.id = a.category_id
                WHERE a.creation_batch_id = ? AND a.patient_id = ? AND a.type = ?
                ORDER BY a.scheduled_at ASC
            ');
            $stmt->execute([$batchId, $patientId, 'nursing']);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

            return $this->attachDecryptedFormDataToRows($rows);
        } catch (Exception $e) {
            error_log('fetchNursingBatchRowsForStatusNotification: ' . $e->getMessage());

            return [];
        }
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    private function fetchBloodTestBatchRowsForStatusNotification(string $batchId, string $patientId): array
    {
        try {
            $stmt = $this->db->prepare('
                SELECT a.id, a.scheduled_at, a.form_data_encrypted, a.form_data_dek, c.name AS category_name
                FROM appointments a
                LEFT JOIN care_categories c ON c.id = a.category_id
                WHERE a.creation_batch_id = ? AND a.patient_id = ? AND a.type = ?
                ORDER BY a.scheduled_at ASC
            ');
            $stmt->execute([$batchId, $patientId, 'blood_test']);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

            return $this->attachDecryptedFormDataToRows($rows);
        } catch (Exception $e) {
            error_log('fetchBloodTestBatchRowsForStatusNotification: ' . $e->getMessage());

            return [];
        }
    }

    /**
     * @param array<int,array<string,mixed>> $rows
     * @return array<int,array<string,mixed>>
     */
    private function attachDecryptedFormDataToRows(array $rows): array
    {
        foreach ($rows as &$row) {
            $row['form_data'] = null;
            if (!empty($row['form_data_encrypted']) && !empty($row['form_data_dek'])) {
                try {
                    $json = $this->crypto->decryptField($row['form_data_encrypted'], $row['form_data_dek']);
                    $decoded = json_decode($json, true);
                    $row['form_data'] = is_array($decoded) ? $decoded : null;
                } catch (Exception $e) {
                    $row['form_data'] = null;
                }
            }
        }
        unset($row);

        return $rows;
    }

    public function notifyShareLinkSharerNurseIfNeeded(string $appointmentId, string $acceptingNurseId): void
    {
        try {
            $stmt = $this->db->prepare(
                "SELECT actor_id FROM appointment_status_updates
                 WHERE appointment_id = ? AND note LIKE ?
                 AND actor_role = 'nurse' AND actor_id IS NOT NULL AND TRIM(actor_id) <> ''
                 ORDER BY created_at DESC
                 LIMIT 1"
            );
            $stmt->execute([$appointmentId, '%partage lien confrère%']);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$row || empty($row['actor_id'])) {
                return;
            }
            $sharerId = (string) $row['actor_id'];
            if ($sharerId === (string) $acceptingNurseId) {
                return;
            }
            $this->notificationService->notifyShareLinkAppointmentTakenByColleague(
                $sharerId,
                $acceptingNurseId,
                $appointmentId
            );
        } catch (Throwable $e) {
            error_log('notifyShareLinkSharerNurseIfNeeded: ' . $e->getMessage());
        }
    }

    /**
     * Envoie les notifications selon le statut
     */
    public function sendStatusNotifications(string $appointmentId, string $status, ?string $actorId = null, ?string $actorRole = null): void
    {
        // Récupérer les informations complètes du rendez-vous
        $stmt = $this->db->prepare('
            SELECT a.patient_id, a.type, a.assigned_to, a.assigned_nurse_id, a.assigned_lab_id,
                   a.scheduled_at, a.address_encrypted, a.address_dek, a.category_id,
                   a.created_by, a.created_by_role, a.creation_batch_id,
                   a.form_data_encrypted, a.form_data_dek,
                   a.cancellation_reason, a.cancellation_comment, a.cancellation_photo_document_id,
                   c.name as category_name
            FROM appointments a
            LEFT JOIN care_categories c ON a.category_id = c.id
            WHERE a.id = ?
        ');
        $stmt->execute([$appointmentId]);
        $appointment = $stmt->fetch();
        
        if (!$appointment) {
            return;
        }

        $formData = null;
        if (!empty($appointment['form_data_encrypted']) && !empty($appointment['form_data_dek'])) {
            try {
                $formDataJson = $this->crypto->decryptField(
                    $appointment['form_data_encrypted'],
                    $appointment['form_data_dek']
                );
                $decoded = json_decode($formDataJson, true);
                $formData = is_array($decoded) ? $decoded : null;
            } catch (Exception $e) {
                $formData = null;
            }
        }
        
        $patientId = $appointment['patient_id'];
        
        // Déchiffrer l'adresse si disponible
        $address = '';
        if (!empty($appointment['address_encrypted']) && !empty($appointment['address_dek'])) {
            try {
                $address = $this->crypto->decryptField($appointment['address_encrypted'], $appointment['address_dek']);
            } catch (Exception $e) {
                // Ignorer les erreurs de déchiffrement
            }
        }
        
        // Récupérer les infos du patient
        $patientFirstName = '';
        $patientLastName = '';
        $patientEmail = null;
        $patientPhone = null;
        if ($patientId) {
            try {
                require_once __DIR__ . '/../../models/User.php';
                $userModel = new User();
                $patient = $userModel->getById($patientId, 'system', 'system');
                if ($patient) {
                    $patientFirstName = $patient['first_name'] ?? '';
                    $patientLastName = $patient['last_name'] ?? '';
                    $patientEmail = $patient['email'] ?? null;
                    $patientPhone = $patient['phone'] ?? null;
                }
            } catch (Exception $e) {
                // Ignorer les erreurs
            }
        }
        if (empty($patientPhone) && is_array($formData) && !empty($formData['phone'])) {
            $patientPhone = trim((string) $formData['phone']);
        }
        
        // Libellé de l'acteur (labo, sous-compte, préleveur, infirmier) pour les messages de notification
        $actorDisplayLabel = null;
        if ($actorId && $actorRole && in_array($actorRole, ['nurse', 'lab', 'subaccount', 'preleveur'])) {
            $actorDisplayLabel = $this->getActorDisplayLabel($actorId, $actorRole);
        }
        
        switch ($status) {
            case 'confirmed':
                $createdBy = $appointment['created_by'] ?? null;
                $createdByRole = $appointment['created_by_role'] ?? null;
                $creationBatchId = $appointment['creation_batch_id'] ?? null;

                // Lot multisoins (nursing) : une seule notification cloche par rôle
                if (
                    ($appointment['type'] ?? '') === 'nursing'
                    && !empty($creationBatchId)
                    && !empty($patientId)
                    && Validation::uuid((string) $creationBatchId)
                ) {
                    $batchRows = $this->fetchNursingBatchRowsForStatusNotification((string) $creationBatchId, (string) $patientId);
                    if (count($batchRows) > 1) {
                        $this->notificationService->notifyNursingBatchConfirmed(
                            $appointmentId,
                            (string) $creationBatchId,
                            (string) $patientId,
                            $batchRows,
                            $patientEmail,
                            $patientPhone,
                            $patientFirstName,
                            $patientLastName,
                            $appointment['assigned_nurse_id'] ?? null,
                            $createdBy !== null ? (string) $createdBy : null,
                            is_string($createdByRole) ? $createdByRole : null,
                            $actorId,
                            $address
                        );
                        break;
                    }
                }

                // Lot multisoins (blood_test) : une seule notification cloche par rôle
                if (
                    ($appointment['type'] ?? '') === 'blood_test'
                    && !empty($creationBatchId)
                    && !empty($patientId)
                    && Validation::uuid((string) $creationBatchId)
                    && $actorId
                    && in_array($actorRole, ['lab', 'subaccount', 'preleveur'], true)
                ) {
                    $batchRowsBt = $this->fetchBloodTestBatchRowsForStatusNotification((string) $creationBatchId, (string) $patientId);
                    if (count($batchRowsBt) > 1) {
                        $this->notificationService->notifyBloodTestBatchConfirmed(
                            $appointmentId,
                            (string) $creationBatchId,
                            (string) $patientId,
                            $batchRowsBt,
                            $patientEmail,
                            $patientPhone,
                            $patientFirstName,
                            $patientLastName,
                            $appointment['assigned_lab_id'] ?? null,
                            $createdBy !== null ? (string) $createdBy : null,
                            is_string($createdByRole) ? $createdByRole : null,
                            $actorId
                        );
                        break;
                    }
                }

                $samePersonCreatorAndPatient = $patientId && $createdBy
                    && (string) $patientId === (string) $createdBy
                    && in_array($createdByRole, ['pro', 'nurse', 'lab', 'subaccount'], true);

                // Notification au patient (si patient existe) + email confirmation (async)
                if ($patientId) {
                    $this->notificationService->notifyAppointmentConfirmed($appointmentId, [
                        'patient_id' => $patientId,
                        'patient_email' => $patientEmail,
                        'patient_phone' => $patientPhone,
                        'id' => $appointmentId,
                        'scheduled_at' => $appointment['scheduled_at'] ?? null,
                        'type' => $appointment['type'] ?? 'blood_test',
                        'category_id' => $appointment['category_id'] ?? null,
                        'category_name' => $appointment['category_name'] ?? null,
                        'form_data' => $formData,
                    ]);
                }

                // Prise de sang : confirmation côté lab / sous-compte / préleveur ayant accepté
                if (
                    ($appointment['type'] ?? '') === 'blood_test'
                    && $actorId
                    && in_array($actorRole, ['lab', 'subaccount', 'preleveur'], true)
                ) {
                    $this->notificationService->notifyLabBloodTestAccepted(
                        (string) $actorId,
                        $appointmentId,
                        [
                            'patient_first_name' => $patientFirstName,
                            'patient_last_name' => $patientLastName,
                            'scheduled_at' => $appointment['scheduled_at'] ?? null,
                            'category_id' => $appointment['category_id'] ?? null,
                            'category_name' => $appointment['category_name'] ?? null,
                            'form_data' => $formData,
                        ]
                    );
                }

                // Notification à l'infirmier qui a accepté
                if (!empty($appointment['assigned_nurse_id'])) {
                    $this->notificationService->notifyNurseAcceptedAppointment(
                        $appointmentId,
                        $appointment['assigned_nurse_id'],
                        [
                            'patient_first_name' => $patientFirstName,
                            'patient_last_name' => $patientLastName,
                            'scheduled_at' => $appointment['scheduled_at'],
                            'address' => $address,
                            'category_id' => $appointment['category_id'] ?? null,
                            'category_name' => $appointment['category_name'] ?? 'Soins infirmiers',
                            'type' => $appointment['type'] ?? 'nursing',
                            'form_data' => $formData,
                        ]
                    );
                }

                // Créateur du RDV — pas le professionnel qui vient d’accepter ; pas de doublon si créateur = patient (compte pro)
                if (
                    !$samePersonCreatorAndPatient
                    && !empty($createdBy)
                    && in_array($createdByRole, ['pro', 'nurse', 'lab', 'subaccount'], true)
                    && (string) $createdBy !== (string) ($actorId ?? '')
                ) {
                    $this->notificationService->notifyCreatorAppointmentConfirmed(
                        (string) $createdBy,
                        $appointmentId,
                        (string) ($appointment['type'] ?? 'blood_test'),
                        $appointment['category_name'] ?? null,
                        is_string($createdByRole) ? $createdByRole : null,
                        $appointment['scheduled_at'] ?? null
                    );
                }
                break;
                
            case 'inProgress':
                // Statut conservé (API / admin / réactivation UI). Notif patient inchangée.
                if ($patientId) {
                    $this->notificationService->notifyAppointmentStarted($appointmentId, $patientId);
                }
                break;
                
            case 'completed':
                if ($patientId) {
                    $this->notificationService->notifyAppointmentCompleted(
                        $appointmentId,
                        $patientId,
                        $actorDisplayLabel,
                        $patientFirstName,
                        $patientLastName,
                        $appointment['assigned_lab_id'] ?? null,
                        $appointment['assigned_to'] ?? null,
                        $appointment['assigned_nurse_id'] ?? null
                    );
                }
                break;
                
            case 'canceled':
                // Déterminer qui a annulé (patient ou professionnel) selon le rôle de l'acteur
                $canceledBy = 'patient'; // Par défaut
                if ($actorRole && in_array($actorRole, ['nurse', 'lab', 'subaccount', 'preleveur', 'super_admin'])) {
                    $canceledBy = 'nurse'; // Ou 'professional' mais on garde 'nurse' pour simplifier
                }
                
                $appointmentType = $appointment['type'] ?? null;
                $careTypeLabel = $appointment['category_name'] ?? (
                    $appointmentType === 'blood_test' ? 'Prélèvement' : 'Soins infirmiers'
                );
                $this->notificationService->notifyAppointmentCanceled(
                    $appointmentId,
                    [
                        'patient_id' => $patientId,
                        'patient_email' => $patientEmail,
                        'patient_phone' => $patientPhone,
                        'patient_first_name' => $patientFirstName,
                        'patient_last_name' => $patientLastName,
                        'scheduled_at' => $appointment['scheduled_at'],
                        'address' => $address,
                        'category_name' => $careTypeLabel,
                        'type' => $appointmentType,
                        'form_data' => $formData,
                        'assigned_nurse_id' => $appointment['assigned_nurse_id'],
                        'assigned_lab_id' => $appointment['assigned_lab_id'] ?? null,
                        'assigned_to' => $appointment['assigned_to'] ?? null,
                        'created_by' => $appointment['created_by'] ?? null,
                        'created_by_role' => $appointment['created_by_role'] ?? null,
                        'cancellation_reason' => $appointment['cancellation_reason'] ?? null,
                        'cancellation_comment' => $appointment['cancellation_comment'] ?? null,
                        'cancellation_photo_document_id' => $appointment['cancellation_photo_document_id'] ?? null,
                        'actor_display_label' => $actorDisplayLabel,
                    ],
                    $canceledBy,
                    $actorDisplayLabel,
                    $actorId
                );
                break;

            case 'expired':
                if ($patientId) {
                    $this->notificationService->notifyAppointmentExpired($appointmentId, [
                        'patient_id' => $patientId,
                        'patient_phone' => $patientPhone,
                    ]);
                }
                break;
                
            case 'refused':
                // L'infirmier refuse le RDV
                if (!empty($appointment['assigned_nurse_id'])) {
                    $this->notificationService->notifyAppointmentRefused(
                        $appointmentId,
                        $appointment['assigned_nurse_id'],
                        [
                            'patient_first_name' => $patientFirstName,
                            'patient_last_name' => $patientLastName,
                            'scheduled_at' => $appointment['scheduled_at'],
                            'category_name' => $appointment['category_name'] ?? 'Soins infirmiers',
                            'type' => $appointment['type'] ?? 'nursing',
                            'form_data' => $formData,
                        ]
                    );
                }
                break;
        }
    }

    public function notifyActorAppointmentRedispatched(
        string $appointmentId,
        array $appointmentRow,
        string $actorId,
        string $actorRole
    ): void {
        try {
            $formData = null;
            if (!empty($appointmentRow['form_data_encrypted']) && !empty($appointmentRow['form_data_dek'])) {
                try {
                    $json = $this->crypto->decryptField(
                        $appointmentRow['form_data_encrypted'],
                        $appointmentRow['form_data_dek']
                    );
                    $decoded = json_decode($json, true);
                    $formData = is_array($decoded) ? $decoded : null;
                } catch (Throwable $e) {
                    $formData = null;
                }
            }
            $dtLabel = NotificationMessageFormatter::whenShort(
                $formData,
                $appointmentRow['scheduled_at'] ?? null
            );
            if ($dtLabel === '') {
                $dtLabel = 'date à confirmer';
            }
            $patientLabel = 'le patient';
            $pid = $appointmentRow['patient_id'] ?? null;
            if ($pid) {
                require_once __DIR__ . '/../../models/User.php';
                $um = new User();
                $pat = $um->getById((string) $pid, 'system', 'system');
                if ($pat) {
                    $fn = trim((string) ($pat['first_name'] ?? ''));
                    $ln = trim((string) ($pat['last_name'] ?? ''));
                    $n = trim($fn . ' ' . $ln);
                    if ($n !== '') {
                        $patientLabel = $n;
                    }
                }
            }
            $peers = 'd\'autres professionnels de la zone';
            if ($actorRole === 'nurse' && (($appointmentRow['type'] ?? '') === 'nursing')) {
                $peers = 'd\'autres infirmiers';
            } elseif (in_array($actorRole, ['lab', 'subaccount'], true) && (($appointmentRow['type'] ?? '') === 'blood_test')) {
                $peers = 'd\'autres laboratoires';
            }
            $message = NotificationMessageFormatter::joinParts([
                'Redispatché',
                $patientLabel !== 'le patient' ? $patientLabel : null,
                $dtLabel,
            ]) . ' · proposé à ' . $peers . '.';
            $this->notificationService->createNotification(
                $actorId,
                'appointment_redispatched',
                'RDV redispatché',
                $message,
                ['appointment_id' => $appointmentId]
            );
        } catch (Throwable $e) {
            error_log('notifyActorAppointmentRedispatched: ' . $e->getMessage());
        }
    }

    private function getActorDisplayLabel(string $actorId, string $actorRole): string
    {
        try {
            require_once __DIR__ . '/../../models/User.php';
            $userModel = new User();
            $actor = $userModel->getById($actorId, 'system', 'system');
            if (!$actor) {
                return $actorRole === 'nurse' ? "L'infirmier" : ($actorRole === 'preleveur' ? 'Le préleveur' : 'Le laboratoire');
            }
            $first = trim((string)($actor['first_name'] ?? ''));
            $last = trim((string)($actor['last_name'] ?? ''));
            $name = trim($first . ' ' . $last);
            $company = isset($actor['company_name']) ? trim((string)$actor['company_name']) : '';
            if ($actorRole === 'lab' || $actorRole === 'subaccount') {
                $labName = $company !== '' ? $company : ($name !== '' ? $name : 'Ce laboratoire');
                return 'Le laboratoire ' . $labName;
            }
            if ($actorRole === 'preleveur') {
                return 'Le préleveur ' . ($name !== '' ? $name : '');
            }
            if ($actorRole === 'nurse') {
                return ($name !== '' ? "L'infirmier " . $name : "L'infirmier");
            }
        } catch (Exception $e) {
            // Ignorer
        }
        return $actorRole === 'nurse' ? "L'infirmier" : ($actorRole === 'preleveur' ? 'Le préleveur' : 'Le laboratoire');
    }

    /**
     * Notifie tous les administrateurs super_admin de la création d'un nouveau rendez-vous
     */
    private function notifyAllAdmins(string $appointmentId, string $appointmentType, string $scheduledAt, ?array $formData = null): void
    {
        try {
            // Récupérer tous les profils avec le rôle super_admin
            $stmt = $this->db->prepare('
                SELECT id 
                FROM profiles 
                WHERE role = ? 
                AND id IS NOT NULL
            ');
            $stmt->execute(['super_admin']);
            $admins = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Type de rendez-vous en français pour le message
            $typeLabel = NotificationMessageFormatter::appointmentTypeLabel($appointmentType);
            $brandName = '';
            if (is_array($formData) && !empty($formData['preferred_lab_brand_name'])) {
                $brandName = trim((string) $formData['preferred_lab_brand_name']);
            }
            $isBrandChoice = is_array($formData)
                && ($formData['lab_preference_mode'] ?? '') === 'brand_choice'
                && $brandName !== '';
            
            // Créer une notification pour chaque admin
            foreach ($admins as $admin) {
                try {
                    $title = $isBrandChoice ? 'Prélèvement — marque à traiter' : 'Nouveau RDV';
                    $message = $isBrandChoice
                        ? NotificationMessageFormatter::joinParts(['Marque', $brandName, $typeLabel])
                        : NotificationMessageFormatter::joinParts(['À traiter', $typeLabel]);
                    $this->notificationService->createNotification(
                        $admin['id'],
                        $isBrandChoice ? 'blood_test_brand_to_process' : 'new_appointment_created',
                        $title,
                        $message,
                        [
                            'appointment_id' => $appointmentId,
                            'type' => $appointmentType,
                            'scheduled_at' => $scheduledAt,
                            'preferred_lab_brand_name' => $brandName !== '' ? $brandName : null,
                        ]
                    );
                } catch (Exception $e) {
                    // Logger l'erreur mais continuer avec les autres admins
                    error_log("Erreur lors de la notification admin {$admin['id']}: " . $e->getMessage());
                }
            }

            try {
                require_once __DIR__ . '/../AdminEmailNotifier.php';
                AdminEmailNotifier::newAppointment($appointmentId, $appointmentType, $scheduledAt, $formData);
            } catch (Throwable $e) {
                error_log('notifyAllAdmins admin email: ' . $e->getMessage());
            }
        } catch (Exception $e) {
            // Logger l'erreur mais ne pas bloquer la création du rendez-vous
            error_log("Erreur lors de la récupération des admins: " . $e->getMessage());
        }
    }
}

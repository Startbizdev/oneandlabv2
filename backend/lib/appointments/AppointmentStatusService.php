<?php

declare(strict_types=1);

require_once __DIR__ . '/../Validation.php';
require_once __DIR__ . '/../PendingOfferExpiry.php';
require_once __DIR__ . '/../DatabaseTransaction.php';
require_once __DIR__ . '/../NurseQuotaGuard.php';
require_once __DIR__ . '/../SubscriptionService.php';
require_once __DIR__ . '/../admin/AdminDispatchEventLogger.php';
require_once __DIR__ . '/AppointmentNotificationService.php';
require_once __DIR__ . '/AppointmentDispatchService.php';

/**
 * Transitions de statut et redispatch.
 */
final class AppointmentStatusService
{
    public function __construct(
        private PDO $db,
        private Crypto $crypto,
        private Logger $logger,
        private AdminDispatchEventLogger $dispatchEventLogger,
        private AppointmentNotificationService $appointmentNotificationService,
        private AppointmentDispatchService $dispatchService,
    ) {
    }

    private function hasColumn(string $table, string $column): bool
    {
        static $cache = [];
        $key = $table . '.' . $column;
        if (array_key_exists($key, $cache)) {
            return $cache[$key];
        }
        try {
            $stmt = $this->db->prepare('
                SELECT COUNT(*) FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
            ');
            $stmt->execute([$table, $column]);
            $cache[$key] = ((int) $stmt->fetchColumn()) > 0;
        } catch (Throwable $e) {
            $cache[$key] = false;
        }
        return $cache[$key];
    }

    private function generateUUID(): string
    {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }

    public function updateStatus(
        string $id,
        string $newStatus,
        string $actorId,
        string $actorRole,
        ?string $note = null,
        bool $redispatch = false,
        ?string $cancellationReason = null,
        ?string $cancellationComment = null,
        ?string $cancellationPhotoDocumentId = null
    ): ?string {
        // Récupérer le statut actuel et le type
        $stmt = $this->db->prepare('SELECT status, type, assigned_nurse_id, assigned_lab_id, assigned_to, location_lat, location_lng, scheduled_at, patient_id, form_data_encrypted, form_data_dek, creation_batch_id FROM appointments WHERE id = ?');
        $stmt->execute([$id]);
        $appointment = $stmt->fetch();
        
        if (!$appointment) {
            throw new Exception('Rendez-vous introuvable');
        }
        
        $oldStatus = $appointment['status'];

        if ($appointment['type'] === 'blood_test' && $actorRole === 'nurse' && in_array($newStatus, ['confirmed', 'refused'], true)) {
            throw new Exception('Les demandes de prise de sang sont acceptées ou refusées par les laboratoires, pas par l\'infirmier.');
        }

        /**
         * Refus d'une offre entrante : retirer le professionnel des propositions sans passer le RDV en "refused"
         * (le patient reste en attente, d'autres peuvent accepter).
         */
        if (
            $newStatus === 'refused'
            && $oldStatus === 'pending'
            && !$redispatch
        ) {
            $canDeclineOffer = false;
            if ($appointment['type'] === 'nursing' && empty($appointment['assigned_nurse_id']) && $actorRole === 'nurse') {
                $canDeclineOffer = true;
            }
            if (
                $appointment['type'] === 'blood_test'
                && empty($appointment['assigned_lab_id'])
                && in_array($actorRole, ['lab', 'subaccount', 'preleveur'], true)
            ) {
                $canDeclineOffer = true;
            }
            if ($canDeclineOffer) {
                $delOffer = $this->db->prepare('DELETE FROM appointment_offers WHERE appointment_id = ? AND profile_id = ?');
                $delOffer->execute([$id, $actorId]);
                if ($delOffer->rowCount() === 0) {
                    throw new Exception('Ce rendez-vous ne vous est pas proposé ou n\'est plus disponible.');
                }
                $this->logger->log($actorId, $actorRole, 'update', 'appointment', $id, [
                    'action' => 'decline_offer',
                    'appointment_status_unchanged' => 'pending',
                ]);
                $this->dispatchEventLogger->log(
                    $id,
                    'offer_declined',
                    $actorId,
                    $actorRole,
                    $actorId,
                    ['appointment_type' => $appointment['type'] ?? null]
                );
                return 'declined_offer';
            }
        }
        
        // Préparer la requête de mise à jour
        $updateFields = ['status = ?', 'updated_at = NOW()'];
        $params = [$newStatus];
        $republishedOfferExpiresAt = null;
        if (
            $redispatch
            && $newStatus === 'pending'
            && $this->hasColumn('appointments', 'pending_offer_expires_at')
        ) {
            $republishedOfferExpiresAt = PendingOfferExpiry::formatSqlDateTime(
                PendingOfferExpiry::computeRepublishedExpiresAt()
            );
            $updateFields[] = 'pending_offer_expires_at = ?';
            $params[] = $republishedOfferExpiresAt;
        }

        // Admin : repasser en attente → redémarrer la fenêtre d'offre (TTL 2 h depuis created_at)
        if (
            $newStatus === 'pending'
            && $oldStatus !== 'pending'
            && $actorRole === 'super_admin'
            && !$redispatch
        ) {
            $updateFields[] = 'created_at = NOW()';
        }
        
        // Annulation par un pro : enregistrer motif, commentaire, photo
        if ($newStatus === 'canceled') {
            $updateFields[] = 'canceled_by = ?';
            $params[] = $actorId;
            $updateFields[] = 'canceled_at = NOW()';
            $updateFields[] = 'cancellation_reason = ?';
            $params[] = $cancellationReason;
            $updateFields[] = 'cancellation_comment = ?';
            $params[] = $cancellationComment ?? '';
            $updateFields[] = 'cancellation_photo_document_id = ?';
            $params[] = $cancellationPhotoDocumentId;
        }
        
        // Si c'est un redispatch, on remet les assignations à NULL et on relance le dispatch
        $redispatchPreviousAssigneeId = null;
        $redispatchPreviousAssigneeRole = null;
        if ($redispatch && $newStatus === 'pending') {
            $allowedRedispatchFrom = ['confirmed', 'planned', 'inProgress'];
            if ($actorRole === 'super_admin') {
                $allowedRedispatchFrom[] = 'canceled';
                $allowedRedispatchFrom[] = 'cancelled';
            }
            if (!in_array($oldStatus, $allowedRedispatchFrom, true)) {
                throw new Exception('Seuls les rendez-vous confirmés, planifiés, en cours ou annulés peuvent être redispatchés.');
            }

            if ($actorRole === 'super_admin') {
                if ($appointment['type'] === 'nursing') {
                    if (!empty($appointment['assigned_nurse_id'])) {
                        $redispatchPreviousAssigneeId = (string) $appointment['assigned_nurse_id'];
                        $redispatchPreviousAssigneeRole = 'nurse';
                    }
                    $updateFields[] = 'assigned_nurse_id = NULL';
                    $updateFields[] = 'nurse_share_released_at = NULL';
                } elseif ($appointment['type'] === 'blood_test') {
                    if (!empty($appointment['assigned_lab_id'])) {
                        $redispatchPreviousAssigneeId = (string) $appointment['assigned_lab_id'];
                        $redispatchPreviousAssigneeRole = 'lab';
                    } elseif (!empty($appointment['assigned_to'])) {
                        $redispatchPreviousAssigneeId = (string) $appointment['assigned_to'];
                        $redispatchPreviousAssigneeRole = 'preleveur';
                    }
                    $updateFields[] = 'assigned_lab_id = NULL';
                    $updateFields[] = 'assigned_to = NULL';
                }
                if ($oldStatus === 'canceled') {
                    $updateFields[] = 'canceled_by = NULL';
                    $updateFields[] = 'canceled_at = NULL';
                    $updateFields[] = 'cancellation_reason = NULL';
                    $updateFields[] = 'cancellation_comment = NULL';
                    $updateFields[] = 'cancellation_photo_document_id = NULL';
                }
                $updateFields[] = 'created_at = NOW()';
            } elseif ($appointment['type'] === 'nursing') {
                if ((string) $appointment['assigned_nurse_id'] !== (string) $actorId) {
                    throw new Exception('Vous ne pouvez redispatcher que les rendez-vous qui vous sont assignés');
                }
                $updateFields[] = 'assigned_nurse_id = NULL';
                $updateFields[] = 'nurse_share_released_at = NULL';
            } else if ($appointment['type'] === 'blood_test') {
                if ((string) $appointment['assigned_lab_id'] !== (string) $actorId) {
                    throw new Exception('Vous ne pouvez redispatcher que les rendez-vous qui vous sont assignés');
                }
                $updateFields[] = 'assigned_lab_id = NULL';
            }
        }
        
        // Si le statut passe à "confirmed" et que l'acteur est un infirmier, l'assigner au rendez-vous
        if ($newStatus === 'confirmed' && $actorRole === 'nurse' && $appointment['type'] === 'nursing') {
            $updateFields[] = 'assigned_nurse_id = ?';
            $params[] = $actorId;
        }
        
        // Si le statut passe à "confirmed" et que l'acteur est un lab/subaccount, l'assigner au rendez-vous
        if ($newStatus === 'confirmed' && in_array($actorRole, ['lab', 'subaccount']) && $appointment['type'] === 'blood_test') {
            $updateFields[] = 'assigned_lab_id = ?';
            $params[] = $actorId;
        }

        $preleveurLabId = null;
        if ($newStatus === 'confirmed' && $actorRole === 'preleveur' && $appointment['type'] === 'blood_test') {
            $prelStmt = $this->db->prepare("SELECT lab_id FROM profiles WHERE id = ? AND role = 'preleveur' LIMIT 1");
            $prelStmt->execute([$actorId]);
            $preleveurLabId = (string) ($prelStmt->fetch(PDO::FETCH_ASSOC)['lab_id'] ?? '');
            if ($preleveurLabId === '') {
                throw new Exception('Préleveur sans laboratoire rattaché.');
            }
            $updateFields[] = 'assigned_to = ?';
            $params[] = $actorId;
            if (empty($appointment['assigned_lab_id'])) {
                $updateFields[] = 'assigned_lab_id = ?';
                $params[] = $preleveurLabId;
            }
            $updateFields[] = 'assigned_nurse_id = NULL';
        }
        
        // Quand le RDV est marqué terminé, enregistrer completed_at
        if ($newStatus === 'completed') {
            $updateFields[] = 'completed_at = NOW()';
        }

        if ($newStatus === 'confirmed' && ($appointment['type'] ?? '') === 'nursing') {
            $updateFields[] = 'nurse_share_released_at = NULL';
        }
        
        // Ajouter l'ID à la fin des paramètres (WHERE)
        $params[] = $id;

        $atomicNurseConfirm = !$redispatch && $newStatus === 'confirmed' && $actorRole === 'nurse' && $appointment['type'] === 'nursing';
        $atomicLabConfirm = !$redispatch && $newStatus === 'confirmed' && in_array($actorRole, ['lab', 'subaccount'], true) && $appointment['type'] === 'blood_test';
        $atomicPreleveurConfirm = !$redispatch && $newStatus === 'confirmed' && $actorRole === 'preleveur' && $appointment['type'] === 'blood_test';

        $whereSql = 'WHERE id = ?';
        $whereParams = [$id];
        if ($atomicNurseConfirm) {
            if ($oldStatus !== 'pending') {
                throw new Exception('Ce rendez-vous ne peut plus être accepté.');
            }
            if (!empty($appointment['assigned_nurse_id']) && (string) $appointment['assigned_nurse_id'] !== (string) $actorId) {
                throw new Exception('Ce rendez-vous a déjà été accepté par un autre infirmier.');
            }
            $whereSql = 'WHERE id = ? AND status = ? AND (assigned_nurse_id IS NULL OR assigned_nurse_id = ?)';
            $whereParams = [$id, 'pending', $actorId];
        } elseif ($atomicLabConfirm) {
            if ($oldStatus !== 'pending') {
                throw new Exception('Ce rendez-vous ne peut plus être accepté.');
            }
            if (!empty($appointment['assigned_lab_id']) && (string) $appointment['assigned_lab_id'] !== (string) $actorId) {
                throw new Exception('Ce rendez-vous a déjà été accepté par un autre professionnel.');
            }
            $whereSql = 'WHERE id = ? AND status = ? AND (assigned_lab_id IS NULL OR assigned_lab_id = ?)';
            $whereParams = [$id, 'pending', $actorId];
        } elseif ($atomicPreleveurConfirm) {
            if ($oldStatus !== 'pending') {
                throw new Exception('Ce rendez-vous ne peut plus être accepté.');
            }
            if (!empty($appointment['assigned_to']) && (string) $appointment['assigned_to'] !== (string) $actorId) {
                throw new Exception('Ce rendez-vous a déjà été accepté par un autre préleveur.');
            }
            if (!empty($appointment['assigned_lab_id']) && (string) $appointment['assigned_lab_id'] !== (string) $preleveurLabId) {
                throw new Exception('Ce rendez-vous appartient à un autre laboratoire.');
            }
            $whereSql = 'WHERE id = ? AND status = ? AND (assigned_to IS NULL OR assigned_to = ? OR assigned_to = \'\') AND (assigned_lab_id IS NULL OR assigned_lab_id = ? OR assigned_lab_id = \'\')';
            $whereParams = [$id, 'pending', $actorId, $preleveurLabId];
        }

        $setParams = array_slice($params, 0, -1);
        $finalParams = array_merge($setParams, $whereParams);

        $writeStatus = function () use ($updateFields, $whereSql, $finalParams, $atomicNurseConfirm, $atomicLabConfirm, $atomicPreleveurConfirm, $id, $actorId, $actorRole, $appointment, $newStatus, $preleveurLabId, $redispatch, $note, $oldStatus, $republishedOfferExpiresAt): array {
        // Mettre à jour le statut (et potentiellement l'assignation)
        $sql = 'UPDATE appointments SET ' . implode(', ', $updateFields) . ' ' . $whereSql;
        $stmt = $this->db->prepare($sql);
        $stmt->execute($finalParams);
        $mainUpdateAffected = $stmt->rowCount();

        if (($atomicNurseConfirm || $atomicLabConfirm || $atomicPreleveurConfirm) && $mainUpdateAffected === 0) {
            throw new Exception('Ce rendez-vous n\'est plus disponible (déjà accepté par un autre professionnel).');
        }

        if (($atomicNurseConfirm || $atomicLabConfirm || $atomicPreleveurConfirm) && $mainUpdateAffected > 0) {
            $delMainOffers = $this->db->prepare('DELETE FROM appointment_offers WHERE appointment_id = ?');
            $delMainOffers->execute([$id]);
            $this->dispatchEventLogger->log(
                $id,
                'offer_accepted',
                $actorId,
                $actorRole,
                $actorId,
                [
                    'appointment_type' => $appointment['type'] ?? null,
                    'new_status' => $newStatus,
                ]
            );
        }

        /** @var list<string> */
        $batchSiblingIdsConfirmed = [];
        // Lot legacy : plusieurs lignes `appointments` partagent `creation_batch_id` (≠ un seul RDV avec blood_test_items[]).
        $propagateBloodTestLegacyBatch = false;
        if (($atomicLabConfirm || $atomicPreleveurConfirm) && $mainUpdateAffected > 0) {
            $batchIdBt = $appointment['creation_batch_id'] ?? null;
            $patientIdBt = $appointment['patient_id'] ?? null;
            if (!empty($batchIdBt) && !empty($patientIdBt)) {
                $cntSibBt = $this->db->prepare(
                    'SELECT COUNT(*) FROM appointments
                     WHERE creation_batch_id = ? AND patient_id = ? AND type = ? AND id != ?'
                );
                $cntSibBt->execute([$batchIdBt, $patientIdBt, 'blood_test', $id]);
                $propagateBloodTestLegacyBatch = ((int) $cntSibBt->fetchColumn()) > 0;
            }
        }
        if ($atomicNurseConfirm && $mainUpdateAffected > 0) {
            $batchId = $appointment['creation_batch_id'] ?? null;
            $patientId = $appointment['patient_id'] ?? null;
            if (!empty($batchId) && !empty($patientId)) {
                $sibStmt = $this->db->prepare('
                    SELECT id FROM appointments
                    WHERE creation_batch_id = ? AND patient_id = ? AND type = ? AND id != ?
                    AND status = ? AND (assigned_nurse_id IS NULL OR assigned_nurse_id = \'\')
                ');
                $sibStmt->execute([$batchId, $patientId, 'nursing', $id, 'pending']);
                while ($sib = $sibStmt->fetch(PDO::FETCH_ASSOC)) {
                    $sibId = (string) $sib['id'];
                    $updSib = $this->db->prepare('
                        UPDATE appointments SET status = ?, assigned_nurse_id = ?, nurse_share_released_at = NULL, updated_at = NOW()
                        WHERE id = ? AND status = ? AND (assigned_nurse_id IS NULL OR assigned_nurse_id = \'\')
                    ');
                    $updSib->execute(['confirmed', $actorId, $sibId, 'pending']);
                    if ($updSib->rowCount() > 0) {
                        $batchSiblingIdsConfirmed[] = $sibId;
                        $delSibOffers = $this->db->prepare('DELETE FROM appointment_offers WHERE appointment_id = ?');
                        $delSibOffers->execute([$sibId]);
                        $histSibId = $this->generateUUID();
                        $stmtHist = $this->db->prepare('
                            INSERT INTO appointment_status_updates 
                            (id, appointment_id, status, actor_id, actor_role, note, created_at)
                            VALUES (?, ?, ?, ?, ?, ?, NOW())
                        ');
                        $stmtHist->execute([
                            $histSibId,
                            $sibId,
                            'confirmed',
                            $actorId,
                            $actorRole,
                            'Confirmation lot multisoins (même prise en charge)',
                        ]);
                        $this->logger->log(
                            $actorId,
                            $actorRole,
                            'update',
                            'appointment',
                            $sibId,
                            [
                                'old_status' => 'pending',
                                'new_status' => 'confirmed',
                                'assigned' => true,
                                'batch_multisoins' => true,
                            ]
                        );
                    }
                }
            }
        }

        if ($propagateBloodTestLegacyBatch && $atomicLabConfirm && $mainUpdateAffected > 0) {
            $batchId = $appointment['creation_batch_id'] ?? null;
            $patientId = $appointment['patient_id'] ?? null;
            if (!empty($batchId) && !empty($patientId)) {
                $sibStmt = $this->db->prepare('
                    SELECT id FROM appointments
                    WHERE creation_batch_id = ? AND patient_id = ? AND type = ? AND id != ?
                    AND status = ? AND (assigned_lab_id IS NULL OR assigned_lab_id = \'\')
                ');
                $sibStmt->execute([$batchId, $patientId, 'blood_test', $id, 'pending']);
                while ($sib = $sibStmt->fetch(PDO::FETCH_ASSOC)) {
                    $sibId = (string) $sib['id'];
                    $updSib = $this->db->prepare('
                        UPDATE appointments SET status = ?, assigned_lab_id = ?, updated_at = NOW()
                        WHERE id = ? AND status = ? AND (assigned_lab_id IS NULL OR assigned_lab_id = \'\')
                    ');
                    $updSib->execute(['confirmed', $actorId, $sibId, 'pending']);
                    if ($updSib->rowCount() > 0) {
                        $batchSiblingIdsConfirmed[] = $sibId;
                        $delSibOffers = $this->db->prepare('DELETE FROM appointment_offers WHERE appointment_id = ?');
                        $delSibOffers->execute([$sibId]);
                        $histSibId = $this->generateUUID();
                        $stmtHist = $this->db->prepare('
                            INSERT INTO appointment_status_updates 
                            (id, appointment_id, status, actor_id, actor_role, note, created_at)
                            VALUES (?, ?, ?, ?, ?, ?, NOW())
                        ');
                        $stmtHist->execute([
                            $histSibId,
                            $sibId,
                            'confirmed',
                            $actorId,
                            $actorRole,
                            'Confirmation lot multisoins (même prise en charge — prise de sang)',
                        ]);
                        $this->logger->log(
                            $actorId,
                            $actorRole,
                            'update',
                            'appointment',
                            $sibId,
                            [
                                'old_status' => 'pending',
                                'new_status' => 'confirmed',
                                'assigned' => true,
                                'batch_multisoins' => true,
                            ]
                        );
                    }
                }
            }
        }

        if ($propagateBloodTestLegacyBatch && $atomicPreleveurConfirm && $mainUpdateAffected > 0) {
            $batchId = $appointment['creation_batch_id'] ?? null;
            $patientId = $appointment['patient_id'] ?? null;
            if (!empty($batchId) && !empty($patientId) && !empty($preleveurLabId)) {
                $sibStmt = $this->db->prepare('
                    SELECT id FROM appointments
                    WHERE creation_batch_id = ? AND patient_id = ? AND type = ? AND id != ?
                    AND status = ?
                    AND (assigned_to IS NULL OR assigned_to = \'\')
                    AND (assigned_lab_id IS NULL OR assigned_lab_id = ? OR assigned_lab_id = \'\')
                ');
                $sibStmt->execute([$batchId, $patientId, 'blood_test', $id, 'pending', $preleveurLabId]);
                while ($sib = $sibStmt->fetch(PDO::FETCH_ASSOC)) {
                    $sibId = (string) $sib['id'];
                    $updSib = $this->db->prepare('
                        UPDATE appointments SET status = ?, assigned_lab_id = ?, assigned_to = ?, assigned_nurse_id = NULL, updated_at = NOW()
                        WHERE id = ? AND status = ?
                        AND (assigned_to IS NULL OR assigned_to = \'\')
                        AND (assigned_lab_id IS NULL OR assigned_lab_id = ? OR assigned_lab_id = \'\')
                    ');
                    $updSib->execute(['confirmed', $preleveurLabId, $actorId, $sibId, 'pending', $preleveurLabId]);
                    if ($updSib->rowCount() > 0) {
                        $batchSiblingIdsConfirmed[] = $sibId;
                        $delSibOffers = $this->db->prepare('DELETE FROM appointment_offers WHERE appointment_id = ?');
                        $delSibOffers->execute([$sibId]);
                        $histSibId = $this->generateUUID();
                        $stmtHist = $this->db->prepare('
                            INSERT INTO appointment_status_updates 
                            (id, appointment_id, status, actor_id, actor_role, note, created_at)
                            VALUES (?, ?, ?, ?, ?, ?, NOW())
                        ');
                        $stmtHist->execute([
                            $histSibId,
                            $sibId,
                            'confirmed',
                            $actorId,
                            $actorRole,
                            'Confirmation lot multisoins (même prise en charge — préleveur)',
                        ]);
                        $this->logger->log(
                            $actorId,
                            $actorRole,
                            'update',
                            'appointment',
                            $sibId,
                            [
                                'old_status' => 'pending',
                                'new_status' => 'confirmed',
                                'assigned' => true,
                                'batch_multisoins' => true,
                            ]
                        );
                    }
                }
            }
        }
        
        // Enregistrer dans l'historique
        $updateId = $this->generateUUID();
        $noteToSave = $redispatch
            ? ($actorRole === 'super_admin'
                ? 'Rendez-vous redispatché par l\'administration'
                : 'Rendez-vous redispatché par le professionnel')
            : $note;
        $stmt = $this->db->prepare('
            INSERT INTO appointment_status_updates 
            (id, appointment_id, status, actor_id, actor_role, note, created_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
        ');
        $stmt->execute([$updateId, $id, $newStatus, $actorId, $actorRole, $noteToSave]);
        
        // Logger le changement
        $this->logger->log(
            $actorId,
            $actorRole,
            'update',
            'appointment',
            $id,
            [
                'old_status' => $oldStatus, 
                'new_status' => $newStatus, 
                'assigned' => in_array($actorRole, ['nurse', 'lab', 'subaccount']),
                'redispatch' => $redispatch
            ]
        );
        
        return $batchSiblingIdsConfirmed;
        };

        if ($atomicNurseConfirm) {
            require_once __DIR__ . '/../SubscriptionService.php';
            $plan = (new SubscriptionService($this->db))->getActiveNursePlan($actorId);
            $planLimits = require __DIR__ . '/../../config/plan-limits.php';
            $nurseLimits = $planLimits['nurse'][$plan] ?? $planLimits['nurse']['discovery'];
            $maximum = $nurseLimits['max_appointments_per_month'];
            $batchSiblingIdsConfirmed = NurseQuotaGuard::run($this->db, $actorId, $maximum, $writeStatus);
        } else {
            $batchSiblingIdsConfirmed = DatabaseTransaction::run($this->db, $writeStatus);
        }

        // Si redispatch, relancer le dispatch géographique (exclure l'acteur des offres et notifications)
        if ($redispatch && $newStatus === 'pending') {
            $this->dispatchEventLogger->log(
                $id,
                'redispatch',
                $actorId,
                $actorRole,
                null,
                [
                    'appointment_type' => $appointment['type'] ?? null,
                    'old_status' => $oldStatus,
                ]
            );
            $formDataForDispatch = [];
            if (!empty($appointment['form_data_encrypted']) && !empty($appointment['form_data_dek'])) {
                try {
                    $formDataJson = $this->crypto->decryptField(
                        $appointment['form_data_encrypted'],
                        $appointment['form_data_dek']
                    );
                    $formDataForDispatch = json_decode($formDataJson, true) ?? [];
                } catch (Throwable $e) {
                    $formDataForDispatch = [];
                }
            }
            $excludeProfileId = $actorRole === 'super_admin'
                ? ($redispatchPreviousAssigneeId ?: null)
                : $actorId;
            if ($actorRole === 'super_admin') {
                $delOffersAdmin = $this->db->prepare('DELETE FROM appointment_offers WHERE appointment_id = ?');
                $delOffersAdmin->execute([$id]);
            }
            $this->dispatchService->dispatchGeographic(
                $id,
                $appointment['type'],
                (float) $appointment['location_lat'],
                (float) $appointment['location_lng'],
                $appointment['scheduled_at'] ?? null,
                $formDataForDispatch,
                $excludeProfileId
            );
            if ($actorRole !== 'super_admin') {
                $this->appointmentNotificationService->notifyActorAppointmentRedispatched($id, $appointment, $actorId, $actorRole);
            }

            $revokeProfileId = $actorRole === 'super_admin' ? $redispatchPreviousAssigneeId : $actorId;
            $revokeProfileRole = $actorRole === 'super_admin' ? $redispatchPreviousAssigneeRole : $actorRole;
            if (
                !empty($appointment['patient_id'])
                && !empty($revokeProfileId)
                && in_array($revokeProfileRole, ['nurse', 'lab', 'subaccount'], true)
            ) {
                require_once __DIR__ . '/../../models/User.php';
                try {
                    $userModel = new User();
                    $userModel->revokePatientProfessionalAccessAfterRedispatch(
                        (string) $appointment['patient_id'],
                        (string) $revokeProfileId,
                        (string) $revokeProfileRole
                    );
                } catch (Throwable $e) {
                    error_log('PatientProfessionalAccess (redispatch revoke): ' . $e->getMessage());
                }
            }

            // Lot multisoins : même redispatch pour les autres RDV nursing assignés au même infirmier
            $batchRedispatchNurseId = $actorRole === 'nurse'
                ? $actorId
                : ($actorRole === 'super_admin' ? $redispatchPreviousAssigneeId : null);
            if ($appointment['type'] === 'nursing' && !empty($batchRedispatchNurseId)) {
                $batchIdRd = $appointment['creation_batch_id'] ?? null;
                $patientIdRd = $appointment['patient_id'] ?? null;
                if (!empty($batchIdRd) && !empty($patientIdRd)) {
                    $sibRd = $this->db->prepare(
                        'SELECT id, form_data_encrypted, form_data_dek, location_lat, location_lng, scheduled_at, status
                         FROM appointments
                         WHERE creation_batch_id = ? AND patient_id = ? AND type = ?
                         AND id != ?
                         AND assigned_nurse_id = ?
                         AND status IN (\'confirmed\', \'planned\', \'inProgress\')'
                    );
                    $sibRd->execute([$batchIdRd, $patientIdRd, 'nursing', $id, $batchRedispatchNurseId]);
                    while ($sibRow = $sibRd->fetch(PDO::FETCH_ASSOC)) {
                        $sibId = (string) $sibRow['id'];
                        $siblingExpirySql = $republishedOfferExpiresAt !== null
                            ? ', pending_offer_expires_at = ?'
                            : '';
                        $updSib = $this->db->prepare(
                            'UPDATE appointments SET status = ?, assigned_nurse_id = NULL, nurse_share_released_at = NULL'
                            . $siblingExpirySql . ', updated_at = NOW()
                             WHERE id = ? AND assigned_nurse_id = ? AND status IN (\'confirmed\', \'planned\', \'inProgress\')'
                        );
                        $siblingUpdateParams = ['pending'];
                        if ($republishedOfferExpiresAt !== null) {
                            $siblingUpdateParams[] = $republishedOfferExpiresAt;
                        }
                        $siblingUpdateParams[] = $sibId;
                        $siblingUpdateParams[] = $batchRedispatchNurseId;
                        $updSib->execute($siblingUpdateParams);
                        if ($updSib->rowCount() === 0) {
                            continue;
                        }
                        $delSib = $this->db->prepare('DELETE FROM appointment_offers WHERE appointment_id = ?');
                        $delSib->execute([$sibId]);
                        $histSibRd = $this->generateUUID();
                        $stmtHistRd = $this->db->prepare(
                            'INSERT INTO appointment_status_updates
                            (id, appointment_id, status, actor_id, actor_role, note, created_at)
                            VALUES (?, ?, ?, ?, ?, ?, NOW())'
                        );
                        $stmtHistRd->execute([
                            $histSibRd,
                            $sibId,
                            'pending',
                            $actorId,
                            $actorRole,
                            'Rendez-vous redispatché par le professionnel (lot multisoins)',
                        ]);
                        $this->logger->log($actorId, $actorRole, 'update', 'appointment', $sibId, [
                            'old_status' => $sibRow['status'] ?? '',
                            'new_status' => 'pending',
                            'redispatch' => true,
                            'batch_multisoins' => true,
                        ]);
                        $formSib = [];
                        if (!empty($sibRow['form_data_encrypted']) && !empty($sibRow['form_data_dek'])) {
                            try {
                                $fj = $this->crypto->decryptField(
                                    $sibRow['form_data_encrypted'],
                                    $sibRow['form_data_dek']
                                );
                                $formSib = json_decode($fj, true) ?? [];
                            } catch (Throwable $e) {
                                $formSib = [];
                            }
                        }
                        $this->dispatchService->dispatchGeographic(
                            $sibId,
                            'nursing',
                            (float) $sibRow['location_lat'],
                            (float) $sibRow['location_lng'],
                            $sibRow['scheduled_at'] ?? null,
                            $formSib,
                            $batchRedispatchNurseId
                        );
                        if ($actorRole !== 'super_admin') {
                            $this->appointmentNotificationService->notifyActorAppointmentRedispatched($sibId, array_merge($appointment, [
                                'id' => $sibId,
                                'scheduled_at' => $sibRow['scheduled_at'],
                                'form_data_encrypted' => $sibRow['form_data_encrypted'] ?? null,
                                'form_data_dek' => $sibRow['form_data_dek'] ?? null,
                            ]), $actorId, $actorRole);
                        }
                    }
                }
            }
        }
        
        // Envoyer notifications selon le nouveau statut (sauf pour redispatch)
        if ($newStatus === 'expired' && $oldStatus === 'pending') {
            $delExpiredOffers = $this->db->prepare('DELETE FROM appointment_offers WHERE appointment_id = ?');
            $delExpiredOffers->execute([$id]);
        }

        if (!$redispatch) {
            $this->appointmentNotificationService->sendStatusNotifications($id, $newStatus, $actorId, $actorRole);
        }

        // Partage lien confrère : l’infirmier ayant repassé le RDV en attente est informé de l’acceptation + prénom/nom du confrère (cloche non liée au détail)
        if (
            !$redispatch
            && $newStatus === 'confirmed'
            && $actorRole === 'nurse'
            && ($appointment['type'] ?? '') === 'nursing'
        ) {
            $this->appointmentNotificationService->notifyShareLinkSharerNurseIfNeeded($id, $actorId);
        }

        // Lien patient ↔ professionnel lors de l’acceptation (RDV confirmé avec patient)
        if ($newStatus === 'confirmed' && !empty($appointment['patient_id']) && in_array($actorRole, ['nurse', 'lab', 'subaccount', 'pro'], true)) {
            require_once __DIR__ . '/../../models/User.php';
            try {
                $userModel = new User();
                $userModel->linkPatientProfessional((string) $appointment['patient_id'], $actorId, $id, 'appointment_accepted');
                foreach ($batchSiblingIdsConfirmed as $sibApptId) {
                    $userModel->linkPatientProfessional((string) $appointment['patient_id'], $actorId, $sibApptId, 'appointment_accepted');
                }
            } catch (Throwable $e) {
                error_log('PatientProfessionalAccess (appointment_accepted): ' . $e->getMessage());
            }
        }

        return null;
    }
}

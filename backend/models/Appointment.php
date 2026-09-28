<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../lib/Crypto.php';
require_once __DIR__ . '/../lib/Logger.php';
require_once __DIR__ . '/../lib/SmsSender.php';
require_once __DIR__ . '/../lib/Email.php';
require_once __DIR__ . '/../lib/NotificationService.php';
require_once __DIR__ . '/../lib/NotificationMessageFormatter.php';
require_once __DIR__ . '/../lib/EmailQueue.php';
require_once __DIR__ . '/../lib/SmsQueue.php';
require_once __DIR__ . '/../lib/Validation.php';
require_once __DIR__ . '/../lib/PatientUrgencyGuard.php';
require_once __DIR__ . '/../lib/admin/AdminDispatchEventLogger.php';
require_once __DIR__ . '/../lib/CoverageZoneMatcher.php';
require_once __DIR__ . '/../lib/CoverageZoneGeo.php';
require_once __DIR__ . '/../lib/PendingOfferExpiry.php';
require_once __DIR__ . '/../lib/DatabaseTransaction.php';
require_once __DIR__ . '/../lib/AppointmentItemsWriter.php';
require_once __DIR__ . '/../lib/AppointmentSchedule.php';
require_once __DIR__ . '/../lib/AppointmentRequestFingerprint.php';
require_once __DIR__ . '/../lib/AppointmentCreationRequest.php';
require_once __DIR__ . '/../lib/NurseQuotaGuard.php';
require_once __DIR__ . '/../lib/appointments/bootstrap.php';

/**
 * Modèle Appointment
 */

class Appointment
{
    private PDO $db;
    private Crypto $crypto;
    private Logger $logger;
    private ?AbstractSmsProvider $sms = null;
    private Email $email;
    private NotificationService $notificationService;
    private ?AdminDispatchEventLogger $dispatchEventLogger = null;
    private ?array $creationRequestContext = null;
    private bool $creationResponseReplayed = false;
    private ?AppointmentFormDataCrypto $formDataCrypto = null;
    private ?AppointmentReviewStats $reviewStats = null;
    private ?AppointmentItemsResolver $itemsResolver = null;
    private ?AppointmentCreationService $creationService = null;
    private ?AppointmentReadService $readService = null;
    private ?AppointmentDispatchService $dispatchService = null;
    private ?AppointmentNotificationService $appointmentNotificationService = null;
    private ?AppointmentStatusService $statusService = null;

    public function creationResponseAlreadyCompleted(): bool { return $this->creationResponseReplayed; }

    public function markCreationResponseCompleted(): void
    {
        if ($this->creationRequestContext === null) return;
        $statement = $this->db->prepare('UPDATE appointment_creation_requests SET response_completed = 1 WHERE actor_id = ? AND request_key = ?');
        $statement->execute($this->creationRequestContext);
    }

    public function __construct(?PDO $db = null)
    {
        $config = require __DIR__ . '/../config/database.php';
        
        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=%s',
            $config['host'],
            $config['port'],
            $config['database'],
            $config['charset']
        );
        
        $this->db = $db ?? new PDO($dsn, $config['username'], $config['password'], $config['options']);
        try {
            $this->db->exec("SET time_zone = 'Europe/Paris'");
        } catch (Throwable) {
            // ignore if MySQL timezone tables unavailable
        }
        $this->crypto = new Crypto();
        $this->logger = new Logger($this->db);
        
        $this->sms = SmsSender::tryCreate();
        
        $this->email = new Email();
        $this->notificationService = new NotificationService();
    }

    private function dispatchLogger(): AdminDispatchEventLogger
    {
        if ($this->dispatchEventLogger === null) {
            $this->dispatchEventLogger = new AdminDispatchEventLogger($this->db);
        }
        return $this->dispatchEventLogger;
    }

    private function formDataCrypto(): AppointmentFormDataCrypto
    {
        if ($this->formDataCrypto === null) {
            $this->formDataCrypto = new AppointmentFormDataCrypto($this->crypto, $this->logger);
        }
        return $this->formDataCrypto;
    }

    private function reviewStats(): AppointmentReviewStats
    {
        if ($this->reviewStats === null) {
            $this->reviewStats = new AppointmentReviewStats($this->db);
        }
        return $this->reviewStats;
    }

    private function itemsResolver(): AppointmentItemsResolver
    {
        if ($this->itemsResolver === null) {
            $this->itemsResolver = new AppointmentItemsResolver($this->db, $this->crypto);
        }

        return $this->itemsResolver;
    }

    private function creationService(): AppointmentCreationService
    {
        if ($this->creationService === null) {
            $this->creationService = new AppointmentCreationService(
                $this->db,
                $this->crypto,
                $this->logger,
                new AppointmentCreationValidator($this->db),
                $this->itemsResolver(),
            );
        }

        return $this->creationService;
    }

    private function readService(): AppointmentReadService
    {
        if ($this->readService === null) {
            $this->readService = new AppointmentReadService(
                $this->db,
                $this->crypto,
                $this->logger,
                new AppointmentCreationValidator($this->db),
                $this->formDataCrypto(),
                $this->reviewStats(),
                $this->itemsResolver(),
            );
        }

        return $this->readService;
    }
    private function dispatchService(): AppointmentDispatchService
    {
        if ($this->dispatchService === null) {
            $this->dispatchService = new AppointmentDispatchService(
                $this->db,
                $this->crypto,
                $this->notificationService,
                $this->dispatchLogger(),
            );
        }

        return $this->dispatchService;
    }

    private function appointmentNotificationService(): AppointmentNotificationService
    {
        if ($this->appointmentNotificationService === null) {
            $this->appointmentNotificationService = new AppointmentNotificationService(
                $this->db,
                $this->crypto,
                $this->notificationService,
                $this->itemsResolver(),
                $this->dispatchService(),
            );
        }

        return $this->appointmentNotificationService;
    }

    private function statusService(): AppointmentStatusService
    {
        if ($this->statusService === null) {
            $this->statusService = new AppointmentStatusService(
                $this->db,
                $this->crypto,
                $this->logger,
                $this->dispatchLogger(),
                $this->appointmentNotificationService(),
                $this->dispatchService(),
            );
        }

        return $this->statusService;
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

    private function hasTable(string $table): bool
    {
        static $cache = [];
        if (array_key_exists($table, $cache)) {
            return $cache[$table];
        }
        try {
            $stmt = $this->db->prepare('
                SELECT COUNT(*) FROM information_schema.TABLES
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
            ');
            $stmt->execute([$table]);
            $cache[$table] = ((int) $stmt->fetchColumn()) > 0;
        } catch (Throwable $e) {
            $cache[$table] = false;
        }
        return $cache[$table];
    }

    /** Statistiques d'avis visibles pour un professionnel (détail RDV). */
    private function reviewStatsForUserId(?string $userId): array
    {
        return $this->reviewStats()->forUserId($userId);
    }

    private function applyAssigneeReviewStats(array &$appointment): void
    {
        $this->reviewStats()->applyToAppointment($appointment);
    }

    /**
     * Notes moyennes des assignés pour une page liste RDV (requête groupée).
     *
     * @param list<array<string, mixed>> $appointments
     */
    public function enrichListAssigneeReviewStats(array &$appointments): void
    {
        $this->reviewStats()->enrichList($appointments);
    }

    private function parseBloodTestItemsInputArray(?array $rawItems): array
    {
        return $this->itemsResolver()->parseBloodTestItemsInputArray($rawItems);
    }

    private function normalizeBloodTestItems(array $data): array
    {
        return $this->itemsResolver()->normalizeBloodTestItems($data);
    }

    private function insertBloodTestItems(string $appointmentId, array $items): void
    {
        $this->itemsResolver()->insertBloodTestItems($appointmentId, $items);
    }

    private function normalizeNursingItems(array $data): array
    {
        return $this->itemsResolver()->normalizeNursingItems($data);
    }

    private function insertNursingItems(string $appointmentId, array $items): void
    {
        $this->itemsResolver()->insertNursingItems($appointmentId, $items);
    }

    public function resolveBloodTestItemsForAppointment(array $appointment, ?array $preloadedTableRows = null): array
    {
        return $this->itemsResolver()->resolveBloodTestItemsForAppointment($appointment, $preloadedTableRows);
    }

    public function loadBloodTestResolveSlicesById(array $appointmentIdsOrdered): array
    {
        return $this->itemsResolver()->loadBloodTestResolveSlicesById($appointmentIdsOrdered);
    }

    public function loadBloodTestItemsForAppointments(array $appointmentIds): array
    {
        return $this->itemsResolver()->loadBloodTestItemsForAppointments($appointmentIds);
    }

    public function mergeBloodTestItemsAcrossBatchAppointmentIds(array $appointmentIdsOrdered): array
    {
        return $this->itemsResolver()->mergeBloodTestItemsAcrossBatchAppointmentIds($appointmentIdsOrdered);
    }

    public function resolveNursingItemsForAppointment(array $appointment, ?array $preloadedTableRows = null): array
    {
        return $this->itemsResolver()->resolveNursingItemsForAppointment($appointment, $preloadedTableRows);
    }

    public function loadNursingResolveSlicesById(array $appointmentIdsOrdered): array
    {
        return $this->itemsResolver()->loadNursingResolveSlicesById($appointmentIdsOrdered);
    }

    public function loadNursingItemsForAppointments(array $appointmentIds): array
    {
        return $this->itemsResolver()->loadNursingItemsForAppointments($appointmentIds);
    }

    public function mergeNursingItemsAcrossBatchAppointmentIds(array $appointmentIdsOrdered): array
    {
        return $this->itemsResolver()->mergeNursingItemsAcrossBatchAppointmentIds($appointmentIdsOrdered);
    }

    public function findRecentStaffDuplicate(string $createdBy, array $data, string $createdByRole): ?string
    {
        return $this->creationService()->findRecentStaffDuplicate($createdBy, $data, $createdByRole);
    }

    /**
     * Crée un nouveau rendez-vous
     * 
     * @param array $data Données du rendez-vous avec les clés suivantes :
     *   - type (string) : 'blood_test' ou 'nursing' (requis)
     *   - form_type (string) : 'blood_test' ou 'nursing' (requis)
     *   - patient_id (string|null) : ID du patient (optionnel si guest)
     *   - relative_id (string|null) : ID du proche (optionnel)
     *   - category_id (string|null) : ID de la catégorie de soin (optionnel)
     *   - address (array) : Adresse avec 'label', 'lat', 'lng' (requis)
     *   - scheduled_at (string) : Date et heure du rendez-vous au format 'Y-m-d H:i:s' (requis)
     *   - form_data (array) : Données du formulaire (optionnel)
     *   - guest_email (string|null) : Email pour les invités (optionnel si patient_id présent)
     * @param string $createdBy ID de l'utilisateur créateur
     * @param string $createdByRole Rôle de l'utilisateur créateur
     * @return string ID du rendez-vous créé
     * @throws Exception Si les données sont invalides
     */
    public function create(array $data, string $createdBy, string $createdByRole, bool $verifiedPatientPayment = false, ?string $requestActorId = null, ?string $requestFingerprint = null): string
    {
        $this->creationRequestContext = null;
        $this->creationResponseReplayed = false;
        if (isset($data['client_request_id'])) {
            $key = $data['client_request_id'];
            if (!is_string($key)) throw new AppointmentCreationConflict('Identifiant de demande invalide.');
            unset($data['client_request_id']);
            $this->creationRequestContext = [$requestActorId ?? $createdBy, $key];
            return AppointmentCreationRequest::run($this->db, $requestActorId ?? $createdBy, $key,
                $requestFingerprint ?? AppointmentRequestFingerprint::forInput([$createdBy, $createdByRole, $verifiedPatientPayment, $data]),
                fn(): string => $this->createWithinTransaction($data, $createdBy, $createdByRole, $verifiedPatientPayment),
                function (bool $completed): void { $this->creationResponseReplayed = $completed; });
        }
        return DatabaseTransaction::run($this->db, function () use ($data, $createdBy, $createdByRole, $verifiedPatientPayment): string {
            return $this->createWithinTransaction($data, $createdBy, $createdByRole, $verifiedPatientPayment);
        });
    }
    private function createWithinTransaction(array $data, string $createdBy, string $createdByRole, bool $verifiedPatientPayment): string
    {
        return $this->creationService()->createWithinTransaction($data, $createdBy, $createdByRole, $verifiedPatientPayment);
    }

    /**
     * Nom patient pour les notifications (body ou form_data chiffré en base).
     */
    private function extractPatientDisplayNameForNotification(string $appointmentId, array $data): string
    {
        $fd = $data['form_data'] ?? null;
        if (is_array($fd)) {
            $n = trim((string) ($fd['first_name'] ?? '') . ' ' . (string) ($fd['last_name'] ?? ''));
            if ($n !== '') {
                return $n;
            }
        }
        try {
            $stmt = $this->db->prepare('SELECT form_data_encrypted, form_data_dek FROM appointments WHERE id = ?');
            $stmt->execute([$appointmentId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$row || empty($row['form_data_encrypted']) || empty($row['form_data_dek'])) {
                return 'Patient';
            }
            $json = $this->crypto->decryptField($row['form_data_encrypted'], $row['form_data_dek']);
            $form = json_decode($json, true);
            if (!is_array($form)) {
                return 'Patient';
            }
            $n = trim((string) ($form['first_name'] ?? '') . ' ' . (string) ($form['last_name'] ?? ''));

            return $n !== '' ? $n : 'Patient';
        } catch (Throwable $e) {
            return 'Patient';
        }
    }

    /**
     * À appeler après l'envoi de la réponse HTTP (création RDV) : dispatch géo + notifications.
     * Évite le timeout côté client quand le dispatch/SMS prennent du temps.
     * @param string|null $createdByRole Si 'nurse', pas de dispatch (RDV déjà assigné au nurse créateur)
     */
    public function runPostCreateNotifications(string $id, array $data, ?string $createdByRole = null): void
    {
        $this->appointmentNotificationService()->runPostCreateNotifications($id, $data, $createdByRole);
    }

    public function getById(string $id, string $requesterId, string $requesterRole): ?array
    {
        return $this->readService()->getById($id, $requesterId, $requesterRole);
    }

    /**
     * Déchiffre une ligne de RDV pour l'affichage en liste (sans getById ni lookups User).
     * Utilisé par l'API liste pour éviter le N+1.
     */
    public function decryptRowForList(array $row, string $requesterId, string $requesterRole): array
    {
        return $this->formDataCrypto()->decryptRowForList($row, $requesterId, $requesterRole);
    }

    /**
     * Déchiffre address + form_data sans les lier dans un seul try (évite adresse vide alors que form_data contient l'adresse).
     */
    private function decryptAppointmentSensitiveFields(
        array &$appointment,
        string $requesterId,
        string $requesterRole
    ): void {
        $this->formDataCrypto()->decryptSensitiveFields($appointment, $requesterId, $requesterRole);
    }

    /**
     * Expose toujours un libellé d'adresse (address + form_data.address + address_label).
     */
    private function hydrateAppointmentAddressFields(array &$appointment): void
    {
        $this->formDataCrypto()->hydrateAddressFields($appointment);
    }

    private function extractAddressLabelFromDecrypted(mixed $raw): string
    {
        return $this->formDataCrypto()->extractAddressLabel($raw);
    }

    /**
     * Change le statut d'un rendez-vous
     * Pour status = canceled, optionnel : cancellation_reason, cancellation_comment, cancellation_photo_document_id
     */
    /**
     * @return null si mise à jour normale, 'declined_offer' si refus d’offre (statut RDV inchangé)
     */
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
        return $this->statusService()->updateStatus(
            $id,
            $newStatus,
            $actorId,
            $actorRole,
            $note,
            $redispatch,
            $cancellationReason,
            $cancellationComment,
            $cancellationPhotoDocumentId
        );
    }

    /**
     * Met à jour un rendez-vous (form_data, scheduled_at, address, status) - admin / super_admin
     */
    public function update(string $id, array $data, string $actorId, string $actorRole): void
    {
        $businessNotification = DatabaseTransaction::run($this->db, function () use ($id, $data, $actorId, $actorRole): ?array {
            return $this->updateWithinTransaction($id, $data, $actorId, $actorRole);
        });

        if (is_array($businessNotification)) {
            $this->notificationService->notifyAppointmentBusinessUpdated(
                $id,
                $businessNotification['appointment'],
                $businessNotification['changed_fields'],
                $actorId
            );
        }
    }

    private function updateWithinTransaction(string $id, array $data, string $actorId, string $actorRole): ?array
    {
        $lock = $this->db->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql' ? ' FOR UPDATE' : '';
        $stmt = $this->db->prepare('
            SELECT id, type, status, patient_id, relative_id, assigned_nurse_id, assigned_lab_id,
                   assigned_to, assigned_pro_id, created_by, created_by_role, scheduled_at,
                   location_lat, location_lng, address_encrypted, address_dek,
                   form_data_encrypted, form_data_dek
            FROM appointments WHERE id = ?' . $lock);
        $stmt->execute([$id]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$existing) {
            throw new Exception('Rendez-vous introuvable');
        }

        $oldFormData = [];
        if (!empty($existing['form_data_encrypted']) && !empty($existing['form_data_dek'])) {
            try {
                $decoded = json_decode($this->crypto->decryptField(
                    (string) $existing['form_data_encrypted'],
                    (string) $existing['form_data_dek']
                ), true);
                $oldFormData = is_array($decoded) ? $decoded : [];
            } catch (Throwable $e) {
                $oldFormData = [];
            }
        }
        $oldAddress = null;
        if (!empty($existing['address_encrypted']) && !empty($existing['address_dek'])) {
            try {
                $oldAddress = [
                    'label' => $this->crypto->decryptField(
                        (string) $existing['address_encrypted'],
                        (string) $existing['address_dek']
                    ),
                    'lat' => isset($existing['location_lat']) ? (float) $existing['location_lat'] : null,
                    'lng' => isset($existing['location_lng']) ? (float) $existing['location_lng'] : null,
                ];
            } catch (Throwable $e) {
                $oldAddress = null;
            }
        }
        $beforeBusiness = [
            'scheduled_at' => $existing['scheduled_at'] ?? null,
            'form_data' => $oldFormData,
            'address' => $oldAddress,
        ];
        $oldStatus = (string) ($existing['status'] ?? '');
        $itemType = (string) $existing['type'];
        $itemKey = $itemType === 'blood_test' ? 'blood_test_items' : 'nursing_items';
        $editedItems = null;
        $fields = is_array($data['form_data'] ?? null) ? $data['form_data'] : [];
        if (array_key_exists($itemKey, $data) || array_key_exists($itemKey, $fields)) {
            if (!is_array($data['form_data'] ?? null)) throw new InvalidArgumentException('Le formulaire complet est requis pour modifier les actes.');
            $rawItems = $data[$itemKey] ?? $fields[$itemKey] ?? null;
            if (!is_array($rawItems) || !$rawItems) throw new InvalidArgumentException('Au moins un acte est requis.');
            $editedItems = $this->parseBloodTestItemsInputArray($rawItems);
            if (count($editedItems) !== count($rawItems)) throw new InvalidArgumentException('Un acte est invalide. Aucun changement enregistré.');
            $data['form_data'] = $fields;
            $data['form_data'][$itemKey] = $editedItems;
        }

        $updateFields = ['updated_at = NOW()'];
        $params = [];

        if (isset($data['status'])) {
            $updateFields[] = 'status = ?';
            $params[] = $data['status'];
            if (
                $data['status'] === 'pending'
                && $oldStatus !== 'pending'
                && $actorRole === 'super_admin'
            ) {
                $updateFields[] = 'created_at = NOW()';
            }
        }

        if (!empty($data['scheduled_at'])) {
            $scheduledAt = AppointmentSchedule::forStorage((string) $data['scheduled_at']);
            $updateFields[] = 'scheduled_at = ?';
            $params[] = $scheduledAt;
        }

        if (!empty($data['address']) && is_array($data['address']) && !empty($data['address']['label'])) {
            $lat = floatval($data['address']['lat'] ?? 0);
            $lng = floatval($data['address']['lng'] ?? 0);
            $addressEncrypted = $this->crypto->encryptField($data['address']['label']);
            $updateFields[] = 'address_encrypted = ?, address_dek = ?, location_lat = ?, location_lng = ?';
            $params[] = $addressEncrypted['encrypted'];
            $params[] = $addressEncrypted['dek'];
            $params[] = $lat;
            $params[] = $lng;
        }

        if (isset($data['form_data']) && is_array($data['form_data'])) {
            // An edited record is no longer proof of the original creation request.
            unset($data['form_data'][AppointmentRequestFingerprint::FIELD]);
            $formDataJson = json_encode($data['form_data']);
            $formDataEncrypted = $this->crypto->encryptField($formDataJson);
            $updateFields[] = 'form_data_encrypted = ?, form_data_dek = ?';
            $params[] = $formDataEncrypted['encrypted'];
            $params[] = $formDataEncrypted['dek'];
        }

        if (array_key_exists('assigned_lab_id', $data)) {
            $updateFields[] = 'assigned_lab_id = ?';
            $params[] = !empty($data['assigned_lab_id']) ? $data['assigned_lab_id'] : null;
        }
        if (array_key_exists('assigned_nurse_id', $data)) {
            $updateFields[] = 'assigned_nurse_id = ?';
            $params[] = !empty($data['assigned_nurse_id']) ? $data['assigned_nurse_id'] : null;
        }

        if (array_key_exists('category_id', $data)) {
            if (!empty($data['category_id']) && !Validation::uuid($data['category_id'])) {
                throw new Exception('ID de catégorie invalide (format UUID requis).');
            }
            $updateFields[] = 'category_id = ?';
            $params[] = !empty($data['category_id']) ? $data['category_id'] : null;
        }

        if (empty($params)) {
            return null;
        }

        $params[] = $id;
        $sql = 'UPDATE appointments SET ' . implode(', ', $updateFields) . ' WHERE id = ?';
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        if ($editedItems !== null && $this->hasTable('appointment_' . $itemKey)) {
            AppointmentItemsWriter::replace($this->db, $itemType, $id, $editedItems, fn (): string => $this->generateUUID());
        }
        $this->logger->log($actorId, $actorRole, 'update', 'appointment', $id, [
            'fields' => array_keys($data),
        ]);

        $appointmentAfter = $existing;
        $appointmentAfter['scheduled_at'] = $scheduledAt ?? ($existing['scheduled_at'] ?? null);
        $appointmentAfter['form_data'] = isset($data['form_data']) && is_array($data['form_data'])
            ? $data['form_data']
            : $oldFormData;
        $appointmentAfter['address'] = isset($data['address']) && is_array($data['address'])
            ? $data['address']
            : $oldAddress;
        foreach (['assigned_lab_id', 'assigned_nurse_id', 'assigned_pro_id'] as $recipientField) {
            if (array_key_exists($recipientField, $data)) {
                $appointmentAfter[$recipientField] = !empty($data[$recipientField]) ? $data[$recipientField] : null;
            }
        }
        $changedFields = BusinessNotificationPolicy::changedBusinessFields($beforeBusiness, $appointmentAfter);

        return $changedFields === []
            ? null
            : ['appointment' => $appointmentAfter, 'changed_fields' => $changedFields];
    }

    /**
     * Après acceptation par un confrère : notifier l’infirmier qui avait partagé le lien (repassage en attente).
     */

    /**
     * Envoie les notifications selon le statut
     */

    /**
     * Vérifie si un point est dans un polygone (algorithme ray casting)
     */

    /**
     * Préférence patient pour le genre de l'infirmier (form_data.public).
     * Si female/male : seuls les infirmiers avec genre déchiffré correspondant sont proposés ; genre inconnu = exclus.
     */

    /**
     * Notification web pour l’acteur qui vient de redispatcher (confirmation sans renvoyer la popup « accepter »).
     */

    /**
     * Relance dispatchGeographic pour un RDV nursing (coordonnées et form_data en base).
     * @param string|null $creationBatchId Passer null pour utiliser creation_batch_id du RDV.
     */
    public function dispatchGeographicForNursingFromStoredLocation(
        string $appointmentId,
        ?string $excludeProfileId = null,
        ?string $creationBatchId = null
    ): void {
        $this->dispatchService()->dispatchGeographicForNursingFromStoredLocation(
            $appointmentId,
            $excludeProfileId,
            $creationBatchId
        );
    }

    /**
     * Après délai partage lien : notifie la zone comme à la création, puis retire le marqueur nurse_share_released_at.
     */
    public function redispatchNursingShareReleasedToZone(string $appointmentId, string $historyActorId): void
    {
        $this->dispatchGeographicForNursingFromStoredLocation($appointmentId, null, null);
        $tracksOfferExpiry = $this->hasColumn('appointments', 'pending_offer_expires_at');
        $expirySql = $tracksOfferExpiry ? ', pending_offer_expires_at = ?' : '';
        $upd = $this->db->prepare(
            "UPDATE appointments SET nurse_share_released_at = NULL{$expirySql}, updated_at = NOW()
             WHERE id = ? AND type = 'nursing' AND status = 'pending'
             AND (assigned_nurse_id IS NULL OR assigned_nurse_id = '' OR TRIM(assigned_nurse_id) = '')
             AND nurse_share_released_at IS NOT NULL"
        );
        $params = [];
        if ($tracksOfferExpiry) {
            $params[] = PendingOfferExpiry::formatSqlDateTime(
                PendingOfferExpiry::computeRepublishedExpiresAt()
            );
        }
        $params[] = $appointmentId;
        $upd->execute($params);
        if ($upd->rowCount() === 0) {
            return;
        }
        $histId = $this->generateUUID();
        $note = 'Diffusion zone relancée (délai après partage lien confrère)';
        $stmtHist = $this->db->prepare('
            INSERT INTO appointment_status_updates 
            (id, appointment_id, status, actor_id, actor_role, note, created_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
        ');
        $stmtHist->execute([$histId, $appointmentId, 'pending', $historyActorId, 'super_admin', $note]);
        $this->logger->log($historyActorId, 'super_admin', 'update', 'appointment', $appointmentId, [
            'action' => 'nurse_share_redispatch_zone',
        ]);
        $this->dispatchLogger()->log(
            $appointmentId,
            'nurse_share_redispatch_zone',
            $historyActorId,
            'super_admin',
            null,
            ['source' => 'cron']
        );
    }

    /**
     * @param array<int, array<string, mixed>> $professionals
     * @return array<int, array<string, mixed>>
     */

    public function fetchCareCategoryOptionMeta(?string $categoryId): array
    {
        return $this->creationService()->fetchCareCategoryOptionMeta($categoryId);
    }





    /**
     * Génère un UUID v4
     */
    private function generateUUID(): string
    {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}

<?php

declare(strict_types=1);

require_once __DIR__ . '/PharmacyModuleConfig.php';
require_once __DIR__ . '/PharmacyOrderAccess.php';
require_once __DIR__ . '/PharmacyOrderConversation.php';
require_once __DIR__ . '/../../models/User.php';
require_once __DIR__ . '/../../models/PatientRelative.php';
require_once __DIR__ . '/../MedicalDocumentAccess.php';
require_once __DIR__ . '/../MedicalDocumentSubject.php';
require_once __DIR__ . '/../RelativeProfile.php';
require_once __DIR__ . '/../DatabaseTransaction.php';
require_once __DIR__ . '/../AppointmentCreationRequest.php';

/**
 * CRUD et transitions commandes pharmacie.
 */
final class PharmacyOrderService
{
    /** @var list<string> */
    public const TERMINAL_STATUSES = ['terminee', 'refusee', 'annulee'];

    private const MAX_PRESCRIPTIONS = 10;

    /** @var array<string, list<string>> */
    private const ALLOWED_TRANSITIONS = [
        'en_attente' => ['acceptee', 'refusee', 'complement_demande', 'annulee'],
        'complement_demande' => ['en_attente', 'annulee'],
        'acceptee' => ['en_cours', 'annulee'],
        'en_cours' => ['terminee', 'annulee'],
    ];

    public function __construct(
        private PDO $db,
        private PharmacyModuleConfig $moduleConfig,
    ) {
    }

    public static function newUuid(): string
    {
        return PharmacyOrderConversation::newUuid();
    }

    /**
     * `client_request_id` rend l'envoi rejouable : même clé et même contenu renvoient la même commande,
     * un contenu différent lève AppointmentCreationConflict.
     *
     * @param array<string, mixed> $input
     * @return array{order: array<string, mixed>, notify: bool} `notify` est faux quand la réponse a déjà été servie
     */
    public function create(array $user, array $input): array
    {
        $config = $this->moduleConfig->getConfig();
        if (!PharmacyModuleConfig::canOrder($user, $config)) {
            throw new RuntimeException('Commande non autorisée pour ce compte');
        }

        $prescriptionIds = $this->normalizePrescriptionIds($input['prescription_document_ids'] ?? []);

        $fulfillmentMode = (string) ($input['fulfillment_mode'] ?? '');
        if (!in_array($fulfillmentMode, ['click_collect', 'home_delivery'], true)) {
            throw new InvalidArgumentException('Mode de retrait invalide');
        }

        $patientId = trim((string) ($input['patient_id'] ?? ''));
        $pharmacyId = trim((string) ($input['pharmacy_id'] ?? ''));
        $uid = (string) ($user['user_id'] ?? '');
        if (PharmacyModuleConfig::isPharmacyAccount($user, $config)) {
            $pharmacyId = $uid;
        }
        if ($patientId === '' || $pharmacyId === '') {
            throw new InvalidArgumentException('Patient et pharmacie requis');
        }

        $userModel = new User();
        $role = (string) ($user['role'] ?? '');
        $isPatientSelf = $role === 'patient' && $uid === $patientId;
        if (!$isPatientSelf && !$userModel->hasProfessionalAccessToPatient($uid, $patientId)) {
            throw new RuntimeException('Accès patient refusé');
        }

        $subject = RelativeProfile::normalizeSubject($this->db, [
            'patient_id' => $patientId,
            'relative_id' => isset($input['relative_id']) ? trim((string) $input['relative_id']) : '',
        ]);
        $patientId = (string) $subject['patient_id'];
        $relativeId = $subject['relative_id'] !== '' ? (string) $subject['relative_id'] : null;
        if ($relativeId !== null) {
            $this->assertRelativeBelongsToPatient($relativeId, $patientId);
        }
        $this->assertPrescriptionDocumentsAccessible($user, $prescriptionIds, $patientId, $relativeId);

        $deliveryAddressJson = null;
        $deliveryPostalCode = null;
        if ($fulfillmentMode === 'home_delivery') {
            $address = $input['delivery_address'] ?? null;
            if (!is_array($address) || trim((string) ($address['formatted_address'] ?? $address['label'] ?? '')) === '') {
                throw new InvalidArgumentException('Adresse de livraison requise');
            }
            $deliveryAddressJson = json_encode($address, JSON_UNESCAPED_UNICODE);
            $deliveryPostalCode = trim((string) ($address['postal_code'] ?? ''));
        }

        $desiredDate = trim((string) ($input['desired_fulfillment_date'] ?? ''));
        $comment = isset($input['requester_comment']) ? trim((string) $input['requester_comment']) : null;

        $insert = function () use (
            $uid, $role, $pharmacyId, $patientId, $relativeId, $fulfillmentMode,
            $deliveryAddressJson, $deliveryPostalCode, $desiredDate, $comment, $prescriptionIds,
        ): string {
            if (!$this->isValidFutureDate($desiredDate)) {
                throw new InvalidArgumentException('Date souhaitée invalide');
            }
            $this->assertPharmacyCanReceive($pharmacyId, $fulfillmentMode, $desiredDate);

            $id = self::newUuid();
            $this->db->prepare('
                INSERT INTO pharmacy_orders (
                    id, requester_id, requester_role, pharmacy_id, patient_id, relative_id,
                    fulfillment_mode, delivery_address_json, delivery_postal_code,
                    desired_fulfillment_date, status,
                    requester_comment, prescription_document_ids, created_by_admin_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ')->execute([
                $id,
                $uid,
                $role,
                $pharmacyId,
                $patientId,
                $relativeId,
                $fulfillmentMode,
                $deliveryAddressJson,
                $deliveryPostalCode !== '' ? $deliveryPostalCode : null,
                $desiredDate,
                'en_attente',
                $comment,
                json_encode(array_values($prescriptionIds), JSON_UNESCAPED_UNICODE),
                $role === 'super_admin' ? $uid : null,
            ]);
            $this->recordEvent($id, $uid, 'created', null, 'en_attente', null);

            return $id;
        };

        $requestKey = $input['client_request_id'] ?? null;
        $responseServed = false;
        if ($requestKey !== null) {
            if (!is_string($requestKey) || !AppointmentCreationRequest::isValidKey($requestKey)) {
                throw new InvalidArgumentException('client_request_id invalide');
            }
            $hash = hash('sha256', json_encode([
                'pharmacy_order', $uid, $pharmacyId, $patientId, $relativeId, $fulfillmentMode,
                $deliveryAddressJson, $desiredDate, $comment, $prescriptionIds,
            ], JSON_THROW_ON_ERROR));
            $id = AppointmentCreationRequest::run(
                $this->db,
                $uid,
                $requestKey,
                $hash,
                $insert,
                function (bool $completed) use (&$responseServed): void {
                    $responseServed = $completed;
                },
            );
        } else {
            $id = DatabaseTransaction::run($this->db, $insert);
        }

        $order = $this->getById($id);
        if ($order === null) {
            throw new RuntimeException('Création commande échouée');
        }

        return ['order' => $order, 'notify' => !$responseServed];
    }

    /**
     * À appeler une fois les notifications de création envoyées : un rejeu ne les renverra pas.
     *
     * @param array<string, mixed> $user
     * @param array<string, mixed> $input
     */
    public function markCreationResponseCompleted(array $user, array $input): void
    {
        $requestKey = $input['client_request_id'] ?? null;
        if (is_string($requestKey) && $requestKey !== '') {
            AppointmentCreationRequest::markResponseCompleted($this->db, (string) ($user['user_id'] ?? ''), $requestKey);
        }
    }

    public function getById(string $id): ?array
    {
        $mapped = $this->getByIdRaw($id);
        if ($mapped === null) {
            return null;
        }

        return $this->enrichOrdersWithDisplayNames([$mapped])[0] ?? $mapped;
    }

    private function getByIdRaw(string $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM pharmacy_orders WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return null;
        }

        return $this->mapOrder($row);
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listForUser(array $user, string $scope = 'sent', ?string $segment = null, ?string $search = null): array
    {
        $uid = (string) ($user['user_id'] ?? '');
        $role = (string) ($user['role'] ?? '');
        $statusSql = $this->segmentStatusSql($segment);
        $limit = 500;

        if ($role === 'super_admin' && $scope === 'all') {
            $sql = 'SELECT * FROM pharmacy_orders';
            if ($statusSql !== '') {
                $sql .= ' WHERE ' . $statusSql;
            }
            $sql .= ' ORDER BY created_at DESC LIMIT ' . $limit;
            $stmt = $this->db->query($sql);
            $orders = $this->enrichOrdersWithDisplayNames(
                array_map(fn ($r) => $this->mapOrder($r), $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [])
            );

            return $this->filterOrdersBySearch($orders, $search);
        }

        if ($scope === 'patient') {
            $sql = 'SELECT * FROM pharmacy_orders WHERE patient_id = ?';
            $params = [$uid];
        } elseif ($scope === 'received') {
            $sql = 'SELECT * FROM pharmacy_orders WHERE pharmacy_id = ?';
            $params = [$uid];
        } else {
            $sql = 'SELECT * FROM pharmacy_orders WHERE requester_id = ?';
            $params = [$uid];
        }
        if ($statusSql !== '') {
            $sql .= ' AND ' . $statusSql;
        }
        $sql .= ' ORDER BY created_at DESC LIMIT ' . $limit;
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        return $this->filterOrdersBySearch(
            $this->enrichOrdersWithDisplayNames(
                array_map(fn ($r) => $this->mapOrder($r), $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [])
            ),
            $search
        );
    }

    /** @return array{active: int, history: int} */
    public function segmentCounts(array $user, string $scope): array
    {
        $uid = (string) ($user['user_id'] ?? '');
        $role = (string) ($user['role'] ?? '');
        $activeSql = $this->segmentStatusSql('active');
        if ($role === 'super_admin' && $scope === 'all') {
            $where = '1=1';
            $params = [];
        } elseif ($scope === 'patient') {
            $where = 'patient_id = ?';
            $params = [$uid];
        } elseif ($scope === 'received') {
            $where = 'pharmacy_id = ?';
            $params = [$uid];
        } else {
            $where = 'requester_id = ?';
            $params = [$uid];
        }
        $stmt = $this->db->prepare(
            "SELECT
                SUM(CASE WHEN $activeSql THEN 1 ELSE 0 END) AS active_count,
                SUM(CASE WHEN NOT ($activeSql) THEN 1 ELSE 0 END) AS history_count
             FROM pharmacy_orders WHERE $where"
        );
        $stmt->execute($params);
        $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

        return [
            'active' => (int) ($row['active_count'] ?? 0),
            'history' => (int) ($row['history_count'] ?? 0),
        ];
    }

    private function segmentStatusSql(?string $segment): string
    {
        $active = "status IN ('en_attente','acceptee','en_cours','complement_demande')";
        if ($segment === 'active') {
            return $active;
        }
        if ($segment === 'history') {
            return "status NOT IN ('en_attente','acceptee','en_cours','complement_demande')";
        }

        return '';
    }

    /**
     * @param list<array<string, mixed>> $orders
     * @return list<array<string, mixed>>
     */
    private function filterOrdersBySearch(array $orders, ?string $search): array
    {
        $q = mb_strtolower(trim((string) $search));
        if ($q === '') {
            return $orders;
        }

        return array_values(array_filter($orders, static function (array $order) use ($q): bool {
            $haystack = mb_strtolower(implode(' ', [
                (string) ($order['id'] ?? ''),
                (string) ($order['status'] ?? ''),
                (string) ($order['patient_display_name'] ?? ''),
                (string) ($order['relative_display_name'] ?? ''),
                (string) ($order['pharmacy_display_name'] ?? ''),
                (string) ($order['requester_comment'] ?? ''),
            ]));

            return str_contains($haystack, $q);
        }));
    }

    /** @param array<string, mixed> $patch */
    public function updateStatus(array $user, string $orderId, string $newStatus, array $patch = []): array
    {
        $order = $this->getByIdRaw($orderId);
        if ($order === null) {
            throw new RuntimeException('Commande introuvable');
        }

        $current = (string) ($order['status'] ?? '');
        $allowed = self::ALLOWED_TRANSITIONS[$current] ?? [];
        if (!in_array($newStatus, $allowed, true)) {
            throw new InvalidArgumentException("Transition $current → $newStatus non autorisée");
        }

        $actorId = (string) ($user['user_id'] ?? '');
        $isPharmacy = (string) ($order['pharmacy_id'] ?? '') === $actorId;
        $isRequester = (string) ($order['requester_id'] ?? '') === $actorId;
        $isPatient = (string) ($order['patient_id'] ?? '') === $actorId;
        $isAdmin = (string) ($user['role'] ?? '') === 'super_admin';

        if ($newStatus === 'annulee' && !($isRequester || $isPatient || $isPharmacy || $isAdmin)) {
            throw new RuntimeException('Action non autorisée');
        }
        if (in_array($newStatus, ['acceptee', 'refusee', 'complement_demande', 'en_cours', 'terminee'], true)
            && !($isPharmacy || $isAdmin)) {
            throw new RuntimeException('Action réservée à la pharmacie');
        }

        $canWritePharmacyFields = $isPharmacy || $isAdmin;
        $pharmacyNote = $order['pharmacy_note'] ?? null;
        $rejectionReason = $order['rejection_reason'] ?? null;
        if ($canWritePharmacyFields) {
            if (array_key_exists('pharmacy_note', $patch)) {
                $pharmacyNote = trim((string) $patch['pharmacy_note']);
            }
            if (array_key_exists('rejection_reason', $patch)) {
                $rejectionReason = trim((string) $patch['rejection_reason']);
            }
        }

        if ($newStatus === 'refusee' && ($rejectionReason === null || $rejectionReason === '')) {
            throw new InvalidArgumentException('Motif de refus requis');
        }

        $this->db->prepare('
            UPDATE pharmacy_orders
            SET status = ?, pharmacy_note = ?, rejection_reason = ?, updated_at = NOW()
            WHERE id = ?
        ')->execute([
            $newStatus,
            $pharmacyNote !== '' ? $pharmacyNote : null,
            $rejectionReason !== '' ? $rejectionReason : null,
            $orderId,
        ]);

        $this->recordEvent(
            $orderId,
            (string) ($user['user_id'] ?? ''),
            'status_change',
            $current,
            $newStatus,
            null
        );

        $updated = $this->getByIdRaw($orderId);
        if ($updated === null) {
            throw new RuntimeException('Mise à jour échouée');
        }

        return $updated;
    }

    /**
     * Joint des ordonnances à une commande pas encore prise en charge par la pharmacie.
     * Sur une demande de complément, la commande repasse en attente de la pharmacie.
     *
     * @return array<string, mixed> Commande mise à jour
     */
    public function attachPrescriptions(array $user, string $orderId, mixed $documentIds): array
    {
        $newIds = $this->normalizePrescriptionIds($documentIds);
        if ($newIds === []) {
            throw new InvalidArgumentException('Ordonnance requise');
        }
        $actorId = (string) ($user['user_id'] ?? '');

        DatabaseTransaction::run($this->db, function () use ($user, $orderId, $newIds, $actorId): void {
            $stmt = $this->db->prepare('SELECT * FROM pharmacy_orders WHERE id = ? LIMIT 1 FOR UPDATE');
            $stmt->execute([$orderId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$row) {
                throw new RuntimeException('Commande introuvable');
            }
            if (!PharmacyOrderAccess::isRequesterOrPatient($user, $row)) {
                throw new RuntimeException('Action non autorisée');
            }
            if (!in_array((string) $row['status'], PharmacyOrderAccess::PRESCRIPTION_ATTACHABLE_STATUSES, true)) {
                throw new DomainException('Cette commande n’accepte plus de nouvelle ordonnance');
            }

            $existing = $this->mapOrder($row)['prescription_document_ids'];
            $toAdd = array_values(array_diff($newIds, $existing));
            if ($toAdd === []) {
                throw new InvalidArgumentException('Ordonnance déjà jointe à la commande');
            }
            if (count($existing) + count($toAdd) > self::MAX_PRESCRIPTIONS) {
                throw new InvalidArgumentException('Dix ordonnances maximum');
            }
            $this->assertPrescriptionDocumentsAccessible(
                $user,
                $toAdd,
                (string) $row['patient_id'],
                $row['relative_id'] !== null ? (string) $row['relative_id'] : null,
            );

            $currentStatus = (string) $row['status'];
            $nextStatus = $currentStatus === 'complement_demande' ? 'en_attente' : $currentStatus;
            $this->db->prepare('
                UPDATE pharmacy_orders SET prescription_document_ids = ?, status = ?, updated_at = NOW() WHERE id = ?
            ')->execute([
                json_encode(array_values(array_merge($existing, $toAdd)), JSON_UNESCAPED_UNICODE),
                $nextStatus,
                $orderId,
            ]);
            $this->recordEvent(
                $orderId,
                $actorId,
                'prescriptions_added',
                null,
                null,
                json_encode(['document_ids' => $toAdd], JSON_UNESCAPED_UNICODE),
            );
            if ($nextStatus !== $currentStatus) {
                $this->recordEvent($orderId, $actorId, 'status_change', $currentStatus, $nextStatus, null);
            }
        });

        $order = $this->getById($orderId);
        if ($order === null) {
            throw new RuntimeException('Mise à jour échouée');
        }

        return $order;
    }

    /**
     * Ordonnance remplacée : la nouvelle prend sa place dans toutes les commandes qui la joignaient.
     * À appeler dans la transaction du remplacement.
     *
     * @return int nombre de commandes mises à jour
     */
    public function replacePrescriptionDocument(string $oldDocumentId, string $newDocumentId, string $actorId): int
    {
        $stmt = $this->db->prepare('
            SELECT id, prescription_document_ids FROM pharmacy_orders
            WHERE JSON_CONTAINS(prescription_document_ids, JSON_QUOTE(?))
            FOR UPDATE
        ');
        $stmt->execute([$oldDocumentId]);
        $update = $this->db->prepare('UPDATE pharmacy_orders SET prescription_document_ids = ?, updated_at = NOW() WHERE id = ?');
        $updated = 0;
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $ids = array_values(array_unique(array_map(
                static fn (mixed $id): string => (string) $id === $oldDocumentId ? $newDocumentId : (string) $id,
                self::decodePrescriptionIds($row['prescription_document_ids']),
            )));
            $update->execute([json_encode($ids, JSON_UNESCAPED_UNICODE), (string) $row['id']]);
            $this->recordEvent(
                (string) $row['id'],
                $actorId,
                'prescription_replaced',
                null,
                null,
                json_encode(['old_document_id' => $oldDocumentId, 'new_document_id' => $newDocumentId], JSON_UNESCAPED_UNICODE),
            );
            $updated++;
        }

        return $updated;
    }

    /** @return list<string> */
    private function normalizePrescriptionIds(mixed $raw): array
    {
        if (!is_array($raw)) {
            throw new InvalidArgumentException('Liste d’ordonnances invalide');
        }
        $ids = array_values(array_unique(array_filter(
            array_map(static fn ($id) => is_scalar($id) ? trim((string) $id) : '', $raw),
            static fn (string $id) => $id !== ''
        )));
        if (count($ids) > self::MAX_PRESCRIPTIONS) {
            throw new InvalidArgumentException('Dix ordonnances maximum');
        }

        return $ids;
    }

    private function assertRelativeBelongsToPatient(string $relativeId, string $patientId): void
    {
        $stmt = $this->db->prepare(
            'SELECT 1 FROM patient_relatives WHERE id = ? AND patient_id = ? LIMIT 1'
        );
        $stmt->execute([$relativeId, $patientId]);
        if (!$stmt->fetchColumn()) {
            throw new InvalidArgumentException('Proche invalide pour ce patient');
        }
    }

    /** @param list<string> $documentIds */
    private function assertPrescriptionDocumentsAccessible(
        array $user,
        array $documentIds,
        string $patientId,
        ?string $relativeId,
    ): void {
        $subjectIds = array_filter([$patientId, MedicalDocumentAccess::subjectDossierId($this->db, $patientId, $relativeId)]);
        foreach ($documentIds as $documentId) {
            if (!preg_match('/^[a-f0-9-]{32,36}$/i', $documentId)) {
                throw new InvalidArgumentException('Identifiant d’ordonnance invalide');
            }
            $document = MedicalDocumentAccess::loadForAccess($this->db, $documentId);
            if ($document === null || !MedicalDocumentAccess::userCanAccess($this->db, $user, $document)) {
                throw new RuntimeException('Accès ordonnance refusé');
            }
            if (!empty($document['replaced_by_document_id'])) {
                throw new InvalidArgumentException('Cette ordonnance a été remplacée : joignez la nouvelle version');
            }

            $owner = !empty($document['appointment_id'])
                ? [
                    'patient_id' => (string) ($document['apt_patient_id'] ?? ''),
                    'relative_id' => !empty($document['apt_relative_id'])
                        ? (string) $document['apt_relative_id']
                        : null,
                ]
                : MedicalDocumentAccess::resolveProfileDocumentOwner($this->db, $documentId);

            if ($owner === null && !empty($document['patient_id'])
                && in_array((string) $document['patient_id'], $subjectIds, true)) {
                // Ordonnance déposée pour la commande ou générée sur le dossier du proche : le patient est sur
                // medical_documents, pas forcément dans patient_documents.
                $owner = [
                    'patient_id' => $patientId,
                    'relative_id' => $relativeId,
                ];
            }

            if ($owner === null || !MedicalDocumentSubject::matches(
                (string) ($owner['patient_id'] ?? ''),
                $owner['relative_id'] ?? null,
                $patientId,
                $relativeId,
            )) {
                throw new RuntimeException('L’ordonnance ne correspond pas au patient sélectionné');
            }
        }
    }

    private function isValidFutureDate(string $value): bool
    {
        $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value);
        if (!$date || $date->format('Y-m-d') !== $value) {
            return false;
        }
        $today = new DateTimeImmutable('today', new DateTimeZone('Europe/Paris'));

        return $date >= $today && $date <= $today->modify('+90 days');
    }

    private function assertPharmacyCanReceive(
        string $pharmacyId,
        string $fulfillmentMode,
        string $desiredDate,
    ): void
    {
        $stmt = $this->db->prepare('
            SELECT id, role, emploi, pharmacy_orders_enabled, pharmacy_orders_paused,
                   pharmacy_accepts_click_collect, pharmacy_accepts_home_delivery,
                   pharmacy_click_collect_days_json, pharmacy_home_delivery_days_json
            FROM profiles WHERE id = ? LIMIT 1
        ');
        $stmt->execute([$pharmacyId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row || ($row['role'] ?? '') !== 'pro') {
            throw new InvalidArgumentException('Pharmacie introuvable');
        }
        if (empty($row['pharmacy_orders_enabled']) || !empty($row['pharmacy_orders_paused'])) {
            throw new InvalidArgumentException('Cette pharmacie n\'accepte pas de commandes');
        }
        if ($fulfillmentMode === 'click_collect' && empty($row['pharmacy_accepts_click_collect'])) {
            throw new InvalidArgumentException('Click & collect non disponible');
        }
        if ($fulfillmentMode === 'home_delivery' && empty($row['pharmacy_accepts_home_delivery'])) {
            throw new InvalidArgumentException('Livraison non disponible');
        }

        $daysColumn = $fulfillmentMode === 'home_delivery'
            ? 'pharmacy_home_delivery_days_json'
            : 'pharmacy_click_collect_days_json';
        $days = json_decode((string) ($row[$daysColumn] ?? '[]'), true);
        if (!is_array($days) || $days === []) {
            $days = [1, 2, 3, 4, 5, 6];
        }
        $weekday = (int) (new DateTimeImmutable($desiredDate))->format('N');
        if (!in_array($weekday, array_map('intval', $days), true)) {
            throw new InvalidArgumentException('La pharmacie n’est pas disponible à cette date');
        }
    }

    private function recordEvent(
        string $orderId,
        ?string $actorId,
        string $eventType,
        ?string $fromStatus,
        ?string $toStatus,
        ?string $payloadJson,
    ): void {
        $this->db->prepare('
            INSERT INTO pharmacy_order_events (id, order_id, actor_id, event_type, from_status, to_status, payload_json)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ')->execute([
            self::newUuid(),
            $orderId,
            $actorId,
            $eventType,
            $fromStatus,
            $toStatus,
            $payloadJson,
        ]);
    }

    /**
     * @param list<array<string, mixed>> $orders
     * @return list<array<string, mixed>>
     */
    private function enrichOrdersWithDisplayNames(array $orders): array
    {
        if ($orders === []) {
            return [];
        }

        $profileIds = [];
        /** @var array<string, string> $relativeToPatient */
        $relativeToPatient = [];
        foreach ($orders as $order) {
            $profileIds[] = (string) $order['patient_id'];
            $profileIds[] = (string) $order['pharmacy_id'];
            if (!empty($order['requester_id'])) {
                $profileIds[] = (string) $order['requester_id'];
            }
            if (!empty($order['relative_id'])) {
                $relativeToPatient[(string) $order['relative_id']] = (string) $order['patient_id'];
            }
        }

        $userModel = new User();
        $uniqueIds = array_values(array_unique($profileIds));
        $names = $userModel->getDisplayNamesByIds($uniqueIds);
        $contacts = $userModel->getContactCardsByIds($uniqueIds);

        $relativeNames = [];
        if ($relativeToPatient !== []) {
            $relativeModel = new PatientRelative();
            foreach ($relativeToPatient as $relativeId => $patientId) {
                $relative = $relativeModel->getById($relativeId, $patientId);
                if ($relative === null) {
                    continue;
                }
                $relativeNames[$relativeId] = trim(
                    ((string) ($relative['first_name'] ?? '')) . ' ' . ((string) ($relative['last_name'] ?? ''))
                ) ?: null;
            }
        }

        $orders = RelativeProfile::withRelativeProfileIds($this->db, $orders);

        return array_map(static function (array $order) use ($names, $relativeNames, $contacts): array {
            $order['patient_display_name'] = $names[(string) $order['patient_id']] ?? null;
            $order['pharmacy_display_name'] = $names[(string) $order['pharmacy_id']] ?? null;
            $requesterId = !empty($order['requester_id']) ? (string) $order['requester_id'] : '';
            $order['requester_display_name'] = $requesterId !== ''
                ? ($names[$requesterId] ?? null)
                : null;
            $requesterContact = $requesterId !== '' ? ($contacts[$requesterId] ?? null) : null;
            $order['requester_phone'] = $requesterContact['phone'] ?? null;
            $order['requester_email'] = $requesterContact['email'] ?? null;
            $order['requester_emploi'] = $requesterContact['emploi'] ?? null;
            $order['requester_public_slug'] = $requesterContact['public_slug'] ?? null;
            if (!empty($order['relative_id'])) {
                $order['relative_display_name'] = $relativeNames[(string) $order['relative_id']] ?? null;
            }

            return $order;
        }, $orders);
    }

    /** @return list<string> */
    private static function decodePrescriptionIds(mixed $json): array
    {
        if (empty($json)) {
            return [];
        }
        $decoded = json_decode((string) $json, true);

        return is_array($decoded) ? $decoded : [];
    }

    /** @param array<string, mixed> $row */
    private function mapOrder(array $row): array
    {
        $prescriptionIds = self::decodePrescriptionIds($row['prescription_document_ids'] ?? null);
        $deliveryAddress = null;
        if (!empty($row['delivery_address_json'])) {
            $decoded = json_decode((string) $row['delivery_address_json'], true);
            if (is_array($decoded)) {
                $deliveryAddress = $decoded;
            }
        }

        return [
            'id' => (string) $row['id'],
            'requester_id' => (string) $row['requester_id'],
            'requester_role' => (string) $row['requester_role'],
            'pharmacy_id' => (string) $row['pharmacy_id'],
            'patient_id' => (string) $row['patient_id'],
            'relative_id' => $row['relative_id'] !== null ? (string) $row['relative_id'] : null,
            'fulfillment_mode' => (string) $row['fulfillment_mode'],
            'delivery_address' => $deliveryAddress,
            'delivery_postal_code' => $row['delivery_postal_code'] !== null
                ? (string) $row['delivery_postal_code']
                : null,
            'desired_fulfillment_date' => ($row['desired_fulfillment_date'] ?? null) !== null
                ? (string) $row['desired_fulfillment_date']
                : null,
            'status' => (string) $row['status'],
            'requester_comment' => $row['requester_comment'] !== null
                ? (string) $row['requester_comment']
                : null,
            'pharmacy_note' => $row['pharmacy_note'] !== null ? (string) $row['pharmacy_note'] : null,
            'rejection_reason' => $row['rejection_reason'] !== null
                ? (string) $row['rejection_reason']
                : null,
            'prescription_document_ids' => $prescriptionIds,
            'created_by_admin_id' => $row['created_by_admin_id'] !== null
                ? (string) $row['created_by_admin_id']
                : null,
            'created_at' => (string) $row['created_at'],
            'updated_at' => (string) $row['updated_at'],
        ];
    }
}

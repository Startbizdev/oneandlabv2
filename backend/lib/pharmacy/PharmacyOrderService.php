<?php

declare(strict_types=1);

require_once __DIR__ . '/PharmacyModuleConfig.php';
require_once __DIR__ . '/PharmacyOrderAccess.php';
require_once __DIR__ . '/PharmacyOrderConversation.php';
require_once __DIR__ . '/../../models/User.php';
require_once __DIR__ . '/../../models/PatientRelative.php';
require_once __DIR__ . '/../MedicalDocumentAccess.php';
require_once __DIR__ . '/../MedicalDocumentSubject.php';

/**
 * CRUD et transitions commandes pharmacie.
 */
final class PharmacyOrderService
{
    /** @var list<string> */
    private const TERMINAL_STATUSES = ['terminee', 'refusee', 'annulee'];

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

    /** @param array<string, mixed> $input */
    public function create(array $user, array $input): array
    {
        $config = $this->moduleConfig->getConfig();
        if (!PharmacyModuleConfig::canOrder($user, $config)) {
            throw new RuntimeException('Commande non autorisée pour ce compte');
        }

        $prescriptionIds = $input['prescription_document_ids'] ?? [];
        if (!is_array($prescriptionIds)) {
            throw new InvalidArgumentException('Liste d’ordonnances invalide');
        }
        $prescriptionIds = array_values(array_filter(
            array_map(static fn ($id) => trim((string) $id), $prescriptionIds),
            static fn (string $id) => $id !== ''
        ));
        $prescriptionIds = array_values(array_unique($prescriptionIds));
        if (count($prescriptionIds) > 10) {
            throw new InvalidArgumentException('Dix ordonnances maximum');
        }

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

        $relativeId = isset($input['relative_id']) && $input['relative_id'] !== ''
            ? trim((string) $input['relative_id'])
            : null;
        if ($relativeId !== null) {
            $this->assertRelativeBelongsToPatient($relativeId, $patientId);
        }

        $userModel = new User();
        $role = (string) ($user['role'] ?? '');
        $isPatientSelf = $role === 'patient' && $uid === $patientId;
        if (!$isPatientSelf && !$userModel->hasProfessionalAccessToPatient($uid, $patientId)) {
            throw new RuntimeException('Accès patient refusé');
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
            isset($input['requester_comment']) ? trim((string) $input['requester_comment']) : null,
            json_encode(array_values($prescriptionIds), JSON_UNESCAPED_UNICODE),
            $role === 'super_admin' ? $uid : null,
        ]);

        $this->recordEvent($id, $uid, 'created', null, 'en_attente', null);

        $order = $this->getById($id);
        if ($order === null) {
            throw new RuntimeException('Création commande échouée');
        }

        return $order;
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
    public function listForUser(array $user, string $scope = 'sent'): array
    {
        $uid = (string) ($user['user_id'] ?? '');
        $role = (string) ($user['role'] ?? '');

        if ($role === 'super_admin' && $scope === 'all') {
            $stmt = $this->db->query('SELECT * FROM pharmacy_orders ORDER BY created_at DESC LIMIT 200');

            return $this->enrichOrdersWithDisplayNames(
                array_map(fn ($r) => $this->mapOrder($r), $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [])
            );
        }

        if ($scope === 'patient') {
            $stmt = $this->db->prepare(
                'SELECT * FROM pharmacy_orders WHERE patient_id = ? ORDER BY created_at DESC LIMIT 200'
            );
            $stmt->execute([$uid]);
        } elseif ($scope === 'received') {
            $stmt = $this->db->prepare(
                'SELECT * FROM pharmacy_orders WHERE pharmacy_id = ? ORDER BY created_at DESC LIMIT 200'
            );
            $stmt->execute([$uid]);
        } else {
            $stmt = $this->db->prepare(
                'SELECT * FROM pharmacy_orders WHERE requester_id = ? ORDER BY created_at DESC LIMIT 200'
            );
            $stmt->execute([$uid]);
        }

        return $this->enrichOrdersWithDisplayNames(
            array_map(fn ($r) => $this->mapOrder($r), $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [])
        );
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
        $stmt = $this->db->prepare('
            SELECT md.*,
                   a.patient_id AS apt_patient_id,
                   a.relative_id AS apt_relative_id,
                   a.assigned_to,
                   a.assigned_nurse_id,
                   a.assigned_lab_id,
                   a.assigned_pro_id,
                   a.created_by AS apt_created_by
            FROM medical_documents md
            LEFT JOIN appointments a ON a.id = md.appointment_id
            WHERE md.id = ?
            LIMIT 1
        ');

        foreach ($documentIds as $documentId) {
            if (!preg_match('/^[a-f0-9-]{32,36}$/i', $documentId)) {
                throw new InvalidArgumentException('Identifiant d’ordonnance invalide');
            }
            $stmt->execute([$documentId]);
            $document = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$document || !MedicalDocumentAccess::userCanAccess($this->db, $user, $document)) {
                throw new RuntimeException('Accès ordonnance refusé');
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
                && (string) $document['patient_id'] === $patientId) {
                // Ordonnance déposée pour la commande : le patient est sur medical_documents,
                // pas forcément dans patient_documents.
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

    /** @param array<string, mixed> $row */
    private function mapOrder(array $row): array
    {
        $prescriptionIds = [];
        if (!empty($row['prescription_document_ids'])) {
            $decoded = json_decode((string) $row['prescription_document_ids'], true);
            if (is_array($decoded)) {
                $prescriptionIds = $decoded;
            }
        }
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

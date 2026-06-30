<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../lib/Crypto.php';
require_once __DIR__ . '/../lib/Logger.php';
require_once __DIR__ . '/../lib/Twilio.php';
require_once __DIR__ . '/../lib/Email.php';
require_once __DIR__ . '/../lib/NotificationService.php';
require_once __DIR__ . '/../lib/NotificationMessageFormatter.php';
require_once __DIR__ . '/../lib/EmailQueue.php';
require_once __DIR__ . '/../lib/SmsQueue.php';
require_once __DIR__ . '/../lib/Validation.php';
require_once __DIR__ . '/../lib/PatientUrgencyGuard.php';

/**
 * Modèle Appointment
 */

class Appointment
{
    private PDO $db;
    private Crypto $crypto;
    private Logger $logger;
    private ?Twilio $twilio = null;
    private Email $email;
    private NotificationService $notificationService;

    public function __construct()
    {
        $config = require __DIR__ . '/../config/database.php';
        
        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=%s',
            $config['host'],
            $config['port'],
            $config['database'],
            $config['charset']
        );
        
        $this->db = new PDO($dsn, $config['username'], $config['password'], $config['options']);
        $this->crypto = new Crypto();
        $this->logger = new Logger();
        
        // Twilio est optionnel - ne pas bloquer si les clés ne sont pas configurées
        try {
            $this->twilio = new Twilio();
        } catch (Exception $e) {
            // Twilio non configuré - SMS désactivés
            $this->twilio = null;
        }
        
        $this->email = new Email();
        $this->notificationService = new NotificationService();
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
        if ($userId === null || trim((string) $userId) === '') {
            return ['average_rating' => null, 'total_reviews' => null];
        }
        try {
            require_once __DIR__ . '/Review.php';
            $reviewModel = new Review();
            $stats = $reviewModel->getStats((string) $userId);
            $total = (int) ($stats['total_reviews'] ?? 0);
            if ($total <= 0) {
                return ['average_rating' => null, 'total_reviews' => null];
            }

            return [
                'average_rating' => $stats['average_rating'],
                'total_reviews' => $total,
            ];
        } catch (Throwable $e) {
            return ['average_rating' => null, 'total_reviews' => null];
        }
    }

    private function applyAssigneeReviewStats(array &$appointment): void
    {
        $map = [
            ['assigned_nurse_id', 'assigned_nurse_average_rating', 'assigned_nurse_reviews_count'],
            ['assigned_lab_id', 'assigned_lab_average_rating', 'assigned_lab_reviews_count'],
            ['assigned_to', 'assigned_to_average_rating', 'assigned_to_reviews_count'],
        ];
        foreach ($map as [$idKey, $ratingKey, $countKey]) {
            $appointment[$ratingKey] = null;
            $appointment[$countKey] = null;
            if (empty($appointment[$idKey])) {
                continue;
            }
            $stats = $this->reviewStatsForUserId((string) $appointment[$idKey]);
            $appointment[$ratingKey] = $stats['average_rating'];
            $appointment[$countKey] = $stats['total_reviews'];
        }
    }

    /**
     * Notes moyennes des assignés pour une page liste RDV (requête groupée).
     *
     * @param list<array<string, mixed>> $appointments
     */
    public function enrichListAssigneeReviewStats(array &$appointments): void
    {
        $userIds = [];
        foreach ($appointments as $apt) {
            foreach (['assigned_nurse_id', 'assigned_lab_id', 'assigned_to'] as $key) {
                if (!empty($apt[$key])) {
                    $userIds[] = (string) $apt[$key];
                }
            }
        }
        if ($userIds === []) {
            return;
        }

        require_once __DIR__ . '/Review.php';
        $statsByUser = (new Review())->getStatsByRevieweeIds($userIds);

        foreach ($appointments as &$appointment) {
            $map = [
                ['assigned_nurse_id', 'assigned_nurse_average_rating', 'assigned_nurse_reviews_count'],
                ['assigned_lab_id', 'assigned_lab_average_rating', 'assigned_lab_reviews_count'],
                ['assigned_to', 'assigned_to_average_rating', 'assigned_to_reviews_count'],
            ];
            foreach ($map as [$idKey, $ratingKey, $countKey]) {
                $appointment[$ratingKey] = null;
                $appointment[$countKey] = null;
                $uid = !empty($appointment[$idKey]) ? (string) $appointment[$idKey] : '';
                if ($uid === '' || !isset($statsByUser[$uid])) {
                    continue;
                }
                $appointment[$ratingKey] = $statsByUser[$uid]['average_rating'];
                $appointment[$countKey] = $statsByUser[$uid]['total_reviews'];
            }
        }
        unset($appointment);
    }

    /**
     *
     * @return list<array{category_id: ?string, label: ?string, care_options: array, sort_order: int}>
     */
    private function parseBloodTestItemsInputArray(?array $rawItems): array
    {
        if (!is_array($rawItems)) {
            return [];
        }
        $items = [];
        foreach ($rawItems as $idx => $item) {
            if (!is_array($item)) {
                continue;
            }
            $categoryId = isset($item['category_id']) && Validation::uuid((string) $item['category_id'])
                ? (string) $item['category_id']
                : null;
            $label = trim((string) ($item['label'] ?? $item['name'] ?? ''));
            $careOptions = $item['care_options'] ?? [];
            if (!is_array($careOptions)) {
                $careOptions = [];
            }
            if (!$categoryId && $label === '') {
                continue;
            }

            $items[] = [
                'category_id' => $categoryId,
                'label' => $label !== '' ? $label : null,
                'care_options' => $careOptions,
                'source_appointment_id' => null,
                'sort_order' => (int) ($item['sort_order'] ?? $idx),
            ];
        }

        return $items;
    }

    private function normalizeBloodTestItems(array $data): array
    {
        if (($data['type'] ?? '') !== 'blood_test') {
            return [];
        }

        $rawItems = $data['blood_test_items'] ?? ($data['form_data']['blood_test_items'] ?? null);
        $items = $this->parseBloodTestItemsInputArray(is_array($rawItems) ? $rawItems : null);

        if (empty($items)) {
            $careOptions = $data['form_data']['care_options'] ?? [];
            if (!is_array($careOptions)) {
                $careOptions = [];
            }
            $items[] = [
                'category_id' => !empty($data['category_id']) ? (string) $data['category_id'] : null,
                'label' => trim((string) ($data['form_data']['category_name'] ?? $data['form_data']['service_name'] ?? '')) ?: null,
                'care_options' => $careOptions,
                'source_appointment_id' => null,
                'sort_order' => 0,
            ];
        }

        return $items;
    }

    private function insertBloodTestItems(string $appointmentId, array $items): void
    {
        if (!$this->hasTable('appointment_blood_test_items')) {
            if (!empty($items)) {
                error_log(
                    'appointment_blood_test_items: table absente ou non détectée — insert ignoré ('
                    . count($items) . ' acte(s)) pour RDV ' . $appointmentId
                );
            }
            return;
        }
        if (empty($items)) {
            return;
        }
        $stmt = $this->db->prepare('
            INSERT INTO appointment_blood_test_items
            (id, appointment_id, category_id, label, care_options, source_appointment_id, sort_order, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ');
        foreach ($items as $idx => $item) {
            $stmt->execute([
                $this->generateUUID(),
                $appointmentId,
                $item['category_id'] ?? null,
                $item['label'] ?? null,
                json_encode($item['care_options'] ?? [], JSON_UNESCAPED_UNICODE),
                $item['source_appointment_id'] ?? null,
                (int) ($item['sort_order'] ?? $idx),
            ]);
        }
    }

    private function getBloodTestItems(string $appointmentId): array
    {
        if (!$this->hasTable('appointment_blood_test_items')) {
            return [];
        }
        $stmt = $this->db->prepare('
            SELECT bti.id, bti.appointment_id, bti.category_id, bti.label, bti.care_options,
                   bti.source_appointment_id, bti.sort_order, cc.name AS category_name, cc.icon AS category_icon,
                   cc.image_url AS category_image_url
            FROM appointment_blood_test_items bti
            LEFT JOIN care_categories cc ON cc.id = bti.category_id
            WHERE bti.appointment_id = ?
            ORDER BY bti.sort_order ASC, bti.created_at ASC, bti.id ASC
        ');
        $stmt->execute([$appointmentId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$row) {
            $decoded = json_decode((string) ($row['care_options'] ?? ''), true);
            $row['care_options'] = is_array($decoded) ? $decoded : [];
        }
        unset($row);
        return $rows;
    }

    private function bloodTestItemRowDedupKey(array $row): string
    {
        $cid = isset($row['category_id']) ? (string) $row['category_id'] : '';
        $lab = trim((string) ($row['label'] ?? $row['category_name'] ?? ''));

        return $cid . '|' . $lab;
    }

    /**
     * Dédup fusion table `appointment_nursing_items` vs `form_data.nursing_items` :
     * même category_id mais libellé vide d’un côté et nom catalogue de l’autre → deux clés avec bloodTestItemRowDedupKey alors que les care_options sont identiques.
     */
    private function nursingMergeDedupKey(array $row): string
    {
        $cid = isset($row['category_id']) ? (string) $row['category_id'] : '';
        $care = $row['care_options'] ?? [];
        if (!is_array($care)) {
            $care = [];
        }
        ksort($care);
        try {
            $json = json_encode($care, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        } catch (Throwable $e) {
            $json = '{}';
        }

        return $cid . '|' . $json;
    }

    /**
     * Complète category_name / icon / image_url pour des lignes issues du form (sans JOIN SQL initial).
     *
     * @param list<array<string,mixed>> $rows
     * @return list<array<string,mixed>>
     */
    private function enrichBloodTestRowsCategoryMeta(array $rows): array
    {
        $need = [];
        foreach ($rows as $r) {
            $cid = isset($r['category_id']) ? trim((string) $r['category_id']) : '';
            if ($cid === '' || !Validation::uuid($cid)) {
                continue;
            }
            $cn = trim((string) ($r['category_name'] ?? ''));
            if ($cn === '') {
                $need[$cid] = true;
            }
        }
        if (empty($need)) {
            return $rows;
        }
        $ids = array_keys($need);
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        try {
            $stmt = $this->db->prepare("
                SELECT id, name, icon, image_url
                FROM care_categories
                WHERE id IN ($placeholders)
            ");
            $stmt->execute($ids);
            $meta = [];
            while ($m = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $meta[(string) $m['id']] = $m;
            }
            foreach ($rows as &$r) {
                $cid = isset($r['category_id']) ? (string) $r['category_id'] : '';
                if ($cid === '' || trim((string) ($r['category_name'] ?? '')) !== '') {
                    continue;
                }
                if (isset($meta[$cid])) {
                    $r['category_name'] = $meta[$cid]['name'] ?? null;
                    if (empty($r['category_icon'])) {
                        $r['category_icon'] = $meta[$cid]['icon'] ?? null;
                    }
                    if (empty($r['category_image_url'])) {
                        $r['category_image_url'] = $meta[$cid]['image_url'] ?? null;
                    }
                }
            }
            unset($r);
        } catch (Throwable $e) {
            // ne pas bloquer l'affichage
        }

        return $rows;
    }

    /**
     * Lignes d'affichage depuis form_data.blood_test_items uniquement (pas de lecture table).
     *
     * @param list<array{category_id: ?string, label: ?string, care_options: array, sort_order: int, source_appointment_id: null}> $parsed
     * @return list<array<string,mixed>>
     */
    private function bloodTestDisplayRowsFromParsed(string $appointmentId, array $parsed): array
    {
        $rows = [];
        foreach ($parsed as $p) {
            $rows[] = [
                'id' => null,
                'appointment_id' => $appointmentId,
                'category_id' => $p['category_id'] ?? null,
                'label' => $p['label'] ?? null,
                'care_options' => is_array($p['care_options'] ?? null) ? $p['care_options'] : [],
                'source_appointment_id' => null,
                'sort_order' => (int) ($p['sort_order'] ?? 0),
                'category_name' => null,
                'category_icon' => null,
                'category_image_url' => null,
            ];
        }

        return $this->enrichBloodTestRowsCategoryMeta($rows);
    }

    /**
     * Fusionne lignes table + form : priorité à la table, puis ajoute les actes du form absents (clé category_id|label).
     *
     * @param list<array<string,mixed>> $tableRows
     * @param list<array<string,mixed>> $formRows
     * @return list<array<string,mixed>>
     */
    private function mergeBloodTestTableAndFormRows(array $tableRows, array $formRows): array
    {
        $seen = [];
        $out = [];
        foreach ($tableRows as $row) {
            $k = $this->bloodTestItemRowDedupKey($row);
            if ($k === '|') {
                continue;
            }
            if (isset($seen[$k])) {
                continue;
            }
            $seen[$k] = true;
            $out[] = $row;
        }
        foreach ($formRows as $row) {
            $k = $this->bloodTestItemRowDedupKey($row);
            if ($k === '|') {
                continue;
            }
            if (isset($seen[$k])) {
                continue;
            }
            $seen[$k] = true;
            $out[] = $row;
        }

        return $out;
    }

    /**
     * Actes prise de sang affichables : table appointment_blood_test_items + complément depuis form_data.blood_test_items
     * (même normalisation qu'à la création). Utilisé par GET liste et GET détail.
     *
     * @param array<string,mixed> $appointment id, type, form_data (déchiffré), category_id, category_name, category_icon, category_image_url
     * @param list<array<string,mixed>>|null $preloadedTableRows évite N+1 en liste
     * @return list<array<string,mixed>>
     */
    public function resolveBloodTestItemsForAppointment(array $appointment, ?array $preloadedTableRows = null): array
    {
        if (($appointment['type'] ?? '') !== 'blood_test') {
            return [];
        }
        $id = (string) ($appointment['id'] ?? '');
        if ($id === '') {
            return [];
        }
        $tableRows = $preloadedTableRows !== null ? $preloadedTableRows : $this->getBloodTestItems($id);
        $fd = isset($appointment['form_data']) && is_array($appointment['form_data']) ? $appointment['form_data'] : [];
        $rawForm = isset($fd['blood_test_items']) && is_array($fd['blood_test_items']) ? $fd['blood_test_items'] : null;
        $parsedForm = $this->parseBloodTestItemsInputArray($rawForm);
        $formRows = $this->bloodTestDisplayRowsFromParsed($id, $parsedForm);
        $merged = $this->mergeBloodTestTableAndFormRows($tableRows, $formRows);
        if (!empty($merged)) {
            return $merged;
        }
        $care = is_array($fd['care_options'] ?? null) ? $fd['care_options'] : [];

        return [[
            'id' => null,
            'appointment_id' => $id,
            'category_id' => $appointment['category_id'] ?? null,
            'label' => $appointment['category_name'] ?? null,
            'care_options' => $care,
            'source_appointment_id' => $id,
            'sort_order' => 0,
            'category_name' => $appointment['category_name'] ?? null,
            'category_icon' => $appointment['category_icon'] ?? null,
            'category_image_url' => $appointment['category_image_url'] ?? null,
        ]];
    }

    /**
     * Champs minimaux pour resolve sur plusieurs IDs (lot prise de sang).
     *
     * @param list<string> $appointmentIdsOrdered
     * @return array<string, array<string,mixed>>
     */
    private function loadBloodTestResolveSlicesById(array $appointmentIdsOrdered): array
    {
        $ids = array_values(array_unique(array_filter(array_map('strval', $appointmentIdsOrdered))));
        if (empty($ids)) {
            return [];
        }
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $this->db->prepare("
            SELECT a.id, a.type, a.category_id, a.form_data_encrypted, a.form_data_dek,
                   cc.name AS category_name, cc.icon AS category_icon, cc.image_url AS category_image_url
            FROM appointments a
            LEFT JOIN care_categories cc ON cc.id = a.category_id
            WHERE a.id IN ($placeholders)
        ");
        $stmt->execute($ids);
        $out = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $formData = [];
            if (!empty($row['form_data_encrypted']) && !empty($row['form_data_dek'])) {
                try {
                    $json = $this->crypto->decryptField($row['form_data_encrypted'], $row['form_data_dek']);
                    $decoded = json_decode((string) $json, true);
                    $formData = is_array($decoded) ? $decoded : [];
                } catch (Throwable $e) {
                    $formData = [];
                }
            }
            $aid = (string) $row['id'];
            $out[$aid] = [
                'id' => $aid,
                'type' => $row['type'] ?? null,
                'form_data' => $formData,
                'category_id' => $row['category_id'] ?? null,
                'category_name' => $row['category_name'] ?? null,
                'category_icon' => $row['category_icon'] ?? null,
                'category_image_url' => $row['category_image_url'] ?? null,
            ];
        }

        return $out;
    }

    public function loadBloodTestItemsForAppointments(array $appointmentIds): array
    {
        if (!$this->hasTable('appointment_blood_test_items')) {
            return [];
        }
        $ids = array_values(array_unique(array_filter(array_map('strval', $appointmentIds))));
        if (empty($ids)) {
            return [];
        }
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $this->db->prepare("
            SELECT bti.id, bti.appointment_id, bti.category_id, bti.label, bti.care_options,
                   bti.source_appointment_id, bti.sort_order, cc.name AS category_name, cc.icon AS category_icon,
                   cc.image_url AS category_image_url
            FROM appointment_blood_test_items bti
            LEFT JOIN care_categories cc ON cc.id = bti.category_id
            WHERE bti.appointment_id IN ($placeholders)
            ORDER BY bti.appointment_id ASC, bti.sort_order ASC, bti.created_at ASC
        ");
        $stmt->execute($ids);
        $byAppointment = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $decoded = json_decode((string) ($row['care_options'] ?? ''), true);
            $row['care_options'] = is_array($decoded) ? $decoded : [];
            $byAppointment[(string) $row['appointment_id']][] = $row;
        }
        return $byAppointment;
    }

    /**
     * Fusionne les actes prise de sang de plusieurs RDV d'un même lot (création batch),
     * pour l'affichage « une carte / un bloc prestations » sans dépendre de batch_siblings côté client.
     *
     * @param list<string> $appointmentIdsOrdered IDs dans l'ordre d'affichage souhaité (ex. scheduled_at).
     * @return list<array<string,mixed>>
     */
    public function mergeBloodTestItemsAcrossBatchAppointmentIds(array $appointmentIdsOrdered): array
    {
        $ids = array_values(array_unique(array_filter(array_map('strval', $appointmentIdsOrdered))));
        if (empty($ids)) {
            return [];
        }
        $byAppt = $this->loadBloodTestItemsForAppointments($ids);
        $slices = $this->loadBloodTestResolveSlicesById($ids);
        $merged = [];
        $seen = [];
        foreach ($ids as $bidStr) {
            $slice = $slices[$bidStr] ?? null;
            if (!$slice || ($slice['type'] ?? '') !== 'blood_test') {
                continue;
            }
            $pre = $byAppt[$bidStr] ?? [];
            $resolved = $this->resolveBloodTestItemsForAppointment($slice, $pre);
            foreach ($resolved as $row) {
                $key = $this->bloodTestItemRowDedupKey($row);
                if ($key === '|') {
                    continue;
                }
                if (isset($seen[$key])) {
                    continue;
                }
                $seen[$key] = true;
                $merged[] = $row;
            }
        }

        return $merged;
    }

    /**
     * @return list<array{category_id: ?string, label: ?string, care_options: array, sort_order: int}>
     */
    private function parseNursingItemsInputArray(?array $rawItems): array
    {
        return $this->parseBloodTestItemsInputArray($rawItems);
    }

    private function normalizeNursingItems(array $data): array
    {
        if (($data['type'] ?? '') !== 'nursing') {
            return [];
        }

        $rawItems = $data['nursing_items'] ?? ($data['form_data']['nursing_items'] ?? null);
        $items = $this->parseNursingItemsInputArray(is_array($rawItems) ? $rawItems : null);

        if (empty($items)) {
            $careOptions = $data['form_data']['care_options'] ?? [];
            if (!is_array($careOptions)) {
                $careOptions = [];
            }
            $items[] = [
                'category_id' => !empty($data['category_id']) ? (string) $data['category_id'] : null,
                'label' => trim((string) ($data['form_data']['category_name'] ?? $data['form_data']['service_name'] ?? '')) ?: null,
                'care_options' => $careOptions,
                'source_appointment_id' => null,
                'sort_order' => 0,
            ];
        }

        return $items;
    }

    private function insertNursingItems(string $appointmentId, array $items): void
    {
        if (!$this->hasTable('appointment_nursing_items')) {
            if (!empty($items)) {
                error_log(
                    'appointment_nursing_items: table absente ou non détectée — insert ignoré ('
                    . count($items) . ' acte(s)) pour RDV ' . $appointmentId
                );
            }

            return;
        }
        if (empty($items)) {
            return;
        }
        $stmt = $this->db->prepare('
            INSERT INTO appointment_nursing_items
            (id, appointment_id, category_id, label, care_options, source_appointment_id, sort_order, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ');
        foreach ($items as $idx => $item) {
            $stmt->execute([
                $this->generateUUID(),
                $appointmentId,
                $item['category_id'] ?? null,
                $item['label'] ?? null,
                json_encode($item['care_options'] ?? [], JSON_UNESCAPED_UNICODE),
                $item['source_appointment_id'] ?? null,
                (int) ($item['sort_order'] ?? $idx),
            ]);
        }
    }

    /**
     * @return list<array<string,mixed>>
     */
    private function getNursingItems(string $appointmentId): array
    {
        if (!$this->hasTable('appointment_nursing_items')) {
            return [];
        }
        $stmt = $this->db->prepare('
            SELECT bti.id, bti.appointment_id, bti.category_id, bti.label, bti.care_options,
                   bti.source_appointment_id, bti.sort_order, cc.name AS category_name, cc.icon AS category_icon,
                   cc.image_url AS category_image_url
            FROM appointment_nursing_items bti
            LEFT JOIN care_categories cc ON cc.id = bti.category_id
            WHERE bti.appointment_id = ?
            ORDER BY bti.sort_order ASC, bti.created_at ASC, bti.id ASC
        ');
        $stmt->execute([$appointmentId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$row) {
            $decoded = json_decode((string) ($row['care_options'] ?? ''), true);
            $row['care_options'] = is_array($decoded) ? $decoded : [];
        }
        unset($row);

        return $rows;
    }

    /**
     * @param list<array{category_id: ?string, label: ?string, care_options: array, sort_order: int, source_appointment_id: null}> $parsed
     */
    private function nursingDisplayRowsFromParsed(string $appointmentId, array $parsed): array
    {
        $rows = [];
        foreach ($parsed as $p) {
            $rows[] = [
                'id' => null,
                'appointment_id' => $appointmentId,
                'category_id' => $p['category_id'] ?? null,
                'label' => $p['label'] ?? null,
                'care_options' => is_array($p['care_options'] ?? null) ? $p['care_options'] : [],
                'source_appointment_id' => null,
                'sort_order' => (int) ($p['sort_order'] ?? 0),
                'category_name' => null,
                'category_icon' => null,
                'category_image_url' => null,
            ];
        }

        return $this->enrichBloodTestRowsCategoryMeta($rows);
    }

    /**
     * @param list<array<string,mixed>> $tableRows
     * @param list<array<string,mixed>> $formRows
     * @return list<array<string,mixed>>
     */
    private function mergeNursingTableAndFormRows(array $tableRows, array $formRows): array
    {
        $seen = [];
        $out = [];
        foreach ($tableRows as $row) {
            $k = $this->nursingMergeDedupKey($row);
            if ($k === '|') {
                continue;
            }
            if (isset($seen[$k])) {
                continue;
            }
            $seen[$k] = true;
            $out[] = $row;
        }
        foreach ($formRows as $row) {
            $k = $this->nursingMergeDedupKey($row);
            if ($k === '|') {
                continue;
            }
            if (isset($seen[$k])) {
                continue;
            }
            $seen[$k] = true;
            $out[] = $row;
        }

        return $out;
    }

    /**
     * @param array<string,mixed> $appointment
     * @param list<array<string,mixed>>|null $preloadedTableRows
     * @return list<array<string,mixed>>
     */
    public function resolveNursingItemsForAppointment(array $appointment, ?array $preloadedTableRows = null): array
    {
        if (($appointment['type'] ?? '') !== 'nursing') {
            return [];
        }
        $id = (string) ($appointment['id'] ?? '');
        if ($id === '') {
            return [];
        }
        $tableRows = $preloadedTableRows !== null ? $preloadedTableRows : $this->getNursingItems($id);
        $fd = isset($appointment['form_data']) && is_array($appointment['form_data']) ? $appointment['form_data'] : [];
        $rawForm = isset($fd['nursing_items']) && is_array($fd['nursing_items']) ? $fd['nursing_items'] : null;
        $parsedForm = $this->parseNursingItemsInputArray($rawForm);
        $formRows = $this->nursingDisplayRowsFromParsed($id, $parsedForm);
        $merged = $this->mergeNursingTableAndFormRows($tableRows, $formRows);
        if (!empty($merged)) {
            return $merged;
        }
        $care = is_array($fd['care_options'] ?? null) ? $fd['care_options'] : [];

        return [[
            'id' => null,
            'appointment_id' => $id,
            'category_id' => $appointment['category_id'] ?? null,
            'label' => $appointment['category_name'] ?? null,
            'care_options' => $care,
            'source_appointment_id' => $id,
            'sort_order' => 0,
            'category_name' => $appointment['category_name'] ?? null,
            'category_icon' => $appointment['category_icon'] ?? null,
            'category_image_url' => $appointment['category_image_url'] ?? null,
        ]];
    }

    /**
     * @param list<string> $appointmentIdsOrdered
     * @return array<string, array<string,mixed>>
     */
    private function loadNursingResolveSlicesById(array $appointmentIdsOrdered): array
    {
        $ids = array_values(array_unique(array_filter(array_map('strval', $appointmentIdsOrdered))));
        if (empty($ids)) {
            return [];
        }
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $this->db->prepare("
            SELECT a.id, a.type, a.category_id, a.form_data_encrypted, a.form_data_dek,
                   cc.name AS category_name, cc.icon AS category_icon, cc.image_url AS category_image_url
            FROM appointments a
            LEFT JOIN care_categories cc ON cc.id = a.category_id
            WHERE a.id IN ($placeholders)
        ");
        $stmt->execute($ids);
        $out = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $formData = [];
            if (!empty($row['form_data_encrypted']) && !empty($row['form_data_dek'])) {
                try {
                    $json = $this->crypto->decryptField($row['form_data_encrypted'], $row['form_data_dek']);
                    $decoded = json_decode((string) $json, true);
                    $formData = is_array($decoded) ? $decoded : [];
                } catch (Throwable $e) {
                    $formData = [];
                }
            }
            $aid = (string) $row['id'];
            $out[$aid] = [
                'id' => $aid,
                'type' => $row['type'] ?? null,
                'form_data' => $formData,
                'category_id' => $row['category_id'] ?? null,
                'category_name' => $row['category_name'] ?? null,
                'category_icon' => $row['category_icon'] ?? null,
                'category_image_url' => $row['category_image_url'] ?? null,
            ];
        }

        return $out;
    }

    public function loadNursingItemsForAppointments(array $appointmentIds): array
    {
        if (!$this->hasTable('appointment_nursing_items')) {
            return [];
        }
        $ids = array_values(array_unique(array_filter(array_map('strval', $appointmentIds))));
        if (empty($ids)) {
            return [];
        }
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $this->db->prepare("
            SELECT bti.id, bti.appointment_id, bti.category_id, bti.label, bti.care_options,
                   bti.source_appointment_id, bti.sort_order, cc.name AS category_name, cc.icon AS category_icon,
                   cc.image_url AS category_image_url
            FROM appointment_nursing_items bti
            LEFT JOIN care_categories cc ON cc.id = bti.category_id
            WHERE bti.appointment_id IN ($placeholders)
            ORDER BY bti.appointment_id ASC, bti.sort_order ASC, bti.created_at ASC
        ");
        $stmt->execute($ids);
        $byAppointment = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $decoded = json_decode((string) ($row['care_options'] ?? ''), true);
            $row['care_options'] = is_array($decoded) ? $decoded : [];
            $byAppointment[(string) $row['appointment_id']][] = $row;
        }

        return $byAppointment;
    }

    /**
     * Agrège les lignes nursing d’un lot legacy (plusieurs RDV même creation_batch_id) pour affichage liste/détail.
     *
     * @param list<string> $appointmentIdsOrdered
     * @return list<array<string,mixed>>
     */
    public function mergeNursingItemsAcrossBatchAppointmentIds(array $appointmentIdsOrdered): array
    {
        $ids = array_values(array_unique(array_filter(array_map('strval', $appointmentIdsOrdered))));
        if (empty($ids)) {
            return [];
        }
        $byAppt = $this->loadNursingItemsForAppointments($ids);
        $slices = $this->loadNursingResolveSlicesById($ids);
        $merged = [];
        $seen = [];
        foreach ($ids as $bidStr) {
            $slice = $slices[$bidStr] ?? null;
            if (!$slice || ($slice['type'] ?? '') !== 'nursing') {
                continue;
            }
            $pre = $byAppt[$bidStr] ?? [];
            $resolved = $this->resolveNursingItemsForAppointment($slice, $pre);
            foreach ($resolved as $row) {
                $key = $this->bloodTestItemRowDedupKey($row);
                if ($key === '|') {
                    continue;
                }
                if (isset($seen[$key])) {
                    continue;
                }
                $seen[$key] = true;
                $merged[] = $row;
            }
        }

        return $merged;
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
    public function create(array $data, string $createdBy, string $createdByRole): string
    {
        // Validation des champs requis
        if (empty($data['type']) || !Validation::appointmentType($data['type'])) {
            throw new Exception('Type de rendez-vous invalide. Doit être "blood_test" ou "nursing".');
        }
        
        if (empty($data['form_type']) || !Validation::appointmentType($data['form_type'])) {
            throw new Exception('Type de formulaire invalide. Doit être "blood_test" ou "nursing".');
        }
        
        if (empty($data['address']) || !is_array($data['address'])) {
            throw new Exception('Adresse requise et doit être un tableau.');
        }

        $addr = $data['address'];
        $addrLabel = isset($addr['label']) ? trim((string) $addr['label']) : '';
        if ($addrLabel === '') {
            throw new Exception('Adresse incomplète. Le libellé est requis.');
        }

        // Ne pas utiliser empty() sur lat/lng : empty(0) est vrai en PHP alors que 0 est une coordonnée valide.
        if (!array_key_exists('lat', $addr) || !array_key_exists('lng', $addr)) {
            throw new Exception('Adresse incomplète. Requis: label, lat, lng.');
        }
        if (!is_numeric($addr['lat']) || !is_numeric($addr['lng'])) {
            throw new Exception('Adresse incomplète. lat et lng doivent être numériques.');
        }

        // Validation des coordonnées géographiques
        $lat = floatval($addr['lat']);
        $lng = floatval($addr['lng']);
        
        if (!Validation::latitude($lat)) {
            throw new Exception('Latitude invalide. Doit être entre -90 et 90.');
        }
        
        if (!Validation::longitude($lng)) {
            throw new Exception('Longitude invalide. Doit être entre -180 et 180.');
        }
        
        if (empty($data['scheduled_at'])) {
            throw new Exception('Date de rendez-vous requise.');
        }
        
        // Fuseau métier : le front envoie des dates « locales France » sans offset (formulaire public /dashboard).
        $tzParis = new DateTimeZone('Europe/Paris');
        
        // Convertir la date au format attendu (Y-m-d H:i:s)
        // Accepter plusieurs formats : ISO, datetime-local, ou format français
        $scheduledDate = null;
        $dateFormats = [
            'Y-m-d H:i:s',      // Format standard
            'Y-m-d\TH:i',       // Format datetime-local HTML5
            'Y-m-d\TH:i:s',     // Format ISO avec secondes
            'Y-m-d H:i',        // Format sans secondes
            'd/m/Y H:i',        // Format français
            'd/m/Y H:i:s',      // Format français avec secondes
        ];
        
        foreach ($dateFormats as $format) {
            $parsed = DateTime::createFromFormat($format, $data['scheduled_at'], $tzParis);
            if ($parsed && $parsed->format($format) === $data['scheduled_at']) {
                $scheduledDate = $parsed;
                break;
            }
        }
        
        // Si aucun format ne correspond : instant explicite (Z / offset) ou sinon heure locale Paris (chaîne sans fuseau)
        if (!$scheduledDate) {
            try {
                $raw = (string) $data['scheduled_at'];
                if (preg_match('/[zZ]|[+-]\d{2}:?\d{2}$/', $raw)) {
                    $scheduledDate = new DateTime($raw);
                    $scheduledDate->setTimezone($tzParis);
                } else {
                    $scheduledDate = new DateTime($raw, $tzParis);
                }
            } catch (Exception $e) {
                throw new Exception('Format de date invalide. Formats acceptés: Y-m-d H:i:s, Y-m-dTH:i, d/m/Y H:i');
            }
        }
        
        // Normaliser la date au format attendu
        $data['scheduled_at'] = $scheduledDate->format('Y-m-d H:i:s');
        
        // Référence « maintenant » en heure de Paris (cohérent avec les chaînes sans fuseau)
        $now = new DateTime('now', $tzParis);
        if ($scheduledDate < $now) {
            // « Toute la journée » : le front envie souvent 00:00:00 (heure Paris) ; ce même jour à 18 h, ce timestamp
            // est techniquement « dans le passé » mais il désigne encore le jour courant → on accepte ce cas uniquement.
            // Un horaire explicite déjà passé (ex. 08:00 alors qu’il est 18:00) reste refusé ci-dessous.
            $isStartOfCalendarDay = $scheduledDate->format('H:i:s') === '00:00:00';
            $sameLocalCalendarDay = $scheduledDate->format('Y-m-d') === $now->format('Y-m-d');
            if (!($isStartOfCalendarDay && $sameLocalCalendarDay)) {
                throw new Exception('La date du rendez-vous ne peut pas être dans le passé.');
            }
        }
        
        // Validation patient_id ou guest_email
        if (empty($data['patient_id']) && empty($data['guest_email'])) {
            throw new Exception('patient_id ou guest_email requis.');
        }
        
        if (!empty($data['guest_email']) && !Validation::email($data['guest_email'])) {
            throw new Exception('Email invité invalide.');
        }

        PatientUrgencyGuard::assertPaidOrNotRequired($data, $createdByRole);
        
        // Validation category_id si présent
        if (!empty($data['category_id']) && !Validation::uuid($data['category_id'])) {
            throw new Exception('ID de catégorie invalide (format UUID requis).');
        }
        
        // Validation relative_id si présent
        if (!empty($data['relative_id']) && !Validation::uuid($data['relative_id'])) {
            throw new Exception('ID de proche invalide (format UUID requis).');
        }
        
        $status = 'pending';
        if (!empty($data['status']) && Validation::appointmentStatus($data['status'])) {
            $status = $data['status'];
        }
        
        $id = $this->generateUUID();
        $bloodTestItems = $this->normalizeBloodTestItems($data);
        if (($data['type'] ?? '') === 'blood_test') {
            error_log(sprintf(
                '[appointments] blood_test create normalized_items=%d table_appointment_blood_test_items=%s appointment_id=%s',
                count($bloodTestItems),
                $this->hasTable('appointment_blood_test_items') ? '1' : '0',
                $id
            ));
        }
        if (($data['type'] ?? '') === 'blood_test' && empty($data['category_id']) && !empty($bloodTestItems[0]['category_id'])) {
            $data['category_id'] = $bloodTestItems[0]['category_id'];
        }

        $nursingItems = $this->normalizeNursingItems($data);
        if (($data['type'] ?? '') === 'nursing') {
            error_log(sprintf(
                '[appointments] nursing create normalized_items=%d table_appointment_nursing_items=%s',
                count($nursingItems),
                $this->hasTable('appointment_nursing_items') ? '1' : '0'
            ));
            if (!isset($data['form_data']) || !is_array($data['form_data'])) {
                $data['form_data'] = [];
            }
            if (!empty($nursingItems)) {
                $data['form_data']['nursing_items'] = array_values(array_map(static function ($it) {
                    return [
                        'category_id' => $it['category_id'] ?? null,
                        'label' => $it['label'] ?? null,
                        'care_options' => isset($it['care_options']) && is_array($it['care_options']) ? $it['care_options'] : [],
                        'sort_order' => (int) ($it['sort_order'] ?? 0),
                    ];
                }, $nursingItems));
            }
            if (count($nursingItems) > 1 && isset($data['form_data']['care_options'])) {
                unset($data['form_data']['care_options']);
            }
            if (empty($data['category_id']) && !empty($nursingItems[0]['category_id'])) {
                $data['category_id'] = $nursingItems[0]['category_id'];
            }
        }

        $creationBatchId = null;
        if (!empty($data['creation_batch_id']) && Validation::uuid((string) $data['creation_batch_id'])) {
            $creationBatchId = (string) $data['creation_batch_id'];
        }
        
        // Chiffrer l'adresse
        $addressEncrypted = $this->crypto->encryptField($data['address']['label']);
        
        // Chiffrer les données du formulaire (JSON)
        $formDataJson = json_encode($data['form_data'] ?? []);
        $formDataEncrypted = $this->crypto->encryptField($formDataJson);
        
        // Générer token guest si nécessaire
        $guestToken = null;
        $guestEmailEncrypted = null;
        $guestEmailDek = null;
        
        if (empty($data['patient_id']) && !empty($data['guest_email'])) {
            $guestToken = bin2hex(random_bytes(32));
            $guestEmailData = $this->crypto->encryptField($data['guest_email']);
            $guestEmailEncrypted = $guestEmailData['encrypted'];
            $guestEmailDek = $guestEmailData['dek'];
        }
        
        $assignedLabId = null;
        $assignedNurseId = null;
        $assignedTo = null;
        $assignedProId = !empty($data['assigned_pro_id']) ? (string) $data['assigned_pro_id'] : null;
        $attributionQrId = !empty($data['attribution_qr_id']) ? (string) $data['attribution_qr_id'] : null;
        if (!empty($data['type'])) {
            if ($data['type'] === 'blood_test') {
                if (!empty($data['assigned_lab_id'])) {
                    $assignedLabId = $data['assigned_lab_id'];
                }
                if (!empty($data['assigned_to'])) {
                    $assignedTo = $data['assigned_to'];
                }
            }
            if (($data['type'] === 'nursing') && !empty($data['assigned_nurse_id'])) {
                $assignedNurseId = $data['assigned_nurse_id'];
            }
        }

        // Lab / sous-compte sans assigned_lab_id dans le body : assigner au créateur (sinon INSERT NULL + dispatch géo envoie mail à tous les sous-comptes de la zone)
        if (($data['type'] ?? '') === 'blood_test' && in_array($createdByRole, ['lab', 'subaccount'], true) && empty($assignedLabId)) {
            $assignedLabId = $createdBy;
        }
        
        // Nurse crée un RDV nursing : confirmé, assigné à lui-même, pas de dispatch
        if ($createdByRole === 'nurse' && ($data['type'] ?? '') === 'nursing') {
            $status = 'confirmed';
            $assignedNurseId = $createdBy;
        }

        // Patient / invité réserve chez un infirmier identifié (QR, fiche publique) : confirmé directement
        if (
            ($data['type'] ?? '') === 'nursing'
            && !empty($assignedNurseId)
            && $createdByRole !== 'nurse'
        ) {
            $status = 'confirmed';
        }

        // Validation paramètres lab pour RDV prise de sang (création par pro ou assignation à un lab)
        if ($data['type'] === 'blood_test') {
            $effectiveLabId = $assignedLabId;
            if (!$effectiveLabId && in_array($createdByRole, ['lab', 'subaccount'], true)) {
                $effectiveLabId = $createdBy;
            }
            if ($effectiveLabId) {
                $skipLabLeadTime = in_array($createdByRole, ['nurse', 'lab', 'subaccount', 'preleveur', 'pro', 'super_admin'], true);
                $this->validateLabAppointmentParams($effectiveLabId, $data['scheduled_at'], $scheduledDate, $skipLabLeadTime);
            }
        }

        // Lab / sous-compte : prise de sang assignée au créateur → confirmé (pas de file pending / popup dashboard)
        if (
            in_array($createdByRole, ['lab', 'subaccount'], true)
            && ($data['type'] ?? '') === 'blood_test'
            && !empty($assignedLabId)
            && $assignedLabId === $createdBy
        ) {
            $status = 'confirmed';
        }

        $stmt = $this->db->prepare('
            INSERT INTO appointments (
                id, creation_batch_id, type, status, patient_id, relative_id, created_by, created_by_role,
                category_id, form_type,
                location_lat, location_lng,
                address_encrypted, address_dek,
                form_data_encrypted, form_data_dek,
                guest_token, guest_email_encrypted, guest_email_dek,
                scheduled_at,
                assigned_lab_id, assigned_nurse_id, assigned_to, attribution_qr_id, assigned_pro_id,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ');

        $stmt->execute([
            $id,
            $creationBatchId,
            $data['type'],
            $status,
            $data['patient_id'] ?? null,
            $data['relative_id'] ?? null,
            $createdBy,
            $createdByRole,
            $data['category_id'] ?? null,
            $data['form_type'],
            $data['address']['lat'],
            $data['address']['lng'],
            $addressEncrypted['encrypted'],
            $addressEncrypted['dek'],
            $formDataEncrypted['encrypted'],
            $formDataEncrypted['dek'],
            $guestToken ? hash('sha256', $guestToken) : null,
            $guestEmailEncrypted,
            $guestEmailDek,
            $data['scheduled_at'],
            $assignedLabId,
            $assignedNurseId,
            $assignedTo,
            $attributionQrId,
            $assignedProId,
        ]);

        if (($data['type'] ?? '') === 'blood_test') {
            $this->insertBloodTestItems($id, $bloodTestItems);
        }
        if (($data['type'] ?? '') === 'nursing') {
            $this->insertNursingItems($id, $nursingItems);
        }
        
        // Logger la création
        $this->logger->log(
            $createdBy,
            $createdByRole,
            'create',
            'appointment',
            $id,
            ['type' => $data['type'], 'status' => $status]
        );
        
        // Dispatch et notifications sont exécutés après l'envoi de la réponse HTTP (voir API POST /appointments) pour éviter timeout
        return $id;
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
            || (($data['type'] ?? '') === 'nursing' && !empty($nursingAssignedNurseId));

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
        if (!empty($assignedProId)) {
            $skipDispatch = true;
        }

        if (!$skipDispatch) {
            $batchIdForDispatch = is_string($data['creation_batch_id'] ?? null) && !empty($data['creation_batch_id']) ? $data['creation_batch_id'] : null;
            $this->dispatchGeographic($id, $data['type'] ?? '', $lat, $lng, $data['scheduled_at'] ?? null, $data['form_data'] ?? null, null, $batchIdForDispatch);
        }

        // Notification ciblée : uniquement l'infirmier concerné (réservation depuis son profil public)
        if (
            ($data['type'] ?? '') === 'nursing'
            && !empty($nursingAssignedNurseId)
            && $createdByRole !== 'nurse'
        ) {
            $this->dispatchDirectedNurseOnly(
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
            $this->dispatchDirectedProOnly(
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
                $loaded = $this->loadNursingItemsForAppointments([$id]);
                $pre = $loaded[$id] ?? [];
                $resolvedForNotif = $this->resolveNursingItemsForAppointment([
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

    /**
     * Valide que la date du RDV respecte les paramètres du lab (délai min, samedi, dimanche).
     *
     * @param bool $skipLeadTimeValidation Si true (création depuis espace pro / personnel soignant / lab / admin), n'applique pas le délai min. du profil lab (RDV le jour J autorisé).
     * @throws Exception si la date ne respecte pas les contraintes
     */
    private function validateLabAppointmentParams(string $labId, string $scheduledAtIso, DateTime $scheduledDate, bool $skipLeadTimeValidation = false): void
    {
        try {
            $stmt = $this->db->prepare('
                SELECT min_booking_lead_time_hours,
                       COALESCE(accept_rdv_saturday, 1) as accept_rdv_saturday,
                       COALESCE(accept_rdv_sunday, 1) as accept_rdv_sunday
                FROM profiles WHERE id = ?
            ');
            $stmt->execute([$labId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (Throwable $e) {
            return;
        }
        if (!$row) {
            return;
        }
        $minHours = (int) ($row['min_booking_lead_time_hours'] ?? 48);
        $acceptSaturday = (bool) ($row['accept_rdv_saturday'] ?? true);
        $acceptSunday = (bool) ($row['accept_rdv_sunday'] ?? true);

        $tzParis = new DateTimeZone('Europe/Paris');
        $now = new DateTime('now', $tzParis);
        if ($minHours > 0 && !$skipLeadTimeValidation) {
            $minAllowed = (clone $now)->modify("+{$minHours} hours");
            if ($scheduledDate < $minAllowed) {
                throw new Exception("La date du rendez-vous doit être au moins {$minHours}h à l'avance par rapport à maintenant.");
            }
        }
        $dayOfWeek = (int) $scheduledDate->format('w'); // 0 = dimanche, 6 = samedi
        if ($dayOfWeek === 0 && !$acceptSunday) {
            throw new Exception('Ce laboratoire n\'accepte pas les rendez-vous le dimanche.');
        }
        if ($dayOfWeek === 6 && !$acceptSaturday) {
            throw new Exception('Ce laboratoire n\'accepte pas les rendez-vous le samedi.');
        }
    }

    /**
     * Déduit is_minor et age_years depuis birth_date du proche (Europe/Paris).
     * N'ajoute les clés que si le calcul est fiable (date valide, pas dans le futur).
     */
    private function enrichRelativeMinorFromBirthDate(array &$relative): void
    {
        $bd = $relative['birth_date'] ?? null;
        if ($bd === null || $bd === '') {
            return;
        }
        try {
            $tz = new DateTimeZone('Europe/Paris');
            $today = new DateTime('now', $tz);
            $today->setTime(0, 0, 0);
            $birthStr = is_string($bd) ? trim($bd) : '';
            if ($birthStr === '') {
                return;
            }
            $birth = null;
            if (preg_match('/^(\d{4}-\d{2}-\d{2})/', $birthStr, $m)) {
                $birth = DateTime::createFromFormat('Y-m-d', $m[1], $tz);
            }
            if (!$birth instanceof DateTime) {
                $birth = new DateTime($birthStr, $tz);
            }
            $birth->setTime(0, 0, 0);
            if ($birth > $today) {
                return;
            }
            $age = $today->diff($birth)->y;
            if ($age < 0 || $age > 130) {
                return;
            }
            $relative['age_years'] = $age;
            $relative['is_minor'] = $age < 18;
        } catch (Throwable $e) {
            // Ne pas exposer is_minor si calcul non fiable
        }
    }

    /**
     * Récupère un rendez-vous par ID (avec déchiffrement)
     */
    public function getById(string $id, string $requesterId, string $requesterRole): ?array
    {
        $stmt = $this->db->prepare('
            SELECT
                a.*,
                pr.first_name_encrypted as relative_first_name_encrypted,
                pr.first_name_dek as relative_first_name_dek,
                pr.last_name_encrypted as relative_last_name_encrypted,
                pr.last_name_dek as relative_last_name_dek,
                pr.email_encrypted as relative_email_encrypted,
                pr.email_dek as relative_email_dek,
                pr.phone_encrypted as relative_phone_encrypted,
                pr.phone_dek as relative_phone_dek,
                pr.relationship_type as relative_relationship_type,
                pr.birth_date_encrypted as relative_birth_date_encrypted,
                pr.birth_date_dek as relative_birth_date_dek,
                cc.name as category_name,
                cc.type as category_type,
                cc.icon as category_icon,
                cc.image_url as category_image_url
            FROM appointments a
            LEFT JOIN patient_relatives pr ON a.relative_id = pr.id
            LEFT JOIN care_categories cc ON a.category_id = cc.id
            WHERE a.id = ?
        ');
        $stmt->execute([$id]);
        $appointment = $stmt->fetch();

        if (!$appointment) {
            return null;
        }

        if (!empty($appointment['merged_into_appointment_id'])) {
            return $this->getById((string) $appointment['merged_into_appointment_id'], $requesterId, $requesterRole);
        }

        // Traiter les données du proche si présent
        if ($appointment['relative_id']) {
            $appointment['relative'] = [
                'id' => $appointment['relative_id'],
                'first_name' => $this->crypto->decryptField(
                    $appointment['relative_first_name_encrypted'],
                    $appointment['relative_first_name_dek']
                ),
                'last_name' => $this->crypto->decryptField(
                    $appointment['relative_last_name_encrypted'],
                    $appointment['relative_last_name_dek']
                ),
                'email' => $appointment['relative_email_encrypted'] ? $this->crypto->decryptField(
                    $appointment['relative_email_encrypted'],
                    $appointment['relative_email_dek']
                ) : null,
                'phone' => $appointment['relative_phone_encrypted'] ? $this->crypto->decryptField(
                    $appointment['relative_phone_encrypted'],
                    $appointment['relative_phone_dek']
                ) : null,
                'relationship_type' => $appointment['relative_relationship_type'],
                'birth_date' => (!empty($appointment['relative_birth_date_encrypted']) && !empty($appointment['relative_birth_date_dek']))
                    ? $this->crypto->decryptField($appointment['relative_birth_date_encrypted'], $appointment['relative_birth_date_dek'])
                    : null,
                'contact_is_parent' => false,
            ];

            // Fallback : si le proche n'a pas d'email/téléphone, utiliser ceux du patient parent
            if ((!$appointment['relative']['email'] || !$appointment['relative']['phone']) && $appointment['patient_id']) {
                try {
                    $stmtParent = $this->db->prepare('
                        SELECT email_encrypted, email_dek, phone_encrypted, phone_dek 
                        FROM profiles 
                        WHERE id = ?
                    ');
                    $stmtParent->execute([$appointment['patient_id']]);
                    $parent = $stmtParent->fetch();
                    
                    if ($parent) {
                        // Utiliser l'email du parent si le proche n'en a pas
                        if (!$appointment['relative']['email'] && $parent['email_encrypted'] && $parent['email_dek']) {
                            $appointment['relative']['email'] = $this->crypto->decryptField(
                                $parent['email_encrypted'],
                                $parent['email_dek']
                            );
                            $appointment['relative']['contact_is_parent'] = true;
                        }
                        
                        // Utiliser le téléphone du parent si le proche n'en a pas
                        if (!$appointment['relative']['phone'] && $parent['phone_encrypted'] && $parent['phone_dek']) {
                            $appointment['relative']['phone'] = $this->crypto->decryptField(
                                $parent['phone_encrypted'],
                                $parent['phone_dek']
                            );
                            $appointment['relative']['contact_is_parent'] = true;
                        }
                    }
                } catch (Exception $e) {
                    // Ignorer les erreurs de fallback, continuer avec les données du proche uniquement
                }
            }

            $this->enrichRelativeMinorFromBirthDate($appointment['relative']);

            // Nettoyer les champs chiffrés du proche
            unset(
                $appointment['relative_first_name_encrypted'],
                $appointment['relative_first_name_dek'],
                $appointment['relative_last_name_encrypted'],
                $appointment['relative_last_name_dek'],
                $appointment['relative_email_encrypted'],
                $appointment['relative_email_dek'],
                $appointment['relative_phone_encrypted'],
                $appointment['relative_phone_dek'],
                $appointment['relative_relationship_type'],
                $appointment['relative_birth_date_encrypted'],
                $appointment['relative_birth_date_dek']
            );
        }
        
        // Déchiffrer adresse + form_data (indépendamment — ne pas perdre form_data si l'adresse échoue)
        $this->decryptAppointmentSensitiveFields($appointment, $requesterId, $requesterRole);
        
        // Nettoyer les champs chiffrés
        unset($appointment['address_encrypted'], $appointment['address_dek']);
        unset($appointment['form_data_encrypted'], $appointment['form_data_dek']);
        
        // Libellés et infos d'assignation (lab / préleveur) pour la liste et pour la page patient (logo, adresse, tél)
        $appointment['assigned_lab_display_name'] = null;
        $appointment['assigned_lab_role'] = null;
        $appointment['assigned_lab_phone'] = null;
        $appointment['assigned_lab_address'] = null;
        $appointment['assigned_lab_profile_image_url'] = null;
        $appointment['assigned_lab_public_slug'] = null;
        $appointment['assigned_to_display_name'] = null;
        $appointment['assigned_to_phone'] = null;
        $appointment['assigned_to_address'] = null;
        $appointment['assigned_to_profile_image_url'] = null;
        $appointment['assigned_to_email'] = null;
        $appointment['assigned_to_public_slug'] = null;
        $appointment['assigned_nurse_display_name'] = null;
        $appointment['assigned_nurse_profile_image_url'] = null;
        $appointment['assigned_nurse_public_slug'] = null;
        $appointment['assigned_nurse_phone'] = null;
        try {
            require_once __DIR__ . '/User.php';
            $userModel = new User();
            if (!empty($appointment['assigned_lab_id'])) {
                $labProfile = $userModel->getById($appointment['assigned_lab_id'], 'system', 'system');
                if ($labProfile) {
                    $company = isset($labProfile['company_name']) ? trim((string)$labProfile['company_name']) : '';
                    $first = trim((string)($labProfile['first_name'] ?? ''));
                    $last = trim((string)($labProfile['last_name'] ?? ''));
                    $name = trim($first . ' ' . $last);
                    $appointment['assigned_lab_display_name'] = $company !== '' ? $company : ($name !== '' ? $name : null);
                    $appointment['assigned_lab_role'] = $labProfile['role'] ?? null;
                    $appointment['assigned_lab_phone'] = isset($labProfile['phone']) ? trim((string)$labProfile['phone']) : null;
                    $appointment['assigned_lab_address'] = isset($labProfile['address']['label']) ? trim((string)$labProfile['address']['label']) : (is_string($labProfile['address'] ?? null) ? trim($labProfile['address']) : null);
                    $appointment['assigned_lab_profile_image_url'] = isset($labProfile['profile_image_url']) ? trim((string)$labProfile['profile_image_url']) : null;
                    $appointment['assigned_lab_public_slug'] = isset($labProfile['public_slug']) && trim((string)$labProfile['public_slug']) !== '' ? trim((string)$labProfile['public_slug']) : null;
                }
            }
            if (!empty($appointment['assigned_nurse_id'])) {
                $nurseProfile = $userModel->getById($appointment['assigned_nurse_id'], 'system', 'system');
                if ($nurseProfile) {
                    $first = trim((string)($nurseProfile['first_name'] ?? ''));
                    $last = trim((string)($nurseProfile['last_name'] ?? ''));
                    $appointment['assigned_nurse_display_name'] = trim($first . ' ' . $last) ?: null;
                    $appointment['assigned_nurse_profile_image_url'] = isset($nurseProfile['profile_image_url']) ? trim((string)$nurseProfile['profile_image_url']) : null;
                    $appointment['assigned_nurse_public_slug'] = isset($nurseProfile['public_slug']) && trim((string)$nurseProfile['public_slug']) !== '' ? trim((string)$nurseProfile['public_slug']) : null;
                    $appointment['assigned_nurse_phone'] = isset($nurseProfile['phone']) ? trim((string)$nurseProfile['phone']) : null;
                }
            }
            if (!empty($appointment['assigned_to'])) {
                $preleveurProfile = $userModel->getById($appointment['assigned_to'], 'system', 'system');
                if ($preleveurProfile) {
                    $first = trim((string)($preleveurProfile['first_name'] ?? ''));
                    $last = trim((string)($preleveurProfile['last_name'] ?? ''));
                    $appointment['assigned_to_display_name'] = trim($first . ' ' . $last) ?: null;
                    $appointment['assigned_to_phone'] = isset($preleveurProfile['phone']) ? trim((string)$preleveurProfile['phone']) : null;
                    $appointment['assigned_to_address'] = isset($preleveurProfile['address']['label']) ? trim((string)$preleveurProfile['address']['label']) : (is_string($preleveurProfile['address'] ?? null) ? trim($preleveurProfile['address']) : null);
                    $appointment['assigned_to_profile_image_url'] = isset($preleveurProfile['profile_image_url']) ? trim((string)$preleveurProfile['profile_image_url']) : null;
                    $appointment['assigned_to_email'] = isset($preleveurProfile['email']) ? trim((string)$preleveurProfile['email']) : null;
                    $appointment['assigned_to_public_slug'] = isset($preleveurProfile['public_slug']) && trim((string) $preleveurProfile['public_slug']) !== '' ? trim((string) $preleveurProfile['public_slug']) : null;
                }
            }

            $this->applyAssigneeReviewStats($appointment);

            // Origine du RDV (créateur)
            $appointment['creator_origin'] = null;
            $cb = $appointment['created_by'] ?? null;
            $cbRole = $appointment['created_by_role'] ?? null;
            $pid = $appointment['patient_id'] ?? null;
            if (!empty($cb) && $cbRole !== null && (string) $cbRole !== '') {
                if ($cbRole === 'patient' || ($pid !== null && (string) $cb === (string) $pid)) {
                    $appointment['creator_origin'] = [
                        'kind' => 'patient_platform',
                        'label' => 'cary',
                    ];
                } elseif ($cbRole === 'nurse') {
                    $cp = $userModel->getById((string) $cb, 'system', 'system');
                    if ($cp) {
                        $fn = trim((string) ($cp['first_name'] ?? ''));
                        $ln = trim((string) ($cp['last_name'] ?? ''));
                        $appointment['creator_origin'] = array_merge([
                            'kind' => 'nurse',
                            'id' => (string) $cb,
                            'display_name' => trim($fn . ' ' . $ln) ?: null,
                            'first_name' => $fn !== '' ? $fn : null,
                            'last_name' => $ln !== '' ? $ln : null,
                            'phone' => isset($cp['phone']) ? trim((string) $cp['phone']) : null,
                            'profile_image_url' => isset($cp['profile_image_url']) ? trim((string) $cp['profile_image_url']) : null,
                            'public_slug' => isset($cp['public_slug']) && trim((string) $cp['public_slug']) !== '' ? trim((string) $cp['public_slug']) : null,
                        ], $this->reviewStatsForUserId((string) $cb));
                    }
                } elseif ($cbRole === 'pro') {
                    $cp = $userModel->getById((string) $cb, 'system', 'system');
                    if ($cp) {
                        $fn = trim((string) ($cp['first_name'] ?? ''));
                        $ln = trim((string) ($cp['last_name'] ?? ''));
                        $emploi = isset($cp['emploi']) ? trim((string) $cp['emploi']) : '';
                        $bio = isset($cp['biography']) ? trim((string) $cp['biography']) : '';
                        $website = isset($cp['website_url']) ? trim((string) $cp['website_url']) : '';
                        $cover = isset($cp['cover_image_url']) ? trim((string) $cp['cover_image_url']) : '';
                        $socialLinks = null;
                        if (!empty($cp['social_links'])) {
                            if (is_string($cp['social_links'])) {
                                $decoded = json_decode($cp['social_links'], true);
                                if (is_array($decoded)) {
                                    $socialLinks = $decoded;
                                }
                            } elseif (is_array($cp['social_links'])) {
                                $socialLinks = $cp['social_links'];
                            }
                        }
                        $appointment['creator_origin'] = array_merge([
                            'kind' => 'pro',
                            'id' => (string) $cb,
                            'display_name' => trim($fn . ' ' . $ln) ?: null,
                            'first_name' => $fn !== '' ? $fn : null,
                            'last_name' => $ln !== '' ? $ln : null,
                            'phone' => isset($cp['phone']) ? trim((string) $cp['phone']) : null,
                            'adeli' => isset($cp['adeli']) ? trim((string) $cp['adeli']) : null,
                            'emploi' => $emploi !== '' ? $emploi : null,
                            'biography' => $bio !== '' ? $bio : null,
                            'profile_image_url' => isset($cp['profile_image_url']) ? trim((string) $cp['profile_image_url']) : null,
                            'cover_image_url' => $cover !== '' ? $cover : null,
                            'website_url' => $website !== '' ? $website : null,
                            'social_links' => $socialLinks,
                            'public_slug' => isset($cp['public_slug']) && trim((string) $cp['public_slug']) !== '' ? trim((string) $cp['public_slug']) : null,
                        ], $this->reviewStatsForUserId((string) $cb));
                    }
                } elseif (in_array($cbRole, ['lab', 'subaccount', 'preleveur'], true)) {
                    $cp = $userModel->getById((string) $cb, 'system', 'system');
                    if ($cp) {
                        $company = isset($cp['company_name']) ? trim((string) $cp['company_name']) : '';
                        $fn = trim((string) ($cp['first_name'] ?? ''));
                        $ln = trim((string) ($cp['last_name'] ?? ''));
                        $name = trim($fn . ' ' . $ln);
                        $appointment['creator_origin'] = array_merge([
                            'kind' => 'lab_team',
                            'id' => (string) $cb,
                            'role' => $cbRole,
                            'display_name' => $company !== '' ? $company : ($name !== '' ? $name : null),
                            'profile_image_url' => isset($cp['profile_image_url']) ? trim((string) $cp['profile_image_url']) : null,
                            'public_slug' => isset($cp['public_slug']) && trim((string) $cp['public_slug']) !== '' ? trim((string) $cp['public_slug']) : null,
                        ], $this->reviewStatsForUserId((string) $cb));
                    }
                }
            }
        } catch (Exception $e) {
            // Ne pas faire échouer getById si résolution des noms échoue
        }

        $mergedFilter = '';
        try {
            $hasMergedCol = (int) $this->db->query("
                SELECT COUNT(*) FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'appointments'
                  AND COLUMN_NAME = 'merged_into_appointment_id'
            ")->fetchColumn() > 0;
            if ($hasMergedCol) {
                $mergedFilter = ' AND a.merged_into_appointment_id IS NULL';
            }
        } catch (Throwable $e) {
            $mergedFilter = '';
        }

        $appointment['batch_siblings'] = [];
        $batchId = $appointment['creation_batch_id'] ?? null;
        $batchType = $appointment['type'] ?? null;
        // Lots multisoins / multi prises de sang : mêmes règles que la liste (creation_batch_id + patient + type).
        if (
            !empty($batchId)
            && in_array((string) $batchType, ['nursing', 'blood_test'], true)
            && !empty($appointment['patient_id'])
        ) {
            $sql = '
                SELECT a.id, a.status, a.scheduled_at, cc.name AS category_name
                FROM appointments a
                LEFT JOIN care_categories cc ON a.category_id = cc.id
                WHERE a.creation_batch_id = ?
                  AND a.id != ?
                  AND a.patient_id = ?
                  AND a.type = ?
                  ' . $mergedFilter . '
                ORDER BY a.scheduled_at ASC
            ';
            $sibStmt = $this->db->prepare($sql);
            $sibStmt->execute([$batchId, $id, $appointment['patient_id'], $batchType]);
            $sibRows = $sibStmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($sibRows as $sr) {
                $appointment['batch_siblings'][] = [
                    'id' => $sr['id'],
                    'status' => $sr['status'],
                    'scheduled_at' => $sr['scheduled_at'],
                    'category_name' => $sr['category_name'],
                ];
            }
        }
        if (($appointment['type'] ?? '') === 'blood_test') {
            $appointment['blood_test_items'] = $this->resolveBloodTestItemsForAppointment($appointment, null);
            // Libellés prestations pour une seule carte / bloc (lot multi-RDV legacy) : tous les actes du lot.
            $appointment['blood_test_items_display'] = $appointment['blood_test_items'];
            if (!empty($batchId) && !empty($appointment['patient_id'])) {
                $stmtBatchBlood = $this->db->prepare('
                    SELECT a.id
                    FROM appointments a
                    WHERE a.creation_batch_id = ?
                      AND a.patient_id = ?
                      AND a.type = \'blood_test\'
                      ' . $mergedFilter . '
                    ORDER BY a.scheduled_at ASC, a.created_at ASC, a.id ASC
                ');
                $stmtBatchBlood->execute([$batchId, $appointment['patient_id']]);
                $batchBloodIds = array_column($stmtBatchBlood->fetchAll(PDO::FETCH_ASSOC), 'id');
                if (count($batchBloodIds) > 1) {
                    $mergedDisp = $this->mergeBloodTestItemsAcrossBatchAppointmentIds($batchBloodIds);
                    if (!empty($mergedDisp)) {
                        $appointment['blood_test_items_display'] = $mergedDisp;
                    }
                }
            }
        } else {
            $appointment['blood_test_items'] = [];
        }

        if (($appointment['type'] ?? '') === 'nursing') {
            $appointment['nursing_items'] = $this->resolveNursingItemsForAppointment($appointment, null);
            $appointment['nursing_items_display'] = $appointment['nursing_items'];
            if (!empty($batchId) && !empty($appointment['patient_id'])) {
                $stmtBatchNursing = $this->db->prepare('
                    SELECT a.id
                    FROM appointments a
                    WHERE a.creation_batch_id = ?
                      AND a.patient_id = ?
                      AND a.type = \'nursing\'
                      ' . $mergedFilter . '
                    ORDER BY a.scheduled_at ASC, a.created_at ASC, a.id ASC
                ');
                $stmtBatchNursing->execute([$batchId, $appointment['patient_id']]);
                $batchNursingIds = array_column($stmtBatchNursing->fetchAll(PDO::FETCH_ASSOC), 'id');
                if (count($batchNursingIds) > 1) {
                    $mergedN = $this->mergeNursingItemsAcrossBatchAppointmentIds($batchNursingIds);
                    if (!empty($mergedN)) {
                        $appointment['nursing_items_display'] = $mergedN;
                    }
                }
            }
        } else {
            $appointment['nursing_items'] = [];
            $appointment['nursing_items_display'] = [];
        }

        // Libellé e-mail patient + contact principal (titulaire) pour RDV « pour un proche »
        $appointment['patient_email_display'] = null;
        $appointment['booking_contact'] = null;
        if (!empty($appointment['patient_id'])) {
            try {
                require_once __DIR__ . '/User.php';
                $userModelPatient = new User();
                $patProfile = $userModelPatient->getById((string) $appointment['patient_id'], $requesterId, $requesterRole);
                if ($patProfile) {
                    if (!empty($patProfile['email_display'])) {
                        $appointment['patient_email_display'] = $patProfile['email_display'];
                    }
                    if (!empty($appointment['relative_id'])) {
                        $fn = trim((string) ($patProfile['first_name'] ?? ''));
                        $ln = trim((string) ($patProfile['last_name'] ?? ''));
                        $appointment['booking_contact'] = [
                            'first_name' => $fn !== '' ? $fn : null,
                            'last_name' => $ln !== '' ? $ln : null,
                            'phone' => isset($patProfile['phone']) ? trim((string) $patProfile['phone']) : null,
                            'email' => isset($patProfile['email']) ? trim((string) $patProfile['email']) : null,
                            'email_display' => $patProfile['email_display'] ?? null,
                        ];
                    }
                }
            } catch (Throwable $e) {
                // ignore
            }
        }

        // Ne pas exposer les métadonnées d’audit au portail patient (défense en profondeur)
        if ($requesterRole === 'patient') {
            unset($appointment['created_at'], $appointment['updated_at']);
        }

        return $appointment;
    }

    /**
     * Déchiffre une ligne de RDV pour l'affichage en liste (sans getById ni lookups User).
     * Utilisé par l'API liste pour éviter le N+1.
     */
    public function decryptRowForList(array $row, string $requesterId, string $requesterRole): array
    {
        $appointment = $row;
        $this->decryptAppointmentSensitiveFields($appointment, $requesterId, $requesterRole);
        unset($appointment['address_encrypted'], $appointment['address_dek'], $appointment['form_data_encrypted'], $appointment['form_data_dek']);

        if (!empty($appointment['relative_id']) && !empty($appointment['relative_first_name_encrypted'] ?? null)) {
            try {
                $appointment['relative'] = [
                    'id' => $appointment['relative_id'],
                    'first_name' => $this->crypto->decryptField(
                        $appointment['relative_first_name_encrypted'] ?? null,
                        $appointment['relative_first_name_dek'] ?? null
                    ),
                    'last_name' => $this->crypto->decryptField(
                        $appointment['relative_last_name_encrypted'] ?? null,
                        $appointment['relative_last_name_dek'] ?? null
                    ),
                    'email' => null,
                    'phone' => null,
                    'relationship_type' => $appointment['relative_relationship_type'] ?? null,
                    'birth_date' => null,
                    'contact_is_parent' => false,
                ];
                if (!empty($appointment['relative_email_encrypted']) && !empty($appointment['relative_email_dek'])) {
                    $appointment['relative']['email'] = $this->crypto->decryptField(
                        $appointment['relative_email_encrypted'],
                        $appointment['relative_email_dek']
                    );
                }
                if (!empty($appointment['relative_phone_encrypted']) && !empty($appointment['relative_phone_dek'])) {
                    $appointment['relative']['phone'] = $this->crypto->decryptField(
                        $appointment['relative_phone_encrypted'],
                        $appointment['relative_phone_dek']
                    );
                }
            } catch (Exception $e) {
                $appointment['relative'] = ['id' => $appointment['relative_id'], 'first_name' => '', 'last_name' => ''];
            }
            foreach (['relative_first_name_encrypted', 'relative_first_name_dek', 'relative_last_name_encrypted', 'relative_last_name_dek',
                'relative_email_encrypted', 'relative_email_dek', 'relative_phone_encrypted', 'relative_phone_dek',
                'relative_relationship_type', 'relative_birth_date_encrypted', 'relative_birth_date_dek'] as $k) {
                unset($appointment[$k]);
            }
        }

        $appointment['assigned_lab_display_name'] = null;
        $appointment['assigned_nurse_display_name'] = null;
        $appointment['assigned_to_display_name'] = null;
        if ($requesterRole === 'patient') {
            unset($appointment['created_at'], $appointment['updated_at']);
        }
        return $appointment;
    }

    /**
     * Déchiffre address + form_data sans les lier dans un seul try (évite adresse vide alors que form_data contient l'adresse).
     */
    private function decryptAppointmentSensitiveFields(
        array &$appointment,
        string $requesterId,
        string $requesterRole
    ): void {
        $appointment['address'] = null;
        if (!is_array($appointment['form_data'] ?? null)) {
            $appointment['form_data'] = [];
        }

        $decryptedFields = [];

        if (!empty($appointment['address_encrypted']) && !empty($appointment['address_dek'])) {
            try {
                $appointment['address'] = $this->crypto->decryptField(
                    (string) $appointment['address_encrypted'],
                    (string) $appointment['address_dek']
                );
                $decryptedFields[] = 'address';
            } catch (Exception $e) {
                error_log('Appointment address decrypt ' . ($appointment['id'] ?? '') . ': ' . $e->getMessage());
                $appointment['address'] = null;
            }
        }

        if (!empty($appointment['form_data_encrypted']) && !empty($appointment['form_data_dek'])) {
            try {
                $formDataJson = $this->crypto->decryptField(
                    (string) $appointment['form_data_encrypted'],
                    (string) $appointment['form_data_dek']
                );
                $decoded = json_decode($formDataJson, true);
                $appointment['form_data'] = is_array($decoded) ? $decoded : [];
                $decryptedFields[] = 'form_data';
            } catch (Exception $e) {
                error_log('Appointment form_data decrypt ' . ($appointment['id'] ?? '') . ': ' . $e->getMessage());
                $appointment['form_data'] = [];
            }
        }

        $this->hydrateAppointmentAddressFields($appointment);

        if ($decryptedFields !== []) {
            $this->logger->logDecrypt(
                $requesterId,
                $requesterRole,
                'appointment',
                (string) ($appointment['id'] ?? ''),
                array_fill_keys($decryptedFields, true)
            );
        }
    }

    /**
     * Expose toujours un libellé d'adresse (address + form_data.address + address_label).
     */
    private function hydrateAppointmentAddressFields(array &$appointment): void
    {
        if (!is_array($appointment['form_data'] ?? null)) {
            $appointment['form_data'] = [];
        }

        $topLabel = $this->extractAddressLabelFromDecrypted($appointment['address'] ?? null);
        $formLabel = $this->extractAddressLabelFromDecrypted($appointment['form_data']['address'] ?? null);
        $legacyLabel = trim((string) ($appointment['form_data']['address_label'] ?? ''));

        $label = $topLabel !== '' ? $topLabel : ($formLabel !== '' ? $formLabel : $legacyLabel);
        if ($label === '') {
            return;
        }

        $appointment['address'] = $label;

        if ($legacyLabel === '') {
            $appointment['form_data']['address_label'] = $label;
        }

        $fdAddr = $appointment['form_data']['address'] ?? null;
        if ($fdAddr === null || $fdAddr === '' || (is_string($fdAddr) && trim($fdAddr) === '')) {
            $lat = isset($appointment['location_lat']) ? (float) $appointment['location_lat'] : null;
            $lng = isset($appointment['location_lng']) ? (float) $appointment['location_lng'] : null;
            $payload = ['label' => $label];
            if ($lat !== null && $lng !== null && ($lat !== 0.0 || $lng !== 0.0)) {
                $payload['lat'] = $lat;
                $payload['lng'] = $lng;
            }
            $appointment['form_data']['address'] = $payload;
            return;
        }

        if (is_string($fdAddr)) {
            $parsedLabel = $this->extractAddressLabelFromDecrypted($fdAddr);
            if ($parsedLabel !== '') {
                $decoded = json_decode(trim($fdAddr), true);
                $appointment['form_data']['address'] = is_array($decoded) && !empty($decoded['label'])
                    ? $decoded
                    : ['label' => $parsedLabel];
            }
            return;
        }

        if (is_array($fdAddr) && empty($fdAddr['label'])) {
            $appointment['form_data']['address']['label'] = $label;
        }
    }

    private function extractAddressLabelFromDecrypted(mixed $raw): string
    {
        if ($raw === null) {
            return '';
        }
        if (is_string($raw)) {
            $t = trim($raw);
            if ($t === '') {
                return '';
            }
            if ($t[0] === '{' || $t[0] === '[') {
                $j = json_decode($t, true);
                if (is_array($j) && !empty($j['label']) && is_string($j['label'])) {
                    return trim($j['label']);
                }
            }
            return $t;
        }
        if (is_array($raw) && !empty($raw['label']) && is_string($raw['label'])) {
            return trim($raw['label']);
        }
        return '';
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
                return 'declined_offer';
            }
        }
        
        // Préparer la requête de mise à jour
        $updateFields = ['status = ?', 'updated_at = NOW()'];
        $params = [$newStatus];
        
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
        if ($redispatch && $newStatus === 'pending') {
            if (!in_array($oldStatus, ['confirmed', 'planned', 'inProgress'], true)) {
                throw new Exception('Seuls les rendez-vous confirmés, planifiés ou en cours peuvent être redispatchés.');
            }
            // Vérifier que l'infirmier/labo est bien celui assigné
            if ($appointment['type'] === 'nursing') {
                if ((string) $appointment['assigned_nurse_id'] !== (string) $actorId) {
                    throw new Exception('Vous ne pouvez redispatcher que les rendez-vous qui vous sont assignés');
                }
                $updateFields[] = 'assigned_nurse_id = NULL';
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
        $noteToSave = $redispatch ? 'Rendez-vous redispatché par le professionnel' : $note;
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
        
        // Si redispatch, relancer le dispatch géographique (exclure l'acteur des offres et notifications)
        if ($redispatch && $newStatus === 'pending') {
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
            $this->dispatchGeographic(
                $id,
                $appointment['type'],
                (float) $appointment['location_lat'],
                (float) $appointment['location_lng'],
                $appointment['scheduled_at'] ?? null,
                $formDataForDispatch,
                $actorId
            );
            $this->notifyActorAppointmentRedispatched($id, $appointment, $actorId, $actorRole);

            if (!empty($appointment['patient_id']) && in_array($actorRole, ['nurse', 'lab', 'subaccount'], true)) {
                require_once __DIR__ . '/User.php';
                try {
                    $userModel = new User();
                    $userModel->revokePatientProfessionalAccessAfterRedispatch(
                        (string) $appointment['patient_id'],
                        $actorId,
                        $actorRole
                    );
                } catch (Throwable $e) {
                    error_log('PatientProfessionalAccess (redispatch revoke): ' . $e->getMessage());
                }
            }

            // Lot multisoins : même redispatch pour les autres RDV nursing assignés au même infirmier
            if ($appointment['type'] === 'nursing' && $actorRole === 'nurse') {
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
                    $sibRd->execute([$batchIdRd, $patientIdRd, 'nursing', $id, $actorId]);
                    while ($sibRow = $sibRd->fetch(PDO::FETCH_ASSOC)) {
                        $sibId = (string) $sibRow['id'];
                        $updSib = $this->db->prepare(
                            'UPDATE appointments SET status = ?, assigned_nurse_id = NULL, updated_at = NOW()
                             WHERE id = ? AND assigned_nurse_id = ? AND status IN (\'confirmed\', \'planned\', \'inProgress\')'
                        );
                        $updSib->execute(['pending', $sibId, $actorId]);
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
                        $this->dispatchGeographic(
                            $sibId,
                            'nursing',
                            (float) $sibRow['location_lat'],
                            (float) $sibRow['location_lng'],
                            $sibRow['scheduled_at'] ?? null,
                            $formSib,
                            $actorId
                        );
                        $this->notifyActorAppointmentRedispatched($sibId, array_merge($appointment, [
                            'id' => $sibId,
                            'scheduled_at' => $sibRow['scheduled_at'],
                            'form_data_encrypted' => $sibRow['form_data_encrypted'] ?? null,
                            'form_data_dek' => $sibRow['form_data_dek'] ?? null,
                        ]), $actorId, $actorRole);
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
            $this->sendStatusNotifications($id, $newStatus, $actorId, $actorRole);
        }

        // Partage lien confrère : l’infirmier ayant repassé le RDV en attente est informé de l’acceptation + prénom/nom du confrère (cloche non liée au détail)
        if (
            !$redispatch
            && $newStatus === 'confirmed'
            && $actorRole === 'nurse'
            && ($appointment['type'] ?? '') === 'nursing'
        ) {
            $this->notifyShareLinkSharerNurseIfNeeded($id, $actorId);
        }

        // Lien patient ↔ professionnel lors de l’acceptation (RDV confirmé avec patient)
        if ($newStatus === 'confirmed' && !empty($appointment['patient_id']) && in_array($actorRole, ['nurse', 'lab', 'subaccount', 'pro'], true)) {
            require_once __DIR__ . '/User.php';
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

    /**
     * Met à jour un rendez-vous (form_data, scheduled_at, address, status) - admin / super_admin
     */
    public function update(string $id, array $data, string $actorId, string $actorRole): void
    {
        $stmt = $this->db->prepare('SELECT id, type FROM appointments WHERE id = ?');
        $stmt->execute([$id]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$existing) {
            throw new Exception('Rendez-vous introuvable');
        }

        $updateFields = ['updated_at = NOW()'];
        $params = [];

        if (isset($data['status'])) {
            $updateFields[] = 'status = ?';
            $params[] = $data['status'];
        }

        if (!empty($data['scheduled_at'])) {
            $scheduledAt = $data['scheduled_at'];
            if (is_string($scheduledAt) && preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/', $scheduledAt)) {
                $dt = new \DateTime($scheduledAt);
                $scheduledAt = $dt->format('Y-m-d H:i:s');
            }
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
            return;
        }

        $params[] = $id;
        $sql = 'UPDATE appointments SET ' . implode(', ', $updateFields) . ' WHERE id = ?';
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        $this->logger->log($actorId, $actorRole, 'update', 'appointment', $id, [
            'fields' => array_keys($data),
        ]);
    }

    /**
     * Après acceptation par un confrère : notifier l’infirmier qui avait partagé le lien (repassage en attente).
     */
    private function notifyShareLinkSharerNurseIfNeeded(string $appointmentId, string $acceptingNurseId): void
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
    private function sendStatusNotifications(string $appointmentId, string $status, ?string $actorId = null, ?string $actorRole = null): void
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
                require_once __DIR__ . '/User.php';
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

    /**
     * Vérifie si un point est dans un polygone (algorithme ray casting)
     */
    private function pointInPolygon(float $lat, float $lng, array $polygon): bool
    {
        if (count($polygon) < 3) {
            return false;
        }

        $inside = false;
        $j = count($polygon) - 1;

        for ($i = 0; $i < count($polygon); $i++) {
            $xi = $polygon[$i][0];
            $yi = $polygon[$i][1];
            $xj = $polygon[$j][0];
            $yj = $polygon[$j][1];

            $intersect = (($yi > $lat) !== ($yj > $lat)) &&
                         ($lng < ($xj - $xi) * ($lat - $yi) / ($yj - $yi) + $xi);

            if ($intersect) {
                $inside = !$inside;
            }

            $j = $i;
        }

        return $inside;
    }

    /**
     * Préférence patient pour le genre de l'infirmier (form_data.public).
     * Si female/male : seuls les infirmiers avec genre déchiffré correspondant sont proposés ; genre inconnu = exclus.
     */
    private function extractPreferredNurseGender(?array $formData): string
    {
        if ($formData === null || $formData === []) {
            return 'any';
        }
        $raw = $formData['preferred_nurse_gender'] ?? 'any';
        if (!is_string($raw)) {
            return 'any';
        }
        $v = strtolower(trim($raw));
        if (in_array($v, ['female', 'male', 'any'], true)) {
            return $v;
        }
        return 'any';
    }

    /**
     * Notification web pour l’acteur qui vient de redispatcher (confirmation sans renvoyer la popup « accepter »).
     */
    private function notifyActorAppointmentRedispatched(
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
                require_once __DIR__ . '/User.php';
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

    /**
     * Relance dispatchGeographic pour un RDV nursing (coordonnées et form_data en base).
     * @param string|null $creationBatchId Passer null pour utiliser creation_batch_id du RDV.
     */
    public function dispatchGeographicForNursingFromStoredLocation(
        string $appointmentId,
        ?string $excludeProfileId = null,
        ?string $creationBatchId = null
    ): void {
        $stmt = $this->db->prepare(
            'SELECT type, location_lat, location_lng, scheduled_at, form_data_encrypted, form_data_dek, creation_batch_id
             FROM appointments WHERE id = ?'
        );
        $stmt->execute([$appointmentId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row || ($row['type'] ?? '') !== 'nursing') {
            throw new Exception('Rendez-vous soins introuvable ou type invalide');
        }
        $lat = $row['location_lat'] ?? null;
        $lng = $row['location_lng'] ?? null;
        if ($lat === null || $lng === null || $lat === '' || $lng === '') {
            throw new Exception('Coordonnées du rendez-vous manquantes pour le dispatch');
        }
        $formDataForDispatch = [];
        if (!empty($row['form_data_encrypted']) && !empty($row['form_data_dek'])) {
            try {
                $formDataJson = $this->crypto->decryptField(
                    $row['form_data_encrypted'],
                    $row['form_data_dek']
                );
                $formDataForDispatch = json_decode($formDataJson, true) ?? [];
            } catch (Throwable $e) {
                $formDataForDispatch = [];
            }
        }
        $batchId = $creationBatchId ?? ($row['creation_batch_id'] ?? null);
        $this->dispatchGeographic(
            $appointmentId,
            'nursing',
            (float) $lat,
            (float) $lng,
            $row['scheduled_at'] ?? null,
            $formDataForDispatch,
            $excludeProfileId,
            is_string($batchId) && $batchId !== '' ? $batchId : null
        );
    }

    /**
     * Après délai partage lien : notifie la zone comme à la création, puis retire le marqueur nurse_share_released_at.
     */
    public function redispatchNursingShareReleasedToZone(string $appointmentId, string $historyActorId): void
    {
        $this->dispatchGeographicForNursingFromStoredLocation($appointmentId, null, null);
        $upd = $this->db->prepare(
            "UPDATE appointments SET nurse_share_released_at = NULL, updated_at = NOW()
             WHERE id = ? AND type = 'nursing' AND status = 'pending'
             AND (assigned_nurse_id IS NULL OR assigned_nurse_id = '' OR TRIM(assigned_nurse_id) = '')
             AND nurse_share_released_at IS NOT NULL"
        );
        $upd->execute([$appointmentId]);
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
    }

    /**
     * Dispatch géographique : trouve les professionnels disponibles.
     * Pour blood_test : ne notifie que les labs qui acceptent les RDV et dont le délai min (min_booking_lead_time_hours) est respecté.
     * @param string|null $scheduledAt Date/heure du RDV (Y-m-d H:i:s) pour filtrer les labs par délai min
     * @param string|null $excludeProfileId En redispatch : exclure ce professionnel des offres et notifications
     */
    private function dispatchGeographic(string $appointmentId, string $type, float $lat, float $lng, ?string $scheduledAt = null, ?array $formData = null, ?string $excludeProfileId = null, ?string $creationBatchId = null): void
    {
        if ($excludeProfileId !== null) {
            $delStmt = $this->db->prepare('DELETE FROM appointment_offers WHERE appointment_id = ?');
            $delStmt->execute([$appointmentId]);
        }

        $appointmentCategoryId = null;
        $catStmt = $this->db->prepare('SELECT category_id FROM appointments WHERE id = ?');
        $catStmt->execute([$appointmentId]);
        $catRow = $catStmt->fetch(PDO::FETCH_ASSOC);
        if ($catRow && isset($catRow['category_id']) && $catRow['category_id'] !== null && $catRow['category_id'] !== '') {
            $appointmentCategoryId = (string) $catRow['category_id'];
        }

        if ($type === 'nursing') {
            $roleFilter = 'nurse';
        } else {
            $roleFilter = "('lab', 'subaccount')";
        }
        
        // Récupérer toutes les zones de couverture actives avec l'adresse de l'infirmier
        if ($type === 'nursing') {
            $sql = "
                SELECT cz.*, p.id as profile_id, p.role,
                       p.address_encrypted, p.address_dek,
                       p.gender_encrypted, p.gender_dek
                FROM coverage_zones cz
                INNER JOIN profiles p ON cz.owner_id = p.id
                WHERE cz.role = ?
                AND cz.is_active = TRUE
                AND cz.radius_km IS NOT NULL
                AND p.address_encrypted IS NOT NULL
                AND p.address_dek IS NOT NULL
            ";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$roleFilter]);
        } else {
            // Labs/subaccounts : inclure toute zone active (centre ou adresse profil pour la distance)
            // p.lab_id : pour que le lab parent reçoive toujours les RDV des sous-comptes
            $sql = "
                SELECT cz.*, p.id as profile_id, p.role,
                       p.address_encrypted, p.address_dek,
                       p.is_accepting_appointments,
                       COALESCE(p.min_booking_lead_time_hours, 48) as min_booking_lead_time_hours,
                       COALESCE(p.accept_rdv_saturday, 1) as accept_rdv_saturday,
                       COALESCE(p.accept_rdv_sunday, 1) as accept_rdv_sunday,
                       p.lab_id
                FROM coverage_zones cz
                INNER JOIN profiles p ON cz.owner_id = p.id
                WHERE cz.role IN ('lab', 'subaccount')
                AND cz.is_active = TRUE
                AND cz.radius_km IS NOT NULL
                AND (cz.center_lat IS NOT NULL AND cz.center_lng IS NOT NULL
                     OR (p.address_encrypted IS NOT NULL AND p.address_dek IS NOT NULL))
            ";
            $stmt = $this->db->prepare($sql);
            $stmt->execute();
        }
        
        $zones = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $professionals = [];
        
        foreach ($zones as $zone) {
            $isInZone = false;
            
            // Utiliser l'adresse depuis profiles pour tous les professionnels (nurse, lab, subaccount)
            if ($zone['address_encrypted'] && $zone['address_dek']) {
                try {
                    $addressJson = $this->crypto->decryptField($zone['address_encrypted'], $zone['address_dek']);
                    $address = json_decode($addressJson, true);
                    
                    if ($address && isset($address['lat'], $address['lng'], $zone['radius_km'])) {
                        // Calculer la distance avec la formule Haversine
                        $profLat = floatval($address['lat']);
                        $profLng = floatval($address['lng']);
                        $radiusKm = floatval($zone['radius_km']);
                        
                        $distance = 6371 * acos(
                            cos(deg2rad($lat)) * cos(deg2rad($profLat)) *
                            cos(deg2rad($profLng) - deg2rad($lng)) +
                            sin(deg2rad($lat)) * sin(deg2rad($profLat))
                        );
                        
                        $isInZone = $distance <= $radiusKm;
                    }
                } catch (Exception $e) {
                    // Continuer avec le prochain professionnel si erreur de déchiffrement
                    continue;
                }
            } else {
                // Fallback : utiliser center_lat/lng si l'adresse n'est pas disponible
                if (isset($zone['center_lat'], $zone['center_lng'], $zone['radius_km'])) {
                    $distance = 6371 * acos(
                        cos(deg2rad($lat)) * cos(deg2rad($zone['center_lat'])) *
                        cos(deg2rad($zone['center_lng']) - deg2rad($lng)) +
                        sin(deg2rad($lat)) * sin(deg2rad($zone['center_lat']))
                    );
                    
                    $isInZone = $distance <= floatval($zone['radius_km']);
                }
            }
            
            if ($isInZone) {
                $entry = [
                    'id' => $zone['profile_id'],
                    'role' => $zone['role'],
                ];
                if ($type === 'nursing') {
                    $entry['gender'] = null;
                    if (!empty($zone['gender_encrypted']) && !empty($zone['gender_dek'])) {
                        try {
                            $g = strtolower(trim((string) $this->crypto->decryptField($zone['gender_encrypted'], $zone['gender_dek'])));
                            if (in_array($g, ['male', 'female', 'other'], true)) {
                                $entry['gender'] = $g;
                            }
                        } catch (Throwable $e) {
                            // ignore
                        }
                    }
                }
                if ($type === 'blood_test' && isset($zone['is_accepting_appointments'], $zone['min_booking_lead_time_hours'])) {
                    $entry['is_accepting_appointments'] = (bool) $zone['is_accepting_appointments'];
                    $entry['min_booking_lead_time_hours'] = (int) $zone['min_booking_lead_time_hours'];
                    $entry['accept_rdv_saturday'] = (bool) ($zone['accept_rdv_saturday'] ?? true);
                    $entry['accept_rdv_sunday'] = (bool) ($zone['accept_rdv_sunday'] ?? true);
                    $entry['lab_id'] = !empty($zone['lab_id']) ? $zone['lab_id'] : null;
                }
                $professionals[] = $entry;
            }
        }

        if ($type === 'nursing') {
            $pref = $this->extractPreferredNurseGender($formData);
            if ($pref === 'female' || $pref === 'male') {
                $professionals = array_values(array_filter($professionals, function ($p) use ($pref) {
                    $g = $p['gender'] ?? null;
                    if ($g === null || $g === '') {
                        return false;
                    }
                    return $pref === 'female' ? $g === 'female' : $g === 'male';
                }));
            }
        }

        if ($type === 'nursing') {
            $professionals = array_values(array_filter($professionals, function ($p) use ($appointmentCategoryId) {
                return $this->nurseAcceptsCategoryForDispatch((string) $p['id'], $appointmentCategoryId);
            }));
        }
        
        // Pour blood_test sans lab assigné : exclure les labs qui n'acceptent pas les RDV, dont le délai min n'est pas respecté, ou qui n'acceptent pas samedi/dimanche
        if ($type === 'blood_test' && $scheduledAt !== null && $scheduledAt !== '') {
            $scheduledTs = strtotime($scheduledAt);
            $dayOfWeek = (int) date('w', $scheduledTs); // 0 = dimanche, 6 = samedi
            $now = time();
            $professionals = array_filter($professionals, function ($p) use ($scheduledTs, $now, $dayOfWeek) {
                if (empty($p['is_accepting_appointments'])) {
                    return false;
                }
                if ($dayOfWeek === 0 && empty($p['accept_rdv_sunday'])) {
                    return false;
                }
                if ($dayOfWeek === 6 && empty($p['accept_rdv_saturday'])) {
                    return false;
                }
                $minHours = (int) ($p['min_booking_lead_time_hours'] ?? 48);
                if ($minHours <= 0) {
                    return true;
                }
                $minAllowedTs = $now + ($minHours * 3600);
                return $scheduledTs >= $minAllowedTs;
            });
        }
        
        // Pour blood_test : ajouter le lab parent pour chaque sous-compte restant, afin qu'il reçoive toujours les RDV et puisse accepter pour eux
        if ($type === 'blood_test') {
            $labIdsToNotify = [];
            foreach ($professionals as $p) {
                if (($p['role'] ?? '') === 'subaccount' && !empty($p['lab_id'])) {
                    $labIdsToNotify[$p['lab_id']] = true;
                }
            }
            foreach (array_keys($labIdsToNotify) as $labId) {
                $professionals[] = ['id' => $labId, 'role' => 'lab'];
            }
            // Dédupliquer par id (un lab peut être déjà dans la liste via sa propre zone)
            $seen = [];
            $professionals = array_values(array_filter($professionals, function ($p) use (&$seen) {
                $id = $p['id'];
                if (in_array($id, $seen, true)) {
                    return false;
                }
                $seen[] = $id;
                return true;
            }));
        }

        if ($type === 'blood_test') {
            $professionals = array_values(array_filter($professionals, function ($p) use ($appointmentCategoryId) {
                return $this->labAcceptsCategoryForDispatch((string) $p['id'], $appointmentCategoryId);
            }));
        }
        
        if ($excludeProfileId !== null) {
            $professionals = array_values(array_filter($professionals, function ($p) use ($excludeProfileId) {
                return ($p['id'] ?? '') !== $excludeProfileId;
            }));
        }
        
        // Limiter le nombre de professionnels notifiés pour éviter surcharge/timeout (100 max)
        $professionals = array_slice($professionals, 0, 100);
        
        // Enregistrer les offres (labs + infirmiers) pour afficher les RDV dans les listes et permettre la popup accepter/refuser
        $this->insertAppointmentOffers($appointmentId, $professionals);
        
        // Pour un lot multi-soins : identifier les professionnels déjà notifiés pour ce lot (1 notif/lot/pro)
        $alreadyNotifiedForBatch = [];
        if ($creationBatchId !== null) {
            try {
                $batchNotifStmt = $this->db->prepare(
                    "SELECT DISTINCT user_id FROM notifications WHERE type = 'new_appointment_available' AND data LIKE ?"
                );
                $batchNotifStmt->execute(['%"creation_batch_id":"' . $creationBatchId . '"%']);
                $alreadyNotifiedForBatch = array_column($batchNotifStmt->fetchAll(PDO::FETCH_ASSOC), 'user_id');
            } catch (Exception $e) {
                // Ne pas bloquer le dispatch si la vérification échoue
            }
        }

        // Créer une notification web pour chaque professionnel trouvé
        foreach ($professionals as $professional) {
            // Lot multi-soins : ne pas créer de doublon (1 notification par lot par professionnel)
            if ($creationBatchId !== null && in_array($professional['id'], $alreadyNotifiedForBatch, true)) {
                continue;
            }
            try {
                $typeLabel = NotificationMessageFormatter::appointmentTypeLabel($type);
                $when = NotificationMessageFormatter::whenShort($formData, $scheduledAt);
                $notifData = ['appointment_id' => $appointmentId];
                if ($creationBatchId !== null) {
                    $notifData['creation_batch_id'] = $creationBatchId;
                }
                $this->notificationService->createNotification(
                    $professional['id'],
                    'new_appointment_available',
                    'Nouveau RDV',
                    NotificationMessageFormatter::joinParts([
                        'Dans votre zone',
                        $typeLabel,
                        $when ?: null,
                    ]),
                    $notifData
                );
                // Email async (envoyé après la réponse HTTP)
                EmailQueue::add('new_appointment_pro', null, [
                    'appointment_id' => $appointmentId,
                    'scheduled_at' => $scheduledAt ?? date('Y-m-d H:i:s'),
                    'role' => $type === 'nursing' ? 'nurse' : 'lab',
                    'form_data' => $formData,
                ], $professional['id']);
            } catch (Exception $e) {
                // Continuer même si une notification échoue
            }
        }
        
        // SMS en file (shutdown) pour ne pas bloquer la réponse
        $scheduledAtStr = $scheduledAt ?? date('Y-m-d H:i:s');
        foreach ($professionals as $professional) {
            SmsQueue::addNewAppointment(
                $professional['id'],
                $appointmentId,
                $scheduledAtStr,
                (string) ($professional['role'] ?? 'nurse'),
                $type
            );
        }
    }

    /**
     * Retourne le libellé d'affichage de l'acteur (laboratoire, sous-compte, préleveur, infirmier) pour les notifications
     */
    private function getActorDisplayLabel(string $actorId, string $actorRole): string
    {
        try {
            require_once __DIR__ . '/User.php';
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
            
            // Créer une notification pour chaque admin
            foreach ($admins as $admin) {
                try {
                    $this->notificationService->createNotification(
                        $admin['id'],
                        'new_appointment_created',
                        'Nouveau RDV',
                        NotificationMessageFormatter::joinParts(['À traiter', $typeLabel]),
                        [
                            'appointment_id' => $appointmentId,
                            'type' => $appointmentType,
                            'scheduled_at' => $scheduledAt,
                        ]
                    );
                } catch (Exception $e) {
                    // Logger l'erreur mais continuer avec les autres admins
                    error_log("Erreur lors de la notification admin {$admin['id']}: " . $e->getMessage());
                }
            }

            try {
                require_once __DIR__ . '/../lib/AdminEmailNotifier.php';
                AdminEmailNotifier::newAppointment($appointmentId, $appointmentType, $scheduledAt, $formData);
            } catch (Throwable $e) {
                error_log('notifyAllAdmins admin email: ' . $e->getMessage());
            }
        } catch (Exception $e) {
            // Logger l'erreur mais ne pas bloquer la création du rendez-vous
            error_log("Erreur lors de la récupération des admins: " . $e->getMessage());
        }
    }

    /**
     * Aligné sur GET /appointments : si l’infirmier a au moins une préf activée, seules les catégories cochées
     * (ou sans catégorie) reçoivent offre + notif. Aucune ligne en base = pas de filtre (comportement historique).
     */
    private function nurseAcceptsCategoryForDispatch(string $nurseId, ?string $categoryId): bool
    {
        try {
            $stmt = $this->db->prepare('SELECT COUNT(*) FROM nurse_category_preferences WHERE nurse_id = ? AND is_enabled = TRUE');
            $stmt->execute([$nurseId]);
            if ((int) $stmt->fetchColumn() === 0) {
                return true;
            }
            if ($categoryId === null || $categoryId === '') {
                return true;
            }
            $stmt = $this->db->prepare('SELECT 1 FROM nurse_category_preferences WHERE nurse_id = ? AND category_id = ? AND is_enabled = TRUE LIMIT 1');
            $stmt->execute([$nurseId, $categoryId]);
            return (bool) $stmt->fetchColumn();
        } catch (Throwable $e) {
            error_log('nurseAcceptsCategoryForDispatch: ' . $e->getMessage());
            return true;
        }
    }

    /**
     * Même logique pour les labs (lab_category_preferences.lab_id = profil lab ou sous-compte selon l’UI).
     */
    private function labAcceptsCategoryForDispatch(string $labPrefsProfileId, ?string $categoryId): bool
    {
        try {
            $chk = $this->db->query("SHOW TABLES LIKE 'lab_category_preferences'");
            if (!$chk || $chk->rowCount() === 0) {
                return true;
            }
            $stmt = $this->db->prepare('SELECT COUNT(*) FROM lab_category_preferences WHERE lab_id = ? AND is_enabled = TRUE');
            $stmt->execute([$labPrefsProfileId]);
            if ((int) $stmt->fetchColumn() === 0) {
                return true;
            }
            if ($categoryId === null || $categoryId === '') {
                return true;
            }
            $stmt = $this->db->prepare('SELECT 1 FROM lab_category_preferences WHERE lab_id = ? AND category_id = ? AND is_enabled = TRUE LIMIT 1');
            $stmt->execute([$labPrefsProfileId, $categoryId]);
            return (bool) $stmt->fetchColumn();
        } catch (Throwable $e) {
            error_log('labAcceptsCategoryForDispatch: ' . $e->getMessage());
            return true;
        }
    }

    /**
     * Une seule offre + notifications (cloche, e-mail, SMS) pour un RDV soins réservé depuis le profil d'un infirmier.
     * Évite le dispatch géographique (tous les infirmiers de la zone).
     */
    private function dispatchDirectedNurseOnly(
        string $appointmentId,
        string $nurseId,
        ?string $scheduledAt,
        ?array $formData
    ): void {
        try {
            $stmt = $this->db->prepare('SELECT id FROM profiles WHERE id = ? AND role = ? LIMIT 1');
            $stmt->execute([$nurseId, 'nurse']);
            if (!$stmt->fetchColumn()) {
                error_log('dispatchDirectedNurseOnly: profil infirmier invalide ou absent — id=' . $nurseId);

                return;
            }
        } catch (Throwable $e) {
            error_log('dispatchDirectedNurseOnly: ' . $e->getMessage());

            return;
        }

        $professionals = [['id' => $nurseId, 'role' => 'nurse']];
        $this->insertAppointmentOffers($appointmentId, $professionals);

        foreach ($professionals as $professional) {
            try {
                $this->notificationService->createNotification(
                    $professional['id'],
                    'new_appointment_available',
                    'Demande de rendez-vous',
                    'Un patient a demandé un rendez-vous pour des soins infirmiers depuis votre profil. Ouvrez la notification pour répondre.',
                    ['appointment_id' => $appointmentId]
                );
                EmailQueue::add('new_appointment_pro', null, [
                    'appointment_id' => $appointmentId,
                    'scheduled_at' => $scheduledAt ?? date('Y-m-d H:i:s'),
                    'role' => 'nurse',
                    'form_data' => $formData,
                ], $professional['id']);
            } catch (Exception $e) {
                // Continuer même si une notification échoue
            }
        }

        $scheduledAtStr = $scheduledAt ?? date('Y-m-d H:i:s');
        foreach ($professionals as $professional) {
            SmsQueue::addNewAppointment(
                $professional['id'],
                $appointmentId,
                $scheduledAtStr,
                (string) ($professional['role'] ?? 'nurse'),
                'nursing'
            );
        }
    }

    /**
     * Notification ciblée pour un RDV réservé via QR code d'un professionnel de santé (rôle pro).
     */
    private function dispatchDirectedProOnly(
        string $appointmentId,
        string $proId,
        ?string $scheduledAt,
        ?array $formData,
        string $appointmentType
    ): void {
        try {
            $stmt = $this->db->prepare('SELECT id FROM profiles WHERE id = ? AND role = ? LIMIT 1');
            $stmt->execute([$proId, 'pro']);
            if (!$stmt->fetchColumn()) {
                error_log('dispatchDirectedProOnly: profil pro invalide — id=' . $proId);

                return;
            }
        } catch (Throwable $e) {
            error_log('dispatchDirectedProOnly: ' . $e->getMessage());

            return;
        }

        $typeLabel = $appointmentType === 'blood_test' ? 'prélèvement' : 'rendez-vous';
        try {
            $this->notificationService->createNotification(
                $proId,
                'new_appointment_available',
                'Demande de rendez-vous',
                "Un patient a pris un {$typeLabel} via votre QR code Cary.",
                ['appointment_id' => $appointmentId]
            );
            EmailQueue::add('new_appointment_pro', null, [
                'appointment_id' => $appointmentId,
                'scheduled_at' => $scheduledAt ?? date('Y-m-d H:i:s'),
                'role' => 'pro',
                'form_data' => $formData,
            ], $proId);
        } catch (Exception $e) {
            error_log('dispatchDirectedProOnly notify: ' . $e->getMessage());
        }
    }

    /**
     * Enregistre les offres (appointment_offers) pour que les labs/infirmiers voient le RDV dans leur liste.
     */
    private function insertAppointmentOffers(string $appointmentId, array $professionals): void
    {
        try {
            $stmt = $this->db->prepare('INSERT IGNORE INTO appointment_offers (appointment_id, profile_id) VALUES (?, ?)');
            foreach ($professionals as $p) {
                $profileId = $p['id'] ?? null;
                if ($profileId) {
                    $stmt->execute([$appointmentId, $profileId]);
                }
            }
        } catch (Throwable $e) {
            // Table peut ne pas exister si migration 040 non exécutée
            error_log('insertAppointmentOffers: ' . $e->getMessage());
        }
    }

    /**
     * Métadonnées des options de soin (libellés + map valeur→libellé) pour emails, etc.
     *
     * @return array<string, array{label: string, valueLabels: array<string,string>}>
     */
    public function fetchCareCategoryOptionMeta(?string $categoryId): array
    {
        if ($categoryId === null || $categoryId === '' || !Validation::uuid($categoryId)) {
            return [];
        }
        try {
            $stmt = $this->db->prepare(
                'SELECT option_key, label, options FROM care_category_options WHERE care_category_id = ? ORDER BY sort_order ASC'
            );
            $stmt->execute([$categoryId]);
            $out = [];
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $valueLabels = [];
                if (!empty($row['options'])) {
                    $decoded = json_decode((string) $row['options'], true);
                    if (is_array($decoded)) {
                        foreach ($decoded as $o) {
                            if (is_array($o) && isset($o['value'], $o['label'])) {
                                $valueLabels[(string) $o['value']] = (string) $o['label'];
                            }
                        }
                    }
                }
                $out[(string) $row['option_key']] = [
                    'label' => (string) $row['label'],
                    'valueLabels' => $valueLabels,
                ];
            }
            return $out;
        } catch (Throwable $e) {
            return [];
        }
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


<?php

declare(strict_types=1);

require_once __DIR__ . '/../Validation.php';

/**
 * Résolution et persistance des actes prise de sang / nursing (table + form_data).
 */
final class AppointmentItemsResolver
{
    public function __construct(
        private PDO $db,
        private Crypto $crypto,
    ) {
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

    /**
     * @return list<array{category_id: ?string, label: ?string, care_options: array, sort_order: int}>
     */
    public function parseBloodTestItemsInputArray(?array $rawItems): array
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

    public function normalizeBloodTestItems(array $data): array
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

    public function insertBloodTestItems(string $appointmentId, array $items): void
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
                $this->generateUuid(),
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
     * @param array<string,mixed> $appointment
     * @param list<array<string,mixed>>|null $preloadedTableRows
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
     * @param list<string> $appointmentIdsOrdered
     * @return array<string, array<string,mixed>>
     */
    public function loadBloodTestResolveSlicesById(array $appointmentIdsOrdered): array
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

    /**
     * @param list<string> $appointmentIds
     * @return array<string, list<array<string,mixed>>>
     */
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
     * @param list<string> $appointmentIdsOrdered
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

    public function normalizeNursingItems(array $data): array
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

    public function insertNursingItems(string $appointmentId, array $items): void
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
                $this->generateUuid(),
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
     * @return list<array<string,mixed>>
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
    public function loadNursingResolveSlicesById(array $appointmentIdsOrdered): array
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

    /**
     * @param list<string> $appointmentIds
     * @return array<string, list<array<string,mixed>>>
     */
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

    private function generateUuid(): string
    {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}

<?php

declare(strict_types=1);

require_once __DIR__ . '/../PatientDossierAccess.php';
require_once __DIR__ . '/../LabResultsListing.php';
require_once __DIR__ . '/../PatientDossierDocuments.php';
require_once __DIR__ . '/../../models/User.php';
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/../health/HealthService.php';

final class ContextComposer
{
    private PDO $db;
    private User $userModel;

    public function __construct(?PDO $db = null, ?User $userModel = null)
    {
        $this->db = $db ?? ai_db();
        $this->userModel = $userModel ?? new User();
    }

    /**
     * @return array<string, mixed>
     */
    public function compose(array $user, ?string $patientId = null, ?string $conversationType = null, bool $light = false): array
    {
        $role = (string) ($user['role'] ?? '');
        $userId = (string) ($user['user_id'] ?? '');
        $targetPatientId = $patientId;

        if ($role === 'patient') {
            $targetPatientId = $userId;
        } elseif ($targetPatientId !== null && $targetPatientId !== '') {
            if (!PatientDossierAccess::canAccess($this->db, $this->userModel, $user, $targetPatientId)) {
                throw new RuntimeException('Accès patient refusé');
            }
        }

        $context = [
            'role' => $role,
            'conversation_type' => $conversationType ?? 'general',
            'generated_at' => (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format(DateTimeInterface::ATOM),
        ];
        $parisNow = new DateTimeImmutable('now', new DateTimeZone('Europe/Paris'));
        $tomorrowParis = $parisNow->modify('+1 day');
        $context['today_paris'] = $parisNow->format('Y-m-d');
        $context['today_label_fr'] = self::formatParisDateLabel($parisNow);
        $context['tomorrow_paris'] = $tomorrowParis->format('Y-m-d');
        $context['tomorrow_label_fr'] = self::formatParisDateLabel($tomorrowParis);

        if ($role === 'patient') {
            $context['profile'] = $this->profileSummary($userId, $userId, $role);
            $context['relatives'] = $this->relativesSummary($userId);
            $context['care_categories'] = $this->careCategoriesSummary();
            $context['profile_documents'] = $this->profileDocumentsSummary($userId);
            $appointments = $this->appointmentsSummary($userId, [$userId, ...array_column($context['relatives'], 'id')]);
            if ($light) {
                $context['appointments'] = [
                    'upcoming' => array_slice($appointments['upcoming'], 0, 4),
                    'past' => array_slice($appointments['past'], 0, 2),
                ];
                $healthLight = $this->healthMetricsSummary($userId, true);
                if ($healthLight !== null) {
                    $context['health_metrics'] = $healthLight;
                }
            } else {
                $context['appointments'] = $appointments;
                $context['lab_results'] = $this->labResultsSummary($user, 5);
                $context['documents'] = $this->documentsSummary($userId, $userId, $role);
                $context['pending_documents'] = $this->pendingDocumentsSummary($userId);
                $context['health_metrics'] = $this->healthMetricsSummary($userId, false);
            }
        } elseif (in_array($role, ['pro', 'nurse', 'preleveur'], true)) {
            $context['profile'] = $this->profileSummary($userId, $userId, $role);
            $context['staff_patients'] = $this->staffPatientsSummary($user);
            $context['care_categories'] = $this->careCategoriesSummary();
            $context['accessible_patients_count'] = count($context['staff_patients']);
            if ($targetPatientId) {
                $context['patient'] = $this->profileSummary($targetPatientId, $userId, $role);
                $context['appointments'] = $this->appointmentsSummary($userId, [$targetPatientId], true);
                $context['lab_results'] = $this->labResultsSummary($user, 5, $targetPatientId);
                $context['documents'] = $this->documentsSummary($targetPatientId, $userId, $role);
            } else {
                $context['appointments'] = $this->staffAppointmentsSummary($user);
                $context['lab_results'] = $this->labResultsSummary($user, 5);
            }
        }

        return $context;
    }

    /**
     * @return array<string, mixed>|null
     */
    private function profileSummary(string $patientId, string $requesterId, string $requesterRole): ?array
    {
        try {
            $profile = $this->userModel->getById($patientId, $requesterId, $requesterRole, 'mobile');
        } catch (Throwable $e) {
            return null;
        }
        if (!$profile) {
            return null;
        }

        return [
            'id' => $patientId,
            'first_name' => $profile['first_name'] ?? null,
            'last_name' => $profile['last_name'] ?? null,
            'gender' => $profile['gender'] ?? null,
            'birth_date' => $profile['birth_date'] ?? null,
            'city' => is_array($profile['address'] ?? null) ? ($profile['address']['city'] ?? null) : null,
            'address' => is_array($profile['address'] ?? null) ? [
                'label' => $profile['address']['label'] ?? null,
                'lat' => $profile['address']['lat'] ?? null,
                'lng' => $profile['address']['lng'] ?? null,
                'postal_code' => $profile['address']['postal_code'] ?? null,
                'city' => $profile['address']['city'] ?? null,
                'complement' => $profile['address']['complement'] ?? null,
            ] : null,
        ];
    }

    /**
     * @return list<array{id: string, name: string, type: string, options: list<array<string, mixed>>}>
     */
    private function careCategoriesSummary(): array
    {
        $stmt = $this->db->query('
            SELECT id, name, type FROM care_categories
            WHERE is_active = 1
            ORDER BY type ASC, name ASC
            LIMIT 80
        ');
        $rows = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
        if ($rows === []) {
            return [];
        }

        $ids = array_map(static fn ($r) => (string) ($r['id'] ?? ''), $rows);
        $optionsByCat = $this->loadCategoryOptions($ids);

        $out = [];
        foreach ($rows as $row) {
            $id = (string) ($row['id'] ?? '');
            $out[] = [
                'id' => $id,
                'name' => (string) ($row['name'] ?? ''),
                'type' => (string) ($row['type'] ?? ''),
                'options' => $optionsByCat[$id] ?? [],
            ];
        }

        return $out;
    }

    /**
     * @param list<string> $categoryIds
     * @return array<string, list<array<string, mixed>>>
     */
    private function loadCategoryOptions(array $categoryIds): array
    {
        $categoryIds = array_values(array_filter($categoryIds));
        if ($categoryIds === []) {
            return [];
        }

        try {
            $placeholders = implode(',', array_fill(0, count($categoryIds), '?'));
            $optStmt = $this->db->prepare("
                SELECT care_category_id, option_key, label, field_type, options, is_required, sort_order
                FROM care_category_options
                WHERE care_category_id IN ($placeholders)
                ORDER BY care_category_id, sort_order, id
            ");
            $optStmt->execute($categoryIds);
            $optionsByCat = [];
            while ($row = $optStmt->fetch(PDO::FETCH_ASSOC)) {
                $cid = (string) ($row['care_category_id'] ?? '');
                $choices = null;
                if (isset($row['options']) && $row['options'] !== null) {
                    $decoded = is_string($row['options']) ? json_decode($row['options'], true) : $row['options'];
                    if (is_array($decoded)) {
                        $choices = array_map(static fn ($c) => [
                            'value' => $c['value'] ?? null,
                            'label' => $c['label'] ?? null,
                        ], $decoded);
                    }
                }
                if (!isset($optionsByCat[$cid])) {
                    $optionsByCat[$cid] = [];
                }
                $optionsByCat[$cid][] = [
                    'key' => (string) ($row['option_key'] ?? ''),
                    'label' => (string) ($row['label'] ?? ''),
                    'field_type' => (string) ($row['field_type'] ?? 'select'),
                    'required' => (bool) ($row['is_required'] ?? false),
                    'choices' => $choices,
                ];
            }

            return $optionsByCat;
        } catch (Throwable $e) {
            return [];
        }
    }

    /**
     * @return list<array{document_type: string, file_name: ?string, medical_document_id: string}>
     */
    private function profileDocumentsSummary(string $patientId): array
    {
        $docs = PatientDossierDocuments::listForPatient($this->db, $patientId);
        $out = [];
        foreach ($docs as $doc) {
            $medId = (string) ($doc['medical_document_id'] ?? '');
            if ($medId === '') {
                continue;
            }
            $out[] = [
                'document_type' => (string) ($doc['document_type'] ?? ''),
                'file_name' => $doc['file_name'] ?? null,
                'medical_document_id' => $medId,
            ];
        }

        return $out;
    }

    /**
     * @return list<array{id: string, first_name: ?string, last_name: ?string, relationship: ?string}>
     */
    private function relativesSummary(string $patientId): array
    {
        $stmt = $this->db->prepare('
            SELECT id, relationship_type, first_name_encrypted, first_name_dek, last_name_encrypted, last_name_dek
            FROM patient_relatives
            WHERE patient_id = ?
            LIMIT 10
        ');
        $stmt->execute([$patientId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        require_once __DIR__ . '/../Crypto.php';
        $crypto = new Crypto();
        $out = [];
        foreach ($rows as $row) {
            $fn = '';
            $ln = '';
            try {
                if (!empty($row['first_name_encrypted']) && !empty($row['first_name_dek'])) {
                    $fn = trim((string) $crypto->decryptField((string) $row['first_name_encrypted'], (string) $row['first_name_dek']));
                }
                if (!empty($row['last_name_encrypted']) && !empty($row['last_name_dek'])) {
                    $ln = trim((string) $crypto->decryptField((string) $row['last_name_encrypted'], (string) $row['last_name_dek']));
                }
            } catch (Throwable $e) {
                // ignore
            }
            $displayName = trim($fn . ' ' . $ln) ?: 'Proche';
            $relType = (string) ($row['relationship_type'] ?? '');
            $out[] = [
                'id' => (string) $row['id'],
                'first_name' => $fn !== '' ? $fn : null,
                'last_name' => $ln !== '' ? $ln : null,
                'relationship' => $relType !== '' ? $relType : null,
                'relationship_label_fr' => self::relationshipLabelFr($relType),
                'display_name' => $displayName,
            ];
        }

        return $out;
    }

    /**
     * @param list<string> $patientIds
     * @return array{upcoming: list<array<string, mixed>>, past: list<array<string, mixed>>}
     */
    private function appointmentsSummary(string $requesterId, array $patientIds, bool $singlePatient = false): array
    {
        if ($patientIds === []) {
            return ['upcoming' => [], 'past' => []];
        }
        $placeholders = implode(',', array_fill(0, count($patientIds), '?'));
        $terminal = ['completed', 'canceled', 'cancelled', 'refused', 'expired'];
        $terminalPh = implode(',', array_fill(0, count($terminal), '?'));

        $parisStart = new DateTime('today', new DateTimeZone('Europe/Paris'));
        $parisStart->setTimezone(new DateTimeZone('UTC'));
        $todayUtc = $parisStart->format('Y-m-d H:i:s');

        $thirtyDaysAgo = (new DateTime('now', new DateTimeZone('UTC')))->modify('-30 days')->format('Y-m-d H:i:s');

        $sqlBase = "
            SELECT a.id, a.type, a.status, a.scheduled_at, a.patient_id, cc.name AS category_name
            FROM appointments a
            LEFT JOIN care_categories cc ON cc.id = a.category_id
            WHERE a.patient_id IN ($placeholders)
              AND (a.scheduled_at IS NULL OR a.scheduled_at >= ?)
        ";
        $paramsUpcoming = [...$patientIds, $thirtyDaysAgo];
        $sqlUpcoming = $sqlBase . " AND a.status NOT IN ($terminalPh) AND (a.scheduled_at IS NULL OR a.scheduled_at >= ?) ORDER BY a.scheduled_at ASC LIMIT 10";
        $paramsUpcoming = array_merge($paramsUpcoming, $terminal, [$todayUtc]);

        $stmt = $this->db->prepare($sqlUpcoming);
        $stmt->execute($paramsUpcoming);
        $upcoming = $this->mapAppointments($stmt->fetchAll(PDO::FETCH_ASSOC));

        $sqlPast = $sqlBase . " AND (a.status IN ($terminalPh) OR (a.scheduled_at IS NOT NULL AND a.scheduled_at < ?)) ORDER BY a.scheduled_at DESC LIMIT 10";
        $paramsPast = array_merge([...$patientIds, $thirtyDaysAgo], $terminal, [$todayUtc]);
        $stmtPast = $this->db->prepare($sqlPast);
        $stmtPast->execute($paramsPast);
        $past = $this->mapAppointments($stmtPast->fetchAll(PDO::FETCH_ASSOC));

        return ['upcoming' => $upcoming, 'past' => $past];
    }

    /**
     * @return array{upcoming: list<array<string, mixed>>, past: list<array<string, mixed>>}
     */
    private function staffAppointmentsSummary(array $user): array
    {
        $userId = (string) ($user['user_id'] ?? '');
        $role = (string) ($user['role'] ?? '');
        $clauses = [];
        $params = [];
        if ($role === 'nurse') {
            $clauses[] = '(a.assigned_nurse_id = ? OR a.created_by = ?)';
            $params[] = $userId;
            $params[] = $userId;
        } elseif ($role === 'pro') {
            $clauses[] = 'a.created_by = ?';
            $params[] = $userId;
        } else {
            return ['upcoming' => [], 'past' => []];
        }

        $where = implode(' OR ', $clauses);
        $terminal = ['completed', 'canceled', 'cancelled', 'refused', 'expired'];
        $terminalPh = implode(',', array_fill(0, count($terminal), '?'));
        $parisStart = new DateTime('today', new DateTimeZone('Europe/Paris'));
        $parisStart->setTimezone(new DateTimeZone('UTC'));
        $todayUtc = $parisStart->format('Y-m-d H:i:s');

        $sql = "
            SELECT a.id, a.type, a.status, a.scheduled_at, a.patient_id, cc.name AS category_name
            FROM appointments a
            LEFT JOIN care_categories cc ON cc.id = a.category_id
            WHERE ($where)
              AND a.status NOT IN ($terminalPh)
              AND (a.scheduled_at IS NULL OR a.scheduled_at >= ?)
            ORDER BY a.scheduled_at ASC
            LIMIT 10
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(array_merge($params, $terminal, [$todayUtc]));

        return ['upcoming' => $this->mapAppointments($stmt->fetchAll(PDO::FETCH_ASSOC)), 'past' => []];
    }

    /**
     * @param list<array<string, mixed>> $rows
     * @return list<array<string, mixed>>
     */
    private function mapAppointments(array $rows): array
    {
        $out = [];
        foreach ($rows as $row) {
            $out[] = [
                'id' => (string) ($row['id'] ?? ''),
                'type' => $row['type'] ?? null,
                'status' => $row['status'] ?? null,
                'scheduled_at' => $row['scheduled_at'] ?? null,
                'category_name' => $row['category_name'] ?? null,
                'patient_id' => $row['patient_id'] ?? null,
            ];
        }

        return $out;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function labResultsSummary(array $user, int $limit, ?string $patientId = null): array
    {
        $listing = new LabResultsListing($this->db, $this->userModel);
        $result = $listing->listForUser($user, '', 1, $limit);
        $items = $result['items'] ?? [];
        if ($patientId !== null) {
            $items = array_values(array_filter($items, static fn ($i) => ($i['patient_id'] ?? null) === $patientId));
        }

        return array_map(static fn ($i) => [
            'id' => $i['id'] ?? null,
            'file_name' => $i['file_name'] ?? null,
            'created_at' => $i['created_at'] ?? null,
            'category_name' => $i['category_name'] ?? null,
            'appointment_id' => $i['appointment_id'] ?? null,
        ], array_slice($items, 0, $limit));
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function documentsSummary(string $patientId, string $requesterId, string $requesterRole): array
    {
        if (!PatientDossierAccess::canAccess($this->db, $this->userModel, [
            'user_id' => $requesterId,
            'role' => $requesterRole,
        ], $patientId)) {
            return [];
        }

        $stmt = $this->db->prepare('
            SELECT md.id, md.document_type, md.file_name, md.created_at
            FROM medical_documents md
            INNER JOIN appointments a ON a.id = md.appointment_id
            WHERE a.patient_id = ?
            ORDER BY md.created_at DESC
            LIMIT 8
        ');
        $stmt->execute([$patientId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $out = [];
        foreach ($rows as $row) {
            $out[] = [
                'id' => (string) ($row['id'] ?? ''),
                'document_type' => $row['document_type'] ?? null,
                'file_name' => $row['file_name'] ?? null,
                'created_at' => $row['created_at'] ?? null,
            ];
        }

        return $out;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function pendingDocumentsSummary(string $patientId): array
    {
        $stmt = $this->db->prepare("
            SELECT a.id, a.type, a.status, a.scheduled_at, cc.name AS category_name
            FROM appointments a
            LEFT JOIN care_categories cc ON cc.id = a.category_id
            WHERE a.patient_id = ?
              AND a.status IN ('pending', 'confirmed', 'planned', 'inProgress')
              AND a.scheduled_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            ORDER BY a.scheduled_at ASC
            LIMIT 5
        ");
        $stmt->execute([$patientId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return $this->mapAppointments($rows);
    }

    /**
     * @return list<array{id: string, display_name: string, first_name: ?string, last_name: ?string}>
     */
    private function staffPatientsSummary(array $user): array
    {
        $role = (string) ($user['role'] ?? '');
        $requesterId = (string) ($user['user_id'] ?? '');
        if (!in_array($role, ['nurse', 'pro', 'preleveur'], true) || $requesterId === '') {
            return [];
        }

        $filters = ['role' => 'patient', 'created_by' => $requesterId];
        $out = [];
        $page = 1;
        do {
            $result = $this->userModel->getAll($filters, $page, 50, $requesterId, $role);
            foreach ($result['data'] ?? [] as $row) {
                if (empty($row['id'])) {
                    continue;
                }
                $fn = trim((string) ($row['first_name'] ?? ''));
                $ln = trim((string) ($row['last_name'] ?? ''));
                $display = trim($fn . ' ' . $ln) ?: 'Patient';
                $out[] = [
                    'id' => (string) $row['id'],
                    'first_name' => $fn !== '' ? $fn : null,
                    'last_name' => $ln !== '' ? $ln : null,
                    'display_name' => $display,
                ];
                if (count($out) >= 20) {
                    break 2;
                }
            }
            $pages = (int) ($result['pages'] ?? 1);
            $page++;
        } while ($page <= $pages && $page <= 4);

        return $out;
    }

    /**
     * @return list<string>
     */
    private function scopedPatientIds(array $user): array
    {
        $role = (string) ($user['role'] ?? '');
        if (!in_array($role, ['nurse', 'pro'], true)) {
            return [];
        }
        $filters = ['role' => 'patient', 'created_by' => (string) ($user['user_id'] ?? '')];
        $ids = [];
        $page = 1;
        do {
            $result = $this->userModel->getAll($filters, $page, 100, (string) ($user['user_id'] ?? ''), $role);
            foreach ($result['data'] ?? [] as $row) {
                if (!empty($row['id'])) {
                    $ids[(string) $row['id']] = true;
                }
            }
            $pages = (int) ($result['pages'] ?? 1);
            $page++;
        } while ($page <= $pages && $page <= 10);

        return array_keys($ids);
    }

    private static function relationshipLabelFr(string $type): string
    {
        $map = [
            'child' => 'enfant',
            'parent' => 'parent',
            'spouse' => 'conjoint(e)',
            'sibling' => 'frère ou sœur',
            'grandparent' => 'grand-parent',
            'grandchild' => 'petit-enfant',
            'other' => 'proche',
        ];

        return $map[$type] ?? 'proche';
    }

    /**
     * Résumé métriques santé (patient uniquement — Phase 2).
     *
     * @return array<string, mixed>|null
     */
    private function healthMetricsSummary(string $patientId, bool $light): ?array
    {
        try {
            $service = new HealthService($this->db);
            $summary = $service->metricsSummary($patientId);
            if (empty($summary['has_data'])) {
                return null;
            }
            if ($light) {
                return [
                    'has_data' => true,
                    'last_sync_at' => $summary['last_sync_at'] ?? null,
                    'windows' => ['7d' => $summary['windows']['7d'] ?? ['days' => 7, 'metrics' => []]],
                ];
            }

            return $summary;
        } catch (Throwable $e) {
            return null;
        }
    }

    private static function formatParisDateLabel(DateTimeImmutable $dt): string
    {
        $days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
        $months = [
            1 => 'janvier', 2 => 'février', 3 => 'mars', 4 => 'avril',
            5 => 'mai', 6 => 'juin', 7 => 'juillet', 8 => 'août',
            9 => 'septembre', 10 => 'octobre', 11 => 'novembre', 12 => 'décembre',
        ];
        $dow = $days[(int) $dt->format('w')];
        $month = $months[(int) $dt->format('n')] ?? $dt->format('m');

        return ucfirst($dow) . ' ' . $dt->format('j') . ' ' . $month . ' ' . $dt->format('Y');
    }
}

<?php

declare(strict_types=1);

require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/Crypto.php';

/**
 * Liste des résultats d'analyses (document_type = resultats) accessible par rôle.
 */
final class LabResultsListing
{
    private PDO $db;
    private User $userModel;
    private Crypto $crypto;

    public function __construct(PDO $db, ?User $userModel = null, ?Crypto $crypto = null)
    {
        $this->db = $db;
        $this->userModel = $userModel ?? new User();
        $this->crypto = $crypto ?? new Crypto();
    }

    /**
     * @return array{items: list<array<string, mixed>>, total: int}
     */
    public function listForUser(array $user, string $query, int $page, int $limit): array
    {
        $role = (string) ($user['role'] ?? '');
        $userId = (string) ($user['user_id'] ?? '');
        $q = $this->normalizeText($query);

        $page = max(1, $page);
        $limit = max(1, min(100, $limit));
        $offset = ($page - 1) * $limit;

        $whereParts = ["md.document_type = 'resultats'", "a.type = 'blood_test'"];
        $params = [];

        if ($role === 'patient') {
            $whereParts[] = 'a.patient_id = ?';
            $params[] = $userId;
        } elseif ($role === 'nurse') {
            $patientIds = $this->scopedPatientIds($user);
            $clauses = ['a.assigned_nurse_id = ?', 'a.created_by = ?'];
            $params[] = $userId;
            $params[] = $userId;
            if ($patientIds !== []) {
                $placeholders = implode(',', array_fill(0, count($patientIds), '?'));
                $clauses[] = "a.patient_id IN ($placeholders)";
                $params = array_merge($params, $patientIds);
            }
            $whereParts[] = '(' . implode(' OR ', $clauses) . ')';
        } elseif ($role === 'pro') {
            $patientIds = $this->scopedPatientIds($user);
            $clauses = ['a.created_by = ?'];
            $params[] = $userId;
            if ($patientIds !== []) {
                $placeholders = implode(',', array_fill(0, count($patientIds), '?'));
                $clauses[] = "a.patient_id IN ($placeholders)";
                $params = array_merge($params, $patientIds);
            }
            $whereParts[] = '(' . implode(' OR ', $clauses) . ')';
        } else {
            return ['items' => [], 'total' => 0];
        }

        try {
            $hasMergedColumn = (bool) $this->db->query("
                SELECT COUNT(*) FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'appointments'
                  AND COLUMN_NAME = 'merged_into_appointment_id'
            ")->fetchColumn();
        } catch (Throwable $e) {
            $hasMergedColumn = false;
        }
        if ($hasMergedColumn) {
            $whereParts[] = 'a.merged_into_appointment_id IS NULL';
        }

        $where = implode(' AND ', $whereParts);

        $countStmt = $this->db->prepare("
            SELECT COUNT(*)
            FROM medical_documents md
            INNER JOIN appointments a ON a.id = md.appointment_id
            WHERE $where
        ");
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        $sql = "
            SELECT
                md.id,
                md.file_name,
                md.file_size,
                md.mime_type,
                md.created_at,
                a.id AS appointment_id,
                a.scheduled_at AS appointment_scheduled_at,
                a.patient_id,
                cc.name AS category_name,
                p.first_name_encrypted,
                p.first_name_dek,
                p.last_name_encrypted,
                p.last_name_dek
            FROM medical_documents md
            INNER JOIN appointments a ON a.id = md.appointment_id
            LEFT JOIN care_categories cc ON cc.id = a.category_id
            LEFT JOIN profiles p ON p.id = a.patient_id
            WHERE $where
            ORDER BY md.created_at DESC
        ";
        if ($q === '') {
            $sql .= ' LIMIT ' . (int) $limit . ' OFFSET ' . (int) $offset;
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $items = [];
        foreach ($rows as $row) {
            $item = $this->mapRow($row, $role);
            if ($q !== '' && !$this->matchesQuery($item, $q)) {
                continue;
            }
            $items[] = $item;
        }

        if ($q !== '') {
            $total = count($items);
            $items = array_slice($items, $offset, $limit);
        }

        return ['items' => $items, 'total' => $total];
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

        $filters = ['role' => 'patient'];
        if (in_array($role, ['pro', 'nurse', 'subaccount'], true)) {
            $filters['created_by'] = (string) ($user['user_id'] ?? '');
        }

        $ids = [];
        $page = 1;
        do {
            $result = $this->userModel->getAll(
                $filters,
                $page,
                100,
                (string) ($user['user_id'] ?? ''),
                $role
            );
            foreach ($result['data'] ?? [] as $row) {
                if (!empty($row['id'])) {
                    $ids[(string) $row['id']] = true;
                }
            }
            $pages = (int) ($result['pages'] ?? 1);
            $page++;
        } while ($page <= $pages && $page <= 15);

        return array_keys($ids);
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private function mapRow(array $row, string $role): array
    {
        $medicalId = (string) ($row['id'] ?? '');
        $firstName = '';
        $lastName = '';
        if ($role !== 'patient') {
            if (!empty($row['first_name_encrypted']) && !empty($row['first_name_dek'])) {
                $firstName = trim((string) $this->crypto->decryptField(
                    (string) $row['first_name_encrypted'],
                    (string) $row['first_name_dek']
                ));
            }
            if (!empty($row['last_name_encrypted']) && !empty($row['last_name_dek'])) {
                $lastName = trim((string) $this->crypto->decryptField(
                    (string) $row['last_name_encrypted'],
                    (string) $row['last_name_dek']
                ));
            }
        }

        return [
            'id' => $medicalId,
            'medical_document_id' => $medicalId,
            'file_name' => $row['file_name'] ?? null,
            'file_size' => isset($row['file_size']) ? (int) $row['file_size'] : null,
            'mime_type' => $row['mime_type'] ?? null,
            'created_at' => $row['created_at'] ?? null,
            'appointment_id' => (string) ($row['appointment_id'] ?? ''),
            'appointment_scheduled_at' => $row['appointment_scheduled_at'] ?? null,
            'category_name' => $row['category_name'] ?? null,
            'patient_id' => $row['patient_id'] ?? null,
            'patient_first_name' => $firstName !== '' ? $firstName : null,
            'patient_last_name' => $lastName !== '' ? $lastName : null,
        ];
    }

    /**
     * @param array<string, mixed> $item
     */
    private function matchesQuery(array $item, string $q): bool
    {
        $haystack = strtolower(implode(' ', array_filter([
            (string) ($item['file_name'] ?? ''),
            (string) ($item['category_name'] ?? ''),
            (string) ($item['patient_first_name'] ?? ''),
            (string) ($item['patient_last_name'] ?? ''),
            trim(((string) ($item['patient_first_name'] ?? '')) . ' ' . ((string) ($item['patient_last_name'] ?? ''))),
        ])));

        return str_contains($haystack, $q);
    }

    private function normalizeText(string $value): string
    {
        $v = trim(mb_strtolower($value));
        $v = preg_replace('/\s+/u', ' ', $v) ?? $v;

        return $v;
    }
}

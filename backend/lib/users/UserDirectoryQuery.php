<?php

declare(strict_types=1);

require_once __DIR__ . '/../Crypto.php';
require_once __DIR__ . '/../DbSchemaCache.php';
require_once __DIR__ . '/../Logger.php';
require_once __DIR__ . '/UserDirectoryHelpers.php';

/** Liste paginée des profils (admin / picker / mes patients) avec déchiffrement batch. */
final class UserDirectoryQuery
{
    public function __construct(
        private PDO $db,
        private Crypto $crypto,
        private Logger $logger,
        private PatientProfessionalAccessService $patientAccess,
    ) {
    }

    /**
     * @return array{data: list<array<string, mixed>>, total: int, page: int, limit: int, pages: int}
     */
    public function getAll(
        array $filters = [],
        int $page = 1,
        int $limit = 20,
        string $requesterId = '',
        string $requesterRole = ''
    ): array {
        if (($filters['role'] ?? '') === 'patient' && $requesterRole !== '') {
            $hasStaffScope = !empty($filters['created_by']) || !empty($filters['for_lab_owner_id']);
            if (!User::canListPatients($requesterRole)
                || ($requesterRole !== 'super_admin' && !$hasStaffScope)
            ) {
                return [
                    'data' => [],
                    'total' => 0,
                    'page' => $page,
                    'limit' => $limit,
                    'pages' => 0,
                ];
            }
        }

        $pickerScope = (($filters['scope'] ?? '') === 'picker');
        $searchText = trim((string) ($filters['search'] ?? ''));
        $roleFilter = (string) ($filters['role'] ?? '');
        $staffCanSearchPicker = $pickerScope
            && $searchText !== ''
            && in_array($roleFilter, ['nurse', 'lab', 'subaccount', 'preleveur', 'pro'], true)
            && in_array($requesterRole, ['pro', 'nurse', 'super_admin'], true);
        $patientCanSearchPicker = $pickerScope
            && $searchText !== ''
            && $roleFilter === 'patient'
            && User::canListPatients($requesterRole);
        $textSearchMode = $searchText !== ''
            && (
                $requesterRole === 'super_admin'
                || $staffCanSearchPicker
                || $patientCanSearchPicker
            );
        $emailSearchHash = ($textSearchMode && filter_var($searchText, FILTER_VALIDATE_EMAIL))
            ? hash('sha256', strtolower($searchText))
            : null;
        if ($emailSearchHash !== null) {
            $textSearchMode = false;
        }
        $sql = 'SELECT id, role, created_at, updated_at, banned_until, incident_count, last_incident_at,
            email_encrypted, email_dek, first_name_encrypted, first_name_dek, last_name_encrypted, last_name_dek,
            phone_encrypted, phone_dek';
        if (!$pickerScope) {
            $sql .= ', profile_image_url';
        }
        if ($this->hasCompanyNameColumn()) {
            $sql .= ', company_name_encrypted, company_name_dek';
        }
        if ($this->hasLabIdColumn()) {
            $sql .= ', lab_id';
        }
        if (!empty($filters['role']) && $filters['role'] === 'patient') {
            $sql .= ', birth_date_encrypted, birth_date_dek, gender_encrypted, gender_dek';
        }
        if ($this->hasCreatedByColumn()) {
            $sql .= ', created_by';
        }
        $sql .= ' FROM profiles WHERE 1=1';
        $params = [];

        if (!empty($filters['role'])) {
            $sql .= ' AND role = ?';
            $params[] = $filters['role'];
        }

        if (!empty($filters['lab_id']) && $this->hasLabIdColumn()) {
            $sql .= ' AND lab_id = ?';
            $params[] = $filters['lab_id'];
        }
        $this->patientAccess->appendPatientListScopeSql($sql, $params, $filters);
        if ($emailSearchHash !== null) {
            $sql .= ' AND email_hash = ?';
            $params[] = $emailSearchHash;
        }
        if (!empty($filters['status'])) {
            if ($filters['status'] === 'banned') {
                $sql .= " AND banned_until > '9999-12-30'";
            } elseif ($filters['status'] === 'suspended') {
                $sql .= ' AND banned_until > NOW() AND banned_until < \'9999-12-31\'';
            } elseif ($filters['status'] === 'active') {
                $sql .= ' AND (banned_until IS NULL OR banned_until < NOW())';
            }
        }

        $countSql = 'SELECT COUNT(*) as total FROM profiles WHERE 1=1';
        $countParams = [];
        if (!empty($filters['role'])) {
            $countSql .= ' AND role = ?';
            $countParams[] = $filters['role'];
        }
        if (!empty($filters['lab_id']) && $this->hasLabIdColumn()) {
            $countSql .= ' AND lab_id = ?';
            $countParams[] = $filters['lab_id'];
        }
        $this->patientAccess->appendPatientListScopeSql($countSql, $countParams, $filters);
        if ($emailSearchHash !== null) {
            $countSql .= ' AND email_hash = ?';
            $countParams[] = $emailSearchHash;
        }
        if (!empty($filters['status'])) {
            if ($filters['status'] === 'banned') {
                $countSql .= " AND banned_until > '9999-12-30'";
            } elseif ($filters['status'] === 'suspended') {
                $countSql .= ' AND banned_until > NOW() AND banned_until < \'9999-12-31\'';
            } elseif ($filters['status'] === 'active') {
                $countSql .= ' AND (banned_until IS NULL OR banned_until < NOW())';
            }
        }

        if (!$textSearchMode) {
            $countStmt = $this->db->prepare($countSql);
            $countStmt->execute($countParams);
            $total = (int) $countStmt->fetch()['total'];
        }

        if ($textSearchMode) {
            $searchCap = $pickerScope ? 1200 : 5000;
            $sql .= ' ORDER BY created_at DESC LIMIT ' . (int) $searchCap;
        } else {
            $offset = ($page - 1) * $limit;
            $sql .= ' ORDER BY created_at DESC LIMIT ' . (int) $limit . ' OFFSET ' . (int) $offset;
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $users = $stmt->fetchAll();

        $decryptedUsers = [];
        $decryptAudit = [];
        foreach ($users as $u) {
            try {
                $u['email'] = !empty($u['email_encrypted']) && !empty($u['email_dek'])
                    ? $this->crypto->decryptField($u['email_encrypted'], $u['email_dek']) : '';
                $u['first_name'] = !empty($u['first_name_encrypted']) && !empty($u['first_name_dek'])
                    ? $this->crypto->decryptField($u['first_name_encrypted'], $u['first_name_dek']) : '';
                $u['last_name'] = !empty($u['last_name_encrypted']) && !empty($u['last_name_dek'])
                    ? $this->crypto->decryptField($u['last_name_encrypted'], $u['last_name_dek']) : '';
                $u['phone'] = !empty($u['phone_encrypted']) && !empty($u['phone_dek'])
                    ? $this->crypto->decryptField($u['phone_encrypted'], $u['phone_dek']) : null;
                $u['company_name'] = null;
                if ($this->hasCompanyNameColumn() && !empty($u['company_name_encrypted'] ?? '') && !empty($u['company_name_dek'] ?? '')) {
                    $u['company_name'] = $this->crypto->decryptField($u['company_name_encrypted'], $u['company_name_dek']);
                }
                $u['gender'] = null;
                $u['birth_date'] = null;
                if (!empty($u['gender_encrypted']) && !empty($u['gender_dek'])) {
                    $u['gender'] = $this->crypto->decryptField($u['gender_encrypted'], $u['gender_dek']);
                }
                if (!empty($u['birth_date_encrypted']) && !empty($u['birth_date_dek'])) {
                    $u['birth_date'] = $this->crypto->decryptField($u['birth_date_encrypted'], $u['birth_date_dek']);
                }
                unset($u['email_encrypted'], $u['email_dek'], $u['first_name_encrypted'], $u['first_name_dek'],
                    $u['last_name_encrypted'], $u['last_name_dek'], $u['phone_encrypted'], $u['phone_dek']);
                if (isset($u['company_name_encrypted'])) {
                    unset($u['company_name_encrypted'], $u['company_name_dek']);
                }
                unset($u['gender_encrypted'], $u['gender_dek'], $u['birth_date_encrypted'], $u['birth_date_dek']);
                $logFields = ['email', 'first_name', 'last_name', 'phone', 'company_name'];
                if ($u['gender'] !== null) {
                    $logFields[] = 'gender';
                }
                if ($u['birth_date'] !== null) {
                    $logFields[] = 'birth_date';
                }
                if (!$pickerScope && array_key_exists('profile_image_url', $u)) {
                    $url = trim((string) ($u['profile_image_url'] ?? ''));
                    $u['profile_image_url'] = $url !== '' ? $url : null;
                }
                $decryptAudit[$u['id']] = $logFields;
                $decryptedUsers[] = $pickerScope ? UserDirectoryHelpers::compactForPicker($u) : $u;
            } catch (Exception $e) {
                $decryptedUsers[] = [
                    'id' => $u['id'],
                    'role' => $u['role'],
                    'first_name' => '',
                    'last_name' => '',
                    'email' => '',
                    'company_name' => null,
                    'created_at' => $u['created_at'],
                    'updated_at' => $u['updated_at'],
                    'banned_until' => $u['banned_until'],
                    'incident_count' => $u['incident_count'] ?? 0,
                    'error' => 'Erreur de déchiffrement',
                ];
            }
        }

        $this->logger->logDecryptBatch($requesterId, $requesterRole, 'profile', $decryptAudit);
        $creatorIdsForDisplay = [];
        foreach ($decryptedUsers as $u) {
            if (($u['role'] ?? '') !== 'patient' || empty($u['created_by'])) {
                continue;
            }
            $em = (string) ($u['email'] ?? '');
            if ($em !== '' && str_ends_with($em, '@patients.internal.local')) {
                $creatorIdsForDisplay[] = (string) $u['created_by'];
            }
        }
        $creatorEmailsMap = $this->getCreatorEmailsForDisplay($creatorIdsForDisplay);
        foreach ($decryptedUsers as &$u) {
            if (($u['role'] ?? '') !== 'patient') {
                continue;
            }
            $em = (string) ($u['email'] ?? '');
            if ($em === '' || !str_ends_with($em, '@patients.internal.local') || empty($u['created_by'])) {
                continue;
            }
            $proEmail = $creatorEmailsMap[(string) $u['created_by']] ?? null;
            if ($proEmail) {
                $u['email_display'] = 'Sans email patient — notifications / contact professionnel : ' . $proEmail;
            } else {
                $u['email_display'] = 'Patient sans email (créé par un professionnel)';
            }
        }
        unset($u);

        if ($textSearchMode) {
            $decryptedUsers = array_values(array_filter(
                $decryptedUsers,
                fn (array $u): bool => UserDirectoryHelpers::profileMatchesAdminSearch($u, $searchText)
            ));
            $total = count($decryptedUsers);
            $offset = ($page - 1) * $limit;
            $decryptedUsers = array_slice($decryptedUsers, $offset, $limit);
        }

        return [
            'data' => $decryptedUsers,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'pages' => max(1, (int) ceil($total / $limit)),
        ];
    }

    /**
     * @param list<string> $creatorIds
     * @return array<string, string|null>
     */
    private function getCreatorEmailsForDisplay(array $creatorIds): array
    {
        $creatorIds = array_values(array_unique(array_filter(array_map('strval', $creatorIds))));
        if ($creatorIds === []) {
            return [];
        }
        $placeholders = implode(',', array_fill(0, count($creatorIds), '?'));
        $stmt = $this->db->prepare("SELECT id, email_encrypted, email_dek FROM profiles WHERE id IN ($placeholders)");
        $stmt->execute($creatorIds);
        $out = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            try {
                $out[(string) $row['id']] = $this->crypto->decryptField($row['email_encrypted'], $row['email_dek']);
            } catch (Exception $e) {
                $out[(string) $row['id']] = null;
            }
        }

        return $out;
    }

    private function hasCompanyNameColumn(): bool
    {
        return DbSchemaCache::tableHasColumn($this->db, 'profiles', 'company_name_encrypted');
    }

    private function hasLabIdColumn(): bool
    {
        return DbSchemaCache::tableHasColumn($this->db, 'profiles', 'lab_id');
    }

    private function hasCreatedByColumn(): bool
    {
        return DbSchemaCache::tableHasColumn($this->db, 'profiles', 'created_by');
    }
}

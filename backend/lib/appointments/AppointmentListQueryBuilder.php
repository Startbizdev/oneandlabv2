<?php

declare(strict_types=1);

require_once __DIR__ . '/../AppTimezone.php';
require_once __DIR__ . '/../DbSchemaCache.php';
require_once __DIR__ . '/../LabTeamAccess.php';
require_once __DIR__ . '/../PendingOfferExpiry.php';
require_once __DIR__ . '/AppointmentListQuery.php';
require_once __DIR__ . '/AppointmentListSqlResult.php';

final class AppointmentListQueryBuilder
{
    private string $selectColumns;

    /** @var array<int, mixed> */
    private array $params = [];

    private string $whereSuffix = '';

    private string $effectiveRole;

    private string $effectiveUserId;

    public function __construct(
        private readonly PDO $db,
        private readonly AppointmentListQuery $query,
        /** @var array<string, mixed>|null */
        private readonly ?array $user,
        private readonly bool $useRelativeJoin,
        private readonly bool $hasMergedColumn,
    ) {
        $this->effectiveRole = (string) ($user['role'] ?? '');
        $this->effectiveUserId = (string) ($user['user_id'] ?? '');
        $this->selectColumns = $this->buildSelectColumns();
    }

    public static function schemaFlags(PDO $db): array
    {
        $hasRelativeColumn = DbSchemaCache::tableHasColumn($db, 'appointments', 'relative_id');
        $hasPatientRelativesTable = DbSchemaCache::tableExists($db, 'patient_relatives');
        $useRelativeJoin = $hasRelativeColumn && $hasPatientRelativesTable;
        $hasMergedColumn = DbSchemaCache::tableHasColumn($db, 'appointments', 'merged_into_appointment_id');

        return [
            'useRelativeJoin' => $useRelativeJoin,
            'hasMergedColumn' => $hasMergedColumn,
        ];
    }

    public function build(): AppointmentListSqlResult
    {
        $this->applyCommonFilters();
        if ($this->user !== null) {
            $this->resolveEffectiveRoleAndUser();
            $this->applyRoleScope();
        }

        $fromJoin = $this->buildFromJoin();
        $where = ' WHERE 1=1' . $this->whereSuffix;
        $selectSql = 'SELECT' . $this->selectColumns . $fromJoin . $where;
        $countExpr = $this->useRelativeJoin
            ? 'COUNT(DISTINCT a.id) as total'
            : 'COUNT(*) as total';
        $countSql = 'SELECT ' . $countExpr . $fromJoin . $where;

        return new AppointmentListSqlResult(
            selectSql: $selectSql,
            countSql: $countSql,
            params: $this->params,
            effectiveRole: $this->effectiveRole,
            effectiveUserId: $this->effectiveUserId,
            useRelativeJoin: $this->useRelativeJoin,
            hasMergedColumn: $this->hasMergedColumn,
        );
    }

    /**
     * @return array{0: string, 1: array<int, mixed>}
     */
    public function buildOrderByClause(): array
    {
        $orderParams = [];
        $patientPeriod = $this->query->patientPeriod;
        $sort = isset($_GET['sort']) ? trim((string) $_GET['sort']) : '';
        $orderBy = ' ORDER BY a.scheduled_at DESC';
        if ($this->user !== null && ($this->user['role'] ?? '') === 'nurse') {
            $orderBy = ' ORDER BY a.created_at DESC, a.scheduled_at DESC';
        } elseif ($this->user !== null && ($this->user['role'] ?? '') === 'super_admin') {
            $orderBy = ' ORDER BY a.created_at DESC, a.scheduled_at DESC';
        } elseif ($sort === 'created_at') {
            $orderBy = ' ORDER BY a.created_at DESC, a.scheduled_at DESC';
        } elseif ($this->user !== null && ($this->user['role'] ?? '') === 'patient') {
            $orderBy = ($patientPeriod === 'past')
                ? ' ORDER BY a.scheduled_at DESC'
                : ' ORDER BY a.scheduled_at ASC';
        } elseif ($this->user !== null && ($this->user['role'] ?? '') === 'preleveur') {
            $assignedOnlyOrder = !empty($_GET['assigned_only'])
                && in_array(strtolower(trim((string) $_GET['assigned_only'])), ['1', 'true', 'yes'], true);
            if ($assignedOnlyOrder) {
                $orderBy = ' ORDER BY a.scheduled_at ASC';
            } else {
                $orderBy = ' ORDER BY (CASE WHEN a.assigned_to = ? THEN 0 ELSE 1 END) ASC, a.scheduled_at DESC';
                $orderParams[] = $this->effectiveUserId;
            }
        }

        return [$orderBy, $orderParams];
    }

    private function buildSelectColumns(): string
    {
        if ($this->useRelativeJoin) {
            return '
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
                cc.name as category_name,
                cc.type as category_type,
                cc.icon as category_icon,
                cc.image_url as category_image_url
            ';
        }

        return '
                a.*,
                cc.name as category_name,
                cc.type as category_type,
                cc.icon as category_icon,
                cc.image_url as category_image_url
            ';
    }

    private function buildFromJoin(): string
    {
        if ($this->useRelativeJoin) {
            return '
            FROM appointments a
            LEFT JOIN patient_relatives pr ON a.relative_id = pr.id
            LEFT JOIN care_categories cc ON a.category_id = cc.id';
        }

        return '
            FROM appointments a
            LEFT JOIN care_categories cc ON a.category_id = cc.id';
    }

    private function appendWhere(string $fragment): void
    {
        $this->whereSuffix .= $fragment;
    }

    private function applyCommonFilters(): void
    {
        if ($this->hasMergedColumn) {
            $this->appendWhere(' AND a.merged_into_appointment_id IS NULL');
        }

        $status = $this->query->status;
        if ($status) {
            if (strpos($status, ',') !== false) {
                $statuses = explode(',', $status);
                $placeholders = implode(',', array_fill(0, count($statuses), '?'));
                $this->appendWhere(" AND a.status IN ($placeholders)");
                $this->params = array_merge($this->params, $statuses);
            } else {
                $this->appendWhere(' AND a.status = ?');
                $this->params[] = $status;
            }
        }

        $type = $this->query->type;
        if ($type) {
            $this->appendWhere(' AND a.type = ?');
            $this->params[] = $type;
        }
        if ($this->query->dateFrom) {
            $this->appendWhere(' AND a.scheduled_at >= ?');
            $this->params[] = $this->query->dateFrom;
        }
        if ($this->query->dateTo) {
            $this->appendWhere(' AND a.scheduled_at <= ?');
            $this->params[] = $this->query->dateTo;
        }

        $patientIdFilter = $this->query->patientId;
        if ($patientIdFilter !== null && $patientIdFilter !== '') {
            $this->appendWhere(' AND a.patient_id = ?');
            $this->params[] = $patientIdFilter;
        }
    }

    private function resolveEffectiveRoleAndUser(): void
    {
        if (($this->user['role'] ?? '') === 'super_admin' && $this->query->userIdOverride !== null && $this->query->userIdOverride !== '') {
            $roleStmt = $this->db->prepare('SELECT role FROM profiles WHERE id = ? LIMIT 1');
            $roleStmt->execute([$this->query->userIdOverride]);
            $targetProfile = $roleStmt->fetch(PDO::FETCH_ASSOC);
            if ($targetProfile && !empty($targetProfile['role'])) {
                $this->effectiveUserId = $this->query->userIdOverride;
                $this->effectiveRole = (string) $targetProfile['role'];
            }
        }
    }

    private function applyRoleScope(): void
    {
        $role = $this->effectiveRole;
        $userId = $this->effectiveUserId;

        if ($role === 'patient') {
            $this->applyPatientScope($userId);
        } elseif ($role === 'nurse') {
            $this->applyNurseScope($userId);
        } elseif ($role === 'lab' || $role === 'subaccount') {
            $this->applyLabScope($userId, $role);
        } elseif ($role === 'preleveur') {
            $this->applyPreleveurScope($userId);
        } elseif ($role === 'pro') {
            $this->applyProScope($userId);
        }

        $status = $this->query->status;
        if (
            $status === 'pending'
            && in_array($role, ['nurse', 'lab', 'subaccount', 'preleveur'], true)
        ) {
            $this->appendWhere(' AND ' . PendingOfferExpiry::sqlCreatedWithinTtl('a'));
        }
    }

    private function applyPatientScope(string $userId): void
    {
        if ($this->useRelativeJoin) {
            $this->appendWhere(' AND (a.patient_id = ? OR pr.patient_id = ?)');
            $this->params[] = $userId;
            $this->params[] = $userId;
        } else {
            $this->appendWhere(' AND a.patient_id = ?');
            $this->params[] = $userId;
        }
        $terminalStatuses = ['completed', 'canceled', 'cancelled', 'refused', 'expired'];
        $patientPeriod = $this->query->patientPeriod;
        if ($patientPeriod === 'upcoming') {
            $terminalPh = implode(',', array_fill(0, count($terminalStatuses), '?'));
            $this->appendWhere(" AND a.status NOT IN ($terminalPh)");
            $this->params = array_merge($this->params, $terminalStatuses);
            $this->appendWhere(' AND (a.scheduled_at IS NULL OR a.scheduled_at >= ?)');
            $this->params[] = AppTimezone::sqlStartOfToday();
        } elseif ($patientPeriod === 'past') {
            $terminalPh = implode(',', array_fill(0, count($terminalStatuses), '?'));
            $this->appendWhere(" AND (a.status IN ($terminalPh) OR (a.scheduled_at IS NOT NULL AND a.scheduled_at < ?))");
            $this->params = array_merge($this->params, $terminalStatuses);
            $this->params[] = AppTimezone::sqlStartOfToday();
        }
    }

    private function applyNurseScope(string $userId): void
    {
        $nurseTab = isset($_GET['nurse_tab']) ? trim((string) $_GET['nurse_tab']) : '';
        $nurseSegment = isset($_GET['nurse_segment']) ? trim((string) $_GET['nurse_segment']) : '';
        if ($nurseSegment === 'dispatches') {
            $nurseSegment = 'tous';
        }
        if ($nurseSegment === 'offres') {
            $nurseSegment = 'en_attente';
        }
        if ($nurseSegment === 'tour') {
            $nurseSegment = 'acceptes';
        }
        if ($nurseTab === 'demandes') {
            $nurseSegment = 'envoyes';
        }

        if ($nurseSegment === 'envoyes') {
            $this->appendWhere(" AND a.type = 'blood_test' AND a.created_by = ?");
            $this->params[] = $userId;
        } elseif ($nurseSegment === 'en_attente') {
            $this->appendWhere(" AND (
                    (a.type = 'nursing' AND a.status = 'pending'
                        AND a.assigned_nurse_id IS NULL
                        AND " . PendingOfferExpiry::sqlCreatedWithinTtl('a') . "
                        AND EXISTS (SELECT 1 FROM appointment_offers o2 WHERE o2.appointment_id = a.id AND o2.profile_id = ?))
                    OR (a.type = 'blood_test' AND a.created_by = ? AND a.status = 'pending')
                )");
            $this->params[] = $userId;
            $this->params[] = $userId;
        } elseif ($nurseSegment === 'acceptes') {
            $parisStartStr = AppTimezone::sqlStartOfToday();
            $this->appendWhere(" AND (
                    (a.type = 'nursing' AND a.assigned_nurse_id = ? AND a.status IN ('confirmed','inProgress','planned')
                        AND (a.scheduled_at IS NULL OR a.scheduled_at >= ?))
                    OR (a.type = 'blood_test' AND a.created_by = ? AND a.status IN ('confirmed','inProgress','planned')
                        AND (a.scheduled_at IS NULL OR a.scheduled_at >= ?))
                )");
            $this->params[] = $userId;
            $this->params[] = $parisStartStr;
            $this->params[] = $userId;
            $this->params[] = $parisStartStr;
        } elseif ($nurseSegment === 'historique') {
            $this->appendWhere(" AND a.type = 'nursing' AND a.assigned_nurse_id = ? AND (
                    a.status IN ('completed','canceled','cancelled','refused')
                    OR (a.scheduled_at IS NOT NULL AND a.scheduled_at < ?)
                )");
            $this->params[] = $userId;
            $this->params[] = AppTimezone::sqlStartOfToday();
        } elseif ($nurseSegment === 'relais') {
            $this->appendWhere(" AND a.type = 'nursing' AND a.created_by = ? AND a.status = 'pending' AND (a.assigned_nurse_id IS NULL OR a.assigned_nurse_id <> ?)
                    AND " . PendingOfferExpiry::sqlCreatedWithinTtl('a') . "
                    AND NOT EXISTS (
                        SELECT 1 FROM appointment_status_updates u
                        WHERE u.appointment_id = a.id AND u.actor_id = ? AND u.note LIKE ?
                    )");
            $this->params[] = $userId;
            $this->params[] = $userId;
            $this->params[] = $userId;
            $this->params[] = '%redispatch%';
        } elseif ($nurseTab === 'soins' && ($nurseSegment === '' || $nurseSegment === 'tous')) {
            $this->appendNurseDefaultMesSoinsScope($userId);
        } else {
            $this->appendNurseDefaultMesSoinsScope($userId);
        }

        $this->appendWhere(" AND NOT EXISTS (
                SELECT 1 FROM appointment_status_updates u
                WHERE u.appointment_id = a.id AND u.actor_id = ? AND u.note LIKE ?
            )");
        $this->params[] = $userId;
        $this->params[] = '%redispatch%';

        if ($nurseSegment !== 'envoyes' && $nurseSegment !== 'en_attente') {
            $prefsCheckSql = 'SELECT COUNT(*) as count FROM nurse_category_preferences WHERE nurse_id = ? AND is_enabled = TRUE';
            $prefsStmt = $this->db->prepare($prefsCheckSql);
            $prefsStmt->execute([$userId]);
            $prefsCount = $prefsStmt->fetch(PDO::FETCH_ASSOC)['count'];

            if ($prefsCount > 0) {
                $this->appendWhere(' AND (
                        a.type = \'blood_test\' OR
                        a.category_id IS NULL OR
                        a.category_id IN (
                            SELECT category_id
                            FROM nurse_category_preferences
                            WHERE nurse_id = ? AND is_enabled = TRUE
                        )
                        OR (a.type = \'nursing\' AND a.assigned_nurse_id = ?)
                        OR (a.type = \'nursing\' AND a.created_by = ? AND a.created_by_role = \'nurse\')
                    )');
                $this->params[] = $userId;
                $this->params[] = $userId;
                $this->params[] = $userId;
            }
        }
    }

    private function appendNurseDefaultMesSoinsScope(string $userId): void
    {
        $this->appendWhere(" AND (
                    (a.type = 'nursing' AND (
                        a.assigned_nurse_id = ?
                        OR (
                            a.created_by = ?
                            AND (a.assigned_nurse_id IS NULL OR a.assigned_nurse_id = ?)
                            AND NOT (
                                a.status = 'pending'
                                AND a.assigned_nurse_id IS NULL
                                AND EXISTS (
                                    SELECT 1 FROM appointment_status_updates u
                                    WHERE u.appointment_id = a.id AND u.actor_id = ? AND u.note LIKE ?
                                )
                            )
                        )
                    ))
                    OR (a.type = 'blood_test' AND a.created_by = ?)
                )");
        $this->params[] = $userId;
        $this->params[] = $userId;
        $this->params[] = $userId;
        $this->params[] = $userId;
        $this->params[] = '%redispatch%';
        $this->params[] = $userId;
    }

    private function applyLabScope(string $userId, string $role): void
    {
        $teamIds = LabTeamAccess::teamMemberIds($this->db, $userId, $role);
        if (empty($teamIds)) {
            $teamIds = [$userId];
        }
        $placeholders = implode(',', array_fill(0, count($teamIds), '?'));
        $this->appendWhere(" AND a.type = 'blood_test' AND (a.assigned_lab_id IN ($placeholders) OR (a.assigned_lab_id IS NULL AND a.status = 'pending' AND EXISTS (SELECT 1 FROM appointment_offers o WHERE o.appointment_id = a.id AND o.profile_id IN ($placeholders))))");
        $this->params = array_merge($this->params, $teamIds, $teamIds);

        $fl = !empty($_GET['filter_assigned_lab_id']) ? trim((string) $_GET['filter_assigned_lab_id']) : '';
        if ($fl !== '' && in_array($fl, $teamIds, true)) {
            $this->appendWhere(' AND a.assigned_lab_id = ?');
            $this->params[] = $fl;
        }
        $fa = !empty($_GET['filter_assigned_to']) ? trim((string) $_GET['filter_assigned_to']) : '';
        if ($fa !== '') {
            $chkPrel = $this->db->prepare("SELECT 1 FROM profiles WHERE id = ? AND lab_id IN ($placeholders) AND role = 'preleveur' LIMIT 1");
            $chkPrel->execute(array_merge([$fa], $teamIds));
            if ($chkPrel->fetchColumn()) {
                $this->appendWhere(' AND a.assigned_to = ?');
                $this->params[] = $fa;
            }
        }

        $labIdForPrefs = $userId;
        if ($role === 'subaccount') {
            $subLabStmt = $this->db->prepare('SELECT lab_id FROM profiles WHERE id = ? LIMIT 1');
            $subLabStmt->execute([$userId]);
            $subLabRow = $subLabStmt->fetch(PDO::FETCH_ASSOC);
            if ($subLabRow && !empty($subLabRow['lab_id'])) {
                $labIdForPrefs = (string) $subLabRow['lab_id'];
            }
        }

        $labCatTable = $this->db->query("SHOW TABLES LIKE 'lab_category_preferences'");
        if ($labCatTable && $labCatTable->rowCount() > 0) {
            $labCatStmt = $this->db->prepare('SELECT COUNT(*) FROM lab_category_preferences WHERE lab_id = ? AND is_enabled = TRUE');
            $labCatStmt->execute([$labIdForPrefs]);
            $labCatCount = (int) $labCatStmt->fetchColumn();
            if ($labCatCount > 0) {
                $this->appendWhere(' AND (
                        a.category_id IS NULL OR
                        a.category_id IN (
                            SELECT category_id FROM lab_category_preferences
                            WHERE lab_id = ? AND is_enabled = TRUE
                        )
                        OR a.assigned_lab_id IS NOT NULL
                    )');
                $this->params[] = $labIdForPrefs;
            }
        }
    }

    private function applyPreleveurScope(string $userId): void
    {
        if (trim((string) ($_GET['preleveur_segment'] ?? '')) === 'mes_demandes') {
            $this->appendWhere(" AND a.type = 'blood_test' AND a.created_by = ? AND a.status = 'pending'");
            $this->params[] = $userId;
            return;
        }
        $assignedOnly = !empty($_GET['assigned_only'])
            && in_array(strtolower(trim((string) $_GET['assigned_only'])), ['1', 'true', 'yes'], true);
        if ($assignedOnly) {
            $this->appendWhere(' AND a.assigned_to = ? AND a.type = \'blood_test\'');
            $this->params[] = $userId;
        } else {
            $prelLabStmt = $this->db->prepare("SELECT lab_id FROM profiles WHERE id = ? AND role = 'preleveur' LIMIT 1");
            $prelLabStmt->execute([$userId]);
            $prelLabId = (string) ($prelLabStmt->fetch(PDO::FETCH_ASSOC)['lab_id'] ?? '');
            if ($prelLabId !== '') {
                $this->appendWhere(' AND a.type = "blood_test" AND (
                        a.assigned_to = ?
                        OR (
                            a.status = "pending"
                            AND (a.assigned_to IS NULL OR a.assigned_to = "")
                            AND a.assigned_lab_id = ?
                        )
                        OR (
                            a.status = "pending"
                            AND EXISTS (
                                SELECT 1 FROM appointment_offers o
                                WHERE o.appointment_id = a.id AND o.profile_id = ?
                            )
                        )
                    )');
                $this->params[] = $userId;
                $this->params[] = $prelLabId;
                $this->params[] = $userId;
            } else {
                $this->appendWhere(' AND a.assigned_to = ? AND a.type = "blood_test"');
                $this->params[] = $userId;
            }
        }
    }

    private function applyProScope(string $userId): void
    {
        $this->appendWhere(' AND (a.created_by = ? OR a.assigned_pro_id = ?)');
        $this->params[] = $userId;
        $this->params[] = $userId;
    }
}

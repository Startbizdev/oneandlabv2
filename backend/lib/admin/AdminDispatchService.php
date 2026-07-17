<?php

declare(strict_types=1);

require_once __DIR__ . '/../AppointmentListPayload.php';
require_once __DIR__ . '/../../models/Appointment.php';
require_once __DIR__ . '/../../models/User.php';

/**
 * Lecture agrégée pour le tableau de bord dispatch admin (liste + détail 360°).
 */
final class AdminDispatchService
{
    private PDO $db;
    private Appointment $appointmentModel;
    private bool $eventsTableExists;
    private bool $dispatchModeColumnExists;

    public function __construct(?PDO $db = null)
    {
        if ($db !== null) {
            $this->db = $db;
        } else {
            $config = require __DIR__ . '/../../config/database.php';
            $dsn = sprintf(
                'mysql:host=%s;port=%d;dbname=%s;charset=%s',
                $config['host'],
                $config['port'],
                $config['database'],
                $config['charset']
            );
            $this->db = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);
        }
        $this->appointmentModel = new Appointment();
        $this->eventsTableExists = $this->tableExists('appointment_dispatch_events');
        $this->dispatchModeColumnExists = $this->columnExists('appointments', 'dispatch_mode');
    }

    /**
     * @param array<string, mixed> $filters
     * @return array{kpis: array<string, mixed>, rows: list<array<string, mixed>>, pagination: array<string, int>}
     */
    public function listDashboard(array $filters, string $adminId, int $page = 1, int $limit = 25): array
    {
        $page = max(1, $page);
        $limit = min(100, max(1, $limit));
        $offset = ($page - 1) * $limit;

        $where = ['1=1'];
        $params = [];

        if (!empty($filters['type']) && in_array($filters['type'], ['nursing', 'blood_test'], true)) {
            $where[] = 'a.type = ?';
            $params[] = $filters['type'];
        }
        if (!empty($filters['status'])) {
            $where[] = 'a.status = ?';
            $params[] = $filters['status'];
        }
        if ($this->dispatchModeColumnExists && !empty($filters['dispatch_mode'])) {
            $where[] = 'a.dispatch_mode = ?';
            $params[] = $filters['dispatch_mode'];
        }
        if (!empty($filters['date_from'])) {
            $where[] = 'a.scheduled_at >= ?';
            $params[] = $filters['date_from'] . ' 00:00:00';
        }
        if (!empty($filters['date_to'])) {
            $where[] = 'a.scheduled_at <= ?';
            $params[] = $filters['date_to'] . ' 23:59:59';
        }
        if (!empty($filters['created_from'])) {
            $where[] = 'a.created_at >= ?';
            $params[] = $filters['created_from'] . ' 00:00:00';
        }
        if (!empty($filters['created_to'])) {
            $where[] = 'a.created_at <= ?';
            $params[] = $filters['created_to'] . ' 23:59:59';
        }
        if (!empty($filters['search'])) {
            $search = trim((string) $filters['search']);
            if (preg_match('/^[0-9a-f-]{8,}$/i', $search)) {
                $where[] = '(a.id LIKE ? OR a.patient_id LIKE ? OR a.created_by LIKE ?)';
                $like = '%' . $search . '%';
                $params[] = $like;
                $params[] = $like;
                $params[] = $like;
            }
        }

        $whereSql = implode(' AND ', $where);

        $offersSub = '(SELECT COUNT(*) FROM appointment_offers o WHERE o.appointment_id = a.id)';
        $lastEventSub = $this->eventsTableExists
            ? '(SELECT MAX(e.created_at) FROM appointment_dispatch_events e WHERE e.appointment_id = a.id)'
            : 'NULL';
        $redispatchSub = $this->eventsTableExists
            ? "(SELECT COUNT(*) FROM appointment_dispatch_events e WHERE e.appointment_id = a.id AND e.event_type = 'redispatch')"
            : '0';

        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM appointments a WHERE {$whereSql}");
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        $dispatchModeCol = $this->dispatchModeColumnExists ? 'a.dispatch_mode,' : 'NULL AS dispatch_mode,';

        $sql = "
            SELECT a.id, a.type, a.status, a.scheduled_at, a.created_at, a.updated_at,
                   a.patient_id, a.created_by, a.created_by_role,
                   a.assigned_nurse_id, a.assigned_lab_id, a.assigned_to, a.assigned_pro_id,
                   {$dispatchModeCol}
                   a.form_data_encrypted, a.form_data_dek,
                   a.address_encrypted, a.address_dek,
                   a.started_at, a.completed_at, a.nurse_share_released_at,
                   {$offersSub} AS pending_offers_count,
                   {$lastEventSub} AS last_event_at,
                   {$redispatchSub} AS redispatch_count
            FROM appointments a
            WHERE {$whereSql}
            ORDER BY COALESCE({$lastEventSub}, a.updated_at, a.created_at) DESC
            LIMIT {$limit} OFFSET {$offset}
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $decrypted = AppointmentListPayload::decryptRowsForList(
            $this->appointmentModel,
            $rows,
            $adminId,
            'super_admin'
        );
        $hasMergedColumn = $this->columnExists('appointments', 'merged_into_appointment_id');
        $enriched = AppointmentListPayload::enrichForListCards(
            $this->db,
            $this->appointmentModel,
            $decrypted,
            $hasMergedColumn
        );

        $userIds = [];
        foreach ($enriched as &$row) {
            if (!empty($row['created_by'])) {
                $userIds[] = (string) $row['created_by'];
            }
            if (!empty($row['assigned_pro_id'])) {
                $userIds[] = (string) $row['assigned_pro_id'];
            }
            $row['has_redispatch'] = ((int) ($row['redispatch_count'] ?? 0)) > 0;
            unset($row['redispatch_count']);
        }
        unset($row);

        if ($userIds !== []) {
            $userModel = new User();
            $names = $userModel->getDisplayNamesByIds(array_values(array_unique($userIds)));
            $roles = $this->fetchRolesByIds(array_values(array_unique($userIds)));
            foreach ($enriched as &$row) {
                $creatorId = (string) ($row['created_by'] ?? '');
                $proId = (string) ($row['assigned_pro_id'] ?? '');
                $row['created_by_display_name'] = $names[$creatorId] ?? null;
                $row['assigned_pro_display_name'] = $names[$proId] ?? null;
                $row['created_by_profile_role'] = $roles[$creatorId] ?? ($row['created_by_role'] ?? null);
            }
            unset($row);
        }

        $listRows = [];
        foreach ($enriched as $row) {
            $listRows[] = $this->trimListRow($row);
        }

        return [
            'kpis' => $this->computeKpis(),
            'rows' => $listRows,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'total_pages' => $total > 0 ? (int) ceil($total / $limit) : 0,
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function getDetail(string $appointmentId, string $adminId): array
    {
        $stmt = $this->db->prepare('SELECT * FROM appointments WHERE id = ? LIMIT 1');
        $stmt->execute([$appointmentId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            throw new RuntimeException('Rendez-vous introuvable');
        }

        $decrypted = $this->appointmentModel->getById($appointmentId, $adminId, 'super_admin');
        if (!$decrypted) {
            throw new RuntimeException('Rendez-vous introuvable');
        }

        $userModel = new User();
        $profileIds = array_values(array_filter([
            $decrypted['patient_id'] ?? null,
            $decrypted['created_by'] ?? null,
            $decrypted['assigned_pro_id'] ?? null,
            $decrypted['assigned_nurse_id'] ?? null,
            $decrypted['assigned_lab_id'] ?? null,
            $decrypted['assigned_to'] ?? null,
        ]));
        $displayNames = $profileIds !== [] ? $userModel->getDisplayNamesByIds($profileIds) : [];
        $roles = $profileIds !== [] ? $this->fetchRolesByIds($profileIds) : [];

        $identity = [
            'appointment_id' => $appointmentId,
            'type' => $decrypted['type'] ?? null,
            'status' => $decrypted['status'] ?? null,
            'dispatch_mode' => $decrypted['dispatch_mode'] ?? ($row['dispatch_mode'] ?? null),
            'scheduled_at' => $decrypted['scheduled_at'] ?? null,
            'started_at' => $decrypted['started_at'] ?? null,
            'completed_at' => $decrypted['completed_at'] ?? null,
            'nurse_share_released_at' => $decrypted['nurse_share_released_at'] ?? null,
            'created_at' => $decrypted['created_at'] ?? null,
            'patient' => $this->actorBlock($decrypted['patient_id'] ?? null, $displayNames, $roles, 'patient'),
            'creator' => $this->actorBlock($decrypted['created_by'] ?? null, $displayNames, $roles, (string) ($decrypted['created_by_role'] ?? '')),
            'assigned_pro' => $this->actorBlock($decrypted['assigned_pro_id'] ?? null, $displayNames, $roles),
            'assigned_nurse' => $this->actorBlock($decrypted['assigned_nurse_id'] ?? null, $displayNames, $roles, 'nurse'),
            'assigned_lab' => $this->actorBlock($decrypted['assigned_lab_id'] ?? null, $displayNames, $roles, 'lab'),
            'assigned_preleveur' => $this->actorBlock($decrypted['assigned_to'] ?? null, $displayNames, $roles, 'preleveur'),
            'creneau' => $this->extractCreneau($decrypted),
        ];

        $activeOffers = $this->fetchActiveOffers($appointmentId, $displayNames, $roles);
        $dispatchWaves = $this->fetchDispatchWaves($appointmentId, $displayNames, $roles);
        $shareTokens = $this->fetchShareTokens($appointmentId);
        $timeline = $this->buildMergedTimeline($appointmentId, $displayNames, $roles);
        $hasDispatchEvents = $this->eventsTableExists && $this->countEventsForAppointment($appointmentId) > 0;

        return [
            'identity' => $identity,
            'active_offers' => $activeOffers,
            'dispatch_waves' => $dispatchWaves,
            'share_tokens' => $shareTokens,
            'timeline' => $timeline,
            'history_incomplete' => !$hasDispatchEvents,
            'history_incomplete_message' => !$hasDispatchEvents
                ? 'Historique des vagues dispatch avant l\'activation du journal peut être incomplet.'
                : null,
        ];
    }

    /**
     * @return array<string, int|float|null>
     */
    private function computeKpis(): array
    {
        $pendingDispatch = 0;
        try {
            $stmt = $this->db->query("
                SELECT COUNT(DISTINCT a.id) FROM appointments a
                INNER JOIN appointment_offers o ON o.appointment_id = a.id
                WHERE a.status = 'pending'
            ");
            $pendingDispatch = (int) $stmt->fetchColumn();
        } catch (Throwable $e) {
            // table offers peut manquer
        }

        $redispatch24h = 0;
        $redispatch7d = 0;
        $externalInvites7d = 0;
        $medianAcceptMinutes = null;

        if ($this->eventsTableExists) {
            $stmt = $this->db->query("
                SELECT COUNT(*) FROM appointment_dispatch_events
                WHERE event_type = 'redispatch' AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            ");
            $redispatch24h = (int) $stmt->fetchColumn();

            $stmt = $this->db->query("
                SELECT COUNT(*) FROM appointment_dispatch_events
                WHERE event_type = 'redispatch' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            ");
            $redispatch7d = (int) $stmt->fetchColumn();

            $stmt = $this->db->query("
                SELECT COUNT(*) FROM appointment_dispatch_events
                WHERE event_type IN ('external_nurse_invite', 'nurse_share_link_created')
                AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            ");
            $externalInvites7d = (int) $stmt->fetchColumn();

            $stmt = $this->db->query("
                SELECT TIMESTAMPDIFF(MINUTE, c.created_at, a.created_at) AS mins
                FROM appointment_dispatch_events c
                INNER JOIN appointment_dispatch_events a
                    ON a.appointment_id = c.appointment_id
                    AND a.event_type IN ('offer_accepted', 'offer_accepted_via_share_token')
                    AND a.created_at > c.created_at
                WHERE c.event_type = 'created'
                  AND c.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                ORDER BY c.created_at DESC
                LIMIT 200
            ");
            $mins = [];
            while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
                if (isset($r['mins']) && is_numeric($r['mins'])) {
                    $mins[] = (int) $r['mins'];
                }
            }
            if ($mins !== []) {
                sort($mins);
                $mid = (int) floor(count($mins) / 2);
                $medianAcceptMinutes = count($mins) % 2 === 0
                    ? (int) round(($mins[$mid - 1] + $mins[$mid]) / 2)
                    : $mins[$mid];
            }
        }

        return [
            'pending_dispatch' => $pendingDispatch,
            'redispatch_24h' => $redispatch24h,
            'redispatch_7d' => $redispatch7d,
            'external_invites_7d' => $externalInvites7d,
            'median_accept_minutes' => $medianAcceptMinutes,
        ];
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private function trimListRow(array $row): array
    {
        $patientName = null;
        if (!empty($row['form_data']) && is_array($row['form_data'])) {
            $fn = trim((string) ($row['form_data']['first_name'] ?? ''));
            $ln = trim((string) ($row['form_data']['last_name'] ?? ''));
            $patientName = trim($fn . ' ' . $ln) ?: null;
        }

        return [
            'id' => $row['id'] ?? null,
            'type' => $row['type'] ?? null,
            'status' => $row['status'] ?? null,
            'scheduled_at' => $row['scheduled_at'] ?? null,
            'created_at' => $row['created_at'] ?? null,
            'last_event_at' => $row['last_event_at'] ?? null,
            'dispatch_mode' => $row['dispatch_mode'] ?? null,
            'pending_offers_count' => (int) ($row['pending_offers_count'] ?? 0),
            'has_redispatch' => !empty($row['has_redispatch']),
            'patient_id' => $row['patient_id'] ?? null,
            'patient_display_name' => $patientName,
            'created_by' => $row['created_by'] ?? null,
            'created_by_role' => $row['created_by_role'] ?? null,
            'created_by_display_name' => $row['created_by_display_name'] ?? null,
            'assigned_pro_id' => $row['assigned_pro_id'] ?? null,
            'assigned_pro_display_name' => $row['assigned_pro_display_name'] ?? null,
            'assigned_nurse_id' => $row['assigned_nurse_id'] ?? null,
            'assigned_nurse_display_name' => $row['assigned_nurse_display_name'] ?? null,
            'assigned_lab_id' => $row['assigned_lab_id'] ?? null,
            'assigned_lab_display_name' => $row['assigned_lab_display_name'] ?? null,
            'assigned_to' => $row['assigned_to'] ?? null,
            'assigned_to_display_name' => $row['assigned_to_display_name'] ?? null,
            'creneau' => $this->extractCreneau($row),
        ];
    }

    /**
     * @param array<string, string|null> $displayNames
     * @param array<string, string|null> $roles
     * @return array<string, mixed>|null
     */
    private function actorBlock(?string $id, array $displayNames, array $roles, ?string $fallbackRole = null): ?array
    {
        if ($id === null || trim($id) === '') {
            return null;
        }
        return [
            'id' => $id,
            'display_name' => $displayNames[$id] ?? null,
            'role' => $roles[$id] ?? $fallbackRole,
        ];
    }

    /**
     * @param array<string, mixed> $appointment
     */
    private function extractCreneau(array $appointment): ?string
    {
        $fd = $appointment['form_data'] ?? [];
        if (!is_array($fd)) {
            return null;
        }
        $slot = $fd['passage_time_slot'] ?? $fd['availability'] ?? null;
        if (is_string($slot) && $slot !== '') {
            $labels = [
                'morning' => 'Matin',
                'noon' => 'Midi',
                'afternoon' => 'Après-midi',
                'evening' => 'Soir',
                'night' => 'Nuit',
                'custom' => 'Horaire personnalisé',
            ];
            if (isset($labels[$slot])) {
                return $labels[$slot];
            }
            if (!empty($fd['custom_time'])) {
                return (string) $fd['custom_time'];
            }
            return $slot;
        }
        if (!empty($fd['availability_start']) && !empty($fd['availability_end'])) {
            return $fd['availability_start'] . ' – ' . $fd['availability_end'];
        }
        return null;
    }

    /**
     * @param array<string, string|null> $displayNames
     * @param array<string, string|null> $roles
     * @return list<array<string, mixed>>
     */
    private function fetchActiveOffers(string $appointmentId, array $displayNames, array $roles): array
    {
        try {
            $stmt = $this->db->prepare('
                SELECT o.profile_id, o.created_at, p.role
                FROM appointment_offers o
                INNER JOIN profiles p ON p.id = o.profile_id
                WHERE o.appointment_id = ?
                ORDER BY o.created_at ASC
            ');
            $stmt->execute([$appointmentId]);
            $out = [];
            while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $pid = (string) $r['profile_id'];
                $out[] = [
                    'profile_id' => $pid,
                    'role' => $r['role'] ?? $roles[$pid] ?? null,
                    'display_name' => $displayNames[$pid] ?? null,
                    'offered_at' => $r['created_at'],
                ];
            }
            return $out;
        } catch (Throwable $e) {
            return [];
        }
    }

    /**
     * @param array<string, string|null> $displayNames
     * @param array<string, string|null> $roles
     * @return list<array<string, mixed>>
     */
    private function fetchDispatchWaves(string $appointmentId, array $displayNames, array $roles): array
    {
        if (!$this->eventsTableExists) {
            return [];
        }
        $stmt = $this->db->prepare("
            SELECT id, event_type, actor_id, actor_role, metadata, created_at
            FROM appointment_dispatch_events
            WHERE appointment_id = ?
              AND event_type IN ('zone_dispatch', 'redispatch', 'nurse_share_redispatch_zone')
            ORDER BY created_at ASC
        ");
        $stmt->execute([$appointmentId]);
        $waves = [];
        while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $meta = [];
            if (!empty($r['metadata'])) {
                $decoded = json_decode((string) $r['metadata'], true);
                if (is_array($decoded)) {
                    $meta = $decoded;
                }
            }
            $recipients = [];
            $profileEntries = $meta['professionals'] ?? $meta['profile_ids'] ?? [];
            if (is_array($profileEntries)) {
                foreach ($profileEntries as $entry) {
                    if (is_array($entry)) {
                        $pid = (string) ($entry['id'] ?? $entry['profile_id'] ?? '');
                        $recipients[] = [
                            'profile_id' => $pid,
                            'role' => $entry['role'] ?? $roles[$pid] ?? null,
                            'display_name' => $displayNames[$pid] ?? null,
                        ];
                    } elseif (is_string($entry) && $entry !== '') {
                        $recipients[] = [
                            'profile_id' => $entry,
                            'role' => $roles[$entry] ?? null,
                            'display_name' => $displayNames[$entry] ?? null,
                        ];
                    }
                }
            }
            $actorId = (string) ($r['actor_id'] ?? '');
            $waves[] = [
                'event_type' => $r['event_type'],
                'created_at' => $r['created_at'],
                'actor' => $actorId !== '' ? [
                    'id' => $actorId,
                    'display_name' => $displayNames[$actorId] ?? null,
                    'role' => $r['actor_role'] ?? $roles[$actorId] ?? null,
                ] : null,
                'recipient_count' => count($recipients),
                'recipients' => $recipients,
            ];
        }
        return $waves;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function fetchShareTokens(string $appointmentId): array
    {
        if (!$this->tableExists('appointment_share_tokens')) {
            return [];
        }
        $stmt = $this->db->prepare('
            SELECT id, created_at, expires_at
            FROM appointment_share_tokens
            WHERE appointment_id = ?
            ORDER BY created_at DESC
        ');
        $stmt->execute([$appointmentId]);
        $out = [];
        while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $out[] = [
                'token_id' => $r['id'],
                'created_at' => $r['created_at'],
                'expires_at' => $r['expires_at'],
            ];
        }
        return $out;
    }

    /**
     * @param array<string, string|null> $displayNames
     * @param array<string, string|null> $roles
     * @return list<array<string, mixed>>
     */
    private function buildMergedTimeline(string $appointmentId, array $displayNames, array $roles): array
    {
        $items = [];

        if ($this->eventsTableExists) {
            $stmt = $this->db->prepare('
                SELECT id, event_type, actor_id, actor_role, target_profile_id, metadata, created_at
                FROM appointment_dispatch_events
                WHERE appointment_id = ?
            ');
            $stmt->execute([$appointmentId]);
            while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $actorId = (string) ($r['actor_id'] ?? '');
                $targetId = (string) ($r['target_profile_id'] ?? '');
                $meta = [];
                if (!empty($r['metadata'])) {
                    $decoded = json_decode((string) $r['metadata'], true);
                    if (is_array($decoded)) {
                        $meta = $decoded;
                    }
                }
                $items[] = [
                    'source' => 'dispatch_event',
                    'id' => $r['id'],
                    'event_type' => $r['event_type'],
                    'created_at' => $r['created_at'],
                    'actor_id' => $actorId !== '' ? $actorId : null,
                    'actor_display_name' => $actorId !== '' ? ($displayNames[$actorId] ?? null) : null,
                    'actor_role' => $r['actor_role'] ?? ($actorId !== '' ? ($roles[$actorId] ?? null) : null),
                    'target_id' => $targetId !== '' ? $targetId : null,
                    'target_display_name' => $targetId !== '' ? ($displayNames[$targetId] ?? null) : null,
                    'target_role' => $targetId !== '' ? ($roles[$targetId] ?? null) : null,
                    'metadata' => $meta,
                    'label' => $this->eventLabel((string) $r['event_type'], $meta),
                ];
            }
        }

        $stmt = $this->db->prepare('
            SELECT id, status, actor_id, actor_role, note, metadata, created_at
            FROM appointment_status_updates
            WHERE appointment_id = ?
        ');
        $stmt->execute([$appointmentId]);
        while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $actorId = (string) ($r['actor_id'] ?? '');
            $meta = [];
            if (!empty($r['metadata'])) {
                $decoded = json_decode((string) $r['metadata'], true);
                if (is_array($decoded)) {
                    $meta = $decoded;
                }
            }
            $items[] = [
                'source' => 'status_update',
                'id' => $r['id'],
                'event_type' => 'status_' . ($r['status'] ?? 'unknown'),
                'created_at' => $r['created_at'],
                'actor_id' => $actorId !== '' ? $actorId : null,
                'actor_display_name' => $actorId !== '' ? ($displayNames[$actorId] ?? null) : null,
                'actor_role' => $r['actor_role'] ?? ($actorId !== '' ? ($roles[$actorId] ?? null) : null),
                'target_id' => null,
                'target_display_name' => null,
                'target_role' => null,
                'metadata' => array_merge($meta, ['note' => $r['note'] ?? null, 'status' => $r['status'] ?? null]),
                'label' => $this->statusLabel((string) ($r['status'] ?? ''), (string) ($r['note'] ?? ''), $meta),
            ];
        }

        try {
            $stmt = $this->db->prepare("
                SELECT id, user_id, role, action, details, created_at
                FROM access_logs
                WHERE resource_type = 'appointment' AND resource_id = ?
            ");
            $stmt->execute([$appointmentId]);
            while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $actorId = (string) ($r['user_id'] ?? '');
                $details = [];
                if (!empty($r['details'])) {
                    $decoded = json_decode((string) $r['details'], true);
                    if (is_array($decoded)) {
                        $details = $decoded;
                    }
                }
                $action = (string) ($r['action'] ?? '');
                $detailAction = (string) ($details['action'] ?? '');
                $items[] = [
                    'source' => 'access_log',
                    'id' => $r['id'],
                    'event_type' => $detailAction !== '' ? $detailAction : $action,
                    'created_at' => $r['created_at'],
                    'actor_id' => $actorId !== '' ? $actorId : null,
                    'actor_display_name' => $actorId !== '' ? ($displayNames[$actorId] ?? null) : null,
                    'actor_role' => $r['role'] ?? ($actorId !== '' ? ($roles[$actorId] ?? null) : null),
                    'target_id' => null,
                    'target_display_name' => null,
                    'target_role' => null,
                    'metadata' => $details,
                    'label' => $this->accessLogLabel($action, $detailAction, $details),
                ];
            }
        } catch (Throwable $e) {
            // access_logs peut manquer
        }

        usort($items, static function (array $a, array $b): int {
            return strcmp((string) ($b['created_at'] ?? ''), (string) ($a['created_at'] ?? ''));
        });

        return $items;
    }

    /**
     * @param array<string, mixed> $meta
     */
    private function eventLabel(string $eventType, array $meta): string
    {
        $labels = [
            'created' => 'Création du rendez-vous',
            'zone_dispatch' => 'Envoi zone géographique',
            'redispatch' => 'Nouvelle diffusion',
            'external_nurse_invite' => 'Invitation SMS infirmier externe',
            'direct_assign' => 'Assignation directe',
            'offer_declined' => 'Proposition refusée',
            'offer_accepted' => 'Proposition acceptée',
            'offer_accepted_via_share_token' => 'Accepté via lien de partage',
            'nurse_share_release' => 'Partage lien — créneau libéré',
            'nurse_share_link_created' => 'Lien de partage généré',
            'nurse_share_redispatch_zone' => 'Nouvelle diffusion zone après partage',
            'reassign' => 'Réassignation',
        ];
        $base = $labels[$eventType] ?? $eventType;
        if ($eventType === 'zone_dispatch' || $eventType === 'redispatch') {
            $count = (int) ($meta['recipient_count'] ?? 0);
            if ($count > 0) {
                return $base . " ({$count} professionnel(s))";
            }
        }
        return $base;
    }

    /**
     * @param array<string, mixed> $meta
     */
    private function statusLabel(string $status, string $note, array $meta): string
    {
        $statusFr = $this->statusToFrench($status);
        if (!empty($meta['redispatch'])) {
            return 'Nouvelle diffusion (changement de statut)';
        }
        if ($note !== '') {
            return "Statut → {$statusFr} — {$note}";
        }
        return "Statut → {$statusFr}";
    }

    private function statusToFrench(string $status): string
    {
        $map = [
            'pending' => 'En attente',
            'confirmed' => 'Confirmé',
            'planned' => 'Planifié',
            'inProgress' => 'En cours',
            'completed' => 'Terminé',
            'canceled' => 'Annulé',
            'expired' => 'Expiré',
            'refused' => 'Refusé',
        ];
        return $map[$status] ?? $status;
    }

    /**
     * @param array<string, mixed> $details
     */
    private function accessLogLabel(string $action, string $detailAction, array $details): string
    {
        $key = $detailAction !== '' ? $detailAction : $action;
        $labels = [
            'redispatch' => 'Nouvelle diffusion (journal)',
            'decline_offer' => 'Refus de proposition',
            'nurse_share_redispatch_zone' => 'Nouvelle diffusion zone après partage',
            'create' => 'Création (journal)',
            'update' => 'Mise à jour',
        ];
        $base = $labels[$key] ?? $key;
        if (!empty($details['old_status']) && !empty($details['new_status'])) {
            $old = $this->statusToFrench((string) $details['old_status']);
            $new = $this->statusToFrench((string) $details['new_status']);
            return $base . ' : ' . $old . ' → ' . $new;
        }
        return $base;
    }

    /**
     * @param list<string> $ids
     * @return array<string, string>
     */
    private function fetchRolesByIds(array $ids): array
    {
        if ($ids === []) {
            return [];
        }
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $this->db->prepare("SELECT id, role FROM profiles WHERE id IN ({$placeholders})");
        $stmt->execute($ids);
        $out = [];
        while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $out[(string) $r['id']] = (string) ($r['role'] ?? '');
        }
        return $out;
    }

    private function countEventsForAppointment(string $appointmentId): int
    {
        $stmt = $this->db->prepare('SELECT COUNT(*) FROM appointment_dispatch_events WHERE appointment_id = ?');
        $stmt->execute([$appointmentId]);
        return (int) $stmt->fetchColumn();
    }

    private function tableExists(string $table): bool
    {
        try {
            $stmt = $this->db->query('SHOW TABLES LIKE ' . $this->db->quote($table));
            return $stmt && $stmt->rowCount() > 0;
        } catch (Throwable $e) {
            return false;
        }
    }

    private function columnExists(string $table, string $column): bool
    {
        try {
            $stmt = $this->db->prepare('
                SELECT COUNT(*) FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
            ');
            $stmt->execute([$table, $column]);
            return ((int) $stmt->fetchColumn()) > 0;
        } catch (Throwable $e) {
            return false;
        }
    }
}

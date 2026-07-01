<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/../NotificationService.php';

final class HealthMetricTypes
{
    public const ALL = [
        'weight', 'height', 'heart_rate', 'steps', 'active_energy',
        'distance', 'activity_minutes', 'sleep_hours',
    ];

    public static function isValid(string $type): bool
    {
        return in_array($type, self::ALL, true);
    }

    public static function defaultUnit(string $type): string
    {
        return match ($type) {
            'weight' => 'kg',
            'height' => 'cm',
            'heart_rate' => 'bpm',
            'steps' => 'count',
            'active_energy' => 'kcal',
            'distance' => 'km',
            'activity_minutes' => 'min',
            'sleep_hours' => 'h',
            default => 'unit',
        };
    }
}

final class HealthService
{
    private PDO $db;
    private ?NotificationService $notifications;

    public function __construct(?PDO $db = null, ?NotificationService $notifications = null)
    {
        $this->db = $db ?? health_db();
        $this->notifications = $notifications;
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function ingestBatch(string $patientId, array $input): array
    {
        $platform = strtolower((string) ($input['platform'] ?? ''));
        if (!in_array($platform, ['ios', 'android'], true)) {
            throw new InvalidArgumentException('platform invalide (ios|android)');
        }

        $sourceKind = $platform === 'ios' ? 'apple_health' : 'health_connect';
        $externalSourceId = trim((string) ($input['external_source_id'] ?? $sourceKind));
        if ($externalSourceId === '') {
            $externalSourceId = $sourceKind;
        }

        $sourceId = $this->upsertSource($patientId, $platform, $sourceKind, $externalSourceId, $input['display_name'] ?? null);
        $syncId = health_uuid();
        $startedAt = (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format('Y-m-d H:i:s');

        $stmtSync = $this->db->prepare('
            INSERT INTO health_syncs (id, source_id, patient_id, status, started_at)
            VALUES (?, ?, ?, \'running\', ?)
        ');
        $stmtSync->execute([$syncId, $sourceId, $patientId, $startedAt]);

        if (!empty($input['permissions']) && is_array($input['permissions'])) {
            $this->recordPermissions($sourceId, $patientId, $input['permissions']);
        }

        $metrics = $input['metrics'] ?? [];
        if (!is_array($metrics)) {
            throw new InvalidArgumentException('metrics doit être un tableau');
        }

        $inserted = 0;
        $skipped = 0;
        $connectedDeviceId = isset($input['connected_device_id']) ? (string) $input['connected_device_id'] : null;
        if ($connectedDeviceId === '') {
            $connectedDeviceId = null;
        }

        $stmtInsert = $this->db->prepare('
            INSERT IGNORE INTO health_metrics (
                id, patient_id, source_id, connected_device_id, metric_type,
                value, unit, recorded_at, external_id, metadata_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ');

        foreach ($metrics as $row) {
            if (!is_array($row)) {
                continue;
            }
            $metricType = (string) ($row['metric_type'] ?? '');
            if (!HealthMetricTypes::isValid($metricType)) {
                continue;
            }
            $externalId = trim((string) ($row['external_id'] ?? ''));
            if ($externalId === '') {
                continue;
            }
            $recordedAt = $this->normalizeDateTime((string) ($row['recorded_at'] ?? ''));
            if ($recordedAt === null) {
                continue;
            }
            $value = $row['value'] ?? null;
            if (!is_numeric($value)) {
                continue;
            }
            $unit = trim((string) ($row['unit'] ?? HealthMetricTypes::defaultUnit($metricType)));
            if ($unit === '') {
                $unit = HealthMetricTypes::defaultUnit($metricType);
            }
            $meta = isset($row['metadata']) && is_array($row['metadata']) ? json_encode($row['metadata']) : null;

            $stmtInsert->execute([
                health_uuid(),
                $patientId,
                $sourceId,
                $connectedDeviceId,
                $metricType,
                (float) $value,
                $unit,
                $recordedAt,
                $externalId,
                $meta,
            ]);
            if ($stmtInsert->rowCount() > 0) {
                $inserted++;
            } else {
                $skipped++;
            }
        }

        $finishedAt = (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format('Y-m-d H:i:s');
        $stmtDone = $this->db->prepare('
            UPDATE health_syncs
            SET status = \'completed\', finished_at = ?, metrics_count = ?
            WHERE id = ?
        ');
        $stmtDone->execute([$finishedAt, $inserted, $syncId]);

        $this->notifySyncCompleted($patientId, $inserted);

        return [
            'sync_id' => $syncId,
            'source_id' => $sourceId,
            'inserted' => $inserted,
            'skipped_duplicates' => $skipped,
            'total_received' => count($metrics),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listSources(string $patientId): array
    {
        $stmt = $this->db->prepare('
            SELECT id, platform, source_kind, external_source_id, display_name,
                   revoked_at, created_at, updated_at
            FROM health_sources
            WHERE patient_id = ?
            ORDER BY created_at DESC
        ');
        $stmt->execute([$patientId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return is_array($rows) ? $rows : [];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listSyncs(string $patientId, int $limit = 20): array
    {
        $limit = max(1, min(100, $limit));
        $stmt = $this->db->prepare('
            SELECT s.id, s.source_id, s.status, s.started_at, s.finished_at,
                   s.error_message, s.metrics_count, hs.display_name AS source_name
            FROM health_syncs s
            INNER JOIN health_sources hs ON hs.id = s.source_id
            WHERE s.patient_id = ?
            ORDER BY s.started_at DESC
            LIMIT ' . $limit . '
        ');
        $stmt->execute([$patientId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return is_array($rows) ? $rows : [];
    }

    public function revokeSource(string $patientId, string $sourceId): bool
    {
        $stmt = $this->db->prepare('
            UPDATE health_sources
            SET revoked_at = UTC_TIMESTAMP()
            WHERE id = ? AND patient_id = ? AND revoked_at IS NULL
        ');
        $stmt->execute([$sourceId, $patientId]);

        return $stmt->rowCount() > 0;
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function pairDevice(string $patientId, array $input): array
    {
        $vendor = strtolower((string) ($input['vendor'] ?? 'other'));
        $allowedVendors = [
            'apple_watch', 'garmin', 'fitbit', 'oura', 'withings', 'samsung_watch',
            'connected_scale', 'bp_monitor', 'glucometer', 'apple_health', 'health_connect', 'other',
        ];
        if (!in_array($vendor, $allowedVendors, true)) {
            $vendor = 'other';
        }
        $externalDeviceId = trim((string) ($input['external_device_id'] ?? ''));
        if ($externalDeviceId === '') {
            throw new InvalidArgumentException('external_device_id requis');
        }

        $healthSourceId = null;
        if (!empty($input['health_source_id'])) {
            $healthSourceId = (string) $input['health_source_id'];
            if (!$this->sourceBelongsToPatient($healthSourceId, $patientId)) {
                throw new RuntimeException('Source santé introuvable');
            }
        }

        $stmtFind = $this->db->prepare('
            SELECT id FROM connected_devices
            WHERE patient_id = ? AND external_device_id = ?
            LIMIT 1
        ');
        $stmtFind->execute([$patientId, $externalDeviceId]);
        $existing = $stmtFind->fetch(PDO::FETCH_ASSOC);
        if (is_array($existing) && !empty($existing['id'])) {
            $stmtRevive = $this->db->prepare('
                UPDATE connected_devices
                SET vendor = ?, model = ?, health_source_id = ?, paired_at = UTC_TIMESTAMP(), revoked_at = NULL
                WHERE id = ?
            ');
            $stmtRevive->execute([
                $vendor,
                $input['model'] ?? null,
                $healthSourceId,
                $existing['id'],
            ]);

            return $this->getDevice($patientId, (string) $existing['id']);
        }

        $id = health_uuid();
        $stmt = $this->db->prepare('
            INSERT INTO connected_devices (
                id, patient_id, vendor, model, external_device_id, health_source_id, paired_at
            ) VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())
        ');
        $stmt->execute([
            $id,
            $patientId,
            $vendor,
            $input['model'] ?? null,
            $externalDeviceId,
            $healthSourceId,
        ]);

        return $this->getDevice($patientId, $id);
    }

    public function revokeDevice(string $patientId, string $deviceId): bool
    {
        $stmt = $this->db->prepare('
            UPDATE connected_devices
            SET revoked_at = UTC_TIMESTAMP()
            WHERE id = ? AND patient_id = ? AND revoked_at IS NULL
        ');
        $stmt->execute([$deviceId, $patientId]);

        return $stmt->rowCount() > 0;
    }

    /**
     * @return array<string, mixed>
     */
    public function getDevice(string $patientId, string $deviceId): array
    {
        $stmt = $this->db->prepare('
            SELECT id, patient_id, vendor, model, external_device_id, health_source_id,
                   paired_at, revoked_at, created_at, updated_at
            FROM connected_devices
            WHERE id = ? AND patient_id = ?
            LIMIT 1
        ');
        $stmt->execute([$deviceId, $patientId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!is_array($row)) {
            throw new RuntimeException('Appareil introuvable');
        }

        return $row;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listDevices(string $patientId): array
    {
        $stmt = $this->db->prepare('
            SELECT id, vendor, model, external_device_id, health_source_id, paired_at, revoked_at
            FROM connected_devices
            WHERE patient_id = ? AND revoked_at IS NULL
            ORDER BY paired_at DESC
        ');
        $stmt->execute([$patientId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return is_array($rows) ? $rows : [];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listMetrics(
        string $patientId,
        ?string $metricType = null,
        int $days = 30,
        int $limit = 500
    ): array {
        $days = max(1, min(365, $days));
        $limit = max(1, min(2000, $limit));
        $since = (new DateTimeImmutable("-{$days} days", new DateTimeZone('UTC')))->format('Y-m-d H:i:s');

        $sql = '
            SELECT metric_type, value, unit, recorded_at
            FROM health_metrics
            WHERE patient_id = ? AND recorded_at >= ?
        ';
        $params = [$patientId, $since];
        if ($metricType !== null && $metricType !== '' && HealthMetricTypes::isValid($metricType)) {
            $sql .= ' AND metric_type = ?';
            $params[] = $metricType;
        }
        $sql .= ' ORDER BY recorded_at ASC LIMIT ' . $limit;

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return is_array($rows) ? $rows : [];
    }

    /**
     * @return array<string, mixed>
     */
    public function metricsSummary(string $patientId): array
    {
        $summary = [
            'has_data' => false,
            'last_sync_at' => null,
            'windows' => [
                '7d' => $this->aggregateWindow($patientId, 7),
                '30d' => $this->aggregateWindow($patientId, 30),
            ],
        ];

        $stmt = $this->db->prepare('
            SELECT MAX(finished_at) AS last_sync
            FROM health_syncs
            WHERE patient_id = ? AND status = \'completed\'
        ');
        $stmt->execute([$patientId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (is_array($row) && !empty($row['last_sync'])) {
            $summary['last_sync_at'] = $row['last_sync'];
        }

        foreach (['7d', '30d'] as $w) {
            if (($summary['windows'][$w]['metrics'] ?? []) !== []) {
                $summary['has_data'] = true;
                break;
            }
        }

        return $summary;
    }

    /**
     * @return array<string, mixed>
     */
    private function aggregateWindow(string $patientId, int $days): array
    {
        $since = (new DateTimeImmutable("-{$days} days", new DateTimeZone('UTC')))->format('Y-m-d H:i:s');
        $stmt = $this->db->prepare('
            SELECT metric_type,
                   COUNT(*) AS sample_count,
                   AVG(value) AS avg_value,
                   MIN(value) AS min_value,
                   MAX(value) AS max_value,
                   MAX(recorded_at) AS last_recorded_at
            FROM health_metrics
            WHERE patient_id = ? AND recorded_at >= ?
            GROUP BY metric_type
        ');
        $stmt->execute([$patientId, $since]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $metrics = [];
        if (is_array($rows)) {
            foreach ($rows as $row) {
                $type = (string) ($row['metric_type'] ?? '');
                if ($type === '') {
                    continue;
                }
                $metrics[$type] = [
                    'sample_count' => (int) ($row['sample_count'] ?? 0),
                    'avg' => round((float) ($row['avg_value'] ?? 0), 2),
                    'min' => round((float) ($row['min_value'] ?? 0), 2),
                    'max' => round((float) ($row['max_value'] ?? 0), 2),
                    'last_recorded_at' => $row['last_recorded_at'] ?? null,
                ];
            }
        }

        return ['days' => $days, 'metrics' => $metrics];
    }

    private function upsertSource(
        string $patientId,
        string $platform,
        string $sourceKind,
        string $externalSourceId,
        ?string $displayName
    ): string {
        $stmtFind = $this->db->prepare('
            SELECT id FROM health_sources
            WHERE patient_id = ? AND platform = ? AND external_source_id = ?
            LIMIT 1
        ');
        $stmtFind->execute([$patientId, $platform, $externalSourceId]);
        $existing = $stmtFind->fetch(PDO::FETCH_ASSOC);
        if (is_array($existing) && !empty($existing['id'])) {
            $stmtUp = $this->db->prepare('
                UPDATE health_sources
                SET display_name = COALESCE(?, display_name), revoked_at = NULL, source_kind = ?
                WHERE id = ?
            ');
            $stmtUp->execute([$displayName, $sourceKind, $existing['id']]);

            return (string) $existing['id'];
        }

        $id = health_uuid();
        $stmt = $this->db->prepare('
            INSERT INTO health_sources (
                id, patient_id, platform, source_kind, external_source_id, display_name
            ) VALUES (?, ?, ?, ?, ?, ?)
        ');
        $stmt->execute([$id, $patientId, $platform, $sourceKind, $externalSourceId, $displayName]);

        return $id;
    }

    /**
     * @param array<string, mixed> $permissions
     */
    private function recordPermissions(string $sourceId, string $patientId, array $permissions): void
    {
        $stmt = $this->db->prepare('
            INSERT INTO health_permissions (id, source_id, patient_id, permissions_json, recorded_at)
            VALUES (?, ?, ?, ?, UTC_TIMESTAMP())
        ');
        $stmt->execute([
            health_uuid(),
            $sourceId,
            $patientId,
            json_encode($permissions, JSON_UNESCAPED_UNICODE),
        ]);
    }

    private function sourceBelongsToPatient(string $sourceId, string $patientId): bool
    {
        $stmt = $this->db->prepare('SELECT 1 FROM health_sources WHERE id = ? AND patient_id = ? LIMIT 1');
        $stmt->execute([$sourceId, $patientId]);

        return (bool) $stmt->fetchColumn();
    }

    private function normalizeDateTime(string $raw): ?string
    {
        $raw = trim($raw);
        if ($raw === '') {
            return null;
        }
        try {
            $dt = new DateTimeImmutable($raw);

            return $dt->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
        } catch (Exception $e) {
            return null;
        }
    }

    private function notifySyncCompleted(string $patientId, int $inserted): void
    {
        if ($inserted <= 0) {
            return;
        }
        try {
            if ($this->notifications === null) {
                $this->notifications = new NotificationService();
            }
            $this->notifications->createNotification(
                $patientId,
                'health_sync_completed',
                'Données santé synchronisées',
                $inserted === 1
                    ? '1 nouvelle mesure a été importée depuis votre appareil.'
                    : "{$inserted} nouvelles mesures ont été importées depuis votre appareil.",
                ['metrics_count' => $inserted]
            );
        } catch (Throwable $e) {
            error_log('HealthService notifySyncCompleted: ' . $e->getMessage());
        }
    }
}

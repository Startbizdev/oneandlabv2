<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/ClinicalVitalTypes.php';
require_once __DIR__ . '/../PatientDossierAccess.php';
require_once __DIR__ . '/../../models/User.php';

final class ClinicalVitalService
{
    private const STAFF_ROLES = ['nurse', 'pro'];

    private PDO $db;

    private User $userModel;

    /** @var array<string, string|null> */
    private array $recorderNameCache = [];

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? health_db();
        $this->userModel = new User();
    }

    /**
     * @return array<string, mixed>
     */
    public function listForStaff(array $viewer, string $patientId, int $recentLimit = 20): array
    {
        $this->assertStaffAccess($viewer, $patientId);

        $latest = [];
        foreach (ClinicalVitalTypes::ALL as $type) {
            $row = $this->fetchLatestByType($patientId, $type);
            if ($row !== null) {
                $latest[$type] = $row;
            }
        }

        $recent = $this->fetchRecent($patientId, max(1, min($recentLimit, 50)));

        return [
            'catalog' => ClinicalVitalTypes::catalog(),
            'latest_by_type' => $latest,
            'recent' => $recent,
        ];
    }

    /**
     * @return array{vital_type: string, label_fr: string, unit: string, history: list<array<string, mixed>>}
     */
    public function historyForType(array $viewer, string $patientId, string $vitalType, int $limit = 50): array
    {
        $this->assertStaffAccess($viewer, $patientId);
        if (!ClinicalVitalTypes::isValid($vitalType)) {
            throw new InvalidArgumentException('Type de constante invalide');
        }
        $meta = ClinicalVitalTypes::meta($vitalType);
        $history = $this->fetchHistoryForType($patientId, $vitalType, max(1, min($limit, 100)));

        return [
            'vital_type' => $vitalType,
            'label_fr' => $meta['label_fr'] ?? $vitalType,
            'unit' => $meta['unit'] ?? '',
            'history' => $history,
        ];
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function create(array $viewer, string $patientId, array $input): array
    {
        $this->assertStaffAccess($viewer, $patientId);
        $payload = $this->normalizeInput($input);
        $id = health_uuid();
        $recordedBy = (string) ($viewer['user_id'] ?? '');

        $stmt = $this->db->prepare('
            INSERT INTO patient_clinical_vitals (
                id, patient_id, recorded_by, vital_type, value, value_secondary,
                unit, notes, recorded_at, context_type, context_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ');
        $stmt->execute([
            $id,
            $patientId,
            $recordedBy,
            $payload['vital_type'],
            $payload['value'],
            $payload['value_secondary'],
            $payload['unit'],
            $payload['notes'],
            $payload['recorded_at'],
            $payload['context_type'],
            $payload['context_id'],
        ]);

        $row = $this->fetchById($patientId, $id);
        if ($row === null) {
            throw new RuntimeException('Enregistrement impossible');
        }

        return $row;
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function update(array $viewer, string $patientId, string $vitalId, array $input): array
    {
        $this->assertStaffAccess($viewer, $patientId);
        $existing = $this->fetchById($patientId, $vitalId);
        if ($existing === null) {
            throw new RuntimeException('Constante introuvable');
        }

        $payload = $this->normalizeInput(array_merge($existing, $input), true);
        $stmt = $this->db->prepare('
            UPDATE patient_clinical_vitals
            SET value = ?, value_secondary = ?, unit = ?, notes = ?, recorded_at = ?
            WHERE id = ? AND patient_id = ?
        ');
        $stmt->execute([
            $payload['value'],
            $payload['value_secondary'],
            $payload['unit'],
            $payload['notes'],
            $payload['recorded_at'],
            $vitalId,
            $patientId,
        ]);

        $row = $this->fetchById($patientId, $vitalId);
        if ($row === null) {
            throw new RuntimeException('Mise à jour impossible');
        }

        return $row;
    }

    public function delete(array $viewer, string $patientId, string $vitalId): void
    {
        $this->assertStaffAccess($viewer, $patientId);
        $stmt = $this->db->prepare('DELETE FROM patient_clinical_vitals WHERE id = ? AND patient_id = ?');
        $stmt->execute([$vitalId, $patientId]);
        if ($stmt->rowCount() === 0) {
            throw new RuntimeException('Constante introuvable');
        }
    }

    private function assertStaffAccess(array $viewer, string $patientId): void
    {
        $role = (string) ($viewer['role'] ?? '');
        if ($role === 'super_admin') {
            return;
        }
        if (!in_array($role, self::STAFF_ROLES, true)) {
            throw new RuntimeException('Accès réservé aux professionnels de santé');
        }
        $userModel = new User();
        if (!PatientDossierAccess::canAccess($this->db, $userModel, $viewer, $patientId)) {
            throw new RuntimeException('Accès carnet refusé');
        }
    }

    /**
     * @param array<string, mixed> $input
     * @return array{
     *   vital_type: string,
     *   value: float,
     *   value_secondary: ?float,
     *   unit: string,
     *   notes: ?string,
     *   recorded_at: string,
     *   context_type: ?string,
     *   context_id: ?string
     * }
     */
    private function normalizeInput(array $input, bool $partial = false): array
    {
        $type = (string) ($input['vital_type'] ?? '');
        if (!$partial && !ClinicalVitalTypes::isValid($type)) {
            throw new InvalidArgumentException('Type de constante invalide');
        }
        if ($partial && $type !== '' && !ClinicalVitalTypes::isValid($type)) {
            throw new InvalidArgumentException('Type de constante invalide');
        }
        if ($type === '' && $partial) {
            $type = (string) ($input['vital_type'] ?? '');
        }

        $meta = ClinicalVitalTypes::meta($type);
        if ($meta === null) {
            throw new InvalidArgumentException('Type de constante invalide');
        }

        if (!isset($input['value']) || !is_numeric($input['value'])) {
            throw new InvalidArgumentException('Valeur requise');
        }
        $value = (float) $input['value'];
        if ($value < $meta['min'] || $value > $meta['max']) {
            throw new InvalidArgumentException('Valeur hors plage');
        }

        $valueSecondary = null;
        if ($meta['has_secondary']) {
            if (!isset($input['value_secondary']) || !is_numeric($input['value_secondary'])) {
                throw new InvalidArgumentException('Diastolique requise pour la tension');
            }
            $valueSecondary = (float) $input['value_secondary'];
            if ($valueSecondary < 40 || $valueSecondary > 200 || $valueSecondary >= $value) {
                throw new InvalidArgumentException('Tension invalide');
            }
        }

        $recordedAt = trim((string) ($input['recorded_at'] ?? ''));
        if ($recordedAt === '') {
            $recordedAt = (new DateTimeImmutable('now'))->format('Y-m-d H:i:s');
        } else {
            $dt = DateTimeImmutable::createFromFormat('Y-m-d\TH:i:s', $recordedAt)
                ?: DateTimeImmutable::createFromFormat('Y-m-d H:i:s', $recordedAt)
                ?: DateTimeImmutable::createFromFormat('Y-m-d\TH:i', $recordedAt);
            if (!$dt) {
                throw new InvalidArgumentException('Date invalide');
            }
            $recordedAt = $dt->format('Y-m-d H:i:s');
        }

        $notes = isset($input['notes']) ? trim((string) $input['notes']) : null;
        if ($notes === '') {
            $notes = null;
        }
        if ($notes !== null && mb_strlen($notes) > 500) {
            throw new InvalidArgumentException('Note trop longue');
        }

        $contextType = isset($input['context_type']) ? trim((string) $input['context_type']) : null;
        if ($contextType === '') {
            $contextType = null;
        }
        if ($contextType !== null && !in_array($contextType, ['passage', 'appointment', 'general'], true)) {
            throw new InvalidArgumentException('Contexte invalide');
        }

        $contextId = isset($input['context_id']) ? trim((string) $input['context_id']) : null;
        if ($contextId === '') {
            $contextId = null;
        }

        return [
            'vital_type' => $type,
            'value' => $value,
            'value_secondary' => $valueSecondary,
            'unit' => ClinicalVitalTypes::defaultUnit($type),
            'notes' => $notes,
            'recorded_at' => $recordedAt,
            'context_type' => $contextType,
            'context_id' => $contextId,
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function fetchLatestByType(string $patientId, string $type): ?array
    {
        $stmt = $this->db->prepare('
            SELECT v.*
            FROM patient_clinical_vitals v
            WHERE v.patient_id = ? AND v.vital_type = ?
            ORDER BY v.recorded_at DESC, v.created_at DESC
            LIMIT 1
        ');
        $stmt->execute([$patientId, $type]);

        return $this->mapRow($stmt->fetch(PDO::FETCH_ASSOC) ?: null);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function fetchRecent(string $patientId, int $limit): array
    {
        $stmt = $this->db->prepare('
            SELECT v.*
            FROM patient_clinical_vitals v
            WHERE v.patient_id = ?
            ORDER BY v.recorded_at DESC, v.created_at DESC
            LIMIT ?
        ');
        $stmt->bindValue(1, $patientId);
        $stmt->bindValue(2, $limit, PDO::PARAM_INT);
        $stmt->execute();

        $rows = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $mapped = $this->mapRow($row);
            if ($mapped !== null) {
                $rows[] = $mapped;
            }
        }

        return $rows;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function fetchHistoryForType(string $patientId, string $type, int $limit): array
    {
        $stmt = $this->db->prepare('
            SELECT v.*
            FROM patient_clinical_vitals v
            WHERE v.patient_id = ? AND v.vital_type = ?
            ORDER BY v.recorded_at DESC, v.created_at DESC
            LIMIT ?
        ');
        $stmt->bindValue(1, $patientId);
        $stmt->bindValue(2, $type);
        $stmt->bindValue(3, $limit, PDO::PARAM_INT);
        $stmt->execute();

        $rows = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $mapped = $this->mapRow($row);
            if ($mapped !== null) {
                $rows[] = $mapped;
            }
        }

        return $rows;
    }

    /**
     * @return array<string, mixed>|null
     */
    private function fetchById(string $patientId, string $id): ?array
    {
        $stmt = $this->db->prepare('
            SELECT v.*
            FROM patient_clinical_vitals v
            WHERE v.id = ? AND v.patient_id = ?
            LIMIT 1
        ');
        $stmt->execute([$id, $patientId]);

        return $this->mapRow($stmt->fetch(PDO::FETCH_ASSOC) ?: null);
    }

    /**
     * @param array<string, mixed>|false|null $row
     * @return array<string, mixed>|null
     */
    private function mapRow($row): ?array
    {
        if (!is_array($row)) {
            return null;
        }
        $meta = ClinicalVitalTypes::meta((string) ($row['vital_type'] ?? ''));
        if ($meta === null) {
            return null;
        }

        $recorderName = $this->getRecorderName((string) ($row['recorded_by'] ?? ''));

        return [
            'id' => (string) $row['id'],
            'patient_id' => (string) $row['patient_id'],
            'vital_type' => (string) $row['vital_type'],
            'label_fr' => $meta['label_fr'],
            'value' => (float) $row['value'],
            'value_secondary' => $row['value_secondary'] !== null ? (float) $row['value_secondary'] : null,
            'unit' => (string) $row['unit'],
            'display' => $this->formatDisplay($row),
            'notes' => $row['notes'] !== null ? (string) $row['notes'] : null,
            'recorded_at' => (new DateTimeImmutable((string) $row['recorded_at']))->format('c'),
            'recorded_by' => [
                'id' => (string) $row['recorded_by'],
                'name' => $recorderName !== null && $recorderName !== '' ? $recorderName : null,
            ],
            'context_type' => $row['context_type'] !== null ? (string) $row['context_type'] : null,
            'context_id' => $row['context_id'] !== null ? (string) $row['context_id'] : null,
        ];
    }

    /**
     * @param array<string, mixed> $row
     */
    private function formatDisplay(array $row): string
    {
        $type = (string) ($row['vital_type'] ?? '');
        $value = $row['value'];
        $unit = (string) ($row['unit'] ?? '');
        if ($type === 'blood_pressure' && $row['value_secondary'] !== null) {
            return sprintf(
                '%s/%s %s',
                $this->formatNumber((float) $value),
                $this->formatNumber((float) $row['value_secondary']),
                $unit
            );
        }

        return $this->formatNumber((float) $value) . ' ' . $unit;
    }

    private function formatNumber(float $n): string
    {
        if (abs($n - round($n)) < 0.001) {
            return (string) (int) round($n);
        }

        return rtrim(rtrim(number_format($n, 2, '.', ''), '0'), '.');
    }

    private function getRecorderName(string $userId): ?string
    {
        if ($userId === '') {
            return null;
        }
        if (!array_key_exists($userId, $this->recorderNameCache)) {
            $names = $this->userModel->getDisplayNamesByIds([$userId]);
            $this->recorderNameCache[$userId] = isset($names[$userId]) && $names[$userId] !== ''
                ? (string) $names[$userId]
                : null;
        }

        return $this->recorderNameCache[$userId];
    }
}

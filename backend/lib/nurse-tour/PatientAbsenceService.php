<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/../PatientDossierAccess.php';
require_once __DIR__ . '/../DbSchemaCache.php';
require_once __DIR__ . '/../../models/User.php';

final class PatientAbsenceService
{
    private const VALID_TYPES = ['hospitalization', 'leave', 'other'];

    private PDO $db;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? nurse_tour_db();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listForPatient(string $nurseId, string $patientId, bool $activeOnly = false): array
    {
        $this->assertTableExists();
        $sql = '
            SELECT * FROM patient_absences
            WHERE nurse_id = ? AND patient_id = ?
        ';
        if ($activeOnly) {
            $sql .= ' AND end_date >= CURDATE()';
        }
        $sql .= ' ORDER BY start_date DESC, created_at DESC';
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$nurseId, $patientId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        return array_map(fn (array $row): array => $this->formatRow($row), $rows);
    }

    /**
     * @param list<string> $patientIds
     * @return array<string, array<string, mixed>>
     */
    public function activeMapForDate(string $nurseId, array $patientIds, string $tourDate): array
    {
        $this->assertTableExists();
        $patientIds = array_values(array_filter(array_unique(array_map('strval', $patientIds))));
        if ($patientIds === []) {
            return [];
        }
        $placeholders = implode(',', array_fill(0, count($patientIds), '?'));
        $params = array_merge([$nurseId, $tourDate, $tourDate], $patientIds);
        $stmt = $this->db->prepare("
            SELECT * FROM patient_absences
            WHERE nurse_id = ?
              AND start_date <= ?
              AND end_date >= ?
              AND patient_id IN ($placeholders)
            ORDER BY start_date ASC
        ");
        $stmt->execute($params);
        $map = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
            $pid = (string) ($row['patient_id'] ?? '');
            if ($pid !== '' && !isset($map[$pid])) {
                $map[$pid] = $this->formatRow($row);
            }
        }

        return $map;
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function create(string $nurseId, string $patientId, string $actorId, array $input): array
    {
        $this->assertTableExists();
        $this->assertPatientAccess($nurseId, $patientId);
        [$type, $start, $end, $note] = $this->parseInput($input);
        $this->assertNoOverlap($nurseId, $patientId, $start, $end, null);

        $id = nurse_tour_uuid();
        $stmt = $this->db->prepare('
            INSERT INTO patient_absences
                (id, patient_id, nurse_id, absence_type, note, start_date, end_date, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ');
        $stmt->execute([$id, $patientId, $nurseId, $type, $note, $start, $end, $actorId]);

        return $this->getById($nurseId, $patientId, $id);
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function update(string $nurseId, string $patientId, string $absenceId, array $input): array
    {
        $this->assertTableExists();
        $existing = $this->requireRow($nurseId, $patientId, $absenceId);
        [$type, $start, $end, $note] = $this->parseInput(array_merge($existing, $input));
        $this->assertNoOverlap($nurseId, $patientId, $start, $end, $absenceId);

        $stmt = $this->db->prepare('
            UPDATE patient_absences
            SET absence_type = ?, note = ?, start_date = ?, end_date = ?, updated_at = NOW()
            WHERE id = ? AND nurse_id = ? AND patient_id = ?
        ');
        $stmt->execute([$type, $note, $start, $end, $absenceId, $nurseId, $patientId]);

        return $this->getById($nurseId, $patientId, $absenceId);
    }

    public function delete(string $nurseId, string $patientId, string $absenceId): void
    {
        $this->assertTableExists();
        $this->requireRow($nurseId, $patientId, $absenceId);
        $stmt = $this->db->prepare('
            DELETE FROM patient_absences WHERE id = ? AND nurse_id = ? AND patient_id = ?
        ');
        $stmt->execute([$absenceId, $nurseId, $patientId]);
    }

    /**
     * @return array<string, mixed>
     */
    public function getById(string $nurseId, string $patientId, string $absenceId): array
    {
        return $this->formatRow($this->requireRow($nurseId, $patientId, $absenceId));
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private function formatRow(array $row): array
    {
        $type = (string) ($row['absence_type'] ?? 'other');
        $endDate = (string) ($row['end_date'] ?? '');

        return [
            'id' => (string) ($row['id'] ?? ''),
            'patient_id' => (string) ($row['patient_id'] ?? ''),
            'nurse_id' => (string) ($row['nurse_id'] ?? ''),
            'absence_type' => $type,
            'type_label_fr' => $this->typeLabel($type),
            'note' => isset($row['note']) ? (string) $row['note'] : null,
            'start_date' => (string) ($row['start_date'] ?? ''),
            'end_date' => $endDate,
            'card_label_fr' => $this->cardLabel($type, $endDate),
            'created_at' => $row['created_at'] ?? null,
            'updated_at' => $row['updated_at'] ?? null,
        ];
    }

    private function typeLabel(string $type): string
    {
        return match ($type) {
            'hospitalization' => 'Hospitalisé',
            'leave' => 'En congés',
            default => 'Absent',
        };
    }

    private function cardLabel(string $type, string $endDate): string
    {
        $label = $this->typeLabel($type);
        $end = $this->formatEndDateFr($endDate);
        if ($end === '') {
            return $label;
        }

        return $label . ' · jusqu\'au ' . $end;
    }

    private function formatEndDateFr(string $isoDate): string
    {
        $isoDate = trim(substr($isoDate, 0, 10));
        if ($isoDate === '') {
            return '';
        }
        try {
            $dt = new DateTimeImmutable($isoDate);

            return $dt->format('j') . ' ' . $this->monthShortFr((int) $dt->format('n')) . ' ' . $dt->format('Y');
        } catch (Throwable $e) {
            return '';
        }
    }

    private function monthShortFr(int $month): string
    {
        $months = [
            1 => 'janv.', 2 => 'févr.', 3 => 'mars', 4 => 'avr.', 5 => 'mai', 6 => 'juin',
            7 => 'juil.', 8 => 'août', 9 => 'sept.', 10 => 'oct.', 11 => 'nov.', 12 => 'déc.',
        ];

        return $months[$month] ?? '';
    }

    /**
     * @param array<string, mixed> $input
     * @return array{0:string,1:string,2:string,3:?string}
     */
    private function parseInput(array $input): array
    {
        $type = trim((string) ($input['absence_type'] ?? ''));
        if (!in_array($type, self::VALID_TYPES, true)) {
            throw new InvalidArgumentException('Motif d\'absence invalide');
        }
        $start = trim((string) ($input['start_date'] ?? ''));
        $end = trim((string) ($input['end_date'] ?? ''));
        if ($start === '' || $end === '') {
            throw new InvalidArgumentException('Dates de début et de fin requises');
        }
        if ($end < $start) {
            throw new InvalidArgumentException('La date de fin doit être après la date de début');
        }
        $note = isset($input['note']) ? trim((string) $input['note']) : null;
        if ($note === '') {
            $note = null;
        }

        return [$type, $start, $end, $note];
    }

    private function assertNoOverlap(
        string $nurseId,
        string $patientId,
        string $start,
        string $end,
        ?string $excludeId,
    ): void {
        $sql = '
            SELECT id FROM patient_absences
            WHERE nurse_id = ? AND patient_id = ?
              AND start_date <= ? AND end_date >= ?
        ';
        $params = [$nurseId, $patientId, $end, $start];
        if ($excludeId !== null && $excludeId !== '') {
            $sql .= ' AND id <> ?';
            $params[] = $excludeId;
        }
        $sql .= ' LIMIT 1';
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        if ($stmt->fetchColumn()) {
            throw new InvalidArgumentException('Une absence existe déjà sur cette période pour ce patient');
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function requireRow(string $nurseId, string $patientId, string $absenceId): array
    {
        $stmt = $this->db->prepare('
            SELECT * FROM patient_absences WHERE id = ? AND nurse_id = ? AND patient_id = ? LIMIT 1
        ');
        $stmt->execute([$absenceId, $nurseId, $patientId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            throw new InvalidArgumentException('Absence introuvable');
        }

        return $row;
    }

    private function assertPatientAccess(string $nurseId, string $patientId): void
    {
        $userModel = new User();
        if (!PatientDossierAccess::canAccess(
            $this->db,
            $userModel,
            ['user_id' => $nurseId, 'role' => 'nurse'],
            $patientId,
        )) {
            throw new RuntimeException('Accès patient refusé');
        }
    }

    private function assertTableExists(): void
    {
        if (!DbSchemaCache::tableExists($this->db, 'patient_absences')) {
            throw new RuntimeException('Migration 096 requise (patient_absences)');
        }
    }
}

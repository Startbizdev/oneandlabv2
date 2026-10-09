<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/../HttpStatusException.php';
require_once __DIR__ . '/../Crypto.php';
require_once __DIR__ . '/../AppTimezone.php';
require_once __DIR__ . '/../PatientDossierAccess.php';
require_once __DIR__ . '/../../models/User.php';

/**
 * Numéros supplémentaires d'un patient (le principal reste profiles.phone), chiffrés comme profiles.phone.
 * Lecture : tout accès au dossier (PatientDossierAccess). Ajout / suppression : patient lui-même, infirmier, médecin, admin.
 */
final class PatientPhoneService
{
    public const LABELS = ['mobile', 'fixe', 'aidant', 'autre'];

    private const WRITE_ROLES = ['patient', 'nurse', 'pro', 'super_admin'];

    private const MAX_PHONES_PER_PATIENT = 10;

    private PDO $db;

    private Crypto $crypto;

    public function __construct(?PDO $db = null, ?Crypto $crypto = null)
    {
        $this->db = $db ?? health_db();
        $this->crypto = $crypto ?? new Crypto();
    }

    /**
     * @return list<array{id: string, patient_id: string, label: string, phone: string, created_at: string}>
     */
    public function listForPatient(array $viewer, string $patientId): array
    {
        $this->assertDossierAccess($viewer, $patientId);
        $stmt = $this->db->prepare('
            SELECT id, patient_id, label, phone_encrypted, phone_dek, UNIX_TIMESTAMP(created_at) AS created_at_unix
            FROM patient_phones
            WHERE patient_id = ?
            ORDER BY created_at ASC, id ASC
        ');
        $stmt->execute([$patientId]);

        $rows = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $rows[] = $this->mapRow($row);
        }

        return $rows;
    }

    /**
     * @param array<string, mixed> $input
     * @return array{id: string, patient_id: string, label: string, phone: string, created_at: string}
     */
    public function create(array $viewer, string $patientId, array $input): array
    {
        $this->assertWriteAccess($viewer, $patientId);

        $label = trim((string) ($input['label'] ?? ''));
        if (!in_array($label, self::LABELS, true)) {
            throw new InvalidArgumentException('Type de numéro invalide');
        }
        $phone = self::normalizePhone((string) ($input['phone'] ?? ''));

        $countStmt = $this->db->prepare('SELECT COUNT(*) FROM patient_phones WHERE patient_id = ?');
        $countStmt->execute([$patientId]);
        if ((int) $countStmt->fetchColumn() >= self::MAX_PHONES_PER_PATIENT) {
            throw new InvalidArgumentException('Nombre maximal de numéros atteint');
        }

        $encrypted = $this->crypto->encryptField($phone);
        $id = health_uuid();
        $this->db->prepare('
            INSERT INTO patient_phones (id, patient_id, label, phone_encrypted, phone_dek, created_by)
            VALUES (?, ?, ?, ?, ?, ?)
        ')->execute([
            $id,
            $patientId,
            $label,
            $encrypted['encrypted'],
            $encrypted['dek'],
            (string) ($viewer['user_id'] ?? ''),
        ]);

        $stmt = $this->db->prepare('
            SELECT id, patient_id, label, phone_encrypted, phone_dek, UNIX_TIMESTAMP(created_at) AS created_at_unix
            FROM patient_phones WHERE id = ? LIMIT 1
        ');
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row === false) {
            throw new RuntimeException('Enregistrement du numéro impossible');
        }

        return $this->mapRow($row);
    }

    public function delete(array $viewer, string $patientId, string $phoneId): void
    {
        $this->assertWriteAccess($viewer, $patientId);
        $stmt = $this->db->prepare('DELETE FROM patient_phones WHERE id = ? AND patient_id = ?');
        $stmt->execute([$phoneId, $patientId]);
        if ($stmt->rowCount() === 0) {
            throw HttpStatusException::notFound('Numéro introuvable');
        }
    }

    /** Conserve la saisie (espaces, +) mais exige 6 à 15 chiffres, plafond E.164. */
    public static function normalizePhone(string $raw): string
    {
        $phone = trim((string) preg_replace('/\s+/', ' ', $raw));
        if ($phone === '') {
            throw new InvalidArgumentException('Numéro requis');
        }
        if (!preg_match('/^\+?[0-9 .()\-]+$/', $phone)) {
            throw new InvalidArgumentException('Numéro invalide');
        }
        $digits = strlen((string) preg_replace('/\D+/', '', $phone));
        if ($digits < 6 || $digits > 15) {
            throw new InvalidArgumentException('Numéro invalide');
        }

        return $phone;
    }

    private function assertDossierAccess(array $viewer, string $patientId): void
    {
        if (!PatientDossierAccess::canAccess($this->db, new User($this->db), $viewer, $patientId)) {
            throw HttpStatusException::forbidden('Accès au dossier refusé');
        }
    }

    private function assertWriteAccess(array $viewer, string $patientId): void
    {
        if (!in_array((string) ($viewer['role'] ?? ''), self::WRITE_ROLES, true)) {
            throw HttpStatusException::forbidden('Modification des numéros non autorisée');
        }
        $this->assertDossierAccess($viewer, $patientId);
    }

    /**
     * @param array<string, mixed> $row
     * @return array{id: string, patient_id: string, label: string, phone: string, created_at: string}
     */
    private function mapRow(array $row): array
    {
        return [
            'id' => (string) $row['id'],
            'patient_id' => (string) $row['patient_id'],
            'label' => (string) $row['label'],
            'phone' => $this->crypto->decryptField((string) $row['phone_encrypted'], (string) $row['phone_dek']),
            'created_at' => AppTimezone::iso8601FromUnix($row['created_at_unix']),
        ];
    }
}

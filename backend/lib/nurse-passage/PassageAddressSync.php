<?php

declare(strict_types=1);

require_once __DIR__ . '/../Crypto.php';
require_once __DIR__ . '/../DbSchemaCache.php';
require_once __DIR__ . '/../AppointmentRequestFingerprint.php';
require_once __DIR__ . '/PassageMaterializer.php';

/**
 * Reporte la nouvelle adresse d'un patient sur ses passages à domicile encore à faire.
 * Un passage dont le lieu ne correspond plus à l'ancienne adresse du profil a été modifié à la main : il est conservé.
 */
final class PassageAddressSync
{
    private PDO $db;
    private Crypto $crypto;

    public function __construct(PDO $db, Crypto $crypto)
    {
        $this->db = $db;
        $this->crypto = $crypto;
    }

    /**
     * Adresse enregistrée sur le profil, verrouillée jusqu'à la fin de la transaction appelante.
     *
     * @return array<string, mixed>|null
     */
    public function lockProfileAddress(string $profileId): ?array
    {
        $stmt = $this->db->prepare('SELECT address_encrypted, address_dek FROM profiles WHERE id = ? FOR UPDATE');
        $stmt->execute([$profileId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row || empty($row['address_encrypted']) || empty($row['address_dek'])) {
            return null;
        }
        $decoded = json_decode(
            $this->crypto->decryptField((string) $row['address_encrypted'], (string) $row['address_dek']),
            true,
        );

        return is_array($decoded) ? $decoded : null;
    }

    /**
     * À appeler dans la transaction qui enregistre la nouvelle adresse du profil.
     *
     * @param array<string, mixed>|null $previous adresse du profil avant modification
     * @param array<string, mixed> $next adresse enregistrée
     * @return int nombre de passages mis à jour
     */
    public function refreshPatientPassages(
        string $patientId,
        ?array $previous,
        array $next,
        ?DateTimeImmutable $now = null,
    ): int {
        if (!$this->db->inTransaction()) {
            throw new LogicException('La mise à jour des passages doit partager la transaction du profil.');
        }
        $previousLabel = self::comparableLabel((string) ($previous['label'] ?? ''));
        $address = PassageMaterializer::passageAddress($next);
        if ($previousLabel === '' || $address === null || PassageMaterializer::passageAddress($previous) === $address) {
            return 0;
        }
        if (!DbSchemaCache::tableHasColumn($this->db, 'appointments', 'passage_series_id')) {
            return 0;
        }

        $updated = 0;
        foreach ($this->upcomingHomePassages($patientId, $now) as $row) {
            $current = $this->crypto->decryptField((string) $row['address_encrypted'], (string) $row['address_dek']);
            if (self::comparableLabel($current) !== $previousLabel) {
                continue;
            }
            $formData = json_decode(
                $this->crypto->decryptField((string) $row['form_data_encrypted'], (string) $row['form_data_dek']),
                true,
            );
            $formData = is_array($formData) ? $formData : [];
            if (($formData['at_home'] ?? true) === false) {
                continue;
            }
            unset($formData[AppointmentRequestFingerprint::FIELD]);
            $formData['address'] = $address;
            $form = $this->crypto->encryptField(json_encode($formData, JSON_THROW_ON_ERROR));
            [$addressSql, $addressParams] = AppointmentAddressFields::columns($this->crypto, $address);
            $this->db->prepare(
                'UPDATE appointments SET ' . $addressSql . ', form_data_encrypted = ?, form_data_dek = ?, updated_at = NOW() WHERE id = ?'
            )->execute([...$addressParams, $form['encrypted'], $form['dek'], $row['id']]);
            $updated++;
        }

        return $updated;
    }

    /**
     * Passages à domicile du patient à partir d'aujourd'hui (Paris), non terminés et non cochés en tournée.
     *
     * @return list<array<string, mixed>>
     */
    private function upcomingHomePassages(string $patientId, ?DateTimeImmutable $now): array
    {
        $statuses = PassageMaterializer::ACTIVE_STATUSES;
        $placeholders = implode(',', array_fill(0, count($statuses), '?'));
        $visitFilter = DbSchemaCache::tableExists($this->db, 'nurse_tour_stops')
            ? "AND NOT EXISTS (
                    SELECT 1 FROM nurse_tour_stops t
                    WHERE t.appointment_id = a.id AND t.visit_status IN ('done', 'skipped')
               )"
            : '';
        $stmt = $this->db->prepare("
            SELECT a.id, a.address_encrypted, a.address_dek, a.form_data_encrypted, a.form_data_dek
            FROM appointments a
            INNER JOIN nurse_passage_series s ON s.id = a.passage_series_id
            WHERE s.patient_id = ?
              AND a.passage_source = 'nurse_passage'
              AND s.at_home = 1
              AND a.status IN ($placeholders)
              AND a.scheduled_at >= ?
              AND a.address_encrypted IS NOT NULL AND a.address_dek IS NOT NULL
              AND a.form_data_encrypted IS NOT NULL AND a.form_data_dek IS NOT NULL
              $visitFilter
            FOR UPDATE
        ");
        $from = PassageMaterializer::todayParis($now)->format('Y-m-d H:i:s');
        $stmt->execute([$patientId, ...$statuses, $from]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    private static function comparableLabel(string $label): string
    {
        return mb_strtolower(trim((string) preg_replace('/\s+/u', ' ', $label)));
    }
}

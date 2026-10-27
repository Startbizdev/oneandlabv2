<?php

declare(strict_types=1);

require_once __DIR__ . '/Crypto.php';

/**
 * Personne réellement soignée par un RDV : le proche (`relative_id`) quand il est renseigné, sinon le titulaire
 * (`patient_id`). Jamais de repli sur le titulaire pour un RDV de proche : un âge absent vaut mieux qu'un âge faux.
 */
final class AppointmentBeneficiary
{
    /**
     * @param array{patient_id?: ?string, relative_id?: ?string} $appointment
     * @return array{birth_date: ?string, gender: ?string}
     */
    public static function birthAndGender(PDO $db, Crypto $crypto, array $appointment): array
    {
        $patientId = (string) ($appointment['patient_id'] ?? '');
        $relativeId = (string) ($appointment['relative_id'] ?? '');
        if ($patientId === '') {
            return ['birth_date' => null, 'gender' => null];
        }
        if ($relativeId !== '') {
            $stmt = $db->prepare('SELECT birth_date_encrypted, birth_date_dek, gender_encrypted, gender_dek FROM patient_relatives WHERE id = ? AND patient_id = ?');
            $stmt->execute([$relativeId, $patientId]);
        } else {
            $stmt = $db->prepare('SELECT birth_date_encrypted, birth_date_dek, gender_encrypted, gender_dek FROM users WHERE id = ?');
            $stmt->execute([$patientId]);
        }
        $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

        return [
            'birth_date' => self::decrypt($crypto, $row['birth_date_encrypted'] ?? null, $row['birth_date_dek'] ?? null),
            'gender' => self::decrypt($crypto, $row['gender_encrypted'] ?? null, $row['gender_dek'] ?? null),
        ];
    }

    /** Âge en années révolues, ou null si la date est absente ou illisible. */
    public static function ageFromBirthDate(?string $birthDate, ?DateTimeInterface $now = null): ?int
    {
        if ($birthDate === null || preg_match('/^(\d{4}-\d{2}-\d{2})/', trim($birthDate), $m) !== 1) {
            return null;
        }
        $birth = DateTimeImmutable::createFromFormat('!Y-m-d', $m[1]);
        if ($birth === false) {
            return null;
        }

        return ($now ?? new DateTimeImmutable())->diff($birth)->y;
    }

    private static function decrypt(Crypto $crypto, mixed $encrypted, mixed $dek): ?string
    {
        if (!is_string($encrypted) || $encrypted === '' || !is_string($dek) || $dek === '') {
            return null;
        }
        try {
            $value = trim($crypto->decryptField($encrypted, $dek));
        } catch (Throwable) {
            return null;
        }

        return $value !== '' ? $value : null;
    }
}

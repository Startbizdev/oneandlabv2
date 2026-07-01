<?php

declare(strict_types=1);

require_once __DIR__ . '/../Crypto.php';

/**
 * Profil patient pour le carnet — champs PII déchiffrés depuis profiles.*_encrypted.
 */
final class HealthPatientProfile
{
    /**
     * @return array{id: string, gender: string, birth_date: string, phone: string}
     */
    public static function load(PDO $db, string $patientId): array
    {
        $stmt = $db->prepare('
            SELECT id,
                   gender_encrypted, gender_dek,
                   birth_date_encrypted, birth_date_dek,
                   phone_encrypted, phone_dek
            FROM profiles
            WHERE id = ?
            LIMIT 1
        ');
        $stmt->execute([$patientId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!is_array($row)) {
            return [
                'id' => $patientId,
                'gender' => '',
                'birth_date' => '',
                'phone' => '',
            ];
        }

        $crypto = new Crypto();

        return [
            'id' => (string) ($row['id'] ?? $patientId),
            'gender' => self::decryptField($crypto, $row, 'gender'),
            'birth_date' => self::decryptField($crypto, $row, 'birth_date'),
            'phone' => self::decryptField($crypto, $row, 'phone'),
        ];
    }

    public static function gender(PDO $db, string $patientId): ?string
    {
        $g = trim(self::load($db, $patientId)['gender']);

        return $g !== '' ? $g : null;
    }

    /**
     * @param array<string, mixed> $row
     */
    private static function decryptField(Crypto $crypto, array $row, string $field): string
    {
        $enc = $row[$field . '_encrypted'] ?? null;
        $dek = $row[$field . '_dek'] ?? null;
        if (!is_string($enc) || $enc === '' || !is_string($dek) || $dek === '') {
            return '';
        }
        try {
            return trim((string) $crypto->decryptField($enc, $dek));
        } catch (Throwable) {
            return '';
        }
    }
}

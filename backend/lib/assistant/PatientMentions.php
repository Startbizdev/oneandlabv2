<?php

declare(strict_types=1);

require_once __DIR__ . '/../Crypto.php';
require_once __DIR__ . '/../StaffPatientHubSearch.php';

/**
 * Soignant : retrouve dans la question le patient dont il parle, parmi ceux qu'il suit (« le dossier de Mme Leroy »).
 * Nom complet d'abord, puis nom ou prénom seul ; plusieurs correspondances = l'assistant demande lequel.
 */
final class PatientMentions
{
    private const MAX_PATIENTS = 80;

    /** @return list<array{id: string, name: string, birth_date: ?string}> patients suivis par le soignant */
    public static function followed(PDO $db, array $user): array
    {
        $role = (string) ($user['role'] ?? '');
        if (in_array($role, ['nurse', 'pro'], true)) {
            $out = [];
            foreach ((new StaffPatientHubSearch($db))->search($user, '', self::MAX_PATIENTS)['items'] as $item) {
                if (($item['kind'] ?? '') === 'patient' && ($item['patient_id'] ?? '') !== '') {
                    $out[] = [
                        'id' => (string) $item['patient_id'],
                        'name' => trim($item['first_name'] . ' ' . $item['last_name']),
                        'birth_date' => $item['birth_date'] ?? null,
                    ];
                }
            }

            return $out;
        }
        if ($role !== 'preleveur') {
            return [];
        }
        $stmt = $db->prepare('
            SELECT DISTINCT p.id, p.first_name_encrypted, p.first_name_dek, p.last_name_encrypted, p.last_name_dek,
                   p.birth_date_encrypted, p.birth_date_dek
            FROM appointments a INNER JOIN profiles p ON p.id = a.patient_id
            WHERE a.assigned_to = ? OR a.assigned_nurse_id = ? LIMIT ' . self::MAX_PATIENTS);
        $stmt->execute([$user['user_id'], $user['user_id']]);
        $crypto = new Crypto();
        $field = static function (array $row, string $name) use ($crypto): string {
            try {
                return !empty($row[$name . '_encrypted']) && !empty($row[$name . '_dek'])
                    ? trim($crypto->decryptField((string) $row[$name . '_encrypted'], (string) $row[$name . '_dek']))
                    : '';
            } catch (Throwable) {
                return '';
            }
        };
        $out = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $out[] = ['id' => (string) $row['id'], 'name' => trim($field($row, 'first_name') . ' ' . $field($row, 'last_name')), 'birth_date' => $field($row, 'birth_date') ?: null];
        }

        return $out;
    }

    /**
     * Patients nommés dans la question : ceux dont le nom complet figure, sinon ceux dont le nom ou le prénom figure.
     *
     * @param list<array{id: string, name: string, birth_date: ?string}> $patients
     * @return list<array{id: string, name: string, birth_date: ?string}>
     */
    public static function resolve(array $patients, string $question): array
    {
        $text = ' ' . self::fold($question) . ' ';
        $full = [];
        $partial = [];
        foreach ($patients as $patient) {
            $parts = array_values(array_filter(explode(' ', self::fold($patient['name'])), static fn (string $p): bool => mb_strlen($p) >= 3));
            if ($parts === []) {
                continue;
            }
            if (count($parts) > 1 && (self::has($text, implode(' ', $parts)) || self::has($text, implode(' ', array_reverse($parts))))) {
                $full[$patient['id']] = $patient;
                continue;
            }
            foreach ($parts as $part) {
                if (self::has($text, $part)) {
                    $partial[$patient['id']] = $patient;
                    break;
                }
            }
        }

        return array_values($full !== [] ? $full : $partial);
    }

    private static function has(string $text, string $words): bool
    {
        return preg_match('/(?<![\p{L}])' . preg_quote($words, '/') . '(?![\p{L}])/u', $text) === 1;
    }

    private static function fold(string $value): string
    {
        $value = mb_strtolower(trim((string) preg_replace('/[\s\-]+/u', ' ', $value)));

        return strtr($value, ['é' => 'e', 'è' => 'e', 'ê' => 'e', 'ë' => 'e', 'à' => 'a', 'â' => 'a', 'î' => 'i', 'ï' => 'i', 'ô' => 'o', 'ö' => 'o', 'û' => 'u', 'ù' => 'u', 'ü' => 'u', 'ç' => 'c']);
    }
}

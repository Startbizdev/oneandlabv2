<?php

/**
 * Recherche un patient par nom (déchiffrement) + rapport RDV associés.
 * Usage: php report-patient-by-name.php "Granger" "Jean Remi"
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../lib/Crypto.php';

$needles = array_slice($argv, 1);
if ($needles === []) {
    fwrite(STDERR, "Usage: php report-patient-by-name.php <terme1> [terme2...]\n");
    exit(1);
}

$envFile = dirname(__DIR__, 2) . '/.env';
if (file_exists($envFile) && is_readable($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        $line = trim($line);
        if ($line === '' || strpos($line, '#') === 0 || strpos($line, '=') === false) {
            continue;
        }
        [$key, $value] = explode('=', $line, 2);
        $_ENV[trim($key)] = trim($value);
    }
}

$config = require __DIR__ . '/../config/database.php';
$pdo = new PDO(
    sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $config['host'],
        $config['port'],
        $config['database'],
        $config['charset'],
    ),
    $config['username'],
    $config['password'],
    $config['options'] ?? [],
);

$crypto = new Crypto();
$needlesLower = array_map(static fn(string $n): string => mb_strtolower(trim($n)), $needles);

function decryptOr(Crypto $crypto, ?string $enc, ?string $dek, string $fallback = ''): string
{
    if ($enc === null || $dek === null || $enc === '' || $dek === '') {
        return $fallback;
    }
    try {
        return $crypto->decryptField($enc, $dek) ?: $fallback;
    } catch (Throwable) {
        return $fallback;
    }
}

function matchesNeedles(string $haystack, array $needlesLower): bool
{
    foreach ($needlesLower as $n) {
        if ($n !== '' && !str_contains($haystack, $n)) {
            return false;
        }
    }
    return true;
}

$stmt = $pdo->query(
    'SELECT id, role, created_by, created_at, updated_at, email_encrypted, email_dek,
            first_name_encrypted, first_name_dek, last_name_encrypted, last_name_dek,
            phone_encrypted, phone_dek, birth_date_encrypted, birth_date_dek, gender_encrypted, gender_dek
     FROM profiles WHERE role = \'patient\'',
);

$matches = [];
while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $first = decryptOr($crypto, $r['first_name_encrypted'] ?? null, $r['first_name_dek'] ?? null);
    $last = decryptOr($crypto, $r['last_name_encrypted'] ?? null, $r['last_name_dek'] ?? null);
    $email = decryptOr($crypto, $r['email_encrypted'] ?? null, $r['email_dek'] ?? null);
    $phone = decryptOr($crypto, $r['phone_encrypted'] ?? null, $r['phone_dek'] ?? null);
    $birth = decryptOr($crypto, $r['birth_date_encrypted'] ?? null, $r['birth_date_dek'] ?? null);
    $gender = decryptOr($crypto, $r['gender_encrypted'] ?? null, $r['gender_dek'] ?? null);
    $hay = mb_strtolower(trim("$first $last $email $phone"));

    if (!matchesNeedles($hay, $needlesLower)) {
        continue;
    }

    $matches[] = [
        'profile' => [
            'id' => $r['id'],
            'first_name' => $first,
            'last_name' => $last,
            'email' => $email,
            'phone' => $phone,
            'birth_date' => $birth,
            'gender' => $gender,
            'created_by' => $r['created_by'],
            'created_at' => $r['created_at'],
            'updated_at' => $r['updated_at'],
        ],
    ];
}

if ($matches === []) {
    // Recherche souple : au moins Granger OU (Jean ET Remi)
    $stmt = $pdo->query(
        'SELECT id, role, created_by, created_at, updated_at, email_encrypted, email_dek,
                first_name_encrypted, first_name_dek, last_name_encrypted, last_name_dek,
                phone_encrypted, phone_dek, birth_date_encrypted, birth_date_dek, gender_encrypted, gender_dek
         FROM profiles WHERE role = \'patient\'',
    );
    while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $first = decryptOr($crypto, $r['first_name_encrypted'] ?? null, $r['first_name_dek'] ?? null);
        $last = decryptOr($crypto, $r['last_name_encrypted'] ?? null, $r['last_name_dek'] ?? null);
        $email = decryptOr($crypto, $r['email_encrypted'] ?? null, $r['email_dek'] ?? null);
        $phone = decryptOr($crypto, $r['phone_encrypted'] ?? null, $r['phone_dek'] ?? null);
        $birth = decryptOr($crypto, $r['birth_date_encrypted'] ?? null, $r['birth_date_dek'] ?? null);
        $gender = decryptOr($crypto, $r['gender_encrypted'] ?? null, $r['gender_dek'] ?? null);
        $hay = mb_strtolower(trim("$first $last $email $phone"));
        $hasGranger = str_contains($hay, 'granger');
        $hasJean = str_contains($hay, 'jean');
        $hasRemi = str_contains($hay, 'remi') || str_contains($hay, 'rémi');
        if (!$hasGranger && !($hasJean && $hasRemi)) {
            continue;
        }
        $matches[] = [
            'profile' => [
                'id' => $r['id'],
                'first_name' => $first,
                'last_name' => $last,
                'email' => $email,
                'phone' => $phone,
                'birth_date' => $birth,
                'gender' => $gender,
                'created_by' => $r['created_by'],
                'created_at' => $r['created_at'],
                'updated_at' => $r['updated_at'],
            ],
            'match_mode' => 'flexible',
        ];
    }
}

$apptStmt = $pdo->prepare(
    'SELECT id, type, status, patient_id, assigned_to, assigned_nurse_id, assigned_lab_id,
            created_by, created_by_role, category_id, scheduled_at, started_at, completed_at,
            created_at, updated_at, guest_email_encrypted, guest_email_dek, creation_batch_id
     FROM appointments
     WHERE patient_id = ? OR guest_email_encrypted IS NOT NULL
     ORDER BY scheduled_at DESC',
);

foreach ($matches as &$match) {
    $pid = $match['profile']['id'];
    $emailLower = mb_strtolower($match['profile']['email'] ?? '');

    $apptStmt->execute([$pid]);
    $appointments = [];
    while ($a = $apptStmt->fetch(PDO::FETCH_ASSOC)) {
        if ((string) ($a['patient_id'] ?? '') === (string) $pid) {
            $appointments[] = $a;
            continue;
        }
        $guestEmail = decryptOr($crypto, $a['guest_email_encrypted'] ?? null, $a['guest_email_dek'] ?? null);
        if ($emailLower !== '' && mb_strtolower($guestEmail) === $emailLower) {
            $a['matched_as'] = 'guest_email';
            $appointments[] = $a;
        }
    }
    $match['appointments'] = $appointments;
    $match['appointment_count'] = count($appointments);

    $creator = null;
    if (!empty($match['profile']['created_by'])) {
        $cStmt = $pdo->prepare('SELECT id, role, first_name_encrypted, first_name_dek, last_name_encrypted, last_name_dek, company_name_encrypted, company_name_dek FROM profiles WHERE id = ? LIMIT 1');
        $cStmt->execute([$match['profile']['created_by']]);
        if ($c = $cStmt->fetch(PDO::FETCH_ASSOC)) {
            $creator = [
                'id' => $c['id'],
                'role' => $c['role'],
                'first_name' => decryptOr($crypto, $c['first_name_encrypted'] ?? null, $c['first_name_dek'] ?? null),
                'last_name' => decryptOr($crypto, $c['last_name_encrypted'] ?? null, $c['last_name_dek'] ?? null),
                'company_name' => decryptOr($crypto, $c['company_name_encrypted'] ?? null, $c['company_name_dek'] ?? null),
            ];
        }
    }
    $match['created_by_profile'] = $creator;
}
unset($match);

echo json_encode([
    'search' => $needles,
    'match_count' => count($matches),
    'results' => $matches,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";

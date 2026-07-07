<?php

/**
 * Recherche rapide patient + RDV (scan par lots, arrêt dès match).
 * Usage: php report-patient-by-name-fast.php Granger
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../lib/Crypto.php';

$terms = array_values(array_filter(array_map('trim', array_slice($argv, 1))));
if ($terms === []) {
    fwrite(STDERR, "Usage: php report-patient-by-name-fast.php <terme> [terme2...]\n");
    exit(1);
}

$envFile = dirname(__DIR__, 2) . '/.env';
if (is_readable($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }
        [$key, $value] = explode('=', $line, 2);
        $_ENV[trim($key)] = trim($value);
    }
}

$config = require __DIR__ . '/../config/database.php';
$pdo = new PDO(
    sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']),
    $config['username'],
    $config['password'],
    ($config['options'] ?? []) + [PDO::MYSQL_ATTR_USE_BUFFERED_QUERY => false],
);
$crypto = new Crypto();

function dec(Crypto $c, ?string $enc, ?string $dek): string
{
    if (!$enc || !$dek) {
        return '';
    }
    try {
        return $c->decryptField($enc, $dek) ?: '';
    } catch (Throwable) {
        return '';
    }
}

function nameMatch(string $first, string $last, string $email, string $phone, array $terms): bool
{
    $hay = mb_strtolower(trim("$first $last $email $phone"));
    $all = true;
    foreach ($terms as $t) {
        $tl = mb_strtolower($t);
        if ($tl !== '' && !str_contains($hay, $tl)) {
            $all = false;
            break;
        }
    }
    if ($all && count(array_filter($terms)) > 0) {
        return true;
    }
    $hasGranger = str_contains($hay, 'granger');
    $hasJean = str_contains($hay, 'jean');
    $hasRemi = str_contains($hay, 'remi') || str_contains($hay, 'rémi');
    return $hasGranger || ($hasJean && $hasRemi);
}

$total = (int) $pdo->query("SELECT COUNT(*) FROM profiles WHERE role = 'patient'")->fetchColumn();
fwrite(STDERR, "Scan de {$total} patients...\n");

$stmt = $pdo->query(
    "SELECT id, created_by, created_at, updated_at,
            email_encrypted, email_dek,
            first_name_encrypted, first_name_dek,
            last_name_encrypted, last_name_dek,
            phone_encrypted, phone_dek,
            birth_date_encrypted, birth_date_dek,
            gender_encrypted, gender_dek
     FROM profiles WHERE role = 'patient'
     ORDER BY created_at DESC",
);

$matches = [];
$n = 0;
while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $n++;
    if ($n % 200 === 0) {
        fwrite(STDERR, "  … {$n}/{$total}\n");
    }
    $first = dec($crypto, $r['first_name_encrypted'] ?? null, $r['first_name_dek'] ?? null);
    $last = dec($crypto, $r['last_name_encrypted'] ?? null, $r['last_name_dek'] ?? null);
    $email = dec($crypto, $r['email_encrypted'] ?? null, $r['email_dek'] ?? null);
    $phone = dec($crypto, $r['phone_encrypted'] ?? null, $r['phone_dek'] ?? null);
    if (!nameMatch($first, $last, $email, $phone, $terms)) {
        continue;
    }
    $matches[] = [
        'id' => $r['id'],
        'first_name' => $first,
        'last_name' => $last,
        'email' => $email,
        'phone' => $phone,
        'birth_date' => dec($crypto, $r['birth_date_encrypted'] ?? null, $r['birth_date_dek'] ?? null),
        'gender' => dec($crypto, $r['gender_encrypted'] ?? null, $r['gender_dek'] ?? null),
        'created_by' => $r['created_by'],
        'created_at' => $r['created_at'],
        'updated_at' => $r['updated_at'],
    ];
}

fwrite(STDERR, 'Matches: ' . count($matches) . "\n");

$apptStmt = $pdo->prepare(
    "SELECT id, type, status, patient_id, assigned_to, assigned_nurse_id, assigned_lab_id,
            created_by, created_by_role, category_id, scheduled_at, started_at, completed_at,
            created_at, updated_at, creation_batch_id
     FROM appointments WHERE patient_id = ? ORDER BY scheduled_at DESC",
);

$out = [];
foreach ($matches as $m) {
    $apptStmt->execute([$m['id']]);
    $appts = $apptStmt->fetchAll(PDO::FETCH_ASSOC);
    $out[] = ['profile' => $m, 'appointments' => $appts, 'appointment_count' => count($appts)];
}

echo json_encode(['search' => $terms, 'scanned' => $n, 'results' => $out], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";

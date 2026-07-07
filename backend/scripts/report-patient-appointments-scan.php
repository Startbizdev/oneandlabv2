<?php

/**
 * Recherche patient par nom — scan UNIQUEMENT les patient_id liés à des RDV (rapide).
 * Usage: php report-patient-appointments-scan.php Granger
 */

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../lib/Crypto.php';

$terms = array_values(array_filter(array_map('trim', array_slice($argv, 1))));
if ($terms === []) {
    $terms = ['granger'];
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
    $config['options'] ?? [],
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

function matches(string $first, string $last, string $email, string $phone, array $terms): bool
{
    $hay = mb_strtolower(trim("$first $last $email $phone"));
    foreach ($terms as $t) {
        $tl = mb_strtolower($t);
        if ($tl !== '' && !str_contains($hay, $tl)) {
            return false;
        }
    }
    if (count(array_filter($terms)) > 0) {
        return true;
    }
    return str_contains($hay, 'granger')
        || (str_contains($hay, 'jean') && (str_contains($hay, 'remi') || str_contains($hay, 'rémi')));
}

// 1) IDs patients ayant au moins un RDV
$ids = $pdo->query(
    "SELECT DISTINCT patient_id FROM appointments WHERE patient_id IS NOT NULL",
)->fetchAll(PDO::FETCH_COLUMN);
$ids = array_values(array_filter($ids));

// 2) + profils créés récemment (au cas où RDV pas encore lié)
$recentIds = $pdo->query(
    "SELECT id FROM profiles WHERE role = 'patient' AND created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)",
)->fetchAll(PDO::FETCH_COLUMN);
$scanIds = array_values(array_unique(array_merge($ids, $recentIds)));

$profileStmt = $pdo->prepare(
    "SELECT id, created_by, created_at, updated_at,
            email_encrypted, email_dek,
            first_name_encrypted, first_name_dek,
            last_name_encrypted, last_name_dek,
            phone_encrypted, phone_dek,
            birth_date_encrypted, birth_date_dek
     FROM profiles WHERE id = ? AND role = 'patient' LIMIT 1",
);

$matches = [];
foreach ($scanIds as $pid) {
    $profileStmt->execute([$pid]);
    $r = $profileStmt->fetch(PDO::FETCH_ASSOC);
    if (!$r) {
        continue;
    }
    $first = dec($crypto, $r['first_name_encrypted'] ?? null, $r['first_name_dek'] ?? null);
    $last = dec($crypto, $r['last_name_encrypted'] ?? null, $r['last_name_dek'] ?? null);
    $email = dec($crypto, $r['email_encrypted'] ?? null, $r['email_dek'] ?? null);
    $phone = dec($crypto, $r['phone_encrypted'] ?? null, $r['phone_dek'] ?? null);
    if (!matches($first, $last, $email, $phone, $terms)) {
        continue;
    }
    $matches[] = [
        'id' => $r['id'],
        'first_name' => $first,
        'last_name' => $last,
        'email' => $email,
        'phone' => $phone,
        'birth_date' => dec($crypto, $r['birth_date_encrypted'] ?? null, $r['birth_date_dek'] ?? null),
        'created_by' => $r['created_by'],
        'created_at' => $r['created_at'],
    ];
}

$apptStmt = $pdo->prepare(
    "SELECT a.id, a.type, a.status, a.patient_id, a.created_by, a.created_by_role,
            a.category_id, a.scheduled_at, a.started_at, a.completed_at, a.created_at,
            a.creation_batch_id, cc.name AS category_name
     FROM appointments a
     LEFT JOIN care_categories cc ON cc.id = a.category_id
     WHERE a.patient_id = ?
     ORDER BY a.scheduled_at DESC",
);

$creatorStmt = $pdo->prepare(
    "SELECT id, role, first_name_encrypted, first_name_dek, last_name_encrypted, last_name_dek,
            company_name_encrypted, company_name_dek
     FROM profiles WHERE id = ? LIMIT 1",
);

$results = [];
foreach ($matches as $m) {
    $apptStmt->execute([$m['id']]);
    $appts = $apptStmt->fetchAll(PDO::FETCH_ASSOC);

    $creator = null;
    if (!empty($m['created_by'])) {
        $creatorStmt->execute([$m['created_by']]);
        if ($c = $creatorStmt->fetch(PDO::FETCH_ASSOC)) {
            $creator = [
                'id' => $c['id'],
                'role' => $c['role'],
                'name' => trim(
                    dec($crypto, $c['company_name_encrypted'] ?? null, $c['company_name_dek'] ?? null)
                    ?: trim(dec($crypto, $c['first_name_encrypted'] ?? null, $c['first_name_dek'] ?? null) . ' '
                        . dec($crypto, $c['last_name_encrypted'] ?? null, $c['last_name_dek'] ?? null)),
                ),
            ];
        }
    }

    $results[] = [
        'profile' => $m,
        'created_by_profile' => $creator,
        'appointments' => $appts,
        'appointment_count' => count($appts),
    ];
}

echo json_encode([
    'search' => $terms,
    'scanned_patient_ids' => count($scanIds),
    'match_count' => count($results),
    'results' => $results,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";

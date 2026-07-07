<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../lib/Crypto.php';

$patientId = $argv[1] ?? 'c4692000-2776-4d07-a234-e46c6936b58d';
$creatorId = $argv[2] ?? '63e11def-6ac4-45d4-9b97-4f25efe5fd99';
$phoneNeedle = $argv[3] ?? '0626010728';

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

$out = [
    'patient_id' => $patientId,
    'by_patient_id' => [],
    'by_creator_today' => [],
    'by_phone_in_form' => [],
    'guest_recent' => [],
];

$stmt = $pdo->prepare(
    "SELECT id, type, status, patient_id, created_by, created_by_role, scheduled_at, created_at, creation_batch_id,
            form_data_encrypted, form_data_dek, guest_email_encrypted, guest_email_dek
     FROM appointments WHERE patient_id = ? ORDER BY created_at DESC LIMIT 20",
);
$stmt->execute([$patientId]);
$out['by_patient_id'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

$stmt = $pdo->prepare(
    "SELECT id, type, status, patient_id, created_by, created_by_role, scheduled_at, created_at, creation_batch_id,
            form_data_encrypted, form_data_dek
     FROM appointments
     WHERE created_by = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 2 DAY)
     ORDER BY created_at DESC LIMIT 30",
);
$stmt->execute([$creatorId]);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($rows as &$r) {
    $fd = '';
    if (!empty($r['form_data_encrypted']) && !empty($r['form_data_dek'])) {
        $fd = dec($crypto, $r['form_data_encrypted'], $r['form_data_dek']);
    }
    $r['form_data_preview'] = mb_substr($fd, 0, 400);
    unset($r['form_data_encrypted'], $r['form_data_dek']);
}
unset($r);
$out['by_creator_today'] = $rows;

$stmt = $pdo->query(
    "SELECT id, type, status, patient_id, created_by, created_by_role, scheduled_at, created_at, creation_batch_id,
            form_data_encrypted, form_data_dek
     FROM appointments
     WHERE created_at >= DATE_SUB(NOW(), INTERVAL 3 DAY)
     ORDER BY created_at DESC LIMIT 80",
);
while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
    if (empty($r['form_data_encrypted']) || empty($r['form_data_dek'])) {
        continue;
    }
    $fd = dec($crypto, $r['form_data_encrypted'], $r['form_data_dek']);
    if ($fd === '') {
        continue;
    }
    $digits = preg_replace('/\D/', '', $phoneNeedle) ?? '';
    if ($digits !== '' && str_contains(preg_replace('/\D/', '', $fd) ?? '', $digits)) {
        $out['by_phone_in_form'][] = [
            'id' => $r['id'],
            'type' => $r['type'],
            'status' => $r['status'],
            'patient_id' => $r['patient_id'],
            'created_by' => $r['created_by'],
            'created_by_role' => $r['created_by_role'],
            'scheduled_at' => $r['scheduled_at'],
            'created_at' => $r['created_at'],
            'creation_batch_id' => $r['creation_batch_id'],
            'form_data_preview' => mb_substr($fd, 0, 500),
        ];
    }
}

$stmt = $pdo->query(
    "SELECT id, type, status, patient_id, created_by, scheduled_at, created_at, guest_email_encrypted, guest_email_dek
     FROM appointments
     WHERE patient_id IS NULL AND created_at >= DATE_SUB(NOW(), INTERVAL 3 DAY)
     ORDER BY created_at DESC LIMIT 20",
);
while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $r['guest_email'] = dec($crypto, $r['guest_email_encrypted'] ?? null, $r['guest_email_dek'] ?? null);
    unset($r['guest_email_encrypted'], $r['guest_email_dek']);
    $out['guest_recent'][] = $r;
}

echo json_encode($out, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";

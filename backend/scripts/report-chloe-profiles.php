<?php
declare(strict_types=1);

$backendDir = dirname(__DIR__);
$envFile = dirname($backendDir) . '/.env';
if (is_readable($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }
        [$k, $v] = explode('=', $line, 2);
        $_ENV[trim($k)] = trim($v);
    }
}

require_once $backendDir . '/lib/Crypto.php';

$config = require $backendDir . '/config/database.php';
$pdo = new PDO(
    sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']),
    $config['username'],
    $config['password'],
    $config['options']
);

$crypto = new Crypto();
$ids = [
    '22244d70-c373-43da-a573-f91185766d91' => 'patient',
    '31578932-0ee7-4bc7-b294-9347d229a311' => 'nurse',
];

foreach ($ids as $id => $label) {
    $row = $pdo->query("SELECT * FROM profiles WHERE id = " . $pdo->quote($id))->fetch(PDO::FETCH_ASSOC);
    $email = $crypto->decryptField($row['email_encrypted'], $row['email_dek']);
    $firstName = !empty($row['first_name_encrypted']) ? $crypto->decryptField($row['first_name_encrypted'], $row['first_name_dek']) : '';
    $lastName = !empty($row['last_name_encrypted']) ? $crypto->decryptField($row['last_name_encrypted'], $row['last_name_dek']) : '';
    $createdByName = null;
    $createdByRole = null;
    if (!empty($row['created_by'])) {
        $creator = $pdo->query("SELECT role, first_name_encrypted, first_name_dek, last_name_encrypted, last_name_dek FROM profiles WHERE id = " . $pdo->quote($row['created_by']))->fetch(PDO::FETCH_ASSOC);
        if ($creator) {
            $createdByRole = $creator['role'];
            $cf = !empty($creator['first_name_encrypted']) ? $crypto->decryptField($creator['first_name_encrypted'], $creator['first_name_dek']) : '';
            $cl = !empty($creator['last_name_encrypted']) ? $crypto->decryptField($creator['last_name_encrypted'], $creator['last_name_dek']) : '';
            $createdByName = trim($cf . ' ' . $cl);
        }
    }
    echo json_encode([
        'label' => $label,
        'id' => $id,
        'role' => $row['role'] ?? null,
        'email' => $email,
        'name' => trim($firstName . ' ' . $lastName),
        'created_at' => $row['created_at'] ?? null,
        'created_by_id' => $row['created_by'] ?? null,
        'created_by_role' => $createdByRole,
        'created_by_name' => $createdByName,
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . PHP_EOL;
}

// RDV count for patient
$patientId = '22244d70-c373-43da-a573-f91185766d91';
$rdv = $pdo->query("SELECT COUNT(*) FROM appointments WHERE patient_id = " . $pdo->quote($patientId))->fetchColumn();
echo "appointments_for_patient={$rdv}" . PHP_EOL;

<?php

/**
 * Backfill QR codes pour tous les profils nurse, lab, subaccount, pro.
 * Usage: php backend/scripts/backfill-qr-codes.php
 */

require_once __DIR__ . '/../lib/QrCodeService.php';

$service = new QrCodeService();
$config = require __DIR__ . '/../config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options']);

$stmt = $db->query("SELECT id, role FROM profiles WHERE role IN ('nurse','lab','subaccount','pro') ORDER BY created_at ASC");
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
$ok = 0;
$fail = 0;

foreach ($rows as $row) {
    try {
        $service->ensureForProfile((string) $row['id']);
        $ok++;
        echo "OK {$row['role']} {$row['id']}\n";
    } catch (Throwable $e) {
        $fail++;
        echo "FAIL {$row['id']}: {$e->getMessage()}\n";
    }
}

echo "Done: {$ok} created/verified, {$fail} failed\n";

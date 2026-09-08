<?php
declare(strict_types=1);
require_once '/var/www/oneandlab/backend/models/User.php';
require_once '/var/www/oneandlab/backend/lib/SubscriptionDisplay.php';

$config = require '/var/www/oneandlab/backend/config/database.php';
$pdo = new PDO(sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']), $config['username'], $config['password'], $config['options'] ?? []);
$userModel = new User();
$now = strtotime('2026-09-08 12:00:00');

$rows = $pdo->query("SELECT user_id, billing_source, status, trial_ends_at, current_period_end FROM subscriptions WHERE billing_source IN ('apple','stripe') ORDER BY updated_at DESC")->fetchAll(PDO::FETCH_ASSOC);
$out = [];
foreach ($rows as $row) {
    try {
        $u = $userModel->getById($row['user_id'], $row['user_id'], 'super_admin');
        $email = $u['email'] ?? '';
    } catch (Throwable $e) {
        $email = '?';
    }
    $enriched = SubscriptionDisplay::enrich($row, $now);
    $out[] = [
        'email' => $email,
        'billing' => $enriched['billing_source'],
        'effective_status' => $enriched['effective_status'],
        'is_trialing' => $enriched['is_trialing'],
        'needs_resync' => $enriched['needs_resync'],
        'trial_ends_at' => $enriched['trial_ends_at'],
        'current_period_end' => $enriched['current_period_end'],
    ];
}
echo json_encode($out, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";

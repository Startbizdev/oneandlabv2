<?php
/**
 * Resynchronise les abonnements Apple depuis l'API App Store Server.
 * Usage prod : php backend/scripts/resync-apple-subscriptions.php [--dry-run]
 */
declare(strict_types=1);

$dryRun = in_array('--dry-run', $argv, true);

require_once __DIR__ . '/../lib/AppleIapVerifier.php';
require_once __DIR__ . '/../lib/SubscriptionService.php';
require_once __DIR__ . '/../lib/SubscriptionDisplay.php';

$config = require __DIR__ . '/../config/database.php';
$iapConfig = require __DIR__ . '/../config/iap.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$pdo = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);

$appleOk = !empty($iapConfig['apple']['issuer_id'])
    && !empty($iapConfig['apple']['key_id'])
    && !empty($iapConfig['apple']['private_key']);

if (!$appleOk) {
    fwrite(STDERR, "Configuration Apple IAP incomplète (APPLE_IAP_ISSUER_ID, KEY_ID, PRIVATE_KEY).\n");
    exit(1);
}

$verifier = new AppleIapVerifier($iapConfig);
$service = new SubscriptionService($pdo);

$rows = $pdo->query("
    SELECT id, user_id, store_original_transaction_id, store_product_id,
           status, trial_ends_at, current_period_end, updated_at
    FROM subscriptions
    WHERE billing_source = 'apple'
      AND store_original_transaction_id IS NOT NULL
      AND store_original_transaction_id != ''
    ORDER BY updated_at ASC
")->fetchAll(PDO::FETCH_ASSOC);

$results = [];
foreach ($rows as $row) {
    $txId = (string) $row['store_original_transaction_id'];
    $live = $verifier->fetchLatestSubscriptionTransaction($txId);
    if (!$live) {
        $results[] = [
            'user_id' => $row['user_id'],
            'original_tx' => $txId,
            'action' => 'skip',
            'reason' => 'apple_api_no_data',
        ];
        continue;
    }

    $before = SubscriptionDisplay::enrich(array_merge($row, ['billing_source' => 'apple']));
    if (!$dryRun) {
        $service->upsertStoreSubscription(
            (string) $row['user_id'],
            'apple',
            $live['product_id'] ?: ((string) ($row['store_product_id'] ?? 'cary.pro.monthly')),
            $txId,
            $live['status'],
            $live['trial_ends_at'],
            $live['current_period_end']
        );
    }

    $after = SubscriptionDisplay::enrich(array_merge($row, [
        'billing_source' => 'apple',
        'status' => $live['status'],
        'trial_ends_at' => $live['trial_ends_at'],
        'current_period_end' => $live['current_period_end'],
    ]));

    $results[] = [
        'user_id' => $row['user_id'],
        'original_tx' => $txId,
        'action' => $dryRun ? 'would_update' : 'updated',
        'before_effective_status' => $before['effective_status'],
        'after_effective_status' => $after['effective_status'],
        'before_period_end' => $before['current_period_end'],
        'after_period_end' => $after['current_period_end'],
        'after_trial_ends_at' => $after['trial_ends_at'],
    ];
}

echo json_encode([
    'dry_run' => $dryRun,
    'count' => count($results),
    'results' => $results,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";

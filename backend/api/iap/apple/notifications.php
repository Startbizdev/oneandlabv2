<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../_bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
    exit;
}

$ctx = iapBootstrap();
$body = iapReadJsonBody();
$signedPayload = trim((string) ($body['signedPayload'] ?? ''));

if (!$signedPayload) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'signedPayload requis']);
    exit;
}

try {
    $verifier = new AppleIapVerifier($ctx['iapConfig']);
    $parsed = $verifier->parseNotification($signedPayload);

    /** @var SubscriptionService $service */
    $service = $ctx['subscriptionService'];
    $originalTx = $parsed['original_transaction_id'] ?? null;

    if ($originalTx) {
        if (($parsed['status'] ?? '') === 'canceled') {
            $service->updateStoreSubscriptionStatus($originalTx, 'canceled');
        } elseif (!empty($parsed['transaction'])) {
            $tx = $parsed['transaction'];
            $stmt = $ctx['pdo']->prepare(
                'SELECT user_id FROM subscriptions WHERE store_original_transaction_id = ? LIMIT 1'
            );
            $stmt->execute([$originalTx]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($row) {
                $service->upsertStoreSubscription(
                    $row['user_id'],
                    'apple',
                    $tx['product_id'],
                    $originalTx,
                    $tx['status'],
                    $tx['trial_ends_at'],
                    $tx['current_period_end']
                );
            }
        }
    }

    echo json_encode(['success' => true]);
} catch (Throwable $e) {
    error_log('iap/apple/notifications: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'notification_failed']);
}

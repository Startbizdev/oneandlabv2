<?php

declare(strict_types=1);

/**
 * Vérification lecture seule du module commandes pharmacie.
 * Usage: php scripts/verify-pharmacy-module.php
 *
 * Ne crée ni ne modifie aucune commande.
 */

require_once __DIR__ . '/../lib/pharmacy/bootstrap.php';

$config = require __DIR__ . '/../config/database.php';
$pdo = new PDO(
    sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']),
    $config['username'],
    $config['password'],
    $config['options'] ?? []
);

$checks = [
    '110 pharmacy_orders' => "SHOW TABLES LIKE 'pharmacy_orders'",
    '110 pharmacy_order_events' => "SHOW TABLES LIKE 'pharmacy_order_events'",
    '110 pharmacy_order_messages' => "SHOW TABLES LIKE 'pharmacy_order_messages'",
    '110 profiles.pharmacy_orders_enabled' => "SHOW COLUMNS FROM profiles LIKE 'pharmacy_orders_enabled'",
    '110 profiles.pharmacy_orders_paused' => "SHOW COLUMNS FROM profiles LIKE 'pharmacy_orders_paused'",
    '110 profiles.pharmacy_accepts_click_collect' => "SHOW COLUMNS FROM profiles LIKE 'pharmacy_accepts_click_collect'",
    '110 profiles.pharmacy_accepts_home_delivery' => "SHOW COLUMNS FROM profiles LIKE 'pharmacy_accepts_home_delivery'",
    '111 pharmacy_favorites' => "SHOW TABLES LIKE 'pharmacy_favorites'",
    'platform_settings pharmacy_module_config' => "
        SELECT 1 FROM platform_settings
        WHERE setting_key = 'pharmacy_module_config'
        LIMIT 1
    ",
];

$classes = [
    'PharmacyModuleConfig',
    'PharmacyOrderAccess',
    'PharmacyOrderConversation',
    'PharmacyOrderService',
    'PharmacyCatalogService',
    'PharmacyFavoriteService',
    'PharmacyOrderStatsService',
];

echo "DB: {$config['database']}\n";
echo str_repeat('-', 50) . "\n";

$failures = 0;
foreach ($checks as $label => $sql) {
    try {
        $stmt = $pdo->query($sql);
        $row = $stmt ? $stmt->fetch(PDO::FETCH_ASSOC) : false;
        $ok = $row !== false && $row !== null && $row !== [];
        echo ($ok ? 'OK  ' : 'MISS') . "  $label\n";
        if (!$ok) {
            $failures++;
        }
    } catch (Throwable $e) {
        echo 'ERR  ' . $label . ' — ' . $e->getMessage() . "\n";
        $failures++;
    }
}

echo str_repeat('-', 50) . "\n";
echo "Classes PHP\n";
foreach ($classes as $class) {
    $ok = class_exists($class);
    echo ($ok ? 'OK  ' : 'MISS') . "  $class\n";
    if (!$ok) {
        $failures++;
    }
}

echo str_repeat('-', 50) . "\n";
try {
    $moduleConfig = new PharmacyModuleConfig($pdo);
    $cfg = $moduleConfig->getConfig();
    echo "Config module (lecture seule)\n";
    echo '  module_enabled: ' . (!empty($cfg['module_enabled']) ? 'oui' : 'non') . "\n";
    echo '  ordering_enabled_for_nurse: ' . (!empty($cfg['ordering_enabled_for_nurse']) ? 'oui' : 'non') . "\n";
    $emplois = $cfg['ordering_enabled_emplois'] ?? [];
    echo '  ordering_enabled_emplois: ' . (is_array($emplois) ? count($emplois) : 0) . " entrée(s)\n";
    $receivers = $cfg['pharmacy_receiver_emplois'] ?? [];
    echo '  pharmacy_receiver_emplois: ' . (is_array($receivers) ? implode(', ', $receivers) : '—') . "\n";
} catch (Throwable $e) {
    echo 'ERR  lecture config — ' . $e->getMessage() . "\n";
    $failures++;
}

echo str_repeat('-', 50) . "\n";
try {
    $counts = [
        'pharmacy_orders' => (int) $pdo->query('SELECT COUNT(*) FROM pharmacy_orders')->fetchColumn(),
        'pharmacy_order_events' => (int) $pdo->query('SELECT COUNT(*) FROM pharmacy_order_events')->fetchColumn(),
        'pharmacy_order_messages' => (int) $pdo->query('SELECT COUNT(*) FROM pharmacy_order_messages')->fetchColumn(),
        'pharmacy_favorites' => (int) $pdo->query('SELECT COUNT(*) FROM pharmacy_favorites')->fetchColumn(),
    ];
    echo "Compteurs (lecture seule)\n";
    foreach ($counts as $table => $count) {
        echo "  $table: $count\n";
    }
} catch (Throwable $e) {
    echo 'ERR  compteurs — ' . $e->getMessage() . "\n";
    $failures++;
}

exit($failures > 0 ? 1 : 0);

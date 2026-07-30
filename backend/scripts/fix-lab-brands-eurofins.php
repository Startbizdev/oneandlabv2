<?php
/**
 * Fusionne les deux entrées Eurofins en une seule « Eurofins » (prod / idempotent).
 * Usage: cd backend && php scripts/fix-lab-brands-eurofins.php
 */
$config = require __DIR__ . '/../config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);

$eurofinsId = 'a1000001-0001-4001-8001-000000000006';
$biomnisId = 'a1000001-0001-4001-8001-000000000007';

$db->beginTransaction();
try {
    $db->prepare('UPDATE appointments SET preferred_lab_brand_id = ? WHERE preferred_lab_brand_id = ?')
        ->execute([$eurofinsId, $biomnisId]);

    $db->prepare('
        UPDATE lab_brands
        SET name = ?, slug = ?, logo_url = ?, website_url = ?, sort_order = 6, is_active = 1, updated_at = NOW()
        WHERE id = ?
    ')->execute([
        'Eurofins',
        'eurofins',
        'https://www.google.com/s2/favicons?domain=eurofins.fr&sz=128',
        'https://www.eurofins.fr',
        $eurofinsId,
    ]);

    $db->prepare('DELETE FROM lab_brands WHERE id = ?')->execute([$biomnisId]);

    $sortMap = [
        'a1000001-0001-4001-8001-000000000008' => 7,
        'a1000001-0001-4001-8001-000000000009' => 8,
        'a1000001-0001-4001-8001-000000000010' => 9,
        'a1000001-0001-4001-8001-000000000011' => 10,
        'a1000001-0001-4001-8001-000000000012' => 11,
        'a1000001-0001-4001-8001-000000000013' => 12,
        'a1000001-0001-4001-8001-000000000014' => 13,
        'a1000001-0001-4001-8001-000000000015' => 14,
        'a1000001-0001-4001-8001-000000000016' => 15,
    ];
    $stmt = $db->prepare('UPDATE lab_brands SET sort_order = ?, updated_at = NOW() WHERE id = ?');
    foreach ($sortMap as $id => $order) {
        $stmt->execute([$order, $id]);
    }

    $db->commit();
    $count = (int) $db->query('SELECT COUNT(*) FROM lab_brands WHERE is_active = 1')->fetchColumn();
    echo "OK: Eurofins fusionné. Marques actives: $count\n";
} catch (Throwable $e) {
    $db->rollBack();
    fwrite(STDERR, 'ERR: ' . $e->getMessage() . "\n");
    exit(1);
}

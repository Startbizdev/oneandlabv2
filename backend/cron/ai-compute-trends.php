<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../lib/Logger.php';
require_once __DIR__ . '/../../../lib/ai/TrendEngine.php';

$logger = new Logger();
$config = require __DIR__ . '/../../../config/database.php';
$dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);
$engine = new TrendEngine($db);
$stmt = $db->query('SELECT id FROM profiles WHERE role = \'patient\' ORDER BY updated_at DESC LIMIT 100');
$count = 0;
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    try {
        $engine->computeForPatient((string) $row['id']);
        $count++;
    } catch (Throwable) {
    }
}
$logger->log(null, null, 'cron_ai_compute_trends', 'cron', null, ['patients' => $count]);
echo "ai-compute-trends: {$count} patients\n";

<?php

declare(strict_types=1);

require_once __DIR__ . '/../lib/Logger.php';
require_once __DIR__ . '/../lib/ai/TrendEngine.php';

$logger = new Logger();
$db = ai_db();
$engine = new TrendEngine($db);
$stmt = $db->query('SELECT id FROM profiles WHERE role = \'patient\' ORDER BY updated_at DESC LIMIT 100');
$count = 0;
$errors = 0;
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    try {
        $engine->computeForPatient((string) $row['id']);
        $count++;
    } catch (Throwable $e) {
        $errors++;
        error_log('ai-compute-trends patient ' . $row['id'] . ' : ' . $e->getMessage());
    }
}
$logger->log(null, null, 'cron_ai_compute_trends', 'cron', null, ['patients' => $count, 'errors' => $errors]);
echo "ai-compute-trends: {$count} patients, {$errors} erreurs\n";

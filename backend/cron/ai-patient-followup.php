<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../lib/Logger.php';
require_once __DIR__ . '/../lib/ai/AiPatientFollowupService.php';
require_once __DIR__ . '/../lib/rag/RagIndexer.php';
require_once __DIR__ . '/../lib/ai/AiMemoryService.php';

$logger = new Logger();
$followup = new AiPatientFollowupService();
$result = $followup->runDailyScan(250);

$indexer = new RagIndexer();
$memory = new AiMemoryService();
$config = require __DIR__ . '/../config/database.php';
$dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']);
$db = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);
$stmt = $db->query('SELECT id FROM profiles WHERE role = \'patient\' ORDER BY updated_at DESC LIMIT 50');
$indexed = 0;
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $pid = (string) $row['id'];
    try {
        $indexed += $indexer->indexPatient($pid);
        $memory->upsertMedicalSnapshot($pid, 'documents_index', ['refreshed' => true, 'at' => date('c')]);
    } catch (Throwable) {
        // continue
    }
}

$logger->log(null, null, 'cron_ai_patient_followup', 'cron', null, [
    'signals_created' => $result['signals_created'] ?? 0,
    'rag_points' => $indexed,
]);
echo 'ai-patient-followup: signals=' . ($result['signals_created'] ?? 0) . " rag_points={$indexed}\n";

<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../lib/Logger.php';
require_once __DIR__ . '/../lib/rag/AiDocumentJobService.php';

$logger = new Logger();
$jobs = new AiDocumentJobService();
$processed = $jobs->processPending(8);
$logger->log(null, null, 'cron_ai_document_ocr', 'cron', null, [
    'processed' => $processed,
]);
echo "ai-document-ocr: processed={$processed}\n";

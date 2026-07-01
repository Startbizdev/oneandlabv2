<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../lib/health/HealthRecordNudgeService.php';

$service = new HealthRecordNudgeService();
$result = $service->runDaily(250);
echo 'health-record-rdv-nudges: sent=' . ($result['sent'] ?? 0) . ' scanned=' . ($result['scanned'] ?? 0) . "\n";

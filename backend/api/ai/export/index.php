<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../lib/ai/bootstrap.php';
require_once __DIR__ . '/../../../lib/ai/AiExportService.php';

ai_handle_options(['GET', 'OPTIONS']);
$user = ai_require_user(['patient', 'pro', 'nurse', 'preleveur']);

$service = new AiExportService();
$data = $service->exportForUser((string) $user['user_id']);
header('Content-Type: application/json; charset=utf-8');
header('Content-Disposition: attachment; filename="cary-ai-export-' . date('Y-m-d') . '.json"');
echo json_encode(['success' => true, 'data' => $data], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
exit;

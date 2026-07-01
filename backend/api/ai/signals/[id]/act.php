<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../lib/ai/bootstrap.php';
require_once __DIR__ . '/../../../lib/ai/AiPatientFollowupService.php';

ai_handle_options(['POST', 'OPTIONS']);
$user = ai_require_user(['patient']);

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    ai_json_error('Méthode non autorisée', 405);
}

$id = $_GET['id'] ?? null;
if (!$id) {
    $uri = $_SERVER['REQUEST_URI'] ?? '';
    if (preg_match('#/ai/signals/([a-f0-9-]{36})/act#i', $uri, $m)) {
        $id = $m[1];
    }
}
if (!$id) {
    ai_json_error('ID signal requis', 400);
}

try {
    $service = new AiPatientFollowupService();
    $result = $service->actOnSignal((string) $id, $user);
    ai_json_response(['success' => true, 'data' => $result]);
} catch (RuntimeException $e) {
    ai_json_error($e->getMessage(), 404);
}

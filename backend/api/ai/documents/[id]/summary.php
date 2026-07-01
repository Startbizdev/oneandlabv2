<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../../lib/ai/bootstrap.php';
require_once __DIR__ . '/../../../../lib/rag/AiDocumentJobService.php';

ai_handle_options(['GET', 'OPTIONS']);
$user = ai_require_user(['patient', 'pro', 'nurse', 'preleveur']);

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    ai_json_error('Méthode non autorisée', 405);
}

$id = $_GET['id'] ?? null;
if (!$id) {
    $uri = $_SERVER['REQUEST_URI'] ?? '';
    if (preg_match('#/ai/documents/([a-f0-9-]{36})/summary#i', $uri, $m)) {
        $id = $m[1];
    }
}
if (!$id) {
    ai_json_error('ID document requis', 400);
}

$jobs = new AiDocumentJobService();
$summary = $jobs->getSummaryForDocument((string) $id, (string) $user['user_id']);
if (!$summary) {
    ai_json_error('Résumé non disponible', 404);
}

ai_json_response(['success' => true, 'data' => $summary]);

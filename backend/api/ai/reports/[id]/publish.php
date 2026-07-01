<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../../lib/ai/bootstrap.php';
require_once __DIR__ . '/../../../../lib/ai/AiReportService.php';

ai_handle_options(['POST', 'OPTIONS']);
$user = ai_require_user(['nurse', 'pro', 'preleveur']);
$id = trim((string) ($_GET['id'] ?? ''));
if ($id === '') {
    ai_json_error('Identifiant requis', 400);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    ai_json_error('Méthode non autorisée', 405);
}

$service = new AiReportService();
$report = $service->publish($id, (string) $user['user_id']);
if (!$report) {
    ai_json_error('Rapport introuvable ou statut invalide', 404);
}
ai_json_response(['success' => true, 'data' => $report]);

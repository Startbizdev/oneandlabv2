<?php

declare(strict_types=1);

// Faux fournisseur Chat Completions (php -S) : /ok/chat/completions streame texte + appel d'outil en morceaux,
// /error/chat/completions répond 500.
$body = json_decode((string) file_get_contents('php://input'), true) ?: [];
if (str_starts_with((string) ($_SERVER['REQUEST_URI'] ?? ''), '/error/')) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => ['message' => 'boom', 'code' => 'internal']]);

    return;
}
header('Content-Type: text/event-stream');
$model = (string) ($body['model'] ?? '');
$chunks = [
    ['model' => $model, 'choices' => [['delta' => ['role' => 'assistant', 'content' => 'Bon']]]],
    ['choices' => [['delta' => ['content' => 'jour']]]],
];
if (!empty($body['tools'])) {
    $chunks[] = ['choices' => [['delta' => ['tool_calls' => [['index' => 0, 'id' => 'call_1', 'type' => 'function', 'function' => ['name' => 'get_my_appointments', 'arguments' => '']]]]]]];
    $chunks[] = ['choices' => [['delta' => ['tool_calls' => [['index' => 0, 'function' => ['arguments' => '{"per']]]]]]];
    $chunks[] = ['choices' => [['delta' => ['tool_calls' => [['index' => 0, 'function' => ['arguments' => 'iod":"past"}']]]]]]];
}
$chunks[] = ['choices' => [['delta' => [], 'finish_reason' => 'stop']], 'usage' => ['prompt_tokens' => 42, 'completion_tokens' => 7]];
foreach ($chunks as $chunk) {
    echo 'data: ' . json_encode($chunk) . "\n\n";
    flush();
}
echo "data: [DONE]\n\n";

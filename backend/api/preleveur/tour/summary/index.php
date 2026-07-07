<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../../lib/preleveur-tour/bootstrap.php';
require_once __DIR__ . '/../../../../lib/preleveur-tour/PreleveurTourService.php';

preleveur_tour_handle_options(['GET', 'OPTIONS']);
$user = preleveur_tour_require_preleveur();
$preleveurId = (string) ($user['user_id'] ?? '');

$from = preleveur_tour_parse_date($_GET['from'] ?? null);
$to = preleveur_tour_parse_date($_GET['to'] ?? $from);
if ($from > $to) {
    [$from, $to] = [$to, $from];
}

try {
    $service = new PreleveurTourService();
    preleveur_tour_json_response([
        'success' => true,
        'data' => [
            'from' => $from,
            'to' => $to,
            'counts' => $service->getSummaryRange($preleveurId, $from, $to),
        ],
    ]);
} catch (Throwable $e) {
    error_log('[preleveur/tour/summary] ' . $e->getMessage());
    preleveur_tour_json_error('Résumé tournée indisponible', 500);
}

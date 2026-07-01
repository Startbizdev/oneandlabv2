<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../../lib/nurse-tour/bootstrap.php';
require_once __DIR__ . '/../../../../lib/nurse-tour/NurseTourService.php';

nurse_tour_handle_options(['GET', 'OPTIONS']);
$user = nurse_tour_require_nurse();
$nurseId = (string) ($user['user_id'] ?? '');

$from = nurse_tour_parse_date($_GET['from'] ?? null);
$to = nurse_tour_parse_date($_GET['to'] ?? $from);
if ($from > $to) {
    [$from, $to] = [$to, $from];
}

try {
    $service = new NurseTourService();
    nurse_tour_json_response([
        'success' => true,
        'data' => [
            'from' => $from,
            'to' => $to,
            'counts' => $service->getSummaryRange($nurseId, $from, $to),
        ],
    ]);
} catch (Throwable $e) {
    error_log('[nurse/tour/summary] ' . $e->getMessage());
    nurse_tour_json_error('Résumé tournée indisponible', 500);
}

<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../lib/nurse-tour/bootstrap.php';
require_once __DIR__ . '/../../../lib/nurse-tour/TourIcsExporter.php';

nurse_tour_handle_options(['GET', 'OPTIONS']);
$user = nurse_tour_require_nurse();
$nurseId = (string) ($user['user_id'] ?? '');
$date = nurse_tour_parse_date($_GET['date'] ?? null);

try {
    $exporter = new TourIcsExporter();
    $ics = $exporter->exportDay($nurseId, $date);
    header('Content-Type: text/calendar; charset=utf-8');
    header('Content-Disposition: attachment; filename="tournee-' . $date . '.ics"');
    echo $ics;
    exit;
} catch (Throwable $e) {
    error_log('[nurse/tour/calendar.ics] ' . $e->getMessage());
    nurse_tour_json_error('Export ICS impossible', 500);
}

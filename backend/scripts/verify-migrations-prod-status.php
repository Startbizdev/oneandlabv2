<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';

$config = require __DIR__ . '/../config/database.php';
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$pdo = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);

$checks = [
    '088 health_record_schema' => "SHOW TABLES LIKE 'health_record_schema'",
    '089 health_record_answers' => "SHOW TABLES LIKE 'health_record_answers'",
    '090 health_record_completion' => "SHOW TABLES LIKE 'health_record_completion'",
    '091 health_record_nudges' => "SHOW TABLES LIKE 'health_record_nudges'",
    '091 care_gap_actions' => "SHOW TABLES LIKE 'care_gap_actions'",
    '092 nurse_tour_plans' => "SHOW TABLES LIKE 'nurse_tour_plans'",
    '092 nurse_tour_stops' => "SHOW TABLES LIKE 'nurse_tour_stops'",
    '093 nurse_passage_series' => "SHOW TABLES LIKE 'nurse_passage_series'",
    '093 appointments.passage_series_id' => "SHOW COLUMNS FROM appointments LIKE 'passage_series_id'",
    '093 appointments.passage_source' => "SHOW COLUMNS FROM appointments LIKE 'passage_source'",
    '094 notif_nurse_en_route_sent_at' => "SHOW COLUMNS FROM nurse_tour_stops LIKE 'notif_nurse_en_route_sent_at'",
    '095 patient_clinical_vitals' => "SHOW TABLES LIKE 'patient_clinical_vitals'",
    '096 patient_absences' => "SHOW TABLES LIKE 'patient_absences'",
    '097 offer_modal_snoozed_until' => "SHOW COLUMNS FROM appointment_offers LIKE 'modal_snoozed_until'",
    '098 preleveur_tour_plans' => "SHOW TABLES LIKE 'preleveur_tour_plans'",
    '098 preleveur_tour_stops' => "SHOW TABLES LIKE 'preleveur_tour_stops'",
    '101 lab_brands' => "SHOW TABLES LIKE 'lab_brands'",
    '101 appointments.lab_preference_mode' => "SHOW COLUMNS FROM appointments LIKE 'lab_preference_mode'",
    '101 appointments.preferred_lab_brand_id' => "SHOW COLUMNS FROM appointments LIKE 'preferred_lab_brand_id'",
    '103 coverage_zones.zone_type' => "SHOW COLUMNS FROM coverage_zones LIKE 'zone_type'",
    '103 coverage_zones.bounds_json' => "SHOW COLUMNS FROM coverage_zones LIKE 'bounds_json'",
];

echo "DB: {$config['database']}\n";
echo str_repeat('-', 50) . "\n";

foreach ($checks as $label => $sql) {
    try {
        $stmt = $pdo->query($sql);
        $row = $stmt ? $stmt->fetch(PDO::FETCH_ASSOC) : false;
        $ok = $row !== false && $row !== null && $row !== [];
        echo ($ok ? 'OK  ' : 'MISS') . "  $label\n";
    } catch (Throwable $e) {
        echo 'ERR  ' . $label . ' — ' . $e->getMessage() . "\n";
    }
}

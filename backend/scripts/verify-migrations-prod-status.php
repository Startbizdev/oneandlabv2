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
    '118 nurse_passage_series.time_slot all_day' => "
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'nurse_passage_series'
          AND COLUMN_NAME = 'time_slot' AND COLUMN_TYPE LIKE '%''all_day''%'
    ",
    '120 appointment_nursing_items.done_at' => "SHOW COLUMNS FROM appointment_nursing_items LIKE 'done_at'",
    '094 notif_nurse_en_route_sent_at' => "SHOW COLUMNS FROM nurse_tour_stops LIKE 'notif_nurse_en_route_sent_at'",
    '095 patient_clinical_vitals' => "SHOW TABLES LIKE 'patient_clinical_vitals'",
    '096 patient_absences' => "SHOW TABLES LIKE 'patient_absences'",
    '119 patient_absences.end_date nullable' => "
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'patient_absences'
          AND COLUMN_NAME = 'end_date' AND IS_NULLABLE = 'YES'
    ",
    '121 patient_phones' => "SHOW TABLES LIKE 'patient_phones'",
    '122 patient_transmissions' => "SHOW TABLES LIKE 'patient_transmissions'",
    '097 offer_modal_snoozed_until' => "SHOW COLUMNS FROM appointment_offers LIKE 'modal_snoozed_until'",
    '098 preleveur_tour_plans' => "SHOW TABLES LIKE 'preleveur_tour_plans'",
    '098 preleveur_tour_stops' => "SHOW TABLES LIKE 'preleveur_tour_stops'",
    '101 lab_brands' => "SHOW TABLES LIKE 'lab_brands'",
    '101 appointments.lab_preference_mode' => "SHOW COLUMNS FROM appointments LIKE 'lab_preference_mode'",
    '101 appointments.preferred_lab_brand_id' => "SHOW COLUMNS FROM appointments LIKE 'preferred_lab_brand_id'",
    '104 coverage_zones.zone_type polygon' => "SHOW COLUMNS FROM coverage_zones LIKE 'zone_type'",
    '103 coverage_zones.bounds_json' => "SHOW COLUMNS FROM coverage_zones LIKE 'bounds_json'",
    '116 lab_brand_labs' => "SHOW TABLES LIKE 'lab_brand_labs'",
    '117 patient_professional_access.source lab_assignment' => "
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'patient_professional_access'
          AND COLUMN_NAME = 'source' AND COLUMN_TYPE LIKE '%''lab_assignment''%'
    ",
    '124 ai_messages.seq' => "SHOW COLUMNS FROM ai_messages LIKE 'seq'",
    '124 ai_messages.client_message_id' => "SHOW COLUMNS FROM ai_messages LIKE 'client_message_id'",
    '124 ai_messages.reply_to_message_id' => "SHOW COLUMNS FROM ai_messages LIKE 'reply_to_message_id'",
    '125 ai_conversations.context_type' => "SHOW COLUMNS FROM ai_conversations LIKE 'context_type'",
    '125 ai_conversations.context_id' => "SHOW COLUMNS FROM ai_conversations LIKE 'context_id'",
    '126 patient_relatives.profile_id' => "SHOW COLUMNS FROM patient_relatives LIKE 'profile_id'",
    '127 nurse_collaborations' => "SHOW TABLES LIKE 'nurse_collaborations'",
    '128 medical_documents.replaced_by_document_id' => "SHOW COLUMNS FROM medical_documents LIKE 'replaced_by_document_id'",
    '109 Pansement-plaie wound_type lourd' => "
        SELECT 1
        FROM care_category_options cco
        INNER JOIN care_categories cc ON cc.id = cco.care_category_id
        WHERE cc.name = 'Pansement-plaie'
          AND cc.type = 'nursing'
          AND cco.option_key = 'wound_type'
          AND JSON_SEARCH(cco.options, 'one', 'lourd', NULL, '$[*].value') IS NOT NULL
        LIMIT 1
    ",
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

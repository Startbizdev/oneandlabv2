<?php

declare(strict_types=1);

// Run over SSH via stdin with CARY_PROJECT_ROOT set. Never prints credentials or patient records.
$root = getenv('CARY_PROJECT_ROOT') ?: dirname(__DIR__, 2);
$config = require $root . '/backend/config/database.php';
$report = ['generated_at' => gmdate('c'), 'mode' => 'read-only', 'checks' => []];
try {
    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $config['host'], $config['port'], $config['database']);
    $db = new PDO($dsn, $config['username'], $config['password'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $db->exec('SET SESSION MAX_EXECUTION_TIME = 10000');
    $db->exec('START TRANSACTION READ ONLY');
    $queries = [
        'schema' => "SELECT table_name, column_name, column_type, is_nullable FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name IN ('appointments','appointment_status_updates','appointment_blood_test_items','appointment_nursing_items','patient_booking_drafts','subscriptions') ORDER BY table_name,ordinal_position",
        'connection_timezone' => 'SELECT @@session.time_zone AS session_time_zone, @@system_time_zone AS system_time_zone',
        'draft_payment_indexes' => "SELECT index_name, non_unique, column_name, seq_in_index FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'patient_booking_drafts' ORDER BY index_name,seq_in_index",
        'appointments' => 'SELECT type,status,COUNT(*) AS total FROM appointments GROUP BY type,status',
        'batch_count' => 'SELECT COUNT(*) AS total FROM (SELECT creation_batch_id FROM appointments WHERE creation_batch_id IS NOT NULL GROUP BY creation_batch_id HAVING COUNT(*) > 1) b',
        'multi_patient_batches' => 'SELECT COUNT(*) AS total FROM (SELECT creation_batch_id FROM appointments WHERE creation_batch_id IS NOT NULL GROUP BY creation_batch_id HAVING COUNT(DISTINCT patient_id) > 1) b',
        'orphan_blood_items' => 'SELECT COUNT(*) AS total FROM appointment_blood_test_items i LEFT JOIN appointments a ON a.id=i.appointment_id WHERE a.id IS NULL',
        'orphan_nursing_items' => 'SELECT COUNT(*) AS total FROM appointment_nursing_items i LEFT JOIN appointments a ON a.id=i.appointment_id WHERE a.id IS NULL',
        'missing_merged_parent' => 'SELECT COUNT(*) AS total FROM appointments a LEFT JOIN appointments p ON p.id=a.merged_into_appointment_id WHERE a.merged_into_appointment_id IS NOT NULL AND p.id IS NULL',
        'drafts' => 'SELECT status,COUNT(*) AS total FROM patient_booking_drafts GROUP BY status',
        'subscriptions' => 'SELECT plan_slug,status,COUNT(*) AS total FROM subscriptions GROUP BY plan_slug,status',
        'duplicate_active_subscribers' => "SELECT COUNT(*) AS total FROM (SELECT user_id FROM subscriptions WHERE status IN ('active','trialing') GROUP BY user_id HAVING COUNT(*) > 1) s",
        'paid_drafts_without_ids' => "SELECT COUNT(*) AS total FROM patient_booking_drafts WHERE status='completed' AND (created_appointment_ids_json IS NULL OR created_appointment_ids_json = '[]')",
    ];
    foreach ($queries as $name => $sql) {
        try {
            $report['checks'][$name] = $db->query($sql)->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $error) {
            $report['checks'][$name] = ['unavailable' => true, 'sqlstate' => (string) $error->getCode()];
        }
    }
    $db->exec('ROLLBACK');
    echo json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . PHP_EOL;
} catch (Throwable $error) {
    fwrite(STDERR, 'Read-only audit unavailable (' . get_class($error) . ').' . PHP_EOL);
    exit(1);
}

<?php
declare(strict_types=1);

// Aggregate counts only. No profile identifiers, emails, patient data or credentials leave the server.
$root = getenv('CARY_PROJECT_ROOT') ?: dirname(__DIR__, 2);
$config = require $root . '/backend/config/database.php';
$clock = new DateTimeImmutable('now', new DateTimeZone('Europe/Paris'));
$start = $clock->modify('first day of this month')->setTime(0, 0)->format('Y-m-d H:i:s');
$end = $clock->modify('first day of next month')->setTime(0, 0)->format('Y-m-d H:i:s');
$report = ['generated_at' => gmdate('c'), 'mode' => 'read-only', 'month' => $clock->format('Y-m'), 'checks' => [],
    'limitations' => ['Subscription statuses are local records, not verified receipts.', 'Current month is incomplete.', 'No invoice amount or realized MRR is inferred from plan labels.']];
try {
    $db = new PDO(sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $config['host'], $config['port'], $config['database']), $config['username'], $config['password'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $db->exec('SET SESSION MAX_EXECUTION_TIME = 10000');
    $db->exec('START TRANSACTION READ ONLY');
    $queries = [
        'professional_accounts' => ["SELECT role, COUNT(*) AS total FROM profiles WHERE role IN ('nurse','lab','subaccount','preleveur','pro') GROUP BY role", []],
        'subscription_sources' => ["SELECT plan_slug, status, COALESCE(NULLIF(billing_source,''),'stripe') AS billing_source, COUNT(*) AS total FROM subscriptions GROUP BY plan_slug,status,COALESCE(NULLIF(billing_source,''),'stripe')", []],
        'store_sync_attention' => ["SELECT billing_source, COUNT(*) AS total FROM subscriptions WHERE billing_source IN ('apple','google') AND status IN ('active','trialing') AND current_period_end < ? GROUP BY billing_source", [$clock->format('Y-m-d H:i:s')]],
        'nurse_monthly_usage' => ["SELECT offer_group, usage_band, COUNT(*) AS accounts FROM (
            SELECT p.id,
                CASE WHEN EXISTS (SELECT 1 FROM subscriptions s WHERE s.user_id=p.id AND s.plan_slug='nurse_pro' AND s.status IN ('active','trialing')) THEN 'pro_status' ELSE 'free_status' END AS offer_group,
                CASE WHEN COUNT(a.id)=0 THEN '0' WHEN COUNT(a.id)<5 THEN '1-4' WHEN COUNT(a.id)<10 THEN '5-9' ELSE '10+' END AS usage_band
            FROM profiles p
            LEFT JOIN appointments a ON a.assigned_nurse_id=p.id
                AND a.status IN ('confirmed','planned','inProgress','completed')
                AND a.scheduled_at >= ? AND a.scheduled_at < ?
            WHERE p.role='nurse'
            GROUP BY p.id
        ) usage_counts GROUP BY offer_group,usage_band ORDER BY offer_group,usage_band", [$start, $end]],
    ];
    foreach ($queries as $name => [$sql, $params]) {
        try {
            $statement = $db->prepare($sql);
            $statement->execute($params);
            $report['checks'][$name] = $statement->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $error) {
            $report['checks'][$name] = ['unavailable' => true, 'sqlstate' => (string)$error->getCode()];
        }
    }
    $db->exec('ROLLBACK');
    echo json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . PHP_EOL;
} catch (Throwable $error) {
    fwrite(STDERR, 'Commercial read-only audit unavailable (' . get_class($error) . ').' . PHP_EOL);
    exit(1);
}

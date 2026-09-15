<?php
declare(strict_types=1);
require_once __DIR__ . '/../../lib/PaymentReceiptClaim.php';
require_once __DIR__ . '/mysql-fixture.php';

if (($argv[1] ?? '') === '--worker') {
    [$script, $flag, $database, $draftId, $signal] = $argv;
    $db = fixtureConnection($database);
    $started = microtime(true);
    $db->beginTransaction();
    try {
        $db->prepare('SELECT id FROM patient_booking_drafts WHERE id=? FOR UPDATE')->execute([$draftId]);
        PaymentReceiptClaim::claim($db, $draftId, 'apple', 'fixture-verified-receipt', 'fixture-product');
        if ($draftId === 'first') { file_put_contents($signal, 'claimed'); usleep(700000); }
        $db->prepare('INSERT INTO fixture_creations VALUES (?)')->execute([$draftId]);
        $db->prepare("UPDATE patient_booking_drafts SET status='completed', created_appointment_ids_json='[\"fixture-appointment\"]' WHERE id=?")->execute([$draftId]);
        $db->commit();
        $status = 'completed';
    } catch (PaymentReceiptAlreadyUsed) {
        $db->rollBack();
        $status = 'already_used';
    }
    echo json_encode(['status' => $status, 'elapsed' => microtime(true) - $started]);
    exit;
}

$admin = fixtureConnection();
$database = 'cary_refonte_test_' . bin2hex(random_bytes(6));
$admin->exec('CREATE DATABASE `' . $database . '`');
$db = fixtureConnection($database);
// Use the repository's real draft schema and receipt unique index.
foreach (['061_patient_booking_drafts.sql', '074_patient_booking_draft_iap.sql'] as $migration) {
    $db->exec(file_get_contents(__DIR__ . '/../../../database/migrations/' . $migration));
}
$db->exec('CREATE TABLE fixture_creations (draft_id VARCHAR(36) PRIMARY KEY) ENGINE=InnoDB');
foreach (['first', 'second', 'retry'] as $id) {
    $db->prepare("INSERT INTO patient_booking_drafts (id,user_id,payload_json,files_manifest_json,storage_subdir,expires_at) VALUES (?,?,'[]','{}','synthetic',DATE_ADD(NOW(),INTERVAL 1 DAY))")->execute([$id,'patient-' . $id]);
}
$checks = 0;
$check = static function (bool $condition, string $message) use (&$checks): void {
    if (!$condition) throw new RuntimeException($message);
    $checks++;
};
$launch = static function (string $id) use ($database): array {
    $signal = sys_get_temp_dir() . DIRECTORY_SEPARATOR . $database . '.receipt-signal';
    $process = proc_open([PHP_BINARY, '-d', 'extension=php_pdo_mysql.dll', __FILE__, '--worker', $database, $id, $signal], [0 => ['pipe','r'],1 => ['pipe','w'],2 => ['pipe','w']], $pipes, null, null, ['bypass_shell' => true]);
    if (!is_resource($process)) throw new RuntimeException('Worker unavailable');
    fclose($pipes[0]);
    return [$process,$pipes,$signal];
};
$finish = static function (array $worker): array {
    [$process,$pipes] = $worker;
    $result = stream_get_contents($pipes[1]); $error = stream_get_contents($pipes[2]);
    fclose($pipes[1]); fclose($pipes[2]);
    if (proc_close($process) !== 0) throw new RuntimeException('Worker failed: ' . $error);
    return json_decode($result, true, 512, JSON_THROW_ON_ERROR);
};
$first = $launch('first');
$deadline = microtime(true) + 5;
while (!is_file($first[2]) && microtime(true) < $deadline) usleep(10000);
if (!is_file($first[2])) { proc_terminate($first[0]); throw new RuntimeException('Receipt claim timeout'); }
$second = $launch('second');
$a = $finish($first); $b = $finish($second);
$check($a['status'] === 'completed', 'First receipt claim must complete');
$check($b['status'] === 'already_used', 'Second receipt claim must become an explicit conflict');
$check($b['elapsed'] > 0.3, 'Second claim must actually wait for the first transaction');
$check((int)$db->query('SELECT COUNT(*) FROM fixture_creations')->fetchColumn() === 1, 'Cannot create twice for one receipt');
$row = $db->query("SELECT status,stripe_checkout_session_id FROM patient_booking_drafts WHERE id='second'")->fetch(PDO::FETCH_ASSOC);
$check($row['status'] === 'pending_payment', 'Conflicting draft must remain retryable');
$check($row['stripe_checkout_session_id'] === null, 'Rejected receipt reference cannot remain');
$db->beginTransaction();
PaymentReceiptClaim::claim($db, 'retry', 'google', 'fixture-rollback-receipt', 'fixture-product');
$db->prepare('INSERT INTO fixture_creations VALUES (?)')->execute(['retry']);
$db->rollBack();
$check($db->query("SELECT stripe_checkout_session_id FROM patient_booking_drafts WHERE id='retry'")->fetchColumn() === null, 'Rollback must release receipt ownership');
$check((int)$db->query('SELECT COUNT(*) FROM fixture_creations')->fetchColumn() === 1, 'Rollback must remove created records');
$db->beginTransaction();
PaymentReceiptClaim::claim($db, 'retry', 'google', 'fixture-rollback-receipt', 'fixture-product');
$db->commit();
$check($db->query("SELECT status FROM patient_booking_drafts WHERE id='retry'")->fetchColumn() === 'paid_processing', 'Same receipt can be claimed after a rolled back attempt');
try { PaymentReceiptClaim::claim($db,'second','apple','fixture-reference','fixture-product'); $check(false,'Unprotected claim accepted'); }
catch (LogicException) { $check(true,'Transaction required'); }
echo "$checks MySQL assertions passed: concurrent receipt reuse, explicit conflict, rollback and retry on the existing draft schema. No store or payment API called.\n";

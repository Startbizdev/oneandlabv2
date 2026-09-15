<?php
declare(strict_types=1);
require_once __DIR__ . '/../../lib/NurseQuotaGuard.php';

require_once __DIR__ . '/mysql-fixture.php';

if (($argv[1] ?? '') === '--worker') {
    [$script, $flag, $database, $operation, $signal] = $argv;
    $db = fixtureConnection($database);
    $started = microtime(true);
    try {
        NurseQuotaGuard::run($db, 'nurse-a', 10, static function () use ($db, $operation, $signal): void {
            if ($operation === 'first') {
                file_put_contents($signal, 'locked');
                usleep(700000);
            }
            $id = $operation === 'first' ? 'first' : 'second';
            $db->prepare("UPDATE appointments SET assigned_nurse_id='nurse-a', status='confirmed' WHERE id=?")->execute([$id]);
            $db->prepare("INSERT INTO appointment_status_updates (appointment_id, actor_id, actor_role, status, created_at) VALUES (?, 'nurse-a', 'nurse', 'confirmed', NOW())")->execute([$id]);
        });
        $status = 'confirmed';
    } catch (NurseQuotaExceeded) {
        $status = 'quota';
    }
    echo json_encode(['status' => $status, 'elapsed' => microtime(true) - $started]);
    exit;
}

$admin = fixtureConnection();
$checks = 0;
$check = static function (bool $condition, string $message) use (&$checks): void {
    if (!$condition) throw new RuntimeException($message);
    $checks++;
};
$launch = static function (string $database, string $operation, string $signal): array {
    $process = proc_open([PHP_BINARY, '-d', 'extension=php_pdo_mysql.dll', __FILE__, '--worker', $database, $operation, $signal], [0 => ['pipe','r'], 1 => ['pipe','w'], 2 => ['pipe','w']], $pipes, null, null, ['bypass_shell' => true]);
    if (!is_resource($process)) throw new RuntimeException('Cannot launch fixture worker');
    fclose($pipes[0]);
    return [$process, $pipes];
};
$finish = static function (array $worker): array {
    [$process, $pipes] = $worker;
    $result = stream_get_contents($pipes[1]);
    $error = stream_get_contents($pipes[2]);
    fclose($pipes[1]); fclose($pipes[2]);
    if (proc_close($process) !== 0) throw new RuntimeException('Fixture worker failed: ' . $error);
    return json_decode($result, true, 512, JSON_THROW_ON_ERROR);
};

foreach (['confirmation', 'reassignment'] as $scenario) {
    $database = 'cary_refonte_test_' . bin2hex(random_bytes(6));
    $admin->exec('CREATE DATABASE `' . $database . '`');
    $db = fixtureConnection($database);
    $db->exec('CREATE TABLE profiles (id VARCHAR(64) PRIMARY KEY, role VARCHAR(32)) ENGINE=InnoDB');
    $db->exec("INSERT INTO profiles VALUES ('nurse-a','nurse'),('nurse-b','nurse')");
    $db->exec('CREATE TABLE appointments (id VARCHAR(64) PRIMARY KEY, assigned_nurse_id VARCHAR(64), status VARCHAR(32), scheduled_at DATETIME, INDEX (assigned_nurse_id)) ENGINE=InnoDB');
    $db->exec('CREATE TABLE appointment_status_updates (appointment_id VARCHAR(64), actor_id VARCHAR(64), actor_role VARCHAR(32), status VARCHAR(32), created_at TIMESTAMP) ENGINE=InnoDB');
    for ($i = 1; $i <= 9; $i++) $db->prepare("INSERT INTO appointments VALUES (?, 'nurse-a','confirmed', NOW())")->execute(['accepted-' . $i]);
    $db->exec("INSERT INTO appointments VALUES ('first', NULL, 'pending', NOW())");
    $db->prepare('INSERT INTO appointments VALUES (?, ?, ?, NOW())')->execute(['second', $scenario === 'reassignment' ? 'nurse-b' : null, $scenario === 'reassignment' ? 'confirmed' : 'pending']);
    $signal = sys_get_temp_dir() . DIRECTORY_SEPARATOR . $database . '.lock-signal';
    $first = $launch($database, 'first', $signal);
    $deadline = microtime(true) + 5;
    while (!is_file($signal) && microtime(true) < $deadline) usleep(10000);
    if (!is_file($signal)) { proc_terminate($first[0]); throw new RuntimeException('Lock acquisition timeout'); }
    $second = $launch($database, 'second', $signal);
    $a = $finish($first);
    $b = $finish($second);
    $check($a['status'] === 'confirmed', $scenario . ': first operation must commit');
    $check($b['status'] === 'quota', $scenario . ': concurrent operation must roll back');
    $check($b['elapsed'] > 0.3, $scenario . ': second connection must actually wait for the first lock');
    $check(NurseMonthlyAllowance::count($db, 'nurse-a') === 10, $scenario . ': quota cannot be exceeded');
    $check((int)$db->query('SELECT COUNT(*) FROM appointment_status_updates')->fetchColumn() === 1, $scenario . ': rejected history cannot remain');
    $secondRow = $db->query("SELECT assigned_nurse_id,status FROM appointments WHERE id='second'")->fetch(PDO::FETCH_ASSOC);
    $check($secondRow['assigned_nurse_id'] === ($scenario === 'reassignment' ? 'nurse-b' : null), $scenario . ': original assignment must survive');
    $check($secondRow['status'] === ($scenario === 'reassignment' ? 'confirmed' : 'pending'), $scenario . ': original status must survive');
    echo $scenario . ': serialized under ' . $db->query('SELECT @@transaction_isolation')->fetchColumn() . "\n";
}
echo "$checks MySQL concurrency assertions passed on loopback-only synthetic data.\n";

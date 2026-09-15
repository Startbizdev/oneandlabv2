<?php
declare(strict_types=1);
require_once __DIR__ . '/mysql-fixture.php';
require_once __DIR__ . '/../../models/Appointment.php';

function fixtureAppointment(PDO $db): array {
    $cryptoReflection = new ReflectionClass(Crypto::class);
    $crypto = $cryptoReflection->newInstanceWithoutConstructor();
    // Synthetic test key shared by fixture workers; never reads production configuration.
    $cryptoReflection->getProperty('kek')->setValue($crypto, str_repeat('f', 32));
    $reflection = new ReflectionClass(Appointment::class);
    $model = $reflection->newInstanceWithoutConstructor();
    $reflection->getProperty('db')->setValue($model, $db);
    $reflection->getProperty('crypto')->setValue($model, $crypto);
    $reflection->getProperty('logger')->setValue($model, new Logger($db));
    return [$model, $crypto];
}
function fixtureEdit(string $type, string $label): array {
    return ['scheduled_at' => '2026-10-15 10:00:00', 'form_data' => [
        'first_name' => 'Exemple',
        ($type === 'nursing' ? 'nursing_items' : 'blood_test_items') => [
            ['category_id'=>'10000000-0000-4000-8000-000000000001','label'=>$label,'care_options'=>['dose'=>2]],
            ['category_id'=>'10000000-0000-4000-8000-000000000002','label'=>'Additional act'],
        ],
    ]];
}
if (($argv[1] ?? '') === '--worker') {
    [$script,$flag,$database,$type,$order,$signal] = $argv;
    $db = fixtureConnection($database);
    [$model] = fixtureAppointment($db);
    $started = microtime(true);
    if ($order === 'first') $db->beginTransaction();
    $model->update('target', fixtureEdit($type, $order), 'fixture-admin', 'super_admin');
    if ($order === 'first') {
        file_put_contents($signal, 'updated');
        usleep(700000);
        $db->commit();
    }
    echo json_encode(['elapsed'=>microtime(true)-$started]);
    exit;
}
$checks = 0;
$check = static function (bool $condition) use (&$checks): void {
    if (!$condition) throw new RuntimeException('MySQL act edit regression ' . ($checks + 1));
    $checks++;
};
$launch = static function (array $args): array {
    $process = proc_open([PHP_BINARY,'-d','extension=php_pdo_mysql.dll',__FILE__,'--worker',...$args], [0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']], $pipes, null, null, ['bypass_shell'=>true]);
    if (!is_resource($process)) throw new RuntimeException('Fixture worker unavailable');
    fclose($pipes[0]);
    return [$process,$pipes];
};
$finish = static function (array $worker): array {
    [$process,$pipes] = $worker;
    $output = stream_get_contents($pipes[1]); $error = stream_get_contents($pipes[2]);
    fclose($pipes[1]); fclose($pipes[2]);
    if (proc_close($process) !== 0) throw new RuntimeException($error);
    return json_decode($output,true,512,JSON_THROW_ON_ERROR);
};
$admin = fixtureConnection();
foreach (['nursing','blood_test'] as $type) {
    $database = 'cary_refonte_test_' . bin2hex(random_bytes(6));
    $admin->exec('CREATE DATABASE `' . $database . '`');
    $db = fixtureConnection($database);
    $db->exec('CREATE TABLE appointments (id VARCHAR(36) PRIMARY KEY, type VARCHAR(32), status VARCHAR(32), scheduled_at DATETIME, form_data_encrypted LONGTEXT, form_data_dek LONGTEXT, updated_at DATETIME) ENGINE=InnoDB');
    $db->prepare("INSERT INTO appointments (id,type,status,scheduled_at) VALUES ('target',?,'pending','2026-10-15 09:00:00')")->execute([$type]);
    $table = 'appointment_' . ($type === 'nursing' ? 'nursing_items' : 'blood_test_items');
    $db->exec("CREATE TABLE {$table} (id VARCHAR(36) PRIMARY KEY, appointment_id VARCHAR(36), category_id VARCHAR(36), label VARCHAR(255) CHECK (label <> 'FAIL'), care_options JSON, source_appointment_id VARCHAR(36), sort_order INT, created_at DATETIME, updated_at DATETIME, INDEX (appointment_id)) ENGINE=InnoDB");
    $db->exec("INSERT INTO {$table} VALUES ('retained','target','10000000-0000-4000-8000-000000000001','Original','{}','legacy-source',0,'2026-01-01 00:00:00',NULL),('other','another-patient',NULL,'Untouched','{}',NULL,0,'2026-01-01 00:00:00',NULL)");
    $db->exec('CREATE TABLE access_logs (user_id VARCHAR(36), role VARCHAR(32), action VARCHAR(32), resource_type VARCHAR(32), resource_id VARCHAR(36), details LONGTEXT, ip_address VARCHAR(64), user_agent TEXT, created_at DATETIME) ENGINE=InnoDB');
    $signal = sys_get_temp_dir() . DIRECTORY_SEPARATOR . $database . '.edit-signal';
    $first = $launch([$database,$type,'first',$signal]);
    $deadline = microtime(true) + 5;
    while (!is_file($signal) && microtime(true) < $deadline) usleep(10000);
    if (!is_file($signal)) { proc_terminate($first[0]); throw new RuntimeException('Edit lock timeout'); }
    $second = $launch([$database,$type,'second',$signal]);
    $finish($first);
    $b = $finish($second);
    $check($b['elapsed'] > 0.3);
    $rows = $db->query("SELECT * FROM {$table} WHERE appointment_id='target' ORDER BY sort_order")->fetchAll(PDO::FETCH_ASSOC);
    $check(count($rows) === 2);
    $check($rows[0]['id'] === 'retained' && $rows[0]['label'] === 'second');
    $check($rows[0]['source_appointment_id'] === 'legacy-source');
    $check($rows[0]['created_at'] === '2026-01-01 00:00:00');
    $check($db->query("SELECT label FROM {$table} WHERE id='other'")->fetchColumn() === 'Untouched');
    $check((int)$db->query('SELECT COUNT(*) FROM access_logs')->fetchColumn() === 2);
    [$model,$crypto] = fixtureAppointment($db);
    $before = $db->query("SELECT * FROM appointments WHERE id='target'")->fetch(PDO::FETCH_ASSOC);
    $stored = json_decode($crypto->decryptField($before['form_data_encrypted'],$before['form_data_dek']), true);
    $check($stored[$type === 'nursing' ? 'nursing_items' : 'blood_test_items'][0]['label'] === 'second');
    $bad = fixtureEdit($type,'FAIL');
    $bad['scheduled_at'] = '2026-10-16 11:00:00';
    try { $model->update('target',$bad,'fixture-admin','super_admin'); $check(false); }
    catch (PDOException) { $check(true); }
    $check($db->query("SELECT * FROM appointments WHERE id='target'")->fetch(PDO::FETCH_ASSOC) === $before);
    $check($db->query("SELECT * FROM {$table} WHERE appointment_id='target' ORDER BY sort_order")->fetchAll(PDO::FETCH_ASSOC) === $rows);
    $check((int)$db->query('SELECT COUNT(*) FROM access_logs')->fetchColumn() === 2);
    $check(!$db->inTransaction());
}
echo "$checks MySQL assertions passed against Appointment::update: concurrent parent/act edits, encryption coherence, stable legacy identities, isolation and full rollback.\n";

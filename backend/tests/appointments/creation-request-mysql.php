<?php
declare(strict_types=1);
require_once __DIR__ . '/mysql-fixture.php';
require_once __DIR__ . '/../../lib/AppointmentCreationRequest.php';

function createFixture(PDO $db, string $id): string {
    $db->prepare('INSERT INTO appointments VALUES (?)')->execute([$id]);
    $db->prepare('INSERT INTO acts VALUES (?)')->execute([$id]);
    return $id;
}
if (($argv[1] ?? '') === '--worker') {
    $db = fixtureConnection($argv[2]);
    echo AppointmentCreationRequest::run($db, 'actor', 'shared-request-0001', str_repeat('a',64), static function () use ($db): string {
        $id = bin2hex(random_bytes(16));
        createFixture($db, $id);
        usleep(500000);
        return $id;
    });
    exit;
}
$admin = fixtureConnection();
$database = 'cary_refonte_test_' . bin2hex(random_bytes(6));
$admin->exec('CREATE DATABASE `' . $database . '`');
$db = fixtureConnection($database);
$db->exec(file_get_contents(__DIR__ . '/../../../database/migrations/107_appointment_creation_requests.sql'));
$db->exec('CREATE TABLE appointments (id VARCHAR(36) PRIMARY KEY) ENGINE=InnoDB');
$db->exec('CREATE TABLE acts (appointment_id VARCHAR(36)) ENGINE=InnoDB');
$workers = [];
for ($i=0;$i<2;$i++) {
    $process = proc_open([PHP_BINARY,'-d','extension=php_pdo_mysql.dll',__FILE__,'--worker',$database], [0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']], $pipes, null, null, ['bypass_shell'=>true]);
    if (!is_resource($process)) throw new RuntimeException('Worker unavailable');
    fclose($pipes[0]); $workers[] = [$process,$pipes];
}
$ids=[];
foreach ($workers as [$process,$pipes]) {
    $ids[]=stream_get_contents($pipes[1]); $error=stream_get_contents($pipes[2]);
    fclose($pipes[1]);fclose($pipes[2]);
    if(proc_close($process)!==0) throw new RuntimeException($error);
}
$checks=0;
$check=static function(bool $ok) use (&$checks):void {if(!$ok)throw new RuntimeException('Creation request regression '.($checks+1));$checks++;};
$check($ids[0] === $ids[1] && $ids[0] !== '');
$check((int)$db->query('SELECT COUNT(*) FROM appointments')->fetchColumn() === 1);
$check((int)$db->query('SELECT COUNT(*) FROM acts')->fetchColumn() === 1);
$check(AppointmentCreationRequest::run($db,'actor','shared-request-0001',str_repeat('a',64),static function():never {throw new RuntimeException('Must not create after a lost response');}) === $ids[0]);
$ready = null;
AppointmentCreationRequest::run($db,'actor','shared-request-0001',str_repeat('a',64),static fn()=> 'wrong',static function(bool $value)use(&$ready):void{$ready=$value;});
$check($ready === false);
$db->exec("UPDATE appointment_creation_requests SET response_completed=1 WHERE actor_id='actor'");
AppointmentCreationRequest::run($db,'actor','shared-request-0001',str_repeat('a',64),static fn()=> 'wrong',static function(bool $value)use(&$ready):void{$ready=$value;});
$check($ready === true);
try {AppointmentCreationRequest::run($db,'actor','shared-request-0001',str_repeat('b',64),static fn()=> 'wrong');$check(false);} catch(AppointmentCreationConflict){$check(true);}
$check(AppointmentCreationRequest::run($db,'other-actor','shared-request-0001',str_repeat('a',64),static fn()=>createFixture($db,'other')) === 'other');
try {AppointmentCreationRequest::run($db,'actor','rollback-request-01',str_repeat('c',64),static function()use($db):never {createFixture($db,'rollback');throw new RuntimeException('Act/log failure');});}catch(RuntimeException){}
$check((int)$db->query("SELECT COUNT(*) FROM appointments WHERE id='rollback'")->fetchColumn() === 0);
$check((int)$db->query("SELECT COUNT(*) FROM acts WHERE appointment_id='rollback'")->fetchColumn() === 0);
$check((int)$db->query("SELECT COUNT(*) FROM appointment_creation_requests WHERE request_key='rollback-request-01'")->fetchColumn() === 0);
$check(AppointmentCreationRequest::run($db,'actor','rollback-request-01',str_repeat('c',64),static fn()=>createFixture($db,'retry')) === 'retry');
$db->beginTransaction();
AppointmentCreationRequest::run($db,'actor','outer-rollback-0001',str_repeat('d',64),static fn()=>createFixture($db,'outer'));
$db->rollBack();
$check((int)$db->query("SELECT COUNT(*) FROM appointments WHERE id='outer'")->fetchColumn() === 0);
$check((int)$db->query("SELECT COUNT(*) FROM appointment_creation_requests WHERE request_key='outer-rollback-0001'")->fetchColumn() === 0);
try{AppointmentCreationRequest::run($db,'actor','bad',str_repeat('a',64),static fn()=> 'bad');$check(false);}catch(AppointmentCreationConflict){$check(true);}
echo "$checks MySQL creation request assertions passed: concurrent retries, lost response replay, payload conflict, account isolation and atomic rollback.\n";

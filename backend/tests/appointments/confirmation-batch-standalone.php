<?php
declare(strict_types=1);
require_once __DIR__ . '/../../models/Appointment.php';
$db = new PDO('sqlite::memory:', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
$clock = new DateTimeImmutable('now', new DateTimeZone('Europe/Paris'));
$date = $clock->format('Y-m-d H:i:s');
$db->sqliteCreateFunction('NOW', static fn () => $date);
$db->exec("CREATE TABLE profiles (id TEXT PRIMARY KEY, role TEXT); INSERT INTO profiles VALUES ('fixture-nurse','nurse')");
$db->exec('CREATE TABLE subscriptions (user_id TEXT, plan_slug TEXT, status TEXT, updated_at TEXT)');
$db->exec('CREATE TABLE appointments (id TEXT PRIMARY KEY, type TEXT, status TEXT, assigned_nurse_id TEXT, assigned_lab_id TEXT, assigned_to TEXT, location_lat REAL, location_lng REAL, scheduled_at TEXT, patient_id TEXT, form_data_encrypted TEXT, form_data_dek TEXT, creation_batch_id TEXT, updated_at TEXT, nurse_share_released_at TEXT)');
$db->exec('CREATE TABLE appointment_status_updates (id TEXT, appointment_id TEXT, status TEXT, actor_id TEXT, actor_role TEXT, note TEXT, created_at TEXT)');
$db->exec('CREATE TABLE appointment_offers (appointment_id TEXT, profile_id TEXT)');
$db->exec('CREATE TABLE access_logs (user_id TEXT, role TEXT, action TEXT, resource_type TEXT, resource_id TEXT, details TEXT, ip_address TEXT, user_agent TEXT, created_at TEXT)');
$insert = $db->prepare('INSERT INTO appointments (id,type,status,assigned_nurse_id,scheduled_at,patient_id,creation_batch_id) VALUES (?, ?, ?, ?, ?, ?, ?)');
for ($i = 1; $i <= 9; $i++) $insert->execute(["accepted-$i",'nursing','confirmed','fixture-nurse',$date,'fixture-patient',null]);
foreach (['batch-a','batch-b'] as $id) {
    $insert->execute([$id,'nursing','pending',null,$date,'fixture-patient','fixture-batch']);
    $db->prepare('INSERT INTO appointment_offers VALUES (?, ?)')->execute([$id,'fixture-nurse']);
}
$reflection = new ReflectionClass(Appointment::class);
$model = $reflection->newInstanceWithoutConstructor();
$reflection->getProperty('db')->setValue($model, $db);
$reflection->getProperty('logger')->setValue($model, new Logger($db));
$checks = 0;
$check = static function (bool $condition) use (&$checks): void {
    if (!$condition) throw new RuntimeException('Confirmation batch regression: ' . ($checks + 1));
    $checks++;
};
try { $model->updateStatus('batch-a','confirmed','fixture-nurse','nurse'); $check(false); }
catch (NurseQuotaExceeded) { $check(true); }
$check((int)$db->query("SELECT COUNT(*) FROM appointments WHERE status='pending'")->fetchColumn() === 2);
$check((int)$db->query('SELECT COUNT(*) FROM appointment_offers')->fetchColumn() === 2);
$check((int)$db->query('SELECT COUNT(*) FROM appointment_status_updates')->fetchColumn() === 0);
$check((int)$db->query('SELECT COUNT(*) FROM access_logs')->fetchColumn() === 0);
$check(!$db->inTransaction());
// A failure during the second appointment's history must also restore the first appointment and its offers.
$db->exec("CREATE TRIGGER history_failure BEFORE INSERT ON appointment_status_updates WHEN NEW.appointment_id='batch-b' BEGIN SELECT RAISE(ABORT, 'Synthetic history failure'); END");
try { $model->updateStatus('batch-a','confirmed','fixture-nurse','nurse'); $check(false); }
catch (PDOException $error) { $check(str_contains($error->getMessage(), 'Synthetic history failure')); }
$check((int)$db->query("SELECT COUNT(*) FROM appointments WHERE status='pending'")->fetchColumn() === 2);
$check((int)$db->query('SELECT COUNT(*) FROM appointment_offers')->fetchColumn() === 2);
$check((int)$db->query('SELECT COUNT(*) FROM appointment_status_updates')->fetchColumn() === 0);
$check((int)$db->query('SELECT COUNT(*) FROM access_logs')->fetchColumn() === 0);
$check(!$db->inTransaction());
$db->exec("UPDATE appointments SET type='blood_test' WHERE id IN ('batch-a','batch-b')");
$db->exec('ALTER TABLE profiles ADD COLUMN lab_id TEXT');
$db->exec("INSERT INTO profiles (id,role,lab_id) VALUES ('fixture-lab','lab',NULL),('fixture-preleveur','preleveur','fixture-lab')");
foreach (['lab','preleveur'] as $role) {
    try { $model->updateStatus('batch-a','confirmed','fixture-' . $role,$role); $check(false); }
    catch (PDOException $error) { $check(str_contains($error->getMessage(), 'Synthetic history failure')); }
    $check((int)$db->query("SELECT COUNT(*) FROM appointments WHERE status='pending'")->fetchColumn() === 2);
    $check((int)$db->query('SELECT COUNT(*) FROM appointment_offers')->fetchColumn() === 2);
    $check((int)$db->query('SELECT COUNT(*) FROM appointment_status_updates')->fetchColumn() === 0);
    $check((int)$db->query('SELECT COUNT(*) FROM access_logs')->fetchColumn() === 0);
    $check(!$db->inTransaction());
}
echo "$checks assertions passed against Appointment::updateStatus: nurse quota rejection and nurse/lab/preleveur history failure restore the entire legacy batch, offers and logs before notifications.\n";

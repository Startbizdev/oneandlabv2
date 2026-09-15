<?php
declare(strict_types=1);
require_once __DIR__ . '/mysql-fixture.php';
require_once __DIR__ . '/../../models/User.php';
$admin = fixtureConnection();
$database = 'cary_refonte_test_' . bin2hex(random_bytes(6));
$admin->exec('CREATE DATABASE `' . $database . '`');
$db = fixtureConnection($database);
$fields = ['first_name','last_name','phone','address','gender','birth_date','nir'];
$columns = ['id VARCHAR(36) PRIMARY KEY', 'role VARCHAR(32)', 'updated_at DATETIME', 'phone_digits_hash VARCHAR(255)', 'city_plain VARCHAR(255)'];
foreach ($fields as $field) { $columns[] = $field . '_encrypted LONGTEXT'; $columns[] = $field . '_dek LONGTEXT'; }
$db->exec('CREATE TABLE profiles (' . implode(',', $columns) . ') ENGINE=InnoDB');
$db->exec('CREATE TABLE access_logs (user_id VARCHAR(36), role VARCHAR(32), action VARCHAR(32), resource_type VARCHAR(32), resource_id VARCHAR(36), details LONGTEXT, ip_address VARCHAR(64), user_agent TEXT, created_at DATETIME) ENGINE=InnoDB');
$cryptoReflection = new ReflectionClass(Crypto::class);
$crypto = $cryptoReflection->newInstanceWithoutConstructor();
$cryptoReflection->getProperty('kek')->setValue($crypto, random_bytes(32));
$row = ['id'=>'fixture-patient','role'=>'patient','phone_digits_hash'=>'fixture-hash','city_plain'=>'Ville fictive'];
foreach (['first_name'=>'Alice','last_name'=>'Exemple','phone'=>'0600000000','address'=>'{"label":"Adresse fictive"}','gender'=>'female','birth_date'=>'1980-03-15','nir'=>'fixture-nir'] as $field=>$value) {
    $encoded = $crypto->encryptField($value);
    $row[$field . '_encrypted'] = $encoded['encrypted']; $row[$field . '_dek'] = $encoded['dek'];
}
$db->prepare('INSERT INTO profiles (' . implode(',', array_keys($row)) . ') VALUES (' . implode(',', array_fill(0, count($row), '?')) . ')')->execute(array_values($row));
$reflection = new ReflectionClass(User::class);
$model = $reflection->newInstanceWithoutConstructor();
$reflection->getProperty('db')->setValue($model, $db);
$reflection->getProperty('crypto')->setValue($model, $crypto);
$reflection->getProperty('logger')->setValue($model, new Logger($db));
$checks = 0;
$check = static function (bool $condition) use (&$checks): void { if (!$condition) throw new RuntimeException('Profile fields regression ' . ($checks + 1)); $checks++; };
$check($model->update('fixture-patient', ['phone'=>null,'address'=>null,'gender'=>null,'birth_date'=>null,'nir'=>null], 'fixture-patient','patient'));
$cleared = $db->query("SELECT * FROM profiles WHERE id='fixture-patient'")->fetch(PDO::FETCH_ASSOC);
foreach (['phone','address','gender','birth_date','nir'] as $field) $check($cleared[$field . '_encrypted'] === null && $cleared[$field . '_dek'] === null);
$check($cleared['phone_digits_hash'] === null);
$check($cleared['city_plain'] === null);
$check($crypto->decryptField($cleared['first_name_encrypted'],$cleared['first_name_dek']) === 'Alice');
$check($model->update('fixture-patient', ['first_name'=>'Alicia'], 'fixture-patient','patient'));
$updated = $db->query("SELECT * FROM profiles WHERE id='fixture-patient'")->fetch(PDO::FETCH_ASSOC);
$check($crypto->decryptField($updated['last_name_encrypted'],$updated['last_name_dek']) === 'Exemple');
$check($updated['phone_encrypted'] === null);
$logs = $db->query('SELECT details FROM access_logs')->fetchAll(PDO::FETCH_COLUMN);
$check(count($logs) === 2 && !str_contains(implode('', $logs), 'Alicia'));
echo "$checks MySQL assertions passed: explicit personal-field clearing, encryption-key removal, phone/city index cleanup, omitted-field preservation and value-free logs.\n";

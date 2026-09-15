<?php
declare(strict_types=1);
require_once __DIR__ . '/../../models/PatientRelative.php';
$db = new PDO('sqlite::memory:');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$db->sqliteCreateFunction('NOW', fn () => '2026-09-15 12:00:00');
$cryptoClass = new ReflectionClass(Crypto::class);
$crypto = $cryptoClass->newInstanceWithoutConstructor();
$cryptoClass->getProperty('kek')->setValue($crypto, random_bytes(32));
$data = ['id' => 'relative', 'patient_id' => 'owner', 'relationship_type' => 'parent', 'created_at' => '2026-09-15', 'updated_at' => '2026-09-15', 'email_hash' => 'fixture'];
foreach (['first_name' => 'Alice', 'last_name' => 'Exemple', 'email' => 'fixture@example.invalid', 'phone' => '0600000000', 'address' => '{"label":"Adresse fictive"}', 'gender' => 'female', 'birth_date' => '1960-03-15'] as $field => $value) {
    $encrypted = $crypto->encryptField($value);
    $data[$field . '_encrypted'] = $encrypted['encrypted'];
    $data[$field . '_dek'] = $encrypted['dek'];
}
$db->exec('CREATE TABLE patient_relatives (' . implode(', ', array_map(fn ($field) => $field . ' TEXT', array_keys($data))) . ')');
$db->prepare('INSERT INTO patient_relatives VALUES (' . implode(', ', array_fill(0, count($data), '?')) . ')')->execute(array_values($data));
$db->exec('CREATE TABLE access_logs (user_id TEXT, role TEXT, action TEXT, resource_type TEXT, resource_id TEXT, details TEXT, ip_address TEXT, user_agent TEXT, created_at TEXT)');
$model = new PatientRelative($db, $crypto);
$checks = 0;
$check = static function (bool $condition) use (&$checks): void {
    if (!$condition) throw new RuntimeException('Relative update regression: ' . ($checks + 1));
    $checks++;
};
$check($model->update('relative', ['email' => null, 'address' => null], 'owner'));
$row = $model->getById('relative', 'owner');
$check($row['email'] === null);
$check($row['address'] === null);
$check($row['phone'] === '0600000000');
$check($row['first_name'] === 'Alice');
$check($model->update('relative', ['phone' => null, 'gender' => null, 'birth_date' => null], 'owner'));
$row = $model->getById('relative', 'owner');
$check($row['phone'] === null && $row['gender'] === null && $row['birth_date'] === null);
$check($model->update('relative', ['first_name' => 'Alicia'], 'other-owner') === false);
$check($model->getById('relative', 'other-owner') === null);
$check($model->update('relative', ['first_name' => 'Alicia'], 'owner'));
$check($model->getById('relative', 'owner')['first_name'] === 'Alicia');
$details = $db->query('SELECT details FROM access_logs')->fetchAll(PDO::FETCH_COLUMN);
$check(!str_contains(implode('', $details), 'Alicia') && count($details) === 3);
echo "$checks assertions passed: explicit optional-field removal, omitted-field preservation, encrypted identity and ownership isolation.\n";

<?php

declare(strict_types=1);
require_once __DIR__ . '/../../lib/DatabaseTransaction.php';
require_once __DIR__ . '/../../lib/AppointmentItemsWriter.php';

$checks = 0;
$check = static function (bool $condition, string $message) use (&$checks): void {
    if (!$condition) throw new RuntimeException($message);
    $checks++;
};
foreach (['nursing', 'blood_test'] as $type) {
    $db = new PDO('sqlite::memory:', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $table = 'appointment_' . ($type === 'nursing' ? 'nursing_items' : 'blood_test_items');
    $db->exec('CREATE TABLE appointments (id TEXT PRIMARY KEY, note TEXT)');
    $db->exec("INSERT INTO appointments VALUES ('target', 'original')");
    $db->exec("CREATE TABLE {$table} (id TEXT PRIMARY KEY, appointment_id TEXT, category_id TEXT, label TEXT CHECK(label != 'FAIL'), care_options TEXT, source_appointment_id TEXT, sort_order INTEGER, created_at TEXT, updated_at TEXT)");
    $db->exec("INSERT INTO {$table} VALUES ('retained', 'target', 'category-a', 'Old', '{}', 'legacy-source', 0, 'old-date', 'old-date'), ('removed', 'target', 'category-b', 'Second', '{}', NULL, 1, 'old-date', 'old-date'), ('other', 'another-patient', 'category-a', 'Untouched', '{}', NULL, 0, 'old-date', 'old-date')");
    $next = 0;
    $newId = static function () use (&$next): string { return 'new-' . ++$next; };
    $rows = static fn (): array => $db->query("SELECT * FROM {$table} ORDER BY appointment_id, sort_order")->fetchAll(PDO::FETCH_ASSOC);
    $before = $rows();
    try {
        DatabaseTransaction::run($db, static function () use ($db, $type, $newId): void {
            $db->exec("UPDATE appointments SET note = 'changed'");
            AppointmentItemsWriter::replace($db, $type, 'target', [
                ['category_id' => 'category-a', 'label' => 'Updated', 'care_options' => ['dose' => 2]],
                ['category_id' => 'new-category', 'label' => 'FAIL'],
            ], $newId);
        });
        throw new RuntimeException('Expected constraint failure');
    } catch (PDOException $expected) {
        $check($rows() === $before, 'Act edit survived failed transaction');
        $check($db->query('SELECT note FROM appointments')->fetchColumn() === 'original', 'Parent edit survived failed act');
    }
    $items = [['category_id' => 'category-a', 'label' => 'Updated', 'care_options' => ['dose' => 2], 'source_appointment_id' => 'forged-source']];
    DatabaseTransaction::run($db, static fn () => AppointmentItemsWriter::replace($db, $type, 'target', $items, $newId));
    $after = $rows();
    $check(count($after) === 2, 'Unexpected row removal');
    $check($after[0]['id'] === 'other' && $after[0]['label'] === 'Untouched', 'Other appointment modified');
    $check($after[1]['id'] === 'retained', 'Existing act identity replaced');
    $check($after[1]['source_appointment_id'] === 'legacy-source', 'Legacy source overwritten');
    $check($after[1]['created_at'] === 'old-date', 'Original creation date overwritten');
    $check(json_decode($after[1]['care_options'], true) === ['dose' => 2], 'Care options not updated');
    DatabaseTransaction::run($db, static fn () => AppointmentItemsWriter::replace($db, $type, 'target', $items, $newId));
    $check(count($rows()) === 2 && $next === 0, 'Retry duplicated acts');
    $items[] = ['category_id' => 'category-new', 'label' => 'Added'];
    DatabaseTransaction::run($db, static fn () => AppointmentItemsWriter::replace($db, $type, 'target', $items, $newId));
    $check(count($rows()) === 3 && $next === 1, 'New act missing');
    try {
        DatabaseTransaction::run($db, static fn () => AppointmentItemsWriter::replace($db, $type, 'target', [], $newId));
        throw new RuntimeException('Expected empty edit rejection');
    } catch (InvalidArgumentException $expected) {
        $check(count($rows()) === 3, 'Empty edit removed acts');
    }
    try {
        AppointmentItemsWriter::replace($db, $type, 'target', $items, $newId);
        throw new RuntimeException('Expected transaction guard');
    } catch (LogicException $expected) { $check(!$db->inTransaction(), 'Transaction guard failed'); }
}
echo "{$checks} assertions passed: atomic clinical act edits, stable identities and isolated appointments.\n";

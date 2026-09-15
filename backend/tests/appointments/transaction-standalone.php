<?php

declare(strict_types=1);

require_once __DIR__ . '/../../lib/DatabaseTransaction.php';

// Only an isolated in-memory database; no application configuration or credentials.
$db = new PDO('sqlite::memory:', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$db->exec('PRAGMA foreign_keys = ON');
$db->exec('CREATE TABLE appointments (id TEXT PRIMARY KEY)');
$db->exec('CREATE TABLE acts (id TEXT PRIMARY KEY, appointment_id TEXT REFERENCES appointments(id), label TEXT NOT NULL)');
$checks = 0;
$check = static function (bool $condition, string $message) use (&$checks): void {
    if (!$condition) {
        throw new RuntimeException($message);
    }
    $checks++;
};
$count = static fn (): int => (int) $db->query('SELECT COUNT(*) FROM appointments')->fetchColumn();

// A failure in the second clinical act must not leave the parent or the first act.
try {
    DatabaseTransaction::run($db, static function () use ($db): void {
        $db->exec("INSERT INTO appointments VALUES ('partial')");
        $db->exec("INSERT INTO acts VALUES ('one', 'partial', 'Injection')");
        $db->exec("INSERT INTO acts VALUES ('two', 'partial', NULL)");
    });
    throw new RuntimeException('Expected constraint failure');
} catch (PDOException $expected) {
    $check($count() === 0, 'Parent persisted after failed act');
    $check((int) $db->query('SELECT COUNT(*) FROM acts')->fetchColumn() === 0, 'Act persisted after rollback');
    $check(!$db->inTransaction(), 'Owned transaction left open');
}

// A successful appointment must still roll back with its enclosing booking batch.
$db->beginTransaction();
$result = DatabaseTransaction::run($db, static function () use ($db): string {
    $db->exec("INSERT INTO appointments VALUES ('batch-first')");
    return 'batch-first';
});
$check($result === 'batch-first' && $count() === 1, 'Successful nested operation missing');
$check($db->inTransaction(), 'Nested operation committed caller transaction');
$db->rollBack();
$check($count() === 0, 'Appointment survived batch rollback');

// A failed nested operation preserves earlier writes owned by its caller.
$db->beginTransaction();
$db->exec("INSERT INTO appointments VALUES ('earlier')");
try {
    DatabaseTransaction::run($db, static function () use ($db): void {
        $db->exec("INSERT INTO appointments VALUES ('later')");
        throw new RuntimeException('abort child');
    });
} catch (RuntimeException $expected) {
    $check($expected->getMessage() === 'abort child', 'Original error lost');
    $check($db->inTransaction() && $count() === 1, 'Caller writes lost or failed child persisted');
}
$db->commit();
$check($count() === 1, 'Caller commit failed');
DatabaseTransaction::run($db, static function () use ($db): void {
    $db->exec("INSERT INTO appointments VALUES ('committed')");
});
$check(!$db->inTransaction() && $count() === 2, 'Owned successful transaction did not commit');
echo "$checks transaction checks passed\n";

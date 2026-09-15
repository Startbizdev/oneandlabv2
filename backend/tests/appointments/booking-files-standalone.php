<?php
declare(strict_types=1);
require_once __DIR__ . '/../../lib/BookingFileJournal.php';
$db = new PDO('sqlite::memory:');
$root = sys_get_temp_dir() . '/cary-booking-files-' . bin2hex(random_bytes(8));
mkdir($root);
$source = $root . '/source.pdf';
file_put_contents($source, 'synthetic source');
$journal = new BookingFileJournal();
try {
    $journal->trackNewFile($source);
    throw new RuntimeException('Existing file accepted');
} catch (LogicException $expected) {}
$newDir = $root . '/attempt';
mkdir($newDir);
$newFile = $newDir . '/copy.encrypted';
$journal->trackNewFile($newFile);
file_put_contents($newFile, 'synthetic encrypted copy');
$db->beginTransaction();
try {
    $journal->rollback($db);
    throw new RuntimeException('Cleanup before SQL rollback accepted');
} catch (LogicException $expected) {}
if (!is_file($newFile)) throw new RuntimeException('Active transaction file deleted');
$db->rollBack();
$journal->rollback($db);
if (is_file($newFile) || is_dir($newDir) || !is_file($source)) throw new RuntimeException('Attempt cleanup or source preservation failed');
mkdir($newDir);
$journal->trackNewFile($newFile);
file_put_contents($newFile, 'committed copy');
$journal->commit();
$journal->rollback($db);
if (!is_file($newFile)) throw new RuntimeException('Committed file deleted');
unlink($newFile);
rmdir($newDir);
unlink($source);
rmdir($root);
echo "5 booking file lifecycle checks passed\n";

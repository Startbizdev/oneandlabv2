<?php
declare(strict_types=1);
require_once __DIR__ . '/../../lib/BookingFileJournal.php';
$db = new PDO('sqlite::memory:');
$root = sys_get_temp_dir() . '/cary-booking-files-' . bin2hex(random_bytes(8));
mkdir($root);
MedicalFileStore::useStore(new LocalObjectStore($root));
$source = '/uploads/medical/source/source.pdf.encrypted';
MedicalFileStore::put($source, 'synthetic source');
$journal = new BookingFileJournal();
try {
    $journal->trackNewFile($source);
    throw new RuntimeException('Existing file accepted');
} catch (LogicException $expected) {}
$newFile = '/uploads/medical/attempt/copy.encrypted';
$newDir = $root . '/uploads/medical/attempt';
$journal->trackNewFile($newFile);
MedicalFileStore::put($newFile, 'synthetic encrypted copy');
$db->beginTransaction();
try {
    $journal->rollback($db);
    throw new RuntimeException('Cleanup before SQL rollback accepted');
} catch (LogicException $expected) {}
if (!MedicalFileStore::exists($newFile)) throw new RuntimeException('Active transaction file deleted');
$db->rollBack();
$journal->rollback($db);
if (MedicalFileStore::exists($newFile) || is_dir($newDir) || !MedicalFileStore::exists($source)) throw new RuntimeException('Attempt cleanup or source preservation failed');
$journal->trackNewFile($newFile);
MedicalFileStore::put($newFile, 'committed copy');
$journal->commit();
$journal->rollback($db);
if (!MedicalFileStore::exists($newFile)) throw new RuntimeException('Committed file deleted');
MedicalFileStore::delete($newFile);
MedicalFileStore::delete($source);
foreach (['/uploads/medical', '/uploads'] as $dir) @rmdir($root . $dir);
rmdir($root);
MedicalFileStore::useStore(null);
echo "5 booking file lifecycle checks passed\n";

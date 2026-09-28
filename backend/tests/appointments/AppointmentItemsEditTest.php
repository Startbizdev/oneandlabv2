<?php

declare(strict_types=1);

require_once __DIR__ . '/../fixtures/SkipsWithoutPdo.php';
require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../fixtures/TestFixtures.php';
require_once __DIR__ . '/../../lib/AppointmentItemsWriter.php';

use PHPUnit\Framework\TestCase;

/**
 * Caractérisation AppointmentItemsWriter (nursing).
 */
final class AppointmentItemsEditTest extends TestCase
{
    use SkipsWithoutPdo;

    public function testReplaceNursingItemsKeepsOtherPatientRows(): void
    {
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN');
        }
        $pdo = TestDatabase::pdo();
        if (!$pdo->query("SHOW TABLES LIKE 'appointment_nursing_items'")->fetch()) {
            $this->markTestSkipped('table appointment_nursing_items absente');
        }

        $aptId = '00000000-0000-4000-8000-00000000f001';
        $otherId = '00000000-0000-4000-8000-00000000f002';
        $creator = TestFixtures::NURSE;
        $pdo->exec("DELETE FROM appointment_nursing_items WHERE appointment_id IN ('$aptId','$otherId')");
        $pdo->exec("DELETE FROM appointments WHERE id IN ('$aptId','$otherId')");

        $insApt = $pdo->prepare(
            'INSERT INTO appointments (
                id, type, status, created_by, created_by_role, form_type,
                location_lat, location_lng, address_encrypted, address_dek, scheduled_at, patient_id
            ) VALUES (?, ?, ?, ?, ?, ?, 48.86, 2.35, ?, ?, NOW(), ?)'
        );
        foreach ([$aptId, $otherId] as $id) {
            $insApt->execute([
                $id,
                'nursing',
                'pending',
                $creator,
                'nurse',
                'nursing',
                'fixture-addr',
                'fixture-dek',
                TestFixtures::PATIENT_A,
            ]);
        }

        $pdo->exec("INSERT INTO appointment_nursing_items (id, appointment_id, category_id, label, care_options, sort_order) VALUES
            ('retained','$aptId',NULL,'Original','{}',0),
            ('other','$otherId',NULL,'Untouched','{}',0)");

        $pdo->beginTransaction();
        try {
            AppointmentItemsWriter::replace($pdo, 'nursing', $aptId, [
                ['category_id' => null, 'label' => 'Updated', 'care_options' => ['dose' => 2]],
                ['category_id' => null, 'label' => 'Additional act', 'care_options' => []],
            ], static fn () => sprintf('00000000-0000-4000-8000-%012x', random_int(0, 0xffffffff)));
            $pdo->commit();
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }

        $rows = $pdo->query("SELECT label FROM appointment_nursing_items WHERE appointment_id='$aptId' ORDER BY sort_order")->fetchAll(PDO::FETCH_COLUMN);
        $this->assertContains('Updated', $rows);
        $untouched = $pdo->query("SELECT label FROM appointment_nursing_items WHERE id='other'")->fetchColumn();
        $this->assertSame('Untouched', $untouched);
    }
}

<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/health/bootstrap.php';
require_once __DIR__ . '/../../lib/health/HealthRecordService.php';
require_once __DIR__ . '/../../models/User.php';

final class HealthRecordAclTest extends TestCase
{
    private ?PDO $db = null;

    protected function setUp(): void
    {
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN non défini');
        }
        $this->db = TestDatabase::pdo();
    }

    public function testStaffAccessDeniedForUnknownPatient(): void
    {
        $service = new HealthRecordService($this->db);
        $viewer = [
            'user_id' => '00000000-0000-0000-0000-000000000099',
            'role' => 'nurse',
        ];

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Accès carnet refusé');
        $service->getRecapForStaff($viewer, '00000000-0000-0000-0000-000000000001');
    }
}

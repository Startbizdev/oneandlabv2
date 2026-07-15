<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../models/User.php';

/**
 * Tests unitaires légers sur le périmètre d'édition patient staff.
 * Nécessite une base locale configurée (sinon skipped).
 */
final class StaffPatientEditAccessTest extends TestCase
{
    private ?PDO $db = null;
    private ?User $userModel = null;

    protected function setUp(): void
    {
        try {
            $config = require __DIR__ . '/../../config/database.php';
            $this->db = new PDO(
                sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']),
                $config['username'],
                $config['password'],
                $config['options'] ?? []
            );
            $this->userModel = new User();
        } catch (Throwable $e) {
            $this->markTestSkipped('DB unavailable: ' . $e->getMessage());
        }
    }

    public function testCanStaffEditPatientProfileRejectsNonPatientTarget(): void
    {
        $stmt = $this->db->query("SELECT id FROM profiles WHERE role = 'pro' LIMIT 1");
        $proId = (string) ($stmt->fetchColumn() ?: '');
        if ($proId === '') {
            $this->markTestSkipped('No pro profile');
        }
        $this->assertFalse($this->userModel->canStaffEditPatientProfile($proId, 'pro', $proId));
    }

    public function testVisiblePatientInStaffListIsEditable(): void
    {
        $proStmt = $this->db->query("SELECT id FROM profiles WHERE role = 'pro' LIMIT 1");
        $proId = (string) ($proStmt->fetchColumn() ?: '');
        if ($proId === '') {
            $this->markTestSkipped('No pro profile');
        }

        $filters = ['role' => 'patient', 'created_by' => $proId];
        $listed = $this->userModel->getAll($filters, 1, 5, $proId, 'pro');
        $rows = $listed['data'] ?? [];
        if ($rows === []) {
            $this->markTestSkipped('No patient for pro');
        }

        $patientId = (string) ($rows[0]['id'] ?? '');
        $this->assertTrue($this->userModel->isPatientVisibleInStaffList($proId, 'pro', $patientId));
        $this->assertTrue($this->userModel->canStaffEditPatientProfile($proId, 'pro', $patientId));
    }
}

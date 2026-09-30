<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../models/User.php';

final class PatientListAccessTest extends TestCase
{
    public function testPatientCannotListPatients(): void
    {
        $this->assertFalse(User::canListPatients('patient'));
    }

    public function testPreleveurCanListPatientsWithoutJoiningStaffOnBehalfRoles(): void
    {
        $this->assertTrue(User::canListPatients('preleveur'));
        $this->assertNotContains('preleveur', User::patientListStaffRoles());
    }

    public function testGetAllReturnsEmptyWhenPreleveurScopeIsMissing(): void
    {
        $user = $this->userOrSkip();
        $result = $user->getAll(['role' => 'patient'], 1, 50, 'prel-1', 'preleveur');

        $this->assertSame([], $result['data']);
        $this->assertSame(0, $result['total']);
    }

    public function testStaffAndAdminCanListPatients(): void
    {
        $this->assertTrue(User::canListPatients('super_admin'));
        foreach (User::patientListStaffRoles() as $role) {
            $this->assertTrue(User::canListPatients($role), "Expected $role to list patients");
        }
    }

    public function testGetAllReturnsEmptyWhenPatientRequestsDirectory(): void
    {
        $user = $this->userOrSkip();
        $result = $user->getAll(['role' => 'patient'], 1, 50, 'patient-1', 'patient');

        $this->assertSame([], $result['data']);
        $this->assertSame(0, $result['total']);
        $this->assertSame(0, $result['pages']);
    }

    public function testGetAllReturnsEmptyWhenStaffScopeIsMissing(): void
    {
        $user = $this->userOrSkip();
        $result = $user->getAll(['role' => 'patient'], 1, 50, 'pro-1', 'pro');

        $this->assertSame([], $result['data']);
        $this->assertSame(0, $result['total']);
    }

    private function userOrSkip(): User
    {
        try {
            return new User();
        } catch (Throwable $e) {
            $this->markTestSkipped('DB unavailable: ' . $e->getMessage());
        }
    }
}

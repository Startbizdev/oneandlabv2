<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../models/User.php';

/**
 * Téléphone facultatif à la création d'un patient par l'infirmier, le médecin ou l'admin (POST /patients).
 */
final class PatientPhoneOptionalTest extends TestCase
{
    public function testPhoneOptionalForNurseProAndAdminOnly(): void
    {
        foreach (['nurse', 'pro', 'super_admin'] as $role) {
            $this->assertTrue(User::isPatientPhoneOptionalForCreator($role), $role);
        }
        foreach (['subaccount', 'preleveur', 'lab', 'patient', ''] as $role) {
            $this->assertFalse(User::isPatientPhoneOptionalForCreator($role), $role);
        }
    }

    public function testCreateEndpointUsesSharedRule(): void
    {
        $source = (string) file_get_contents(__DIR__ . '/../../api/patients/index.php');
        $this->assertStringContainsString('User::isPatientPhoneOptionalForCreator(', $source);
    }
}

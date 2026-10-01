<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/users/UserIdentityLookup.php';

/**
 * GET /patients/lookup : un pro qui connaît un e-mail ou un téléphone ne doit obtenir que de quoi
 * proposer le rattachement (id, nom, date de naissance), jamais le dossier complet.
 */
final class PatientLookupMatchTest extends TestCase
{
    public function testOnlyAdoptionFieldsAreReturned(): void
    {
        $match = UserIdentityLookup::patientLookupMatch([
            'id' => 'p-1',
            'role' => 'patient',
            'first_name' => 'Alice',
            'last_name' => 'Martin',
            'birth_date' => '1980-04-02',
            'email' => 'alice@test.invalid',
            'phone' => '0600000000',
            'address' => ['label' => '1 rue de Paris'],
            'social_security_number' => '180047512345678',
            'email_hash' => 'hash',
            'stripe_customer_id' => 'cus_x',
        ]);

        $this->assertSame([
            'id' => 'p-1',
            'first_name' => 'Alice',
            'last_name' => 'Martin',
            'birth_date' => '1980-04-02',
        ], $match);
    }

    public function testMissingBirthDateIsNull(): void
    {
        $match = UserIdentityLookup::patientLookupMatch(['id' => 'p-1', 'role' => 'patient', 'birth_date' => '']);

        $this->assertSame(['id' => 'p-1', 'first_name' => '', 'last_name' => '', 'birth_date' => null], $match);
    }

    public function testNonPatientOrMissingProfileGivesNoMatch(): void
    {
        $this->assertNull(UserIdentityLookup::patientLookupMatch(null));
        $this->assertNull(UserIdentityLookup::patientLookupMatch(['id' => 'n-1', 'role' => 'nurse', 'first_name' => 'Nina']));
        $this->assertNull(UserIdentityLookup::patientLookupMatch(['id' => '', 'role' => 'patient']));
    }
}

<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/ai/AiBookingIdentityParser.php';
require_once __DIR__ . '/../../lib/ai/AiStaffPatientResolver.php';

final class AiBookingIdentityParserTest extends TestCase
{
    public function testParsesEmailAndFirstNameFromNaturalMessage(): void
    {
        $parsed = AiBookingIdentityParser::parseContactFromMessage('Alessandro, turcot@hotmail.fr');
        $this->assertSame('turcot@hotmail.fr', $parsed['email'] ?? null);
        $this->assertSame('Alessandro', $parsed['first_name'] ?? null);
        $this->assertSame('Turcot', $parsed['last_name'] ?? null);
    }

    public function testSanitizeMovesEmailOutOfFirstName(): void
    {
        $payload = [
            'patient_mode' => 'new',
            'first_name' => 'alessandro, turcot@hotmail.fr',
            'form_data' => [],
        ];
        $clean = AiBookingIdentityParser::sanitizeIdentityFields($payload);
        $this->assertSame('turcot@hotmail.fr', $clean['email'] ?? null);
        $this->assertSame('Alessandro', $clean['first_name'] ?? null);
    }

    public function testMergeParsedIdentityFillsEmptyFields(): void
    {
        $payload = ['form_data' => []];
        $merged = AiBookingIdentityParser::mergeParsedIdentity($payload, [
            'email' => 'marie@example.com',
            'first_name' => 'Marie',
            'last_name' => 'Durand',
        ]);
        $this->assertSame('marie@example.com', $merged['email']);
        $this->assertSame('Marie', $merged['form_data']['first_name']);
        $this->assertSame('Durand', $merged['form_data']['last_name']);
    }

    public function testParsesFrenchPhone(): void
    {
        $parsed = AiBookingIdentityParser::parseContactFromMessage('06 12 34 56 78 pour Jean Dupont');
        $this->assertSame('06 12 34 56 78', $parsed['phone'] ?? null);
        $this->assertSame('Jean', $parsed['first_name'] ?? null);
        $this->assertSame('Dupont', $parsed['last_name'] ?? null);
    }
}

final class AiStaffPatientResolverTest extends TestCase
{
    public function testInfersNewPatientModeWhenNamesPresent(): void
    {
        $resolver = new AiStaffPatientResolver();
        $out = $resolver->apply([
            'first_name' => 'Paul',
            'last_name' => 'Martin',
            'form_data' => [],
        ], ['user_id' => 'n1', 'role' => 'nurse']);

        $this->assertSame('new', $out['patient_mode'] ?? null);
    }
}

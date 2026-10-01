<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/ai/CaryBookingPromptRules.php';

final class CaryBookingPromptRulesTest extends TestCase
{
    public function testPatientWorkflowMentionsRelatives(): void
    {
        $block = CaryBookingPromptRules::workflowBlock('patient');
        $this->assertStringContainsString('proche', $block);
        $this->assertStringContainsString('booking_step=beneficiary', $block);
    }

    public function testStaffWorkflowNeverMentionsSelfOrRelative(): void
    {
        $block = CaryBookingPromptRules::workflowBlock('nurse');
        $this->assertStringContainsString('staff_patients', $block);
        $this->assertStringContainsString('booking_step=patient', $block);
        $this->assertStringContainsString('INTERDIT', $block);
        $this->assertStringNotContainsString('booking_step=beneficiary', $block);
    }

    public function testPreleveurWorkflowForbidsDraftTool(): void
    {
        $block = CaryBookingPromptRules::workflowBlock('preleveur');
        $this->assertStringContainsString('N\'appelle jamais update_booking_draft', $block);
        $this->assertStringContainsString('Demander un prélèvement', $block);
        $this->assertStringNotContainsString('booking_step=', $block);
    }

    public function testStaffRolesDetected(): void
    {
        $this->assertTrue(CaryBookingPromptRules::isStaffRole('nurse'));
        $this->assertTrue(CaryBookingPromptRules::isStaffRole('pro'));
        $this->assertFalse(CaryBookingPromptRules::isStaffRole('patient'));
    }

    public function testVoiceModeIsConcise(): void
    {
        $block = CaryBookingPromptRules::voiceModeBlock();
        $this->assertStringContainsString('Mode vocal', $block);
        $this->assertStringContainsString('COURTES', $block);
    }
}

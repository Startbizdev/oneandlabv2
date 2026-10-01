<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../fixtures/StubAiBookingService.php';
require_once __DIR__ . '/../../lib/ai/AiBookingToolExecutor.php';

/**
 * Réservation via Cary : création, modification et confirmation réservées aux mêmes rôles.
 * Le préleveur passe par le formulaire (consentement patient, PreleveurLabRequestPolicy).
 */
final class AiBookingAccessTest extends TestCase
{
    public function testBookingRolesAreAllowed(): void
    {
        foreach (['patient', 'pro', 'nurse'] as $role) {
            $this->assertTrue(AiBookingAccess::allows(['user_id' => 'u1', 'role' => $role]), $role);
        }
    }

    public function testOtherRolesAreDenied(): void
    {
        foreach (['preleveur', 'lab', 'subaccount', 'super_admin', ''] as $role) {
            $this->assertFalse(AiBookingAccess::allows(['user_id' => 'u1', 'role' => $role]), $role);
        }
        $this->assertFalse(AiBookingAccess::allows([]));
    }

    public function testPreleveurIsDeniedOnCreatePatchAndConfirm(): void
    {
        $service = new StubAiBookingService();
        $preleveur = ['user_id' => 'prel-1', 'role' => 'preleveur'];
        $calls = [
            'create' => static fn () => $service->createDraft($preleveur, ['payload' => ['care_type' => 'blood_test']]),
            'patch' => static fn () => $service->patchDraft('draft-1', $preleveur, ['care_type' => 'blood_test']),
            'confirm' => static fn () => $service->confirmDraft('draft-1', $preleveur),
        ];
        foreach ($calls as $label => $call) {
            try {
                $call();
                $this->fail($label . ' : refus attendu');
            } catch (HttpStatusException $e) {
                $this->assertSame(403, $e->httpStatus, $label);
                $this->assertSame('FORBIDDEN', $e->errorCode, $label);
                $this->assertSame(AiBookingAccess::DENIED_MESSAGE, $e->getMessage(), $label);
            }
        }
    }

    public function testDraftToolIsRefusedForPreleveurWithoutTouchingStorage(): void
    {
        $executor = new AiBookingToolExecutor(['user_id' => 'prel-1', 'role' => 'preleveur'], 'conv-1', null, new StubAiBookingService());
        $result = $executor->execute('update_booking_draft', ['patch' => ['care_type' => 'blood_test']]);
        $this->assertNull($result['draft']);
        $this->assertFalse($result['result']['ok']);
        $this->assertSame('booking_not_available_for_role', $result['result']['error']);
    }
}

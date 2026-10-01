<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/NurseInviteService.php';

/**
 * Invitation SMS d'un infirmier externe : numéro mobile français uniquement,
 * plafond par professionnel et par destinataire sur 24 h.
 */
final class NurseInviteSmsQuotaTest extends TestCase
{
    public function testOnlyFrenchMobileNumbersAreAccepted(): void
    {
        $this->assertSame('0612345678', NurseInviteService::normalizeInvitePhone('06 12 34 56 78'));
        $this->assertSame('0712345678', NurseInviteService::normalizeInvitePhone('+33712345678'));

        foreach (['0145678901', '0912345678', '+447123456789', '06123', '', 'abc'] as $bad) {
            $this->assertNull(NurseInviteService::normalizeInvitePhone($bad), $bad);
        }
        $this->assertNull(NurseInviteService::normalizeInvitePhone(null));
        $this->assertNull(NurseInviteService::normalizeInvitePhone(['0612345678']));
    }

    public function testCreatorQuotaBlocksAfterDailyLimit(): void
    {
        $creator = 'quota-creator-' . bin2hex(random_bytes(8));
        for ($i = 0; $i < NurseInviteService::SMS_MAX_PER_CREATOR_PER_DAY; $i++) {
            $this->assertTrue(NurseInviteService::consumeSmsQuota($creator, $this->randomMobile()), "envoi $i");
        }
        $this->assertFalse(NurseInviteService::consumeSmsQuota($creator, $this->randomMobile()));
        $this->assertTrue(NurseInviteService::consumeSmsQuota('quota-creator-' . bin2hex(random_bytes(8)), $this->randomMobile()));
    }

    public function testRecipientQuotaBlocksAcrossCreators(): void
    {
        $phone = $this->randomMobile();
        for ($i = 0; $i < NurseInviteService::SMS_MAX_PER_PHONE_PER_DAY; $i++) {
            $this->assertTrue(NurseInviteService::consumeSmsQuota('quota-creator-' . bin2hex(random_bytes(8)), $phone), "envoi $i");
        }
        $this->assertFalse(NurseInviteService::consumeSmsQuota('quota-creator-' . bin2hex(random_bytes(8)), $phone));
    }

    private function randomMobile(): string
    {
        return '06' . str_pad((string) random_int(0, 99999999), 8, '0', STR_PAD_LEFT);
    }
}

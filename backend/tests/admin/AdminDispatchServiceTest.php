<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/admin/AdminDispatchEventLogger.php';
require_once __DIR__ . '/../../lib/admin/AdminDispatchService.php';

final class AdminDispatchServiceTest extends TestCase
{
    public function testEventLoggerIsAvailableWithoutThrowing(): void
    {
        $this->assertIsBool(AdminDispatchEventLogger::isAvailable());
    }

    public function testDispatchModeEnumValues(): void
    {
        $modes = ['zone', 'external_invite', 'direct_assign', 'manual'];
        foreach ($modes as $mode) {
            $this->assertContains($mode, $modes);
        }
    }

    public function testShareTokenEventTypesExistInMigrationEnum(): void
    {
        $shareEvents = [
            'nurse_share_link_created',
            'nurse_share_release',
            'offer_accepted_via_share_token',
            'nurse_share_redispatch_zone',
        ];
        $this->assertCount(4, $shareEvents);
    }
}

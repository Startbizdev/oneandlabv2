<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/pharmacy/PharmacyCatalogService.php';

final class PharmacyCatalogPublicProfileTest extends TestCase
{
    public function testCatalogPharmacyIsVisibleToSomeoneWhoCanOrder(): void
    {
        $this->assertTrue(PharmacyCatalogService::mayViewPublicProfile(true, false, false, false, true));
    }

    public function testPausedPharmacyStaysHiddenWithoutAnOrder(): void
    {
        $this->assertFalse(PharmacyCatalogService::mayViewPublicProfile(false, false, false, false, true));
    }

    public function testExistingOrderKeepsTheProfileVisible(): void
    {
        $this->assertTrue(PharmacyCatalogService::mayViewPublicProfile(false, false, true, false, false));
    }

    public function testPharmacyCanSeeItsOwnProfile(): void
    {
        $this->assertTrue(PharmacyCatalogService::mayViewPublicProfile(false, true, false, false, false));
    }

    public function testStrangerCannotBrowseWhenOrderingIsClosed(): void
    {
        $this->assertFalse(PharmacyCatalogService::mayViewPublicProfile(true, false, false, false, false));
    }
}

<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/MobileAppVersion.php';

final class MobileAppVersionTest extends TestCase
{
    public function testCompareVersions(): void
    {
        $this->assertSame(-1, MobileAppVersion::compare('1.3.9', '1.4.0'));
        $this->assertSame(0, MobileAppVersion::compare('1.4.0', '1.4.0'));
        $this->assertSame(1, MobileAppVersion::compare('1.4.1', '1.4.0'));
        $this->assertSame(-1, MobileAppVersion::compare('1.4', '1.4.1'));
    }

    public function testIsLower(): void
    {
        $this->assertTrue(MobileAppVersion::isLower('1.3.0', '1.4.0'));
        $this->assertFalse(MobileAppVersion::isLower('1.4.0', '1.4.0'));
        $this->assertFalse(MobileAppVersion::isLower('2.0.0', '1.4.0'));
    }
}

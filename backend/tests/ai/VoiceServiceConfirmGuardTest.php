<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/ai/VoiceService.php';

final class VoiceServiceConfirmGuardTest extends TestCase
{
    protected function setUp(): void
    {
        if (!extension_loaded('pdo_mysql')) {
            $this->markTestSkipped('Extension pdo_mysql requise');
        }
    }

    public function testBookingConfirmIntentMatchesFrenchPhrases(): void
    {
        $service = new VoiceService();
        $method = new ReflectionMethod(VoiceService::class, 'isBookingConfirmIntent');
        $method->setAccessible(true);

        $this->assertTrue($method->invoke($service, 'je confirme'));
        $this->assertTrue($method->invoke($service, 'OK pour le rdv'));
        $this->assertFalse($method->invoke($service, 'bonjour'));
    }
}

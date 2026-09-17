<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/ai/AiUserFacingError.php';

final class AiUserFacingErrorTest extends TestCase
{
    public function testMasksTechnicalException(): void
    {
        $msg = AiUserFacingError::fromThrowable(new RuntimeException('Boucle tools Grok interrompue (max itérations)'));
        $this->assertStringNotContainsString('Grok', $msg);
        $this->assertStringContainsString('finaliser', mb_strtolower($msg));
    }

    public function testPreservesValidationError(): void
    {
        $msg = AiUserFacingError::fromThrowable(new InvalidArgumentException('message requis'));
        $this->assertSame('message requis', $msg);
    }
}

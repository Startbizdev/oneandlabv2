<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/ai/AiUserFacingError.php';

final class AiUserFacingErrorTest extends TestCase
{
    public function testMasksTechnicalException(): void
    {
        $described = AiUserFacingError::describe(new RuntimeException('SQLSTATE[42S22]: Unknown column phone in Grok loop'));
        $this->assertSame(500, $described['status']);
        $this->assertSame('AI_INTERNAL_ERROR', $described['code']);
        $this->assertSame(AiUserFacingError::GENERIC_MESSAGE, $described['message']);
        $this->assertStringNotContainsString('Grok', $described['message']);
    }

    public function testPreservesValidationError(): void
    {
        $msg = AiUserFacingError::fromThrowable(new InvalidArgumentException('message requis'));
        $this->assertSame('message requis', $msg);
        $this->assertSame(400, AiUserFacingError::describe(new InvalidArgumentException('x'))['status']);
    }

    public function testProviderFailureIs503WithoutRawProviderMessage(): void
    {
        $described = AiUserFacingError::describe(
            AiProviderUnavailableException::httpStatus(401, 'Incorrect API key provided: xai-abc***'),
        );
        $this->assertSame(503, $described['status']);
        $this->assertSame('AI_UNAVAILABLE', $described['code']);
        $this->assertStringNotContainsString('xai', mb_strtolower($described['message']));
        $this->assertStringNotContainsString('API key', $described['message']);
        $this->assertGreaterThan(0, (int) $described['retry_after']);
    }

    public function testRateLimitCarriesRetryAfter(): void
    {
        $described = AiUserFacingError::describe(new AiRateLimitedException('Trop de messages', 42));
        $this->assertSame(429, $described['status']);
        $this->assertSame('AI_RATE_LIMITED', $described['code']);
        $this->assertSame(42, $described['retry_after']);
    }

    public function testBusinessRefusalKeepsStatusAndCode(): void
    {
        $described = AiUserFacingError::describe(HttpStatusException::forbidden('Accès document refusé'));
        $this->assertSame(403, $described['status']);
        $this->assertSame('FORBIDDEN', $described['code']);
        $this->assertSame('Accès document refusé', $described['message']);
    }
}

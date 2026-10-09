<?php

declare(strict_types=1);

/** Quota Cary dépassé : 429 avec en-tête Retry-After. */
final class AiRateLimitedException extends RuntimeException
{
    public function __construct(string $message, public readonly int $retryAfterSeconds)
    {
        parent::__construct($message, 429);
    }
}

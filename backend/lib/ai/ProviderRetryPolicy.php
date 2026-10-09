<?php

declare(strict_types=1);

require_once __DIR__ . '/AiProviderUnavailableException.php';

/**
 * Retry exponentiel + circuit breaker léger pour appels provider IA.
 * Seules les pannes transitoires (réseau, 5xx) sont rejouées ; un 4xx ou une erreur de configuration échoue tout de suite.
 */
final class ProviderRetryPolicy
{
    private const BASE_DELAY_MS = 150;
    private const MAX_TOTAL_DELAY_MS = 1000;
    private const CIRCUIT_THRESHOLD = 5;
    private const CIRCUIT_OPEN_SECONDS = 30.0;

    private static int $failureCount = 0;
    private static ?float $circuitOpenUntil = null;

    /**
     * @template T
     * @param callable(): T $fn
     * @return T
     */
    public static function run(callable $fn, int $maxAttempts = 3)
    {
        if (self::$circuitOpenUntil !== null && microtime(true) < self::$circuitOpenUntil) {
            throw new AiProviderUnavailableException('Circuit fournisseur IA ouvert après échecs répétés');
        }

        $attempt = 0;
        $sleptMs = 0;
        while (true) {
            try {
                $result = $fn();
                self::$failureCount = 0;
                self::$circuitOpenUntil = null;

                return $result;
            } catch (AiProviderUnavailableException $e) {
                $attempt++;
                self::$failureCount++;
                if (self::$failureCount >= self::CIRCUIT_THRESHOLD) {
                    self::$circuitOpenUntil = microtime(true) + self::CIRCUIT_OPEN_SECONDS;
                }
                $delayMs = self::BASE_DELAY_MS * (2 ** ($attempt - 1));
                if (!$e->retryable || $attempt >= $maxAttempts || $sleptMs + $delayMs > self::MAX_TOTAL_DELAY_MS) {
                    throw $e;
                }
                usleep($delayMs * 1000);
                $sleptMs += $delayMs;
            }
        }
    }

    public static function resetForTests(): void
    {
        self::$failureCount = 0;
        self::$circuitOpenUntil = null;
    }
}

<?php

declare(strict_types=1);

/**
 * Retry exponentiel + circuit breaker léger pour appels provider IA.
 */
final class ProviderRetryPolicy
{
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
            throw new RuntimeException('Service IA temporairement indisponible (circuit ouvert)');
        }

        $attempt = 0;
        $last = null;
        while ($attempt < $maxAttempts) {
            try {
                $result = $fn();
                self::$failureCount = 0;
                self::$circuitOpenUntil = null;

                return $result;
            } catch (Throwable $e) {
                $last = $e;
                $attempt++;
                self::$failureCount++;
                if (self::$failureCount >= 5) {
                    self::$circuitOpenUntil = microtime(true) + 30.0;
                }
                if ($attempt >= $maxAttempts) {
                    break;
                }
                usleep((int) (100000 * (2 ** ($attempt - 1))));
            }
        }

        throw $last ?? new RuntimeException('Échec provider IA');
    }

    public static function resetForTests(): void
    {
        self::$failureCount = 0;
        self::$circuitOpenUntil = null;
    }
}

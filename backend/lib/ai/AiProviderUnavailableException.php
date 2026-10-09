<?php

declare(strict_types=1);

/**
 * Fournisseur IA injoignable, mal configuré ou en erreur. Le message reste dans les logs et l'audit :
 * le client ne reçoit que le 503 AI_UNAVAILABLE générique.
 */
final class AiProviderUnavailableException extends RuntimeException
{
    public function __construct(
        string $logMessage,
        public readonly ?int $providerStatus = null,
        public readonly bool $retryable = false,
        ?Throwable $previous = null,
    ) {
        parent::__construct($logMessage, 0, $previous);
    }

    public static function network(string $detail): self
    {
        return new self('Fournisseur IA injoignable : ' . $detail, null, true);
    }

    public static function httpStatus(int $status, string $detail): self
    {
        return new self('Fournisseur IA HTTP ' . $status . ' : ' . $detail, $status, $status >= 500);
    }

    public static function notConfigured(string $detail): self
    {
        return new self('Fournisseur IA non configuré : ' . $detail);
    }
}

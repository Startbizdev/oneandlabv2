<?php

declare(strict_types=1);

/**
 * Refus métier destiné au client (accès refusé, ressource introuvable, conflit) : message affichable,
 * statut HTTP et code portés par l'exception. Toute autre RuntimeException est technique (500).
 */
class HttpStatusException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly int $httpStatus,
        public readonly string $errorCode,
        ?Throwable $previous = null,
    ) {
        parent::__construct($message, 0, $previous);
    }

    public static function forbidden(string $message): self
    {
        return new self($message, 403, 'FORBIDDEN');
    }

    public static function notFound(string $message): self
    {
        return new self($message, 404, 'NOT_FOUND');
    }

    public static function conflict(string $message, string $errorCode): self
    {
        return new self($message, 409, $errorCode);
    }

    public static function unprocessable(string $message): self
    {
        return new self($message, 422, 'VALIDATION_ERROR');
    }
}

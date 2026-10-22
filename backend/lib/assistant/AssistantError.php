<?php

declare(strict_types=1);

require_once __DIR__ . '/../HttpStatusException.php';

/** Erreur de l'assistant destinée au client (code du contrat, message français, Retry-After éventuel). */
final class AssistantError extends HttpStatusException
{
    public const UNAVAILABLE_MESSAGE = 'L\'assistant est momentanément indisponible. Réessayez dans un instant.';

    public function __construct(string $message, int $httpStatus, string $errorCode, public readonly ?int $retryAfter = null, ?Throwable $previous = null)
    {
        parent::__construct($message, $httpStatus, $errorCode, $previous);
    }

    public static function unavailable(string $reason = '', ?Throwable $previous = null): self
    {
        // La raison technique n'est jamais renvoyée au client : seulement journalisée via l'exception précédente.
        $previous ??= $reason !== '' ? new RuntimeException($reason) : null;

        return new self(self::UNAVAILABLE_MESSAGE, 503, 'ASSISTANT_UNAVAILABLE', 30, $previous);
    }

    public static function timeout(): self
    {
        return new self('L\'assistant met trop de temps à répondre. Réessayez.', 504, 'ASSISTANT_TIMEOUT', 10);
    }

    public static function validation(string $message): self
    {
        return new self($message, 400, 'VALIDATION_ERROR');
    }

    public static function inProgress(): self
    {
        return new self('Ce message est encore en cours de traitement.', 409, 'ASSISTANT_MESSAGE_IN_PROGRESS');
    }
}

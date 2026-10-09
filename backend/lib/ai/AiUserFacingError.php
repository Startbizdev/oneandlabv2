<?php

declare(strict_types=1);

require_once __DIR__ . '/../HttpStatusException.php';
require_once __DIR__ . '/AiProviderUnavailableException.php';
require_once __DIR__ . '/AiRateLimitedException.php';

/**
 * Traduit une exception en réponse client sûre (statut, code, message français) : jamais de texte technique
 * ni de message brut du fournisseur IA.
 */
final class AiUserFacingError
{
    public const UNAVAILABLE_MESSAGE = 'Cary est momentanément indisponible. Réessayez dans un instant.';
    public const GENERIC_MESSAGE = 'Une erreur est survenue. Réessayez ou reformulez votre message.';
    private const UNAVAILABLE_RETRY_AFTER = 30;

    /**
     * @return array{status: int, code: string, message: string, retry_after: ?int}
     */
    public static function describe(Throwable $e): array
    {
        if ($e instanceof HttpStatusException) {
            return ['status' => $e->httpStatus, 'code' => $e->errorCode, 'message' => $e->getMessage(), 'retry_after' => null];
        }
        if ($e instanceof AiRateLimitedException) {
            return [
                'status' => 429,
                'code' => 'AI_RATE_LIMITED',
                'message' => 'Vous envoyez beaucoup de messages — réessayez dans quelques minutes.',
                'retry_after' => $e->retryAfterSeconds,
            ];
        }
        if ($e instanceof AiProviderUnavailableException) {
            return [
                'status' => 503,
                'code' => 'AI_UNAVAILABLE',
                'message' => self::UNAVAILABLE_MESSAGE,
                'retry_after' => self::UNAVAILABLE_RETRY_AFTER,
            ];
        }
        if ($e instanceof InvalidArgumentException) {
            return ['status' => 400, 'code' => 'VALIDATION_ERROR', 'message' => $e->getMessage(), 'retry_after' => null];
        }
        return ['status' => 500, 'code' => 'AI_INTERNAL_ERROR', 'message' => self::GENERIC_MESSAGE, 'retry_after' => null];
    }

    public static function fromThrowable(Throwable $e): string
    {
        return self::describe($e)['message'];
    }
}

<?php

declare(strict_types=1);

/**
 * Messages d'erreur sûrs pour patients (masque exceptions techniques).
 */
final class AiUserFacingError
{
    public static function fromThrowable(Throwable $e): string
    {
        if ($e instanceof InvalidArgumentException) {
            return $e->getMessage();
        }

        $msg = mb_strtolower($e->getMessage());
        if (str_contains($msg, 'rate limit') || str_contains($msg, '429') || str_contains($msg, 'trop de')) {
            return 'Vous envoyez beaucoup de messages — réessayez dans quelques minutes.';
        }
        if (str_contains($msg, 'boucle tools') || str_contains($msg, 'max itérations')) {
            return 'Je n\'ai pas pu finaliser cette action. Reformulez ou réessayez.';
        }
        if (str_contains($msg, 'xai') || str_contains($msg, 'api_key') || str_contains($msg, 'provider')) {
            return 'Cary est momentanément indisponible. Réessayez dans un instant.';
        }
        if (str_contains($msg, 'introuvable') || str_contains($msg, 'not found')) {
            return 'Élément introuvable. Rechargez la conversation.';
        }

        return 'Une erreur est survenue. Réessayez ou reformulez votre message.';
    }
}

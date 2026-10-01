<?php

declare(strict_types=1);

/** Réponse 500 générique : le détail de l'exception reste dans les logs serveur, jamais dans la réponse. */
final class ApiServerError
{
    public const DEFAULT_MESSAGE = 'Erreur interne du serveur. Réessayez plus tard.';

    public static function respond(string $context, Throwable $e, string $message = self::DEFAULT_MESSAGE): void
    {
        self::log($context, $e);

        if (!headers_sent()) {
            header('Content-Type: application/json');
        }
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $message, 'code' => 'SERVER_ERROR']);
    }

    /** Journalise l'exception (et ses causes chaînées) avec la méthode et la route, sans rien répondre. */
    public static function log(string $context, Throwable $e): void
    {
        $method = (string) ($_SERVER['REQUEST_METHOD'] ?? 'CLI');
        $path = (string) (parse_url((string) ($_SERVER['REQUEST_URI'] ?? ''), PHP_URL_PATH) ?? '');
        $chain = [];
        for ($current = $e; $current !== null; $current = $current->getPrevious()) {
            $chain[] = sprintf(
                '%s: %s (%s:%d)',
                get_class($current),
                $current->getMessage(),
                $current->getFile(),
                $current->getLine()
            );
        }
        error_log(sprintf('[%s %s] %s : %s', $method, $path, $context, implode(' <- ', $chain)));
    }
}

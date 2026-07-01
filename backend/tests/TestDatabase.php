<?php

declare(strict_types=1);

/**
 * Connexion PDO partagée pour les tests d'intégration (ACL, batch, RAG).
 * Lit TEST_DATABASE_* puis repli sur DB_* du .env serveur.
 */
final class TestDatabase
{
    public static function dsn(): string
    {
        return (string) (getenv('TEST_DATABASE_DSN') ?: '');
    }

    public static function isConfigured(): bool
    {
        return self::dsn() !== '';
    }

    public static function pdo(): PDO
    {
        $dsn = self::dsn();
        if ($dsn === '') {
            throw new RuntimeException('TEST_DATABASE_DSN non défini');
        }

        $user = getenv('TEST_DATABASE_USER');
        if ($user === false || $user === '') {
            $user = getenv('DB_USER') ?: '';
        }
        $pass = getenv('TEST_DATABASE_PASS');
        if ($pass === false) {
            $pass = getenv('DB_PASS') ?: '';
        }

        return new PDO($dsn, (string) $user, (string) $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        ]);
    }

    /** @return array{0: string, 1: string}|null */
    public static function patientPairOrNull(): ?array
    {
        $a = getenv('TEST_PATIENT_ID') ?: '';
        $b = getenv('TEST_PATIENT_B_ID') ?: '';
        if ($a !== '' && $b !== '') {
            return [$a, $b];
        }
        return null;
    }
}

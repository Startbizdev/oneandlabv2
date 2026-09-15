<?php
declare(strict_types=1);

/** Local, disposable database only; deliberately does not read application credentials. */
function fixtureConnection(?string $database = null): PDO {
    if ($database !== null && !preg_match('/^cary_refonte_test_[a-f0-9]{12}$/', $database)) throw new RuntimeException('Invalid fixture schema');
    $db = new PDO('mysql:host=127.0.0.1;port=13316;charset=utf8mb4' . ($database ? ';dbname=' . $database : ''), 'root', '', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $dataDirectory = str_replace('\\', '/', (string)$db->query('SELECT @@datadir')->fetchColumn());
    if (!str_contains($dataDirectory, '/oneandlab-mysql-8.4.8/synthetic-data/')) throw new RuntimeException('Refusing a non-fixture server');
    $offset = (new DateTimeImmutable('now', new DateTimeZone('Europe/Paris')))->format('P');
    $db->exec('SET time_zone = ' . $db->quote($offset));
    $db->exec('SET SESSION innodb_lock_wait_timeout = 5');
    return $db;
}

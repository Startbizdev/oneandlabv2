<?php

declare(strict_types=1);

require_once __DIR__ . '/../ai/bootstrap.php';

function rag_db(): PDO
{
    return ai_db();
}

function rag_env(string $key, ?string $default = null): ?string
{
    return ai_env($key, $default);
}

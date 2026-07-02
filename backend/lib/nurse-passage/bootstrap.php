<?php

declare(strict_types=1);

require_once __DIR__ . '/../nurse-tour/bootstrap.php';

function nurse_passage_db(): PDO
{
    return nurse_tour_db();
}

function nurse_passage_require_nurse(): array
{
    return nurse_tour_require_nurse();
}

function nurse_passage_handle_options(array $methods = ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS']): void
{
    nurse_tour_handle_options($methods);
}

function nurse_passage_json_response(array $payload, int $code = 200): void
{
    nurse_tour_json_response($payload, $code);
}

function nurse_passage_json_error(string $message, int $code = 400): void
{
    nurse_tour_json_error($message, $code);
}

function nurse_passage_read_json_body(): array
{
    return nurse_tour_read_json_body();
}

function nurse_passage_uuid(): string
{
    return nurse_tour_uuid();
}

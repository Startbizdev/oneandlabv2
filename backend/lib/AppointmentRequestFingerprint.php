<?php

declare(strict_types=1);

/** Exact request comparison for the short staff retry window, not durable idempotency. */
final class AppointmentRequestFingerprint
{
    public const FIELD = '_create_request_fingerprint';

    public static function forInput(array $input): string
    {
        if (isset($input['form_data']) && is_array($input['form_data'])) {
            unset($input['form_data'][self::FIELD]);
        }
        return hash('sha256', json_encode(self::canonical($input), JSON_THROW_ON_ERROR | JSON_PRESERVE_ZERO_FRACTION));
    }

    private static function canonical(mixed $value): mixed
    {
        if (!is_array($value)) return $value;
        if (!array_is_list($value)) ksort($value, SORT_STRING);
        foreach ($value as $key => $item) $value[$key] = self::canonical($item);
        return $value;
    }
}

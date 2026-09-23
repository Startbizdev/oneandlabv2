<?php

declare(strict_types=1);

/**
 * Normalisation des réponses carnet (legacy mobile / double enveloppe { value }).
 */
final class HealthRecordValue
{
    public static function unwrap(mixed $value): mixed
    {
        $v = $value;
        for ($depth = 0; $depth < 4; $depth++) {
            if (is_array($v) && array_key_exists('value', $v)) {
                $v = $v['value'];
                continue;
            }
            break;
        }

        if (is_string($v)) {
            $trim = trim($v);
            $lower = strtolower($trim);
            if ($trim === '' || $lower === 'null' || $lower === 'undefined' || $lower === '[object object]') {
                return null;
            }
        }

        return $v;
    }

    /** Extrait la valeur depuis une ligne value_json décodée ou un payload PATCH. */
    public static function fromPayload(mixed $payload): mixed
    {
        if (is_array($payload) && array_key_exists('value', $payload)) {
            return self::unwrap($payload['value']);
        }

        return self::unwrap($payload);
    }

    public static function isFilled(mixed $value): bool
    {
        $v = self::unwrap($value);
        if ($v === null || $v === '') {
            return false;
        }

        return true;
    }
}

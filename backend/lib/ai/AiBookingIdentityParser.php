<?php

declare(strict_types=1);

/**
 * Extraction / normalisation identité patient depuis messages naturels (chat + vocal).
 */
final class AiBookingIdentityParser
{
    /**
     * @return array{email?: string, phone?: string, first_name?: string, last_name?: string}
     */
    public static function parseContactFromMessage(?string $message): array
    {
        $text = trim((string) $message);
        if ($text === '') {
            return [];
        }

        $out = [];

        if (preg_match('/[\w.+-]+@[\w.-]+\.[a-z]{2,}/iu', $text, $m)) {
            $out['email'] = strtolower(trim($m[0]));
        }

        if (preg_match('/(?:\+33|0033|0)\s*[1-9](?:[\s.\-]?\d{2}){4}/u', $text, $m)) {
            $out['phone'] = trim($m[0]);
        } elseif (preg_match('/\b0[1-9](?:[\s.\-]?\d{2}){4}\b/u', $text, $m)) {
            $out['phone'] = trim($m[0]);
        }

        $nameSource = $text;
        if (!empty($out['email'])) {
            $nameSource = str_ireplace($out['email'], ' ', $nameSource);
        }
        if (!empty($out['phone'])) {
            $nameSource = str_replace($out['phone'], ' ', $nameSource);
        }
        $nameSource = preg_replace('/\b(?:email|mail|e-mail|téléphone|telephone|tel|phone)\s*:?\s*/iu', ' ', $nameSource) ?? $nameSource;
        $nameSource = preg_replace('/^(?:pour|chez|le patient|la patiente|patient)\s+/iu', '', trim($nameSource)) ?? trim($nameSource);
        $nameSource = trim(preg_replace('/\s+/', ' ', $nameSource) ?? '');

        if ($nameSource !== '') {
            if (preg_match('/^(.+?)[,\s]+([\w.+-]+@[\w.-]+\.[a-z]{2,})$/iu', $nameSource, $m)) {
                $nameSource = trim($m[1]);
            }

            $parts = preg_split('/[\s,]+/u', $nameSource, -1, PREG_SPLIT_NO_EMPTY) ?: [];
            $parts = array_values(array_filter($parts, static fn (string $p): bool => !str_contains($p, '@')));

            if (count($parts) >= 2) {
                $out['first_name'] = self::titleCaseWord($parts[0]);
                $out['last_name'] = self::titleCaseWord(implode(' ', array_slice($parts, 1)));
            } elseif (count($parts) === 1) {
                $out['first_name'] = self::titleCaseWord($parts[0]);
                if (!empty($out['email'])) {
                    $local = explode('@', $out['email'])[0] ?? '';
                    $localParts = preg_split('/[._-]+/', $local) ?: [];
                    if (count($localParts) >= 2) {
                        $out['first_name'] = self::titleCaseWord($localParts[0]);
                        $out['last_name'] = self::titleCaseWord($localParts[1]);
                    } elseif ($local !== '' && strcasecmp($local, $parts[0]) !== 0) {
                        $out['last_name'] = self::titleCaseWord($local);
                    }
                }
            }
        }

        return $out;
    }

    /**
     * Corrige les champs mal remplis par le LLM (ex. prénom = « alessandro, turcot@hotmail.fr »).
     *
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public static function sanitizeIdentityFields(array $payload): array
    {
        $formData = is_array($payload['form_data'] ?? null) ? $payload['form_data'] : [];

        foreach (['first_name', 'last_name', 'email', 'phone'] as $field) {
            $top = isset($payload[$field]) ? trim((string) $payload[$field]) : '';
            $nested = isset($formData[$field]) ? trim((string) $formData[$field]) : '';
            $merged = $top !== '' ? $top : $nested;
            if ($merged === '') {
                continue;
            }

            if ($field === 'email' || str_contains($merged, '@')) {
                if (preg_match('/[\w.+-]+@[\w.-]+\.[a-z]{2,}/iu', $merged, $m)) {
                    $email = strtolower($m[0]);
                    $payload['email'] = $email;
                    $formData['email'] = $email;
                    if ($field !== 'email') {
                        unset($payload[$field], $formData[$field]);
                        $remainder = trim(str_ireplace($email, '', $merged), " \t\n\r\0\x0B,;");
                        if ($remainder !== '' && ($field === 'first_name' || $field === 'last_name')) {
                            $payload[$field] = self::titleCaseWord(preg_replace('/[,]+/', ' ', $remainder) ?? $remainder);
                            $formData[$field] = $payload[$field];
                        }
                    }
                }
                continue;
            }

            $payload[$field] = $merged;
            $formData[$field] = $merged;
        }

        $payload['form_data'] = $formData;

        return $payload;
    }

    /**
     * @param array<string, mixed> $payload
     * @param array{email?: string, phone?: string, first_name?: string, last_name?: string} $parsed
     * @return array<string, mixed>
     */
    public static function mergeParsedIdentity(array $payload, array $parsed): array
    {
        if ($parsed === []) {
            return $payload;
        }

        $formData = is_array($payload['form_data'] ?? null) ? $payload['form_data'] : [];

        foreach (['email', 'phone', 'first_name', 'last_name'] as $field) {
            if (empty($parsed[$field])) {
                continue;
            }
            $value = $parsed[$field];
            if (empty($payload[$field]) || trim((string) $payload[$field]) === '') {
                $payload[$field] = $value;
            }
            if (empty($formData[$field]) || trim((string) $formData[$field]) === '') {
                $formData[$field] = $value;
            }
        }

        $payload['form_data'] = $formData;

        return $payload;
    }

    private static function titleCaseWord(string $word): string
    {
        $word = trim($word);
        if ($word === '') {
            return '';
        }

        return mb_convert_case($word, MB_CASE_TITLE, 'UTF-8');
    }
}

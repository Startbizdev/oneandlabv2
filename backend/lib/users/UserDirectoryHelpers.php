<?php

declare(strict_types=1);

/** Helpers purs pour listes / recherche admin (sans I/O). */
final class UserDirectoryHelpers
{
    /**
     * @param array<string, mixed> $user
     * @return array<string, mixed>
     */
    public static function compactForPicker(array $user): array
    {
        $out = [
            'id' => $user['id'] ?? '',
            'role' => $user['role'] ?? '',
            'first_name' => $user['first_name'] ?? '',
            'last_name' => $user['last_name'] ?? '',
            'email' => $user['email'] ?? '',
            'phone' => $user['phone'] ?? null,
            'company_name' => $user['company_name'] ?? null,
        ];
        if (array_key_exists('lab_id', $user)) {
            $out['lab_id'] = $user['lab_id'];
        }
        if (!empty($user['email_display'])) {
            $out['email_display'] = $user['email_display'];
        }
        if (!empty($user['birth_date'])) {
            $out['birth_date'] = $user['birth_date'];
        }
        if (!empty($user['gender'])) {
            $out['gender'] = $user['gender'];
        }

        return $out;
    }

    public static function profileMatchesAdminSearch(array $user, string $search): bool
    {
        $q = mb_strtolower(trim($search));
        if ($q === '') {
            return true;
        }
        if (preg_match('/^[0-9a-f-]{8,}$/i', $search)) {
            return str_contains(strtolower((string) ($user['id'] ?? '')), strtolower($search));
        }
        $haystacks = [
            (string) ($user['first_name'] ?? ''),
            (string) ($user['last_name'] ?? ''),
            trim(((string) ($user['first_name'] ?? '')) . ' ' . ((string) ($user['last_name'] ?? ''))),
            (string) ($user['email'] ?? ''),
            (string) ($user['email_display'] ?? ''),
            (string) ($user['company_name'] ?? ''),
            (string) ($user['phone'] ?? ''),
        ];
        foreach ($haystacks as $field) {
            if ($field !== '' && str_contains(mb_strtolower($field), $q)) {
                return true;
            }
        }

        return false;
    }
}

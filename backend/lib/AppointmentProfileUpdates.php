<?php

declare(strict_types=1);

/** Booking details may describe a relative rather than the account holder. */
final class AppointmentProfileUpdates
{
    public static function forAccountHolder(array $input): array
    {
        if (!empty($input['relative_id'])) return [];
        $form = is_array($input['form_data'] ?? null) ? $input['form_data'] : [];
        $updates = [];
        foreach (['birth_date', 'gender'] as $field) {
            $value = $form[$field] ?? $input[$field] ?? null;
            if (is_string($value) && trim($value) !== '') $updates[$field] = $value;
        }
        $address = $form['address'] ?? $input['address'] ?? null;
        if (is_string($address)) {
            $decoded = json_decode($address, true);
            $address = is_array($decoded) ? $decoded : (trim($address) !== '' ? ['label' => $address] : null);
        }
        if (is_array($address) && $address !== []) {
            $complement = $form['address_complement'] ?? $input['address_complement'] ?? null;
            if (is_string($complement) && trim($complement) !== '' && empty($address['complement'])) {
                $address['complement'] = $complement;
            }
            $updates['address'] = $address;
        }
        return $updates;
    }
}

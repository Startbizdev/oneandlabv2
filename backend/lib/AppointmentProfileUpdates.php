<?php

declare(strict_types=1);

/** Booking details may describe a relative rather than the account holder. */
final class AppointmentProfileUpdates
{
    public static function forAccountHolder(array $input): array
    {
        if (self::describesAnotherBeneficiary($input)) return [];
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

    private static function describesAnotherBeneficiary(array $input): bool
    {
        if (!empty($input['relative_id'])) {
            return true;
        }

        $form = is_array($input['form_data'] ?? null) ? $input['form_data'] : [];
        $holderId = trim((string) ($input['patient_id'] ?? ''));
        foreach (['beneficiary_patient_id', 'beneficiary_id'] as $field) {
            $beneficiaryId = trim((string) ($input[$field] ?? $form[$field] ?? ''));
            if ($beneficiaryId !== '' && ($holderId === '' || $beneficiaryId !== $holderId)) {
                return true;
            }
        }

        $beneficiaryFirst = trim((string) ($form['beneficiary_first_name'] ?? ''));
        $beneficiaryLast = trim((string) ($form['beneficiary_last_name'] ?? ''));
        if ($beneficiaryFirst === '' && $beneficiaryLast === '') {
            return false;
        }

        $holderFirst = trim((string) (
            $form['account_holder_first_name']
            ?? $form['booking_contact_first_name']
            ?? ''
        ));
        $holderLast = trim((string) (
            $form['account_holder_last_name']
            ?? $form['booking_contact_last_name']
            ?? ''
        ));
        if ($holderFirst === '' && $holderLast === '') {
            return true;
        }

        return mb_strtolower($beneficiaryFirst . '|' . $beneficiaryLast)
            !== mb_strtolower($holderFirst . '|' . $holderLast);
    }
}

<?php

declare(strict_types=1);

/** Résumé brouillon RDV pour le prompt Grok (chat + vocal). */
final class AiBookingDraftSummary
{
    /**
     * @param array<string, mixed> $draft
     * @return array<string, mixed>
     */
    public static function forPrompt(array $draft): array
    {
        $payload = is_array($draft['payload'] ?? null) ? $draft['payload'] : [];
        $formData = is_array($payload['form_data'] ?? null) ? $payload['form_data'] : [];
        $address = is_array($payload['address'] ?? null) ? $payload['address'] : null;

        return [
            'id' => $draft['id'] ?? null,
            'status' => $draft['status'] ?? null,
            'missing_fields' => $draft['missing_fields'] ?? [],
            'booking_step' => $payload['booking_step'] ?? null,
            'patient_mode' => $payload['patient_mode'] ?? null,
            'patient_name' => trim(
                (string) ($payload['first_name'] ?? $formData['first_name'] ?? '')
                . ' '
                . (string) ($payload['last_name'] ?? $formData['last_name'] ?? ''),
            ) ?: null,
            'category_name' => $payload['category_name'] ?? null,
            'scheduled_at' => $payload['scheduled_at'] ?? null,
            'address_label' => is_array($address) ? ($address['label'] ?? null) : null,
            'use_staff_contact_email' => !empty($payload['use_staff_contact_email']),
            'use_staff_contact_phone' => !empty($payload['use_staff_contact_phone']),
            'email_collected' => !empty($payload['email']) || !empty($formData['email']) || !empty($payload['use_staff_contact_email']),
            'phone_collected' => !empty($payload['phone']) || !empty($formData['phone']) || !empty($payload['use_staff_contact_phone']),
        ];
    }
}

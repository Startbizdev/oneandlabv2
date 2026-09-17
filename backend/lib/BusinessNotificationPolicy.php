<?php

declare(strict_types=1);

/**
 * Règles pures de destinataires et de changement réel pour les notifications RDV.
 */
final class BusinessNotificationPolicy
{
    private const CREATOR_ROLES = ['pro', 'nurse', 'lab', 'subaccount', 'preleveur'];

    /**
     * @return list<string>
     */
    public static function appointmentCounterpartIds(array $appointment, ?string $actorId): array
    {
        $ids = [];
        foreach ([
            $appointment['patient_id'] ?? null,
            $appointment['assigned_nurse_id'] ?? null,
            $appointment['assigned_lab_id'] ?? null,
            $appointment['assigned_to'] ?? null,
            $appointment['assigned_pro_id'] ?? null,
        ] as $candidate) {
            self::appendRecipient($ids, $candidate, $actorId);
        }

        $creatorRole = trim((string) ($appointment['created_by_role'] ?? ''));
        if (in_array($creatorRole, self::CREATOR_ROLES, true)) {
            self::appendRecipient($ids, $appointment['created_by'] ?? null, $actorId);
        }

        return array_keys($ids);
    }

    /**
     * @return list<string>
     */
    public static function conversationRecipientIds(array $appointment, string $authorId): array
    {
        $ids = array_fill_keys(self::appointmentCounterpartIds($appointment, $authorId), true);
        // Les anciens RDV n'ont pas toujours created_by_role renseigné : en conversation,
        // le créateur reste une contrepartie légitime (le patient-auteur est exclu ci-dessous).
        self::appendRecipient($ids, $appointment['created_by'] ?? null, $authorId);
        return array_keys($ids);
    }

    /**
     * @return list<string> Valeurs parmi "schedule" et "address".
     */
    public static function changedBusinessFields(array $before, array $after): array
    {
        $changed = [];
        if (
            self::normalizeScheduledAt($before['scheduled_at'] ?? null)
                !== self::normalizeScheduledAt($after['scheduled_at'] ?? null)
            || self::slotSnapshot($before['form_data'] ?? null)
                !== self::slotSnapshot($after['form_data'] ?? null)
        ) {
            $changed[] = 'schedule';
        }

        if (self::addressSnapshot($before['address'] ?? null) !== self::addressSnapshot($after['address'] ?? null)) {
            $changed[] = 'address';
        }

        return $changed;
    }

    private static function appendRecipient(array &$ids, $candidate, ?string $actorId): void
    {
        $id = trim((string) ($candidate ?? ''));
        if ($id === '' || ($actorId !== null && $id === trim($actorId))) {
            return;
        }
        $ids[$id] = true;
    }

    private static function normalizeScheduledAt($value): string
    {
        return trim((string) ($value ?? ''));
    }

    private static function slotSnapshot($formData): string
    {
        if (is_string($formData)) {
            $decoded = json_decode($formData, true);
            $formData = is_array($decoded) ? $decoded : [];
        }
        if (!is_array($formData)) {
            $formData = [];
        }

        $slot = [];
        foreach (['availability', 'availability_type', 'passage_time_slot', 'custom_time'] as $key) {
            if (array_key_exists($key, $formData)) {
                $slot[$key] = self::canonicalize($formData[$key]);
            }
        }
        return json_encode($slot, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '{}';
    }

    private static function addressSnapshot($address): string
    {
        if (is_string($address)) {
            return json_encode(['label' => self::normalizeText($address)]) ?: '{}';
        }
        if (!is_array($address)) {
            return '{}';
        }

        $snapshot = ['label' => self::normalizeText($address['label'] ?? '')];
        foreach (['lat', 'lng'] as $key) {
            if (array_key_exists($key, $address) && is_numeric($address[$key])) {
                $snapshot[$key] = round((float) $address[$key], 6);
            }
        }
        return json_encode($snapshot, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '{}';
    }

    private static function normalizeText($value): string
    {
        return preg_replace('/\s+/u', ' ', trim((string) $value)) ?? '';
    }

    private static function canonicalize($value)
    {
        if (is_string($value)) {
            $trimmed = trim($value);
            $decoded = json_decode($trimmed, true);
            if (is_array($decoded)) {
                return self::canonicalize($decoded);
            }
            return $trimmed;
        }
        if (!is_array($value)) {
            return $value;
        }
        if (!array_is_list($value)) {
            ksort($value);
        }
        foreach ($value as $key => $item) {
            $value[$key] = self::canonicalize($item);
        }
        return $value;
    }
}

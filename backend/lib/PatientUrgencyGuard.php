<?php

declare(strict_types=1);

/**
 * Bloque la création directe d’un RDV patient « Horaire VIP » sans paiement confirmé.
 */
final class PatientUrgencyGuard
{
    public static function assertPaidOrNotRequired(array $data, string $createdByRole): void
    {
        if ($createdByRole !== 'patient') {
            return;
        }
        if (($data['type'] ?? '') !== 'blood_test') {
            return;
        }
        $fd = $data['form_data'] ?? [];
        if (!is_array($fd)) {
            return;
        }
        if (!self::formDataClaimsUrgency($fd)) {
            return;
        }
        $pu = $fd['patient_urgency'] ?? [];
        if (is_array($pu) && !empty($pu['paid'])) {
            return;
        }
        throw new Exception(
            'Le supplément Horaire VIP doit être réglé avant la confirmation du rendez-vous.'
        );
    }

    /**
     * @param array<string, mixed> $formData
     */
    public static function formDataClaimsUrgency(array $formData): bool
    {
        if (self::parseAvailabilityType($formData['availability'] ?? null) === 'urgent') {
            return true;
        }
        $pu = $formData['patient_urgency'] ?? null;
        return is_array($pu) && !empty($pu['enabled']);
    }

    private static function parseAvailabilityType(mixed $availability): ?string
    {
        if ($availability === null || $availability === '') {
            return null;
        }
        if (is_array($availability) && isset($availability['type'])) {
            return (string) $availability['type'];
        }
        if (!is_string($availability)) {
            return null;
        }
        $decoded = json_decode($availability, true);
        if (is_array($decoded) && isset($decoded['type'])) {
            return (string) $decoded['type'];
        }

        return null;
    }
}

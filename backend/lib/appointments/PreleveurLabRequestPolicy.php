<?php

declare(strict_types=1);

require_once __DIR__ . '/../Validation.php';
require_once __DIR__ . '/../StaffPatientConsent.php';
require_once __DIR__ . '/../users/PatientProfessionalAccessService.php';

final class PreleveurLabRequestDenied extends RuntimeException
{
    public function __construct(string $message, public readonly int $httpStatus, public readonly string $errorCode)
    {
        parent::__construct($message);
    }
}

/**
 * Nouvelle demande de prélèvement par un préleveur (hors reprise) : patient de sa liste,
 * RDV en attente attribué à son seul laboratoire, qui valide puis réassigne. Pas de dispatch zone.
 */
final class PreleveurLabRequestPolicy
{
    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public static function apply(PDO $db, string $preleveurId, array $input): array
    {
        if (!StaffPatientConsent::isConsentGiven($input)) {
            throw new PreleveurLabRequestDenied(
                'Veuillez confirmer le consentement du patient pour la prise de rendez-vous.',
                400,
                'PATIENT_BOOKING_CONSENT_REQUIRED'
            );
        }

        $stmt = $db->prepare('SELECT lab_id FROM profiles WHERE id = ? AND role = ? LIMIT 1');
        $stmt->execute([$preleveurId, 'preleveur']);
        $labId = trim((string) ($stmt->fetchColumn() ?: ''));
        if ($labId === '') {
            throw new PreleveurLabRequestDenied(
                'Aucun laboratoire associé au préleveur pour rattacher le nouveau rendez-vous.',
                400,
                'VALIDATION_ERROR'
            );
        }

        $patientId = trim((string) ($input['patient_id'] ?? ''));
        if (
            $patientId === ''
            || !Validation::uuid($patientId)
            || !(new PatientProfessionalAccessService($db))->isPatientVisibleInStaffList($preleveurId, 'preleveur', $patientId)
        ) {
            throw new PreleveurLabRequestDenied(
                'Choisissez un patient de votre liste (créé par vous ou assigné par votre laboratoire).',
                403,
                'FORBIDDEN'
            );
        }

        unset(
            $input['assigned_to'],
            $input['assigned_nurse_id'],
            $input['assigned_pro_id'],
            $input['guest_email'],
            $input['on_behalf_of_user_id'],
            $input['preferred_lab_brand_id']
        );
        if (isset($input['form_data']) && is_array($input['form_data'])) {
            unset(
                $input['form_data']['lab_preference_mode'],
                $input['form_data']['preferred_lab_brand_id'],
                $input['form_data']['preferred_lab_brand_name']
            );
        }
        $input['lab_preference_mode'] = 'platform_match';
        $input['assigned_lab_id'] = $labId;
        $input['status'] = 'pending';
        $input['skip_zone_dispatch'] = true;

        return $input;
    }
}

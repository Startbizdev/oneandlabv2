<?php

require_once __DIR__ . '/Logger.php';

/**
 * Consentement patient pour prise de RDV / création dossier par un professionnel (lab, sous-compte, pro, infirmier).
 */
class StaffPatientConsent
{
  public static function rolesRequiringConsent(): array
  {
    return ['pro', 'nurse', 'lab', 'subaccount'];
  }

  public static function requiresConsent(string $role): bool
  {
    return in_array($role, self::rolesRequiringConsent(), true);
  }

  public static function isConsentGiven(array $input): bool
  {
    $consent = $input['patient_booking_consent'] ?? false;
    if ($consent === true || $consent === 1) {
      return true;
    }
    if (is_string($consent)) {
      $v = strtolower(trim($consent));
      return $v === '1' || $v === 'true';
    }
    return false;
  }

  public static function validateOrFail(array $input, array $user): void
  {
    $role = (string) ($user['role'] ?? '');
    if (!self::requiresConsent($role)) {
      return;
    }
    if (!self::isConsentGiven($input)) {
      http_response_code(400);
      echo json_encode([
        'success' => false,
        'error' => 'Veuillez confirmer le consentement du patient pour la prise de rendez-vous.',
        'code' => 'PATIENT_BOOKING_CONSENT_REQUIRED',
      ]);
      exit;
    }
  }

  public static function logRecorded(array $user, ?string $patientId, string $context): void
  {
    try {
      $logger = new Logger();
      $logger->log(
        $user['user_id'] ?? null,
        $user['role'] ?? null,
        'patient_booking_consent',
        'patient',
        $patientId,
        ['context' => $context],
        $_SERVER['REMOTE_ADDR'] ?? null,
        $_SERVER['HTTP_USER_AGENT'] ?? null,
      );
    } catch (Throwable $e) {
      // Ne pas bloquer la création si le journal échoue
    }
  }
}

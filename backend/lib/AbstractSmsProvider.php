<?php

/**
 * Modèles SMS Cary (confirmations, dispatch, annulations).
 * Implémentations : BrevoSms (prioritaire), Twilio (repli).
 */

require_once __DIR__ . '/NotificationMessageFormatter.php';
require_once __DIR__ . '/../models/User.php';

abstract class AbstractSmsProvider
{
    /** Libellé marque dans le corps du SMS (ex. CARYBIO). */
    protected function brandLabel(): string
    {
        $brand = trim((string) ($_ENV['BREVO_SMS_BRAND'] ?? $_ENV['TWILIO_SMS_BRAND'] ?? 'CARYBIO'));
        return $brand !== '' ? $brand : 'CARYBIO';
    }

    /** Expéditeur alphanumérique (max 11 caractères, sans ponctuation). */
    protected static function alphanumericSender(string $senderId): string
    {
        $sanitized = preg_replace('/[^A-Za-z0-9 ]/', '', $senderId) ?? '';
        $sanitized = trim($sanitized);
        if ($sanitized === '') {
            return 'CaryBio';
        }

        return substr($sanitized, 0, 11);
    }

    protected function formatMessage(string $message): string
    {
        $brand = $this->brandLabel();
        $prefix = $brand . ': ';
        if (stripos($message, $prefix) === 0 || stripos($message, $brand . ' :') === 0) {
            return $message;
        }

        return $prefix . ltrim($message);
    }

    protected function frontendBaseUrl(): string
    {
        return rtrim((string) ($_ENV['FRONTEND_URL'] ?? 'https://cary.bio'), '/');
    }

    /** Normalise un numéro FR (06… / +33…) en E.164. */
    public static function normalizeRecipientE164(string $phone): ?string
    {
        $cleaned = preg_replace('/[\s\-\.]/', '', trim($phone));
        if ($cleaned === '') {
            return null;
        }
        if (preg_match('/^\+[1-9]\d{6,14}$/', $cleaned)) {
            return $cleaned;
        }
        $digits = User::normalizeFrenchPatientPhoneDigits($cleaned);
        if ($digits !== null) {
            return '+33' . substr($digits, 1);
        }

        return null;
    }

    /** Format Brevo : 33644661748 (sans +). */
    public static function normalizeRecipientBrevo(string $phone): ?string
    {
        $e164 = self::normalizeRecipientE164($phone);
        if ($e164 === null) {
            return null;
        }

        return ltrim($e164, '+');
    }

    protected function logSmsFailure(string $context, Throwable $e): void
    {
        $msg = $e->getMessage();
        if (stripos($msg, 'Authenticate') !== false || stripos($msg, 'unauthorized') !== false) {
            return;
        }
        error_log($context . ': ' . $msg);
    }

    /** @return array<string, mixed> */
    abstract public function sendSMS(string $to, string $message): array;

    /**
     * @param array{
     *   id: string,
     *   scheduled_at?: string,
     *   first_name?: string,
     *   role?: string,
     *   appointment_type?: string,
     *   category_name?: string|null,
     *   form_data?: array<string,mixed>|null
     * } $appointmentData
     */
    public function sendNewAppointmentNotification(string $to, array $appointmentData): bool
    {
        $appointmentId = (string) ($appointmentData['id'] ?? '');
        $scheduledAt = $appointmentData['scheduled_at'] ?? null;
        $firstName = trim((string) ($appointmentData['first_name'] ?? ''));
        $role = (string) ($appointmentData['role'] ?? 'nurse');
        $appointmentType = (string) ($appointmentData['appointment_type'] ?? 'nursing');
        $formData = $appointmentData['form_data'] ?? null;

        $greeting = $firstName !== '' ? "Bonjour {$firstName}," : 'Bonjour,';
        $optionMeta = is_array($appointmentData['option_meta'] ?? null)
            ? $appointmentData['option_meta']
            : [];
        $details = NotificationMessageFormatter::appointmentContextShort(
            is_array($formData) ? $formData : [],
            $appointmentData['category_name'] ?? null,
            $appointmentType,
            is_string($scheduledAt) ? $scheduledAt : null,
            $optionMeta
        );
        $detailsPart = $details !== '' ? " ({$details})" : '';

        $base = $this->frontendBaseUrl();
        $isLab = in_array($role, ['lab', 'subaccount'], true) || $appointmentType === 'blood_test';
        if ($isLab) {
            $url = $base . '/lab/appointments?openAppointment=' . rawurlencode($appointmentId);
            $message = "{$greeting} demande de prélèvement disponible dans votre secteur{$detailsPart}. Consultez : {$url}";
        } else {
            $url = $base . '/nurse/demandes?openAppointment=' . rawurlencode($appointmentId);
            $message = "{$greeting} nouvelle demande de soin dans votre secteur{$detailsPart}. Accepter : {$url}";
        }

        try {
            $this->sendSMS($to, $message);
            return true;
        } catch (Exception $e) {
            $this->logSmsFailure(static::class . ' sendNewAppointmentNotification', $e);
            return false;
        }
    }

    public function sendAppointmentConfirmation(string $to, array $appointmentData): bool
    {
        $professionalName = $appointmentData['professional_name'] ?? 'votre professionnel';
        $appointmentId = (string) ($appointmentData['id'] ?? '');
        $url = $this->frontendBaseUrl() . '/patient/appointments/' . $appointmentId;
        $optionMeta = is_array($appointmentData['option_meta'] ?? null)
            ? $appointmentData['option_meta']
            : [];
        $details = NotificationMessageFormatter::appointmentContextShort(
            is_array($appointmentData['form_data'] ?? null) ? $appointmentData['form_data'] : [],
            $appointmentData['category_name'] ?? null,
            ($appointmentData['type'] ?? '') === 'nursing' ? 'nursing' : 'blood_test',
            isset($appointmentData['scheduled_at']) ? (string) $appointmentData['scheduled_at'] : null,
            $optionMeta
        );
        $whenPart = $details !== '' ? $details : NotificationMessageFormatter::whenShort(
            $appointmentData['form_data'] ?? null,
            $appointmentData['scheduled_at'] ?? null
        );

        $message = "[CONFIRME] RDV confirmé avec {$professionalName}";
        if ($whenPart !== '') {
            $message .= " · {$whenPart}";
        }
        $message .= ".\nVoir détails : {$url}";

        try {
            $this->sendSMS($to, $message);
            return true;
        } catch (Exception $e) {
            $this->logSmsFailure(static::class . ' sendAppointmentConfirmation', $e);
            return false;
        }
    }

    /** @param array<string, mixed> $appointmentData */
    public function sendAppointmentRescheduled(string $to, array $appointmentData, ?string $professionalName = null): bool
    {
        $professionalName = trim((string) ($professionalName ?? 'votre infirmier'));
        $appointmentId = (string) ($appointmentData['id'] ?? '');
        $url = $this->frontendBaseUrl() . '/patient/appointments/' . $appointmentId;
        $optionMeta = is_array($appointmentData['option_meta'] ?? null)
            ? $appointmentData['option_meta']
            : [];
        $details = NotificationMessageFormatter::appointmentContextShort(
            is_array($appointmentData['form_data'] ?? null) ? $appointmentData['form_data'] : [],
            $appointmentData['category_name'] ?? null,
            ($appointmentData['type'] ?? '') === 'nursing' ? 'nursing' : 'blood_test',
            isset($appointmentData['scheduled_at']) ? (string) $appointmentData['scheduled_at'] : null,
            $optionMeta
        );
        $whenPart = $details !== '' ? $details : NotificationMessageFormatter::whenShort(
            $appointmentData['form_data'] ?? null,
            $appointmentData['scheduled_at'] ?? null
        );

        $message = "[CARY] Votre RDV a été déplacé par {$professionalName}";
        if ($whenPart !== '') {
            $message .= " · {$whenPart}";
        }
        $message .= ".\nVoir détails : {$url}";

        try {
            $this->sendSMS($to, $message);
            return true;
        } catch (Exception $e) {
            $this->logSmsFailure(static::class . ' sendAppointmentRescheduled', $e);
            return false;
        }
    }

    public function sendProfessionalAppointmentUpdate(string $to, string $message): bool
    {
        try {
            $this->sendSMS($to, $message);
            return true;
        } catch (Exception $e) {
            $this->logSmsFailure(static::class . ' sendProfessionalAppointmentUpdate', $e);
            return false;
        }
    }

    public function sendAppointmentCanceled(string $to): bool
    {
        $message = 'Votre rendez-vous a été annulé.';
        try {
            $this->sendSMS($to, $message);
            return true;
        } catch (Exception $e) {
            return false;
        }
    }

    public function sendAppointmentExpired(string $to): bool
    {
        $baseUrl = $_ENV['FRONTEND_URL'] ?? 'https://cary.bio';
        $rebookUrl = $baseUrl . '/rendez-vous/nouveau';
        $message = 'Désolé, aucun professionnel disponible. Vous pouvez reprendre rendez-vous : ' . $rebookUrl;
        try {
            $this->sendSMS($to, $message);
            return true;
        } catch (Exception $e) {
            return false;
        }
    }
}

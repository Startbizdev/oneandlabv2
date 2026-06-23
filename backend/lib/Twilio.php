<?php

/**
 * Classe d'envoi de SMS via Twilio
 * Utilisé uniquement pour les notifications (pas pour l'authentification)
 */

require_once __DIR__ . '/NotificationMessageFormatter.php';
require_once __DIR__ . '/../models/User.php';

class Twilio
{
    private string $accountSid;
    private string $authToken;
    /** Expéditeur Twilio : identifiant alphanumérique (ex. CaryBio) ou numéro E.164. */
    private string $from;

    /** Libellé marque dans le corps du SMS (ex. Cary.bio). */
    private function brandLabel(): string
    {
        $brand = trim((string) ($_ENV['TWILIO_SMS_BRAND'] ?? 'Cary.bio'));
        return $brand !== '' ? $brand : 'Cary.bio';
    }

    /** Identifiant alphanumérique Twilio pour le champ From (max 11, sans ponctuation). */
    private static function twilioAlphanumericFrom(string $senderId): string
    {
        $sanitized = preg_replace('/[^A-Za-z0-9 ]/', '', $senderId) ?? '';
        $sanitized = trim($sanitized);
        if ($sanitized === '') {
            return 'CaryBio';
        }
        return substr($sanitized, 0, 11);
    }

    public function __construct()
    {
        $this->accountSid = $_ENV['TWILIO_ACCOUNT_SID'] ?? '';
        $this->authToken = $_ENV['TWILIO_AUTH_TOKEN'] ?? '';
        $senderId = trim((string) ($_ENV['TWILIO_SENDER_ID'] ?? 'CaryBio'));
        $phoneNumber = trim((string) ($_ENV['TWILIO_PHONE_NUMBER'] ?? $_ENV['TWILIO_FROM_NUMBER'] ?? ''));
        $this->from = $senderId !== ''
            ? self::twilioAlphanumericFrom($senderId)
            : $phoneNumber;

        if (empty($this->accountSid) || empty($this->authToken) || empty($this->from)) {
            throw new Exception('Configuration Twilio incomplète');
        }
    }

    private function brandPrefix(): string
    {
        return $this->brandLabel();
    }

    private function formatMessage(string $message): string
    {
        $brand = $this->brandPrefix();
        $prefix = $brand . ': ';
        if (stripos($message, $prefix) === 0 || stripos($message, $brand . ' :') === 0) {
            return $message;
        }
        return $prefix . ltrim($message);
    }

    private function frontendBaseUrl(): string
    {
        return rtrim((string) ($_ENV['FRONTEND_URL'] ?? 'https://cary.bio'), '/');
    }

    /** Normalise un numéro FR (06… / +33…) en E.164 pour Twilio. */
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

    /**
     * Envoie un SMS
     */
    public function sendSMS(string $to, string $message): array
    {
        $toE164 = self::normalizeRecipientE164($to);
        if ($toE164 === null) {
            throw new Exception('Numéro SMS invalide: ' . $to);
        }

        $url = sprintf(
            'https://api.twilio.com/2010-04-01/Accounts/%s/Messages.json',
            $this->accountSid
        );
        
        $data = [
            'From' => $this->from,
            'To' => $toE164,
            'Body' => $this->formatMessage($message),
        ];
        
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_USERPWD, $this->accountSid . ':' . $this->authToken);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode !== 201) {
            $error = json_decode($response, true);
            throw new Exception('Erreur Twilio: ' . ($error['message'] ?? 'Erreur inconnue'));
        }
        
        return json_decode($response, true);
    }

    /**
     * Envoie une notification SMS pour un nouveau rendez-vous (infirmier / labo).
     *
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
            error_log('Twilio sendNewAppointmentNotification: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Envoie une notification SMS de confirmation (patient)
     */
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
            error_log('Twilio sendAppointmentConfirmation: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * SMS pro (infirmier / labo) : RDV confirmé ou accepté.
     */
    public function sendProfessionalAppointmentUpdate(string $to, string $message): bool
    {
        try {
            $this->sendSMS($to, $message);
            return true;
        } catch (Exception $e) {
            error_log('Twilio sendProfessionalAppointmentUpdate: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * SMS au patient : rendez-vous annulé
     */
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

    /**
     * SMS au patient : RDV expiré (aucun pro disponible)
     */
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


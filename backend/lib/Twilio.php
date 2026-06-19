<?php

/**
 * Classe d'envoi de SMS via Twilio
 * Utilisé uniquement pour les notifications (pas pour l'authentification)
 */

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

    /**
     * Envoie un SMS
     */
    public function sendSMS(string $to, string $message): array
    {
        $url = sprintf(
            'https://api.twilio.com/2010-04-01/Accounts/%s/Messages.json',
            $this->accountSid
        );
        
        $data = [
            'From' => $this->from,
            'To' => $to,
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
     * @param array{id: string, scheduled_at?: string, first_name?: string, role?: string, appointment_type?: string} $appointmentData
     */
    public function sendNewAppointmentNotification(string $to, array $appointmentData): bool
    {
        $appointmentId = (string) ($appointmentData['id'] ?? '');
        $scheduledAt = $appointmentData['scheduled_at'] ?? null;
        $firstName = trim((string) ($appointmentData['first_name'] ?? ''));
        $role = (string) ($appointmentData['role'] ?? 'nurse');
        $appointmentType = (string) ($appointmentData['appointment_type'] ?? 'nursing');

        $greeting = $firstName !== '' ? "Bonjour {$firstName}," : 'Bonjour,';
        $when = '';
        if (!empty($scheduledAt)) {
            $when = ' pour le ' . date('d/m/Y à H:i', strtotime((string) $scheduledAt));
        }

        $base = $this->frontendBaseUrl();
        $isLab = in_array($role, ['lab', 'subaccount'], true) || $appointmentType === 'blood_test';
        if ($isLab) {
            $url = $base . '/lab/appointments?openAppointment=' . rawurlencode($appointmentId);
            $message = "{$greeting} une demande de prélèvement est disponible dans votre secteur{$when}. Consultez-la : {$url}";
        } else {
            $url = $base . '/nurse/demandes?openAppointment=' . rawurlencode($appointmentId);
            $message = "{$greeting} vous avez reçu une demande de soin pour un patient dans votre secteur{$when}. Vous pouvez l'accepter : {$url}";
        }

        try {
            $this->sendSMS($to, $message);
            return true;
        } catch (Exception $e) {
            return false;
        }
    }

    /**
     * Envoie une notification SMS de confirmation (patient)
     */
    public function sendAppointmentConfirmation(string $to, array $appointmentData): bool
    {
        $professionalName = $appointmentData['professional_name'] ?? 'votre professionnel';
        $date = date('d/m/Y à H:i', strtotime($appointmentData['scheduled_at']));
        $appointmentId = $appointmentData['id'];
        $url = $this->frontendBaseUrl() . '/patient/appointments/' . $appointmentId;
        
        $message = "[CONFIRME] Votre rendez-vous est confirmé avec {$professionalName} le {$date}.\nVoir détails : {$url}";
        
        try {
            $this->sendSMS($to, $message);
            return true;
        } catch (Exception $e) {
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


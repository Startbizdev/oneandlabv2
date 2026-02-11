<?php

/**
 * Classe d'envoi de SMS via Twilio
 * Utilisé uniquement pour les notifications (pas pour l'authentification)
 */

class Twilio
{
    private string $accountSid;
    private string $authToken;
    private string $fromNumber;

    public function __construct()
    {
        $this->accountSid = $_ENV['TWILIO_ACCOUNT_SID'] ?? '';
        $this->authToken = $_ENV['TWILIO_AUTH_TOKEN'] ?? '';
        $this->fromNumber = $_ENV['TWILIO_FROM_NUMBER'] ?? '';
        
        if (empty($this->accountSid) || empty($this->authToken) || empty($this->fromNumber)) {
            throw new Exception('Configuration Twilio incomplète');
        }
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
            'From' => $this->fromNumber,
            'To' => $to,
            'Body' => $message,
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
     * Envoie une notification SMS pour un nouveau rendez-vous (infirmier)
     */
    public function sendNewAppointmentNotification(string $to, array $appointmentData): bool
    {
        $date = date('d/m/Y à H:i', strtotime($appointmentData['scheduled_at']));
        $appointmentId = $appointmentData['id'];
        $url = 'https://oneandlab.fr/nurse/appointments/' . $appointmentId;
        
        $message = "[NOUVEAU] Nouveau RDV dans votre secteur le {$date}.\nVoir détails : {$url}";
        
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
        $url = 'https://oneandlab.fr/patient/appointments/' . $appointmentId;
        
        $message = "[CONFIRME] Votre rendez-vous est confirmé avec {$professionalName} le {$date}.\nVoir détails : {$url}";
        
        try {
            $this->sendSMS($to, $message);
            return true;
        } catch (Exception $e) {
            return false;
        }
    }
}


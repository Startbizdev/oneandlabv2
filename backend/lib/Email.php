<?php

/**
 * Classe d'envoi d'emails via SMTP OVH
 */

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/../../vendor/autoload.php';

class Email
{
    private string $smtpHost;
    private int $smtpPort;
    private string $smtpUser;
    private string $smtpPass;
    private bool $smtpSecure;
    private string $fromEmail;
    private string $fromName;

    public function __construct()
    {
        $this->smtpHost = $_ENV['SMTP_HOST'] ?? 'ssl0.ovh.net';
        $this->smtpPort = (int) ($_ENV['SMTP_PORT'] ?? 465);
        $this->smtpUser = $_ENV['SMTP_USER'] ?? '';
        $this->smtpPass = $_ENV['SMTP_PASS'] ?? '';
        $this->smtpSecure = filter_var($_ENV['SMTP_SECURE'] ?? 'false', FILTER_VALIDATE_BOOLEAN);
        $this->fromEmail = $_ENV['EMAIL_FROM'] ?? $_ENV['SMTP_FROM_EMAIL'] ?? 'noreply@oneandlab.fr';
        $this->fromName = $_ENV['SMTP_FROM_NAME'] ?? 'OneAndLab';
    }

    /**
     * Envoie un email via SMTP
     */
    public function send(
        string $to,
        string $subject,
        string $body,
        bool $isHTML = true
    ): bool {
        try {
            $mail = new PHPMailer(true);
            
            // Configuration SMTP
            $mail->isSMTP();
            $mail->Host = $this->smtpHost;
            $mail->SMTPAuth = true;
            $mail->Username = $this->smtpUser;
            $mail->Password = $this->smtpPass;
            $mail->Port = $this->smtpPort;
            
            // Configuration de la sécurité
            if ($this->smtpSecure) {
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS; // SSL
            } else {
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS; // TLS
            }
            
            // Options de débogage (désactivé en production)
            $mail->SMTPDebug = 0;
            
            // Expéditeur
            $mail->setFrom($this->fromEmail, $this->fromName);
            $mail->addReplyTo($this->fromEmail, $this->fromName);
            
            // Destinataire
            $mail->addAddress($to);
            
            // Contenu
            $mail->isHTML($isHTML);
            $mail->Subject = $subject;
            $mail->Body = $body;
            $mail->CharSet = 'UTF-8';
            
            // Envoi
            return $mail->send();
        } catch (Exception $e) {
            return false;
        }
    }

    /**
     * Envoie un code OTP par email
     */
    public function sendOTP(string $to, string $otp): bool
    {
        // DEV: Logger l'OTP dans la console
        error_log("🔐 OTP pour $to: $otp");
        
        // MODE DEV: Si pas de config SMTP, skip l'envoi (juste logger)
        if (empty($this->smtpUser) || empty($this->smtpPass)) {
            error_log("⚠️ SMTP non configuré - OTP non envoyé (mode DEV)");
            return true; // Succès simulé
        }
        
        $subject = 'Votre code de connexion OneAndLab';
        $body = $this->getOTPTemplate($otp);
        
        return $this->send($to, $subject, $body, true);
    }

    /**
     * Template HTML pour l'email OTP
     */
    private function getOTPTemplate(string $otp): string
    {
        return '
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #0652DD; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .otp-code { font-size: 32px; font-weight: bold; text-align: center; letter-spacing: 5px; color: #0652DD; padding: 20px; background-color: white; border: 2px dashed #0652DD; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>OneAndLab</h1>
        </div>
        <div class="content">
            <h2>Votre code de connexion</h2>
            <p>Bonjour,</p>
            <p>Voici votre code de connexion à usage unique :</p>
            <div class="otp-code">' . htmlspecialchars($otp) . '</div>
            <p>Ce code est valable pendant <strong>5 minutes</strong>.</p>
            <p>Si vous n\'avez pas demandé ce code, ignorez cet email.</p>
        </div>
        <div class="footer">
            <p>OneAndLab - Prise de sang et soins infirmiers à domicile</p>
        </div>
    </div>
</body>
</html>';
    }

    /**
     * Envoie une notification de confirmation de rendez-vous
     */
    public function sendAppointmentConfirmation(string $to, array $appointmentData): bool
    {
        $subject = 'Confirmation de votre rendez-vous OneAndLab';
        $body = $this->getAppointmentConfirmationTemplate($appointmentData);
        
        return $this->send($to, $subject, $body, true);
    }

    /**
     * Template HTML pour confirmation de rendez-vous
     */
    private function getAppointmentConfirmationTemplate(array $data): string
    {
        return '
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #0652DD; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .info-box { background-color: white; padding: 15px; margin: 10px 0; border-left: 4px solid #0652DD; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>OneAndLab</h1>
        </div>
        <div class="content">
            <h2>Votre rendez-vous est confirmé</h2>
            <p>Bonjour,</p>
            <p>Votre rendez-vous a été confirmé avec succès.</p>
            <div class="info-box">
                <p><strong>Date et heure :</strong> ' . htmlspecialchars($data['scheduled_at'] ?? '') . '</p>
                <p><strong>Type :</strong> ' . htmlspecialchars($data['type'] ?? '') . '</p>
            </div>
            <p>Vous recevrez un rappel 30 minutes avant votre rendez-vous.</p>
        </div>
        <div class="footer">
            <p>OneAndLab - Prise de sang et soins infirmiers à domicile</p>
        </div>
    </div>
</body>
</html>';
    }

    /**
     * Envoie une invitation à noter après un rendez-vous terminé
     */
    public function sendReviewInvitation(string $to, string $appointmentId, array $appointmentData): bool
    {
        $subject = 'Donnez votre avis sur votre rendez-vous OneAndLab';
        $body = $this->getReviewInvitationTemplate($appointmentId, $appointmentData);
        
        return $this->send($to, $subject, $body, true);
    }

    /**
     * Template HTML pour invitation à noter
     */
    private function getReviewInvitationTemplate(string $appointmentId, array $data): string
    {
        $baseUrl = $_ENV['FRONTEND_URL'] ?? 'https://oneandlab.fr';
        $reviewUrl = $baseUrl . '/patient/appointments/' . $appointmentId;
        
        return '
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #0652DD; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .cta-button { display: inline-block; background-color: #0652DD; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
        .cta-button:hover { background-color: #0540b8; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>OneAndLab</h1>
        </div>
        <div class="content">
            <h2>Votre rendez-vous est terminé</h2>
            <p>Bonjour,</p>
            <p>Votre rendez-vous du ' . htmlspecialchars($data['scheduled_at'] ?? '') . ' est maintenant terminé.</p>
            <p>Nous serions ravis de connaître votre avis sur le service reçu. Votre opinion nous aide à améliorer nos services.</p>
            <div style="text-align: center;">
                <a href="' . htmlspecialchars($reviewUrl) . '" class="cta-button">Donner mon avis</a>
            </div>
            <p>Merci pour votre confiance !</p>
        </div>
        <div class="footer">
            <p>OneAndLab - Prise de sang et soins infirmiers à domicile</p>
        </div>
    </div>
</body>
</html>';
    }

    /**
     * Envoie un email d'avertissement pour incident
     */
    public function sendIncidentWarning(string $to, int $incidentCount, string $reason): bool
    {
        $subject = 'Avertissement - Incident enregistré';
        $body = $this->getIncidentWarningTemplate($incidentCount, $reason);
        
        return $this->send($to, $subject, $body, true);
    }

    /**
     * Envoie un email de suspension
     */
    public function sendSuspensionEmail(string $to, int $days, string $reason): bool
    {
        $subject = 'Suspension de votre compte OneAndLab';
        $body = $this->getSuspensionTemplate($days, $reason);
        
        return $this->send($to, $subject, $body, true);
    }

    /**
     * Envoie un email de bannissement
     */
    public function sendBanEmail(string $to, string $reason): bool
    {
        $subject = 'Bannissement de votre compte OneAndLab';
        $body = $this->getBanTemplate($reason);
        
        return $this->send($to, $subject, $body, true);
    }

    /**
     * Template HTML pour avertissement incident
     */
    private function getIncidentWarningTemplate(int $incidentCount, string $reason): string
    {
        return '
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #F4B400; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .warning-box { background-color: #fff3cd; border-left: 4px solid #F4B400; padding: 15px; margin: 10px 0; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>OneAndLab</h1>
        </div>
        <div class="content">
            <h2>Avertissement</h2>
            <p>Bonjour,</p>
            <div class="warning-box">
                <p><strong>Un incident a été enregistré sur votre compte.</strong></p>
                <p><strong>Raison :</strong> ' . htmlspecialchars($reason) . '</p>
                <p><strong>Nombre d\'incidents :</strong> ' . $incidentCount . '</p>
            </div>
            <p>Nous vous rappelons l\'importance de respecter les règles de la plateforme. En cas de récidive, des sanctions pourront être appliquées.</p>
            <p>Si vous avez des questions, n\'hésitez pas à nous contacter.</p>
        </div>
        <div class="footer">
            <p>OneAndLab - Prise de sang et soins infirmiers à domicile</p>
        </div>
    </div>
</body>
</html>';
    }

    /**
     * Template HTML pour suspension
     */
    private function getSuspensionTemplate(int $days, string $reason): string
    {
        return '
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #DB4437; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .suspension-box { background-color: #ffebee; border-left: 4px solid #DB4437; padding: 15px; margin: 10px 0; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>OneAndLab</h1>
        </div>
        <div class="content">
            <h2>Suspension de votre compte</h2>
            <p>Bonjour,</p>
            <div class="suspension-box">
                <p><strong>Votre compte a été suspendu pour une durée de ' . $days . ' jours.</strong></p>
                <p><strong>Raison :</strong> ' . htmlspecialchars($reason) . '</p>
            </div>
            <p>Cette suspension fait suite à plusieurs incidents enregistrés sur votre compte. Pendant cette période, vous ne pourrez pas accéder à la plateforme.</p>
            <p>Votre compte sera automatiquement réactivé après la période de suspension.</p>
            <p>Si vous avez des questions ou souhaitez contester cette décision, n\'hésitez pas à nous contacter.</p>
        </div>
        <div class="footer">
            <p>OneAndLab - Prise de sang et soins infirmiers à domicile</p>
        </div>
    </div>
</body>
</html>';
    }

    /**
     * Template HTML pour bannissement
     */
    private function getBanTemplate(string $reason): string
    {
        return '
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #DB4437; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .ban-box { background-color: #ffebee; border-left: 4px solid #DB4437; padding: 15px; margin: 10px 0; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>OneAndLab</h1>
        </div>
        <div class="content">
            <h2>Bannissement de votre compte</h2>
            <p>Bonjour,</p>
            <div class="ban-box">
                <p><strong>Votre compte a été définitivement banni de la plateforme OneAndLab.</strong></p>
                <p><strong>Raison :</strong> ' . htmlspecialchars($reason) . '</p>
            </div>
            <p>Cette décision fait suite à de multiples incidents graves enregistrés sur votre compte. Vous ne pourrez plus accéder à la plateforme.</p>
            <p>Si vous avez des questions ou souhaitez contester cette décision, vous pouvez nous contacter par email.</p>
        </div>
        <div class="footer">
            <p>OneAndLab - Prise de sang et soins infirmiers à domicile</p>
        </div>
    </div>
</body>
</html>';
    }
}


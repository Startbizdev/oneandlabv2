<?php

/**
 * Classe d'envoi d'emails via SMTP OVH
 * Template de base minimal (Stripe/Linear/Notion) avec logo.
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
     * Template de base minimal (Stripe/Linear/Notion) avec logo.
     * @param string $content HTML du corps (sans header/footer)
     * @param array $options title (h1), ctaUrl, ctaLabel
     */
    private function baseLayout(string $content, array $options = []): string
    {
        $logoUrl = $_ENV['EMAIL_LOGO_URL'] ?? ($_ENV['FRONTEND_URL'] ?? 'https://app.oneandlab.fr') . '/images/onelogo.png';
        $title = $options['title'] ?? 'OneAndLab';
        $ctaUrl = $options['ctaUrl'] ?? '';
        $ctaLabel = $options['ctaLabel'] ?? '';
        $ctaHtml = '';
        if ($ctaUrl !== '' && $ctaLabel !== '') {
            $ctaHtml = '<p style="margin: 24px 0;"><a href="' . htmlspecialchars($ctaUrl) . '" style="display: inline-block; background: #18181b; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">' . htmlspecialchars($ctaLabel) . '</a></p>';
        }
        return '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; line-height: 1.6; color: #18181b; margin: 0; padding: 0; background: #fafafa; }
        .wrap { max-width: 480px; margin: 0 auto; padding: 40px 24px; }
        .card { background: #fff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
        .logo { display: block; margin-bottom: 24px; height: 32px; }
        h1 { font-size: 18px; font-weight: 600; margin: 0 0 16px; color: #18181b; }
        p { margin: 0 0 12px; font-size: 15px; color: #3f3f46; }
        .footer { text-align: center; margin-top: 32px; font-size: 12px; color: #71717a; }
    </style>
</head>
<body>
    <div class="wrap">
        <div class="card">
            <img src="' . htmlspecialchars($logoUrl) . '" alt="OneAndLab" class="logo" />
            <h1>' . htmlspecialchars($title) . '</h1>
            ' . $content . '
            ' . $ctaHtml . '
        </div>
        <p class="footer">OneAndLab — Prise de sang et soins infirmiers à domicile</p>
    </div>
</body>
</html>';
    }

    public function sendWelcome(string $to, array $p): bool
    {
        $content = '<p>Bienvenue sur OneAndLab.</p><p>Vous pouvez désormais prendre rendez-vous pour des prises de sang ou soins infirmiers à domicile.</p>';
        $baseUrl = $_ENV['FRONTEND_URL'] ?? 'https://oneandlab.fr';
        $body = $this->baseLayout($content, [
            'title' => 'Bienvenue',
            'ctaUrl' => $baseUrl,
            'ctaLabel' => 'Accéder à mon espace',
        ]);
        return $this->send($to, 'Bienvenue sur OneAndLab', $body, true);
    }

    public function sendAppointmentCreated(string $to, array $p): bool
    {
        $type = ($p['type'] ?? '') === 'blood_test' ? 'Prise de sang' : 'Soins infirmiers';
        $date = isset($p['scheduled_at']) ? (new DateTime($p['scheduled_at']))->format('d/m/Y à H:i') : '';
        $content = '<p>Votre rendez-vous a bien été enregistré.</p>';
        $content .= '<p><strong>Type :</strong> ' . htmlspecialchars($type) . '</p>';
        if ($date) {
            $content .= '<p><strong>Date :</strong> ' . htmlspecialchars($date) . '</p>';
        }
        $content .= '<p>Il sera pris en charge par un professionnel sous peu. Vous recevrez une confirmation par email.</p>';
        $baseUrl = $_ENV['FRONTEND_URL'] ?? 'https://oneandlab.fr';
        $body = $this->baseLayout($content, [
            'title' => 'Rendez-vous enregistré',
            'ctaUrl' => $baseUrl . '/patient',
            'ctaLabel' => 'Voir mes rendez-vous',
        ]);
        return $this->send($to, 'Votre rendez-vous OneAndLab a été enregistré', $body, true);
    }

    public function sendAppointmentCanceledToPatient(string $to, array $p): bool
    {
        $actor = $p['actor_display_label'] ?? 'Le professionnel de santé';
        $content = '<p>' . htmlspecialchars($actor) . ' a annulé votre rendez-vous.</p>';
        if (!empty($p['scheduled_at'])) {
            $date = (new DateTime($p['scheduled_at']))->format('d/m/Y à H:i');
            $content .= '<p><strong>Date prévue :</strong> ' . htmlspecialchars($date) . '</p>';
        }
        $content .= '<p>Vous pouvez prendre un nouveau rendez-vous à tout moment.</p>';
        $baseUrl = $_ENV['FRONTEND_URL'] ?? 'https://oneandlab.fr';
        $body = $this->baseLayout($content, [
            'title' => 'Rendez-vous annulé',
            'ctaUrl' => $baseUrl . '/rendez-vous/nouveau',
            'ctaLabel' => 'Prendre un nouveau rendez-vous',
        ]);
        return $this->send($to, 'Rendez-vous annulé — OneAndLab', $body, true);
    }

    public function sendNewAppointmentToPro(string $to, array $p): bool
    {
        $content = '<p>Un nouveau rendez-vous est disponible dans votre zone.</p>';
        if (!empty($p['scheduled_at'])) {
            $date = (new DateTime($p['scheduled_at']))->format('d/m/Y à H:i');
            $content .= '<p><strong>Date :</strong> ' . htmlspecialchars($date) . '</p>';
        }
        $content .= '<p>Connectez-vous à votre espace pour l\'accepter.</p>';
        $baseUrl = $_ENV['FRONTEND_URL'] ?? 'https://oneandlab.fr';
        $appointmentId = $p['appointment_id'] ?? '';
        $path = ($p['role'] ?? '') === 'nurse' ? '/nurse/appointments' : '/lab/appointments';
        if ($appointmentId) {
            $path .= '/' . $appointmentId;
        }
        $body = $this->baseLayout($content, [
            'title' => 'Nouveau rendez-vous disponible',
            'ctaUrl' => $baseUrl . $path,
            'ctaLabel' => 'Voir le rendez-vous',
        ]);
        return $this->send($to, 'Nouveau rendez-vous disponible — OneAndLab', $body, true);
    }

    public function sendAppointmentAssignedToPreleveur(string $to, array $p): bool
    {
        $content = '<p>Un rendez-vous vous a été assigné.</p>';
        if (!empty($p['scheduled_at'])) {
            $date = (new DateTime($p['scheduled_at']))->format('d/m/Y à H:i');
            $content .= '<p><strong>Date :</strong> ' . htmlspecialchars($date) . '</p>';
        }
        $content .= '<p>Consultez votre calendrier pour les détails.</p>';
        $baseUrl = $_ENV['FRONTEND_URL'] ?? 'https://oneandlab.fr';
        $appointmentId = $p['appointment_id'] ?? '';
        $url = $baseUrl . '/preleveur/calendar';
        if ($appointmentId) {
            $url = $baseUrl . '/preleveur/appointments/' . $appointmentId;
        }
        $body = $this->baseLayout($content, [
            'title' => 'Rendez-vous assigné',
            'ctaUrl' => $url,
            'ctaLabel' => 'Voir le rendez-vous',
        ]);
        return $this->send($to, 'Rendez-vous assigné — OneAndLab', $body, true);
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
     * Template HTML pour l'email OTP — style institutionnel (Stripe/Notion/Linear), logo header sans fond
     */
    private function getOTPTemplate(string $otp): string
    {
        $logoUrl = $_ENV['EMAIL_LOGO_URL'] ?? ($_ENV['FRONTEND_URL'] ?? 'https://oneandlab.fr') . '/images/onelogo.png';
        return '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; line-height: 1.6; color: #18181b; margin: 0; padding: 0; background: #fafafa; }
        .wrap { max-width: 480px; margin: 0 auto; padding: 40px 24px; }
        .card { background: #fff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
        .logo { display: block; margin-bottom: 24px; height: 32px; }
        h1 { font-size: 18px; font-weight: 600; margin: 0 0 16px; color: #18181b; }
        p { margin: 0 0 12px; font-size: 15px; color: #3f3f46; }
        .otp-code { font-size: 28px; font-weight: 600; text-align: center; letter-spacing: 6px; color: #18181b; padding: 20px; background: #f4f4f5; border-radius: 8px; margin: 24px 0; font-family: ui-monospace, monospace; }
        .footer { text-align: center; margin-top: 32px; font-size: 12px; color: #71717a; }
    </style>
</head>
<body>
    <div class="wrap">
        <div class="card">
            <img src="' . htmlspecialchars($logoUrl) . '" alt="OneAndLab" class="logo" />
            <h1>Votre code de connexion</h1>
            <p>Bonjour,</p>
            <p>Voici votre code de connexion à usage unique :</p>
            <div class="otp-code">' . htmlspecialchars($otp) . '</div>
            <p>Ce code est valable pendant <strong>5 minutes</strong>.</p>
            <p>Si vous n\'avez pas demandé ce code, ignorez cet email.</p>
        </div>
        <p class="footer">OneAndLab — Prise de sang et soins infirmiers à domicile</p>
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
     * Template HTML pour confirmation de rendez-vous — style institutionnel, logo sans fond
     */
    private function getAppointmentConfirmationTemplate(array $data): string
    {
        $logoUrl = $_ENV['EMAIL_LOGO_URL'] ?? ($_ENV['FRONTEND_URL'] ?? 'https://oneandlab.fr') . '/images/onelogo.png';
        return '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; line-height: 1.6; color: #18181b; margin: 0; padding: 0; background: #fafafa; }
        .wrap { max-width: 480px; margin: 0 auto; padding: 40px 24px; }
        .card { background: #fff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
        .logo { display: block; margin-bottom: 24px; height: 32px; }
        h1 { font-size: 18px; font-weight: 600; margin: 0 0 16px; color: #18181b; }
        p { margin: 0 0 12px; font-size: 15px; color: #3f3f46; }
        .info-box { background: #f4f4f5; padding: 16px; margin: 16px 0; border-radius: 8px; border-left: 4px solid #18181b; }
        .footer { text-align: center; margin-top: 32px; font-size: 12px; color: #71717a; }
    </style>
</head>
<body>
    <div class="wrap">
        <div class="card">
            <img src="' . htmlspecialchars($logoUrl) . '" alt="OneAndLab" class="logo" />
            <h1>Votre rendez-vous est confirmé</h1>
            <p>Bonjour,</p>
            <p>Votre rendez-vous a été confirmé avec succès.</p>
            <div class="info-box">
                <p style="margin:0;"><strong>Date et heure :</strong> ' . htmlspecialchars($data['scheduled_at'] ?? '') . '</p>
                <p style="margin:8px 0 0 0;"><strong>Type :</strong> ' . htmlspecialchars($data['type'] ?? '') . '</p>
            </div>
            <p>Vous recevrez un rappel 30 minutes avant votre rendez-vous.</p>
        </div>
        <p class="footer">OneAndLab — Prise de sang et soins infirmiers à domicile</p>
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
        $logoUrl = $_ENV['EMAIL_LOGO_URL'] ?? $baseUrl . '/images/onelogo.png';
        return '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; line-height: 1.6; color: #18181b; margin: 0; padding: 0; background: #fafafa; }
        .wrap { max-width: 480px; margin: 0 auto; padding: 40px 24px; }
        .card { background: #fff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
        .logo { display: block; margin-bottom: 24px; height: 32px; }
        h1 { font-size: 18px; font-weight: 600; margin: 0 0 16px; color: #18181b; }
        p { margin: 0 0 12px; font-size: 15px; color: #3f3f46; }
        .cta { display: inline-block; background: #18181b; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 500; font-size: 15px; }
        .footer { text-align: center; margin-top: 32px; font-size: 12px; color: #71717a; }
    </style>
</head>
<body>
    <div class="wrap">
        <div class="card">
            <img src="' . htmlspecialchars($logoUrl) . '" alt="OneAndLab" class="logo" />
            <h1>Votre rendez-vous est terminé</h1>
            <p>Bonjour,</p>
            <p>Votre rendez-vous du ' . htmlspecialchars($data['scheduled_at'] ?? '') . ' est maintenant terminé.</p>
            <p>Nous serions ravis de connaître votre avis sur le service reçu.</p>
            <p style="text-align: center;"><a href="' . htmlspecialchars($reviewUrl) . '" class="cta">Donner mon avis</a></p>
            <p>Merci pour votre confiance.</p>
        </div>
        <p class="footer">OneAndLab — Prise de sang et soins infirmiers à domicile</p>
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
     * Template HTML pour avertissement incident — style institutionnel, logo sans fond
     */
    private function getIncidentWarningTemplate(int $incidentCount, string $reason): string
    {
        $logoUrl = $_ENV['EMAIL_LOGO_URL'] ?? ($_ENV['FRONTEND_URL'] ?? 'https://oneandlab.fr') . '/images/onelogo.png';
        return '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; line-height: 1.6; color: #18181b; margin: 0; padding: 0; background: #fafafa; }
        .wrap { max-width: 480px; margin: 0 auto; padding: 40px 24px; }
        .card { background: #fff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
        .logo { display: block; margin-bottom: 24px; height: 32px; }
        h1 { font-size: 18px; font-weight: 600; margin: 0 0 16px; color: #18181b; }
        p { margin: 0 0 12px; font-size: 15px; color: #3f3f46; }
        .warning-box { background: #fefce8; border-left: 4px solid #eab308; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0; }
        .footer { text-align: center; margin-top: 32px; font-size: 12px; color: #71717a; }
    </style>
</head>
<body>
    <div class="wrap">
        <div class="card">
            <img src="' . htmlspecialchars($logoUrl) . '" alt="OneAndLab" class="logo" />
            <h1>Avertissement</h1>
            <p>Bonjour,</p>
            <div class="warning-box">
                <p style="margin:0;"><strong>Un incident a été enregistré sur votre compte.</strong></p>
                <p style="margin:8px 0 0 0;"><strong>Raison :</strong> ' . htmlspecialchars($reason) . '</p>
                <p style="margin:8px 0 0 0;"><strong>Nombre d\'incidents :</strong> ' . $incidentCount . '</p>
            </div>
            <p>Nous vous rappelons l\'importance de respecter les règles de la plateforme. En cas de récidive, des sanctions pourront être appliquées.</p>
            <p>Si vous avez des questions, n\'hésitez pas à nous contacter.</p>
        </div>
        <p class="footer">OneAndLab — Prise de sang et soins infirmiers à domicile</p>
    </div>
</body>
</html>';
    }

    /**
     * Template HTML pour suspension — style institutionnel, logo sans fond
     */
    private function getSuspensionTemplate(int $days, string $reason): string
    {
        $logoUrl = $_ENV['EMAIL_LOGO_URL'] ?? ($_ENV['FRONTEND_URL'] ?? 'https://oneandlab.fr') . '/images/onelogo.png';
        return '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; line-height: 1.6; color: #18181b; margin: 0; padding: 0; background: #fafafa; }
        .wrap { max-width: 480px; margin: 0 auto; padding: 40px 24px; }
        .card { background: #fff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
        .logo { display: block; margin-bottom: 24px; height: 32px; }
        h1 { font-size: 18px; font-weight: 600; margin: 0 0 16px; color: #18181b; }
        p { margin: 0 0 12px; font-size: 15px; color: #3f3f46; }
        .alert-box { background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0; }
        .footer { text-align: center; margin-top: 32px; font-size: 12px; color: #71717a; }
    </style>
</head>
<body>
    <div class="wrap">
        <div class="card">
            <img src="' . htmlspecialchars($logoUrl) . '" alt="OneAndLab" class="logo" />
            <h1>Suspension de votre compte</h1>
            <p>Bonjour,</p>
            <div class="alert-box">
                <p style="margin:0;"><strong>Votre compte a été suspendu pour une durée de ' . (int) $days . ' jours.</strong></p>
                <p style="margin:8px 0 0 0;"><strong>Raison :</strong> ' . htmlspecialchars($reason) . '</p>
            </div>
            <p>Cette suspension fait suite à plusieurs incidents enregistrés sur votre compte. Pendant cette période, vous ne pourrez pas accéder à la plateforme.</p>
            <p>Votre compte sera automatiquement réactivé après la période de suspension.</p>
            <p>Si vous avez des questions ou souhaitez contester cette décision, n\'hésitez pas à nous contacter.</p>
        </div>
        <p class="footer">OneAndLab — Prise de sang et soins infirmiers à domicile</p>
    </div>
</body>
</html>';
    }

    /**
     * Template HTML pour bannissement — style institutionnel, logo sans fond
     */
    private function getBanTemplate(string $reason): string
    {
        $logoUrl = $_ENV['EMAIL_LOGO_URL'] ?? ($_ENV['FRONTEND_URL'] ?? 'https://oneandlab.fr') . '/images/onelogo.png';
        return '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; line-height: 1.6; color: #18181b; margin: 0; padding: 0; background: #fafafa; }
        .wrap { max-width: 480px; margin: 0 auto; padding: 40px 24px; }
        .card { background: #fff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
        .logo { display: block; margin-bottom: 24px; height: 32px; }
        h1 { font-size: 18px; font-weight: 600; margin: 0 0 16px; color: #18181b; }
        p { margin: 0 0 12px; font-size: 15px; color: #3f3f46; }
        .alert-box { background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0; }
        .footer { text-align: center; margin-top: 32px; font-size: 12px; color: #71717a; }
    </style>
</head>
<body>
    <div class="wrap">
        <div class="card">
            <img src="' . htmlspecialchars($logoUrl) . '" alt="OneAndLab" class="logo" />
            <h1>Bannissement de votre compte</h1>
            <p>Bonjour,</p>
            <div class="alert-box">
                <p style="margin:0;"><strong>Votre compte a été définitivement banni de la plateforme OneAndLab.</strong></p>
                <p style="margin:8px 0 0 0;"><strong>Raison :</strong> ' . htmlspecialchars($reason) . '</p>
            </div>
            <p>Cette décision fait suite à de multiples incidents graves enregistrés sur votre compte. Vous ne pourrez plus accéder à la plateforme.</p>
            <p>Si vous avez des questions ou souhaitez contester cette décision, vous pouvez nous contacter par email.</p>
        </div>
        <p class="footer">OneAndLab — Prise de sang et soins infirmiers à domicile</p>
    </div>
</body>
</html>';
    }
}


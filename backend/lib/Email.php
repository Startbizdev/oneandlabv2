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
        $this->fromName = $_ENV['SMTP_FROM_NAME'] ?? 'Cary';
    }

    /**
     * Envoie un email via SMTP
     * @param string|null $replyToEmail Si fourni, définit Reply-To (ex. formulaire contact)
     * @param string|null $replyToName Nom pour Reply-To
     */
    public function send(
        string $to,
        string $subject,
        string $body,
        bool $isHTML = true,
        ?string $replyToEmail = null,
        ?string $replyToName = null
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
            if ($replyToEmail !== null && $replyToEmail !== '') {
                $mail->addReplyTo($replyToEmail, $replyToName ?? $replyToEmail);
            } else {
                $mail->addReplyTo($this->fromEmail, $this->fromName);
            }
            
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
     * Formate date + créneau pour les emails (format français, créneau au lieu de l'heure)
     * @param string|null $scheduledAt ISO datetime
     * @param array|null $formData form_data avec availability (JSON string ou array)
     * @return string ex: "05/03/2025 – Toute la journée" ou "05/03/2025 – 9h - 11h"
     */
    private function formatDateAndCreneau(?string $scheduledAt, ?array $formData): string
    {
        $datePart = '';
        if ($scheduledAt) {
            try {
                $dt = new DateTime($scheduledAt);
                $datePart = $dt->format('d/m/Y');
            } catch (Exception $e) {
                $datePart = $scheduledAt;
            }
        }
        $creneauPart = 'Toute la journée';
        $availability = $formData['availability'] ?? null;
        if ($availability) {
            $av = is_string($availability) ? json_decode($availability, true) : $availability;
            if (is_array($av)) {
                if (($av['type'] ?? '') === 'all_day') {
                    $creneauPart = 'Toute la journée';
                } elseif (($av['type'] ?? '') === 'custom' && !empty($av['range']) && is_array($av['range']) && count($av['range']) >= 2) {
                    $creneauPart = (int) $av['range'][0] . 'h - ' . (int) $av['range'][1] . 'h';
                }
            }
        }
        if ($datePart && $creneauPart) {
            return $datePart . ' – ' . $creneauPart;
        }
        return $datePart ?: $creneauPart;
    }

    /** Couleur primaire (alignée Nuxt UI primary blue). Surcharge : EMAIL_BRAND_PRIMARY */
    private function emailBrandPrimary(): string
    {
        $c = $_ENV['EMAIL_BRAND_PRIMARY'] ?? '';
        return $c !== '' ? $c : '#2563eb';
    }

    private function emailText(): string
    {
        return '#0f172a';
    }

    private function emailMuted(): string
    {
        return '#64748b';
    }

    private function emailPageBg(): string
    {
        return '#f1f5f9';
    }

    private function emailCardBorder(): string
    {
        return '#e2e8f0';
    }

    private function logoSrc(): string
    {
        return $_ENV['EMAIL_LOGO_URL'] ?? ($_ENV['FRONTEND_URL'] ?? 'https://app.oneandlab.fr') . '/images/onelogo.png';
    }

    private function escapeHtml(string $s): string
    {
        return htmlspecialchars($s, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }

    /** Largeur logo (px) — évite l’étirement : width fixe + height:auto */
    private function emailLogoMaxWidth(): int
    {
        $w = (int) ($_ENV['EMAIL_LOGO_MAX_WIDTH'] ?? 140);
        return $w >= 80 && $w <= 280 ? $w : 140;
    }

    /**
     * Bloc logo : table + img compatible Outlook / Gmail (pas de height fixe qui déforme).
     */
    private function emailLogoBlock(): string
    {
        $src = $this->escapeHtml($this->logoSrc());
        $w = $this->emailLogoMaxWidth();
        return '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px 0;"><tr><td>'
            . '<img src="' . $src . '" alt="Cary" width="' . $w . '" style="display:block;max-width:' . $w . 'px;width:' . $w . 'px;height:auto;border:0;outline:none;text-decoration:none;" />'
            . '</td></tr></table>';
    }

    /**
     * CTA principal (fond plein, tables pour clients mail).
     */
    private function emailPrimaryCta(string $url, string $label): string
    {
        $primary = $this->emailBrandPrimary();
        $u = $this->escapeHtml($url);
        $l = $this->escapeHtml($label);
        return '<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 0 0;"><tr><td align="left">'
            . '<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>'
            . '<td align="center" bgcolor="' . $this->escapeHtml($primary) . '" style="border-radius:8px;">'
            . '<a href="' . $u . '" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 28px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif;font-size:15px;font-weight:600;line-height:1.2;color:#ffffff;text-decoration:none;border-radius:8px;">' . $l . '</a>'
            . '</td></tr></table></td></tr></table>';
    }

    /**
     * Lien d’action secondaire (sous le bouton).
     */
    private function emailSecondaryCta(string $url, string $label): string
    {
        $primary = $this->emailBrandPrimary();
        $muted = $this->emailMuted();
        return '<p style="margin:18px 0 0 0;font-size:14px;line-height:1.5;color:' . $this->escapeHtml($muted) . ';font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;">'
            . '<a href="' . $this->escapeHtml($url) . '" target="_blank" rel="noopener noreferrer" style="color:' . $this->escapeHtml($primary) . ';text-decoration:underline;font-weight:500;">' . $this->escapeHtml($label) . '</a>'
            . '</p>';
    }

    /**
     * Enveloppe document : tables, preheader, carte bordure + accent (style Linear / Stripe).
     */
    private function emailWrap(string $preheader, string $cardInnerHtml): string
    {
        $bg = $this->emailPageBg();
        $border = $this->emailCardBorder();
        $primary = $this->emailBrandPrimary();
        $muted = $this->emailMuted();
        $pre = $preheader !== ''
            ? '<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">' . $this->escapeHtml($preheader) . '</div>'
            : '';

        return '<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<!--[if mso]><style type="text/css">table {border-collapse:collapse;border-spacing:0;} a {text-decoration:none;}</style><![endif]-->
<title>Cary</title>
</head>
<body style="margin:0;padding:0;word-spacing:normal;background-color:' . $bg . ';-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
' . $pre . '
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:' . $bg . ';">
<tr>
<td align="center" style="padding:28px 12px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;width:100%;">
<tr>
<td style="background:#ffffff;border:1px solid ' . $border . ';border-radius:10px;overflow:hidden;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
<tr><td style="height:3px;line-height:3px;font-size:0;background-color:' . $primary . ';">&nbsp;</td></tr>
<tr><td style="padding:28px 24px 26px 24px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif;font-size:16px;line-height:1.55;color:' . $this->emailText() . ';">
' . $cardInnerHtml . '
</td></tr>
</table>
</td>
</tr>
<tr>
<td style="padding:20px 12px 8px 12px;text-align:center;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;font-size:12px;line-height:1.5;color:' . $muted . ';">
Cary — Prélèvement et soins infirmiers à domicile
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>';
    }

    /**
     * Corps message interne (formulaire contact → équipe).
     */
    public function buildStaffInquiryBody(string $title, string $innerHtml): string
    {
        $h1 = '<h1 style="margin:0 0 18px 0;font-size:20px;font-weight:600;line-height:1.3;letter-spacing:-0.02em;color:' . $this->emailText() . ';">' . $this->escapeHtml($title) . '</h1>';
        $block = '<div style="font-size:15px;line-height:1.6;color:' . $this->emailMuted() . ';">' . $innerHtml . '</div>';
        return $this->emailWrap($title, $this->emailLogoBlock() . $h1 . $block);
    }

    /**
     * Encadré infos (détails RDV, etc.).
     */
    private function emailInfoBox(string $innerHtml): string
    {
        $primary = $this->emailBrandPrimary();
        return '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:18px 0;"><tr><td style="background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid ' . $primary . ';border-radius:0 8px 8px 0;padding:16px 18px;font-size:14px;line-height:1.55;color:#334155;">' . $innerHtml . '</td></tr></table>';
    }

    private function emailOtpCodeBlock(string $otp): string
    {
        return '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:18px 0;"><tr><td align="center" style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:22px 16px;">'
            . '<span style="font-family:ui-monospace,\'SF Mono\',Menlo,Consolas,monospace;font-size:24px;font-weight:600;letter-spacing:0.22em;color:' . $this->emailText() . ';">' . $this->escapeHtml($otp) . '</span>'
            . '</td></tr></table>';
    }

    private function emailWarningBox(string $innerHtml): string
    {
        return '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:18px 0;"><tr><td style="background:#fffbeb;border:1px solid #fde68a;border-left:4px solid #ca8a04;border-radius:0 8px 8px 0;padding:16px 18px;font-size:14px;line-height:1.55;color:#422006;">' . $innerHtml . '</td></tr></table>';
    }

    private function emailAlertBox(string $innerHtml): string
    {
        return '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:18px 0;"><tr><td style="background:#fef2f2;border:1px solid #fecaca;border-left:4px solid #dc2626;border-radius:0 8px 8px 0;padding:16px 18px;font-size:14px;line-height:1.55;color:#450a0a;">' . $innerHtml . '</td></tr></table>';
    }

    /**
     * Template de base transactionnel : logo, titre, corps, CTA(s).
     * Options : title, preheader, ctaUrl, ctaLabel, ctaSecondaryUrl, ctaSecondaryLabel
     */
    private function baseLayout(string $content, array $options = []): string
    {
        $title = $options['title'] ?? 'Cary';
        $preheader = $options['preheader'] ?? '';
        $ctaUrl = $options['ctaUrl'] ?? '';
        $ctaLabel = $options['ctaLabel'] ?? '';
        $cta2Url = $options['ctaSecondaryUrl'] ?? '';
        $cta2Label = $options['ctaSecondaryLabel'] ?? '';

        $h1 = '<h1 style="margin:0 0 18px 0;font-size:22px;font-weight:600;line-height:1.25;letter-spacing:-0.02em;color:' . $this->emailText() . ';">' . $this->escapeHtml($title) . '</h1>';
        $bodyWrap = '<div style="font-size:15px;line-height:1.6;color:' . $this->emailMuted() . ';">' . $content . '</div>';

        $ctaBlock = '';
        if ($ctaUrl !== '' && $ctaLabel !== '') {
            $ctaBlock .= $this->emailPrimaryCta($ctaUrl, $ctaLabel);
        }
        if ($cta2Url !== '' && $cta2Label !== '') {
            $ctaBlock .= $this->emailSecondaryCta($cta2Url, $cta2Label);
        }

        return $this->emailWrap($preheader, $this->emailLogoBlock() . $h1 . $bodyWrap . $ctaBlock);
    }

    public function sendWelcome(string $to, array $p): bool
    {
        $content = '<p style="margin:0 0 14px 0;">Bienvenue sur Cary.</p><p style="margin:0 0 14px 0;">Vous pouvez désormais prendre rendez-vous pour des prises de sang ou soins infirmiers à domicile.</p>';
        $baseUrl = $_ENV['FRONTEND_URL'] ?? 'https://oneandlab.fr';
        $body = $this->baseLayout($content, [
            'title' => 'Bienvenue',
            'preheader' => 'Votre compte Cary est prêt. Accédez à votre espace.',
            'ctaUrl' => $baseUrl . '/patient',
            'ctaLabel' => 'Ouvrir mon espace',
            'ctaSecondaryUrl' => $baseUrl . '/rendez-vous/nouveau',
            'ctaSecondaryLabel' => 'Prendre un rendez-vous',
        ]);
        return $this->send($to, 'Bienvenue sur Cary', $body, true);
    }

    public function sendAppointmentCreated(string $to, array $p): bool
    {
        $baseUrl = $_ENV['FRONTEND_URL'] ?? 'https://oneandlab.fr';
        if (!empty($p['batch_summaries']) && is_array($p['batch_summaries'])) {
            $n = count($p['batch_summaries']);
            $content = '<p style="margin:0 0 14px 0;">Vos ' . $n . ' rendez-vous ont bien été enregistrés.</p>';
            foreach ($p['batch_summaries'] as $line) {
                $content .= '<p style="margin:6px 0 0 0;">• ' . htmlspecialchars((string) $line) . '</p>';
            }
            $content .= '<p style="margin:0;">Ils seront pris en charge par un professionnel sous peu. Vous recevrez une confirmation par email.</p>';
            $body = $this->baseLayout($content, [
                'title' => 'Rendez-vous enregistrés',
                'preheader' => $n . ' rendez-vous enregistrés sur Cary. Suivez-les depuis votre espace.',
                'ctaUrl' => $baseUrl . '/patient',
                'ctaLabel' => 'Voir mes rendez-vous',
                'ctaSecondaryUrl' => $baseUrl . '/rendez-vous/nouveau',
                'ctaSecondaryLabel' => 'Prendre un autre rendez-vous',
            ]);

            return $this->send($to, 'Vos rendez-vous Cary ont été enregistrés', $body, true);
        }

        $type = ($p['type'] ?? '') === 'blood_test' ? 'Prélèvement' : 'Soins infirmiers';
        $dateCreneau = $this->formatDateAndCreneau($p['scheduled_at'] ?? null, $p['form_data'] ?? null);
        $content = '<p style="margin:0 0 14px 0;">Votre rendez-vous a bien été enregistré.</p>';
        $content .= '<p style="margin:0 0 10px 0;"><strong>Type :</strong> ' . htmlspecialchars($type) . '</p>';
        if ($dateCreneau) {
            $content .= '<p style="margin:0 0 14px 0;"><strong>Date et créneau :</strong> ' . htmlspecialchars($dateCreneau) . '</p>';
        }
        $content .= '<p style="margin:0;">Il sera pris en charge par un professionnel sous peu. Vous recevrez une confirmation par email.</p>';
        $body = $this->baseLayout($content, [
            'title' => 'Rendez-vous enregistré',
            'preheader' => 'Votre demande est bien enregistrée. Consultez le suivi dans votre espace.',
            'ctaUrl' => $baseUrl . '/patient',
            'ctaLabel' => 'Voir mon rendez-vous',
            'ctaSecondaryUrl' => $baseUrl . '/rendez-vous/nouveau',
            'ctaSecondaryLabel' => 'Prendre un autre rendez-vous',
        ]);
        return $this->send($to, 'Votre rendez-vous Cary a été enregistré', $body, true);
    }

    public function sendAppointmentCanceledToPatient(string $to, array $p): bool
    {
        $actor = $p['actor_display_label'] ?? 'Le professionnel de santé';
        $content = '<p style="margin:0 0 14px 0;">' . htmlspecialchars($actor) . ' a annulé votre rendez-vous.</p>';
        $dateCreneau = $this->formatDateAndCreneau($p['scheduled_at'] ?? null, $p['form_data'] ?? null);
        if ($dateCreneau) {
            $content .= '<p style="margin:0 0 14px 0;"><strong>Date prévue :</strong> ' . htmlspecialchars($dateCreneau) . '</p>';
        }
        $content .= '<p style="margin:0;">Vous pouvez prendre un nouveau rendez-vous à tout moment.</p>';
        $baseUrl = $_ENV['FRONTEND_URL'] ?? 'https://oneandlab.fr';
        $body = $this->baseLayout($content, [
            'title' => 'Rendez-vous annulé',
            'preheader' => 'Votre rendez-vous a été annulé. Réservez un nouveau créneau quand vous voulez.',
            'ctaUrl' => $baseUrl . '/rendez-vous/nouveau',
            'ctaLabel' => 'Prendre un nouveau rendez-vous',
            'ctaSecondaryUrl' => $baseUrl . '/patient',
            'ctaSecondaryLabel' => 'Mon espace patient',
        ]);
        return $this->send($to, 'Rendez-vous annulé — Cary', $body, true);
    }

    public function sendNewAppointmentToPro(string $to, array $p): bool
    {
        $content = '<p style="margin:0 0 14px 0;">Un nouveau rendez-vous est disponible dans votre zone.</p>';
        $dateCreneau = $this->formatDateAndCreneau($p['scheduled_at'] ?? null, $p['form_data'] ?? null);
        if ($dateCreneau) {
            $content .= '<p style="margin:0 0 14px 0;"><strong>Date et créneau :</strong> ' . htmlspecialchars($dateCreneau) . '</p>';
        }
        $content .= '<p style="margin:0;">Connectez-vous à votre espace pour l\'accepter.</p>';
        $baseUrl = $_ENV['FRONTEND_URL'] ?? 'https://oneandlab.fr';
        $appointmentId = $p['appointment_id'] ?? '';
        $role = ($p['role'] ?? '') === 'nurse' ? 'nurse' : 'lab';
        $listPath = $role === 'nurse' ? '/nurse/appointments' : '/lab/appointments';
        $detailPath = $listPath;
        if ($appointmentId) {
            $detailPath .= '/' . $appointmentId;
        }
        $body = $this->baseLayout($content, [
            'title' => 'Nouveau rendez-vous disponible',
            'preheader' => 'Un rendez-vous est disponible dans votre zone. Ouvrez-le pour agir.',
            'ctaUrl' => $baseUrl . $detailPath,
            'ctaLabel' => $appointmentId ? 'Ouvrir le rendez-vous' : 'Voir mes rendez-vous',
            'ctaSecondaryUrl' => $baseUrl . $listPath,
            'ctaSecondaryLabel' => 'Liste de mes rendez-vous',
        ]);
        return $this->send($to, 'Nouveau rendez-vous disponible — Cary', $body, true);
    }

    public function sendAppointmentAssignedToPreleveur(string $to, array $p): bool
    {
        $content = '<p style="margin:0 0 14px 0;">Un rendez-vous vous a été assigné.</p>';
        $dateCreneau = $this->formatDateAndCreneau($p['scheduled_at'] ?? null, $p['form_data'] ?? null);
        if ($dateCreneau) {
            $content .= '<p style="margin:0 0 14px 0;"><strong>Date et créneau :</strong> ' . htmlspecialchars($dateCreneau) . '</p>';
        }
        $content .= '<p style="margin:0;">Consultez votre calendrier pour les détails.</p>';
        $baseUrl = $_ENV['FRONTEND_URL'] ?? 'https://oneandlab.fr';
        $appointmentId = $p['appointment_id'] ?? '';
        $detailUrl = $baseUrl . '/preleveur/calendar';
        if ($appointmentId) {
            $detailUrl = $baseUrl . '/preleveur/appointments/' . $appointmentId;
        }
        $calUrl = $baseUrl . '/preleveur/calendar';
        $body = $this->baseLayout($content, [
            'title' => 'Rendez-vous assigné',
            'preheader' => 'Un rendez-vous vous a été assigné sur Cary.',
            'ctaUrl' => $detailUrl,
            'ctaLabel' => $appointmentId ? 'Ouvrir la fiche RDV' : 'Voir mon calendrier',
            'ctaSecondaryUrl' => $calUrl,
            'ctaSecondaryLabel' => 'Ouvrir le calendrier',
        ]);
        return $this->send($to, 'Rendez-vous assigné — Cary', $body, true);
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
        
        $subject = 'Votre code de connexion Cary';
        $body = $this->getOTPTemplate($otp);
        
        return $this->send($to, $subject, $body, true);
    }

    /**
     * Template HTML pour l'email OTP — style institutionnel (Stripe/Notion/Linear), logo header sans fond
     */
    private function getOTPTemplate(string $otp): string
    {
        $baseUrl = rtrim($_ENV['FRONTEND_URL'] ?? 'https://oneandlab.fr', '/');
        $h1 = '<h1 style="margin:0 0 18px 0;font-size:22px;font-weight:600;line-height:1.25;letter-spacing:-0.02em;color:' . $this->emailText() . ';">' . $this->escapeHtml('Votre code de connexion') . '</h1>';
        $inner = '<div style="font-size:15px;line-height:1.6;color:' . $this->emailMuted() . ';">'
            . '<p style="margin:0 0 14px 0;">Bonjour,</p>'
            . '<p style="margin:0 0 14px 0;">Utilisez ce code pour vous connecter à Cary (usage unique) :</p>'
            . $this->emailOtpCodeBlock($otp)
            . '<p style="margin:0 0 14px 0;">Il expire dans <strong style="color:' . $this->emailText() . ';">5 minutes</strong>.</p>'
            . '<p style="margin:0;">Si vous n\'êtes pas à l\'origine de cette demande, ignorez simplement cet email.</p>'
            . '</div>';
        $cta = $this->emailPrimaryCta($baseUrl . '/login', 'Se connecter');
        $secondary = $this->emailSecondaryCta($baseUrl . '/patient', 'Accéder à mon espace patient');
        return $this->emailWrap('Code de connexion Cary — valable 5 minutes', $this->emailLogoBlock() . $h1 . $inner . $cta . $secondary);
    }

    /**
     * Envoie une notification de confirmation de rendez-vous
     */
    public function sendAppointmentConfirmation(string $to, array $appointmentData): bool
    {
        $subject = 'Confirmation de votre rendez-vous Cary';
        $body = $this->getAppointmentConfirmationTemplate($appointmentData);
        
        return $this->send($to, $subject, $body, true);
    }

    /**
     * @return array{full: ?array, optionMeta: array<string, array{label: string, valueLabels: array<string,string>}>}
     */
    private function loadConfirmationContext(?string $appointmentId): array
    {
        if ($appointmentId === null || $appointmentId === '') {
            return ['full' => null, 'optionMeta' => []];
        }
        try {
            require_once __DIR__ . '/../models/Appointment.php';
            $am = new Appointment();
            $full = $am->getById($appointmentId, 'system', 'system');
            $meta = [];
            if ($full !== null && !empty($full['category_id'])) {
                $meta = $am->fetchCareCategoryOptionMeta((string) $full['category_id']);
            }
            return ['full' => $full, 'optionMeta' => $meta];
        } catch (Throwable $e) {
            return ['full' => null, 'optionMeta' => []];
        }
    }

    private function emailPublicImageUrl(?string $url): ?string
    {
        if ($url === null) {
            return null;
        }
        $u = trim($url);
        if ($u === '' || strlen($u) > 2048) {
            return null;
        }
        if (stripos($u, 'data:') === 0 || stripos($u, 'javascript:') === 0) {
            return null;
        }
        if (preg_match('#^https?://#i', $u) !== 1) {
            return null;
        }
        return $u;
    }

    private function formatScheduledAtParis(?string $iso): string
    {
        if ($iso === null || trim($iso) === '') {
            return '';
        }
        try {
            $dt = new DateTimeImmutable($iso);
            $dt = $dt->setTimezone(new DateTimeZone('Europe/Paris'));
            return $dt->format('d/m/Y \à H\hi');
        } catch (\Throwable $e) {
            return '';
        }
    }

    /**
     * Créneau choisi (form_data.availability) — aligné frontend (patient / liste RDV).
     */
    private function formatAvailabilitySlotFrFromFormData(?array $formData): string
    {
        if ($formData === null) {
            return '';
        }
        $availability = $formData['availability'] ?? null;
        if ($availability === null || $availability === '') {
            return '';
        }
        $av = is_string($availability) ? json_decode($availability, true) : $availability;
        if (!is_array($av)) {
            return '';
        }
        if (($av['type'] ?? '') === 'all_day') {
            return 'Toute la journée';
        }
        if (($av['type'] ?? '') === 'custom' && !empty($av['range']) && is_array($av['range']) && count($av['range']) >= 2) {
            $a = (int) $av['range'][0];
            $b = (int) $av['range'][1];
            return $a . 'h00 – ' . $b . 'h00';
        }
        return '';
    }

    private function normalizeAppointmentAddressForEmail($address): string
    {
        if ($address === null) {
            return '';
        }
        if (is_array($address)) {
            return trim((string) ($address['label'] ?? ''));
        }
        return trim((string) $address);
    }

    private function resolveConfirmationTypeRaw(?array $full, array $queued): string
    {
        if ($full !== null) {
            return (($full['type'] ?? '') === 'nursing') ? 'nursing' : 'blood_test';
        }
        $t = $queued['appointment_type'] ?? $queued['type'] ?? 'blood_test';
        if ($t === 'nursing') {
            return 'nursing';
        }
        if (is_string($t) && (stripos($t, 'infirmier') !== false || stripos($t, 'soins') !== false)) {
            return 'nursing';
        }
        return 'blood_test';
    }

    private function mapFrequencyLabelFr(?string $v): string
    {
        if ($v === null || $v === '') {
            return '';
        }
        $map = [
            'once_daily' => '1 fois par jour',
            'twice_daily' => '2 fois par jour',
            'thrice_daily' => '3 fois par jour',
            'twice_weekly' => '2 fois par semaine',
            'thrice_weekly' => '3 fois par semaine',
            'to_define' => 'À voir avec le professionnel',
            'daily' => '1 fois par jour',
            'every_other_day' => '1 jour sur 2',
        ];
        return $map[$v] ?? $v;
    }

    private function mapNursingDurationLabelFr($durationDays, $customDays): string
    {
        if ($durationDays === null || $durationDays === '') {
            return '';
        }
        $dd = (string) $durationDays;
        if ($dd === 'to_define') {
            return 'À préciser avec le professionnel';
        }
        if ($dd === 'custom') {
            $n = (int) $customDays;
            return $n > 0 ? $n . ' jours' : 'Durée personnalisée';
        }
        $map = ['1' => 'Une seule fois', '7' => 'Environ 1 semaine', '10' => 'Environ 10 jours', '15' => 'Environ 2 semaines', '30' => 'Environ 1 mois', '60+' => 'Longue durée'];
        return $map[$dd] ?? $dd;
    }

    private function mapBloodDurationFr(array $fd): string
    {
        $dd = isset($fd['duration_days']) ? (string) $fd['duration_days'] : '';
        if ($dd === 'custom') {
            $n = isset($fd['custom_days']) ? (int) $fd['custom_days'] : 0;
            return $n > 0 ? $n . ' jours' : '';
        }
        $map = ['7' => 'environ 1 semaine', '10' => 'environ 10 jours', '15' => 'environ 2 semaines', '30' => 'environ 1 mois', '60+' => 'plusieurs semaines ou mois', 'to_define' => 'à préciser avec le professionnel'];
        return $map[$dd] ?? '';
    }

    private function mapBloodTestTypeLineFr(array $fd): string
    {
        $t = $fd['blood_test_type'] ?? '';
        if ($t === 'single') {
            return 'Une seule prise de sang';
        }
        if ($t === 'multiple') {
            $d = $this->mapBloodDurationFr($fd);
            return $d !== '' ? 'Plusieurs prélèvements sur ' . $d : 'Plusieurs prélèvements sur plusieurs jours';
        }
        return '';
    }

    private function mapPreferredNurseGenderFr(?string $g): string
    {
        if ($g === null || $g === '') {
            return '';
        }
        $m = ['any' => 'Aucune préférence', 'female' => 'Une infirmière', 'male' => 'Un infirmier'];
        return $m[$g] ?? '';
    }

    private function confirmationDetailRow(string $label, string $value): string
    {
        if ($value === '') {
            return '';
        }
        return '<tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;vertical-align:top;font-size:13px;color:#64748b;width:44%;">'
            . $this->escapeHtml($label) . '</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;vertical-align:top;font-size:14px;color:#0f172a;font-weight:500;">'
            . $this->escapeHtml($value) . '</td></tr>';
    }

    private function buildConfirmationProviderHtml(array $full, string $typeRaw): string
    {
        $rows = '';
        if ($typeRaw === 'nursing') {
            $name = trim((string) ($full['assigned_nurse_display_name'] ?? ''));
            $img = $this->emailPublicImageUrl($full['assigned_nurse_profile_image_url'] ?? null);
            $phone = trim((string) ($full['assigned_nurse_phone'] ?? ''));
            if ($name !== '' || $img !== null) {
                $imgHtml = $img !== null
                    ? '<img src="' . $this->escapeHtml($img) . '" alt="" width="56" height="56" style="display:block;width:56px;height:56px;border-radius:10px;object-fit:cover;border:1px solid #e2e8f0;" />'
                    : '<div style="width:56px;height:56px;border-radius:10px;background:#f1f5f9;border:1px solid #e2e8f0;"></div>';
                $sub = $name !== '' ? $this->escapeHtml($name) : 'Votre professionnel';
                $tel = $phone !== '' ? '<p style="margin:6px 0 0 0;font-size:13px;color:#64748b;">' . $this->escapeHtml($phone) . '</p>' : '';
                $rows .= '<tr><td style="width:64px;vertical-align:top;padding:0 14px 0 0;">' . $imgHtml . '</td><td style="vertical-align:top;"><p style="margin:0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;">Infirmier(ère) assigné(e)</p><p style="margin:4px 0 0 0;font-size:16px;font-weight:600;color:#0f172a;">' . $sub . '</p>' . $tel . '</td></tr>';
            }
        } else {
            $labName = trim((string) ($full['assigned_lab_display_name'] ?? ''));
            $labImg = $this->emailPublicImageUrl($full['assigned_lab_profile_image_url'] ?? null);
            if ($labName !== '' || $labImg !== null) {
                $imgHtml = $labImg !== null
                    ? '<img src="' . $this->escapeHtml($labImg) . '" alt="" width="64" style="display:block;max-width:72px;height:auto;border-radius:8px;border:1px solid #e2e8f0;" />'
                    : '<div style="width:56px;height:56px;border-radius:10px;background:#fef2f2;border:1px solid #fecaca;"></div>';
                $sub = $labName !== '' ? $this->escapeHtml($labName) : 'Laboratoire';
                $rows .= '<tr><td style="width:72px;vertical-align:middle;padding:0 14px 0 0;">' . $imgHtml . '</td><td style="vertical-align:middle;"><p style="margin:0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;">Laboratoire</p><p style="margin:4px 0 0 0;font-size:16px;font-weight:600;color:#0f172a;">' . $sub . '</p></td></tr>';
            }
            $prevName = trim((string) ($full['assigned_to_display_name'] ?? ''));
            $prevImg = $this->emailPublicImageUrl($full['assigned_to_profile_image_url'] ?? null);
            if ($prevName !== '' || $prevImg !== null) {
                $imgHtml = $prevImg !== null
                    ? '<img src="' . $this->escapeHtml($prevImg) . '" alt="" width="56" height="56" style="display:block;width:56px;height:56px;border-radius:10px;object-fit:cover;border:1px solid #e2e8f0;" />'
                    : '<div style="width:56px;height:56px;border-radius:10px;background:#f1f5f9;border:1px solid #e2e8f0;"></div>';
                $sub = $prevName !== '' ? $this->escapeHtml($prevName) : 'Professionnel';
                $rows .= '<tr><td colspan="2" style="height:16px;line-height:16px;font-size:0;">&nbsp;</td></tr><tr><td style="width:64px;vertical-align:top;padding:0 14px 0 0;">' . $imgHtml . '</td><td style="vertical-align:top;"><p style="margin:0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;">Prélèvement</p><p style="margin:4px 0 0 0;font-size:16px;font-weight:600;color:#0f172a;">' . $sub . '</p></td></tr>';
            }
        }
        if ($rows === '') {
            return '';
        }
        return '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 22px 0;">' . $rows . '</table>';
    }

    /**
     * @param array<string, array{label: string, valueLabels: array<string,string>}> $optionMeta
     */
    private function buildConfirmationFormSummaryHtml(array $full, array $optionMeta): string
    {
        $fd = is_array($full['form_data'] ?? null) ? $full['form_data'] : [];
        $typeRaw = (($full['type'] ?? '') === 'nursing') ? 'nursing' : 'blood_test';
        $tbody = '';

        $cat = trim((string) ($full['category_name'] ?? ''));
        if ($cat !== '') {
            $tbody .= $this->confirmationDetailRow('Type de soin', $cat);
        }

        $dbWhen = $this->formatScheduledAtParis($full['scheduled_at'] ?? null);
        if ($dbWhen !== '') {
            $tbody .= $this->confirmationDetailRow('Date & heure (planning)', $dbWhen);
        }

        $slot = $this->formatAvailabilitySlotFrFromFormData($fd);
        if ($slot !== '') {
            $tbody .= $this->confirmationDetailRow('Créneau souhaité', $slot);
        }

        $addr = $this->normalizeAppointmentAddressForEmail($full['address'] ?? null);
        if ($addr !== '') {
            $tbody .= $this->confirmationDetailRow('Adresse d\'intervention', $addr);
        }

        foreach (['first_name' => 'Prénom', 'last_name' => 'Nom', 'phone' => 'Téléphone', 'email' => 'Email'] as $k => $lab) {
            $v = isset($fd[$k]) ? trim((string) $fd[$k]) : '';
            if ($v !== '') {
                $tbody .= $this->confirmationDetailRow($lab, $v);
            }
        }

        if ($typeRaw === 'nursing') {
            $dur = $this->mapNursingDurationLabelFr($fd['duration_days'] ?? null, $fd['custom_days'] ?? null);
            if ($dur !== '') {
                $tbody .= $this->confirmationDetailRow('Prise en charge', $dur);
            }
        } else {
            $bloodDur = $this->mapBloodDurationFr($fd);
            if ($bloodDur !== '') {
                $tbody .= $this->confirmationDetailRow('Durée / série', $bloodDur);
            }
        }

        $bt = $this->mapBloodTestTypeLineFr($fd);
        if ($bt !== '') {
            $tbody .= $this->confirmationDetailRow('Prélèvements', $bt);
        }

        $dd = (string) ($fd['duration_days'] ?? '');
        $freq = $this->mapFrequencyLabelFr(isset($fd['frequency']) ? (string) $fd['frequency'] : '');
        if ($freq !== '' && $typeRaw === 'nursing' && $dd !== '1' && $dd !== '' && $dd !== 'to_define') {
            $tbody .= $this->confirmationDetailRow('Fréquence des passages', $freq);
        }

        $gender = $this->mapPreferredNurseGenderFr(isset($fd['preferred_nurse_gender']) ? (string) $fd['preferred_nurse_gender'] : '');
        if ($gender !== '' && $typeRaw === 'nursing') {
            $tbody .= $this->confirmationDetailRow('Préférence', $gender);
        }

        $careOpts = $fd['care_options'] ?? [];
        if (is_array($careOpts)) {
            foreach ($careOpts as $key => $val) {
                if ($val === null || $val === '') {
                    continue;
                }
                $meta = $optionMeta[(string) $key] ?? null;
                $lab = is_array($meta) ? ($meta['label'] ?? (string) $key) : (string) $key;
                if (is_array($val)) {
                    $parts = [];
                    foreach ($val as $vi) {
                        if ($vi === null || $vi === '') {
                            continue;
                        }
                        $sv = is_scalar($vi) ? (string) $vi : '';
                        if ($sv === '') {
                            continue;
                        }
                        $parts[] = (is_array($meta) && isset($meta['valueLabels'][$sv]))
                            ? $meta['valueLabels'][$sv]
                            : $sv;
                    }
                    $displayVal = implode(', ', $parts);
                } else {
                    $displayVal = is_scalar($val) ? (string) $val : '';
                    if ($displayVal === '') {
                        continue;
                    }
                    if (is_array($meta) && isset($meta['valueLabels'][$displayVal])) {
                        $displayVal = $meta['valueLabels'][$displayVal];
                    }
                }
                $tbody .= $this->confirmationDetailRow($lab, $displayVal);
            }
        }

        $notes = isset($fd['notes']) ? trim((string) $fd['notes']) : '';
        if ($notes !== '') {
            $tbody .= '<tr><td colspan="2" style="padding:10px 0 4px 0;font-size:13px;color:#64748b;">Notes</td></tr><tr><td colspan="2" style="padding:0 0 8px 0;font-size:14px;color:#0f172a;line-height:1.5;">' . nl2br($this->escapeHtml($notes)) . '</td></tr>';
        }

        if ($tbody === '') {
            return '';
        }
        return '<p style="margin:4px 0 12px 0;font-size:14px;font-weight:600;color:#0f172a;">Détails du rendez-vous</p>'
            . '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">' . $tbody . '</table>';
    }

    /**
     * Template HTML pour confirmation de rendez-vous (détail aligné fiche patient + pros assignés).
     */
    private function getAppointmentConfirmationTemplate(array $data): string
    {
        $baseUrl = rtrim($_ENV['FRONTEND_URL'] ?? 'https://oneandlab.fr', '/');
        $aid = isset($data['id']) ? (string) $data['id'] : '';
        $ctx = $this->loadConfirmationContext($aid !== '' ? $aid : null);
        $full = $ctx['full'];
        $optionMeta = $ctx['optionMeta'];
        $typeRaw = $this->resolveConfirmationTypeRaw($full, $data);

        $providerBlock = $full !== null ? $this->buildConfirmationProviderHtml($full, $typeRaw) : '';
        $summaryBlock = $full !== null ? $this->buildConfirmationFormSummaryHtml($full, $optionMeta) : '';

        if ($summaryBlock === '' && $full === null) {
            $fd = is_array($data['form_data'] ?? null) ? $data['form_data'] : [];
            $infoInner = '<p style="margin:0;"><strong>Date et créneau :</strong> ' . $this->escapeHtml($this->formatDateAndCreneau($data['scheduled_at'] ?? null, $fd) ?: '-') . '</p>'
                . '<p style="margin:8px 0 0 0;"><strong>Type :</strong> ' . $this->escapeHtml($typeRaw === 'blood_test' ? 'Prélèvement' : 'Soins infirmiers') . '</p>';
            $summaryBlock = $this->emailInfoBox($infoInner);
        }

        $detailUrl = $aid !== '' ? ($baseUrl . '/patient/appointments/' . rawurlencode($aid)) : ($baseUrl . '/patient');

        if (!empty($data['batch_summaries']) && is_array($data['batch_summaries']) && count($data['batch_summaries']) > 1) {
            $n = count($data['batch_summaries']);
            $lines = '';
            foreach ($data['batch_summaries'] as $line) {
                $lines .= '<p style="margin:6px 0 0 0;">• ' . $this->escapeHtml((string) $line) . '</p>';
            }
            $lines = '<p style="margin:0;">Récapitulatif :</p>' . $lines;
            $content = '<p style="margin:0 0 14px 0;">Bonjour,</p>'
                . '<p style="margin:0 0 14px 0;">Vos ' . (int) $n . ' rendez-vous sont confirmés.</p>'
                . $this->emailInfoBox($lines)
                . $providerBlock
                . $summaryBlock
                . '<p style="margin:16px 0 0 0;">Rappel : nous vous préviendrons environ 30 minutes avant chaque passage.</p>';

            return $this->baseLayout($content, [
                'title' => 'Vos rendez-vous sont confirmés',
                'preheader' => $n . ' rendez-vous confirmés — professionnel, adresse et créneaux dans cet email.',
                'ctaUrl' => $detailUrl,
                'ctaLabel' => 'Voir le détail du rendez-vous',
                'ctaSecondaryUrl' => $baseUrl . '/patient',
                'ctaSecondaryLabel' => 'Mon espace patient',
            ]);
        }

        $content = '<p style="margin:0 0 14px 0;">Bonjour,</p>'
            . '<p style="margin:0 0 14px 0;">Votre rendez-vous est confirmé.</p>'
            . $providerBlock
            . $summaryBlock
            . '<p style="margin:16px 0 0 0;">Rappel : nous vous préviendrons environ 30 minutes avant le passage.</p>';

        return $this->baseLayout($content, [
            'title' => 'Votre rendez-vous est confirmé',
            'preheader' => 'Confirmation Cary — professionnel assigné, horaires et lieu.',
            'ctaUrl' => $detailUrl,
            'ctaLabel' => 'Ouvrir la fiche du rendez-vous',
            'ctaSecondaryUrl' => $baseUrl . '/rendez-vous/nouveau',
            'ctaSecondaryLabel' => 'Prendre un autre rendez-vous',
        ]);
    }

    /**
     * Envoie une invitation à noter après un rendez-vous terminé
     */
    public function sendReviewInvitation(string $to, string $appointmentId, array $appointmentData): bool
    {
        $subject = 'Donnez votre avis sur votre rendez-vous Cary';
        $body = $this->getReviewInvitationTemplate($appointmentId, $appointmentData);
        
        return $this->send($to, $subject, $body, true);
    }

    /**
     * Template HTML pour invitation à noter
     */
    private function getReviewInvitationTemplate(string $appointmentId, array $data): string
    {
        $baseUrl = rtrim($_ENV['FRONTEND_URL'] ?? 'https://oneandlab.fr', '/');
        $reviewUrl = $baseUrl . '/patient/appointments/' . $appointmentId;
        $when = $this->formatDateAndCreneau($data['scheduled_at'] ?? null, $data['form_data'] ?? null) ?: '-';
        $content = '<p style="margin:0 0 14px 0;">Bonjour,</p>'
            . '<p style="margin:0 0 14px 0;">Votre rendez-vous du <strong style="color:' . $this->emailText() . ';">' . $this->escapeHtml($when) . '</strong> est terminé.</p>'
            . '<p style="margin:0;">Votre retour nous aide à améliorer le service. Quelques secondes suffisent.</p>';

        return $this->baseLayout($content, [
            'title' => 'Donnez votre avis',
            'preheader' => 'Comment s’est passé votre rendez-vous Cary ? Cliquez pour noter.',
            'ctaUrl' => $reviewUrl,
            'ctaLabel' => 'Donner mon avis',
            'ctaSecondaryUrl' => $baseUrl . '/patient',
            'ctaSecondaryLabel' => 'Mon espace patient',
        ]);
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
        $subject = 'Suspension de votre compte Cary';
        $body = $this->getSuspensionTemplate($days, $reason);
        
        return $this->send($to, $subject, $body, true);
    }

    /**
     * Envoie un email de bannissement
     */
    /**
     * Envoie une notification au patient : vos résultats sont prêts
     */
    public function sendResultsReadyToPatient(string $to, string $appointmentId): bool
    {
        $subject = 'Vos résultats sont disponibles — Cary';
        $baseUrl = rtrim($_ENV['FRONTEND_URL'] ?? 'https://oneandlab.fr', '/');
        $detailUrl = $baseUrl . '/patient/appointments/' . $appointmentId;
        $content = '<p style="margin:0 0 14px 0;">Bonjour,</p>'
            . '<p style="margin:0 0 14px 0;">Les résultats liés à votre rendez-vous sont disponibles. Vous pouvez les consulter et les télécharger en toute sécurité depuis votre espace.</p>'
            . '<p style="margin:0;">Merci pour votre confiance.</p>';
        $body = $this->baseLayout($content, [
            'title' => 'Vos résultats sont prêts',
            'preheader' => 'Consultez et téléchargez vos résultats depuis votre espace patient Cary.',
            'ctaUrl' => $detailUrl,
            'ctaLabel' => 'Voir mes résultats',
            'ctaSecondaryUrl' => $baseUrl . '/patient',
            'ctaSecondaryLabel' => 'Ouvrir mon espace patient',
        ]);
        return $this->send($to, $subject, $body, true);
    }

    public function sendBanEmail(string $to, string $reason): bool
    {
        $subject = 'Bannissement de votre compte Cary';
        $body = $this->getBanTemplate($reason);
        
        return $this->send($to, $subject, $body, true);
    }

    /**
     * Template HTML pour avertissement incident — style institutionnel, logo sans fond
     */
    private function getIncidentWarningTemplate(int $incidentCount, string $reason): string
    {
        $baseUrl = rtrim($_ENV['FRONTEND_URL'] ?? 'https://oneandlab.fr', '/');
        $warnInner = '<p style="margin:0;"><strong>Un incident a été enregistré sur votre compte.</strong></p>'
            . '<p style="margin:8px 0 0 0;"><strong>Raison :</strong> ' . $this->escapeHtml($reason) . '</p>'
            . '<p style="margin:8px 0 0 0;"><strong>Nombre d\'incidents :</strong> ' . (int) $incidentCount . '</p>';
        $content = '<p style="margin:0 0 14px 0;">Bonjour,</p>'
            . $this->emailWarningBox($warnInner)
            . '<p style="margin:0 0 14px 0;">Nous vous rappelons l\'importance de respecter les règles de la plateforme. En cas de récidive, des sanctions pourront être appliquées.</p>'
            . '<p style="margin:0;">Une question ? Notre équipe peut vous aider.</p>';

        return $this->baseLayout($content, [
            'title' => 'Avertissement — incident enregistré',
            'preheader' => 'Un incident a été signalé sur votre compte Cary. Consultez les détails.',
            'ctaUrl' => $baseUrl . '/contact',
            'ctaLabel' => 'Contacter le support',
            'ctaSecondaryUrl' => 'mailto:contact@oneandlab.fr',
            'ctaSecondaryLabel' => 'Écrire à contact@oneandlab.fr',
        ]);
    }

    /**
     * Template HTML pour suspension — style institutionnel, logo sans fond
     */
    private function getSuspensionTemplate(int $days, string $reason): string
    {
        $baseUrl = rtrim($_ENV['FRONTEND_URL'] ?? 'https://oneandlab.fr', '/');
        $alertInner = '<p style="margin:0;"><strong>Votre compte est suspendu pour ' . (int) $days . ' jour(s).</strong></p>'
            . '<p style="margin:8px 0 0 0;"><strong>Raison :</strong> ' . $this->escapeHtml($reason) . '</p>';
        $content = '<p style="margin:0 0 14px 0;">Bonjour,</p>'
            . $this->emailAlertBox($alertInner)
            . '<p style="margin:0 0 14px 0;">Pendant cette période, vous ne pouvez pas accéder à la plateforme. Votre compte sera réactivé automatiquement à l\'issue du délai.</p>'
            . '<p style="margin:0;">Pour toute question ou réclamation, contactez-nous via le formulaire ci-dessous ou par email.</p>';

        return $this->baseLayout($content, [
            'title' => 'Suspension de compte',
            'preheader' => 'Votre compte Cary est suspendu. Durée, motif et contact support.',
            'ctaUrl' => $baseUrl . '/contact',
            'ctaLabel' => 'Nous contacter',
            'ctaSecondaryUrl' => 'mailto:contact@oneandlab.fr',
            'ctaSecondaryLabel' => 'Écrire à contact@oneandlab.fr',
        ]);
    }

    /**
     * Template HTML pour bannissement — style institutionnel, logo sans fond
     */
    private function getBanTemplate(string $reason): string
    {
        $baseUrl = rtrim($_ENV['FRONTEND_URL'] ?? 'https://oneandlab.fr', '/');
        $alertInner = '<p style="margin:0;"><strong>Votre compte a été définitivement exclu de la plateforme Cary.</strong></p>'
            . '<p style="margin:8px 0 0 0;"><strong>Raison indiquée :</strong> ' . $this->escapeHtml($reason) . '</p>';
        $content = '<p style="margin:0 0 14px 0;">Bonjour,</p>'
            . $this->emailAlertBox($alertInner)
            . '<p style="margin:0 0 14px 0;">Vous ne pouvez plus vous connecter. Cette mesure fait suite à des incidents graves répétés.</p>'
            . '<p style="margin:0;">Pour toute demande relative à cette décision, utilisez les canaux ci-dessous.</p>';

        return $this->baseLayout($content, [
            'title' => 'Compte définitivement fermé',
            'preheader' => 'Information importante concernant votre compte Cary.',
            'ctaUrl' => 'mailto:contact@oneandlab.fr',
            'ctaLabel' => 'Écrire au support',
            'ctaSecondaryUrl' => $baseUrl . '/contact',
            'ctaSecondaryLabel' => 'Formulaire de contact',
        ]);
    }
}


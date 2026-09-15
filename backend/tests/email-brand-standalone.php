<?php
declare(strict_types=1);
require_once __DIR__ . '/../lib/Email.php';
// Capture rendering only. SMTP and the email queue are never called.
final class PreviewEmail extends Email {
    public array $messages = [];
    public function send(string $to, string $subject, string $body, bool $isHTML = true, ?string $replyToEmail = null, ?string $replyToName = null): bool {
        $this->messages[] = ['subject' => $subject, 'html' => $body];
        return true;
    }
}
$_ENV['SMTP_USER'] = 'synthetic'; $_ENV['SMTP_PASS'] = 'synthetic';
$_ENV['APP_ENV'] = 'production'; $_ENV['FRONTEND_URL'] = 'https://cary.bio';
$_ENV['EMAIL_BRAND_PRIMARY'] = '#2563eb';
unset($_ENV['EMAIL_LOGO_URL'], $_ENV['EMAIL_LOGO_MAX_WIDTH']);
$email = new PreviewEmail();
$to = 'preview@example.invalid';
$data = ['type' => 'nursing', 'scheduled_at' => '2026-09-17 08:00:00', 'form_data' => ['availability' => ['type' => 'custom', 'range' => [8, 10]]]];
$email->sendWelcome($to, []);
$email->sendOTP($to, '123456');
$email->sendPasswordReset($to, 'synthetic-token', '654321', 60);
$email->sendAdminPasswordResetNotice($to);
$email->sendTemporaryPasswordNotice($to);
$email->sendAppointmentCreated($to, $data);
$email->sendAppointmentCreated($to, $data + ['batch_summaries' => ['Jeudi 17 septembre · 8h–10h', 'Vendredi 18 septembre · 8h–10h']]);
$email->sendAppointmentConfirmation($to, $data);
$email->sendAppointmentConfirmation($to, $data + ['batch_summaries' => ['Jeudi 17 septembre · 8h–10h', 'Vendredi 18 septembre · 8h–10h']]);
$email->sendAppointmentCanceledToPatient($to, $data + ['actor_display_label' => 'Camille Exemple']);
foreach (['nurse', 'lab', 'subaccount', 'pro'] as $role) $email->sendNewAppointmentToPro($to, $data + ['appointment_id' => 'synthetic-rdv', 'role' => $role]);
$email->sendAppointmentAssignedToPreleveur($to, $data + ['appointment_id' => 'synthetic-rdv']);
foreach (['nurse', 'pro'] as $role) $email->sendRegistrationAccepted($to, ['first_name' => 'Camille', 'role' => $role]);
$email->sendReviewInvitation($to, 'synthetic-rdv', $data);
$email->sendIncidentWarning($to, 2, 'Motif <script>alert(1)</script> & exemple');
$email->sendSuspensionEmail($to, 7, 'Motif de démonstration');
$email->sendBanEmail($to, 'Motif de démonstration');
$email->sendResultsReadyToPatient($to, 'synthetic-rdv');
$email->sendStaffAlert($to, 'Nouvelle inscription — Cary', 'Une inscription à examiner', $email->staffDetailBox(['Profil' => 'Camille Exemple', 'Rôle' => 'Infirmier']), ['ctaUrl' => 'https://cary.bio/admin/inscriptions', 'ctaLabel' => 'Voir la demande']);
$email->messages[] = ['subject' => 'Contact', 'html' => $email->buildStaffInquiryBody('Un nouveau message', '<p>Bonjour, je souhaite en savoir plus sur Cary.</p>')];
foreach ($email->messages as $i => $message) {
    $html = $message['html'];
    foreach (['#1CC7B5', 'Vos soins, simplement.', 'max-width:600px', 'https://cary.bio/images/logo-cary.png'] as $needle) {
        if (!str_contains($html, $needle)) throw new RuntimeException("Missing identity in template $i: $needle");
    }
    if (substr_count($html, 'alt="Cary"') !== 1 || substr_count($html, '<h1 ') !== 1) throw new RuntimeException("Duplicate or missing title/logo: $i");
    if (str_contains($html, '<script>') || str_contains($html, 'https://oneandlab.fr')) throw new RuntimeException("Unsafe or legacy template: $i");
    $plain = Email::plainTextFromHtml($html);
    if (!str_contains($plain, 'https://cary.bio/contact') || str_contains($plain, '<style') || str_contains($plain, '@media')) throw new RuntimeException("Invalid text alternative: $i");
}
if (!str_contains($email->messages[1]['html'], '123456') || !str_contains($email->messages[2]['html'], 'token=synthetic-token')) throw new RuntimeException('Authentication values lost');
if (!str_contains($email->messages[5]['html'], '8h - 10h') || !str_contains($email->messages[6]['html'], 'Vendredi 18')) throw new RuntimeException('Appointment details lost');
if (!empty($argv[1])) {
    $dir = $argv[1];
    if (!is_dir($dir)) mkdir($dir, 0700, true);
    foreach ($email->messages as $i => $message) file_put_contents($dir . '/' . $i . '.html', $message['html']);
    file_put_contents($dir . '/manifest.json', json_encode(array_column($email->messages, 'subject'), JSON_UNESCAPED_UNICODE));
}
echo count($email->messages) . " email variants validated without sending; identity, escaping, actions, OTP, slots, batches and plain text preserved.\n";

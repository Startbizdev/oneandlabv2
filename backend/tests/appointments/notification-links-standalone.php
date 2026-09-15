<?php
require_once __DIR__ . '/../../lib/Email.php';
require_once __DIR__ . '/../../lib/AbstractSmsProvider.php';

final class CapturedAppointmentEmail extends Email
{
    public string $body = '';
    public function send(string $to, string $subject, string $body, bool $isHTML = true, ?string $replyToEmail = null, ?string $replyToName = null): bool
    {
        $this->body = $body;
        return true;
    }
}
final class CapturedAppointmentSms extends AbstractSmsProvider
{
    public string $body = '';
    public function sendSMS(string $to, string $message): array
    {
        $this->body = $message;
        return ['success' => true];
    }
}

$_ENV['FRONTEND_URL'] = 'https://fixture.example.invalid';
$email = new CapturedAppointmentEmail();
$sms = new CapturedAppointmentSms();
$checks = 0;
function checkLink(bool $condition, string $label): void
{
    global $checks;
    if (!$condition) throw new RuntimeException($label);
    $checks++;
}
foreach (['nurse', 'lab', 'subaccount', 'pro', 'preleveur'] as $role) {
    $email->sendNewAppointmentToPro('fixture@example.invalid', ['role' => $role, 'appointment_id' => 'fixture/id']);
    checkLink(str_contains($email->body, 'https://fixture.example.invalid/' . $role . '/appointments/fixture%2Fid'), 'Email role and encoded ID: ' . $role);
    foreach (['blood_test', 'nursing'] as $type) {
        $sms->sendNewAppointmentNotification('+33000000000', ['role' => $role, 'id' => 'fixture/id', 'appointment_type' => $type]);
        $path = $role === 'nurse' ? '/nurse/demandes?openAppointment=fixture%2Fid'
            : (in_array($role, ['lab', 'subaccount'], true) ? '/' . $role . '/appointments?openAppointment=fixture%2Fid' : '/' . $role . '/appointments/fixture%2Fid');
        checkLink(str_contains($sms->body, 'https://fixture.example.invalid' . $path), 'SMS recipient role independent of care: ' . $role . ' ' . $type);
    }
}
checkLink(ProfessionalAppointmentLinks::detailPath('lab', '') === '/lab/appointments', 'Missing appointment opens list');
checkLink(ProfessionalAppointmentLinks::detailPath('unexpected', 'fixture') === '/login', 'Unknown recipient role opens login');
echo "$checks assertions passed: email and SMS links preserve all recipient roles, care independence and encoded identifiers; no transport called.\n";

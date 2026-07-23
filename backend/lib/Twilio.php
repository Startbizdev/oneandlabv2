<?php

/**
 * Repli SMS Twilio (si Brevo non configuré).
 */

require_once __DIR__ . '/AbstractSmsProvider.php';

class Twilio extends AbstractSmsProvider
{
    private string $accountSid;
    private string $authToken;
    private string $from;

    public function __construct()
    {
        $this->accountSid = $_ENV['TWILIO_ACCOUNT_SID'] ?? '';
        $this->authToken = $_ENV['TWILIO_AUTH_TOKEN'] ?? '';
        $senderId = trim((string) ($_ENV['TWILIO_SENDER_ID'] ?? 'CaryBio'));
        $phoneNumber = trim((string) ($_ENV['TWILIO_PHONE_NUMBER'] ?? $_ENV['TWILIO_FROM_NUMBER'] ?? ''));
        $this->from = $senderId !== ''
            ? self::alphanumericSender($senderId)
            : $phoneNumber;

        if (empty($this->accountSid) || empty($this->authToken) || empty($this->from)) {
            throw new Exception('Configuration Twilio incomplète');
        }
    }

    /** @return array<string, mixed> */
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
            $error = json_decode((string) $response, true);
            throw new Exception('Erreur Twilio: ' . ($error['message'] ?? 'Erreur inconnue'));
        }

        $decoded = json_decode((string) $response, true);

        return is_array($decoded) ? $decoded : [];
    }
}

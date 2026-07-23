<?php

/**
 * Envoi SMS transactionnels via Brevo (remplace Twilio).
 */

require_once __DIR__ . '/AbstractSmsProvider.php';

class BrevoSms extends AbstractSmsProvider
{
    private string $apiKey;
    private string $sender;

    public static function resolveApiKey(): ?string
    {
        foreach (['BREVO_SMS_API_KEY', 'BREVO_API_KEY'] as $envKey) {
            $value = trim((string) ($_ENV[$envKey] ?? ''));
            if ($value !== '') {
                return $value;
            }
        }

        $smtpPass = trim((string) ($_ENV['SMTP_PASS'] ?? ''));
        if (preg_match('/^xkeysib-/i', $smtpPass)) {
            return $smtpPass;
        }

        return null;
    }

    /** Indique si seule la clé SMTP Brevo (xsmtpsib) est présente — insuffisante pour l’API REST SMS. */
    public static function hasSmtpOnlyKey(): bool
    {
        if (self::resolveApiKey() !== null) {
            return false;
        }
        $smtpPass = trim((string) ($_ENV['SMTP_PASS'] ?? ''));

        return preg_match('/^xsmtpsib-/i', $smtpPass) === 1;
    }

    public static function resolveSenderId(): string
    {
        return trim((string) (
            $_ENV['BREVO_SMS_SENDER']
            ?? $_ENV['TWILIO_SENDER_ID']
            ?? 'CARYBIO'
        ));
    }

    public function __construct()
    {
        $this->apiKey = (string) (self::resolveApiKey() ?? '');
        $this->sender = self::alphanumericSender(self::resolveSenderId());

        if ($this->apiKey === '' || $this->sender === '') {
            throw new Exception('Configuration Brevo SMS incomplète');
        }
    }

    public function getSender(): string
    {
        return $this->sender;
    }

    /** @return array<string, mixed> */
    public function sendSMS(string $to, string $message): array
    {
        $recipient = self::normalizeRecipientBrevo($to);
        if ($recipient === null) {
            throw new Exception('Numéro SMS invalide: ' . $to);
        }

        $payload = json_encode([
            'sender' => $this->sender,
            'recipient' => $recipient,
            'content' => $this->formatMessage($message),
            'type' => 'transactional',
            'tag' => 'cary-notification',
            'unicodeEnabled' => true,
        ], JSON_UNESCAPED_UNICODE);

        $ch = curl_init('https://api.brevo.com/v3/transactionalSMS/send');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'accept: application/json',
            'content-type: application/json',
            'api-key: ' . $this->apiKey,
        ]);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);

        $response = curl_exec($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 201) {
            $error = json_decode((string) $response, true);
            $detail = is_array($error)
                ? (string) ($error['message'] ?? $error['code'] ?? json_encode($error))
                : (string) $response;
            throw new Exception('Erreur Brevo SMS: ' . $detail);
        }

        $decoded = json_decode((string) $response, true);

        return is_array($decoded) ? $decoded : [];
    }
}

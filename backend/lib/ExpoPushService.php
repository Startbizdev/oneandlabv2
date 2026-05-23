<?php

require_once __DIR__ . '/PushDeviceTokenService.php';

/**
 * Envoi de notifications push via Expo Push Service (APNs / FCM).
 * @see https://docs.expo.dev/push-notifications/sending-notifications/
 */
class ExpoPushService
{
    private PushDeviceTokenService $tokens;

    public function __construct(?PushDeviceTokenService $tokens = null)
    {
        $this->tokens = $tokens ?? new PushDeviceTokenService();
    }

    /**
     * Envoie une push à tous les appareils enregistrés pour l'utilisateur.
     *
     * @param array<string, mixed>|null $data
     */
    public function sendToUser(
        string $userId,
        string $title,
        string $body,
        ?array $data = null,
        ?string $type = null
    ): void {
        $pushTokens = $this->tokens->tokensForUser($userId);
        if ($pushTokens === []) {
            return;
        }

        $payloadData = $this->normalizePushData($data, $type);
        $messages = [];
        foreach ($pushTokens as $token) {
            $messages[] = [
                'to' => $token,
                'title' => $title,
                'body' => $body,
                'sound' => 'default',
                'priority' => 'high',
                'data' => $payloadData,
            ];
        }

        $this->sendMessages($messages);
    }

    /**
     * @param list<array<string, mixed>> $messages
     */
    private function sendMessages(array $messages): void
    {
        if ($messages === []) {
            return;
        }

        $chunks = array_chunk($messages, 100);
        foreach ($chunks as $chunk) {
            $this->postToExpo($chunk);
        }
    }

    /**
     * @param list<array<string, mixed>> $messages
     */
    private function postToExpo(array $messages): void
    {
        $json = json_encode($messages, JSON_UNESCAPED_UNICODE);
        if ($json === false) {
            return;
        }

        $headers = [
            'Content-Type: application/json',
            'Accept: application/json',
            'Accept-Encoding: gzip, deflate',
        ];
        $accessToken = trim((string) ($_ENV['EXPO_ACCESS_TOKEN'] ?? ''));
        if ($accessToken !== '') {
            $headers[] = 'Authorization: Bearer ' . $accessToken;
        }

        $ch = curl_init('https://exp.host/--/api/v2/push/send');
        if ($ch === false) {
            return;
        }

        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_POSTFIELDS => $json,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 15,
        ]);

        $response = curl_exec($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($response === false || $httpCode < 200 || $httpCode >= 300) {
            error_log('ExpoPushService HTTP error: ' . $httpCode);
            return;
        }

        $decoded = json_decode($response, true);
        if (!is_array($decoded)) {
            return;
        }

        $results = $decoded['data'] ?? $decoded;
        if (!is_array($results)) {
            return;
        }

        foreach ($results as $index => $result) {
            if (!is_array($result) || ($result['status'] ?? '') !== 'error') {
                continue;
            }
            $details = $result['details'] ?? [];
            $errorCode = is_array($details) ? (string) ($details['error'] ?? '') : '';
            if ($errorCode === 'DeviceNotRegistered') {
                $badToken = $messages[$index]['to'] ?? null;
                if (is_string($badToken) && $badToken !== '') {
                    $this->tokens->removeToken($badToken);
                }
            }
            error_log('ExpoPushService ticket error: ' . ($result['message'] ?? 'unknown'));
        }
    }

    /**
     * @param array<string, mixed>|null $data
     * @return array<string, string>
     */
    private function normalizePushData(?array $data, ?string $type): array
    {
        $out = [];
        if ($type !== null && $type !== '') {
            $out['type'] = $type;
        }
        if (!is_array($data)) {
            return $out;
        }
        foreach ($data as $key => $value) {
            if (!is_string($key) || $key === '') {
                continue;
            }
            if (is_scalar($value) || $value === null) {
                $out[$key] = $value === null ? '' : (string) $value;
                continue;
            }
            if (is_array($value)) {
                $encoded = json_encode($value, JSON_UNESCAPED_UNICODE);
                if ($encoded !== false) {
                    $out[$key] = $encoded;
                }
            }
        }
        return $out;
    }
}

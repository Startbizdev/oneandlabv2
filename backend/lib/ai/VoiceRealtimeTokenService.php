<?php

declare(strict_types=1);

require_once __DIR__ . '/VoiceRealtimeConfig.php';

/**
 * Crée des jetons éphémères xAI pour connexion WebSocket mobile.
 */
final class VoiceRealtimeTokenService
{
    /**
     * @return array{token: string, expires_at: int}
     */
    public function createEphemeralToken(): array
    {
        $apiKey = ai_env('XAI_API_KEY');
        if ($apiKey === null || $apiKey === '') {
            throw new InvalidArgumentException('XAI_API_KEY manquante pour la voix temps réel');
        }

        $ttl = VoiceRealtimeConfig::tokenTtlSeconds();
        $payload = json_encode([
            'expires_after' => ['seconds' => $ttl],
        ], JSON_UNESCAPED_UNICODE);

        $ch = curl_init('https://api.x.ai/v1/realtime/client_secrets');
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $apiKey,
                'Content-Type: application/json',
            ],
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_TIMEOUT => 30,
        ]);
        $raw = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($raw === false || $code >= 400) {
            error_log('[voice-realtime] client_secrets HTTP ' . $code . ' body=' . substr((string) $raw, 0, 400));
            throw new RuntimeException('Jeton vocal temps réel indisponible');
        }

        $decoded = json_decode((string) $raw, true);
        if (!is_array($decoded)) {
            throw new RuntimeException('Réponse jeton vocal invalide');
        }

        $token = trim((string) ($decoded['value'] ?? $decoded['client_secret']['value'] ?? ''));
        $expiresAt = (int) ($decoded['expires_at'] ?? $decoded['client_secret']['expires_at'] ?? (time() + $ttl));
        if ($token === '') {
            throw new RuntimeException('Jeton vocal vide');
        }

        return [
            'token' => $token,
            'expires_at' => $expiresAt,
        ];
    }
}

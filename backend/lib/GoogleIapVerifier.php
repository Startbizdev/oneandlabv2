<?php

require_once __DIR__ . '/IapJwtHelper.php';

class GoogleIapVerifier
{
    /** @var array */
    private $config;

    /** @var array */
    private $iapConfig;

    public function __construct(array $iapConfig)
    {
        $this->iapConfig = $iapConfig;
        $this->config = $iapConfig['google'] ?? [];
    }

    /**
     * @return array{
     *   original_transaction_id: string,
     *   product_id: string,
     *   status: string,
     *   trial_ends_at: ?string,
     *   current_period_end: ?string
     * }
     */
    public function verifySubscription(string $productId, string $purchaseToken): array
    {
        if (!empty($this->iapConfig['allow_unverified'])) {
            return $this->mockVerified($productId, $purchaseToken);
        }

        $package = $this->config['package_name'] ?? '';
        $accessToken = $this->getAccessToken();

        $url = sprintf(
            'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/%s/purchases/subscriptions/%s/tokens/%s',
            rawurlencode($package),
            rawurlencode($productId),
            rawurlencode($purchaseToken)
        );

        $response = $this->httpGet($url, ['Authorization: Bearer ' . $accessToken]);
        if (!$response) {
            throw new RuntimeException('Validation Google Play échouée');
        }

        $json = json_decode($response, true);
        if (!is_array($json)) {
            throw new RuntimeException('Réponse Google Play invalide');
        }

        return $this->normalizeSubscription($productId, $purchaseToken, $json);
    }

    /**
     * RTDN Pub/Sub message (base64 JSON).
     */
    public function parseNotification(array $message): array
    {
        $dataRaw = $message['data'] ?? '';
        $decoded = base64_decode($dataRaw, true);
        $json = $decoded ? json_decode($decoded, true) : null;
        if (!is_array($json)) {
            throw new RuntimeException('Notification Google invalide');
        }

        $subscriptionNotification = $json['subscriptionNotification'] ?? [];
        $purchaseToken = $subscriptionNotification['purchaseToken'] ?? '';
        $productId = $subscriptionNotification['subscriptionId'] ?? '';
        $notificationType = (int) ($subscriptionNotification['notificationType'] ?? 0);

        $status = 'active';
        if (in_array($notificationType, [3, 12, 13], true)) {
            $status = 'canceled';
        }

        $verified = null;
        if ($purchaseToken && $productId) {
            try {
                $verified = $this->verifySubscription($productId, $purchaseToken);
            } catch (Throwable $e) {
                error_log('Google RTDN verify: ' . $e->getMessage());
            }
        }

        return [
            'original_transaction_id' => $verified['original_transaction_id'] ?? $purchaseToken,
            'status' => $verified['status'] ?? $status,
            'product_id' => $productId,
            'notification_type' => $notificationType,
            'transaction' => $verified,
        ];
    }

    private function normalizeSubscription(string $productId, string $purchaseToken, array $json): array
    {
        $expiryMs = $json['expiryTimeMillis'] ?? null;
        $periodEnd = null;
        if ($expiryMs) {
            $periodEnd = date('Y-m-d H:i:s', (int) floor(((int) $expiryMs) / 1000));
        }

        $paymentState = (int) ($json['paymentState'] ?? 0);
        $cancelReason = $json['cancelReason'] ?? null;

        $status = 'active';
        if ($cancelReason !== null && $cancelReason !== '') {
            $status = 'canceled';
        } elseif ($periodEnd && strtotime($periodEnd) < time()) {
            $status = 'canceled';
        } elseif ($paymentState === 0) {
            $status = 'trialing';
        }

        $trialEnds = $paymentState === 2 ? $periodEnd : null;

        return [
            'original_transaction_id' => $purchaseToken,
            'product_id' => $productId,
            'status' => $status,
            'trial_ends_at' => $trialEnds,
            'current_period_end' => $periodEnd,
        ];
    }

    private function getAccessToken(): string
    {
        $sa = $this->config['service_account'] ?? null;
        if (!is_array($sa)) {
            throw new RuntimeException('Compte de service Google IAP manquant');
        }

        $clientEmail = $sa['client_email'] ?? '';
        $privateKey = $sa['private_key'] ?? '';
        if (!$clientEmail || !$privateKey) {
            throw new RuntimeException('Compte de service Google IAP invalide');
        }

        $now = time();
        $jwt = IapJwtHelper::signRs256([
            'iss' => $clientEmail,
            'scope' => 'https://www.googleapis.com/auth/androidpublisher',
            'aud' => 'https://oauth2.googleapis.com/token',
            'iat' => $now,
            'exp' => $now + 3600,
        ], $privateKey);

        $ch = curl_init('https://oauth2.googleapis.com/token');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => http_build_query([
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => $jwt,
            ]),
            CURLOPT_TIMEOUT => 30,
        ]);
        $body = curl_exec($ch);
        curl_close($ch);

        $json = json_decode($body ?: '', true);
        $token = $json['access_token'] ?? '';
        if (!$token) {
            throw new RuntimeException('Impossible d\'obtenir un token Google OAuth');
        }

        return $token;
    }

    private function mockVerified(string $productId, string $purchaseToken): array
    {
        return [
            'original_transaction_id' => 'dev-' . substr(hash('sha256', $purchaseToken), 0, 32),
            'product_id' => $productId ?: ($this->iapConfig['product_id'] ?? 'cary.pro.monthly'),
            'status' => 'active',
            'trial_ends_at' => null,
            'current_period_end' => date('Y-m-d H:i:s', strtotime('+30 days')),
        ];
    }

    private function httpGet(string $url, array $headers = []): ?string
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_TIMEOUT => 30,
        ]);
        $body = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($code < 200 || $code >= 300 || $body === false) {
            error_log('Google IAP API error HTTP ' . $code . ' for ' . $url);

            return null;
        }

        return $body;
    }
}

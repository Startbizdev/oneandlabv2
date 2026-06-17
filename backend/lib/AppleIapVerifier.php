<?php

require_once __DIR__ . '/IapJwtHelper.php';

class AppleIapVerifier
{
    /** @var array */
    private $config;

    /** @var array */
    private $iapConfig;

    public function __construct(array $iapConfig)
    {
        $this->iapConfig = $iapConfig;
        $this->config = $iapConfig['apple'] ?? [];
    }

    /**
     * Valide un achat Apple et retourne les champs normalisés pour upsert.
     *
     * @return array{
     *   original_transaction_id: string,
     *   product_id: string,
     *   status: string,
     *   trial_ends_at: ?string,
     *   current_period_end: ?string
     * }
     */
    public function verifyPurchase(string $transactionId, ?string $signedTransaction = null): array
    {
        if (!empty($this->iapConfig['allow_unverified'])) {
            return $this->mockVerified($transactionId, $signedTransaction);
        }

        $payload = null;
        if ($signedTransaction) {
            $payload = IapJwtHelper::decodeJwsPayload($signedTransaction);
        }

        if (!$payload && $transactionId) {
            $payload = $this->fetchTransactionFromApple($transactionId);
        }

        if (!$payload) {
            throw new RuntimeException('Transaction Apple introuvable ou invalide');
        }

        return $this->normalizeTransactionPayload($payload);
    }

    /**
     * Traite une notification App Store Server V2 (signedPayload JWS).
     */
    public function parseNotification(string $signedPayload): array
    {
        $payload = IapJwtHelper::decodeJwsPayload($signedPayload);
        if (!$payload) {
            throw new RuntimeException('Notification Apple invalide');
        }

        $notificationType = $payload['notificationType'] ?? '';
        $subtype = $payload['subtype'] ?? '';
        $data = $payload['data'] ?? [];
        $signedTx = $data['signedTransactionInfo'] ?? null;
        $txPayload = $signedTx ? IapJwtHelper::decodeJwsPayload($signedTx) : null;

        $originalTxId = $txPayload['originalTransactionId'] ?? ($txPayload['original_transaction_id'] ?? null);

        $status = 'active';
        if (in_array($notificationType, ['EXPIRED', 'REVOKE', 'REFUND'], true)) {
            $status = 'canceled';
        } elseif ($notificationType === 'DID_FAIL_TO_RENEW') {
            $status = 'past_due';
        } elseif ($notificationType === 'DID_CHANGE_RENEWAL_STATUS' && $subtype === 'AUTO_RENEW_DISABLED') {
            $status = 'active';
        }

        return [
            'original_transaction_id' => $originalTxId,
            'status' => $status,
            'notification_type' => $notificationType,
            'transaction' => $txPayload ? $this->normalizeTransactionPayload($txPayload) : null,
        ];
    }

    private function fetchTransactionFromApple(string $transactionId): ?array
    {
        $token = $this->createAppStoreJwt();
        $base = ($this->config['environment'] ?? 'production') === 'sandbox'
            ? 'https://api.storekit-sandbox.itunes.apple.com'
            : 'https://api.storekit.itunes.apple.com';

        $url = $base . '/inApps/v1/transactions/' . rawurlencode($transactionId);
        $response = $this->httpGet($url, ['Authorization: Bearer ' . $token]);

        if (!$response) {
            return null;
        }

        $json = json_decode($response, true);
        $signed = $json['signedTransactionInfo'] ?? null;
        if (!$signed) {
            return null;
        }

        return IapJwtHelper::decodeJwsPayload($signed);
    }

    private function createAppStoreJwt(): string
    {
        $issuer = $this->config['issuer_id'] ?? '';
        $keyId = $this->config['key_id'] ?? '';
        $privateKey = $this->config['private_key'] ?? '';
        $bundleId = $this->config['bundle_id'] ?? '';

        if (!$issuer || !$keyId || !$privateKey) {
            throw new RuntimeException('Configuration Apple IAP incomplète (issuer, key_id, private_key)');
        }

        $now = time();

        return IapJwtHelper::signEs256([
            'iss' => $issuer,
            'iat' => $now,
            'exp' => $now + 3600,
            'aud' => 'appstoreconnect-v1',
            'bid' => $bundleId,
        ], $privateKey, $keyId);
    }

    private function normalizeTransactionPayload(array $payload): array
    {
        $productId = $payload['productId'] ?? ($payload['product_id'] ?? '');
        $originalTx = $payload['originalTransactionId']
            ?? ($payload['original_transaction_id'] ?? ($payload['transactionId'] ?? ''));

        $expiresMs = $payload['expiresDate'] ?? ($payload['expires_date_ms'] ?? null);
        $periodEnd = null;
        if ($expiresMs) {
            $ts = is_numeric($expiresMs) ? (int) floor(((int) $expiresMs) / 1000) : strtotime((string) $expiresMs);
            if ($ts) {
                $periodEnd = date('Y-m-d H:i:s', $ts);
            }
        }

        $offerType = $payload['offerType'] ?? null;
        $trialEnds = null;
        if ($offerType === 1 || ($payload['isTrialPeriod'] ?? false)) {
            $trialEnds = $periodEnd;
        }

        $revocationDate = $payload['revocationDate'] ?? null;
        $status = 'active';
        if ($revocationDate) {
            $status = 'canceled';
        } elseif ($periodEnd && strtotime($periodEnd) < time()) {
            $status = 'canceled';
        }

        return [
            'original_transaction_id' => (string) $originalTx,
            'product_id' => (string) $productId,
            'status' => $status,
            'trial_ends_at' => $trialEnds,
            'current_period_end' => $periodEnd,
        ];
    }

    private function mockVerified(string $transactionId, ?string $signedTransaction = null): array
    {
        $productId = $this->iapConfig['product_id'] ?? 'cary.pro.monthly';
        if ($signedTransaction) {
            $payload = IapJwtHelper::decodeJwsPayload($signedTransaction);
            if (!empty($payload['productId'])) {
                $productId = (string) $payload['productId'];
            } elseif (!empty($payload['product_id'])) {
                $productId = (string) $payload['product_id'];
            }
        }

        return [
            'original_transaction_id' => 'dev-' . $transactionId,
            'product_id' => $productId,
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
            error_log('Apple IAP API error HTTP ' . $code . ' for ' . $url);

            return null;
        }

        return $body;
    }
}

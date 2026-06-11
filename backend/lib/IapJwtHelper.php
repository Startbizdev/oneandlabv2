<?php

/**
 * JWT ES256 (Apple App Store) et RS256 (Google service account).
 */
class IapJwtHelper
{
    private static function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    public static function signEs256(array $payload, string $privateKeyPem, string $keyId): string
    {
        $header = ['alg' => 'ES256', 'kid' => $keyId, 'typ' => 'JWT'];
        $segments = [
            self::base64UrlEncode(json_encode($header, JSON_UNESCAPED_SLASHES)),
            self::base64UrlEncode(json_encode($payload, JSON_UNESCAPED_SLASHES)),
        ];
        $signingInput = implode('.', $segments);

        $key = openssl_pkey_get_private($privateKeyPem);
        if ($key === false) {
            throw new RuntimeException('Clé privée Apple IAP invalide');
        }

        $signature = '';
        if (!openssl_sign($signingInput, $signature, $key, OPENSSL_ALGO_SHA256)) {
            throw new RuntimeException('Signature JWT ES256 échouée');
        }

        $der = $signature;
        $raw = self::ecdsaDerToJose($der);
        $segments[] = self::base64UrlEncode($raw);

        return implode('.', $segments);
    }

    public static function signRs256(array $payload, string $privateKeyPem): string
    {
        $header = ['alg' => 'RS256', 'typ' => 'JWT'];
        $segments = [
            self::base64UrlEncode(json_encode($header, JSON_UNESCAPED_SLASHES)),
            self::base64UrlEncode(json_encode($payload, JSON_UNESCAPED_SLASHES)),
        ];
        $signingInput = implode('.', $segments);

        $key = openssl_pkey_get_private($privateKeyPem);
        if ($key === false) {
            throw new RuntimeException('Clé privée Google IAP invalide');
        }

        $signature = '';
        if (!openssl_sign($signingInput, $signature, $key, OPENSSL_ALGO_SHA256)) {
            throw new RuntimeException('Signature JWT RS256 échouée');
        }

        $segments[] = self::base64UrlEncode($signature);

        return implode('.', $segments);
    }

    /** Convertit une signature ECDSA DER en format JOSE (r||s). */
    private static function ecdsaDerToJose(string $der): string
    {
        $offset = 0;
        if (ord($der[$offset++]) !== 0x30) {
            throw new RuntimeException('Signature DER invalide');
        }
        $seqLen = ord($der[$offset++]);
        if ($seqLen & 0x80) {
            $nb = $seqLen & 0x7f;
            $offset += $nb;
        }

        if (ord($der[$offset++]) !== 0x02) {
            throw new RuntimeException('Signature DER invalide (r)');
        }
        $rLen = ord($der[$offset++]);
        $r = substr($der, $offset, $rLen);
        $offset += $rLen;

        if (ord($der[$offset++]) !== 0x02) {
            throw new RuntimeException('Signature DER invalide (s)');
        }
        $sLen = ord($der[$offset++]);
        $s = substr($der, $offset, $sLen);

        $r = ltrim($r, "\x00");
        $s = ltrim($s, "\x00");
        $r = str_pad($r, 32, "\x00", STR_PAD_LEFT);
        $s = str_pad($s, 32, "\x00", STR_PAD_LEFT);

        return $r . $s;
    }

    public static function decodeJwsPayload(string $jws): ?array
    {
        $parts = explode('.', $jws);
        if (count($parts) < 2) {
            return null;
        }
        $payload = json_decode(base64_decode(strtr($parts[1], '-_', '+/')), true);

        return is_array($payload) ? $payload : null;
    }
}

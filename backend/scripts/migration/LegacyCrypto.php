<?php

/**
 * Déchiffrement du format legacy (MongoDB/Node.js)
 * Format: iv:authTag:encryptedData (hex, séparé par :)
 * - iv: 16 bytes (32 hex)
 * - authTag: 16 bytes (32 hex)
 * - encryptedData: ciphertext en hex
 * Algo: AES-256-GCM
 */

class LegacyCrypto
{
    private const ALGORITHM = 'aes-256-gcm';
    private const IV_LENGTH = 16;
    private const TAG_LENGTH = 16;
    private const KEY_LENGTH = 32;

    /**
     * Déchiffre une valeur au format legacy iv:authTag:encryptedData (hex)
     *
     * @param string $hexPayload Format "ivHex:tagHex:ciphertextHex"
     * @param string $encryptionKeyHex Clé 32 bytes en hex (64 caractères)
     * @return string Données déchiffrées
     */
    public static function decrypt(string $hexPayload, string $encryptionKeyHex): string
    {
        $parts = explode(':', $hexPayload, 3);
        if (count($parts) !== 3) {
            throw new Exception('Format legacy invalide: attendu iv:authTag:encryptedData');
        }

        $ivHex = $parts[0];
        $tagHex = $parts[1];
        $ciphertextHex = $parts[2];

        if (strlen($ivHex) % 2 !== 0) $ivHex = '0' . $ivHex;
        if (strlen($tagHex) % 2 !== 0) $tagHex = '0' . $tagHex;
        if (strlen($ciphertextHex) % 2 !== 0) $ciphertextHex = '0' . $ciphertextHex;

        $iv = hex2bin($ivHex);
        $tag = hex2bin($tagHex);
        $ciphertext = hex2bin($ciphertextHex);
        $key = hex2bin($encryptionKeyHex);

        if ($iv === false || strlen($iv) !== self::IV_LENGTH) {
            throw new Exception('IV legacy invalide (attendu 16 bytes)');
        }
        if ($tag === false || strlen($tag) !== self::TAG_LENGTH) {
            throw new Exception('AuthTag legacy invalide (attendu 16 bytes)');
        }
        if ($key === false || strlen($key) !== self::KEY_LENGTH) {
            throw new Exception('Clé legacy invalide (attendu 32 bytes)');
        }

        $decrypted = openssl_decrypt(
            $ciphertext,
            self::ALGORITHM,
            $key,
            OPENSSL_RAW_DATA,
            $iv,
            $tag
        );

        if ($decrypted === false) {
            throw new Exception('Échec déchiffrement legacy (authTag invalide?)');
        }

        return $decrypted;
    }

    /**
     * Déchiffre un fichier au format legacy binaire : iv (16 bytes) + authTag (16 bytes) + ciphertext
     * Utilisé pour les fichiers .enc stockés sur disque
     */
    public static function decryptFileBinary(string $rawContent, string $encryptionKeyHex): string
    {
        if (strlen($rawContent) < self::IV_LENGTH + self::TAG_LENGTH) {
            throw new Exception('Fichier legacy trop court');
        }
        $iv = substr($rawContent, 0, self::IV_LENGTH);
        $tag = substr($rawContent, self::IV_LENGTH, self::TAG_LENGTH);
        $ciphertext = substr($rawContent, self::IV_LENGTH + self::TAG_LENGTH);
        $key = hex2bin($encryptionKeyHex);
        if ($key === false || strlen($key) !== self::KEY_LENGTH) {
            throw new Exception('Clé legacy invalide');
        }
        $decrypted = openssl_decrypt(
            $ciphertext,
            self::ALGORITHM,
            $key,
            OPENSSL_RAW_DATA,
            $iv,
            $tag
        );
        if ($decrypted === false) {
            throw new Exception('Échec déchiffrement fichier legacy');
        }
        return $decrypted;
    }

    /**
     * Vérifie si une chaîne ressemble au format chiffré legacy (hex iv:authTag:data)
     */
    public static function isEncrypted(string $value): bool
    {
        if (empty($value) || !is_string($value)) {
            return false;
        }
        $parts = explode(':', $value, 3);
        return count($parts) === 3
            && ctype_xdigit($parts[0])
            && strlen($parts[0]) === 32
            && ctype_xdigit($parts[1])
            && strlen($parts[1]) === 32;
    }
}

<?php

/**
 * Classe de chiffrement AES-256-GCM avec enveloppe encryption (KEK/DEK)
 * Conforme aux normes HDS
 */

class Crypto
{
    private string $kek;
    private const ALGORITHM = 'aes-256-gcm';
    private const KEY_LENGTH = 32;
    private const IV_LENGTH = 12; // 96 bits pour GCM
    private const TAG_LENGTH = 16; // 128 bits pour GCM

    public function __construct()
    {
        $config = require __DIR__ . '/../config/encryption.php';
        $kekHex = $config['kek_hex'];
        
        if (empty($kekHex)) {
            throw new Exception('KEK non configurée. Définissez BACKEND_KEK_HEX dans les variables d\'environnement.');
        }
        
        $this->kek = hex2bin($kekHex);
        
        if ($this->kek === false || strlen($this->kek) !== self::KEY_LENGTH) {
            throw new Exception('KEK invalide. Elle doit être une chaîne hexadécimale de 64 caractères (32 bytes).');
        }
    }

    /**
     * Génère une DEK (Data Encryption Key) aléatoire
     */
    public function generateDEK(): string
    {
        return random_bytes(self::KEY_LENGTH);
    }

    /**
     * Chiffre une DEK avec la KEK
     */
    public function encryptDEK(string $dek): string
    {
        $iv = random_bytes(self::IV_LENGTH);
        $tag = '';
        
        $encrypted = openssl_encrypt(
            $dek,
            self::ALGORITHM,
            $this->kek,
            OPENSSL_RAW_DATA,
            $iv,
            $tag
        );
        
        if ($encrypted === false) {
            throw new Exception('Erreur lors du chiffrement de la DEK');
        }
        
        // Format: iv (12 bytes) + tag (16 bytes) + ciphertext
        $payload = $iv . $tag . $encrypted;
        
        return base64_encode($payload);
    }

    /**
     * Déchiffre une DEK avec la KEK
     */
    public function decryptDEK(string $encryptedDEK): string
    {
        $payload = base64_decode($encryptedDEK, true);
        
        if ($payload === false) {
            throw new Exception('DEK chiffrée invalide (base64)');
        }
        
        if (strlen($payload) < self::IV_LENGTH + self::TAG_LENGTH) {
            throw new Exception('DEK chiffrée invalide (taille)');
        }
        
        $iv = substr($payload, 0, self::IV_LENGTH);
        $tag = substr($payload, self::IV_LENGTH, self::TAG_LENGTH);
        $ciphertext = substr($payload, self::IV_LENGTH + self::TAG_LENGTH);
        
        $dek = openssl_decrypt(
            $ciphertext,
            self::ALGORITHM,
            $this->kek,
            OPENSSL_RAW_DATA,
            $iv,
            $tag
        );
        
        if ($dek === false) {
            throw new Exception('Erreur lors du déchiffrement de la DEK');
        }
        
        return $dek;
    }

    /**
     * Chiffre des données avec une DEK
     */
    public function encrypt(string $data, string $dek): string
    {
        $iv = random_bytes(self::IV_LENGTH);
        $tag = '';
        
        $encrypted = openssl_encrypt(
            $data,
            self::ALGORITHM,
            $dek,
            OPENSSL_RAW_DATA,
            $iv,
            $tag
        );
        
        if ($encrypted === false) {
            throw new Exception('Erreur lors du chiffrement des données');
        }
        
        // Format JSON avec iv, ciphertext, tag (tous en base64)
        $payload = [
            'iv' => base64_encode($iv),
            'ciphertext' => base64_encode($encrypted),
            'tag' => base64_encode($tag),
        ];
        
        return base64_encode(json_encode($payload));
    }

    /**
     * Déchiffre des données avec une DEK
     */
    public function decrypt(string $encryptedData, string $dek): string
    {
        $payloadJson = base64_decode($encryptedData, true);
        
        if ($payloadJson === false) {
            throw new Exception('Données chiffrées invalides (base64)');
        }
        
        $payload = json_decode($payloadJson, true);
        
        if ($payload === null || !isset($payload['iv'], $payload['ciphertext'], $payload['tag'])) {
            throw new Exception('Format de données chiffrées invalide');
        }
        
        $iv = base64_decode($payload['iv'], true);
        $ciphertext = base64_decode($payload['ciphertext'], true);
        $tag = base64_decode($payload['tag'], true);
        
        if ($iv === false || $ciphertext === false || $tag === false) {
            throw new Exception('Erreur lors du décodage base64 des composants');
        }
        
        $data = openssl_decrypt(
            $ciphertext,
            self::ALGORITHM,
            $dek,
            OPENSSL_RAW_DATA,
            $iv,
            $tag
        );
        
        if ($data === false) {
            throw new Exception('Erreur lors du déchiffrement des données');
        }
        
        return $data;
    }

    /**
     * Chiffre un champ avec génération automatique de DEK
     * Retourne ['encrypted' => ..., 'dek' => ...]
     */
    public function encryptField(string $data): array
    {
        $dek = $this->generateDEK();
        $encrypted = $this->encrypt($data, $dek);
        $encryptedDEK = $this->encryptDEK($dek);
        
        return [
            'encrypted' => $encrypted,
            'dek' => $encryptedDEK,
        ];
    }

    /**
     * Déchiffre un champ avec sa DEK chiffrée
     */
    public function decryptField(string $encryptedData, string $encryptedDEK): string
    {
        $dek = $this->decryptDEK($encryptedDEK);
        return $this->decrypt($encryptedData, $dek);
    }

    /**
     * Chiffre un fichier avec AES-256-GCM
     * Retourne le contenu chiffré et la DEK chiffrée
     */
    public function encryptFile(string $fileContent): array
    {
        $dek = $this->generateDEK();
        $iv = random_bytes(self::IV_LENGTH);
        $tag = '';
        
        $encrypted = openssl_encrypt(
            $fileContent,
            self::ALGORITHM,
            $dek,
            OPENSSL_RAW_DATA,
            $iv,
            $tag
        );
        
        if ($encrypted === false) {
            throw new Exception('Erreur lors du chiffrement du fichier');
        }
        
        // Format: iv (12 bytes) + tag (16 bytes) + ciphertext
        $payload = $iv . $tag . $encrypted;
        
        return [
            'encrypted' => base64_encode($payload),
            'dek' => $this->encryptDEK($dek),
        ];
    }

    /**
     * Déchiffre un fichier avec AES-256-GCM
     */
    public function decryptFile(string $encryptedContent, string $encryptedDEK): string
    {
        // Déchiffrer la DEK
        $dek = $this->decryptDEK($encryptedDEK);
        
        // Déchiffrer le fichier
        $payload = base64_decode($encryptedContent, true);
        
        if ($payload === false) {
            throw new Exception('Contenu chiffré invalide (base64)');
        }
        
        if (strlen($payload) < self::IV_LENGTH + self::TAG_LENGTH) {
            throw new Exception('Contenu chiffré invalide (taille)');
        }
        
        $iv = substr($payload, 0, self::IV_LENGTH);
        $tag = substr($payload, self::IV_LENGTH, self::TAG_LENGTH);
        $ciphertext = substr($payload, self::IV_LENGTH + self::TAG_LENGTH);
        
        $decrypted = openssl_decrypt(
            $ciphertext,
            self::ALGORITHM,
            $dek,
            OPENSSL_RAW_DATA,
            $iv,
            $tag
        );
        
        if ($decrypted === false) {
            throw new Exception('Erreur lors du déchiffrement du fichier');
        }
        
        return $decrypted;
    }
}


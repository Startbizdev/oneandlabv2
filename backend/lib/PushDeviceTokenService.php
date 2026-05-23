<?php

require_once __DIR__ . '/../config/database.php';

/**
 * Enregistrement des ExponentPushToken par utilisateur (mobile Expo).
 */
class PushDeviceTokenService
{
    private PDO $db;

    public function __construct(?PDO $db = null)
    {
        if ($db instanceof PDO) {
            $this->db = $db;
            return;
        }
        $config = require __DIR__ . '/../config/database.php';
        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=%s',
            $config['host'],
            $config['port'],
            $config['database'],
            $config['charset']
        );
        $this->db = new PDO($dsn, $config['username'], $config['password'], $config['options']);
    }

    public function upsert(string $userId, string $expoPushToken, string $platform): void
    {
        if (!$this->isValidExpoPushToken($expoPushToken)) {
            throw new InvalidArgumentException('Token push Expo invalide.');
        }
        $platform = $platform === 'android' ? 'android' : 'ios';
        $id = $this->generateUUID();

        $stmt = $this->db->prepare('
            INSERT INTO push_device_tokens (id, user_id, expo_push_token, platform)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                user_id = VALUES(user_id),
                platform = VALUES(platform),
                updated_at = NOW()
        ');
        $stmt->execute([$id, $userId, $expoPushToken, $platform]);
    }

  /** @return list<string> */
    public function tokensForUser(string $userId): array
    {
        $stmt = $this->db->prepare('
            SELECT expo_push_token FROM push_device_tokens WHERE user_id = ?
        ');
        $stmt->execute([$userId]);
        $rows = $stmt->fetchAll(PDO::FETCH_COLUMN);
        return array_values(array_filter(array_map('strval', $rows ?: [])));
    }

    public function removeToken(string $expoPushToken): void
    {
        if ($expoPushToken === '') {
            return;
        }
        $stmt = $this->db->prepare('DELETE FROM push_device_tokens WHERE expo_push_token = ?');
        $stmt->execute([$expoPushToken]);
    }

    public function removeTokenForUser(string $userId, string $expoPushToken): void
    {
        if ($expoPushToken === '') {
            return;
        }
        $stmt = $this->db->prepare('
            DELETE FROM push_device_tokens WHERE user_id = ? AND expo_push_token = ?
        ');
        $stmt->execute([$userId, $expoPushToken]);
    }

    public static function isValidExpoPushToken(string $token): bool
    {
        return str_starts_with($token, 'ExponentPushToken[') && str_ends_with($token, ']');
    }

    private function generateUUID(): string
    {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}

<?php

declare(strict_types=1);

/**
 * Favoris pharmacies (v2).
 */
final class PharmacyFavoriteService
{
    private const MAX_FAVORITES = 20;

    public function __construct(private PDO $db)
    {
    }

    public static function newUuid(): string
    {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }

    /** @return list<string> */
    public function listPharmacyIds(string $userId): array
    {
        try {
            $stmt = $this->db->prepare(
                'SELECT pharmacy_id FROM pharmacy_favorites WHERE user_id = ? ORDER BY created_at DESC'
            );
            $stmt->execute([$userId]);

            return array_map('strval', $stmt->fetchAll(PDO::FETCH_COLUMN) ?: []);
        } catch (PDOException) {
            return [];
        }
    }

    public function add(string $userId, string $pharmacyId): void
    {
        $countStmt = $this->db->prepare('SELECT COUNT(*) FROM pharmacy_favorites WHERE user_id = ?');
        $countStmt->execute([$userId]);
        $count = (int) $countStmt->fetchColumn();
        if ($count >= self::MAX_FAVORITES) {
            throw new RuntimeException('Limite de favoris atteinte');
        }

        $check = $this->db->prepare('SELECT 1 FROM pharmacy_favorites WHERE user_id = ? AND pharmacy_id = ?');
        $check->execute([$userId, $pharmacyId]);
        if ($check->fetchColumn()) {
            return;
        }

        $this->db->prepare('
            INSERT INTO pharmacy_favorites (id, user_id, pharmacy_id) VALUES (?, ?, ?)
        ')->execute([self::newUuid(), $userId, $pharmacyId]);
    }

    public function remove(string $userId, string $pharmacyId): void
    {
        $this->db->prepare('DELETE FROM pharmacy_favorites WHERE user_id = ? AND pharmacy_id = ?')
            ->execute([$userId, $pharmacyId]);
    }
}

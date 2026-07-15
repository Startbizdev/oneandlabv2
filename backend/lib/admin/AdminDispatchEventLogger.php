<?php

declare(strict_types=1);

/**
 * Journal des événements dispatch pour le tableau de bord admin.
 * Stocke uniquement des IDs — pas de déchiffrement.
 */
final class AdminDispatchEventLogger
{
    private PDO $db;

    /** @var bool|null */
    private static ?bool $tableReady = null;

    public function __construct(?PDO $db = null)
    {
        if ($db !== null) {
            $this->db = $db;
            return;
        }
        $config = require __DIR__ . '/../../config/database.php';
        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=%s',
            $config['host'],
            $config['port'],
            $config['database'],
            $config['charset']
        );
        $this->db = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);
    }

    public static function isAvailable(?PDO $db = null): bool
    {
        if (self::$tableReady !== null) {
            return self::$tableReady;
        }
        try {
            $pdo = $db ?? (new self())->db;
            $stmt = $pdo->query("SHOW TABLES LIKE 'appointment_dispatch_events'");
            self::$tableReady = $stmt && $stmt->rowCount() > 0;
        } catch (Throwable $e) {
            self::$tableReady = false;
        }
        return self::$tableReady;
    }

    /**
     * @param array<string, mixed>|null $metadata
     */
    public function log(
        string $appointmentId,
        string $eventType,
        ?string $actorId = null,
        ?string $actorRole = null,
        ?string $targetProfileId = null,
        ?array $metadata = null
    ): void {
        if (!self::isAvailable($this->db)) {
            return;
        }
        try {
            $id = $this->generateUUID();
            $stmt = $this->db->prepare('
                INSERT INTO appointment_dispatch_events
                (id, appointment_id, event_type, actor_id, actor_role, target_profile_id, metadata, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
            ');
            $stmt->execute([
                $id,
                $appointmentId,
                $eventType,
                $actorId,
                $actorRole,
                $targetProfileId,
                $metadata !== null ? json_encode($metadata, JSON_UNESCAPED_UNICODE) : null,
            ]);
        } catch (Throwable $e) {
            error_log('AdminDispatchEventLogger: ' . $e->getMessage());
        }
    }

    public function setDispatchMode(string $appointmentId, string $mode): void
    {
        if (!in_array($mode, ['zone', 'external_invite', 'direct_assign', 'manual'], true)) {
            return;
        }
        try {
            $stmt = $this->db->prepare('
                SELECT COUNT(*) FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = \'appointments\' AND COLUMN_NAME = \'dispatch_mode\'
            ');
            $stmt->execute();
            if ((int) $stmt->fetchColumn() === 0) {
                return;
            }
            $upd = $this->db->prepare('UPDATE appointments SET dispatch_mode = ? WHERE id = ?');
            $upd->execute([$mode, $appointmentId]);
        } catch (Throwable $e) {
            error_log('AdminDispatchEventLogger setDispatchMode: ' . $e->getMessage());
        }
    }

    private function generateUUID(): string
    {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}

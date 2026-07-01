<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/../Crypto.php';
require_once __DIR__ . '/../Uuid.php';

final class AiMemoryService
{
    private PDO $db;
    private Crypto $crypto;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? rag_db();
        $this->crypto = new Crypto();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function getUserMemory(string $userId): array
    {
        $stmt = $this->db->prepare('
            SELECT memory_key, category, value_encrypted, dek
            FROM ai_user_memory WHERE user_id = ?
        ');
        $stmt->execute([$userId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $out = [];
        foreach ($rows as $row) {
            try {
                $value = $this->crypto->decryptField((string) $row['value_encrypted'], (string) $row['dek']);
            } catch (Throwable) {
                continue;
            }
            $out[] = [
                'key' => (string) $row['memory_key'],
                'category' => (string) $row['category'],
                'value' => $value,
            ];
        }

        return $out;
    }

    public function setUserMemory(string $userId, string $key, string $value, string $category = 'preference'): void
    {
        $encrypted = $this->crypto->encryptField($value);
        $stmt = $this->db->prepare('
            INSERT INTO ai_user_memory (id, user_id, memory_key, value_encrypted, dek, category)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE value_encrypted = VALUES(value_encrypted), dek = VALUES(dek),
                category = VALUES(category), updated_at = NOW()
        ');
        $stmt->execute([
            Uuid::v4(),
            $userId,
            $key,
            $encrypted['encrypted'],
            $encrypted['dek'],
            $category,
        ]);
    }

    /**
     * @return array<string, mixed>|null
     */
    public function getMedicalSnapshot(string $patientId, string $snapshotType): ?array
    {
        $stmt = $this->db->prepare('
            SELECT content_json, refreshed_at FROM ai_medical_memory
            WHERE patient_id = ? AND snapshot_type = ? LIMIT 1
        ');
        $stmt->execute([$patientId, $snapshotType]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return null;
        }
        $json = json_decode((string) ($row['content_json'] ?? '{}'), true);

        return is_array($json) ? $json : null;
    }

    /**
     * @param array<string, mixed> $content
     */
    public function upsertMedicalSnapshot(string $patientId, string $snapshotType, array $content): void
    {
        $json = json_encode($content, JSON_UNESCAPED_UNICODE);
        if ($json === false) {
            return;
        }
        $hash = hash('sha256', $json);
        $stmt = $this->db->prepare('
            INSERT INTO ai_medical_memory (id, patient_id, snapshot_type, content_json, content_hash, refreshed_at)
            VALUES (?, ?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE content_json = VALUES(content_json), content_hash = VALUES(content_hash),
                refreshed_at = NOW(), updated_at = NOW()
        ');
        $stmt->execute([Uuid::v4(), $patientId, $snapshotType, $json, $hash]);
    }

    public function getConversationSummary(string $conversationId): ?string
    {
        $stmt = $this->db->prepare('
            SELECT summary_text FROM ai_conversation_summaries
            WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1
        ');
        $stmt->execute([$conversationId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? (string) $row['summary_text'] : null;
    }
}

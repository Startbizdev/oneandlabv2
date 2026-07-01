<?php

declare(strict_types=1);

require_once __DIR__ . '/../Uuid.php';
require_once __DIR__ . '/AIGateway.php';
require_once __DIR__ . '/bootstrap.php';

final class AiConversationService
{
    private PDO $db;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? ai_db();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listForUser(string $userId, int $limit = 50, int $offset = 0, bool $archivedOnly = false): array
    {
        $archiveClause = $archivedOnly ? 'archived_at IS NOT NULL' : 'archived_at IS NULL';
        $stmt = $this->db->prepare("
            SELECT * FROM ai_conversations
            WHERE user_id = ? AND deleted_at IS NULL AND {$archiveClause}
            ORDER BY is_pinned DESC, COALESCE(last_message_at, updated_at) DESC
            LIMIT ? OFFSET ?
        ");
        $stmt->bindValue(1, $userId);
        $stmt->bindValue(2, max(1, min(100, $limit)), PDO::PARAM_INT);
        $stmt->bindValue(3, max(0, $offset), PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return array_map([$this, 'mapConversation'], $rows);
    }

    public function getById(string $id, string $userId): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM ai_conversations WHERE id = ? AND user_id = ? AND deleted_at IS NULL LIMIT 1');
        $stmt->execute([$id, $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? $this->mapConversation($row) : null;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function getMessages(string $conversationId, string $userId, int $limit = 100): array
    {
        if (!$this->getById($conversationId, $userId)) {
            return [];
        }
        $stmt = $this->db->prepare('
            SELECT * FROM ai_messages
            WHERE conversation_id = ?
            ORDER BY created_at ASC
            LIMIT ?
        ');
        $stmt->bindValue(1, $conversationId);
        $stmt->bindValue(2, max(1, min(200, $limit)), PDO::PARAM_INT);
        $stmt->execute();

        return array_map([$this, 'mapMessage'], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /**
     * @param array<string, mixed> $input
     */
    public function create(array $user, array $input): array
    {
        $id = Uuid::v4();
        $type = (string) ($input['conversation_type'] ?? 'general');
        $title = isset($input['custom_title']) ? trim((string) $input['custom_title']) : null;
        $patientId = isset($input['patient_id']) ? trim((string) $input['patient_id']) : null;
        if ($patientId === '') {
            $patientId = null;
        }

        $stmt = $this->db->prepare('
            INSERT INTO ai_conversations
                (id, user_id, patient_id, conversation_type, custom_title, metadata_json)
            VALUES (?, ?, ?, ?, ?, ?)
        ');
        $metadata = !empty($input['metadata']) ? json_encode($input['metadata']) : null;
        $stmt->execute([
            $id,
            $user['user_id'],
            $patientId,
            $type,
            $title,
            $metadata,
        ]);

        $welcome = $this->welcomeMessage($user, $type);
        $this->addMessage($id, 'assistant', $welcome);

        return $this->getById($id, (string) $user['user_id']) ?? [];
    }

    /**
     * @param array<string, mixed> $patch
     */
    public function update(string $id, string $userId, array $patch): ?array
    {
        $existing = $this->getById($id, $userId);
        if (!$existing) {
            return null;
        }
        $fields = [];
        $params = [];
        if (array_key_exists('custom_title', $patch)) {
            $fields[] = 'custom_title = ?';
            $params[] = trim((string) $patch['custom_title']);
        }
        if (array_key_exists('is_pinned', $patch)) {
            $fields[] = 'is_pinned = ?';
            $params[] = !empty($patch['is_pinned']) ? 1 : 0;
        }
        if (array_key_exists('archived_at', $patch)) {
            $fields[] = 'archived_at = ?';
            $params[] = $patch['archived_at'];
        }
        if (array_key_exists('archived', $patch)) {
            $fields[] = 'archived_at = ?';
            $params[] = !empty($patch['archived']) ? date('Y-m-d H:i:s') : null;
        }
        if ($fields === []) {
            return $existing;
        }
        $params[] = $id;
        $params[] = $userId;
        $sql = 'UPDATE ai_conversations SET ' . implode(', ', $fields) . ' WHERE id = ? AND user_id = ?';
        $this->db->prepare($sql)->execute($params);

        return $this->getById($id, $userId);
    }

    public function softDelete(string $id, string $userId): bool
    {
        $conv = $this->getById($id, $userId);
        if (!$conv || !empty($conv['is_system'])) {
            return false;
        }
        $stmt = $this->db->prepare('UPDATE ai_conversations SET deleted_at = NOW() WHERE id = ? AND user_id = ? AND is_system = 0');

        return $stmt->execute([$id, $userId]) && $stmt->rowCount() > 0;
    }

    public function countUserMessages(string $conversationId): int
    {
        $stmt = $this->db->prepare('SELECT COUNT(*) FROM ai_messages WHERE conversation_id = ? AND role = ?');
        $stmt->execute([$conversationId, 'user']);

        return (int) $stmt->fetchColumn();
    }

    /**
     * Titre auto (premier message utilisateur), style ChatGPT.
     *
     * @param array<string, mixed> $conv
     * @param array<string, mixed> $user
     */
    public function maybeAutoTitle(string $id, string $userId, string $userMessage, array $conv, array $user, AIGateway $gateway): ?array
    {
        if (!empty($conv['is_system'])) {
            return null;
        }
        $existing = trim((string) ($conv['custom_title'] ?? ''));
        if ($existing !== '') {
            return null;
        }
        if ($this->countUserMessages($id) !== 1) {
            return null;
        }

        $title = self::fallbackTitleFromMessage($userMessage);
        if ($title === '' || $title === 'Nouvelle conversation') {
            return null;
        }

        return $this->update($id, $userId, ['custom_title' => $title]);
    }

    public static function fallbackTitleFromMessage(string $message): string
    {
        $clean = preg_replace('/\s+/u', ' ', trim($message)) ?? '';
        if ($clean === '') {
            return 'Nouvelle conversation';
        }
        $clean = rtrim($clean, '.!?…');
        if (mb_strlen($clean) <= 48) {
            return mb_strtoupper(mb_substr($clean, 0, 1)) . mb_substr($clean, 1);
        }
        $trunc = mb_substr($clean, 0, 48);
        $lastSpace = mb_strrpos($trunc, ' ');
        if ($lastSpace !== false && $lastSpace > 16) {
            $trunc = mb_substr($trunc, 0, $lastSpace);
        }

        return mb_strtoupper(mb_substr($trunc, 0, 1)) . mb_substr($trunc, 1) . '…';
    }

    /**
     * @param array<string, mixed> $user
     */
    private static function generateTitleViaAi(AIGateway $gateway, array $user, string $userMessage): string
    {
        $snippet = mb_substr(trim($userMessage), 0, 500);
        if ($snippet === '') {
            return self::fallbackTitleFromMessage($userMessage);
        }

        try {
            $result = $gateway->chat(
                $user,
                [[
                    'role' => 'user',
                    'content' => "Génère un titre court (4 à 7 mots maximum, en français, sans guillemets ni point final) pour une conversation patient commençant par ce message :\n\n{$snippet}",
                ]],
                'conversation_title',
                [],
                null,
                null,
            );
            $title = trim((string) ($result['content'] ?? ''));
            $title = trim($title, " \t\n\r\0\x0B\"'«»");
            $title = preg_replace('/[\r\n]+/', ' ', $title) ?? $title;
            if ($title !== '' && mb_strlen($title) <= 80) {
                return $title;
            }
        } catch (Throwable $e) {
            error_log('ai conversation title: ' . $e->getMessage());
        }

        return self::fallbackTitleFromMessage($userMessage);
    }

    /**
     * @return array<string, mixed>
     */
    public function ensureSystem(array $user, string $systemKey): array
    {
        $stmt = $this->db->prepare('
            SELECT * FROM ai_conversations
            WHERE user_id = ? AND is_system = 1 AND system_key = ? AND deleted_at IS NULL
            LIMIT 1
        ');
        $stmt->execute([$user['user_id'], $systemKey]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            return $this->mapConversation($row);
        }

        $typeMap = [
            'assistant_health' => 'assistant_health',
            'lab_results' => 'lab_results',
            'appointment' => 'appointment',
            'health_tracking' => 'health_tracking',
        ];
        $titleMap = [
            'assistant_health' => 'Mon Assistant Santé',
            'lab_results' => 'Mes résultats',
            'appointment' => 'Mes rendez-vous',
            'health_tracking' => 'Mes données santé',
        ];
        $id = Uuid::v4();
        $convType = $typeMap[$systemKey] ?? 'general';
        $title = $titleMap[$systemKey] ?? 'Assistant Cary';

        $insert = $this->db->prepare('
            INSERT INTO ai_conversations
                (id, user_id, conversation_type, custom_title, is_system, system_key)
            VALUES (?, ?, ?, ?, 1, ?)
        ');
        $insert->execute([$id, $user['user_id'], $convType, $title, $systemKey]);
        $this->addMessage($id, 'assistant', $this->welcomeMessage($user, $convType));

        return $this->getById($id, (string) $user['user_id']) ?? [];
    }

    public function addMessage(string $conversationId, string $role, string $content, ?array $metadata = null): array
    {
        $id = Uuid::v4();
        $metaJson = $metadata !== null ? json_encode($metadata) : null;
        $stmt = $this->db->prepare('
            INSERT INTO ai_messages (id, conversation_id, role, content, metadata_json)
            VALUES (?, ?, ?, ?, ?)
        ');
        $stmt->execute([$id, $conversationId, $role, $content, $metaJson]);

        $this->db->prepare('
            UPDATE ai_conversations
            SET last_message_at = NOW(), message_count = message_count + 1, updated_at = NOW()
            WHERE id = ?
        ')->execute([$conversationId]);

        return [
            'id' => $id,
            'conversation_id' => $conversationId,
            'role' => $role,
            'content' => $content,
            'metadata' => $metadata,
        ];
    }

    private function welcomeMessage(array $user, string $type): string
    {
        $name = '';
        try {
            require_once __DIR__ . '/../../models/User.php';
            $userModel = new User();
            $profile = $userModel->getById((string) $user['user_id'], (string) $user['user_id'], (string) $user['role'], 'mobile');
            $name = trim((string) ($profile['first_name'] ?? ''));
        } catch (Throwable $e) {
            // ignore
        }
        $greeting = $name !== '' ? "Bonjour {$name}," : 'Bonjour,';

        return match ($type) {
            'lab_results' => "{$greeting} je peux vous aider à comprendre vos résultats d'analyses (sans interprétation médicale). Que souhaitez-vous savoir ?",
            'appointment' => "{$greeting} je peux vous aider à préparer ou planifier un rendez-vous. Souhaitez-vous prendre un RDV ?",
            'assistant_health' => "{$greeting} je suis votre assistant Cary. Posez-moi vos questions sur votre suivi, vos RDV ou vos documents.",
            'health_tracking' => "{$greeting} je peux vous présenter vos tendances santé synchronisées (activité, poids, fréquence cardiaque). Que voulez-vous explorer ?",
            default => "{$greeting} je suis Cary, votre assistant. Comment puis-je vous aider ?",
        };
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private function mapConversation(array $row): array
    {
        return [
            'id' => (string) $row['id'],
            'user_id' => (string) $row['user_id'],
            'patient_id' => $row['patient_id'] ?? null,
            'conversation_type' => $row['conversation_type'],
            'channel' => $row['channel'] ?? 'text',
            'custom_title' => $row['custom_title'] ?? null,
            'is_pinned' => (bool) ($row['is_pinned'] ?? false),
            'archived_at' => $row['archived_at'] ?? null,
            'is_system' => (bool) ($row['is_system'] ?? false),
            'system_key' => $row['system_key'] ?? null,
            'message_count' => (int) ($row['message_count'] ?? 0),
            'last_message_at' => $row['last_message_at'] ?? null,
            'created_at' => $row['created_at'] ?? null,
            'updated_at' => $row['updated_at'] ?? null,
        ];
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private function mapMessage(array $row): array
    {
        $meta = null;
        if (!empty($row['metadata_json'])) {
            $decoded = json_decode((string) $row['metadata_json'], true);
            $meta = is_array($decoded) ? $decoded : null;
        }

        return [
            'id' => (string) $row['id'],
            'conversation_id' => (string) $row['conversation_id'],
            'role' => $row['role'],
            'content' => $row['content'],
            'metadata' => $meta,
            'created_at' => $row['created_at'] ?? null,
        ];
    }
}

<?php

declare(strict_types=1);

require_once __DIR__ . '/../Crypto.php';
require_once __DIR__ . '/../Uuid.php';
require_once __DIR__ . '/../AppTimezone.php';

/**
 * Conversations et messages de l'assistant. Titre et contenu chiffrés (Crypto/DEK) ; le contenu est un JSON
 * {text, names} : texte réel affiché à l'utilisateur et noms connus du tour (pour les ré-aliaser au tour suivant).
 */
final class AssistantConversationRepository
{
    private const PENDING_STALE_SECONDS = 120;

    private Crypto $crypto;

    public function __construct(private readonly PDO $db, ?Crypto $crypto = null)
    {
        $this->crypto = $crypto ?? new Crypto();
    }

    /** @return array<string, mixed>|null */
    public function find(string $id, string $userId): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM assistant_conversations WHERE id = ? AND user_id = ? LIMIT 1');
        $stmt->execute([$id, $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    /** Message utilisateur déjà reçu avec ce client_message_id (toutes conversations de l'utilisateur). */
    public function findUserTurn(string $userId, string $clientMessageId): ?array
    {
        $stmt = $this->db->prepare("
            SELECT m.id, m.conversation_id, m.status, TIMESTAMPDIFF(SECOND, m.created_at, NOW(3)) AS age_seconds
            FROM assistant_messages m
            INNER JOIN assistant_conversations c ON c.id = m.conversation_id
            WHERE c.user_id = ? AND m.client_message_id = ? AND m.role = 'user'
            LIMIT 1
        ");
        $stmt->execute([$userId, $clientMessageId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    public function isStale(array $turn): bool
    {
        return $turn['status'] === 'error' || (int) $turn['age_seconds'] >= self::PENDING_STALE_SECONDS;
    }

    /** @return array<string, mixed>|null réponse enregistrée du tour */
    public function findReply(string $conversationId, string $clientMessageId): ?array
    {
        $stmt = $this->db->prepare("SELECT *, UNIX_TIMESTAMP(created_at) AS created_unix FROM assistant_messages WHERE conversation_id = ? AND client_message_id = ? AND role = 'assistant' LIMIT 1");
        $stmt->execute([$conversationId, $clientMessageId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? $this->mapMessage($row) : null;
    }

    public function create(string $userId, ?string $patientId, ?array $context, string $title): array
    {
        $id = Uuid::v4();
        $enc = $this->crypto->encryptField($title);
        $this->db->prepare('
            INSERT INTO assistant_conversations (id, user_id, patient_id, context_type, context_id, title_encrypted, title_dek)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ')->execute([$id, $userId, $patientId, $context['type'] ?? null, $context['id'] ?? null, $enc['encrypted'], $enc['dek']]);

        return (array) $this->find($id, $userId);
    }

    /**
     * @param list<array{0: string, 1: string}> $names
     * @param list<array<string, mixed>>|null $actions
     * @param array{model?: ?string, input_tokens?: ?int, output_tokens?: ?int, latency_ms?: ?int} $usage
     */
    public function addMessage(
        string $conversationId,
        string $role,
        string $text,
        array $names,
        ?string $clientMessageId,
        string $status,
        ?array $actions = null,
        array $usage = [],
    ): string {
        $id = Uuid::v4();
        $enc = $this->crypto->encryptField((string) json_encode(['text' => $text, 'names' => $names], JSON_UNESCAPED_UNICODE));
        $this->db->prepare('
            INSERT INTO assistant_messages (id, conversation_id, role, content_encrypted, content_dek, actions_json, client_message_id,
                status, model, input_tokens, output_tokens, latency_ms)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ')->execute([
            $id, $conversationId, $role, $enc['encrypted'], $enc['dek'],
            $actions !== null ? json_encode($actions, JSON_UNESCAPED_UNICODE) : null,
            $clientMessageId, $status, $usage['model'] ?? null, $usage['input_tokens'] ?? null,
            $usage['output_tokens'] ?? null, $usage['latency_ms'] ?? null,
        ]);
        $this->db->prepare('UPDATE assistant_conversations SET updated_at = NOW(3) WHERE id = ?')->execute([$conversationId]);

        return $id;
    }

    public function setStatus(string $messageId, string $status): void
    {
        $this->db->prepare('UPDATE assistant_messages SET status = ? WHERE id = ?')->execute([$status, $messageId]);
    }

    public function deleteMessage(string $messageId): void
    {
        $this->db->prepare('DELETE FROM assistant_messages WHERE id = ?')->execute([$messageId]);
    }

    /** @return list<array<string, mixed>> derniers messages terminés, du plus ancien au plus récent */
    public function recentMessages(string $conversationId, int $limit): array
    {
        $stmt = $this->db->prepare("
            SELECT *, UNIX_TIMESTAMP(created_at) AS created_unix FROM assistant_messages WHERE conversation_id = ? AND status = 'done'
            ORDER BY created_at DESC, role DESC LIMIT " . max(1, $limit));
        $stmt->execute([$conversationId]);

        return array_reverse(array_map([$this, 'mapMessage'], $stmt->fetchAll(PDO::FETCH_ASSOC)));
    }

    /** @return array{items: list<array<string, mixed>>, total: int} */
    public function listForUser(string $userId, int $page, int $limit): array
    {
        $count = $this->db->prepare('SELECT COUNT(*) FROM assistant_conversations WHERE user_id = ?');
        $count->execute([$userId]);
        $stmt = $this->db->prepare("
            SELECT c.id, c.title_encrypted, c.title_dek, UNIX_TIMESTAMP(c.updated_at) AS updated_unix,
                   (SELECT m.content_encrypted FROM assistant_messages m WHERE m.conversation_id = c.id AND m.status = 'done'
                    ORDER BY m.created_at DESC, m.role DESC LIMIT 1) AS last_enc,
                   (SELECT m.content_dek FROM assistant_messages m WHERE m.conversation_id = c.id AND m.status = 'done'
                    ORDER BY m.created_at DESC, m.role DESC LIMIT 1) AS last_dek
            FROM assistant_conversations c
            WHERE c.user_id = ?
            ORDER BY c.updated_at DESC
            LIMIT " . $limit . ' OFFSET ' . (($page - 1) * $limit));
        $stmt->execute([$userId]);
        $items = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $last = $row['last_enc'] !== null ? $this->decodeContent((string) $row['last_enc'], (string) $row['last_dek'])['text'] : '';
            $items[] = [
                'id' => $row['id'],
                'title' => $this->crypto->decryptField((string) $row['title_encrypted'], (string) $row['title_dek']),
                'updated_at' => AppTimezone::iso8601FromUnix($row['updated_unix']),
                'last_message_preview' => $last !== '' ? mb_substr($last, 0, 120) : null,
            ];
        }

        return ['items' => $items, 'total' => (int) $count->fetchColumn()];
    }

    /** @return array{messages: list<array<string, mixed>>, has_more: bool} */
    public function messagesPage(string $conversationId, ?string $beforeId, int $limit): array
    {
        $sql = "SELECT *, UNIX_TIMESTAMP(created_at) AS created_unix FROM assistant_messages WHERE conversation_id = ? AND status = 'done'";
        $params = [$conversationId];
        if ($beforeId !== null) {
            $sql .= ' AND created_at < (SELECT created_at FROM assistant_messages WHERE id = ? AND conversation_id = ?)';
            array_push($params, $beforeId, $conversationId);
        }
        $stmt = $this->db->prepare($sql . ' ORDER BY created_at DESC, role DESC LIMIT ' . ($limit + 1));
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $hasMore = count($rows) > $limit;
        $messages = array_map(static fn (array $m): array => array_diff_key($m, ['names' => true]), array_map([$this, 'mapMessage'], array_slice($rows, 0, $limit)));

        return ['messages' => array_reverse($messages), 'has_more' => $hasMore];
    }

    public function title(array $conversation): string
    {
        return $this->crypto->decryptField((string) $conversation['title_encrypted'], (string) $conversation['title_dek']);
    }

    public function delete(string $id, string $userId): bool
    {
        $stmt = $this->db->prepare('DELETE FROM assistant_conversations WHERE id = ? AND user_id = ?');
        $stmt->execute([$id, $userId]);

        return $stmt->rowCount() > 0;
    }

    /** @return array{id: string, role: string, text: string, actions: list<array<string, mixed>>, created_at: string, names: list<array{0: string, 1: string}>} */
    private function mapMessage(array $row): array
    {
        $content = $this->decodeContent((string) $row['content_encrypted'], (string) $row['content_dek']);
        $actions = $row['actions_json'] !== null ? json_decode((string) $row['actions_json'], true) : [];

        return [
            'id' => (string) $row['id'],
            'role' => (string) $row['role'],
            'text' => $content['text'],
            'actions' => is_array($actions) ? $actions : [],
            'created_at' => AppTimezone::iso8601FromUnix($row['created_unix']),
            'names' => $content['names'],
        ];
    }

    /** @return array{text: string, names: list<array{0: string, 1: string}>} */
    private function decodeContent(string $encrypted, string $dek): array
    {
        $decoded = json_decode($this->crypto->decryptField($encrypted, $dek), true);

        return [
            'text' => is_array($decoded) ? (string) ($decoded['text'] ?? '') : '',
            'names' => is_array($decoded) && is_array($decoded['names'] ?? null) ? $decoded['names'] : [],
        ];
    }
}

<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

final class AiSearchService
{
    private PDO $db;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? ai_db();
    }

    /**
     * @return array<string, mixed>
     */
    public function search(string $userId, string $query, int $limit = 20): array
    {
        $q = trim($query);
        if ($q === '' || mb_strlen($q) < 2) {
            return ['conversations' => [], 'messages' => [], 'summaries' => []];
        }
        $like = '%' . $q . '%';

        $convStmt = $this->db->prepare('
            SELECT id, custom_title, conversation_type, last_message_at
            FROM ai_conversations
            WHERE user_id = ? AND deleted_at IS NULL
              AND (custom_title LIKE ? OR conversation_type LIKE ?)
            ORDER BY last_message_at DESC LIMIT ?
        ');
        $convStmt->bindValue(1, $userId);
        $convStmt->bindValue(2, $like);
        $convStmt->bindValue(3, $like);
        $convStmt->bindValue(4, $limit, PDO::PARAM_INT);
        $convStmt->execute();

        $msgStmt = $this->db->prepare('
            SELECT m.id, m.conversation_id, m.role, LEFT(m.content, 200) AS excerpt, m.created_at
            FROM ai_messages m
            INNER JOIN ai_conversations c ON c.id = m.conversation_id
            WHERE c.user_id = ? AND c.deleted_at IS NULL AND m.content LIKE ?
            ORDER BY m.created_at DESC LIMIT ?
        ');
        $msgStmt->bindValue(1, $userId);
        $msgStmt->bindValue(2, $like);
        $msgStmt->bindValue(3, $limit, PDO::PARAM_INT);
        $msgStmt->execute();

        $sumStmt = $this->db->prepare('
            SELECT s.id, s.conversation_id, LEFT(s.summary_text, 200) AS excerpt, s.created_at
            FROM ai_conversation_summaries s
            INNER JOIN ai_conversations c ON c.id = s.conversation_id
            WHERE c.user_id = ? AND c.deleted_at IS NULL AND s.summary_text LIKE ?
            ORDER BY s.created_at DESC LIMIT ?
        ');
        $sumStmt->bindValue(1, $userId);
        $sumStmt->bindValue(2, $like);
        $sumStmt->bindValue(3, $limit, PDO::PARAM_INT);
        $sumStmt->execute();

        return [
            'conversations' => $convStmt->fetchAll(PDO::FETCH_ASSOC) ?: [],
            'messages' => $msgStmt->fetchAll(PDO::FETCH_ASSOC) ?: [],
            'summaries' => $sumStmt->fetchAll(PDO::FETCH_ASSOC) ?: [],
        ];
    }
}

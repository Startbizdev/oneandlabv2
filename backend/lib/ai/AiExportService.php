<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/AiConversationService.php';

final class AiExportService
{
    private PDO $db;
    private AiConversationService $conversations;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? ai_db();
        $this->conversations = new AiConversationService($this->db);
    }

    /**
     * @return array<string, mixed>
     */
    public function exportForUser(string $userId): array
    {
        $convStmt = $this->db->prepare('
            SELECT * FROM ai_conversations WHERE user_id = ? ORDER BY created_at ASC
        ');
        $convStmt->execute([$userId]);
        $conversations = [];
        foreach ($convStmt->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
            $id = (string) $row['id'];
            $conversations[] = [
                'conversation' => $row,
                'messages' => $this->conversations->getMessages($id, $userId, 500),
            ];
        }
        $auditStmt = $this->db->prepare('
            SELECT id, task_type, provider, model, latency_ms, tokens_input, tokens_output, created_at
            FROM ai_audits WHERE user_id = ? ORDER BY created_at DESC LIMIT 500
        ');
        $auditStmt->execute([$userId]);

        return [
            'exported_at' => (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format(DateTimeInterface::ATOM),
            'user_id' => $userId,
            'conversations' => $conversations,
            'audits' => $auditStmt->fetchAll(PDO::FETCH_ASSOC) ?: [],
        ];
    }
}

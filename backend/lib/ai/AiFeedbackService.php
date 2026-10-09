<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/../Uuid.php';
require_once __DIR__ . '/../Validation.php';
require_once __DIR__ . '/../HttpStatusException.php';

final class AiFeedbackService
{
    private PDO $db;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? ai_db();
    }

    /**
     * @param array<string, mixed> $user
     */
    public function submit(array $user, array $input): array
    {
        $rating = (int) ($input['rating'] ?? 0);
        if ($rating < 1 || $rating > 5) {
            throw new InvalidArgumentException('rating 1–5 requis');
        }
        $conversationId = self::optionalId($input['conversation_id'] ?? null);
        $messageId = self::optionalId($input['message_id'] ?? null);
        if ($messageId !== null && $conversationId === null) {
            throw new InvalidArgumentException('conversation_id requis avec message_id');
        }
        if ($conversationId !== null) {
            $this->assertOwnsConversation((string) $user['user_id'], $conversationId, $messageId);
        }
        $id = Uuid::v4();
        $this->db->prepare('
            INSERT INTO ai_feedback (id, user_id, conversation_id, message_id, rating, comment)
            VALUES (?, ?, ?, ?, ?, ?)
        ')->execute([
            $id,
            $user['user_id'],
            $conversationId,
            $messageId,
            $rating,
            isset($input['comment']) ? mb_substr((string) $input['comment'], 0, 500) : null,
        ]);

        return ['id' => $id, 'rating' => $rating];
    }

    private function assertOwnsConversation(string $userId, string $conversationId, ?string $messageId): void
    {
        $stmt = $this->db->prepare('SELECT 1 FROM ai_conversations WHERE id = ? AND user_id = ? AND deleted_at IS NULL LIMIT 1');
        $stmt->execute([$conversationId, $userId]);
        if ($stmt->fetchColumn() === false) {
            throw HttpStatusException::notFound('Conversation introuvable');
        }
        if ($messageId === null) {
            return;
        }
        $stmt = $this->db->prepare('SELECT 1 FROM ai_messages WHERE id = ? AND conversation_id = ? LIMIT 1');
        $stmt->execute([$messageId, $conversationId]);
        if ($stmt->fetchColumn() === false) {
            throw HttpStatusException::notFound('Message introuvable');
        }
    }

    private static function optionalId(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        $id = trim((string) $value);
        if (!Validation::uuid($id)) {
            throw new InvalidArgumentException('Identifiant invalide');
        }

        return $id;
    }

    /**
     * @return array<string, mixed>
     */
    public function stats(int $days = 30): array
    {
        $stmt = $this->db->prepare('
            SELECT COUNT(*) AS total, AVG(rating) AS avg_rating,
                   SUM(CASE WHEN rating >= 4 THEN 1 ELSE 0 END) AS positive
            FROM ai_feedback WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        ');
        $stmt->execute([$days]);

        return $stmt->fetch(PDO::FETCH_ASSOC) ?: ['total' => 0, 'avg_rating' => null, 'positive' => 0];
    }
}

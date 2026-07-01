<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/../Uuid.php';

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
        $id = Uuid::v4();
        $this->db->prepare('
            INSERT INTO ai_feedback (id, user_id, conversation_id, message_id, rating, comment)
            VALUES (?, ?, ?, ?, ?, ?)
        ')->execute([
            $id,
            $user['user_id'],
            $input['conversation_id'] ?? null,
            $input['message_id'] ?? null,
            $rating,
            isset($input['comment']) ? mb_substr((string) $input['comment'], 0, 500) : null,
        ]);

        return ['id' => $id, 'rating' => $rating];
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

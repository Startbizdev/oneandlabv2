<?php

declare(strict_types=1);

require_once __DIR__ . '/HttpStatusException.php';

/**
 * Réponse unique du professionnel noté à un avis patient (web et mobile n'offrent « Répondre » que sans réponse existante).
 */
final class ReviewResponse
{
    public const MAX_LENGTH = 4000;

    public static function normalize(mixed $raw): string
    {
        if (!is_string($raw)) {
            throw new HttpStatusException('Réponse requise', 400, 'VALIDATION_ERROR');
        }
        $text = trim($raw);
        if ($text === '') {
            throw new HttpStatusException('Réponse requise', 400, 'VALIDATION_ERROR');
        }
        if (mb_strlen($text) > self::MAX_LENGTH) {
            throw new HttpStatusException('Réponse trop longue (' . self::MAX_LENGTH . ' caractères maximum)', 400, 'VALIDATION_ERROR');
        }
        return $text;
    }

    public static function save(PDO $db, string $reviewId, string $userId, mixed $raw): string
    {
        $text = self::normalize($raw);

        $stmt = $db->prepare('SELECT reviewee_id FROM reviews WHERE id = ?');
        $stmt->execute([$reviewId]);
        $revieweeId = $stmt->fetchColumn();
        if ($revieweeId === false) {
            throw HttpStatusException::notFound('Avis introuvable');
        }
        if ((string) $revieweeId !== $userId) {
            throw HttpStatusException::forbidden('Vous n\'êtes pas autorisé à répondre à cet avis');
        }

        $update = $db->prepare("
            UPDATE reviews
            SET response = ?, response_at = NOW()
            WHERE id = ? AND reviewee_id = ? AND (response IS NULL OR TRIM(response) = '')
        ");
        $update->execute([$text, $reviewId, $userId]);
        if ($update->rowCount() === 0) {
            throw HttpStatusException::conflict('Vous avez déjà répondu à cet avis', 'RESPONSE_ALREADY_EXISTS');
        }
        return $text;
    }
}

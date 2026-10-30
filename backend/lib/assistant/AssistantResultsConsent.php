<?php

declare(strict_types=1);

require_once __DIR__ . '/../AppTimezone.php';

/**
 * Accord du patient pour que l'assistant lise lui-même son dernier compte rendu d'analyses.
 * Sans accord, l'assistant ne voit que la date et le type ; un document joint à la main reste toujours lisible.
 */
final class AssistantResultsConsent
{
    public static function has(PDO $db, string $userId): bool
    {
        return self::grantedAt($db, $userId) !== null;
    }

    public static function grantedAt(PDO $db, string $userId): ?string
    {
        $stmt = $db->prepare('SELECT assistant_results_consent_at FROM profiles WHERE id = ? LIMIT 1');
        $stmt->execute([$userId]);
        $value = $stmt->fetchColumn();

        return is_string($value) && $value !== '' ? $value : null;
    }

    public static function set(PDO $db, string $userId, bool $granted): ?string
    {
        $at = $granted ? AppTimezone::now()->format('Y-m-d H:i:s') : null;
        $db->prepare('UPDATE profiles SET assistant_results_consent_at = ? WHERE id = ?')->execute([$at, $userId]);

        return $at;
    }
}

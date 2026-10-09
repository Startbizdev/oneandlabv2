<?php

declare(strict_types=1);

/**
 * Supprime définitivement les conversations Cary « supprimées » avant la suppression réelle (deleted_at renseigné).
 * Même règle que DELETE /api/ai/conversations/{id}. Par défaut : simulation ; `--apply` pour supprimer.
 */

require_once __DIR__ . '/../lib/ai/bootstrap.php';
require_once __DIR__ . '/../lib/ai/AiConversationService.php';

$apply = in_array('--apply', $argv, true);
$db = ai_db();
$rows = $db->query('
    SELECT c.id, c.user_id, p.role
    FROM ai_conversations c
    JOIN profiles p ON p.id = c.user_id
    WHERE c.deleted_at IS NOT NULL AND c.is_system = 0
')->fetchAll(PDO::FETCH_ASSOC);

echo count($rows) . " conversation(s) supprimée(s) logiquement\n";
if (!$apply) {
    echo "Simulation : relancer avec --apply pour supprimer définitivement.\n";
    exit(0);
}

$service = new AiConversationService($db);
$failures = 0;
foreach ($rows as $row) {
    try {
        $service->deletePermanently(['user_id' => (string) $row['user_id'], 'role' => (string) $row['role']], (string) $row['id']);
    } catch (Throwable $e) {
        $failures++;
        fwrite(STDERR, 'Échec ' . $row['id'] . ' : ' . $e->getMessage() . "\n");
    }
}
echo (count($rows) - $failures) . " supprimée(s), {$failures} échec(s)\n";
exit($failures > 0 ? 1 : 0);

<?php

declare(strict_types=1);

/**
 * Tests Phase 1 IA Cary (sans appel Grok réel si XAI_API_KEY absente).
 * Usage : php backend/scripts/test-ai-phase1.php
 */

require_once __DIR__ . '/../lib/ai/bootstrap.php';
require_once __DIR__ . '/../lib/ai/AiChatHelper.php';
require_once __DIR__ . '/../lib/ai/UnifiedRdvValidator.php';
require_once __DIR__ . '/../lib/ai/ContextComposer.php';

function assertTrue(bool $cond, string $msg): void
{
    if (!$cond) {
        fwrite(STDERR, "FAIL: {$msg}\n");
        exit(1);
    }
    echo "OK: {$msg}\n";
}

// booking_patch extraction
$raw = "Voici les infos.\n```booking_patch\n{\"type\":\"blood_test\",\"scheduled_at\":\"2026-06-20 10:00:00\",\"address\":{\"label\":\"Paris\",\"lat\":48.8,\"lng\":2.3}}\n```";
$extracted = AiChatHelper::extractBookingPatch($raw);
assertTrue($extracted['patch'] !== null, 'extract booking_patch');
assertTrue(($extracted['patch']['type'] ?? '') === 'blood_test', 'patch type');
assertTrue(!str_contains($extracted['content'], 'booking_patch'), 'content nettoyé');

$jsonBlock = "Ok.\n```json\n{\"type\":\"nursing\",\"category_name\":\"Pansement-plaie\",\"booking_step\":\"recap\"}\n```";
$extractedJson = AiChatHelper::extractBookingPatch($jsonBlock);
assertTrue($extractedJson['patch'] !== null, 'extract json booking patch');
assertTrue(($extractedJson['patch']['category_name'] ?? '') === 'Pansement-plaie', 'json patch category');

assertTrue(AiChatHelper::assistantSignalsRecap('Voici le recap de votre demande, vérifiez ci-dessous'), 'detect recap sans accent');
assertTrue(AiChatHelper::assistantSignalsRecap('Voici le récapitulatif — appuyez sur Valider'), 'detect récap accent');

// validate draft patient
$valid = UnifiedRdvValidator::validateDraft([
    'type' => 'blood_test',
    'form_type' => 'blood_test',
    'scheduled_at' => '2026-06-20 10:00:00',
    'address' => ['label' => 'Paris', 'lat' => 48.8, 'lng' => 2.3],
    'patient_mode' => 'self',
], 'patient', true);
assertTrue($valid['valid'] === true, 'draft patient valide');

$invalid = UnifiedRdvValidator::validateDraft(['type' => 'blood_test'], 'patient', true);
assertTrue($invalid['valid'] === false, 'draft incomplet rejeté');

// tables migrations (si BDD accessible)
try {
    $db = ai_db();
    $tables = ['ai_task_routing', 'ai_conversations', 'ai_messages', 'ai_audits', 'ai_appointment_drafts'];
    foreach ($tables as $table) {
        $stmt = $db->query("SHOW TABLES LIKE " . $db->quote($table));
        assertTrue($stmt !== false && $stmt->fetch() !== false, "table {$table} présente");
    }
} catch (Throwable $e) {
    echo "SKIP BDD: " . $e->getMessage() . "\n";
}

echo "\nPhase 1 IA — tests unitaires passés.\n";

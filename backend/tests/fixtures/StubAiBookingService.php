<?php

declare(strict_types=1);

require_once __DIR__ . '/../../lib/ai/AiBookingService.php';

/**
 * Stub booking sans MySQL pour tests orchestrateur.
 */
final class StubAiBookingService extends AiBookingService
{
    public function __construct()
    {
        // Ne pas appeler le parent (évite ai_db).
    }

    public function getDraft(string $draftId, string $userId): ?array
    {
        return null;
    }

    public function getLatestDraftForConversation(string $conversationId, string $userId): ?array
    {
        return null;
    }
}

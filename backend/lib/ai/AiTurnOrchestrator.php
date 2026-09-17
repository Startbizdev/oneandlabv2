<?php

declare(strict_types=1);

require_once __DIR__ . '/AIGateway.php';
require_once __DIR__ . '/AiBookingService.php';
require_once __DIR__ . '/AiBookingToolExecutor.php';
require_once __DIR__ . '/AiGrokToolCatalog.php';
require_once __DIR__ . '/AiChatHelper.php';
require_once __DIR__ . '/AiAssistantResponseGuard.php';
require_once __DIR__ . '/CaryContextFocus.php';
require_once __DIR__ . '/GrokProvider.php';

/**
 * Orchestrateur unique chat + vocal : Grok + tools, puis sync brouillon RDV.
 */
final class AiTurnOrchestrator
{
    public const HISTORY_LIMIT = 12;

    private AIGateway $gateway;
    private AiBookingService $booking;

    public function __construct(?AIGateway $gateway = null, ?AiBookingService $booking = null)
    {
        $this->gateway = $gateway ?? new AIGateway();
        $this->booking = $booking ?? new AiBookingService();
    }

    /**
     * @param list<array{role: string, content: string}> $messages
     * @param array<string, mixed> $context
     * @param array<string, mixed> $user
     * @return array{content: string, draft: ?array<string, mixed>, audit_id: ?string, tool_calls_count: int, guard_repaired: bool, guard_reason: ?string}
     */
    public function runTurn(
        array $user,
        array $messages,
        array $context,
        string $conversationId,
        ?string $patientId,
        string $taskType,
        ?string $draftId = null,
        ?callable $onStreamDelta = null,
        ?callable $onToolProgress = null,
    ): array {
        $draftPreview = null;
        if ($draftId !== null && $draftId !== '') {
            $draftPreview = $this->booking->getDraft($draftId, (string) $user['user_id']);
        }
        if ($draftPreview === null) {
            $draftPreview = $this->booking->getLatestDraftForConversation($conversationId, (string) $user['user_id']);
        }

        $activeIntent = (string) ($context['active_intent'] ?? CaryContextFocus::GENERAL);
        $docIntents = [CaryContextFocus::DOCUMENT, CaryContextFocus::DOCUMENT_FOLLOWUP];
        $useTools = !in_array($activeIntent, $docIntents, true)
            && $activeIntent !== CaryContextFocus::HEALTH_RECORD;

        if ($useTools) {
            $result = $this->runWithTools($user, $messages, $context, $conversationId, $patientId, $taskType, $draftPreview, $onToolProgress);
            if ($onStreamDelta !== null && ($result['content'] ?? '') !== '') {
                $chunks = self::chunkTextForStream((string) $result['content']);
                foreach ($chunks as $chunk) {
                    $onStreamDelta($chunk);
                }
            }

            return $result;
        }

        if ($onStreamDelta !== null) {
            $result = $this->gateway->chatStream(
                $user,
                $messages,
                $onStreamDelta,
                $taskType,
                $context,
                $conversationId,
                $patientId,
            );
        } else {
            $result = $this->gateway->chat(
                $user,
                $messages,
                $taskType,
                $context,
                $conversationId,
                $patientId,
            );
        }

        $extracted = AiChatHelper::extractBookingPatch((string) ($result['content'] ?? ''));
        $draft = $this->syncDraftFromPatch(
            $extracted['patch'],
            $user,
            $conversationId,
            $draftPreview,
        );

        $userMessage = self::lastUserMessage($messages);
        $guarded = AiAssistantResponseGuard::normalize($userMessage, $extracted['content'], $draft);

        return [
            'content' => $guarded['text'],
            'draft' => $draft,
            'audit_id' => $result['audit_id'] ?? null,
            'tool_calls_count' => 0,
            'guard_repaired' => $guarded['repaired'],
            'guard_reason' => $guarded['reason'],
        ];
    }

    /**
     * @return list<string>
     */
    private static function chunkTextForStream(string $text): array
    {
        if ($text === '') {
            return [];
        }
        if (mb_strlen($text) <= 120) {
            return [$text];
        }
        $parts = preg_split('/(?<=[.!?…])\s+/u', $text) ?: [$text];
        $chunks = [];
        $buf = '';
        foreach ($parts as $part) {
            if ($buf === '') {
                $buf = $part;
                continue;
            }
            if (mb_strlen($buf . ' ' . $part) > 160) {
                $chunks[] = trim($buf);
                $buf = $part;
            } else {
                $buf .= ' ' . $part;
            }
        }
        if (trim($buf) !== '') {
            $chunks[] = trim($buf);
        }

        return $chunks !== [] ? $chunks : [$text];
    }

    /**
     * @param list<array{role: string, content: string}> $messages
     */
    private static function lastUserMessage(array $messages): string
    {
        for ($i = count($messages) - 1; $i >= 0; $i--) {
            if (($messages[$i]['role'] ?? '') === 'user') {
                return (string) ($messages[$i]['content'] ?? '');
            }
        }

        return '';
    }

    /**
     * @param list<array{role: string, content: string}> $messages
     * @param array<string, mixed> $context
     * @param array<string, mixed>|null $draftPreview
     * @return array{content: string, draft: ?array<string, mixed>, audit_id: ?string, tool_calls_count: int, guard_repaired: bool, guard_reason: ?string}
     */
    private function runWithTools(
        array $user,
        array $messages,
        array $context,
        string $conversationId,
        ?string $patientId,
        string $taskType,
        ?array $draftPreview,
        ?callable $onToolProgress = null,
    ): array {
        if ($onToolProgress !== null) {
            $onToolProgress('tool_started', ['phase' => 'thinking']);
        }

        $result = $this->gateway->chatWithTools(
            $user,
            $messages,
            $taskType,
            $context,
            $conversationId,
            $patientId,
            $draftPreview,
        );

        if ($onToolProgress !== null) {
            $onToolProgress('tool_completed', [
                'tool_calls_count' => (int) ($result['tool_calls_count'] ?? 0),
                'draft_updated' => ($result['draft'] ?? null) !== null,
            ]);
        }

        $userMessage = self::lastUserMessage($messages);
        $raw = AiChatHelper::sanitizeVisibleAssistantText(trim((string) ($result['content'] ?? '')));
        $guarded = AiAssistantResponseGuard::normalize($userMessage, $raw, $result['draft'] ?? null);

        return [
            'content' => $guarded['text'],
            'draft' => $result['draft'] ?? null,
            'audit_id' => $result['audit_id'] ?? null,
            'tool_calls_count' => (int) ($result['tool_calls_count'] ?? 0),
            'guard_repaired' => $guarded['repaired'],
            'guard_reason' => $guarded['reason'],
        ];
    }

    /**
     * @param array<string, mixed>|null $patch
     * @param array<string, mixed>|null $existingDraft
     * @return array<string, mixed>|null
     */
    private function syncDraftFromPatch(
        ?array $patch,
        array $user,
        string $conversationId,
        ?array $existingDraft,
    ): ?array {
        if ($patch === null || !$this->patchHasSignal($patch)) {
            return is_array($existingDraft) && in_array($existingDraft['status'] ?? '', ['collecting', 'ready'], true)
                ? $existingDraft
                : null;
        }

        $draftId = is_array($existingDraft) ? (string) ($existingDraft['id'] ?? '') : '';
        if ($draftId !== '') {
            $updated = $this->booking->patchDraft($draftId, $user, $patch, null);

            return $updated ?? $existingDraft;
        }

        try {
            return $this->booking->createDraft($user, [
                'conversation_id' => $conversationId,
                'payload' => $patch,
                'user_message' => null,
            ]);
        } catch (InvalidArgumentException) {
            return is_array($existingDraft) ? $existingDraft : null;
        }
    }

    /**
     * @param array<string, mixed> $patch
     */
    private function patchHasSignal(array $patch): bool
    {
        if ($patch === []) {
            return false;
        }

        foreach ($patch as $value) {
            if ($value !== null && $value !== '' && $value !== []) {
                return true;
            }
        }

        return false;
    }
}

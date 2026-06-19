<?php

declare(strict_types=1);

require_once __DIR__ . '/AIGateway.php';
require_once __DIR__ . '/AiBookingService.php';
require_once __DIR__ . '/AiChatHelper.php';
require_once __DIR__ . '/AiConversationService.php';
require_once __DIR__ . '/ContextComposer.php';
require_once __DIR__ . '/bootstrap.php';

final class AiChatService
{
    private AiConversationService $conversations;
    private AIGateway $gateway;
    private ContextComposer $composer;
    private AiBookingService $booking;

    public function __construct()
    {
        $this->conversations = new AiConversationService();
        $this->gateway = new AIGateway();
        $this->composer = new ContextComposer();
        $this->booking = new AiBookingService();
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function handleMessage(array $user, array $input, ?callable $onStreamDelta = null): array
    {
        $conversationId = trim((string) ($input['conversation_id'] ?? ''));
        $message = trim((string) ($input['message'] ?? ''));
        if ($conversationId === '' || $message === '') {
            throw new InvalidArgumentException('conversation_id et message requis');
        }

        $conv = $this->conversations->getById($conversationId, (string) $user['user_id']);
        if (!$conv) {
            throw new RuntimeException('Conversation introuvable');
        }

        $patientId = isset($conv['patient_id']) ? (string) $conv['patient_id'] : null;
        $context = $this->composer->compose($user, $patientId, (string) ($conv['conversation_type'] ?? 'general'), true);
        $context['disclaimer'] = $this->gateway->getDisclaimerPublic();

        $history = $this->conversations->getMessages($conversationId, (string) $user['user_id'], 12);
        $messages = [];
        foreach ($history as $msg) {
            if (($msg['role'] ?? '') === 'system') {
                continue;
            }
            $messages[] = ['role' => (string) $msg['role'], 'content' => (string) $msg['content']];
        }
        $messages[] = ['role' => 'user', 'content' => $message];

        $this->conversations->addMessage($conversationId, 'user', $message);

        $draftId = isset($input['draft_id']) ? trim((string) $input['draft_id']) : null;
        if ($draftId === '') {
            $draftId = null;
        }
        if ($draftId === null) {
            $existing = $this->booking->getLatestDraftForConversation($conversationId, (string) $user['user_id']);
            if ($existing) {
                $draftId = (string) ($existing['id'] ?? '');
            }
        }
        $draftId = $this->sanitizeDraftId($draftId, (string) $user['user_id']);

        if ($onStreamDelta !== null) {
            $result = $this->gateway->chatStream(
                $user,
                $messages,
                $onStreamDelta,
                'chat_simple',
                $context,
                $conversationId,
                $patientId
            );
        } else {
            $result = $this->gateway->chat(
                $user,
                $messages,
                'chat_simple',
                $context,
                $conversationId,
                $patientId
            );
        }

        $extracted = AiChatHelper::extractBookingPatch($result['content']);
        $assistantContent = $extracted['content'];
        $draft = null;

        if ($extracted['patch'] !== null) {
            if ($draftId) {
                $draft = $this->booking->patchDraft($draftId, $user, $extracted['patch'], $message);
            }
            if ($draft === null) {
                $draft = $this->booking->createDraft($user, [
                    'conversation_id' => $conversationId,
                    'payload' => $extracted['patch'],
                    'user_message' => $message,
                ]);
                $draftId = (string) ($draft['id'] ?? '');
            }
        }

        $draft = $this->finalizeDraftForResponse(
            $draft,
            $draftId,
            $conversationId,
            $user,
            $assistantContent,
            $message,
        );

        $metadata = [
            'audit_id' => $result['audit_id'] ?? null,
            'disclaimer' => $context['disclaimer'],
        ];
        if ($draft) {
            $metadata['draft'] = $draft;
        }

        $assistantMsg = $this->conversations->addMessage($conversationId, 'assistant', $assistantContent, $metadata);

        $updatedConv = $this->conversations->maybeAutoTitle(
            $conversationId,
            (string) $user['user_id'],
            $message,
            $conv,
            $user,
            $this->gateway,
        ) ?? $conv;

        return [
            'message' => $assistantMsg,
            'draft' => $draft,
            'disclaimer' => $context['disclaimer'],
            'audit_id' => $result['audit_id'] ?? null,
            'conversation' => $updatedConv,
        ];
    }

    /**
     * @param array<string, mixed>|null $draft
     * @param array<string, mixed> $user
     * @return array<string, mixed>|null
     */
    private function finalizeDraftForResponse(
        ?array $draft,
        ?string $draftId,
        string $conversationId,
        array $user,
        string $assistantContent,
        string $userMessage,
    ): ?array {
        if ($draft === null && $draftId !== null) {
            $draft = $this->booking->getDraft($draftId, (string) $user['user_id']);
        }
        if ($draft === null) {
            $draft = $this->booking->getLatestDraftForConversation($conversationId, (string) $user['user_id']);
        }

        if ($draft === null || !AiChatHelper::assistantSignalsRecap($assistantContent)) {
            return is_array($draft) && in_array($draft['status'] ?? '', ['collecting', 'ready'], true)
                ? $draft
                : ($this->booking->getLatestDraftForConversation($conversationId, (string) $user['user_id']) ?? null);
        }

        $id = (string) ($draft['id'] ?? '');
        if ($id === '' || !in_array($draft['status'] ?? '', ['collecting', 'ready'], true)) {
            return $this->booking->getLatestDraftForConversation($conversationId, (string) $user['user_id']);
        }

        $patched = $this->booking->patchDraft(
            $id,
            $user,
            ['booking_step' => 'recap'],
            $userMessage,
        );

        return $patched ?? $draft;
    }

    private function sanitizeDraftId(?string $draftId, string $userId): ?string
    {
        if ($draftId === null || $draftId === '') {
            return null;
        }
        $draft = $this->booking->getDraft($draftId, $userId);
        if (!$draft || !in_array($draft['status'] ?? '', ['collecting', 'ready'], true)) {
            return null;
        }

        return $draftId;
    }
}

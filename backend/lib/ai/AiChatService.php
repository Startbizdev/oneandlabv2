<?php

declare(strict_types=1);

require_once __DIR__ . '/AIGateway.php';
require_once __DIR__ . '/AiBookingService.php';
require_once __DIR__ . '/AiChatHelper.php';
require_once __DIR__ . '/AiConversationService.php';
require_once __DIR__ . '/MemoryComposer.php';
require_once __DIR__ . '/CaryContextFocus.php';
require_once __DIR__ . '/AiAttachmentService.php';
require_once __DIR__ . '/AiDocumentIntent.php';
require_once __DIR__ . '/../rag/AiDocumentJobService.php';
require_once __DIR__ . '/AiTurnOrchestrator.php';
require_once __DIR__ . '/AiBookingDraftSummary.php';
require_once __DIR__ . '/bootstrap.php';

final class AiChatService
{
    private AiConversationService $conversations;
    private AIGateway $gateway;
    private MemoryComposer $composer;
    private AiBookingService $booking;
    private AiTurnOrchestrator $orchestrator;

    public function __construct()
    {
        $this->conversations = new AiConversationService();
        $this->gateway = new AIGateway();
        $this->composer = new MemoryComposer();
        $this->booking = new AiBookingService();
        $this->orchestrator = new AiTurnOrchestrator($this->gateway, $this->booking);
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
        $resolved = $this->resolveChatAttachments($user, $conversationId, $conv, $input);
        $attachmentIds = $resolved['attachment_ids'];
        $chatAttachments = $resolved['chat_attachments'];
        $newAttachmentsInMessage = $chatAttachments !== [];

        $attachmentService = new AiAttachmentService();
        $conversationAttachmentRows = $attachmentService->listForConversation(
            $conversationId,
            (string) $user['user_id'],
        );

        if (!$newAttachmentsInMessage && $conversationAttachmentRows !== []
            && CaryContextFocus::matchesDocumentFollowUp(mb_strtolower($message))) {
            $followUpAttachments = $this->loadConversationDocumentContext(
                $user,
                $conv,
                $conversationAttachmentRows,
                $attachmentService,
            );
            if ($followUpAttachments !== []) {
                $chatAttachments = $followUpAttachments;
            }
        }

        $isDocumentIntent = $newAttachmentsInMessage
            || ($chatAttachments !== [] && CaryContextFocus::matchesDocumentFollowUp(mb_strtolower($message)));

        $draftPreview = null;
        $draftIdEarly = isset($input['draft_id']) ? trim((string) $input['draft_id']) : null;
        if ($draftIdEarly !== null && $draftIdEarly !== '') {
            $draftPreview = $this->booking->getDraft($draftIdEarly, (string) $user['user_id']);
        }
        if ($draftPreview === null) {
            $draftPreview = $this->booking->getLatestDraftForConversation($conversationId, (string) $user['user_id']);
        }

        $contextFocus = $newAttachmentsInMessage
            ? CaryContextFocus::DOCUMENT
            : ($isDocumentIntent && $chatAttachments !== []
                ? CaryContextFocus::DOCUMENT_FOLLOWUP
                : CaryContextFocus::resolve(
                    $message,
                    false,
                    $draftPreview,
                    $conversationAttachmentRows !== [],
                ));

        if ($chatAttachments !== [] && $isDocumentIntent && !$newAttachmentsInMessage) {
            $labels = array_map(
                static fn (array $a): string => (string) ($a['file_name'] ?? 'document'),
                $chatAttachments,
            );
            $message .= "\n\n[Question sur le document déjà analysé dans cette conversation : "
                . implode(', ', $labels) . ']';
        } elseif ($newAttachmentsInMessage) {
            $labels = array_map(
                static fn (array $a): string => (string) ($a['file_name'] ?? 'document'),
                $chatAttachments,
            );
            $message .= "\n\n[Document(s) joint(s) dans ce message : " . implode(', ', $labels) . ']';
        }

        $context = $this->composer->compose(
            $user,
            $patientId,
            (string) ($conv['conversation_type'] ?? 'general'),
            true,
            $message,
            $conversationId,
        );
        $context['disclaimer'] = $this->gateway->getDisclaimerPublic();
        $context['active_intent'] = $contextFocus;
        $context['active_intent_label_fr'] = CaryContextFocus::labelFr($contextFocus);

        if ($chatAttachments !== [] && $isDocumentIntent) {
            $context['chat_attachments'] = $chatAttachments;
            $context['document_context_mode'] = $newAttachmentsInMessage ? 'new_attachment' : 'conversation_followup';
        } else {
            $context['conversation_mode'] = 'text_chat';
        }

        if ($draftPreview !== null) {
            $context['active_booking_draft'] = AiBookingDraftSummary::forPrompt($draftPreview);
        }

        foreach (CaryContextFocus::suppressedContextKeys($contextFocus) as $key) {
            unset($context[$key]);
        }
        if (isset($context['app_navigation']) && is_array($context['app_navigation'])) {
            foreach (CaryContextFocus::suppressedNavigationKeys($contextFocus) as $navKey) {
                unset($context['app_navigation'][$navKey]);
            }
        }

        $history = $this->conversations->getMessages(
            $conversationId,
            (string) $user['user_id'],
            AiTurnOrchestrator::HISTORY_LIMIT,
        );
        $messages = [];
        foreach ($history as $msg) {
            if (($msg['role'] ?? '') === 'system') {
                continue;
            }
            $messages[] = ['role' => (string) $msg['role'], 'content' => (string) $msg['content']];
        }
        $messages[] = ['role' => 'user', 'content' => $message];

        $userMetadata = $this->buildUserMessageAttachmentMetadata($chatAttachments);
        $userMsg = $this->conversations->addMessage(
            $conversationId,
            'user',
            $message,
            $userMetadata,
        );
        if ($userMetadata !== null && $medicalIds = array_values(array_filter(array_map(
            static fn (array $a): string => trim((string) ($a['medical_document_id'] ?? '')),
            $chatAttachments,
        )))) {
            try {
                $attachmentService->linkAttachmentsToMessage(
                    $conversationId,
                    (string) ($userMsg['id'] ?? ''),
                    $medicalIds,
                );
            } catch (Throwable $e) {
                error_log('AiChatService linkAttachmentsToMessage: ' . $e->getMessage());
            }
        }

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

        $taskType = $this->resolveTaskType($conv, $attachmentIds, $isDocumentIntent ? $chatAttachments : []);
        $turn = $this->orchestrator->runTurn(
            $user,
            $messages,
            $context,
            $conversationId,
            $patientId,
            $taskType,
            $draftId,
            $onStreamDelta,
        );

        $assistantContent = $turn['content'];
        $draft = $turn['draft'];
        if ($draft !== null) {
            $draftId = (string) ($draft['id'] ?? $draftId ?? '');
        }
        $result = ['audit_id' => $turn['audit_id']];

        $metadata = [
            'audit_id' => $result['audit_id'] ?? null,
            'disclaimer' => $context['disclaimer'],
        ];
        if (!empty($context['citation_refs']) && is_array($context['citation_refs'])) {
            $metadata['citation_refs'] = $context['citation_refs'];
        }
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

    /**
     * @param array<string, mixed> $conv
     * @param array<string, mixed> $input
     * @return array{attachment_ids: list<string>, chat_attachments: list<array<string, mixed>>}
     */
    private function resolveChatAttachments(
        array $user,
        string $conversationId,
        array $conv,
        array $input,
    ): array {
        $attachmentIds = [];
        $rawIds = $input['attachment_ids'] ?? [];
        if (is_array($rawIds)) {
            foreach ($rawIds as $id) {
                $id = trim((string) $id);
                if ($id !== '') {
                    $attachmentIds[] = $id;
                }
            }
        }

        $medicalIds = $input['medical_document_ids'] ?? [];
        if (!is_array($medicalIds)) {
            $medicalIds = [];
        }

        $attachmentService = new AiAttachmentService();
        $docJobs = new AiDocumentJobService();
        $chatAttachments = [];

        foreach ($medicalIds as $medicalDocumentId) {
            $medicalDocumentId = trim((string) $medicalDocumentId);
            if ($medicalDocumentId === '') {
                continue;
            }

            $meta = ['medical_document_id' => $medicalDocumentId];
            $docRow = $attachmentService->getDocumentRow($medicalDocumentId);
            try {
                $attached = $attachmentService->attachToConversation($user, $conversationId, [
                    'medical_document_id' => $medicalDocumentId,
                ]);
                $attachmentIds[] = (string) ($attached['id'] ?? '');
                $meta = array_merge($meta, $attached);
            } catch (Throwable $e) {
                error_log('AiChatService attach: ' . $e->getMessage());
            }

            $patientId = (string) ($docRow['patient_id'] ?? $conv['patient_id'] ?? $user['user_id'] ?? '');
            if ($patientId === '') {
                $patientId = (string) ($user['user_id'] ?? '');
            }

            $excerpt = '';
            $analysisTitle = (string) ($docRow['file_name'] ?? 'document');
            $analysisReady = false;
            try {
                $analysis = $docJobs->ensureAnalyzed($patientId, $medicalDocumentId, 'document_analysis');
                $excerpt = trim((string) ($analysis['summary_text'] ?? ''));
                if ($excerpt === '') {
                    $excerpt = trim((string) ($analysis['ocr_text'] ?? ''));
                }
                $analysisTitle = (string) ($analysis['title'] ?? $analysisTitle);
                if ($excerpt !== '') {
                    $excerpt = mb_substr($excerpt, 0, 8000);
                }
                $analysisReady = $this->isUsefulDocumentExcerpt($excerpt);
            } catch (Throwable $e) {
                error_log('AiChatService ensureAnalyzed: ' . $e->getMessage());
            }

            $intent = AiDocumentIntent::classify($docRow ?? [], $excerpt);
            $chatAttachments[] = [
                'medical_document_id' => $medicalDocumentId,
                'file_name' => (string) ($meta['file_name'] ?? $analysisTitle),
                'attachment_type' => (string) ($meta['attachment_type'] ?? 'other'),
                'document_type' => (string) ($docRow['document_type'] ?? 'other'),
                'mime_type' => (string) ($meta['mime_type'] ?? $docRow['mime_type'] ?? ''),
                'intent_category' => $intent['category'],
                'intent_kind' => $intent['kind'],
                'intent_label_fr' => $intent['label_fr'],
                'summary_excerpt' => $excerpt,
                'analysis_ready' => $analysisReady,
            ];
        }

        return [
            'attachment_ids' => array_values(array_unique($attachmentIds)),
            'chat_attachments' => $chatAttachments,
        ];
    }

    /**
     * @param array<string, mixed> $conv
     * @param mixed $attachmentIds
     * @param list<array<string, mixed>> $chatAttachments
     */
    private function resolveTaskType(array $conv, mixed $attachmentIds, array $chatAttachments = []): string
    {
        if ($chatAttachments !== []) {
            return 'document_analysis';
        }
        if (is_array($attachmentIds) && $attachmentIds !== []) {
            return 'document_analysis';
        }
        $type = (string) ($conv['conversation_type'] ?? 'general');
        if (in_array($type, ['medical_document', 'lab_results'], true)) {
            return 'document_analysis';
        }

        return 'chat_simple';
    }

    /**
     * Recharge le dernier document de la conversation pour une question de suivi (sans re-upload).
     *
     * @param list<array<string, mixed>> $conversationAttachmentRows
     * @return list<array<string, mixed>>
     */
    private function loadConversationDocumentContext(
        array $user,
        array $conv,
        array $conversationAttachmentRows,
        AiAttachmentService $attachmentService,
    ): array {
        $seen = [];
        $recentRows = [];
        foreach (array_reverse($conversationAttachmentRows) as $row) {
            $id = (string) ($row['medical_document_id'] ?? '');
            if ($id === '' || isset($seen[$id])) {
                continue;
            }
            $seen[$id] = true;
            $recentRows[] = $row;
            if (count($recentRows) >= 2) {
                break;
            }
        }

        $chatAttachments = [];
        $docJobs = new AiDocumentJobService();
        foreach ($recentRows as $row) {
            $medicalDocumentId = (string) ($row['medical_document_id'] ?? '');
            if ($medicalDocumentId === '') {
                continue;
            }
            $docRow = $attachmentService->getDocumentRow($medicalDocumentId);
            if ($docRow === null) {
                continue;
            }
            $patientId = (string) ($docRow['patient_id'] ?? $conv['patient_id'] ?? $user['user_id'] ?? '');
            if ($patientId === '') {
                $patientId = (string) ($user['user_id'] ?? '');
            }

            $excerpt = '';
            $analysisTitle = (string) ($docRow['file_name'] ?? 'document');
            $analysisReady = false;
            try {
                $analysis = $docJobs->ensureAnalyzed($patientId, $medicalDocumentId, 'document_analysis');
                $excerpt = trim((string) ($analysis['summary_text'] ?? ''));
                if ($excerpt === '') {
                    $excerpt = trim((string) ($analysis['ocr_text'] ?? ''));
                }
                $analysisTitle = (string) ($analysis['title'] ?? $analysisTitle);
                if ($excerpt !== '') {
                    $excerpt = mb_substr($excerpt, 0, 8000);
                }
                $analysisReady = $this->isUsefulDocumentExcerpt($excerpt);
            } catch (Throwable $e) {
                error_log('AiChatService followup ensureAnalyzed: ' . $e->getMessage());
            }

            $intent = AiDocumentIntent::classify($docRow, $excerpt);
            $chatAttachments[] = [
                'medical_document_id' => $medicalDocumentId,
                'file_name' => $analysisTitle,
                'attachment_type' => (string) ($row['attachment_type'] ?? 'other'),
                'document_type' => (string) ($docRow['document_type'] ?? 'other'),
                'mime_type' => (string) ($docRow['mime_type'] ?? ''),
                'intent_category' => $intent['category'],
                'intent_kind' => $intent['kind'],
                'intent_label_fr' => $intent['label_fr'],
                'summary_excerpt' => $excerpt,
                'analysis_ready' => $analysisReady,
                'from_conversation_history' => true,
            ];
        }

        return $chatAttachments;
    }

    /**
     * @param list<array<string, mixed>> $chatAttachments
     */
    private function buildUserMessageAttachmentMetadata(array $chatAttachments): ?array
    {
        if ($chatAttachments === []) {
            return null;
        }
        $first = $chatAttachments[0];
        $medicalDocumentId = trim((string) ($first['medical_document_id'] ?? ''));
        if ($medicalDocumentId === '') {
            return null;
        }

        return [
            'attachment' => [
                'medicalDocumentId' => $medicalDocumentId,
                'fileName' => (string) ($first['file_name'] ?? 'document'),
                'mimeType' => (string) ($first['mime_type'] ?? 'application/octet-stream'),
                'documentType' => (string) ($first['document_type'] ?? 'other'),
            ],
        ];
    }

    private function isUsefulDocumentExcerpt(string $excerpt): bool
    {
        $trimmed = trim($excerpt);
        if ($trimmed === '') {
            return false;
        }
        if (str_starts_with($trimmed, 'Aucun texte extractible')) {
            return false;
        }
        if (str_contains($trimmed, 'analyse visuelle requise')) {
            return false;
        }
        if (preg_match('/(j[\'’]ai bien reçu|ne contient pas de texte lisible|photo plus nette)/ui', $trimmed)) {
            return false;
        }

        return true;
    }
}

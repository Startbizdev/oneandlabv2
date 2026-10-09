<?php

declare(strict_types=1);

require_once __DIR__ . '/AIGateway.php';
require_once __DIR__ . '/AiBookingService.php';
require_once __DIR__ . '/AiConversationService.php';
require_once __DIR__ . '/MemoryComposer.php';
require_once __DIR__ . '/CaryContextFocus.php';
require_once __DIR__ . '/AiAttachmentService.php';
require_once __DIR__ . '/AiDocumentIntent.php';
require_once __DIR__ . '/../rag/AiDocumentJobService.php';
require_once __DIR__ . '/AiTurnOrchestrator.php';
require_once __DIR__ . '/AiBookingDraftSummary.php';
require_once __DIR__ . '/AiMemoryService.php';
require_once __DIR__ . '/AiFeatureFlags.php';
require_once __DIR__ . '/AiEmergencyDetector.php';
require_once __DIR__ . '/AiSourceResolver.php';
require_once __DIR__ . '/AiStreamMarkerFilter.php';
require_once __DIR__ . '/AiSuggestionBuilder.php';
require_once __DIR__ . '/AiQuickSuggestionsService.php';
require_once __DIR__ . '/../HttpStatusException.php';
require_once __DIR__ . '/bootstrap.php';

final class AiChatService
{
    public const MAX_MESSAGE_LENGTH = 4000;
    private const MAX_DOCUMENTS_PER_MESSAGE = 5;
    /** Un message sans réponse plus vieux que ce délai est considéré comme un tour abandonné. */
    private const PENDING_REPLY_STALE_SECONDS = 180;
    private const UUID_V4 = '/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i';

    private AiConversationService $conversations;
    private AIGateway $gateway;
    private MemoryComposer $composer;
    private AiBookingService $booking;
    private AiTurnOrchestrator $orchestrator;
    private AiMemoryService $memory;
    private AiAttachmentService $attachments;

    public function __construct(?AIGateway $gateway = null, ?AiTurnOrchestrator $orchestrator = null)
    {
        $this->conversations = new AiConversationService();
        $this->gateway = $gateway ?? new AIGateway();
        $this->composer = new MemoryComposer();
        $this->booking = new AiBookingService();
        $this->memory = new AiMemoryService();
        $this->attachments = new AiAttachmentService();
        $this->orchestrator = $orchestrator ?? new AiTurnOrchestrator($this->gateway, $this->booking);
    }

    /**
     * Valide la requête (taille, client_message_id, conversation, droits sur les documents joints, réponse à régénérer)
     * sans rien écrire : permet au flux SSE de répondre en HTTP 4xx avant d'ouvrir le flux.
     *
     * @param array<string, mixed> $input
     * @return array{
     *     conversation: array<string, mixed>,
     *     message: string,
     *     client_message_id: ?string,
     *     documents: list<array<string, mixed>>,
     *     regenerate_of: ?string,
     *     regeneration: array{answer: array<string, mixed>, question: array{id: string, content: string}}|null
     * }
     */
    public function validateRequest(array $user, array $input): array
    {
        $conversationId = trim((string) ($input['conversation_id'] ?? ''));
        $regenerateOf = self::optionalUuid($input, 'regenerate_of');
        $message = trim((string) ($input['message'] ?? ''));
        if ($conversationId === '' || ($message === '' && $regenerateOf === null)) {
            throw new InvalidArgumentException('conversation_id et message requis');
        }
        if (mb_strlen($message) > self::MAX_MESSAGE_LENGTH) {
            throw new HttpStatusException(
                'Message trop long (' . self::MAX_MESSAGE_LENGTH . ' caractères maximum)',
                400,
                'AI_MESSAGE_TOO_LONG',
            );
        }
        $clientMessageId = self::optionalUuid($input, 'client_message_id');

        $conv = $this->conversations->getById($conversationId, (string) $user['user_id']);
        if (!$conv) {
            throw HttpStatusException::notFound('Conversation introuvable');
        }

        $rawIds = $input['medical_document_ids'] ?? [];
        if (!is_array($rawIds)) {
            throw new InvalidArgumentException('medical_document_ids doit être une liste');
        }
        $ids = array_values(array_unique(array_filter(array_map(
            static fn (mixed $id): string => trim((string) $id),
            $rawIds,
        ), static fn (string $id): bool => $id !== '')));
        if (count($ids) > self::MAX_DOCUMENTS_PER_MESSAGE) {
            throw new InvalidArgumentException('Au plus ' . self::MAX_DOCUMENTS_PER_MESSAGE . ' documents par message');
        }
        if ($regenerateOf !== null && $ids !== []) {
            throw new InvalidArgumentException('Une régénération reprend la question d\'origine : pas de nouveau document');
        }
        $documents = [];
        foreach ($ids as $id) {
            $documents[] = $this->attachments->requireAccessibleDocument($user, $id);
        }

        $regeneration = null;
        $alreadyReceived = $clientMessageId !== null
            && $this->conversations->findByClientMessageId($conversationId, $clientMessageId) !== null;
        if ($regenerateOf !== null && !$alreadyReceived) {
            $regeneration = $this->conversations->regenerationTarget($conversationId, $regenerateOf);
            $message = $regeneration['question']['content'];
        }

        return [
            'conversation' => $conv,
            'message' => $message,
            'client_message_id' => $clientMessageId,
            'documents' => $documents,
            'regenerate_of' => $regenerateOf,
            'regeneration' => $regeneration,
        ];
    }

    /**
     * Message normal, ou régénération de la dernière réponse (`regenerate_of`) sans nouveau message utilisateur.
     *
     * @param array<string, mixed> $input
     * @param callable(array<string, mixed>): void|null $onEmergency
     * @return array<string, mixed>
     */
    public function handleMessage(
        array $user,
        array $input,
        ?callable $onStreamDelta = null,
        ?callable $onToolProgress = null,
        ?callable $onEmergency = null,
    ): array {
        $request = $this->validateRequest($user, $input);
        $conv = $request['conversation'];
        $conversationId = (string) $conv['id'];
        $userId = (string) $user['user_id'];
        $clientMessageId = $request['client_message_id'];

        if ($clientMessageId !== null) {
            $replay = $this->replayIfAlreadyAnswered($user, $conv, $clientMessageId);
            if ($replay !== null) {
                return $replay;
            }
        }
        $requestedDraftId = trim((string) ($input['draft_id'] ?? ''));
        if ($request['regenerate_of'] !== null) {
            $target = $request['regeneration'] ?? $this->conversations->regenerationTarget($conversationId, $request['regenerate_of']);

            return $this->regenerate($user, $conv, $target, $clientMessageId, $requestedDraftId, $onStreamDelta, $onToolProgress, $onEmergency);
        }

        $emergency = AiEmergencyDetector::detect($request['message']);
        if ($emergency !== null) {
            return $this->answerEmergency($user, $conv, $request['message'], $clientMessageId, $emergency, $onEmergency);
        }

        $message = $request['message'];
        $chatAttachments = $this->attachDocuments($user, $conv, $request['documents'])['chat_attachments'];
        $attachedNow = $chatAttachments !== [];
        $conversationAttachmentRows = $this->attachments->listForConversation($conversationId, $userId);
        if (!$attachedNow && $conversationAttachmentRows !== []
            && CaryContextFocus::matchesDocumentFollowUp(mb_strtolower($message))) {
            $chatAttachments = $this->loadConversationDocumentContext($user, $conv, $conversationAttachmentRows);
        }

        $prepared = $this->prepareTurn($user, $conv, $message, $chatAttachments, $attachedNow, $conversationAttachmentRows !== [], $requestedDraftId, true);
        $history = $this->modelHistory($conversationId, $userId, []);
        $userMsg = $this->storeUserMessage(
            $user,
            $conv,
            $prepared['model_message'],
            $this->buildUserMessageAttachmentMetadata($chatAttachments),
            $clientMessageId,
        );

        try {
            if ($attachedNow) {
                $this->attachments->linkAttachmentsToMessage(
                    $conversationId,
                    (string) $userMsg['id'],
                    array_map(static fn (array $a): string => (string) $a['medical_document_id'], $chatAttachments),
                );
            }
            $answer = $this->runPreparedTurn($user, $conv, $prepared, $history, $onStreamDelta, $onToolProgress);
        } catch (Throwable $e) {
            $this->conversations->removeMessage($conversationId, (string) $userMsg['id']);
            throw $e;
        }

        $assistantMsg = $this->conversations->addMessage(
            $conversationId,
            'assistant',
            $answer['content'],
            $answer['metadata'],
            null,
            (string) $userMsg['id'],
        );
        $this->refreshConversationSummary($conversationId, $userId);

        return $this->answerResult(
            $assistantMsg,
            $answer,
            $this->conversations->maybeAutoTitle($conversationId, $userId, $request['message'], $conv) ?? $conv,
            null,
        );
    }

    /**
     * Nouvelle réponse à la même question : la question n'est pas réécrite, l'ancienne réponse n'est remplacée
     * qu'une fois la nouvelle produite (elle reste en place si le modèle échoue).
     *
     * @param array<string, mixed> $conv
     * @param array{answer: array<string, mixed>, question: array{id: string, content: string}} $target
     * @param callable(array<string, mixed>): void|null $onEmergency
     * @return array<string, mixed>
     */
    private function regenerate(
        array $user,
        array $conv,
        array $target,
        ?string $clientMessageId,
        string $requestedDraftId,
        ?callable $onStreamDelta,
        ?callable $onToolProgress,
        ?callable $onEmergency,
    ): array {
        $conversationId = (string) $conv['id'];
        $userId = (string) $user['user_id'];
        $previousId = (string) $target['answer']['id'];
        $question = $target['question'];

        $emergency = AiEmergencyDetector::detect($question['content']);
        if ($emergency !== null) {
            $disclaimer = $this->gateway->getDisclaimerPublic();
            $metadata = self::emergencyMetadata($emergency, $disclaimer) + ['regenerated_from' => $previousId];
            $assistantMsg = $this->replaceAnswer($conversationId, $previousId, AiEmergencyDetector::messageContent($emergency), $metadata, $clientMessageId, $question['id']);
            if ($onEmergency !== null) {
                $onEmergency($emergency);
            }

            return $this->emergencyResult($assistantMsg, $emergency, $disclaimer, $this->conversations->getById($conversationId, $userId) ?? $conv, $previousId);
        }

        $conversationAttachmentRows = $this->attachments->listForConversation($conversationId, $userId);
        $questionAttachments = array_values(array_filter(
            $conversationAttachmentRows,
            static fn (array $row): bool => (string) ($row['message_id'] ?? '') === $question['id'],
        ));
        $attachedToQuestion = $questionAttachments !== [];
        $chatAttachments = [];
        if ($attachedToQuestion) {
            $chatAttachments = $this->loadConversationDocumentContext($user, $conv, $questionAttachments);
        } elseif ($conversationAttachmentRows !== [] && CaryContextFocus::matchesDocumentFollowUp(mb_strtolower($question['content']))) {
            $chatAttachments = $this->loadConversationDocumentContext($user, $conv, $conversationAttachmentRows);
        }

        $prepared = $this->prepareTurn($user, $conv, $question['content'], $chatAttachments, $attachedToQuestion, $conversationAttachmentRows !== [], $requestedDraftId, false);
        $history = $this->modelHistory($conversationId, $userId, [$question['id'], $previousId]);
        $answer = $this->runPreparedTurn($user, $conv, $prepared, $history, $onStreamDelta, $onToolProgress);
        $answer['metadata']['regenerated_from'] = $previousId;
        $assistantMsg = $this->replaceAnswer($conversationId, $previousId, $answer['content'], $answer['metadata'], $clientMessageId, $question['id']);
        $this->refreshConversationSummary($conversationId, $userId);

        return $this->answerResult($assistantMsg, $answer, $this->conversations->getById($conversationId, $userId) ?? $conv, $previousId);
    }

    /**
     * Contexte du tour (focus, documents, brouillon) et message tel qu'envoyé au modèle.
     *
     * @param array<string, mixed> $conv
     * @param list<array<string, mixed>> $chatAttachments
     * @return array{
     *     model_message: string,
     *     context: array<string, mixed>,
     *     prompt_context: array<string, mixed>,
     *     focus: string,
     *     document_attachments: list<array<string, mixed>>,
     *     draft_id: ?string,
     *     patient_id: ?string,
     *     task_type: string
     * }
     */
    private function prepareTurn(
        array $user,
        array $conv,
        string $message,
        array $chatAttachments,
        bool $attachedToMessage,
        bool $hasConversationAttachments,
        string $requestedDraftId,
        bool $labelDocuments,
    ): array {
        $conversationId = (string) $conv['id'];
        $userId = (string) $user['user_id'];
        $patientId = isset($conv['patient_id']) ? (string) $conv['patient_id'] : null;
        $isDocumentIntent = $attachedToMessage
            || ($chatAttachments !== [] && CaryContextFocus::matchesDocumentFollowUp(mb_strtolower($message)));

        $draftPreview = $requestedDraftId !== '' ? $this->booking->getDraft($requestedDraftId, $userId) : null;
        if ($draftPreview === null) {
            $draftPreview = $this->booking->getLatestDraftForConversation($conversationId, $userId);
        }

        $contextFocus = $attachedToMessage
            ? CaryContextFocus::DOCUMENT
            : ($isDocumentIntent
                ? CaryContextFocus::DOCUMENT_FOLLOWUP
                : CaryContextFocus::resolve($message, false, $draftPreview, $hasConversationAttachments));

        if ($isDocumentIntent && $labelDocuments) {
            $labels = implode(', ', array_map(
                static fn (array $a): string => (string) ($a['file_name'] ?? 'document'),
                $chatAttachments,
            ));
            $message .= $attachedToMessage
                ? "\n\n[Document(s) joint(s) dans ce message : " . $labels . ']'
                : "\n\n[Question sur le document déjà analysé dans cette conversation : " . $labels . ']';
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
        if ($isDocumentIntent) {
            $context['chat_attachments'] = $chatAttachments;
            $context['document_context_mode'] = $attachedToMessage ? 'new_attachment' : 'conversation_followup';
        } else {
            $context['conversation_mode'] = 'text_chat';
        }
        if ($draftPreview !== null) {
            $context['active_booking_draft'] = AiBookingDraftSummary::forPrompt($draftPreview);
        }
        $documentAttachments = $isDocumentIntent ? $chatAttachments : [];

        return [
            'model_message' => $message,
            'context' => $context,
            'prompt_context' => CaryContextFocus::minimizeContext($context, $contextFocus),
            'focus' => $contextFocus,
            'document_attachments' => $documentAttachments,
            'draft_id' => $this->sanitizeDraftId(
                $requestedDraftId !== '' ? $requestedDraftId : (isset($draftPreview['id']) ? (string) $draftPreview['id'] : null),
                $userId,
            ),
            'patient_id' => $patientId,
            'task_type' => $this->resolveTaskType($conv, $documentAttachments),
        ];
    }

    /**
     * Appel modèle (outils compris), sources citées et suggestions de la réponse.
     *
     * @param array<string, mixed> $conv
     * @param array<string, mixed> $prepared
     * @param list<array{role: string, content: string}> $history
     * @return array{turn: array<string, mixed>, content: string, metadata: array<string, mixed>, draft: mixed, suggestions: list<mixed>}
     */
    private function runPreparedTurn(
        array $user,
        array $conv,
        array $prepared,
        array $history,
        ?callable $onStreamDelta,
        ?callable $onToolProgress,
    ): array {
        $messages = $history;
        $messages[] = ['role' => 'user', 'content' => $prepared['model_message']];
        $streamFilter = $onStreamDelta !== null ? new AiStreamMarkerFilter($onStreamDelta) : null;
        $turn = $this->orchestrator->runTurn(
            $user,
            $messages,
            $prepared['prompt_context'],
            (string) $conv['id'],
            $prepared['patient_id'],
            $prepared['task_type'],
            $prepared['draft_id'],
            $streamFilter !== null ? $streamFilter->push(...) : null,
            $onToolProgress,
        );
        $streamFilter?->flush();

        $context = $prepared['context'];
        $draft = $turn['draft'];
        $cited = (new AiSourceResolver(ai_db()))->resolve(
            (string) $turn['content'],
            is_array($context['rag_chunks'] ?? null) ? $context['rag_chunks'] : [],
            $prepared['document_attachments'],
        );
        $suggestions = (new AiSuggestionBuilder(new AiQuickSuggestionsService()))
            ->build($user, $prepared['focus'], $context, $draft);

        $metadata = [
            'audit_id' => $turn['audit_id'],
            'disclaimer' => $context['disclaimer'],
            'sources' => $cited['sources'],
            'suggestions' => $suggestions,
        ];
        if ($draft) {
            $metadata['draft'] = $draft;
        }

        return ['turn' => $turn, 'content' => $cited['content'], 'metadata' => $metadata, 'draft' => $draft, 'suggestions' => $suggestions];
    }

    /**
     * @param array<string, mixed> $assistantMsg
     * @param array{turn: array<string, mixed>, metadata: array<string, mixed>, draft: mixed, suggestions: list<mixed>} $answer
     * @param array<string, mixed> $conversation
     * @return array<string, mixed>
     */
    private function answerResult(array $assistantMsg, array $answer, array $conversation, ?string $replacedMessageId): array
    {
        return [
            'message' => $assistantMsg,
            'draft' => $answer['draft'],
            'disclaimer' => $answer['metadata']['disclaimer'],
            'audit_id' => $answer['turn']['audit_id'],
            'conversation' => $conversation,
            'emergency' => null,
            'suggestions' => $answer['suggestions'],
            'deduplicated' => false,
            'replaced_message_id' => $replacedMessageId,
        ];
    }

    private function refreshConversationSummary(string $conversationId, string $userId): void
    {
        if (AiFeatureFlags::isEnabled('memory_summary')) {
            $this->memory->refreshConversationSummaryIfNeeded(
                $conversationId,
                $this->conversations->getMessages($conversationId, $userId, 200),
                AiTurnOrchestrator::HISTORY_LIMIT,
            );
        }
    }

    /**
     * @param array<string, mixed> $metadata
     * @return array<string, mixed>
     */
    private function replaceAnswer(
        string $conversationId,
        string $previousId,
        string $content,
        array $metadata,
        ?string $clientMessageId,
        string $questionId,
    ): array {
        try {
            return $this->conversations->replaceLastAnswer($conversationId, $previousId, $content, $metadata, $clientMessageId, $questionId);
        } catch (PDOException $e) {
            if ($clientMessageId === null || (int) ($e->errorInfo[1] ?? 0) !== 1062) {
                throw $e;
            }
            throw new HttpStatusException('Ce message est encore en cours de traitement.', 409, 'AI_MESSAGE_IN_PROGRESS');
        }
    }

    /**
     * Rejoue la réponse déjà produite pour ce client_message_id (aucun appel modèle).
     * Tour encore en cours : 409 ; tour abandonné : le message orphelin est retiré et le tour est rejoué.
     *
     * @param array<string, mixed> $conv
     * @return array<string, mixed>|null
     */
    private function replayIfAlreadyAnswered(array $user, array $conv, string $clientMessageId): ?array
    {
        $conversationId = (string) $conv['id'];
        $known = $this->conversations->findByClientMessageId($conversationId, $clientMessageId);
        if ($known === null) {
            return null;
        }
        if (($known['message']['role'] ?? '') === 'assistant') {
            return $this->replayResult($user, $conv, $known['message']);
        }
        $userMessageId = (string) $known['message']['id'];
        $reply = $this->conversations->findReplyTo($conversationId, $userMessageId);
        if ($reply !== null) {
            return $this->replayResult($user, $conv, $reply);
        }
        if ($known['age_seconds'] < self::PENDING_REPLY_STALE_SECONDS) {
            throw new HttpStatusException('Ce message est encore en cours de traitement.', 409, 'AI_MESSAGE_IN_PROGRESS');
        }
        $this->conversations->removeMessage($conversationId, $userMessageId);

        return null;
    }

    /**
     * @param array<string, mixed> $conv
     * @param array<string, mixed> $assistantMsg
     * @return array<string, mixed>
     */
    private function replayResult(array $user, array $conv, array $assistantMsg): array
    {
        $metadata = is_array($assistantMsg['metadata'] ?? null) ? $assistantMsg['metadata'] : [];
        $draftId = is_array($metadata['draft'] ?? null) ? (string) ($metadata['draft']['id'] ?? '') : '';
        $draft = $draftId !== '' ? $this->booking->getDraft($draftId, (string) $user['user_id']) : null;

        return [
            'message' => $assistantMsg,
            'draft' => $draft,
            'disclaimer' => (string) ($metadata['disclaimer'] ?? $this->gateway->getDisclaimerPublic()),
            'audit_id' => $metadata['audit_id'] ?? null,
            'conversation' => $this->conversations->getById((string) $conv['id'], (string) $user['user_id']) ?? $conv,
            'emergency' => is_array($metadata['emergency'] ?? null) ? $metadata['emergency'] : null,
            'suggestions' => is_array($metadata['suggestions'] ?? null) ? array_values($metadata['suggestions']) : [],
            'deduplicated' => true,
            'replaced_message_id' => isset($metadata['regenerated_from']) ? (string) $metadata['regenerated_from'] : null,
        ];
    }

    /**
     * Signe d'urgence vitale : réponse fixe et numéros d'urgence, sans appel au modèle.
     *
     * @param array<string, mixed> $conv
     * @param array{kind: string, title: string, body: string, actions: list<array{label: string, phone: string}>} $emergency
     * @return array<string, mixed>
     */
    private function answerEmergency(
        array $user,
        array $conv,
        string $message,
        ?string $clientMessageId,
        array $emergency,
        ?callable $onEmergency,
    ): array {
        $conversationId = (string) $conv['id'];
        $userId = (string) $user['user_id'];
        $userMsg = $this->storeUserMessage($user, $conv, $message, null, $clientMessageId);
        $disclaimer = $this->gateway->getDisclaimerPublic();
        $assistantMsg = $this->conversations->addMessage(
            $conversationId,
            'assistant',
            AiEmergencyDetector::messageContent($emergency),
            self::emergencyMetadata($emergency, $disclaimer),
            null,
            (string) $userMsg['id'],
        );
        if ($onEmergency !== null) {
            $onEmergency($emergency);
        }

        return $this->emergencyResult(
            $assistantMsg,
            $emergency,
            $disclaimer,
            $this->conversations->maybeAutoTitle($conversationId, $userId, $message, $conv) ?? $conv,
            null,
        );
    }

    /**
     * @param array<string, mixed> $emergency
     * @return array<string, mixed>
     */
    private static function emergencyMetadata(array $emergency, string $disclaimer): array
    {
        return ['audit_id' => null, 'disclaimer' => $disclaimer, 'emergency' => $emergency, 'sources' => [], 'suggestions' => []];
    }

    /**
     * @param array<string, mixed> $assistantMsg
     * @param array<string, mixed> $emergency
     * @param array<string, mixed> $conversation
     * @return array<string, mixed>
     */
    private function emergencyResult(array $assistantMsg, array $emergency, string $disclaimer, array $conversation, ?string $replacedMessageId): array
    {
        return [
            'message' => $assistantMsg,
            'draft' => null,
            'disclaimer' => $disclaimer,
            'audit_id' => null,
            'conversation' => $conversation,
            'emergency' => $emergency,
            'suggestions' => [],
            'deduplicated' => false,
            'replaced_message_id' => $replacedMessageId,
        ];
    }

    /**
     * Enregistre le message utilisateur ; une insertion concurrente du même client_message_id
     * est traitée comme un renvoi (409 tant que le premier tour n'a pas répondu).
     *
     * @param array<string, mixed> $conv
     * @param array<string, mixed>|null $metadata
     * @return array<string, mixed>
     */
    private function storeUserMessage(array $user, array $conv, string $message, ?array $metadata, ?string $clientMessageId): array
    {
        try {
            return $this->conversations->addMessage((string) $conv['id'], 'user', $message, $metadata, $clientMessageId);
        } catch (PDOException $e) {
            if ($clientMessageId === null || (int) ($e->errorInfo[1] ?? 0) !== 1062) {
                throw $e;
            }
            throw new HttpStatusException('Ce message est encore en cours de traitement.', 409, 'AI_MESSAGE_IN_PROGRESS');
        }
    }

    /**
     * Historique envoyé au modèle : sans messages système, transcriptions vocales non vérifiées ni messages exclus.
     *
     * @param list<string> $excludedIds
     * @return list<array{role: string, content: string}>
     */
    private function modelHistory(string $conversationId, string $userId, array $excludedIds): array
    {
        $messages = [];
        foreach ($this->conversations->getMessages($conversationId, $userId, AiTurnOrchestrator::HISTORY_LIMIT) as $msg) {
            $role = (string) ($msg['role'] ?? '');
            if (!in_array($role, ['user', 'assistant'], true) || !empty($msg['metadata']['unverified'])
                || in_array((string) $msg['id'], $excludedIds, true)) {
                continue;
            }
            $messages[] = ['role' => $role, 'content' => (string) $msg['content']];
        }

        return $messages;
    }

    /** @param array<string, mixed> $input */
    private static function optionalUuid(array $input, string $key): ?string
    {
        if (!array_key_exists($key, $input) || $input[$key] === null) {
            return null;
        }
        $value = is_string($input[$key]) ? strtolower(trim($input[$key])) : '';
        if (preg_match(self::UUID_V4, $value) !== 1) {
            throw new InvalidArgumentException($key . ' doit être un UUID v4');
        }

        return $value;
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
     * Rattache à la conversation les documents déjà autorisés par validateRequest puis prépare leur extrait.
     *
     * @param array<string, mixed> $conv
     * @param list<array<string, mixed>> $documents
     * @return array{chat_attachments: list<array<string, mixed>>}
     */
    private function attachDocuments(array $user, array $conv, array $documents): array
    {
        $chatAttachments = [];
        foreach ($documents as $docRow) {
            $attached = $this->attachments->attachToConversation($user, (string) $conv['id'], [
                'medical_document_id' => (string) $docRow['id'],
            ]);
            $chatAttachments[] = $this->buildChatAttachment($user, $conv, $docRow, [
                'file_name' => $attached['file_name'] ?? null,
                'attachment_type' => (string) ($attached['attachment_type'] ?? 'other'),
                'mime_type' => $attached['mime_type'] ?? null,
            ]);
        }

        return ['chat_attachments' => $chatAttachments];
    }

    /**
     * @param array<string, mixed> $conv
     * @param list<array<string, mixed>> $chatAttachments
     */
    private function resolveTaskType(array $conv, array $chatAttachments): string
    {
        if ($chatAttachments !== []) {
            return 'document_analysis';
        }
        $type = (string) ($conv['conversation_type'] ?? 'general');
        if (in_array($type, ['medical_document', 'lab_results'], true)) {
            return 'document_analysis';
        }

        return 'chat_simple';
    }

    /**
     * Recharge les deux derniers documents de la conversation pour une question de suivi, en revérifiant
     * le droit d'accès (il a pu être retiré depuis le rattachement).
     *
     * @param array<string, mixed> $conv
     * @param list<array<string, mixed>> $conversationAttachmentRows
     * @return list<array<string, mixed>>
     */
    private function loadConversationDocumentContext(array $user, array $conv, array $conversationAttachmentRows): array
    {
        $seen = [];
        $chatAttachments = [];
        foreach (array_reverse($conversationAttachmentRows) as $row) {
            $id = (string) ($row['medical_document_id'] ?? '');
            if ($id === '' || isset($seen[$id])) {
                continue;
            }
            $seen[$id] = true;
            try {
                $docRow = $this->attachments->requireAccessibleDocument($user, $id);
            } catch (HttpStatusException $e) {
                error_log('AiChatService document de conversation ignoré (' . $id . ') : ' . $e->getMessage());
                continue;
            }
            $attachment = $this->buildChatAttachment($user, $conv, $docRow, [
                'attachment_type' => (string) ($row['attachment_type'] ?? 'other'),
            ]);
            $attachment['from_conversation_history'] = true;
            $chatAttachments[] = $attachment;
            if (count($chatAttachments) >= 2) {
                break;
            }
        }

        return $chatAttachments;
    }

    /**
     * @param array<string, mixed> $conv
     * @param array<string, mixed> $docRow document déjà autorisé
     * @param array{file_name?: mixed, attachment_type: string, mime_type?: mixed} $attachmentMeta
     * @return array<string, mixed>
     */
    private function buildChatAttachment(array $user, array $conv, array $docRow, array $attachmentMeta): array
    {
        $medicalDocumentId = (string) $docRow['id'];
        $patientId = (string) ($docRow['patient_id'] ?? $conv['patient_id'] ?? $user['user_id']);
        $excerpt = '';
        $analysisTitle = (string) ($docRow['file_name'] ?? 'document');
        try {
            $analysis = (new AiDocumentJobService())->ensureAnalyzed($patientId, $medicalDocumentId, 'document_analysis');
            $excerpt = trim((string) ($analysis['summary_text'] ?? ''));
            if ($excerpt === '') {
                $excerpt = trim((string) ($analysis['ocr_text'] ?? ''));
            }
            $excerpt = mb_substr($excerpt, 0, 8000);
            $analysisTitle = (string) ($analysis['title'] ?? $analysisTitle);
        } catch (Throwable $e) {
            error_log('AiChatService analyse document ' . $medicalDocumentId . ' : ' . $e->getMessage());
        }

        $intent = AiDocumentIntent::classify($docRow, $excerpt);
        $fileName = trim((string) ($attachmentMeta['file_name'] ?? ''));

        return [
            'medical_document_id' => $medicalDocumentId,
            'file_name' => $fileName !== '' ? $fileName : $analysisTitle,
            'attachment_type' => $attachmentMeta['attachment_type'],
            'document_type' => (string) ($docRow['document_type'] ?? 'other'),
            'mime_type' => (string) ($attachmentMeta['mime_type'] ?? $docRow['mime_type'] ?? ''),
            'intent_category' => $intent['category'],
            'intent_kind' => $intent['kind'],
            'intent_label_fr' => $intent['label_fr'],
            'summary_excerpt' => $excerpt,
            'analysis_ready' => $this->isUsefulDocumentExcerpt($excerpt),
        ];
    }

    /**
     * @param list<array<string, mixed>> $chatAttachments
     */
    private function buildUserMessageAttachmentMetadata(array $chatAttachments): ?array
    {
        if ($chatAttachments === [] || !empty($chatAttachments[0]['from_conversation_history'])) {
            return null;
        }
        $first = $chatAttachments[0];

        return [
            'attachment' => [
                'medicalDocumentId' => (string) $first['medical_document_id'],
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

<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/VoiceService.php';
require_once __DIR__ . '/VoiceRealtimeConfig.php';
require_once __DIR__ . '/VoiceRealtimeTokenService.php';
require_once __DIR__ . '/VoiceRealtimePromptBuilder.php';
require_once __DIR__ . '/AiGrokRealtimeToolCatalog.php';
require_once __DIR__ . '/AiBookingToolExecutor.php';
require_once __DIR__ . '/AiBookingService.php';
require_once __DIR__ . '/AiConversationService.php';
require_once __DIR__ . '/../rag/RagSearchService.php';
require_once __DIR__ . '/AiVoiceMessageSignals.php';
require_once __DIR__ . '/AiAssistantResponseGuard.php';
require_once __DIR__ . '/AiChatRateLimit.php';
require_once __DIR__ . '/AiChatService.php';
require_once __DIR__ . '/AiEmergencyDetector.php';
require_once __DIR__ . '/../DatabaseTransaction.php';
require_once __DIR__ . '/../HttpStatusException.php';
require_once __DIR__ . '/../Uuid.php';

/**
 * Orchestration voix temps réel : jetons, outils, sync événements.
 */
final class VoiceRealtimeService
{
    private PDO $db;
    private VoiceService $voice;
    private VoiceRealtimeTokenService $tokens;
    private VoiceRealtimePromptBuilder $prompts;
    private AiConversationService $conversations;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? ai_db();
        $this->voice = new VoiceService($this->db);
        $this->tokens = new VoiceRealtimeTokenService();
        $this->prompts = new VoiceRealtimePromptBuilder();
        $this->conversations = new AiConversationService($this->db);
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function startRealtime(array $user, array $input): array
    {
        $userId = (string) ($user['user_id'] ?? '');
        if (!VoiceRealtimeConfig::isAllowedForUser($userId)) {
            throw HttpStatusException::forbidden('Voix temps réel indisponible pour ce compte');
        }
        AiChatRateLimit::assertAllowed($user, 'voice_session');

        $requestedLocale = $input['locale'] ?? 'fr';
        $locale = in_array($requestedLocale, ['fr', 'en', 'ar', 'es'], true) ? $requestedLocale : 'fr';

        $tokenPack = $this->tokens->createEphemeralToken();
        $session = $this->voice->createSession($user, [
            'conversation_id' => $input['conversation_id'] ?? null,
            'patient_id' => $input['patient_id'] ?? null,
            'locale' => $locale,
            'skip_welcome_tts' => true,
        ]);

        $sessionId = (string) ($session['id'] ?? '');
        $conversationId = (string) ($session['ai_conversation_id'] ?? '');
        if ($sessionId === '' || $conversationId === '') {
            throw new RuntimeException('Session vocale créée sans identifiant ni conversation');
        }

        $promptPack = $this->prompts->build($user, $conversationId, $locale);
        $expiresAt = (int) $tokenPack['expires_at'];

        $this->db->prepare('
            UPDATE voice_sessions
            SET transport = \'realtime\', token_expires_at = FROM_UNIXTIME(?)
            WHERE id = ? AND user_id = ?
        ')->execute([$expiresAt, $sessionId, $userId]);

        $sampleRate = VoiceRealtimeConfig::sampleRate();
        $voiceId = VoiceRealtimeConfig::voiceId();

        return [
            'session_id' => $sessionId,
            'conversation_id' => $conversationId,
            'transport' => 'realtime',
            'ephemeral_token' => $tokenPack['token'],
            'token_expires_at' => $expiresAt,
            'websocket_url' => VoiceRealtimeConfig::websocketUrl(),
            'disclaimer' => $promptPack['context']['disclaimer'] ?? '',
            'draft' => $promptPack['draft'],
            'session_config' => [
                'voice' => $voiceId,
                'instructions' => $promptPack['instructions'],
                'turn_detection' => ['type' => 'server_vad'],
                'tools' => AiGrokRealtimeToolCatalog::toolsFor($user),
                'audio' => [
                    'input' => [
                        'format' => ['type' => 'audio/pcm', 'rate' => $sampleRate],
                        'transport' => 'binary',
                        'transcription' => [
                            'language_hint' => substr($locale, 0, 2),
                        ],
                    ],
                    'output' => [
                        'format' => ['type' => 'audio/pcm', 'rate' => $sampleRate],
                        'transport' => 'binary',
                    ],
                ],
                'resumption' => ['enabled' => true],
            ],
            'welcome_text' => $session['welcome_text'] ?? null,
        ];
    }

    /**
     * @param array<string, mixed> $user
     * @return array<string, mixed>
     */
    public function executeTool(array $user, string $sessionId, string $toolName, array $arguments): array
    {
        $session = $this->assertSession($sessionId, (string) $user['user_id']);
        if (($session['transport'] ?? 'rest') !== 'realtime') {
            throw new InvalidArgumentException('Cette session vocale n\'est pas en temps réel');
        }
        AiChatRateLimit::assertAllowed($user, 'voice_tool');

        if (!in_array($toolName, AiGrokRealtimeToolCatalog::allowedToolNamesFor($user), true)) {
            throw new InvalidArgumentException('Outil vocal non autorisé: ' . $toolName);
        }

        $conversationId = (string) ($session['ai_conversation_id'] ?? '');
        if ($toolName === 'search_cary_context') {
            return $this->executeContextSearch($user, $conversationId, $arguments);
        }

        $draftPreview = (new AiBookingService($this->db))->getLatestDraftForConversation(
            $conversationId,
            (string) $user['user_id'],
        );

        $executor = new AiBookingToolExecutor($user, $conversationId, $draftPreview);
        $exec = $executor->execute($toolName, $arguments);
        $locale = (string) ($session['locale'] ?? 'fr');
        $sessionUpdate = $this->prompts->buildSessionUpdate($user, $conversationId, $locale, '');

        return [
            'tool' => $toolName,
            'result' => $exec['result'],
            'draft' => $exec['draft'],
            'conversation_id' => $conversationId,
            ...$sessionUpdate,
        ];
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function syncEvent(array $user, string $sessionId, array $input): array
    {
        $session = $this->assertSession($sessionId, (string) $user['user_id']);
        if (($session['transport'] ?? 'rest') !== 'realtime') {
            throw new InvalidArgumentException('Cette session vocale n\'est pas en temps réel');
        }
        AiChatRateLimit::assertAllowed($user, 'voice_event');
        $eventId = trim((string) ($input['event_id'] ?? ''));
        $eventType = trim((string) ($input['event_type'] ?? ''));
        if ($eventId === '' || $eventType === '') {
            throw new InvalidArgumentException('event_id et event_type requis');
        }
        if (mb_strlen($eventId) > 128 || mb_strlen($eventType) > 64) {
            throw new InvalidArgumentException('event_id ou event_type trop long');
        }

        $existing = $this->db->prepare('
            SELECT id FROM voice_realtime_events WHERE session_id = ? AND event_id = ? LIMIT 1
        ');
        $existing->execute([$sessionId, $eventId]);
        if ($existing->fetch(PDO::FETCH_ASSOC)) {
            return ['duplicate' => true, 'event_id' => $eventId];
        }

        $conversationId = (string) ($session['ai_conversation_id'] ?? '');
        $payload = is_array($input['payload'] ?? null) ? $input['payload'] : [];
        $latencyMs = isset($input['latency_ms']) ? (int) $input['latency_ms'] : null;
        $lastUserTranscript = '';
        $emergency = null;

        if ($eventType === 'xai_conversation.created') {
            $xaiConvId = trim((string) ($payload['xai_conversation_id'] ?? ''));
            if ($xaiConvId !== '') {
                $this->db->prepare('UPDATE voice_sessions SET xai_conversation_id = ? WHERE id = ?')
                    ->execute([$xaiConvId, $sessionId]);
            }
        }

        if ($eventType === 'user.transcript.final') {
            $transcript = self::boundedTranscript($payload);
            if ($transcript !== '') {
                $lastUserTranscript = $transcript;
                $locale = (string) ($session['locale'] ?? 'fr');
                $this->persistUserTurn($sessionId, $conversationId, $user, $transcript, $locale);
                $emergency = AiEmergencyDetector::detect($transcript);
            }
        }

        if ($eventType === 'assistant.transcript.final') {
            $assistantText = self::boundedTranscript($payload);
            if ($assistantText !== '') {
                $serverDraft = (new AiBookingService($this->db))->getLatestDraftForConversation(
                    $conversationId,
                    (string) $user['user_id'],
                );
                $userForGuard = mb_substr(trim((string) ($payload['user_transcript'] ?? $lastUserTranscript)), 0, AiChatService::MAX_MESSAGE_LENGTH);
                $guarded = AiAssistantResponseGuard::normalize($userForGuard, $assistantText, $serverDraft);
                $metadata = array_merge(self::unverifiedMetadata($sessionId), ['guard_repaired' => $guarded['repaired']]);
                if ($guarded['reason'] !== null) {
                    $metadata['guard_reason'] = $guarded['reason'];
                }
                $this->conversations->addMessage($conversationId, 'assistant', $guarded['text'], $metadata);
            }
        }
        unset($payload['draft']);

        $rowId = Uuid::v4();
        $this->db->prepare('
            INSERT INTO voice_realtime_events (id, session_id, event_id, event_type, payload_json, latency_ms)
            VALUES (?, ?, ?, ?, ?, ?)
        ')->execute([
            $rowId,
            $sessionId,
            $eventId,
            $eventType,
            json_encode($payload, JSON_UNESCAPED_UNICODE),
            $latencyMs,
        ]);

        $this->db->prepare('UPDATE voice_sessions SET last_event_id = ? WHERE id = ?')
            ->execute([$eventId, $sessionId]);

        $draft = null;
        if ($conversationId !== '') {
            $draft = (new AiBookingService($this->db))->getLatestDraftForConversation(
                $conversationId,
                (string) $user['user_id'],
            );
        }

        $sessionUpdate = [];
        if ($eventType === 'user.transcript.final' && $lastUserTranscript !== '') {
            $sessionUpdate = $this->prompts->buildSessionUpdate(
                $user,
                $conversationId,
                (string) ($session['locale'] ?? 'fr'),
                $lastUserTranscript,
            );
        }

        return [
            'duplicate' => false,
            'event_id' => $eventId,
            'conversation_id' => $conversationId,
            'draft' => $draft,
            'emergency' => $emergency,
            ...$sessionUpdate,
        ];
    }

    /**
     * Transcriptions envoyées par l'application (non vérifiables côté serveur) : tracées, mais exclues
     * de l'historique transmis au modèle.
     *
     * @return array{unverified: true, source: string, voice_session_id: string}
     */
    private static function unverifiedMetadata(string $sessionId): array
    {
        return ['unverified' => true, 'source' => 'voice_realtime_client', 'voice_session_id' => $sessionId];
    }

    /** @param array<string, mixed> $payload */
    private static function boundedTranscript(array $payload): string
    {
        $text = trim((string) ($payload['transcript'] ?? ''));
        if (mb_strlen($text) > AiChatService::MAX_MESSAGE_LENGTH) {
            throw new HttpStatusException(
                'Transcription trop longue (' . AiChatService::MAX_MESSAGE_LENGTH . ' caractères maximum)',
                400,
                'AI_MESSAGE_TOO_LONG',
            );
        }

        return $text;
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $arguments
     * @return array<string, mixed>
     */
    private function executeContextSearch(array $user, string $conversationId, array $arguments): array
    {
        $query = trim((string) ($arguments['query'] ?? ''));
        if ($query === '') {
            throw new InvalidArgumentException('query requis pour search_cary_context');
        }

        $patientId = (string) ($user['user_id'] ?? '');
        if (($user['role'] ?? '') !== 'patient') {
            $stmt = $this->db->prepare('SELECT patient_id FROM ai_conversations WHERE id = ? AND user_id = ? LIMIT 1');
            $stmt->execute([$conversationId, (string) $user['user_id']]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (is_array($row) && !empty($row['patient_id'])) {
                $patientId = (string) $row['patient_id'];
            }
        }

        $rag = new RagSearchService();
        $chunks = $rag->searchForUser($user, $patientId, $query, 6);

        return [
            'tool' => 'search_cary_context',
            'result' => ['chunks' => $chunks, 'query' => $query],
            'draft' => (new AiBookingService($this->db))->getLatestDraftForConversation(
                $conversationId,
                (string) $user['user_id'],
            ),
            'conversation_id' => $conversationId,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function assertSession(string $sessionId, string $userId): array
    {
        $session = $this->voice->requireOpenSession($sessionId, $userId);

        $stmt = $this->db->prepare('SELECT transport, xai_conversation_id FROM voice_sessions WHERE id = ? LIMIT 1');
        $stmt->execute([$sessionId]);
        $extra = $stmt->fetch(PDO::FETCH_ASSOC);
        if (is_array($extra)) {
            $session = array_merge($session, $extra);
        }

        return $session;
    }

    /**
     * @param array<string, mixed> $user
     */
    private function persistUserTurn(
        string $sessionId,
        string $conversationId,
        array $user,
        string $transcript,
        string $locale,
    ): void {
        DatabaseTransaction::run($this->db, function () use ($sessionId, $conversationId, $transcript, $locale): void {
            $userMsgId = Uuid::v4();
            $this->db->prepare('INSERT INTO voice_messages (id, session_id, role, created_at) VALUES (?, ?, \'user\', NOW())')
                ->execute([$userMsgId, $sessionId]);
            $this->db->prepare('
                INSERT INTO voice_transcriptions (id, voice_message_id, text, provider, language_detected)
                VALUES (?, ?, ?, \'realtime\', ?)
            ')->execute([Uuid::v4(), $userMsgId, $transcript, $locale]);
            $this->conversations->addMessage($conversationId, 'user', $transcript, self::unverifiedMetadata($sessionId));
        });
        $this->applyVoiceSignalsToDraft($user, $conversationId, $transcript);
    }

    /**
     * @param array<string, mixed> $user
     */
    private function applyVoiceSignalsToDraft(array $user, string $conversationId, string $transcript): void
    {
        if (!AiBookingAccess::allows($user)) {
            return;
        }
        $booking = new AiBookingService($this->db);
        $userId = (string) $user['user_id'];
        $draft = $booking->getLatestDraftForConversation($conversationId, $userId);
        $patch = AiVoiceMessageSignals::buildDraftPatch($transcript, $user, $draft);
        if ($patch === []) {
            return;
        }

        try {
            if (is_array($draft) && !empty($draft['id'])) {
                $booking->patchDraft((string) $draft['id'], $user, $patch, $transcript);
            } else {
                $hasSignal = false;
                foreach ($patch as $value) {
                    if ($value !== null && $value !== '' && $value !== []) {
                        $hasSignal = true;
                        break;
                    }
                }
                if ($hasSignal) {
                    $booking->createDraft($user, [
                        'conversation_id' => $conversationId,
                        'payload' => $patch,
                        'user_message' => $transcript,
                    ]);
                }
            }
        } catch (Throwable $e) {
            error_log('[voice-realtime] applyVoiceSignals: ' . $e->getMessage());
        }
    }
}

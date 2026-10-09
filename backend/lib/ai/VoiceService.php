<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/AIGateway.php';
require_once __DIR__ . '/MemoryComposer.php';
require_once __DIR__ . '/AiConversationService.php';
require_once __DIR__ . '/AiBookingService.php';
require_once __DIR__ . '/CaryContextFocus.php';

require_once __DIR__ . '/AiTurnOrchestrator.php';
require_once __DIR__ . '/AiBookingDraftSummary.php';
require_once __DIR__ . '/VoiceGrokAudioService.php';
require_once __DIR__ . '/AiVoiceMessageSignals.php';
require_once __DIR__ . '/AiVoiceAssistantGuard.php';
require_once __DIR__ . '/AiAssistantResponseGuard.php';
require_once __DIR__ . '/AiVoiceDraftReconciler.php';
require_once __DIR__ . '/AiEmergencyDetector.php';
require_once __DIR__ . '/AiChatService.php';
require_once __DIR__ . '/../DatabaseTransaction.php';
require_once __DIR__ . '/../Validation.php';
require_once __DIR__ . '/../HttpStatusException.php';
require_once __DIR__ . '/../PatientDossierAccess.php';
require_once __DIR__ . '/../../models/User.php';

final class VoiceService
{
    private PDO $db;
    private AIGateway $gateway;
    private MemoryComposer $memory;
    private AiConversationService $conversations;
    private AiBookingService $booking;
    private AiTurnOrchestrator $orchestrator;
    private VoiceGrokAudioService $grokAudio;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? ai_db();
        $this->gateway = new AIGateway($this->db);
        $this->memory = new MemoryComposer();
        $this->conversations = new AiConversationService($this->db);
        $this->booking = new AiBookingService($this->db);
        $this->orchestrator = new AiTurnOrchestrator($this->gateway, $this->booking);
        $this->grokAudio = new VoiceGrokAudioService();
    }

    /**
     * @param array<string, mixed> $user
     * @return array<string, mixed>
     */
    public function createSession(array $user, array $input): array
    {
        $requestedLocale = $input['locale'] ?? 'fr';
        $locale = in_array($requestedLocale, ['fr', 'en', 'ar', 'es'], true) ? $requestedLocale : 'fr';
        $conversationId = isset($input['conversation_id']) ? trim((string) $input['conversation_id']) : null;
        if ($conversationId === '') {
            $conversationId = null;
        }
        $requestedPatientId = trim((string) ($input['patient_id'] ?? ''));
        if (($user['role'] ?? '') === 'patient') {
            $patientId = (string) $user['user_id'];
        } elseif ($requestedPatientId !== '') {
            if (!Validation::uuid($requestedPatientId)) {
                throw new InvalidArgumentException('patient_id invalide');
            }
            if (!PatientDossierAccess::canAccess($this->db, new User(), $user, $requestedPatientId)) {
                throw HttpStatusException::forbidden('Accès à ce patient refusé');
            }
            $patientId = $requestedPatientId;
        } else {
            $patientId = null;
        }

        if ($conversationId !== null) {
            // A voice session must never be attached to another user's thread.
            // The UUID alone is not an authorization check.
            $ownedConversation = $this->conversations->getById($conversationId, (string) $user['user_id']);
            if ($ownedConversation === null) {
                throw HttpStatusException::notFound('Conversation vocale introuvable');
            }
            if (!empty($ownedConversation['patient_id'])) {
                $patientId = (string) $ownedConversation['patient_id'];
            }
        } else {
            $conversationId = (string) $this->conversations->create($user, [
                'conversation_type' => 'voice',
                'custom_title' => 'Conversation vocale',
                'patient_id' => $patientId !== (string) $user['user_id'] ? $patientId : null,
            ])['conversation']['id'];
            $this->db->prepare('UPDATE ai_conversations SET channel = \'voice\' WHERE id = ?')
                ->execute([$conversationId]);
        }
        $id = Uuid::v4();
        $this->db->prepare('
            INSERT INTO voice_sessions (id, user_id, patient_id, ai_conversation_id, locale, channel, started_at)
            VALUES (?, ?, ?, ?, ?, \'voice\', NOW())
        ')->execute([$id, $user['user_id'], $patientId, $conversationId, $locale]);

        $session = $this->getSession($id, (string) $user['user_id']);
        $welcomeText = $this->buildVoiceWelcomeMessage($user);
        $skipWelcomeTts = !empty($input['skip_welcome_tts']);
        $session['welcome_text'] = $welcomeText;
        if (!$skipWelcomeTts) {
            try {
                $welcomeAudio = $this->grokAudio->synthesize($welcomeText, $locale);
                $session['welcome_audio_base64'] = $welcomeAudio['audio_base64'];
                $session['welcome_audio_mime'] = $welcomeAudio['mime'];
            } catch (Throwable $e) {
                error_log('[voice] welcome TTS: ' . $e->getMessage());
            }
        }

        return $session;
    }

    /**
     * @param array<string, mixed> $user
     * @return array<string, mixed>
     */
    public function processTurn(array $user, string $sessionId, array $input): array
    {
        $session = $this->requireOpenSession($sessionId, (string) $user['user_id']);
        $rawTranscript = trim((string) ($input['transcript'] ?? ''));
        $sttProvider = (string) ($input['stt_provider'] ?? 'client');

        // Bound client supplied audio before base64 decoding to avoid a memory
        // spike on the PHP worker (roughly 10 MB of compressed audio).
        $audioBase64 = (string) ($input['audio_base64'] ?? '');
        if (strlen($audioBase64) > 15 * 1024 * 1024) {
            throw new InvalidArgumentException('Fichier audio trop volumineux');
        }

        if ($rawTranscript !== '' && in_array($sttProvider, ['device', 'client'], true)) {
            $sttProvider = 'device';
        } elseif ($audioBase64 !== '') {
            $grokText = trim($this->grokAudio->transcribe($audioBase64, (string) ($session['locale'] ?? 'fr')));
            $rawTranscript = $grokText;
            $sttProvider = 'grok_stt';
        }

        if ($rawTranscript === '') {
            throw new InvalidArgumentException('audio_base64 requis pour la conversation vocale');
        }
        if (mb_strlen($rawTranscript) > AiChatService::MAX_MESSAGE_LENGTH) {
            throw new HttpStatusException(
                'Message trop long (' . AiChatService::MAX_MESSAGE_LENGTH . ' caractères maximum)',
                400,
                'AI_MESSAGE_TOO_LONG',
            );
        }
        $transcript = $rawTranscript;

        $conversationId = (string) ($session['ai_conversation_id'] ?? '');
        $history = $this->modelHistory($conversationId, (string) $user['user_id']);
        $userMessage = $this->conversations->addMessage($conversationId, 'user', $transcript);

        $emergency = AiEmergencyDetector::detect($transcript);
        if ($emergency !== null) {
            return $this->answerEmergency($session, $conversationId, (string) $userMessage['id'], $transcript, $sttProvider, $emergency);
        }

        $this->applyVoiceSignalsToDraft($user, $conversationId, $transcript);

        $conv = $this->conversations->getById($conversationId, (string) $user['user_id']);
        $patientId = isset($conv['patient_id']) ? (string) $conv['patient_id'] : null;

        $draftPreview = $this->booking->getLatestDraftForConversation($conversationId, (string) $user['user_id']);
        $contextFocus = CaryContextFocus::resolve($transcript, false, $draftPreview, false);

        $context = $this->memory->compose($user, $patientId, 'voice', true, $transcript, $conversationId);
        $context['disclaimer'] = $this->gateway->getDisclaimerPublic();
        $context['locale'] = $session['locale'] ?? 'fr';
        $context['active_intent'] = $contextFocus;
        $context['conversation_mode'] = 'voice_chat';
        if ($draftPreview !== null) {
            $context['active_booking_draft'] = AiBookingDraftSummary::forPrompt($draftPreview);
        }
        $promptContext = CaryContextFocus::minimizeContext($context, $contextFocus);
        $promptContext['locale'] = $context['locale'];

        $messages = $history;
        $messages[] = ['role' => 'user', 'content' => $transcript];
        try {
            $turn = $this->orchestrator->runTurn(
                $user,
                $messages,
                $promptContext,
                $conversationId,
                $patientId,
                'voice_agent',
            );
        } catch (Throwable $e) {
            $this->conversations->removeMessage($conversationId, (string) $userMessage['id']);
            throw $e;
        }

        $draft = $turn['draft'] ?? $draftPreview;
        if (is_array($draft) && !empty($draft['id'])) {
            $draft = $this->reconcileVoiceDraft($user, (string) $draft['id'], $transcript, $draft) ?? $draft;
        }

        $guarded = AiAssistantResponseGuard::normalize(
            $transcript,
            trim($turn['content']),
            is_array($draft) ? $draft : null,
        );
        $assistantText = $guarded['text'];
        $appointmentId = null;

        // RDV : jamais de confirmation automatique en vocal — l'utilisateur doit appuyer sur Valider.
        if ($this->isBookingConfirmIntent($transcript) && is_array($draft) && !empty($draft['id'])) {
            $draft = $this->reconcileVoiceDraft($user, (string) $draft['id'], $transcript, $draft) ?? $draft;
            $freshDraft = $this->booking->getDraft((string) $draft['id'], (string) $user['user_id']);
            if (is_array($freshDraft) && ($freshDraft['status'] ?? '') === 'ready') {
                $assistantText = 'Parfait — appuyez sur Valider sur la carte récap pour créer le rendez-vous.';
            } elseif (is_array($freshDraft) && ($freshDraft['status'] ?? '') !== 'confirmed') {
                $assistantText = 'Presque fini — appuyez sur Valider sur la carte récap pour créer le rendez-vous.';
            }
        }

        $draftId = is_array($draft) && !empty($draft['id']) ? (string) $draft['id'] : null;

        $metadata = [
            'audit_id' => $turn['audit_id'] ?? null,
            'disclaimer' => $context['disclaimer'],
        ];
        if ($draft) {
            $metadata['draft'] = $draft;
        }
        if ($appointmentId !== null && $appointmentId !== '') {
            $metadata['appointment_id'] = $appointmentId;
        }
        $this->recordVoiceExchange($session, $transcript, $sttProvider, $assistantText, 'grok', function () use ($conversationId, $assistantText, $metadata, $userMessage): void {
            $this->conversations->addMessage($conversationId, 'assistant', $assistantText, $metadata, null, (string) $userMessage['id']);
        });

        $assistantAudio = null;
        $assistantAudioMime = null;
        try {
            $tts = $this->grokAudio->synthesize($assistantText, (string) ($session['locale'] ?? 'fr'));
            $assistantAudio = $tts['audio_base64'];
            $assistantAudioMime = $tts['mime'];
        } catch (Throwable $e) {
            error_log('[voice] assistant TTS: ' . $e->getMessage());
        }

        return [
            'session_id' => $sessionId,
            'conversation_id' => $conversationId,
            'transcript' => $transcript,
            'assistant_text' => $assistantText,
            'assistant_audio_base64' => $assistantAudio,
            'assistant_audio_mime' => $assistantAudioMime,
            'disclaimer' => $context['disclaimer'],
            'audit_id' => $turn['audit_id'] ?? null,
            'locale' => $session['locale'] ?? 'fr',
            'draft' => $draft,
            'draft_id' => $draftId,
            'appointment_id' => $appointmentId,
            'emergency' => null,
        ];
    }

    /**
     * Session ouverte de l'utilisateur, sinon 404 / 409.
     *
     * @return array<string, mixed>
     */
    public function requireOpenSession(string $sessionId, string $userId): array
    {
        $session = $this->getSession($sessionId, $userId);
        if ($session === null) {
            throw HttpStatusException::notFound('Session vocale introuvable');
        }
        if (!empty($session['ended_at'])) {
            throw HttpStatusException::conflict('Session vocale déjà clôturée', 'VOICE_SESSION_ENDED');
        }

        return $session;
    }

    /**
     * Historique transmis au modèle : sans messages système ni transcriptions non vérifiées (voix temps réel).
     *
     * @return list<array{role: string, content: string}>
     */
    private function modelHistory(string $conversationId, string $userId): array
    {
        $messages = [];
        foreach ($this->conversations->getMessages($conversationId, $userId, AiTurnOrchestrator::HISTORY_LIMIT) as $msg) {
            $role = (string) ($msg['role'] ?? '');
            if (!in_array($role, ['user', 'assistant'], true) || !empty($msg['metadata']['unverified'])) {
                continue;
            }
            $messages[] = ['role' => $role, 'content' => (string) $msg['content']];
        }

        return $messages;
    }

    /**
     * @param array<string, mixed> $session
     * @param array{kind: string, title: string, body: string, actions: list<array{label: string, phone: string}>} $emergency
     * @return array<string, mixed>
     */
    private function answerEmergency(array $session, string $conversationId, string $userMessageId, string $transcript, string $sttProvider, array $emergency): array
    {
        $assistantText = AiEmergencyDetector::messageContent($emergency);
        $disclaimer = $this->gateway->getDisclaimerPublic();
        $metadata = ['audit_id' => null, 'disclaimer' => $disclaimer, 'emergency' => $emergency, 'sources' => [], 'suggestions' => []];
        $this->recordVoiceExchange($session, $transcript, $sttProvider, $assistantText, 'cary_emergency', function () use ($conversationId, $assistantText, $metadata, $userMessageId): void {
            $this->conversations->addMessage($conversationId, 'assistant', $assistantText, $metadata, null, $userMessageId);
        });

        $audio = null;
        $mime = null;
        try {
            $tts = $this->grokAudio->synthesize($assistantText, (string) ($session['locale'] ?? 'fr'));
            $audio = $tts['audio_base64'];
            $mime = $tts['mime'];
        } catch (Throwable $e) {
            error_log('[voice] TTS urgence : ' . $e->getMessage());
        }

        return [
            'session_id' => (string) $session['id'],
            'conversation_id' => $conversationId,
            'transcript' => $transcript,
            'assistant_text' => $assistantText,
            'assistant_audio_base64' => $audio,
            'assistant_audio_mime' => $mime,
            'disclaimer' => $disclaimer,
            'audit_id' => null,
            'locale' => $session['locale'] ?? 'fr',
            'draft' => null,
            'draft_id' => null,
            'appointment_id' => null,
            'emergency' => $emergency,
        ];
    }

    /**
     * Trace vocale du tour (question et réponse) écrite avec la réponse : un tour en échec ne laisse aucune trace orpheline.
     *
     * @param array<string, mixed> $session
     * @param callable(): void $persistAnswer
     */
    private function recordVoiceExchange(array $session, string $transcript, string $sttProvider, string $assistantText, string $assistantProvider, callable $persistAnswer): void
    {
        DatabaseTransaction::run($this->db, function () use ($session, $transcript, $sttProvider, $assistantText, $assistantProvider, $persistAnswer): void {
            $userMsgId = Uuid::v4();
            $this->db->prepare('INSERT INTO voice_messages (id, session_id, role, created_at) VALUES (?, ?, \'user\', NOW())')
                ->execute([$userMsgId, (string) $session['id']]);
            $this->db->prepare('INSERT INTO voice_transcriptions (id, voice_message_id, text, provider, language_detected) VALUES (?, ?, ?, ?, ?)')
                ->execute([Uuid::v4(), $userMsgId, $transcript, $sttProvider, $session['locale'] ?? 'fr']);
            $assistantMsgId = Uuid::v4();
            $this->db->prepare('INSERT INTO voice_messages (id, session_id, role, created_at) VALUES (?, ?, \'assistant\', NOW())')
                ->execute([$assistantMsgId, (string) $session['id']]);
            $this->db->prepare('INSERT INTO voice_transcriptions (id, voice_message_id, text, provider) VALUES (?, ?, ?, ?)')
                ->execute([Uuid::v4(), $assistantMsgId, $assistantText, $assistantProvider]);
            $persistAnswer();
        });
    }

    /**
     * @param array<string, mixed> $user
     */
    private function buildVoiceWelcomeMessage(array $user): string
    {
        $name = '';
        try {
            require_once __DIR__ . '/../../models/User.php';
            $userModel = new User();
            $profile = $userModel->getById(
                (string) $user['user_id'],
                (string) $user['user_id'],
                (string) ($user['role'] ?? 'patient'),
                'mobile',
            );
            $name = trim((string) ($profile['first_name'] ?? ''));
        } catch (Throwable $e) {
            error_log('[voice] prénom indisponible pour l\'accueil : ' . $e->getMessage());
        }
        $greeting = $name !== '' ? "Bonjour {$name}," : 'Bonjour,';

        return "{$greeting} je suis Cary, votre assistant santé. Que puis-je faire pour vous ?";
    }

    private function applyVoiceSignalsToDraft(array $user, string $conversationId, string $transcript): void
    {
        if (!AiBookingAccess::allows($user)) {
            return;
        }
        $userId = (string) $user['user_id'];
        $draft = $this->booking->getLatestDraftForConversation($conversationId, $userId);
        $patch = AiVoiceMessageSignals::buildDraftPatch($transcript, $user, $draft);
        if ($patch === []) {
            return;
        }

        try {
            if (is_array($draft) && !empty($draft['id'])) {
                $this->booking->patchDraft((string) $draft['id'], $user, $patch, $transcript);
            } elseif ($this->patchHasBookingSignal($patch)) {
                $this->booking->createDraft($user, [
                    'conversation_id' => $conversationId,
                    'payload' => $patch,
                    'user_message' => $transcript,
                ]);
            }
        } catch (Throwable $e) {
            error_log('[voice] applyVoiceSignals: ' . $e->getMessage());
        }
    }

    /**
     * @param array<string, mixed> $patch
     */
    private function patchHasBookingSignal(array $patch): bool
    {
        foreach ($patch as $value) {
            if ($value !== null && $value !== '' && $value !== []) {
                return true;
            }
        }

        return false;
    }

    private function isBookingConfirmIntent(string $transcript): bool
    {
        $t = mb_strtolower(trim(preg_replace('/[.!?]+$/u', '', trim($transcript)) ?? trim($transcript)));
        if ($t === '') {
            return false;
        }

        if (preg_match('/^(?:oui|ok|c[\']?est bon)$/u', preg_replace('/\s+/u', ' ', $t) ?? $t)) {
            return true;
        }

        return (bool) preg_match(
            '/\b(je confirme|on valide|valide|valider|confirme|confirmez|confirmer|c[\']?est bon|ok pour le rdv)\b/u',
            $t,
        );
    }

    /**
     * @param array<string, mixed> $draft
     * @return array<string, mixed>|null
     */
    private function reconcileVoiceDraft(array $user, string $draftId, string $transcript, array $draft): ?array
    {
        $payload = is_array($draft['payload'] ?? null) ? $draft['payload'] : [];
        $patch = AiVoiceDraftReconciler::buildPatch($payload, $transcript, $user);
        if ($patch === []) {
            return $this->booking->getDraft($draftId, (string) $user['user_id']);
        }

        try {
            return $this->booking->patchDraft($draftId, $user, $patch, $transcript);
        } catch (Throwable $e) {
            error_log('[voice] reconcileVoiceDraft: ' . $e->getMessage());

            return null;
        }
    }

    /**
     * @return array<string, mixed>|null
     */
    public function getSession(string $id, string $userId): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM voice_sessions WHERE id = ? AND user_id = ? LIMIT 1');
        $stmt->execute([$id, $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? [
            'id' => (string) $row['id'],
            'user_id' => (string) $row['user_id'],
            'patient_id' => $row['patient_id'],
            'ai_conversation_id' => $row['ai_conversation_id'],
            'locale' => $row['locale'] ?? 'fr',
            'started_at' => $row['started_at'],
            'ended_at' => $row['ended_at'],
        ] : null;
    }

    public function endSession(string $id, string $userId): void
    {
        $this->db->prepare('UPDATE voice_sessions SET ended_at = NOW() WHERE id = ? AND user_id = ?')
            ->execute([$id, $userId]);
    }
}

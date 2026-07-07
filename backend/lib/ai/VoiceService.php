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
require_once __DIR__ . '/AiVoiceDraftReconciler.php';

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
        $locale = in_array($input['locale'] ?? 'fr', ['fr', 'en', 'ar', 'es'], true)
            ? (string) $input['locale'] : 'fr';
        $conversationId = isset($input['conversation_id']) ? trim((string) $input['conversation_id']) : null;
        if ($conversationId === '') {
            $conversationId = null;
        }
        if ($conversationId === null) {
            $conv = $this->conversations->create($user, [
                'conversation_type' => 'voice',
                'custom_title' => 'Conversation vocale',
            ]);
            $conversationId = (string) $conv['id'];
            $this->db->prepare('UPDATE ai_conversations SET channel = \'voice\' WHERE id = ?')
                ->execute([$conversationId]);
        }
        $id = Uuid::v4();
        $patientId = ($user['role'] ?? '') === 'patient' ? (string) $user['user_id'] : ($input['patient_id'] ?? null);
        $this->db->prepare('
            INSERT INTO voice_sessions (id, user_id, patient_id, ai_conversation_id, locale, channel, started_at)
            VALUES (?, ?, ?, ?, ?, \'voice\', NOW())
        ')->execute([$id, $user['user_id'], $patientId, $conversationId, $locale]);

        $session = $this->getSession($id, (string) $user['user_id']);
        $welcomeText = $this->buildVoiceWelcomeMessage($user);
        try {
            $welcomeAudio = $this->grokAudio->synthesize($welcomeText, $locale);
            $session['welcome_text'] = $welcomeText;
            $session['welcome_audio_base64'] = $welcomeAudio['audio_base64'];
            $session['welcome_audio_mime'] = $welcomeAudio['mime'];
        } catch (Throwable $e) {
            error_log('[voice] welcome TTS: ' . $e->getMessage());
            $session['welcome_text'] = $welcomeText;
        }

        return $session;
    }

    /**
     * @param array<string, mixed> $user
     * @return array<string, mixed>
     */
    public function processTurn(array $user, string $sessionId, array $input): array
    {
        $session = $this->getSession($sessionId, (string) $user['user_id']);
        if (!$session) {
            throw new RuntimeException('Session vocale introuvable');
        }
        $rawTranscript = trim((string) ($input['transcript'] ?? ''));
        $sttProvider = (string) ($input['stt_provider'] ?? 'client');

        if ($rawTranscript !== '' && in_array($sttProvider, ['device', 'client'], true)) {
            $sttProvider = 'device';
        } elseif (!empty($input['audio_base64'])) {
            $grokText = trim($this->grokAudio->transcribe((string) $input['audio_base64'], (string) ($session['locale'] ?? 'fr')));
            $rawTranscript = $grokText;
            $sttProvider = 'grok_stt';
        }

        if ($rawTranscript === '') {
            throw new InvalidArgumentException('audio_base64 requis pour la conversation vocale');
        }
        $transcript = $rawTranscript;

        $conversationId = (string) ($session['ai_conversation_id'] ?? '');
        $userMsgId = Uuid::v4();
        $this->db->prepare('INSERT INTO voice_messages (id, session_id, role, created_at) VALUES (?, ?, \'user\', NOW())')
            ->execute([$userMsgId, $sessionId]);
        $this->db->prepare('INSERT INTO voice_transcriptions (id, voice_message_id, text, provider, language_detected) VALUES (?, ?, ?, ?, ?)')
            ->execute([Uuid::v4(), $userMsgId, $transcript, $sttProvider, $session['locale'] ?? 'fr']);

        $this->conversations->addMessage($conversationId, 'user', $transcript);

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

        $turn = $this->orchestrator->runTurn(
            $user,
            $messages,
            $context,
            $conversationId,
            $patientId,
            'voice_agent',
        );

        $draft = $turn['draft'] ?? $draftPreview;
        if (is_array($draft) && !empty($draft['id'])) {
            $draft = $this->reconcileVoiceDraft($user, (string) $draft['id'], $transcript, $draft) ?? $draft;
        }

        $assistantText = AiVoiceAssistantGuard::normalize($transcript, trim($turn['content']), is_array($draft) ? $draft : null);
        $appointmentId = null;

        if ($this->isBookingConfirmIntent($transcript) && is_array($draft) && !empty($draft['id'])) {
            $draft = $this->reconcileVoiceDraft($user, (string) $draft['id'], $transcript, $draft) ?? $draft;
            $freshDraft = $this->booking->getDraft((string) $draft['id'], (string) $user['user_id']);
            if (is_array($freshDraft) && ($freshDraft['status'] ?? '') === 'ready') {
                try {
                    $confirmed = $this->booking->confirmDraft((string) $draft['id'], $user);
                    $draft = $confirmed['draft'] ?? $freshDraft;
                    $appointmentId = (string) ($confirmed['appointment_id'] ?? '');
                    $assistantText = 'Parfait, le rendez-vous est créé. Vous le retrouverez dans votre tournée.';
                } catch (Throwable $e) {
                    error_log('[voice] confirmDraft: ' . $e->getMessage());
                    $assistantText = 'Il manque encore une information pour finaliser — vérifiez le récap et appuyez sur Valider.';
                }
            } elseif (is_array($freshDraft) && ($freshDraft['status'] ?? '') !== 'confirmed') {
                $assistantText = 'Presque fini — appuyez sur Valider sur la carte récap pour créer le rendez-vous.';
            }
        }

        $draftId = is_array($draft) && !empty($draft['id']) ? (string) $draft['id'] : null;

        $assistantMsgId = Uuid::v4();
        $this->db->prepare('INSERT INTO voice_messages (id, session_id, role, created_at) VALUES (?, ?, \'assistant\', NOW())')
            ->execute([$assistantMsgId, $sessionId]);
        $this->db->prepare('INSERT INTO voice_transcriptions (id, voice_message_id, text, provider) VALUES (?, ?, ?, \'grok\')')
            ->execute([Uuid::v4(), $assistantMsgId, $assistantText]);

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
        $this->conversations->addMessage($conversationId, 'assistant', $assistantText, $metadata);

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
        ];
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
            // ignore
        }
        $greeting = $name !== '' ? "Bonjour {$name}," : 'Bonjour,';

        return "{$greeting} je suis Cary, votre assistant santé. Que puis-je faire pour vous ?";
    }

    private function applyVoiceSignalsToDraft(array $user, string $conversationId, string $transcript): void
    {
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

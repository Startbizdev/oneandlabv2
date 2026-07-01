<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/AIGateway.php';
require_once __DIR__ . '/MemoryComposer.php';
require_once __DIR__ . '/AiConversationService.php';
require_once __DIR__ . '/../Uuid.php';

final class VoiceService
{
    private PDO $db;
    private AIGateway $gateway;
    private MemoryComposer $memory;
    private AiConversationService $conversations;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? ai_db();
        $this->gateway = new AIGateway($this->db);
        $this->memory = new MemoryComposer();
        $this->conversations = new AiConversationService($this->db);
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

        return $this->getSession($id, (string) $user['user_id']);
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
        $transcript = trim((string) ($input['transcript'] ?? ''));
        if ($transcript === '' && !empty($input['audio_base64'])) {
            $transcript = $this->transcribeAudio((string) $input['audio_base64'], (string) ($session['locale'] ?? 'fr'));
        }
        if ($transcript === '') {
            throw new InvalidArgumentException('transcript ou audio_base64 requis');
        }

        $conversationId = (string) ($session['ai_conversation_id'] ?? '');
        $userMsgId = Uuid::v4();
        $this->db->prepare('INSERT INTO voice_messages (id, session_id, role, created_at) VALUES (?, ?, \'user\', NOW())')
            ->execute([$userMsgId, $sessionId]);
        $this->db->prepare('INSERT INTO voice_transcriptions (id, voice_message_id, text, provider, language_detected) VALUES (?, ?, ?, ?, ?)')
            ->execute([Uuid::v4(), $userMsgId, $transcript, $input['stt_provider'] ?? 'client', $session['locale'] ?? 'fr']);

        $this->conversations->addMessage($conversationId, 'user', $transcript);

        $conv = $this->conversations->getById($conversationId, (string) $user['user_id']);
        $patientId = isset($conv['patient_id']) ? (string) $conv['patient_id'] : null;
        $context = $this->memory->compose($user, $patientId, 'voice', true, $transcript, $conversationId);
        $context['disclaimer'] = $this->gateway->getDisclaimerPublic();
        $context['locale'] = $session['locale'] ?? 'fr';

        $history = $this->conversations->getMessages($conversationId, (string) $user['user_id'], 10);
        $messages = [];
        foreach ($history as $msg) {
            if (($msg['role'] ?? '') === 'system') {
                continue;
            }
            $messages[] = ['role' => (string) $msg['role'], 'content' => (string) $msg['content']];
        }

        $result = $this->gateway->chat(
            $user,
            $messages,
            'voice_agent',
            $context,
            $conversationId,
            $patientId,
        );
        $assistantText = trim((string) ($result['content'] ?? ''));
        $assistantMsgId = Uuid::v4();
        $this->db->prepare('INSERT INTO voice_messages (id, session_id, role, created_at) VALUES (?, ?, \'assistant\', NOW())')
            ->execute([$assistantMsgId, $sessionId]);
        $this->db->prepare('INSERT INTO voice_transcriptions (id, voice_message_id, text, provider) VALUES (?, ?, ?, \'grok\')')
            ->execute([Uuid::v4(), $assistantMsgId, $assistantText]);

        $metadata = ['audit_id' => $result['audit_id'] ?? null, 'disclaimer' => $context['disclaimer']];
        $this->conversations->addMessage($conversationId, 'assistant', $assistantText, $metadata);

        return [
            'session_id' => $sessionId,
            'conversation_id' => $conversationId,
            'transcript' => $transcript,
            'assistant_text' => $assistantText,
            'disclaimer' => $context['disclaimer'],
            'audit_id' => $result['audit_id'] ?? null,
            'locale' => $session['locale'] ?? 'fr',
        ];
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

    private function transcribeAudio(string $audioBase64, string $locale): string
    {
        $openAiKey = ai_env('OPENAI_API_KEY');
        if ($openAiKey === null || $openAiKey === '') {
            throw new InvalidArgumentException('STT serveur indisponible — envoyez transcript depuis le client');
        }
        $binary = base64_decode($audioBase64, true);
        if ($binary === false || $binary === '') {
            throw new InvalidArgumentException('audio_base64 invalide');
        }
        $tmp = tempnam(sys_get_temp_dir(), 'cary_stt_');
        if ($tmp === false) {
            throw new RuntimeException('tmp STT failed');
        }
        file_put_contents($tmp, $binary);
        $ch = curl_init('https://api.openai.com/v1/audio/transcriptions');
        $post = [
            'model' => 'whisper-1',
            'language' => substr($locale, 0, 2),
            'file' => new CURLFile($tmp, 'audio/m4a', 'audio.m4a'),
        ];
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $openAiKey],
            CURLOPT_POSTFIELDS => $post,
            CURLOPT_TIMEOUT => 60,
        ]);
        $raw = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        @unlink($tmp);
        if ($raw === false || $code >= 400) {
            throw new RuntimeException('STT échoué');
        }
        $decoded = json_decode($raw, true);

        return trim((string) ($decoded['text'] ?? ''));
    }
}

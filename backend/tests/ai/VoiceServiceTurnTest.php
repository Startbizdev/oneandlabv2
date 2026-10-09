<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/support/AiTestFixtures.php';
require_once __DIR__ . '/../../lib/ai/VoiceService.php';

/**
 * Tour vocal REST : la trace vocale (voice_messages / voice_transcriptions) n'est écrite qu'avec la réponse.
 */
final class VoiceServiceTurnTest extends TestCase
{
    private PDO $db;
    private AiTestFixtures $fixtures;
    private VoiceService $voice;

    protected function setUp(): void
    {
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN non défini');
        }
        $this->db = TestDatabase::pdo();
        $this->fixtures = new AiTestFixtures($this->db);
        $this->voice = new VoiceService($this->db);
    }

    protected function tearDown(): void
    {
        if (isset($this->db)) {
            $this->route('grok');
        }
        ProviderRetryPolicy::resetForTests();
        if (isset($this->fixtures)) {
            $this->fixtures->cleanup();
        }
        unset($this->voice, $this->fixtures, $this->db);
        parent::tearDown();
    }

    private function route(string $provider): void
    {
        $this->db->prepare("UPDATE ai_task_routing SET provider = ? WHERE task_type = 'voice_agent'")->execute([$provider]);
    }

    /** @return array{0: array<string, string>, 1: array<string, mixed>} */
    private function patientSession(): array
    {
        $user = ['user_id' => $this->fixtures->profile('patient'), 'role' => 'patient'];

        return [$user, $this->voice->createSession($user, ['skip_welcome_tts' => true])];
    }

    /** @return array{voice: list<string>, providers: list<string>, user_messages: int} */
    private function trace(array $session): array
    {
        $voice = $this->db->prepare("SELECT m.role, t.provider FROM voice_messages m JOIN voice_transcriptions t ON t.voice_message_id = m.id WHERE m.session_id = ? ORDER BY m.role = 'assistant'");
        $voice->execute([$session['id']]);
        $rows = $voice->fetchAll(PDO::FETCH_ASSOC);
        $users = $this->db->prepare("SELECT COUNT(*) FROM ai_messages WHERE conversation_id = ? AND role = 'user'");
        $users->execute([$session['ai_conversation_id']]);

        return ['voice' => array_column($rows, 'role'), 'providers' => array_column($rows, 'provider'), 'user_messages' => (int) $users->fetchColumn()];
    }

    public function testFailedTurnLeavesNoVoiceTraceNorQuestion(): void
    {
        $this->route('deepseek');
        [$user, $session] = $this->patientSession();

        $error = null;
        try {
            $this->voice->processTurn($user, (string) $session['id'], ['transcript' => 'Quels examens pour un bilan lipidique ?']);
        } catch (AiProviderUnavailableException $e) {
            $error = $e;
        }

        $this->assertNotNull($error);
        $this->assertSame(['voice' => [], 'providers' => [], 'user_messages' => 0], $this->trace($session));
    }

    public function testAnsweredTurnRecordsOneQuestionAndOneAnswer(): void
    {
        $this->route('local');
        [$user, $session] = $this->patientSession();

        $result = $this->voice->processTurn($user, (string) $session['id'], ['transcript' => 'Quels examens pour un bilan lipidique ?']);

        $this->assertNotSame('', $result['assistant_text']);
        $this->assertSame(['voice' => ['user', 'assistant'], 'providers' => ['device', 'grok'], 'user_messages' => 1], $this->trace($session));
    }

    public function testEmergencyTurnRecordsOneQuestionAndTheFixedAnswer(): void
    {
        $this->route('deepseek');
        [$user, $session] = $this->patientSession();

        $result = $this->voice->processTurn($user, (string) $session['id'], ['transcript' => "J'ai très mal à la poitrine depuis dix minutes"]);

        $this->assertSame('cardiac', $result['emergency']['kind']);
        $this->assertSame(['voice' => ['user', 'assistant'], 'providers' => ['device', 'cary_emergency'], 'user_messages' => 1], $this->trace($session));
    }
}

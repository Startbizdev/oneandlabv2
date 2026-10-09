<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/support/AiTestFixtures.php';
require_once __DIR__ . '/support/AiHttpHarness.php';
require_once __DIR__ . '/../../lib/RateLimit.php';

/**
 * POST /api/ai/chat et /api/ai/chat/stream via le routeur HTTP réel, fournisseur local déterministe.
 */
final class AiChatHttpTest extends TestCase
{
    private PDO $db;
    private AiTestFixtures $fixtures;

    public static function setUpBeforeClass(): void
    {
        if (TestDatabase::isConfigured()) {
            TestDatabase::pdo()->exec("UPDATE ai_task_routing SET provider = 'local'");
        }
    }

    public static function tearDownAfterClass(): void
    {
        if (TestDatabase::isConfigured()) {
            TestDatabase::pdo()->exec("UPDATE ai_task_routing SET provider = 'grok'");
        }
    }

    protected function setUp(): void
    {
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN non défini');
        }
        $this->db = TestDatabase::pdo();
        $this->fixtures = new AiTestFixtures($this->db);
    }

    protected function tearDown(): void
    {
        if (isset($this->fixtures)) {
            $this->fixtures->cleanup();
        }
        unset($this->fixtures, $this->db);
        parent::tearDown();
    }

    /** @return array{0: string, 1: string} token, conversation_id */
    private function userWithConversation(string $role): array
    {
        $token = AiHttpHarness::token($this->fixtures->profile($role), $role);
        $created = AiHttpHarness::request('POST', '/api/ai/conversations', $token, []);
        $this->assertSame(201, $created['status'], $created['raw']);

        return [$token, (string) $created['json']['data']['id']];
    }

    /** @return array<string, mixed> */
    private function chatBody(string $conversationId, string $message, ?string $clientMessageId = null): array
    {
        return ['conversation_id' => $conversationId, 'message' => $message, 'client_message_id' => $clientMessageId ?? Uuid::v4()];
    }

    public function testChatContractForEveryAssistantRole(): void
    {
        foreach (['patient', 'nurse', 'pro', 'preleveur'] as $role) {
            [$token, $conversationId] = $this->userWithConversation($role);
            $response = AiHttpHarness::request('POST', '/api/ai/chat', $token, $this->chatBody($conversationId, 'Bonjour, que peux-tu faire ?'));
            $this->assertSame(200, $response['status'], $role . ' ' . $response['raw']);
            $data = $response['json']['data'];
            foreach (['message', 'draft', 'disclaimer', 'audit_id', 'conversation', 'emergency', 'suggestions', 'deduplicated'] as $key) {
                $this->assertArrayHasKey($key, $data, $role . ' ' . $key);
            }
            $this->assertNull($data['emergency'], $role);
            $this->assertFalse($data['deduplicated'], $role);
            $this->assertIsArray($data['message']['sources'], $role);
            $this->assertStringNotContainsString('[ref:', (string) $data['message']['content'], $role);
            $this->assertGreaterThanOrEqual(2, count($data['suggestions']), $role);
            $this->assertLessThanOrEqual(3, count($data['suggestions']), $role);
        }
    }

    public function testReplayIsDeduplicated(): void
    {
        [$token, $conversationId] = $this->userWithConversation('patient');
        $body = $this->chatBody($conversationId, 'Bonjour');
        $first = AiHttpHarness::request('POST', '/api/ai/chat', $token, $body);
        $replay = AiHttpHarness::request('POST', '/api/ai/chat', $token, $body);
        $this->assertSame(200, $replay['status'], $replay['raw']);
        $this->assertTrue($replay['json']['data']['deduplicated']);
        $this->assertSame($first['json']['data']['message']['id'], $replay['json']['data']['message']['id']);
    }

    public function testRegenerateReplacesTheLastAnswerOnChatAndStream(): void
    {
        [$token, $conversationId] = $this->userWithConversation('patient');
        [$otherToken] = $this->userWithConversation('patient');
        $first = AiHttpHarness::request('POST', '/api/ai/chat', $token, $this->chatBody($conversationId, 'Bonjour'));
        $firstId = (string) $first['json']['data']['message']['id'];
        $this->assertNull($first['json']['data']['replaced_message_id']);

        $regenerate = ['conversation_id' => $conversationId, 'regenerate_of' => $firstId, 'client_message_id' => Uuid::v4()];
        $second = AiHttpHarness::request('POST', '/api/ai/chat', $token, $regenerate);
        $this->assertSame(200, $second['status'], $second['raw']);
        $this->assertSame($firstId, $second['json']['data']['replaced_message_id']);
        $secondId = (string) $second['json']['data']['message']['id'];
        $this->assertNotSame($firstId, $secondId);

        $replay = AiHttpHarness::request('POST', '/api/ai/chat', $token, $regenerate);
        $this->assertTrue($replay['json']['data']['deduplicated']);
        $this->assertSame($secondId, $replay['json']['data']['message']['id']);

        $stale = AiHttpHarness::request('POST', '/api/ai/chat/stream', $token, [...$regenerate, 'client_message_id' => Uuid::v4()]);
        $this->assertSame(404, $stale['status'], 'La réponse remplacée n\'existe plus');
        $foreign = AiHttpHarness::request('POST', '/api/ai/chat', $otherToken, ['conversation_id' => $conversationId, 'regenerate_of' => $secondId]);
        $this->assertSame(404, $foreign['status'], 'Conversation d\'un autre utilisateur');

        $stream = AiHttpHarness::stream($token, ['conversation_id' => $conversationId, 'regenerate_of' => $secondId, 'client_message_id' => Uuid::v4()]);
        $names = array_column($stream['events'], 'event');
        $this->assertSame(['done', 'end'], array_slice($names, -2), $stream['raw']);
        $done = $stream['events'][count($names) - 2]['data'];
        $this->assertSame($secondId, $done['replaced_message_id']);

        $history = AiHttpHarness::request('GET', '/api/ai/conversations/' . $conversationId, $token);
        $this->assertSame(200, $history['status'], $history['raw']);
        $messages = $history['json']['data']['messages'];
        $roles = array_count_values(array_column($messages, 'role'));
        $this->assertSame(1, $roles['user'] ?? 0, 'La question n\'est jamais dupliquée');
        $this->assertContains($done['message']['id'], array_column($messages, 'id'));
        $this->assertNotContains($secondId, array_column($messages, 'id'));

        $next = AiHttpHarness::request('POST', '/api/ai/chat', $token, $this->chatBody($conversationId, 'Autre question'));
        $this->assertSame(200, $next['status'], $next['raw']);
        $notLast = AiHttpHarness::request('POST', '/api/ai/chat/stream', $token, ['conversation_id' => $conversationId, 'regenerate_of' => $done['message']['id']]);
        $this->assertSame(409, $notLast['status']);
        $this->assertSame('AI_REGENERATE_NOT_LAST', $notLast['json']['code'] ?? null);
    }

    public function testValidationAndOwnershipErrors(): void
    {
        [$token, $conversationId] = $this->userWithConversation('patient');
        [$otherToken] = $this->userWithConversation('patient');

        $tooLong = AiHttpHarness::request('POST', '/api/ai/chat', $token, $this->chatBody($conversationId, str_repeat('a', 4001)));
        $this->assertSame(400, $tooLong['status']);
        $this->assertSame('AI_MESSAGE_TOO_LONG', $tooLong['json']['code']);

        $badId = AiHttpHarness::request('POST', '/api/ai/chat', $token, $this->chatBody($conversationId, 'Salut', 'pas-un-uuid'));
        $this->assertSame(400, $badId['status']);
        $this->assertSame('VALIDATION_ERROR', $badId['json']['code']);

        $missing = AiHttpHarness::request('POST', '/api/ai/chat', $token, ['conversation_id' => $conversationId]);
        $this->assertSame(400, $missing['status']);

        $foreign = AiHttpHarness::request('POST', '/api/ai/chat', $otherToken, $this->chatBody($conversationId, 'Salut'));
        $this->assertSame(404, $foreign['status'], 'Conversation d\'un autre utilisateur');

        $foreignDoc = $this->fixtures->document($this->fixtures->profile('patient'), null);
        $withDoc = AiHttpHarness::request('POST', '/api/ai/chat', $token, $this->chatBody($conversationId, 'Analyse ce document') + ['medical_document_ids' => [$foreignDoc]]);
        $this->assertSame(403, $withDoc['status'], $withDoc['raw']);

        $unauthenticated = AiHttpHarness::request('POST', '/api/ai/chat', null, $this->chatBody($conversationId, 'Salut'));
        $this->assertSame(401, $unauthenticated['status']);
    }

    public function testLabAndAdminAreRefused(): void
    {
        foreach (['lab', 'super_admin'] as $role) {
            $token = AiHttpHarness::token($this->fixtures->profile($role), $role);
            foreach (['/api/ai/chat', '/api/ai/chat/stream'] as $path) {
                $response = AiHttpHarness::request('POST', $path, $token, $this->chatBody(Uuid::v4(), 'Bonjour'));
                $this->assertSame(403, $response['status'], "$role $path");
                $this->assertSame('AI_ROLE_NOT_SUPPORTED', $response['json']['code'] ?? null, "$role $path");
            }
        }
    }

    public function testEmergencyIsReturnedBeforeAnyModelAnswer(): void
    {
        [$token, $conversationId] = $this->userWithConversation('patient');
        $response = AiHttpHarness::request('POST', '/api/ai/chat', $token, $this->chatBody($conversationId, 'je veux me suicider'));
        $this->assertSame(200, $response['status']);
        $emergency = $response['json']['data']['emergency'];
        $this->assertSame('suicide', $emergency['kind']);
        $this->assertContains('3114', array_column($emergency['actions'], 'phone'));
        $this->assertNull($response['json']['data']['audit_id'], 'Aucun appel au modèle, donc aucun audit');
    }

    public function testPreleveurIsRedirectedToTheRequestFormWithoutDraft(): void
    {
        [$token, $conversationId] = $this->userWithConversation('preleveur');
        $response = AiHttpHarness::request('POST', '/api/ai/chat', $token, $this->chatBody($conversationId, 'Je veux prendre rendez-vous pour une prise de sang'));
        $this->assertSame(200, $response['status'], $response['raw']);
        $this->assertNull($response['json']['data']['draft']);
        $this->assertStringContainsString('Demander un prélèvement', (string) $response['json']['data']['message']['content']);
        $drafts = $this->db->prepare('SELECT COUNT(*) FROM ai_appointment_drafts WHERE conversation_id = ?');
        $drafts->execute([$conversationId]);
        $this->assertSame(0, (int) $drafts->fetchColumn());
    }

    public function testRateLimitReturns429WithRetryAfter(): void
    {
        $userId = $this->fixtures->profile('patient');
        $token = AiHttpHarness::token($userId, 'patient');
        $conversationId = (string) AiHttpHarness::request('POST', '/api/ai/conversations', $token, [])['json']['data']['id'];
        for ($i = 0; $i < 80; $i++) {
            RateLimit::allow('ai_chat', $userId, 80, 3600);
        }
        $response = AiHttpHarness::request('POST', '/api/ai/chat', $token, $this->chatBody($conversationId, 'Bonjour'));
        $this->assertSame(429, $response['status']);
        $this->assertSame('AI_RATE_LIMITED', $response['json']['code']);
        $this->assertGreaterThan(0, (int) ($response['headers']['retry-after'] ?? 0));
    }

    public function testMissingXaiKeyReturnsClean503(): void
    {
        [$token, $conversationId] = $this->userWithConversation('patient');
        $this->db->exec("UPDATE ai_task_routing SET provider = 'grok'");
        try {
            $response = AiHttpHarness::request('POST', '/api/ai/chat', $token, $this->chatBody($conversationId, 'Bonjour'));
            $stream = AiHttpHarness::stream($token, $this->chatBody($conversationId, 'Bonjour encore'));
        } finally {
            $this->db->exec("UPDATE ai_task_routing SET provider = 'local'");
        }
        $this->assertSame(503, $response['status'], $response['raw']);
        $this->assertSame('AI_UNAVAILABLE', $response['json']['code']);
        $this->assertGreaterThan(0, (int) ($response['headers']['retry-after'] ?? 0));
        $this->assertDoesNotMatchRegularExpression('/XAI|x\.ai|grok|curl|SQLSTATE/i', (string) $response['json']['error']);

        $error = array_values(array_filter($stream['events'], static fn (array $e): bool => $e['event'] === 'error'));
        $this->assertSame('AI_UNAVAILABLE', $error[0]['data']['code'] ?? null, $stream['raw']);
        $this->assertSame('end', end($stream['events'])['event']);

        $userMessages = $this->db->prepare('SELECT COUNT(*) FROM ai_messages WHERE conversation_id = ? AND role = \'user\'');
        $userMessages->execute([$conversationId]);
        $this->assertSame(0, (int) $userMessages->fetchColumn(), 'Un tour échoué ne laisse pas de message orphelin');
    }

    public function testStreamEventsAndContract(): void
    {
        [$token, $conversationId] = $this->userWithConversation('nurse');
        $stream = AiHttpHarness::stream($token, $this->chatBody($conversationId, 'Bonjour'));
        $this->assertSame(200, $stream['status']);
        $names = array_column($stream['events'], 'event');
        $this->assertSame('start', $names[0]);
        $this->assertContains('delta', $names);
        $this->assertSame(['done', 'end'], array_slice($names, -2), implode(',', $names));
        $done = $stream['events'][count($names) - 2]['data'];
        $this->assertArrayHasKey('disclaimer', $done);
        $this->assertIsArray($done['message']['sources']);
        $this->assertIsArray($done['suggestions']);
        $this->assertNull($done['emergency']);
        $text = implode('', array_map(static fn (array $e): string => (string) ($e['data']['text'] ?? ''), array_filter($stream['events'], static fn (array $e): bool => $e['event'] === 'delta')));
        $this->assertStringNotContainsString('[ref:', $text);
    }

    public function testStreamEmergencyEventPrecedesDone(): void
    {
        [$token, $conversationId] = $this->userWithConversation('patient');
        $stream = AiHttpHarness::stream($token, $this->chatBody($conversationId, "Je n'arrive plus à respirer"));
        $names = array_column($stream['events'], 'event');
        $emergencyAt = array_search('emergency', $names, true);
        $doneAt = array_search('done', $names, true);
        $this->assertNotFalse($emergencyAt, implode(',', $names));
        $this->assertLessThan($doneAt, $emergencyAt);
        $this->assertSame('respiratory', $stream['events'][$emergencyAt]['data']['kind']);
        $this->assertSame($stream['events'][$emergencyAt]['data'], $stream['events'][$doneAt]['data']['emergency']);
    }

    public function testStreamValidationIsPlainHttpBeforeOpeningTheStream(): void
    {
        [$token, $conversationId] = $this->userWithConversation('patient');
        $tooLong = AiHttpHarness::request('POST', '/api/ai/chat/stream', $token, $this->chatBody($conversationId, str_repeat('b', 4001)));
        $this->assertSame(400, $tooLong['status']);
        $this->assertSame('AI_MESSAGE_TOO_LONG', $tooLong['json']['code'] ?? null);
        $unknown = AiHttpHarness::request('POST', '/api/ai/chat/stream', $token, $this->chatBody(Uuid::v4(), 'Salut'));
        $this->assertSame(404, $unknown['status']);
    }
}

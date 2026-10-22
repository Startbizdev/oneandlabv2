<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../support/HttpHarness.php';
require_once __DIR__ . '/support/AssistantFixtures.php';
require_once __DIR__ . '/../../lib/assistant/AssistantConversationRepository.php';
require_once __DIR__ . '/../../lib/assistant/AssistantTools.php';

/** POST /api/assistant/chat via le routeur HTTP réel et le fournisseur mock. */
final class AssistantChatHttpTest extends TestCase
{
    private PDO $db;
    private AssistantFixtures $fixtures;

    protected function setUp(): void
    {
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN non défini');
        }
        $this->db = TestDatabase::pdo();
        $this->fixtures = new AssistantFixtures($this->db);
        HttpHarness::baseUrl();
        HttpHarness::mockInputs(true);
    }

    protected function tearDown(): void
    {
        if (isset($this->fixtures)) {
            $this->fixtures->cleanup();
        }
        parent::tearDown();
    }

    /** @return array{0: string, 1: string} id, token */
    private function user(string $role, string $first = 'Profil', string $last = 'Test'): array
    {
        $id = $this->fixtures->profile($role, $first, $last);

        return [$id, HttpHarness::token($id, $role)];
    }

    private static function body(string $message, array $extra = []): array
    {
        return ['message' => $message, 'client_message_id' => Uuid::v4(), ...$extra];
    }

    /** @param list<array{event: string, data: mixed}> $events */
    private static function names(array $events): array
    {
        return array_column($events, 'event');
    }

    /** @param list<array{event: string, data: mixed}> $events */
    private static function deltas(array $events): string
    {
        return implode('', array_map(static fn (array $e): string => $e['data']['text'], array_filter($events, static fn (array $e): bool => $e['event'] === 'delta')));
    }

    private static function providerInput(): string
    {
        return json_encode(HttpHarness::mockInputs(), JSON_UNESCAPED_UNICODE) ?: '';
    }

    public function testStreamsStartDeltasDoneEndAndKeepsIdentityAwayFromTheProvider(): void
    {
        [$userId, $token] = $this->user('patient', 'Jeanne', 'Martin');
        $message = 'Bonjour, je suis Jeanne Martin, tél 06 12 34 56 78, jeanne.martin@example.com, 12 rue des Lilas 75011 Paris.';
        $res = HttpHarness::stream($token, self::body($message));

        $this->assertSame(200, $res['status'], $res['raw']);
        $names = self::names($res['events']);
        $this->assertSame('start', $names[0]);
        $this->assertSame(['done', 'end'], array_slice($names, -2));
        $this->assertGreaterThan(3, count(array_keys($names, 'delta')), 'Stream mot à mot');
        $done = $res['events'][count($names) - 2]['data'];
        $this->assertSame(self::deltas($res['events']), $done['text']);
        $this->assertStringStartsWith('Bonjour Jeanne Martin !', $done['text'], 'Alias réhydraté dans le flux');
        $this->assertSame($res['events'][0]['data']['conversation_id'], $done['conversation_id']);
        $this->assertSame([], $done['actions']);

        $input = self::providerInput();
        $this->assertNotSame('', $input);
        foreach (['Jeanne', 'Martin', '06 12', 'example.com', 'Lilas', '75011'] as $leak) {
            $this->assertStringNotContainsString($leak, $input, $leak . ' ne doit pas partir chez le fournisseur');
        }
        $this->assertStringContainsString('Patient A', $input);

        $rows = $this->db->prepare('SELECT m.role, m.status, m.content_encrypted, c.title_encrypted FROM assistant_messages m JOIN assistant_conversations c ON c.id = m.conversation_id WHERE c.user_id = ? ORDER BY m.created_at');
        $rows->execute([$userId]);
        $stored = $rows->fetchAll(PDO::FETCH_ASSOC);
        $this->assertSame(['user', 'assistant'], array_column($stored, 'role'));
        $this->assertSame(['done', 'done'], array_column($stored, 'status'));
        foreach ($stored as $row) {
            foreach (['Bonjour', 'Jeanne', 'Cary'] as $plain) {
                $this->assertStringNotContainsString($plain, $row['content_encrypted'] . $row['title_encrypted'], 'Chiffré au repos');
            }
        }
    }

    public function testToolRoundEmitsStatusThenActionCardAndRehydratesToolNames(): void
    {
        [$patientId, $token] = $this->user('patient');
        $nurseId = $this->fixtures->profile('nurse', 'Hélène', 'Durand');
        $appointmentId = $this->fixtures->appointment($patientId, $nurseId);

        $res = HttpHarness::stream($token, self::body('Quels sont mes prochains rendez-vous ?'));
        $this->assertSame(200, $res['status'], $res['raw']);
        $names = self::names($res['events']);
        $this->assertSame('start', $names[0]);
        $this->assertSame(['done', 'end'], array_slice($names, -2));
        $statusIndex = array_search('status', $names, true);
        $actionIndex = array_search('action', $names, true);
        $firstDelta = array_search('delta', $names, true);
        $this->assertNotFalse($statusIndex);
        $this->assertNotFalse($actionIndex);
        $this->assertLessThan($firstDelta, $statusIndex, 'Les tours d\'outils n\'émettent que des statuts');
        $this->assertLessThan($firstDelta, $actionIndex);
        $this->assertSame('Je consulte vos rendez-vous…', $res['events'][$statusIndex]['data']['text']);
        $action = $res['events'][$actionIndex]['data'];
        $this->assertSame(['type' => 'open_appointment', 'label' => 'Voir le prochain rendez-vous', 'params' => ['id' => $appointmentId]], $action);

        $done = $res['events'][count($names) - 2]['data'];
        $this->assertSame([$action], $done['actions']);
        $this->assertStringContainsString('Vous avez 1 rendez-vous à venir', $done['text']);
        $this->assertStringContainsString(AssistantTools::dayLabel((new DateTimeImmutable('+1 day'))->format('Y-m-d')) . ' à 09:30', mb_strtolower($done['text']), 'Jour de la semaine fourni par l\'outil');
        $this->assertStringContainsString('(Confirmé)', $done['text'], 'Statut lisible, pas le code technique');
        $this->assertStringContainsString('Hélène Durand', $done['text'], 'Nom de l\'intervenant réhydraté');

        $inputs = HttpHarness::mockInputs();
        $this->assertCount(3, $inputs, 'get_my_appointments, propose_action puis réponse');
        $this->assertSame([], $inputs[2]['tools'], 'Dernier tour sans outils');
        $this->assertNotContains('get_tour', $inputs[0]['tools']);
        $this->assertNotContains('get_patient_summary', $inputs[0]['tools']);
        $all = self::providerInput();
        $this->assertStringContainsString($appointmentId, $all);
        $this->assertStringNotContainsString('Durand', $all);
        $this->assertStringNotContainsString('Hélène', $all);
    }

    public function testNurseTourToolIsAvailableToNurses(): void
    {
        [, $token] = $this->user('nurse');
        $res = HttpHarness::stream($token, self::body('Qu\'est-ce que j\'ai dans ma tournée aujourd\'hui ?'));
        $this->assertSame(200, $res['status'], $res['raw']);
        $statuses = array_values(array_filter($res['events'], static fn (array $e): bool => $e['event'] === 'status'));
        $this->assertSame('Je consulte la tournée…', $statuses[0]['data']['text'] ?? null);
        $this->assertStringStartsWith('Aucun passage n\'est prévu', $res['events'][count($res['events']) - 2]['data']['text']);
        $this->assertContains('get_patient_summary', HttpHarness::mockInputs()[0]['tools']);
    }

    public function testEmergencyIsAnsweredWithoutCallingTheProvider(): void
    {
        [, $token] = $this->user('patient');
        $res = HttpHarness::stream($token, self::body('J\'ai une douleur dans la poitrine qui serre depuis 10 minutes'));
        $this->assertSame(200, $res['status'], $res['raw']);
        $this->assertSame(['start', 'emergency', 'action', 'action', 'delta', 'done', 'end'], self::names($res['events']));
        $this->assertSame('15', $res['events'][1]['data']['number']);
        $this->assertSame(['type' => 'call_emergency', 'label' => 'Appeler le 15', 'params' => ['number' => '15']], $res['events'][2]['data']);
        $this->assertCount(2, $res['events'][5]['data']['actions']);
        $this->assertSame([], HttpHarness::mockInputs(), 'Aucun appel LLM');
    }

    public function testSameClientMessageIdIsReplayedWithoutNewProviderCall(): void
    {
        [, $token] = $this->user('patient');
        $body = self::body('Bonjour');
        $first = HttpHarness::stream($token, $body);
        $firstDone = $first['events'][count($first['events']) - 2]['data'];
        HttpHarness::mockInputs(true);

        $replay = HttpHarness::stream($token, $body);
        $this->assertSame(200, $replay['status']);
        $this->assertSame(['start', 'delta', 'done', 'end'], self::names($replay['events']));
        $this->assertSame($firstDone, $replay['events'][2]['data']);
        $this->assertSame($first['events'][0]['data'], $replay['events'][0]['data']);
        $this->assertSame($firstDone['text'], $replay['events'][1]['data']['text']);
        $this->assertSame([], HttpHarness::mockInputs());
    }

    public function testPendingTurnIsRejectedWith409(): void
    {
        [$userId, $token] = $this->user('patient');
        $repo = new AssistantConversationRepository($this->db);
        $conversation = $repo->create($userId, null, null, 'En cours');
        $clientMessageId = Uuid::v4();
        $repo->addMessage((string) $conversation['id'], 'user', 'Bonjour', [], $clientMessageId, 'pending');

        $res = HttpHarness::request('POST', '/api/assistant/chat', $token, ['message' => 'Bonjour', 'client_message_id' => $clientMessageId]);
        $this->assertSame(409, $res['status'], $res['raw']);
        $this->assertSame('ASSISTANT_MESSAGE_IN_PROGRESS', $res['json']['code']);

        $this->db->prepare("UPDATE assistant_messages SET status = 'error' WHERE client_message_id = ?")->execute([$clientMessageId]);
        $retry = HttpHarness::stream($token, ['message' => 'Bonjour', 'client_message_id' => $clientMessageId]);
        $this->assertSame(200, $retry['status'], 'Un tour en erreur est rejoué');
        $this->assertSame((string) $conversation['id'], $retry['events'][0]['data']['conversation_id']);
    }

    public function testRateLimitReturns429WithRetryAfter(): void
    {
        [$userId, $token] = $this->user('patient');
        $dir = __DIR__ . '/../../uploads/rate-limit';
        @mkdir($dir, 0755, true);
        $file = $dir . '/' . hash('sha256', 'assistant_chat:' . $userId) . '.json';
        file_put_contents($file, json_encode(['start' => time(), 'count' => 60]));
        try {
            $res = HttpHarness::request('POST', '/api/assistant/chat', $token, self::body('Bonjour'));
        } finally {
            @unlink($file);
        }
        $this->assertSame(429, $res['status'], $res['raw']);
        $this->assertSame('ASSISTANT_RATE_LIMITED', $res['json']['code']);
        $this->assertGreaterThan(0, $res['json']['retry_after']);
        $this->assertArrayHasKey('retry-after', $res['headers']);
    }

    public function testRolesAndAuthentication(): void
    {
        foreach (['lab', 'subaccount', 'super_admin'] as $role) {
            [, $token] = $this->user($role);
            $res = HttpHarness::request('POST', '/api/assistant/chat', $token, self::body('Bonjour'));
            $this->assertSame(403, $res['status'], $role);
            $this->assertSame('ASSISTANT_ROLE_NOT_SUPPORTED', $res['json']['code'], $role);
        }
        $this->assertSame(401, HttpHarness::request('POST', '/api/assistant/chat', null, self::body('Bonjour'))['status']);
        [, $token] = $this->user('patient');
        $this->assertSame(405, HttpHarness::request('GET', '/api/assistant/chat', $token)['status']);
    }

    public function testValidation(): void
    {
        [, $token] = $this->user('patient');
        $cases = [
            'message manquant' => ['client_message_id' => Uuid::v4()],
            'message vide' => self::body('   '),
            'message trop long' => self::body(str_repeat('a', 4001)),
            'client_message_id manquant' => ['message' => 'Bonjour'],
            'client_message_id invalide' => ['message' => 'Bonjour', 'client_message_id' => 'abc'],
            'conversation_id invalide' => self::body('Bonjour', ['conversation_id' => '42']),
            'context invalide' => self::body('Bonjour', ['context' => ['type' => 'admin']]),
        ];
        foreach ($cases as $label => $body) {
            $res = HttpHarness::request('POST', '/api/assistant/chat', $token, $body);
            $this->assertSame(400, $res['status'], $label . ' ' . $res['raw']);
            $this->assertSame('VALIDATION_ERROR', $res['json']['code'], $label);
        }
        $this->assertSame([], HttpHarness::mockInputs());
    }

    public function testCrossPatientAndForeignConversationAreDenied(): void
    {
        [$patientId, $patientToken] = $this->user('patient');
        [$otherId, $otherToken] = $this->user('patient');
        [, $nurseToken] = $this->user('nurse');

        $nurse = HttpHarness::request('POST', '/api/assistant/chat', $nurseToken, self::body('Résumé du dossier', ['patient_id' => $patientId]));
        $this->assertSame(403, $nurse['status'], $nurse['raw']);
        $this->assertSame('FORBIDDEN', $nurse['json']['code']);
        $patient = HttpHarness::request('POST', '/api/assistant/chat', $patientToken, self::body('Bonjour', ['patient_id' => $otherId]));
        $this->assertSame(403, $patient['status']);

        $own = HttpHarness::stream($otherToken, self::body('Bonjour'));
        $foreign = HttpHarness::request('POST', '/api/assistant/chat', $patientToken, self::body('Bonjour', ['conversation_id' => $own['events'][0]['data']['conversation_id']]));
        $this->assertSame(404, $foreign['status']);
        $this->assertSame('NOT_FOUND', $foreign['json']['code']);
    }

    public function testStaffSelectedPatientIsAliasedAndToolsUseItsDossier(): void
    {
        [$nurseId, $nurseToken] = $this->user('nurse');
        [$followedId] = $this->user('patient', 'Marc', 'Leroy');
        $this->fixtures->appointment($followedId, $nurseId);
        $res = HttpHarness::stream($nurseToken, self::body('Quels sont ses derniers résultats ?', ['patient_id' => $followedId]));
        $this->assertSame(200, $res['status'], $res['raw']);
        $tool = array_values(array_filter(HttpHarness::mockInputs()[1]['messages'], static fn (array $m): bool => $m['role'] === 'tool'));
        $this->assertSame([], json_decode($tool[0]['content'], true)['items']);
        $this->assertStringContainsString('Dossier sélectionné : Patient A', HttpHarness::mockInputs()[0]['messages'][0]['content']);
        $this->assertStringNotContainsString('Leroy', self::providerInput());
    }

    public function testAttachedImageGoesToVisionAndForeignDocumentIsRefused(): void
    {
        [$patientId, $token] = $this->user('patient');
        [$otherId] = $this->user('patient');
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==');
        $own = $this->fixtures->document($patientId, $patientId, 'image/png', (string) $png);
        $foreign = $this->fixtures->document($otherId, $otherId, 'image/png', (string) $png);

        $res = HttpHarness::stream($token, self::body('Que dit mon ordonnance ?', ['document_id' => $own]));
        $this->assertSame(200, $res['status'], $res['raw']);
        $messages = HttpHarness::mockInputs()[0]['messages'];
        $content = $messages[count($messages) - 1]['content'];
        $this->assertSame('image_url', $content[1]['type']);
        $this->assertSame('data:image/png;base64,' . base64_encode((string) $png), $content[1]['image_url']['url']);

        $denied = HttpHarness::request('POST', '/api/assistant/chat', $token, self::body('Et celle-ci ?', ['document_id' => $foreign]));
        $this->assertSame(403, $denied['status'], $denied['raw']);
        $missing = HttpHarness::request('POST', '/api/assistant/chat', $token, self::body('Et celle-ci ?', ['document_id' => Uuid::v4()]));
        $this->assertSame(404, $missing['status']);
    }
}

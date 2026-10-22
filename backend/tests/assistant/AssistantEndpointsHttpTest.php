<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../support/HttpHarness.php';
require_once __DIR__ . '/support/AssistantFixtures.php';

/** Historique (/assistant/conversations) et dictée (/assistant/dictation). */
final class AssistantEndpointsHttpTest extends TestCase
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

    private function chat(string $token, string $message): string
    {
        $res = HttpHarness::stream($token, ['message' => $message, 'client_message_id' => Uuid::v4()]);
        $this->assertSame(200, $res['status'], $res['raw']);

        return (string) $res['events'][0]['data']['conversation_id'];
    }

    public function testListDetailAndDeleteConversations(): void
    {
        $userId = $this->fixtures->profile('patient');
        $token = HttpHarness::token($userId, 'patient');
        $otherToken = HttpHarness::token($this->fixtures->profile('patient'), 'patient');
        $first = $this->chat($token, 'Comment se préparer à une prise de sang ?');
        $second = $this->chat($token, str_repeat('Question longue ', 10));

        $list = HttpHarness::request('GET', '/api/assistant/conversations?page=1&limit=20', $token);
        $this->assertSame(200, $list['status'], $list['raw']);
        $this->assertTrue($list['json']['success']);
        $this->assertSame([$second, $first], array_column($list['json']['data'], 'id'), 'Plus récente en premier');
        $item = $list['json']['data'][0];
        $this->assertSame(['id', 'title', 'updated_at', 'last_message_preview'], array_keys($item));
        $this->assertSame(60, mb_strlen($item['title']));
        $this->assertStringStartsWith('Mode démonstration', $item['last_message_preview']);
        $this->assertSame(['page' => 1, 'limit' => 20, 'total' => 2, 'pages' => 1], $list['json']['pagination']);
        $this->assertSame([], HttpHarness::request('GET', '/api/assistant/conversations', $otherToken)['json']['data']);

        $detail = HttpHarness::request('GET', '/api/assistant/conversations/' . $first . '?limit=30', $token);
        $this->assertSame(200, $detail['status'], $detail['raw']);
        $data = $detail['json']['data'];
        $this->assertSame($first, $data['id']);
        $this->assertSame('Comment se préparer à une prise de sang ?', $data['title']);
        $this->assertSame(['user', 'assistant'], array_column($data['messages'], 'role'));
        $this->assertSame(['id', 'role', 'text', 'actions', 'created_at'], array_keys($data['messages'][0]));
        $this->assertSame('Comment se préparer à une prise de sang ?', $data['messages'][0]['text']);
        $page = HttpHarness::request('GET', '/api/assistant/conversations/' . $first . '?limit=1', $token)['json']['data'];
        $this->assertSame(['assistant'], array_column($page['messages'], 'role'));
        $older = HttpHarness::request('GET', '/api/assistant/conversations/' . $first . '?limit=1&before=' . $page['messages'][0]['id'], $token)['json']['data'];
        $this->assertSame(['user'], array_column($older['messages'], 'role'));

        $this->assertSame(404, HttpHarness::request('GET', '/api/assistant/conversations/' . $first, $otherToken)['status']);
        $this->assertSame(404, HttpHarness::request('DELETE', '/api/assistant/conversations/' . $first, $otherToken)['status']);
        $deleted = HttpHarness::request('DELETE', '/api/assistant/conversations/' . $first, $token);
        $this->assertSame(['success' => true], $deleted['json']);
        $this->assertSame(404, HttpHarness::request('GET', '/api/assistant/conversations/' . $first, $token)['status']);
        $count = $this->db->prepare('SELECT COUNT(*) FROM assistant_messages WHERE conversation_id = ?');
        $count->execute([$first]);
        $this->assertSame(0, (int) $count->fetchColumn(), 'Suppression réelle');
        $this->assertSame(403, HttpHarness::request('GET', '/api/assistant/conversations', HttpHarness::token($this->fixtures->profile('lab'), 'lab'))['status']);
    }

    public function testDictationFormatsWithoutLeakingIdentityAndStoresNothing(): void
    {
        $nurseId = $this->fixtures->profile('nurse');
        $patientId = $this->fixtures->profile('patient', 'Odile', 'Bernard', '1940-05-12');
        $appointmentId = $this->fixtures->appointment($patientId, $nurseId);
        $token = HttpHarness::token($nurseId, 'nurse');

        $res = HttpHarness::request('POST', '/api/assistant/dictation', $token, [
            'transcript' => 'Passage chez Odile Bernard, pansement refait, elle demande qu\'on rappelle sa fille au 06 11 22 33 44',
            'patient_id' => $patientId,
            'appointment_id' => $appointmentId,
        ]);
        $this->assertSame(200, $res['status'], $res['raw']);
        $text = $res['json']['data']['text'];
        $this->assertStringContainsString('Odile Bernard', $text, 'Nom réhydraté');
        $this->assertStringContainsString('[téléphone masqué]', $text);
        $input = json_encode(HttpHarness::mockInputs(), JSON_UNESCAPED_UNICODE);
        $this->assertStringNotContainsString('Odile', (string) $input);
        $this->assertStringNotContainsString('06 11', (string) $input);
        $count = $this->db->prepare('SELECT COUNT(*) FROM assistant_conversations WHERE user_id = ?');
        $count->execute([$nurseId]);
        $this->assertSame(0, (int) $count->fetchColumn());
    }

    public function testDictationAccessAndValidation(): void
    {
        $nurseToken = HttpHarness::token($this->fixtures->profile('nurse'), 'nurse');
        $patientId = $this->fixtures->profile('patient');

        $patient = HttpHarness::request('POST', '/api/assistant/dictation', HttpHarness::token($patientId, 'patient'), ['transcript' => 'x', 'patient_id' => $patientId]);
        $this->assertSame(403, $patient['status']);
        $this->assertSame('ASSISTANT_ROLE_NOT_SUPPORTED', $patient['json']['code']);
        $foreign = HttpHarness::request('POST', '/api/assistant/dictation', $nurseToken, ['transcript' => 'Pansement refait', 'patient_id' => $patientId]);
        $this->assertSame(403, $foreign['status']);
        $this->assertSame('FORBIDDEN', $foreign['json']['code']);
        foreach ([['patient_id' => $patientId], ['transcript' => 'x'], ['transcript' => str_repeat('a', 8001), 'patient_id' => $patientId], ['transcript' => 'x', 'patient_id' => $patientId, 'appointment_id' => 'nope']] as $body) {
            $res = HttpHarness::request('POST', '/api/assistant/dictation', $nurseToken, $body);
            $this->assertSame(400, $res['status'], $res['raw']);
            $this->assertSame('VALIDATION_ERROR', $res['json']['code']);
        }
        $this->assertSame([], HttpHarness::mockInputs());
    }
}

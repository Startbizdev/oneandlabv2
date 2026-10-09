<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/support/AiTestFixtures.php';
require_once __DIR__ . '/support/AiHttpHarness.php';
require_once __DIR__ . '/../../lib/ai/AiReportService.php';

/**
 * Un test HTTP par endpoint IA (hors chat) : rôles, propriété des ressources, codes 400 / 403 / 404 / 409.
 */
final class AiEndpointsHttpTest extends TestCase
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

    /** @return array{0: string, 1: string} user_id, token */
    private function user(string $role): array
    {
        $id = $this->fixtures->profile($role);

        return [$id, AiHttpHarness::token($id, $role)];
    }

    private function conversation(string $token): string
    {
        $created = AiHttpHarness::request('POST', '/api/ai/conversations', $token, []);
        $this->assertSame(201, $created['status'], $created['raw']);

        return (string) $created['json']['data']['id'];
    }

    public function testConversationsIndex(): void
    {
        [$patientId, $token] = $this->user('patient');
        $appointment = $this->fixtures->appointment($patientId);

        $created = AiHttpHarness::request('POST', '/api/ai/conversations', $token, ['context_type' => 'appointment', 'context_id' => $appointment]);
        $again = AiHttpHarness::request('POST', '/api/ai/conversations', $token, ['context_type' => 'appointment', 'context_id' => $appointment]);
        $this->assertSame(201, $created['status'], $created['raw']);
        $this->assertSame(200, $again['status']);
        $this->assertSame($created['json']['data']['id'], $again['json']['data']['id']);

        $list = AiHttpHarness::request('GET', '/api/ai/conversations', $token);
        $this->assertSame(200, $list['status']);
        $this->assertContains($created['json']['data']['id'], array_column($list['json']['data'], 'id'));

        $this->assertSame(400, AiHttpHarness::request('POST', '/api/ai/conversations', $token, ['context_type' => 'billing', 'context_id' => Uuid::v4()])['status']);
        $foreign = $this->fixtures->appointment($this->fixtures->profile('patient'));
        $this->assertSame(403, AiHttpHarness::request('POST', '/api/ai/conversations', $token, ['context_type' => 'appointment', 'context_id' => $foreign])['status']);
        $this->assertSame(404, AiHttpHarness::request('POST', '/api/ai/conversations', $token, ['context_type' => 'appointment', 'context_id' => Uuid::v4()])['status']);

        [, $labToken] = $this->user('lab');
        $this->assertSame(403, AiHttpHarness::request('GET', '/api/ai/conversations', $labToken)['status']);
    }

    public function testConversationDetailHistoryPatchAndDelete(): void
    {
        [, $token] = $this->user('patient');
        [, $otherToken] = $this->user('patient');
        $conversationId = $this->conversation($token);
        foreach (['Bonjour', 'Merci'] as $message) {
            AiHttpHarness::request('POST', '/api/ai/chat', $token, ['conversation_id' => $conversationId, 'message' => $message, 'client_message_id' => Uuid::v4()]);
        }

        $page = AiHttpHarness::request('GET', '/api/ai/conversations/' . $conversationId . '?limit=2', $token);
        $this->assertSame(200, $page['status'], $page['raw']);
        $this->assertTrue($page['json']['data']['has_more']);
        $this->assertSame(['user', 'assistant'], array_column($page['json']['data']['messages'], 'role'));
        $this->assertSame('Merci', $page['json']['data']['messages'][0]['content']);
        $this->assertIsArray($page['json']['data']['messages'][1]['sources']);

        $before = AiHttpHarness::request('GET', '/api/ai/conversations/' . $conversationId . '?before=' . $page['json']['data']['messages'][0]['id'], $token);
        $this->assertFalse($before['json']['data']['has_more']);
        $this->assertSame('Bonjour', $before['json']['data']['messages'][1]['content']);

        $this->assertSame(400, AiHttpHarness::request('GET', '/api/ai/conversations/' . $conversationId . '?limit=abc', $token)['status']);
        $this->assertSame(404, AiHttpHarness::request('GET', '/api/ai/conversations/' . $conversationId, $otherToken)['status']);
        $this->assertSame(404, AiHttpHarness::request('PATCH', '/api/ai/conversations/' . $conversationId, $otherToken, ['custom_title' => 'x'])['status']);
        $this->assertSame(404, AiHttpHarness::request('DELETE', '/api/ai/conversations/' . $conversationId, $otherToken)['status']);

        $this->assertSame(200, AiHttpHarness::request('PATCH', '/api/ai/conversations/' . $conversationId, $token, ['custom_title' => 'Mon bilan'])['status']);
        $this->assertSame(200, AiHttpHarness::request('DELETE', '/api/ai/conversations/' . $conversationId, $token)['status']);
        $this->assertSame(404, AiHttpHarness::request('GET', '/api/ai/conversations/' . $conversationId, $token)['status']);
    }

    public function testEnsureSystem(): void
    {
        [$userId, $token] = $this->user('nurse');
        $ensure = ['method' => 'POST', 'path' => '/api/ai/conversations/ensure-system', 'token' => $token, 'body' => ['system_key' => 'assistant_health']];
        $concurrent = AiHttpHarness::parallel(array_fill(0, 6, $ensure));
        $this->assertSame(array_fill(0, 6, 200), array_column($concurrent, 'status'), $concurrent[0]['raw']);
        $this->assertCount(1, array_unique(array_map(static fn (array $r): string => (string) $r['json']['data']['id'], $concurrent)));
        $rows = $this->db->prepare("SELECT COUNT(*) FROM ai_conversations WHERE user_id = ? AND system_key = 'assistant_health'");
        $rows->execute([$userId]);
        $this->assertSame(1, (int) $rows->fetchColumn(), 'Appels simultanés : une seule conversation système');

        $first = AiHttpHarness::request('POST', '/api/ai/conversations/ensure-system', $token, ['system_key' => 'assistant_health']);
        $again = AiHttpHarness::request('POST', '/api/ai/conversations/ensure-system', $token, ['system_key' => 'assistant_health']);
        $this->assertSame(200, $first['status'], $first['raw']);
        $this->assertSame($first['json']['data']['id'], $again['json']['data']['id']);
        $this->assertSame($concurrent[0]['json']['data']['id'], $first['json']['data']['id']);
        $this->assertSame(400, AiHttpHarness::request('POST', '/api/ai/conversations/ensure-system', $token, ['system_key' => 'root'])['status']);
    }

    public function testConversationAttachments(): void
    {
        [$patientId, $token] = $this->user('patient');
        [, $otherToken] = $this->user('patient');
        $conversationId = $this->conversation($token);
        $ownDoc = $this->fixtures->document($patientId, $patientId);
        $foreignDoc = $this->fixtures->document($this->fixtures->profile('patient'), null);
        $path = '/api/ai/conversations/' . $conversationId . '/attachments';

        $attached = AiHttpHarness::request('POST', $path, $token, ['medical_document_id' => $ownDoc]);
        $this->assertSame(201, $attached['status'], $attached['raw']);
        $this->assertSame(403, AiHttpHarness::request('POST', $path, $token, ['medical_document_id' => $foreignDoc])['status']);
        $this->assertSame(404, AiHttpHarness::request('POST', $path, $token, ['medical_document_id' => Uuid::v4()])['status']);
        $this->assertSame(400, AiHttpHarness::request('POST', $path, $token, [])['status']);
        $this->assertSame(404, AiHttpHarness::request('GET', $path, $otherToken)['status']);
        $list = AiHttpHarness::request('GET', $path, $token);
        $this->assertSame(200, $list['status']);
        $this->assertCount(1, $list['json']['data']);
    }

    public function testDocumentAnalyze(): void
    {
        [$patientId, $token] = $this->user('patient');
        $ownDoc = $this->fixtures->document($patientId, $patientId);
        $foreignDoc = $this->fixtures->document($this->fixtures->profile('patient'), null);

        $queued = AiHttpHarness::request('POST', '/api/ai/documents/' . $ownDoc . '/analyze', $token);
        $this->assertSame(202, $queued['status'], $queued['raw']);
        $this->assertSame('pending', $queued['json']['data']['status']);
        $this->assertSame(403, AiHttpHarness::request('POST', '/api/ai/documents/' . $foreignDoc . '/analyze', $token)['status']);
        $this->assertSame(404, AiHttpHarness::request('POST', '/api/ai/documents/' . Uuid::v4() . '/analyze', $token)['status']);
    }

    public function testQuickSuggestions(): void
    {
        [, $token] = $this->user('pro');
        $response = AiHttpHarness::request('GET', '/api/ai/quick-suggestions', $token);
        $this->assertSame(200, $response['status'], $response['raw']);
        $this->assertIsArray($response['json']['data']['suggestions']);
        $this->assertNotSame('', $response['json']['data']['disclaimer']);
        $foreignPatient = $this->fixtures->profile('patient');
        $this->assertSame(403, AiHttpHarness::request('GET', '/api/ai/quick-suggestions?patient_id=' . $foreignPatient, $token)['status']);
    }

    public function testSearch(): void
    {
        [, $token] = $this->user('patient');
        $conversationId = $this->conversation($token);
        AiHttpHarness::request('POST', '/api/ai/chat', $token, ['conversation_id' => $conversationId, 'message' => 'ferritine basse', 'client_message_id' => Uuid::v4()]);
        [, $otherToken] = $this->user('patient');

        $own = AiHttpHarness::request('GET', '/api/ai/search?q=ferritine', $token);
        $this->assertSame(200, $own['status'], $own['raw']);
        $this->assertNotEmpty($own['json']['data']['messages']);
        $other = AiHttpHarness::request('GET', '/api/ai/search?q=ferritine', $otherToken);
        $this->assertSame([], $other['json']['data']['messages'], 'Recherche limitée aux conversations de l\'utilisateur');
    }

    public function testExport(): void
    {
        [$userId, $token] = $this->user('patient');
        $this->conversation($token);
        $response = AiHttpHarness::request('GET', '/api/ai/export', $token);
        $this->assertSame(200, $response['status'], $response['raw']);
        $this->assertStringContainsString($userId, $response['raw']);
    }

    public function testFeedback(): void
    {
        [, $token] = $this->user('patient');
        [, $otherToken] = $this->user('patient');
        $conversationId = $this->conversation($token);

        $this->assertSame(201, AiHttpHarness::request('POST', '/api/ai/feedback', $token, ['rating' => 5, 'conversation_id' => $conversationId])['status']);
        $this->assertSame(400, AiHttpHarness::request('POST', '/api/ai/feedback', $token, ['rating' => 9])['status']);
        $this->assertSame(404, AiHttpHarness::request('POST', '/api/ai/feedback', $otherToken, ['rating' => 1, 'conversation_id' => $conversationId])['status']);
    }

    /** @return array<string, mixed> */
    private function readyBloodTestPayload(): array
    {
        return [
            'type' => 'blood_test',
            'address' => ['label' => '12 rue de Rivoli, 75004 Paris', 'lat' => 48.8556, 'lng' => 2.3600],
            'scheduled_at' => (new DateTimeImmutable('+3 days'))->format('Y-m-d') . 'T09:00:00',
            'availability' => ['type' => 'all_day'],
            'ordonnance_status' => 'deferred',
        ];
    }

    public function testBookingDraftsAndConcurrentConfirmation(): void
    {
        [$patientId, $token] = $this->user('patient');
        $created = AiHttpHarness::request('POST', '/api/ai/booking/drafts', $token, ['payload' => $this->readyBloodTestPayload()]);
        $this->assertSame(201, $created['status'], $created['raw']);
        $draftId = (string) $created['json']['data']['id'];
        $this->assertSame('ready', $created['json']['data']['status'], $created['raw']);

        [, $otherToken] = $this->user('patient');
        $this->assertSame(404, AiHttpHarness::request('GET', '/api/ai/booking/drafts/' . $draftId, $otherToken)['status']);
        $this->assertSame(404, AiHttpHarness::request('POST', '/api/ai/booking/drafts/' . $draftId . '/confirm', $otherToken, [])['status']);

        $confirm = ['method' => 'POST', 'path' => '/api/ai/booking/drafts/' . $draftId . '/confirm', 'token' => $token, 'body' => []];
        $results = AiHttpHarness::parallel([$confirm, $confirm]);
        $statuses = array_column($results, 'status');
        sort($statuses);
        $this->assertSame([200, 409], $statuses, json_encode($results, JSON_UNESCAPED_UNICODE));
        $conflict = $results[0]['status'] === 409 ? $results[0] : $results[1];
        $this->assertSame('DRAFT_ALREADY_CONFIRMED', $conflict['json']['code'] ?? null);

        $appointments = $this->db->prepare('SELECT COUNT(*) FROM appointments WHERE patient_id = ? AND created_by = ?');
        $appointments->execute([$patientId, $patientId]);
        $this->assertSame(1, (int) $appointments->fetchColumn(), 'Un seul rendez-vous créé');
    }

    public function testStaffConfirmationRequiresPatientConsentAndDossierAccess(): void
    {
        [$nurseId, $token] = $this->user('nurse');
        $patient = $this->fixtures->profile('patient');
        $this->fixtures->appointment($patient, $nurseId);
        $stranger = $this->fixtures->profile('patient');

        $draft = AiHttpHarness::request('POST', '/api/ai/booking/drafts', $token, ['payload' => $this->readyBloodTestPayload() + ['patient_mode' => 'existing', 'patient_id' => $patient]]);
        $this->assertSame(201, $draft['status'], $draft['raw']);
        $draftId = (string) $draft['json']['data']['id'];

        $forged = AiHttpHarness::request('PATCH', '/api/ai/booking/drafts/' . $draftId, $token, ['patient_id' => $stranger, 'patient_mode' => 'existing']);
        $this->assertSame(403, $forged['status'], 'Patient hors dossier : ' . $forged['raw']);

        $noConsent = AiHttpHarness::request('POST', '/api/ai/booking/drafts/' . $draftId . '/confirm', $token, []);
        $this->assertSame(400, $noConsent['status']);
        $this->assertSame('PATIENT_BOOKING_CONSENT_REQUIRED', $noConsent['json']['code']);
        $drafts = $this->db->prepare('SELECT status FROM ai_appointment_drafts WHERE id = ?');
        $drafts->execute([$draftId]);
        $this->assertNotSame('confirmed', $drafts->fetchColumn());
    }

    public function testPreleveurCannotUseBookingDrafts(): void
    {
        [, $token] = $this->user('preleveur');
        $this->assertSame(403, AiHttpHarness::request('POST', '/api/ai/booking/drafts', $token, ['payload' => $this->readyBloodTestPayload()])['status']);
        $this->assertSame(403, AiHttpHarness::request('POST', '/api/ai/booking/drafts/' . Uuid::v4() . '/confirm', $token, [])['status']);
    }

    public function testVoiceSessionTurnAndEnd(): void
    {
        [, $token] = $this->user('patient');
        [, $otherToken] = $this->user('patient');
        $session = AiHttpHarness::request('POST', '/api/ai/voice/sessions', $token, []);
        $this->assertSame(201, $session['status'], $session['raw']);
        $sessionId = (string) $session['json']['data']['id'];
        $this->assertSame('fr', $session['json']['data']['locale']);

        $turn = AiHttpHarness::request('POST', '/api/ai/voice/sessions/' . $sessionId . '/turn', $token, ['transcript' => 'Bonjour Cary', 'stt_provider' => 'device']);
        $this->assertSame(200, $turn['status'], $turn['raw']);
        $this->assertNotSame('', $turn['json']['data']['assistant_text']);
        $this->assertNull($turn['json']['data']['emergency']);

        $emergency = AiHttpHarness::request('POST', '/api/ai/voice/sessions/' . $sessionId . '/turn', $token, ['transcript' => 'mon fils a bu de la javel', 'stt_provider' => 'device']);
        $this->assertSame('poisoning', $emergency['json']['data']['emergency']['kind'] ?? null, $emergency['raw']);

        $audio = AiHttpHarness::request('POST', '/api/ai/voice/sessions/' . $sessionId . '/turn', $token, ['audio_base64' => base64_encode('pcm')]);
        $this->assertSame(503, $audio['status'], 'Transcription serveur sans clé xAI');
        $this->assertSame('AI_UNAVAILABLE', $audio['json']['code']);

        $tooLong = AiHttpHarness::request('POST', '/api/ai/voice/sessions/' . $sessionId . '/turn', $token, ['transcript' => str_repeat('a', 4001), 'stt_provider' => 'device']);
        $this->assertSame('AI_MESSAGE_TOO_LONG', $tooLong['json']['code'] ?? null);

        $this->assertSame(404, AiHttpHarness::request('POST', '/api/ai/voice/sessions/' . $sessionId . '/turn', $otherToken, ['transcript' => 'Bonjour', 'stt_provider' => 'device'])['status']);
        $this->assertSame(404, AiHttpHarness::request('POST', '/api/ai/voice/sessions/' . $sessionId . '/end', $otherToken)['status']);
        $this->assertSame(200, AiHttpHarness::request('POST', '/api/ai/voice/sessions/' . $sessionId . '/end', $token)['status']);
        $ended = AiHttpHarness::request('POST', '/api/ai/voice/sessions/' . $sessionId . '/turn', $token, ['transcript' => 'Encore', 'stt_provider' => 'device']);
        $this->assertSame(409, $ended['status']);
        $this->assertSame('VOICE_SESSION_ENDED', $ended['json']['code']);

        $this->assertSame(404, AiHttpHarness::request('POST', '/api/ai/voice/sessions', $token, ['conversation_id' => $this->conversation($otherToken)])['status']);
    }

    public function testVoiceRealtimeEventsAndToolsRequireRealtimeSession(): void
    {
        [$userId, $token] = $this->user('patient');
        $realtime = AiHttpHarness::request('POST', '/api/ai/voice/realtime', $token, []);
        $this->assertSame(403, $realtime['status'], 'Voix temps réel hors liste autorisée');

        $sessionId = (string) AiHttpHarness::request('POST', '/api/ai/voice/sessions', $token, ['skip_welcome_tts' => true])['json']['data']['id'];
        $event = ['event_id' => 'evt-1', 'event_type' => 'user.transcript.final', 'payload' => ['transcript' => 'Bonjour Cary', 'draft' => ['status' => 'confirmed']]];
        $this->assertSame(400, AiHttpHarness::request('POST', '/api/ai/voice/sessions/' . $sessionId . '/events', $token, $event)['status'], 'Session REST');
        $this->assertSame(400, AiHttpHarness::request('POST', '/api/ai/voice/sessions/' . $sessionId . '/tool', $token, ['name' => 'search_cary_context', 'arguments' => ['query' => 'bilan']])['status']);

        $this->db->prepare('UPDATE voice_sessions SET transport = \'realtime\' WHERE id = ? AND user_id = ?')->execute([$sessionId, $userId]);
        $synced = AiHttpHarness::request('POST', '/api/ai/voice/sessions/' . $sessionId . '/events', $token, $event);
        $this->assertSame(200, $synced['status'], $synced['raw']);
        $this->assertNull($synced['json']['data']['draft'], 'Un brouillon envoyé par le client est ignoré');
        $storedEvent = $this->db->prepare('SELECT payload_json FROM voice_realtime_events WHERE session_id = ? AND event_id = ?');
        $storedEvent->execute([$sessionId, 'evt-1']);
        $this->assertArrayNotHasKey('draft', json_decode((string) $storedEvent->fetchColumn(), true));
        $duplicate = AiHttpHarness::request('POST', '/api/ai/voice/sessions/' . $sessionId . '/events', $token, $event);
        $this->assertTrue($duplicate['json']['data']['duplicate']);

        $stored = $this->db->prepare('SELECT m.metadata_json FROM ai_messages m JOIN voice_sessions s ON s.ai_conversation_id = m.conversation_id WHERE s.id = ? AND m.role = \'user\'');
        $stored->execute([$sessionId]);
        $metadata = json_decode((string) $stored->fetchColumn(), true);
        $this->assertTrue($metadata['unverified'] ?? false, 'Transcription client marquée non vérifiée');

        $tool = AiHttpHarness::request('POST', '/api/ai/voice/sessions/' . $sessionId . '/tool', $token, ['name' => 'confirm_appointment', 'arguments' => []]);
        $this->assertSame(400, $tool['status'], 'Outil hors catalogue');

        [, $preleveurToken] = $this->user('preleveur');
        $preleveurSession = (string) AiHttpHarness::request('POST', '/api/ai/voice/sessions', $preleveurToken, ['skip_welcome_tts' => true])['json']['data']['id'];
        $this->db->prepare('UPDATE voice_sessions SET transport = \'realtime\' WHERE id = ?')->execute([$preleveurSession]);
        $booking = AiHttpHarness::request('POST', '/api/ai/voice/sessions/' . $preleveurSession . '/tool', $preleveurToken, ['name' => 'update_booking_draft', 'arguments' => ['patch' => ['type' => 'blood_test']]]);
        $this->assertSame(400, $booking['status'], 'Préleveur : pas d\'outil de réservation');
    }

    public function testReports(): void
    {
        [$nurseId, $token] = $this->user('nurse');
        $patient = $this->fixtures->profile('patient');
        $appointment = $this->fixtures->appointment($patient, $nurseId);
        $stranger = $this->fixtures->profile('patient');

        $created = AiHttpHarness::request('POST', '/api/ai/reports/dictate', $token, ['patient_id' => $patient, 'appointment_id' => $appointment, 'transcript' => 'Pansement refait, plaie propre.']);
        $this->assertSame(201, $created['status'], $created['raw']);
        $reportId = (string) $created['json']['data']['id'];
        $this->assertSame(403, AiHttpHarness::request('POST', '/api/ai/reports/dictate', $token, ['patient_id' => $stranger, 'transcript' => 'x'])['status']);
        $this->assertSame(404, AiHttpHarness::request('POST', '/api/ai/reports/dictate', $token, ['patient_id' => $patient, 'appointment_id' => $this->fixtures->appointment($stranger), 'transcript' => 'x'])['status']);
        $this->assertSame(400, AiHttpHarness::request('POST', '/api/ai/reports/dictate', $token, ['patient_id' => $patient])['status']);

        [, $otherNurseToken] = $this->user('nurse');
        [, $patientToken] = $this->user('patient');
        $aiText = (string) $created['json']['data']['content_text'];
        $reportUrl = '/api/ai/reports/' . $reportId;
        $corrected = AiHttpHarness::request('PATCH', $reportUrl, $token, ['content_text' => '  Pansement refait. Plaie propre, revoir J+3.  ']);
        $this->assertSame(200, $corrected['status'], $corrected['raw']);
        $this->assertSame('Pansement refait. Plaie propre, revoir J+3.', $corrected['json']['data']['content_text']);
        AiHttpHarness::request('PATCH', $reportUrl, $token, ['content_text' => 'Deuxième correction.']);
        $stored = $this->db->prepare('SELECT content_text, content_json FROM ai_reports WHERE id = ?');
        $stored->execute([$reportId]);
        $row = $stored->fetch(PDO::FETCH_ASSOC);
        $this->assertSame('Deuxième correction.', $row['content_text']);
        $this->assertSame($aiText, json_decode((string) $row['content_json'], true)['ai_text'], 'Le texte produit par l\'IA reste tracé');

        $tooLong = AiHttpHarness::request('PATCH', $reportUrl, $token, ['content_text' => str_repeat('a', AiReportService::MAX_CONTENT_LENGTH + 1)]);
        $this->assertSame(400, $tooLong['status']);
        $this->assertSame('AI_REPORT_TOO_LONG', $tooLong['json']['code']);
        $this->assertSame(400, AiHttpHarness::request('PATCH', $reportUrl, $token, ['content_text' => '   '])['status']);
        $this->assertSame(400, AiHttpHarness::request('PATCH', $reportUrl, $token, ['content_text' => ['x']])['status']);
        $this->assertSame(400, AiHttpHarness::request('PATCH', '/api/ai/reports/pas-un-uuid', $token, ['content_text' => 'x'])['status']);
        $this->assertSame(404, AiHttpHarness::request('PATCH', '/api/ai/reports/' . Uuid::v4(), $token, ['content_text' => 'x'])['status']);
        $this->assertSame(404, AiHttpHarness::request('PATCH', $reportUrl, $otherNurseToken, ['content_text' => 'x'])['status']);
        $this->assertSame(403, AiHttpHarness::request('PATCH', $reportUrl, $patientToken, ['content_text' => 'x'])['status']);
        $this->assertSame(405, AiHttpHarness::request('POST', $reportUrl, $token, ['content_text' => 'x'])['status']);

        $this->assertSame(404, AiHttpHarness::request('POST', $reportUrl . '/validate', $otherNurseToken)['status']);
        $this->assertSame(200, AiHttpHarness::request('POST', $reportUrl . '/validate', $token)['status']);
        $again = AiHttpHarness::request('POST', $reportUrl . '/validate', $token);
        $this->assertSame([409, 'AI_REPORT_ALREADY_VALIDATED'], [$again['status'], $again['json']['code']]);
        $late = AiHttpHarness::request('PATCH', $reportUrl, $token, ['content_text' => 'Correction tardive']);
        $this->assertSame([409, 'AI_REPORT_ALREADY_VALIDATED'], [$late['status'], $late['json']['code']]);
        $this->assertSame(200, AiHttpHarness::request('POST', $reportUrl . '/publish', $token)['status']);
        $republish = AiHttpHarness::request('POST', $reportUrl . '/publish', $token);
        $this->assertSame([409, 'AI_REPORT_ALREADY_PUBLISHED'], [$republish['status'], $republish['json']['code']]);

        $this->assertSame(403, AiHttpHarness::request('POST', '/api/ai/reports/dictate', $patientToken, ['patient_id' => $patient, 'transcript' => 'x'])['status']);
    }
}

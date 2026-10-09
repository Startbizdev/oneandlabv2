<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/support/AiTestFixtures.php';
require_once __DIR__ . '/../../lib/ai/AiConversationService.php';

/**
 * Conversations Cary : validation de la création, une conversation par objet, historique chronologique paginé.
 */
final class AiConversationServiceTest extends TestCase
{
    private PDO $db;
    private AiTestFixtures $fixtures;
    private AiConversationService $service;

    protected function setUp(): void
    {
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN non défini');
        }
        $this->db = TestDatabase::pdo();
        $this->fixtures = new AiTestFixtures($this->db);
        $this->service = new AiConversationService($this->db);
    }

    protected function tearDown(): void
    {
        if (isset($this->fixtures)) {
            $this->fixtures->cleanup();
        }
        unset($this->service, $this->fixtures, $this->db);
        parent::tearDown();
    }

    public function testCreateRejectsInvalidInput(): void
    {
        $patient = ['user_id' => $this->fixtures->profile('patient'), 'role' => 'patient'];
        $invalid = [
            'context_type inconnu' => ['context_type' => 'billing'],
            'context_id manquant' => ['context_type' => 'appointment'],
            'context_id non UUID' => ['context_type' => 'appointment', 'context_id' => '12'],
            'context_id en général' => ['context_type' => 'general', 'context_id' => Uuid::v4()],
            'type inconnu' => ['conversation_type' => 'hack'],
            'titre trop long' => ['custom_title' => str_repeat('a', 300)],
        ];
        foreach ($invalid as $label => $input) {
            try {
                $this->service->create($patient, $input);
                $this->fail($label . ' : refus attendu');
            } catch (InvalidArgumentException $e) {
                $this->assertNotSame('', $e->getMessage(), $label);
            }
        }
    }

    public function testOneConversationPerAppointmentAndForeignObjectsRefused(): void
    {
        $aliceId = $this->fixtures->profile('patient');
        $brunoId = $this->fixtures->profile('patient');
        $alice = ['user_id' => $aliceId, 'role' => 'patient'];
        $aliceAppointment = $this->fixtures->appointment($aliceId);
        $brunoAppointment = $this->fixtures->appointment($brunoId);

        $first = $this->service->create($alice, ['context_type' => 'appointment', 'context_id' => $aliceAppointment]);
        $second = $this->service->create($alice, ['context_type' => 'appointment', 'context_id' => $aliceAppointment]);
        $this->assertTrue($first['created']);
        $this->assertFalse($second['created']);
        $this->assertSame($first['conversation']['id'], $second['conversation']['id']);
        $this->assertSame($aliceId, $first['conversation']['patient_id']);

        foreach ([['appointment', $brunoAppointment], ['patient', $brunoId], ['appointment', Uuid::v4()]] as [$type, $id]) {
            try {
                $this->service->create($alice, ['context_type' => $type, 'context_id' => $id]);
                $this->fail("$type $id : refus attendu");
            } catch (HttpStatusException $e) {
                $this->assertContains($e->httpStatus, [403, 404]);
            }
        }
    }

    public function testNurseNeedsDossierAccessForPatientContext(): void
    {
        $patientId = $this->fixtures->profile('patient');
        $nurseId = $this->fixtures->profile('nurse');
        $otherNurseId = $this->fixtures->profile('nurse');
        $this->fixtures->appointment($patientId, $nurseId);

        $created = $this->service->create(['user_id' => $nurseId, 'role' => 'nurse'], ['context_type' => 'patient', 'context_id' => $patientId]);
        $this->assertSame($patientId, $created['conversation']['patient_id']);

        try {
            $this->service->create(['user_id' => $otherNurseId, 'role' => 'nurse'], ['context_type' => 'patient', 'context_id' => $patientId]);
            $this->fail('Infirmier sans accès au dossier : refus attendu');
        } catch (HttpStatusException $e) {
            $this->assertSame(403, $e->httpStatus);
        }
    }

    public function testHistoryIsChronologicalAndPaginatedWithBeforeCursor(): void
    {
        $userId = $this->fixtures->profile('patient');
        $conversation = $this->service->create(['user_id' => $userId, 'role' => 'patient'], [])['conversation'];
        $ids = [];
        for ($i = 1; $i <= 5; $i++) {
            $ids[] = $this->service->addMessage($conversation['id'], $i % 2 === 1 ? 'user' : 'assistant', 'message ' . $i)['id'];
        }

        $last = $this->service->getHistoryPage($conversation['id'], $userId, 2, null);
        $this->assertTrue($last['has_more']);
        $this->assertSame([$ids[3], $ids[4]], array_column($last['messages'], 'id'), 'Les 2 derniers, du plus ancien au plus récent');

        $previous = $this->service->getHistoryPage($conversation['id'], $userId, 2, $ids[3]);
        $this->assertTrue($previous['has_more']);
        $this->assertSame([$ids[1], $ids[2]], array_column($previous['messages'], 'id'));

        $first = $this->service->getHistoryPage($conversation['id'], $userId, 2, $ids[1]);
        $this->assertFalse($first['has_more'], 'Message d\'accueil + message 1 : plus rien avant');
        $this->assertSame('assistant', $first['messages'][0]['role']);
        $this->assertSame($ids[0], $first['messages'][1]['id']);
    }

    public function testHistoryRefusesOtherUsersAndBadCursor(): void
    {
        $ownerId = $this->fixtures->profile('patient');
        $otherId = $this->fixtures->profile('patient');
        $conversation = $this->service->create(['user_id' => $ownerId, 'role' => 'patient'], [])['conversation'];

        try {
            $this->service->getHistoryPage($conversation['id'], $otherId, null, null);
            $this->fail('Conversation d\'un autre utilisateur : 404 attendu');
        } catch (HttpStatusException $e) {
            $this->assertSame(404, $e->httpStatus);
        }
        try {
            $this->service->getHistoryPage($conversation['id'], $ownerId, null, Uuid::v4());
            $this->fail('Curseur inconnu : 404 attendu');
        } catch (HttpStatusException $e) {
            $this->assertSame(404, $e->httpStatus);
        }
        $this->expectException(InvalidArgumentException::class);
        $this->service->getHistoryPage($conversation['id'], $ownerId, 0, null);
    }

    public function testDeletePermanentlyRemovesConversationDataButKeepsDossierAndTraces(): void
    {
        $patientId = $this->fixtures->profile('patient');
        $patient = ['user_id' => $patientId, 'role' => 'patient'];
        $conversationId = $this->service->create($patient, [])['conversation']['id'];
        $question = $this->service->addMessage($conversationId, 'user', 'Mon taux de fer est bas ?');
        $this->service->addMessage($conversationId, 'assistant', 'Votre ferritine est à 12.', ['sources' => [['type' => 'document', 'id' => 'x', 'label' => 'Bilan']]]);
        $documentId = $this->fixtures->document($patientId, $patientId);
        $this->db->prepare('
            INSERT INTO ai_conversation_attachments (id, conversation_id, message_id, user_id, medical_document_id, attachment_type, file_name)
            VALUES (?, ?, ?, ?, ?, \'resultats\', \'bilan.pdf\')
        ')->execute([Uuid::v4(), $conversationId, $question['id'], $patientId, $documentId]);
        $this->db->prepare('INSERT INTO ai_conversation_summaries (id, conversation_id, summary_text) VALUES (?, ?, ?)')
            ->execute([Uuid::v4(), $conversationId, 'Ferritine basse']);
        $pendingDraft = $this->draft($patientId, $conversationId, 'collecting');
        $confirmedDraft = $this->draft($patientId, $conversationId, 'confirmed');
        $sessionId = Uuid::v4();
        $voiceMessageId = Uuid::v4();
        $this->db->prepare("INSERT INTO voice_sessions (id, user_id, ai_conversation_id, started_at) VALUES (?, ?, ?, NOW())")
            ->execute([$sessionId, $patientId, $conversationId]);
        $this->db->prepare("INSERT INTO voice_messages (id, session_id, role) VALUES (?, ?, 'user')")->execute([$voiceMessageId, $sessionId]);
        $this->db->prepare('INSERT INTO voice_transcriptions (id, voice_message_id, text) VALUES (?, ?, ?)')
            ->execute([Uuid::v4(), $voiceMessageId, 'Mon taux de fer']);
        $this->db->prepare("INSERT INTO voice_realtime_events (id, session_id, event_id, event_type) VALUES (?, ?, 'e1', 'transcript')")
            ->execute([Uuid::v4(), $sessionId]);
        $feedbackId = Uuid::v4();
        $this->db->prepare('INSERT INTO ai_feedback (id, user_id, conversation_id, rating, comment) VALUES (?, ?, ?, 2, ?)')
            ->execute([$feedbackId, $patientId, $conversationId, 'Ma ferritine reste basse']);
        $auditId = Uuid::v4();
        $this->db->prepare("INSERT INTO ai_audits (id, user_id, conversation_id, task_type, provider) VALUES (?, ?, ?, 'chat_simple', 'local')")
            ->execute([$auditId, $patientId, $conversationId]);

        $deleted = $this->service->deletePermanently($patient, $conversationId);

        $this->assertSame(['messages' => 3, 'voice_sessions' => 1, 'drafts' => 1], $deleted, 'Accueil + 2 messages');
        foreach ([
            'SELECT COUNT(*) FROM ai_conversations WHERE id = ?',
            'SELECT COUNT(*) FROM ai_messages WHERE conversation_id = ?',
            'SELECT COUNT(*) FROM ai_conversation_summaries WHERE conversation_id = ?',
            'SELECT COUNT(*) FROM ai_conversation_attachments WHERE conversation_id = ?',
            'SELECT COUNT(*) FROM voice_sessions WHERE ai_conversation_id = ?',
        ] as $sql) {
            $this->assertSame(0, $this->rowCount($sql, [$conversationId]), $sql);
        }
        $this->assertSame(0, $this->rowCount('SELECT COUNT(*) FROM voice_messages WHERE session_id = ?', [$sessionId]));
        $this->assertSame(0, $this->rowCount('SELECT COUNT(*) FROM voice_transcriptions WHERE voice_message_id = ?', [$voiceMessageId]));
        $this->assertSame(0, $this->rowCount('SELECT COUNT(*) FROM voice_realtime_events WHERE session_id = ?', [$sessionId]));
        $this->assertSame(0, $this->rowCount('SELECT COUNT(*) FROM ai_appointment_drafts WHERE id = ?', [$pendingDraft]));

        $this->assertSame(1, $this->rowCount('SELECT COUNT(*) FROM medical_documents WHERE id = ?', [$documentId]), 'Le document reste dans le dossier');
        $this->assertSame(1, $this->rowCount('SELECT COUNT(*) FROM ai_appointment_drafts WHERE id = ? AND conversation_id IS NULL', [$confirmedDraft]));
        $this->assertSame(1, $this->rowCount('SELECT COUNT(*) FROM ai_feedback WHERE id = ? AND rating = 2 AND comment IS NULL AND conversation_id IS NULL', [$feedbackId]));
        $this->assertSame(1, $this->rowCount('SELECT COUNT(*) FROM ai_audits WHERE id = ? AND conversation_id IS NULL', [$auditId]));

        $log = $this->db->prepare("SELECT details FROM access_logs WHERE action = 'ai_conversation_deleted' AND resource_id = ?");
        $log->execute([$conversationId]);
        $this->assertEquals($deleted, json_decode((string) $log->fetchColumn(), true), 'Trace HDS sans contenu (colonne JSON : ordre des clés normalisé par MySQL)');
    }

    public function testDeletePermanentlyIsOwnerOnlyAndKeepsSystemConversations(): void
    {
        $owner = ['user_id' => $this->fixtures->profile('patient'), 'role' => 'patient'];
        $other = ['user_id' => $this->fixtures->profile('patient'), 'role' => 'patient'];
        $conversationId = $this->service->create($owner, [])['conversation']['id'];
        $systemId = $this->service->ensureSystem($owner, 'assistant_health')['id'];

        foreach ([[$other, $conversationId, 404], [$owner, $systemId, 409], [$owner, Uuid::v4(), 404]] as [$user, $id, $status]) {
            try {
                $this->service->deletePermanently($user, $id);
                $this->fail("Suppression $id : $status attendu");
            } catch (HttpStatusException $e) {
                $this->assertSame($status, $e->httpStatus);
            }
        }
        $this->assertSame(1, $this->rowCount('SELECT COUNT(*) FROM ai_conversations WHERE id = ?', [$conversationId]));
        $this->assertSame(1, $this->rowCount('SELECT COUNT(*) FROM ai_conversations WHERE id = ?', [$systemId]));
        $this->expectException(InvalidArgumentException::class);
        $this->service->deletePermanently($owner, 'pas-un-uuid');
    }

    public function testEnsureSystemIsIdempotentAndRejectsUnknownKey(): void
    {
        $user = ['user_id' => $this->fixtures->profile('patient'), 'role' => 'patient'];
        $first = $this->service->ensureSystem($user, 'assistant_health');
        $again = $this->service->ensureSystem($user, 'assistant_health');
        $this->assertSame($first['id'], $again['id']);
        $this->expectException(InvalidArgumentException::class);
        $this->service->ensureSystem($user, 'admin_console');
    }

    private function draft(string $userId, string $conversationId, string $status): string
    {
        $id = Uuid::v4();
        $this->db->prepare("
            INSERT INTO ai_appointment_drafts (id, user_id, conversation_id, status, payload_json, created_by_role, expires_at)
            VALUES (?, ?, ?, ?, '{}', 'patient', DATE_ADD(NOW(), INTERVAL 1 DAY))
        ")->execute([$id, $userId, $conversationId, $status]);

        return $id;
    }

    /** @param list<string> $params */
    private function rowCount(string $sql, array $params): int
    {
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        return (int) $stmt->fetchColumn();
    }
}

<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/support/AiTestFixtures.php';
require_once __DIR__ . '/../../lib/ai/AiAttachmentService.php';
require_once __DIR__ . '/../../lib/ai/AiStaffPatientResolver.php';
require_once __DIR__ . '/../../lib/ai/AiConversationService.php';

/**
 * Accès aux documents et à l'identité patient avant toute analyse ou réservation par Cary.
 */
final class AiDocumentAccessTest extends TestCase
{
    private PDO $db;
    private AiTestFixtures $fixtures;

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

    private function assertRefused(callable $call, int $status, string $label): void
    {
        try {
            $call();
            $this->fail($label . ' : refus attendu');
        } catch (HttpStatusException $e) {
            $this->assertSame($status, $e->httpStatus, $label);
        }
    }

    public function testDocumentAccessFollowsDownloadRule(): void
    {
        $patientA = $this->fixtures->profile('patient');
        $patientB = $this->fixtures->profile('patient');
        $nurse = $this->fixtures->profile('nurse');
        $otherNurse = $this->fixtures->profile('nurse');
        $appointment = $this->fixtures->appointment($patientA, $nurse);
        $profileDoc = $this->fixtures->document($patientA, $patientA);
        $appointmentDoc = $this->fixtures->document($patientA, $patientA, $appointment);
        $service = new AiAttachmentService($this->db);

        $this->assertSame($profileDoc, $service->requireAccessibleDocument(['user_id' => $patientA, 'role' => 'patient'], $profileDoc)['id']);
        $this->assertSame($appointmentDoc, $service->requireAccessibleDocument(['user_id' => $nurse, 'role' => 'nurse'], $appointmentDoc)['id']);

        $this->assertRefused(fn () => $service->requireAccessibleDocument(['user_id' => $patientB, 'role' => 'patient'], $profileDoc), 403, 'autre patient');
        $this->assertRefused(fn () => $service->requireAccessibleDocument(['user_id' => $otherNurse, 'role' => 'nurse'], $appointmentDoc), 403, 'infirmier non assigné');
        $this->assertRefused(fn () => $service->requireAccessibleDocument(['user_id' => $patientA, 'role' => 'patient'], Uuid::v4()), 404, 'document inexistant');
    }

    public function testAttachingForeignDocumentToOwnConversationIsRefused(): void
    {
        $patientA = $this->fixtures->profile('patient');
        $patientB = $this->fixtures->profile('patient');
        $foreignDoc = $this->fixtures->document($patientB, $patientB);
        $userB = ['user_id' => $patientB, 'role' => 'patient'];
        $userA = ['user_id' => $patientA, 'role' => 'patient'];
        $conversation = (new AiConversationService($this->db))->create($userA, [])['conversation'];
        $service = new AiAttachmentService($this->db);

        $this->assertRefused(fn () => $service->attachToConversation($userA, $conversation['id'], ['medical_document_id' => $foreignDoc]), 403, 'document d\'un autre patient');
        $this->assertRefused(fn () => $service->attachToConversation($userB, $conversation['id'], ['medical_document_id' => $foreignDoc]), 404, 'conversation d\'un autre utilisateur');
        $count = $this->db->prepare('SELECT COUNT(*) FROM ai_conversation_attachments WHERE conversation_id = ?');
        $count->execute([$conversation['id']]);
        $this->assertSame(0, (int) $count->fetchColumn());
    }

    public function testStaffCanOnlyUsePatientsOfTheirDossier(): void
    {
        $patient = $this->fixtures->profile('patient');
        $nurse = $this->fixtures->profile('nurse');
        $otherNurse = $this->fixtures->profile('nurse');
        $this->fixtures->appointment($patient, $nurse);
        $resolver = new AiStaffPatientResolver(null, $this->db);

        $this->assertTrue($resolver->staffCanUsePatient($patient, ['user_id' => $nurse, 'role' => 'nurse']));
        $this->assertFalse($resolver->staffCanUsePatient($patient, ['user_id' => $otherNurse, 'role' => 'nurse']));
        $this->assertFalse($resolver->staffCanUsePatient(Uuid::v4(), ['user_id' => $nurse, 'role' => 'nurse']));
    }
}

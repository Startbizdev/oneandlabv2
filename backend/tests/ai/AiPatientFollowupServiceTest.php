<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/support/AiTestFixtures.php';
require_once __DIR__ . '/../../lib/ai/AiPatientFollowupService.php';

/**
 * Cron de suivi : signaux informatifs fondés sur des données réelles, notification typée, pas de doublon.
 */
final class AiPatientFollowupServiceTest extends TestCase
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

    /** @return array<string, array<string, mixed>> */
    private function signals(string $patientId): array
    {
        $stmt = $this->db->prepare('SELECT signal_type, payload_json FROM ai_patient_signals WHERE patient_id = ?');
        $stmt->execute([$patientId]);
        $out = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $out[(string) $row['signal_type']] = json_decode((string) $row['payload_json'], true) ?: [];
        }

        return $out;
    }

    /** @return list<array<string, mixed>> */
    private function notifications(string $patientId): array
    {
        $stmt = $this->db->prepare('SELECT type, data FROM notifications WHERE user_id = ?');
        $stmt->execute([$patientId]);

        return array_map(static fn (array $row): array => [
            'type' => $row['type'],
            'data' => json_decode((string) $row['data'], true) ?: [],
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function testPatientWithoutHistoryGetsOnlyPhoneReminder(): void
    {
        $patient = $this->fixtures->profile('patient');
        $created = (new AiPatientFollowupService($this->db))->scanPatient($patient);

        $this->assertSame(['profile_incomplete'], array_keys($this->signals($patient)), 'Aucun bilan : pas de « bilan en retard »');
        $this->assertSame(1, $created);
        $notifications = $this->notifications($patient);
        $this->assertCount(1, $notifications);
        $this->assertSame(AiPatientFollowupService::NOTIFICATION_TYPE, $notifications[0]['type']);
        $this->assertSame('profile_incomplete', $notifications[0]['data']['signal_type']);
        $this->assertTrue($notifications[0]['data']['no_navigate']);
    }

    public function testMissedVisitOldLabResultAndExpiringPrescription(): void
    {
        $patient = $this->fixtures->profile('patient');
        $missed = $this->fixtures->appointment($patient, null, 'canceled');
        $this->db->prepare('UPDATE appointments SET cancellation_reason = \'patient_absent\', canceled_at = NOW() - INTERVAL 1 DAY WHERE id = ?')
            ->execute([$missed]);
        $otherCancel = $this->fixtures->appointment($patient, null, 'canceled');
        $this->db->prepare('UPDATE appointments SET cancellation_reason = \'patient_request\', canceled_at = NOW() WHERE id = ?')
            ->execute([$otherCancel]);
        $oldResult = $this->fixtures->document($patient, $patient, null, 'resultats');
        $prescription = $this->fixtures->document($patient, $patient, null, 'ordonnance');
        $this->db->prepare('UPDATE medical_documents SET created_at = NOW() - INTERVAL 13 MONTH WHERE id = ?')->execute([$oldResult]);
        $this->db->prepare('UPDATE medical_documents SET created_at = NOW() - INTERVAL 11 MONTH WHERE id = ?')->execute([$prescription]);

        $service = new AiPatientFollowupService($this->db);
        $service->scanPatient($patient);
        $signals = $this->signals($patient);

        $this->assertArrayHasKey('lab_overdue', $signals);
        $this->assertArrayHasKey('prescription_expiring', $signals);
        $this->assertSame($missed, $signals['appointment_no_show']['appointment_id'] ?? null, 'Seul le passage « patient absent » compte');
        $noShow = array_values(array_filter($this->notifications($patient), static fn (array $n): bool => $n['data']['signal_type'] === 'appointment_no_show'));
        $this->assertSame($missed, $noShow[0]['data']['appointment_id'] ?? null);

        $this->assertSame(0, $service->scanPatient($patient), 'Pas de nouveau signal ni de nouvelle notification avant 14 jours');
    }

    public function testRecentLabResultIsNotOverdue(): void
    {
        $patient = $this->fixtures->profile('patient');
        $this->fixtures->document($patient, $patient, null, 'resultats');
        (new AiPatientFollowupService($this->db))->scanPatient($patient);
        $this->assertArrayNotHasKey('lab_overdue', $this->signals($patient));
    }

    public function testDailyScanRecordsRun(): void
    {
        $result = (new AiPatientFollowupService($this->db))->runDailyScan(5);
        $this->assertSame(0, $result['errors']);
        $this->assertGreaterThanOrEqual(1, $result['patients_scanned']);
        $run = $this->db->prepare('SELECT job_name, patients_scanned FROM ai_agent_runs WHERE id = ?');
        $run->execute([$result['run_id']]);
        $row = $run->fetch(PDO::FETCH_ASSOC);
        $this->assertSame('ai-patient-followup', $row['job_name'] ?? null);
        $this->assertSame($result['patients_scanned'], (int) $row['patients_scanned']);
    }
}

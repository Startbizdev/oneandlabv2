<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../fixtures/SkipsWithoutPdo.php';
require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../fixtures/TestFixtures.php';
require_once __DIR__ . '/../../lib/medical-documents/ResultsNotificationRecipients.php';

/**
 * Notification results_available : seuls les pros du rendez-vous, hors liens masqués par le patient.
 */
final class ResultsNotificationRecipientsTest extends TestCase
{
    use SkipsWithoutPdo;

    private PDO $db;
    /** @var list<string> */
    private array $profileIds = [];

    protected function setUp(): void
    {
        parent::setUp();
        $this->requirePdo();
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN');
        }
        $this->db = TestDatabase::pdo();
    }

    protected function tearDown(): void
    {
        foreach ($this->profileIds as $id) {
            $this->db->prepare('DELETE FROM patient_professional_access WHERE patient_id = ? OR professional_id = ?')->execute([$id, $id]);
            $this->db->prepare('DELETE FROM profiles WHERE id = ?')->execute([$id]);
        }
        unset($this->db);
        parent::tearDown();
    }

    public function testLinkedProWhoIsNotOnTheAppointmentIsNotNotified(): void
    {
        $patient = $this->profile('patient');
        $creator = $this->profile('pro');
        $linkedOnly = $this->profile('pro');
        $this->link($patient, $linkedOnly, false);

        $ids = ResultsNotificationRecipients::proIds($this->db, $this->appointment($patient, $creator, 'pro', null));

        $this->assertSame([$creator], $ids);
    }

    public function testCreatorAndAssignedProAreNotified(): void
    {
        $patient = $this->profile('patient');
        $creator = $this->profile('pro');
        $assigned = $this->profile('pro');
        $this->link($patient, $creator, false);

        $ids = ResultsNotificationRecipients::proIds($this->db, $this->appointment($patient, $creator, 'pro', $assigned));
        sort($ids);
        $expected = [$creator, $assigned];
        sort($expected);

        $this->assertSame($expected, $ids);
    }

    public function testProHiddenByPatientIsNotNotified(): void
    {
        $patient = $this->profile('patient');
        $creator = $this->profile('pro');
        $assigned = $this->profile('pro');
        $this->link($patient, $assigned, true);

        $ids = ResultsNotificationRecipients::proIds($this->db, $this->appointment($patient, $creator, 'pro', $assigned));

        $this->assertSame([$creator], $ids);
    }

    public function testNonProCreatorAndNonProAssigneeAreIgnored(): void
    {
        $patient = $this->profile('patient');
        $nurse = $this->profile('nurse');

        $this->assertSame([], ResultsNotificationRecipients::proIds($this->db, $this->appointment($patient, $nurse, 'nurse', $nurse)));
        $this->assertSame([], ResultsNotificationRecipients::proIds($this->db, $this->appointment($patient, $patient, 'patient', null)));
    }

    private function profile(string $role): string
    {
        $id = TestFixtures::insertProfile($this->db, $role);
        $this->profileIds[] = $id;

        return $id;
    }

    private function link(string $patientId, string $proId, bool $hidden): void
    {
        $this->db->prepare(
            "INSERT INTO patient_professional_access (id, patient_id, professional_id, source, hidden_by_patient, created_at)
             VALUES (UUID(), ?, ?, 'manual_link', ?, NOW())"
        )->execute([$patientId, $proId, $hidden ? 1 : 0]);
    }

    /** @return array<string, string|null> */
    private function appointment(string $patientId, string $createdBy, string $createdByRole, ?string $assignedProId): array
    {
        return [
            'patient_id' => $patientId,
            'created_by' => $createdBy,
            'created_by_role' => $createdByRole,
            'assigned_pro_id' => $assignedProId,
        ];
    }
}

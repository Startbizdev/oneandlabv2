<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../fixtures/SkipsWithoutPdo.php';
require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../fixtures/TestFixtures.php';
require_once __DIR__ . '/../../lib/appointments/AppointmentReviewPrompt.php';
require_once __DIR__ . '/../../lib/Uuid.php';

/**
 * Invitation à laisser un avis : un avis par soignant, et pas avant le 3e passage d'une série.
 */
final class AppointmentReviewPromptTest extends TestCase
{
    use SkipsWithoutPdo;

    private ?PDO $db = null;
    /** @var list<string> */
    private array $appointmentIds = [];

    protected function tearDown(): void
    {
        if ($this->db !== null && $this->appointmentIds !== []) {
            $in = implode(',', array_fill(0, count($this->appointmentIds), '?'));
            $this->db->prepare("DELETE FROM reviews WHERE appointment_id IN ($in)")->execute($this->appointmentIds);
            $this->db->prepare("DELETE FROM appointments WHERE id IN ($in)")->execute($this->appointmentIds);
        }
        $this->db = null;
        $this->appointmentIds = [];
        parent::tearDown();
    }

    public function testSingleCompletedAppointmentIsEligibleOnlyWhenCompletedWithAssignee(): void
    {
        $done = $this->insertNursing('completed');
        $this->assertSame(['eligible' => true, 'reviewed_here' => false], $this->prompt($done));

        $this->assertFalse($this->prompt($this->insertNursing('confirmed'))['eligible']);
        $this->assertFalse($this->prompt($this->insertNursing('completed', null, null))['eligible']);
    }

    public function testAlreadyReviewedNurseIsNotAskedAgainButReviewStaysVisibleWhereGiven(): void
    {
        $first = $this->insertNursing('completed');
        $second = $this->insertNursing('completed');
        $this->insertReview($first);

        $this->assertSame(['eligible' => false, 'reviewed_here' => true], $this->prompt($first));
        $this->assertSame(['eligible' => false, 'reviewed_here' => false], $this->prompt($second));
    }

    public function testSeriesAsksOnlyFromThirdCompletedPassage(): void
    {
        $series = Uuid::v4();
        $p1 = $this->insertNursing('completed', $series);
        $this->insertNursing('completed', $series);
        $this->assertFalse($this->prompt($p1)['eligible'], '2 passages : trop tôt');

        $this->insertNursing('confirmed', $series);
        $this->assertFalse($this->prompt($p1)['eligible'], 'un passage à venir ne compte pas');

        $this->insertNursing('completed', $series);
        $this->assertTrue($this->prompt($p1)['eligible'], '3e passage terminé');
    }

    /** @return array{eligible: bool, reviewed_here: bool} */
    private function prompt(string $appointmentId): array
    {
        $stmt = $this->db()->prepare('SELECT * FROM appointments WHERE id = ?');
        $stmt->execute([$appointmentId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        $this->assertIsArray($row);

        return AppointmentReviewPrompt::forPatient($this->db(), $row, TestFixtures::PATIENT_A);
    }

    private function insertNursing(string $status, ?string $seriesId = null, ?string $nurseId = TestFixtures::NURSE): string
    {
        $id = Uuid::v4();
        $this->db()->prepare(
            'INSERT INTO appointments (
                id, type, status, created_by, created_by_role, form_type,
                location_lat, location_lng, address_encrypted, address_dek, scheduled_at, patient_id,
                assigned_nurse_id, passage_series_id
            ) VALUES (?, ?, ?, ?, ?, ?, 48.86, 2.35, ?, ?, NOW(), ?, ?, ?)'
        )->execute([$id, 'nursing', $status, TestFixtures::PATIENT_A, 'patient', 'nursing', 'fixture-addr', 'fixture-dek', TestFixtures::PATIENT_A, $nurseId, $seriesId]);
        $this->appointmentIds[] = $id;

        return $id;
    }

    private function insertReview(string $appointmentId): void
    {
        $this->db()->prepare("INSERT INTO reviews (id, appointment_id, patient_id, reviewee_id, reviewee_type, rating) VALUES (?, ?, ?, ?, 'nurse', 5)")
            ->execute([Uuid::v4(), $appointmentId, TestFixtures::PATIENT_A, TestFixtures::NURSE]);
    }

    private function db(): PDO
    {
        if ($this->db === null) {
            $this->requirePdo();
            if (!TestDatabase::isConfigured()) {
                $this->markTestSkipped('TEST_DATABASE_DSN');
            }
            $this->db = TestDatabase::pdo();
        }

        return $this->db;
    }
}

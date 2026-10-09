<?php

declare(strict_types=1);

require_once __DIR__ . '/../fixtures/SkipsWithoutPdo.php';
require_once __DIR__ . '/../fixtures/TestFixtures.php';
require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../../lib/appointments/bootstrap.php';

use PHPUnit\Framework\TestCase;

/**
 * Accueil préleveur : segment « mes_demandes » = ses demandes de prélèvement en attente de son labo.
 */
final class PreleveurPendingRequestsListTest extends TestCase
{
    use SkipsWithoutPdo;

    private PDO $db;
    /** @var list<string> */
    private array $appointmentIds = [];

    protected function setUp(): void
    {
        parent::setUp();
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN');
        }
        $this->db = TestDatabase::pdo();
    }

    protected function tearDown(): void
    {
        unset($_GET['preleveur_segment']);
        foreach ($this->appointmentIds as $id) {
            $this->db->prepare('DELETE FROM appointments WHERE id = ?')->execute([$id]);
        }
        unset($this->db);
        parent::tearDown();
    }

    public function testSegmentListsOnlyOwnPendingRequests(): void
    {
        $ownPending = $this->insertAppointment(TestFixtures::PRELEVEUR, 'preleveur', 'pending');
        $this->insertAppointment(TestFixtures::PATIENT_A, 'patient', 'pending');
        $this->insertAppointment(TestFixtures::PRELEVEUR, 'preleveur', 'confirmed');

        $_GET['preleveur_segment'] = 'mes_demandes';
        $flags = AppointmentListQueryBuilder::schemaFlags($this->db);
        $sql = (new AppointmentListQueryBuilder(
            $this->db,
            AppointmentListQuery::fromArray(['limit' => '50']),
            ['user_id' => TestFixtures::PRELEVEUR, 'role' => 'preleveur'],
            $flags['useRelativeJoin'],
            $flags['hasMergedColumn'],
        ))->build();
        $stmt = $this->db->prepare($sql->selectSql);
        $stmt->execute($sql->params);
        $ids = array_map(static fn (array $r): string => (string) $r['id'], $stmt->fetchAll(PDO::FETCH_ASSOC));

        $this->assertSame([$ownPending], array_values(array_intersect($ids, $this->appointmentIds)));
    }

    private function insertAppointment(string $createdBy, string $createdByRole, string $status): string
    {
        $bytes = random_bytes(16);
        $bytes[6] = chr(ord($bytes[6]) & 0x0f | 0x40);
        $bytes[8] = chr(ord($bytes[8]) & 0x3f | 0x80);
        $id = vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($bytes), 4));
        $address = (new Crypto())->encryptField((string) json_encode(['lat' => 43.3, 'lng' => 5.37]));
        $this->db->prepare('
            INSERT INTO appointments (id, type, status, patient_id, created_by, created_by_role, form_type, assigned_lab_id,
                location_lat, location_lng, address_encrypted, address_dek, scheduled_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ')->execute([
            $id, 'blood_test', $status, TestFixtures::PATIENT_A, $createdBy, $createdByRole, 'blood_test', TestFixtures::LAB,
            43.3, 5.37, $address['encrypted'], $address['dek'], (new DateTimeImmutable('+3 days'))->format('Y-m-d') . ' 10:00:00',
        ]);
        $this->appointmentIds[] = $id;

        return $id;
    }
}

<?php

declare(strict_types=1);

require_once __DIR__ . '/../fixtures/SkipsWithoutPdo.php';
require_once __DIR__ . '/../fixtures/TestFixtures.php';
require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../../lib/appointments/bootstrap.php';

use PHPUnit\Framework\TestCase;

/**
 * Snapshots structurels de la liste RDV via QueryBuilder (sans HTTP).
 */
final class AppointmentsListApiTest extends TestCase
{
    use SkipsWithoutPdo;

    private static string $snapshotDir;

    public static function setUpBeforeClass(): void
    {
        parent::setUpBeforeClass();
        self::$snapshotDir = __DIR__ . '/snapshots';
        if (!is_dir(self::$snapshotDir)) {
            mkdir(self::$snapshotDir, 0777, true);
        }
    }

    protected function setUp(): void
    {
        parent::setUp();
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN');
        }
    }

    /** @return list<array{0: array, 1: array, 2: string}> */
    public function listCases(): array
    {
        return [
            [['user_id' => TestFixtures::PATIENT_A, 'role' => 'patient'], ['scope' => 'list', 'limit' => '10'], 'patient-list'],
            [['user_id' => TestFixtures::PATIENT_A, 'role' => 'patient'], ['patient_period' => 'upcoming', 'limit' => '10'], 'patient-upcoming'],
            [['user_id' => TestFixtures::NURSE, 'role' => 'nurse'], ['scope' => 'list', 'limit' => '10'], 'nurse-list'],
            [['user_id' => TestFixtures::LAB, 'role' => 'lab'], ['scope' => 'list', 'limit' => '10'], 'lab-list'],
            [['user_id' => TestFixtures::PRELEVEUR, 'role' => 'preleveur'], ['scope' => 'list', 'limit' => '10'], 'preleveur-list'],
            [['user_id' => TestFixtures::PRO, 'role' => 'pro'], ['scope' => 'list', 'limit' => '10'], 'pro-list'],
            [['user_id' => TestFixtures::ADMIN, 'role' => 'super_admin'], ['scope' => 'list', 'limit' => '10'], 'admin-list'],
            [['user_id' => TestFixtures::LAB, 'role' => 'lab'], ['view' => 'cards', 'limit' => '5'], 'lab-cards'],
        ];
    }

    /**
     * @dataProvider listCases
     * @param array{user_id: string, role: string} $user
     * @param array<string, string> $query
     */
    public function testListShapeSnapshot(array $user, array $query, string $snap): void
    {
        $pdo = TestDatabase::pdo();
        $listQuery = AppointmentListQuery::fromArray($query);
        $flags = AppointmentListQueryBuilder::schemaFlags($pdo);
        $builder = new AppointmentListQueryBuilder(
            $pdo,
            $listQuery,
            $user,
            $flags['useRelativeJoin'],
            $flags['hasMergedColumn'],
        );
        $sql = $builder->build();
        $this->assertNotSame('', $sql->selectSql);
        $this->assertStringContainsString('COUNT', strtoupper($sql->countSql));
        $this->assertStringContainsString('FROM appointments', $sql->selectSql);

        $stmt = $pdo->prepare($sql->countSql);
        $stmt->execute($sql->params);
        $total = (int) $stmt->fetchColumn();
        [$orderSql] = $builder->buildOrderByClause();

        $normalized = [
            'role' => $user['role'],
            'scope' => $listQuery->listScope,
            'light' => $listQuery->lightListPayload,
            'calendar' => $listQuery->calendarView,
            'patient_period' => $listQuery->patientPeriod,
            'param_count' => count($sql->params),
            'has_order' => trim($orderSql) !== '',
            'total' => $total >= 0 ? 'n' : 'err',
            'select_has_relative' => str_contains($sql->selectSql, 'relative_'),
        ];

        $file = self::$snapshotDir . '/' . $snap . '.json';
        if (!is_file($file)) {
            file_put_contents($file, json_encode($normalized, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n");
            $this->assertTrue(true);
            return;
        }
        $expected = json_decode((string) file_get_contents($file), true);
        $this->assertSame($expected, $normalized);
    }
}

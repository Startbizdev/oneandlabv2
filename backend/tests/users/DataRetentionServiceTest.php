<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../fixtures/SkipsWithoutPdo.php';
require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../fixtures/TestFixtures.php';
require_once __DIR__ . '/../../lib/users/DataRetentionService.php';

final class RetentionRecordingEmail extends Email
{
    /** @var list<string> */
    public array $warned = [];

    public function send(string $to, string $subject, string $body, bool $isHTML = true, ?string $replyToEmail = null, ?string $replyToName = null): bool
    {
        $this->warned[] = $to;

        return true;
    }
}

/** Durées de conservation : avertissement puis suppression des patients inactifs, purge de l'assistant. */
final class DataRetentionServiceTest extends TestCase
{
    use SkipsWithoutPdo;

    private PDO $db;
    /** @var list<string> */
    private array $profiles = [];
    /** @var list<string> */
    private array $appointments = [];
    private RetentionRecordingEmail $email;
    private DataRetentionService $service;
    private DateTimeImmutable $now;

    protected function setUp(): void
    {
        parent::setUp();
        $this->requirePdo();
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN');
        }
        $this->db = TestDatabase::pdo();
        $this->email = new RetentionRecordingEmail();
        $users = new User($this->db);
        $this->service = new DataRetentionService(
            $this->db,
            $users,
            $this->email,
            new AccountDeletionService($this->db, $users, new Logger($this->db), $this->email, 'support@test.invalid'),
        );
        $this->now = new DateTimeImmutable('now');
    }

    protected function tearDown(): void
    {
        if (isset($this->db)) {
            foreach ($this->appointments as $id) {
                $this->db->prepare('DELETE FROM appointments WHERE id = ?')->execute([$id]);
            }
            foreach ($this->profiles as $id) {
                $this->db->prepare('DELETE FROM assistant_conversations WHERE user_id = ?')->execute([$id]);
                $this->db->prepare('DELETE FROM profiles WHERE id = ?')->execute([$id]);
            }
        }
        parent::tearDown();
    }

    public function testInactivePatientIsWarnedThenDeletedAfterThirtyDays(): void
    {
        $toWarn = $this->patient('-3 years +10 days');
        $toDelete = $this->patient('-3 years -5 days', '-31 days');
        $recentlyWarned = $this->patient('-3 years -5 days', '-10 days');
        $active = $this->patient('-2 days');

        $result = $this->service->run($this->now, true);

        $this->assertNotNull($this->warnedAt($toWarn), 'Avertissement envoyé 30 jours avant l\'échéance');
        $this->assertContains($this->emailOf($toWarn), $this->email->warned);
        $this->assertFalse($this->exists($toDelete), 'Supprimé 30 jours après l\'avertissement');
        $this->assertTrue($this->exists($recentlyWarned), 'Pas avant la fin du délai de 30 jours');
        $this->assertTrue($this->exists($active));
        $this->assertNull($this->warnedAt($active));
        $this->assertGreaterThanOrEqual(1, $result['warned']);
        $this->assertGreaterThanOrEqual(1, $result['deleted_accounts']);
    }

    public function testAccountWithOngoingAppointmentIsKeptAndRetriedLater(): void
    {
        $patient = $this->patient('-3 years -5 days', '-31 days');
        $this->appointment($patient, 'confirmed');

        $result = $this->service->run($this->now, true);

        $this->assertTrue($this->exists($patient));
        $this->assertGreaterThanOrEqual(1, $result['deletion_skipped']);
    }

    public function testReconnectingCancelsTheWarning(): void
    {
        $patient = $this->patient('-3 years +10 days', '-1 day');

        (new User($this->db))->touchLastActive($patient);

        $this->assertNull($this->warnedAt($patient));
        $this->service->run($this->now, true);
        $this->assertTrue($this->exists($patient));
        $this->assertNull($this->warnedAt($patient), 'Compte redevenu actif : plus d\'avertissement');
    }

    public function testDailyActivityDoesNotChangeTheProfileModificationDate(): void
    {
        $patient = $this->patient('-10 days');
        $this->db->prepare('UPDATE profiles SET updated_at = ? WHERE id = ?')->execute(['2026-01-02 03:04:05', $patient]);

        (new User($this->db))->touchLastActive($patient);

        $stmt = $this->db->prepare('SELECT updated_at, last_active_at >= CURRENT_DATE FROM profiles WHERE id = ?');
        $stmt->execute([$patient]);
        [$updatedAt, $touchedToday] = $stmt->fetch(PDO::FETCH_NUM);
        $this->assertSame('2026-01-02 03:04:05', (string) $updatedAt);
        $this->assertSame(1, (int) $touchedToday);
    }

    public function testSimulationChangesNothing(): void
    {
        $toWarn = $this->patient('-3 years +10 days');
        $toDelete = $this->patient('-3 years -5 days', '-31 days');

        $result = $this->service->run($this->now, false);

        $this->assertNull($this->warnedAt($toWarn));
        $this->assertTrue($this->exists($toDelete));
        $this->assertSame([], $this->email->warned);
        $this->assertGreaterThanOrEqual(1, $result['warned']);
        $this->assertGreaterThanOrEqual(1, $result['deleted_accounts']);
    }

    public function testAssistantConversationsAreDeletedOneYearAfterTheLastMessage(): void
    {
        $patient = $this->patient('-1 day');
        $old = $this->conversation($patient, '-13 months');
        $recent = $this->conversation($patient, '-2 months');

        $this->service->run($this->now, true);

        $count = $this->db->prepare('SELECT COUNT(*) FROM assistant_conversations WHERE id = ?');
        $count->execute([$old]);
        $this->assertSame(0, (int) $count->fetchColumn());
        $count->execute([$recent]);
        $this->assertSame(1, (int) $count->fetchColumn());
    }

    private function patient(string $lastActive, ?string $warned = null): string
    {
        $id = TestFixtures::insertProfile($this->db, 'patient');
        $this->profiles[] = $id;
        $this->db->prepare('UPDATE profiles SET last_active_at = ?, retention_warned_at = ? WHERE id = ?')->execute([
            $this->now->modify($lastActive)->format('Y-m-d H:i:s'),
            $warned !== null ? $this->now->modify($warned)->format('Y-m-d H:i:s') : null,
            $id,
        ]);

        return $id;
    }

    private function appointment(string $patient, string $status): void
    {
        $id = self::uuid();
        $this->db->prepare(
            'INSERT INTO appointments (id, type, status, created_by, created_by_role, form_type,
                location_lat, location_lng, address_encrypted, address_dek, scheduled_at, patient_id)
             VALUES (?, \'blood_test\', ?, ?, \'patient\', \'blood_test\', 48.86, 2.35, \'fixture-addr\', \'fixture-dek\', NOW(), ?)'
        )->execute([$id, $status, $patient, $patient]);
        $this->appointments[] = $id;
    }

    private function conversation(string $userId, string $updated): string
    {
        $id = self::uuid();
        $this->db->prepare(
            'INSERT INTO assistant_conversations (id, user_id, title_encrypted, title_dek, created_at, updated_at) VALUES (?, ?, \'t\', \'d\', ?, ?)'
        )->execute([$id, $userId, $this->now->modify($updated)->format('Y-m-d H:i:s'), $this->now->modify($updated)->format('Y-m-d H:i:s')]);

        return $id;
    }

    private static function uuid(): string
    {
        $b = random_bytes(16);
        $b[6] = chr(ord($b[6]) & 0x0f | 0x40);
        $b[8] = chr(ord($b[8]) & 0x3f | 0x80);

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($b), 4));
    }

    private function exists(string $id): bool
    {
        $stmt = $this->db->prepare('SELECT COUNT(*) FROM profiles WHERE id = ?');
        $stmt->execute([$id]);

        return (int) $stmt->fetchColumn() === 1;
    }

    private function warnedAt(string $id): ?string
    {
        $stmt = $this->db->prepare('SELECT retention_warned_at FROM profiles WHERE id = ?');
        $stmt->execute([$id]);
        $value = $stmt->fetchColumn();

        return $value === false || $value === null ? null : (string) $value;
    }

    private function emailOf(string $id): string
    {
        return (string) (new User($this->db))->getDecryptedEmail($id);
    }
}

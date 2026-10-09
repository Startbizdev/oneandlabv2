<?php

declare(strict_types=1);

require_once __DIR__ . '/../../models/Appointment.php';
require_once __DIR__ . '/../../lib/Logger.php';
require_once __DIR__ . '/../../lib/Crypto.php';
require_once __DIR__ . '/../../lib/Email.php';
require_once __DIR__ . '/../../lib/NotificationService.php';
require_once __DIR__ . '/../../lib/NurseQuotaGuard.php';

use PHPUnit\Framework\TestCase;

/**
 * Caractérisation updateStatus batch (quota + rollback history) — SQLite in-memory
 * (même scénario que confirmation-batch-standalone.php).
 */
final class AppointmentStatusTransitionTest extends TestCase
{
    public function testNurseQuotaAndHistoryFailureRestoreBatch(): void
    {
        $db = new PDO('sqlite::memory:', null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        $clock = new DateTimeImmutable('now', new DateTimeZone('Europe/Paris'));
        $date = $clock->format('Y-m-d H:i:s');
        $db->sqliteCreateFunction('NOW', static fn () => $date);
        $db->exec("CREATE TABLE profiles (id TEXT PRIMARY KEY, role TEXT); INSERT INTO profiles VALUES ('fixture-nurse','nurse')");
        $db->exec('CREATE TABLE subscriptions (user_id TEXT, plan_slug TEXT, status TEXT, updated_at TEXT)');
        $db->exec('CREATE TABLE appointments (id TEXT PRIMARY KEY, type TEXT, status TEXT, assigned_nurse_id TEXT, assigned_lab_id TEXT, assigned_to TEXT, location_lat REAL, location_lng REAL, scheduled_at TEXT, patient_id TEXT, relative_id TEXT, form_data_encrypted TEXT, form_data_dek TEXT, creation_batch_id TEXT, passage_source TEXT, updated_at TEXT, nurse_share_released_at TEXT)');
        $db->exec('CREATE TABLE appointment_status_updates (id TEXT, appointment_id TEXT, status TEXT, actor_id TEXT, actor_role TEXT, note TEXT, created_at TEXT)');
        $db->exec('CREATE TABLE appointment_offers (appointment_id TEXT, profile_id TEXT)');
        $db->exec('CREATE TABLE access_logs (user_id TEXT, role TEXT, action TEXT, resource_type TEXT, resource_id TEXT, details TEXT, ip_address TEXT, user_agent TEXT, created_at TEXT)');
        $db->exec('CREATE TABLE IF NOT EXISTS admin_dispatch_events (
            id TEXT PRIMARY KEY,
            appointment_id TEXT,
            event_type TEXT,
            actor_id TEXT,
            actor_role TEXT,
            target_profile_id TEXT,
            details TEXT,
            created_at TEXT
        )');

        $insert = $db->prepare('INSERT INTO appointments (id,type,status,assigned_nurse_id,scheduled_at,patient_id,creation_batch_id) VALUES (?, ?, ?, ?, ?, ?, ?)');
        for ($i = 1; $i <= 9; $i++) {
            $insert->execute(["accepted-$i", 'nursing', 'confirmed', 'fixture-nurse', $date, 'fixture-patient', null]);
        }
        foreach (['batch-a', 'batch-b'] as $id) {
            $insert->execute([$id, 'nursing', 'pending', null, $date, 'fixture-patient', 'fixture-batch']);
            $db->prepare('INSERT INTO appointment_offers VALUES (?, ?)')->execute([$id, 'fixture-nurse']);
        }

        $reflection = new ReflectionClass(Appointment::class);
        $model = $reflection->newInstanceWithoutConstructor();
        $reflection->getProperty('db')->setValue($model, $db);
        $reflection->getProperty('logger')->setValue($model, new Logger($db));
        $reflection->getProperty('crypto')->setValue($model, new Crypto());
        $reflection->getProperty('email')->setValue($model, new Email());
        $reflection->getProperty('notificationService')->setValue($model, new NotificationService());
        $reflection->getProperty('sms')->setValue($model, null);
        $reflection->getProperty('itemsResolver')->setValue($model, null);
        $reflection->getProperty('creationService')->setValue($model, null);
        $reflection->getProperty('readService')->setValue($model, null);
        $reflection->getProperty('dispatchService')->setValue($model, null);
        $reflection->getProperty('appointmentNotificationService')->setValue($model, null);
        $reflection->getProperty('statusService')->setValue($model, null);
        $reflection->getProperty('dispatchEventLogger')->setValue($model, null);
        $reflection->getProperty('formDataCrypto')->setValue($model, null);
        $reflection->getProperty('reviewStats')->setValue($model, null);
        $reflection->getProperty('creationRequestContext')->setValue($model, null);
        $reflection->getProperty('creationResponseReplayed')->setValue($model, false);

        try {
            $model->updateStatus('batch-a', 'confirmed', 'fixture-nurse', 'nurse');
            $this->fail('expected NurseQuotaExceeded');
        } catch (NurseQuotaExceeded) {
            $this->assertTrue(true);
        }
        $this->assertSame(2, (int) $db->query("SELECT COUNT(*) FROM appointments WHERE status='pending'")->fetchColumn());
        $this->assertSame(2, (int) $db->query('SELECT COUNT(*) FROM appointment_offers')->fetchColumn());
        $this->assertSame(0, (int) $db->query('SELECT COUNT(*) FROM appointment_status_updates')->fetchColumn());
        $this->assertFalse($db->inTransaction());

        $db->exec("CREATE TRIGGER history_failure BEFORE INSERT ON appointment_status_updates WHEN NEW.appointment_id='batch-b' BEGIN SELECT RAISE(ABORT, 'Synthetic history failure'); END");
        try {
            $model->updateStatus('batch-a', 'confirmed', 'fixture-nurse', 'nurse');
            $this->fail('expected PDOException');
        } catch (PDOException $error) {
            $this->assertStringContainsString('Synthetic history failure', $error->getMessage());
        }
        $this->assertSame(2, (int) $db->query("SELECT COUNT(*) FROM appointments WHERE status='pending'")->fetchColumn());
        $this->assertSame(2, (int) $db->query('SELECT COUNT(*) FROM appointment_offers')->fetchColumn());
        $this->assertSame(0, (int) $db->query('SELECT COUNT(*) FROM appointment_status_updates')->fetchColumn());
        $this->assertFalse($db->inTransaction());
    }
}

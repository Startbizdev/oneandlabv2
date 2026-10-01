<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../fixtures/SkipsWithoutPdo.php';
require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../fixtures/TestFixtures.php';
require_once __DIR__ . '/../../lib/users/AccountDeletionService.php';

final class RecordingEmail extends Email
{
    /** @var list<array{to: string, subject: string, body: string, reply_to: ?string}> */
    public array $sent = [];

    public function __construct(private bool $delivers = true)
    {
        parent::__construct();
    }

    public function send(
        string $to,
        string $subject,
        string $body,
        bool $isHTML = true,
        ?string $replyToEmail = null,
        ?string $replyToName = null
    ): bool {
        if (!$this->delivers) {
            return false;
        }
        $this->sent[] = ['to' => $to, 'subject' => $subject, 'body' => $body, 'reply_to' => $replyToEmail];
        return true;
    }
}

/**
 * Suppression de compte : patient en libre-service, demande au support pour les autres rôles (fixtures Docker).
 */
final class AccountDeletionServiceTest extends TestCase
{
    use SkipsWithoutPdo;

    private const SUPPORT = 'support@test.invalid';

    private PDO $db;
    /** @var list<string> */
    private array $profiles = [];
    /** @var list<string> */
    private array $appointments = [];
    /** @var list<string> */
    private array $files = [];
    /** @var list<string> */
    private array $demotedAdmins = [];

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
        if (isset($this->db)) {
            $this->restoreAdmins();
            $this->cleanup();
        }
        parent::tearDown();
    }

    public function testPatientDeletionRemovesPersonalDataAndKeepsAppointments(): void
    {
        $patient = $this->newProfile('patient');
        $systemAccount = $this->oldestSuperAdmin();
        $appointment = $this->insertAppointment($patient, 'completed');
        $this->db->prepare('INSERT INTO appointment_status_updates (id, appointment_id, status, actor_id, actor_role) VALUES (?, ?, ?, ?, ?)')
            ->execute([$this->uuid(), $appointment, 'completed', $patient, 'patient']);
        $review = $this->insertReview($appointment, $patient);
        $appointmentDocument = $this->insertDocument($patient, $appointment);
        $profileDocument = $this->insertDocument($patient, null);
        $this->db->prepare('INSERT INTO patient_documents (id, patient_id, document_type, medical_document_id) VALUES (?, ?, ?, ?)')
            ->execute([$this->uuid(), $patient, 'carte_vitale', $profileDocument]);
        $profileFile = $this->storeFile($profileDocument);

        $result = $this->service()->deleteOwnPatientAccount($patient, 'patient', 'SUPPRIMER');

        $this->assertSame(['deleted_documents' => 1, 'deleted_reviews' => 1, 'files_not_deleted' => 0], $result);
        $this->assertSame(0, $this->countRows('SELECT COUNT(*) FROM profiles WHERE id = ?', [$patient]));
        $this->assertSame(0, $this->countRows('SELECT COUNT(*) FROM reviews WHERE id = ?', [$review]));
        $this->assertSame(0, $this->countRows('SELECT COUNT(*) FROM medical_documents WHERE id = ?', [$profileDocument]));
        $this->assertFileDoesNotExist($profileFile);

        $kept = $this->db->prepare('SELECT patient_id, created_by FROM appointments WHERE id = ?');
        $kept->execute([$appointment]);
        $this->assertSame(['patient_id' => null, 'created_by' => $systemAccount], $kept->fetch(PDO::FETCH_ASSOC));
        $this->assertSame(1, $this->countRows('SELECT COUNT(*) FROM appointment_status_updates WHERE appointment_id = ? AND actor_id = ?', [$appointment, $systemAccount]));
        $this->assertSame(1, $this->countRows('SELECT COUNT(*) FROM medical_documents WHERE id = ? AND uploaded_by = ?', [$appointmentDocument, $systemAccount]));

        $log = $this->db->prepare("SELECT user_id, details FROM access_logs WHERE action = 'delete' AND resource_type = 'profile' AND resource_id = ? ORDER BY id DESC LIMIT 1");
        $log->execute([$patient]);
        $row = $log->fetch(PDO::FETCH_ASSOC);
        $this->assertIsArray($row);
        $this->assertNull($row['user_id']);
        $this->assertSame('self_service', json_decode((string) $row['details'], true)['scope'] ?? null);
    }

    public function testActiveAppointmentBlocksDeletion(): void
    {
        $patient = $this->newProfile('patient');
        $this->insertAppointment($patient, 'planned');

        $this->assertDenied(409, 'ACTIVE_APPOINTMENTS', fn () => $this->service()->deleteOwnPatientAccount($patient, 'patient', 'SUPPRIMER'));
        $this->assertSame(1, $this->countRows('SELECT COUNT(*) FROM profiles WHERE id = ?', [$patient]));
    }

    public function testActiveSubscriptionBlocksDeletion(): void
    {
        $patient = $this->newProfile('patient');
        $this->db->prepare("INSERT INTO subscriptions (id, user_id, billing_source, plan_slug, status) VALUES (?, ?, 'apple', 'nurse_pro', 'active')")
            ->execute([$this->uuid(), $patient]);

        $this->assertDenied(409, 'ACTIVE_SUBSCRIPTION', fn () => $this->service()->deleteOwnPatientAccount($patient, 'patient', 'SUPPRIMER'));
        $this->assertSame(1, $this->countRows('SELECT COUNT(*) FROM profiles WHERE id = ?', [$patient]));
    }

    public function testOpenPharmacyOrderBlocksDeletion(): void
    {
        $patient = $this->newProfile('patient');
        $this->db->prepare(
            "INSERT INTO pharmacy_orders (id, requester_id, requester_role, pharmacy_id, patient_id, fulfillment_mode, status)
             VALUES (?, ?, 'pro', ?, ?, 'click_collect', 'acceptee')"
        )->execute([$this->uuid(), TestFixtures::PRO, TestFixtures::NURSE, $patient]);

        $this->assertDenied(409, 'ACTIVE_PHARMACY_ORDERS', fn () => $this->service()->deleteOwnPatientAccount($patient, 'patient', 'SUPPRIMER'));
        $this->assertSame(1, $this->countRows('SELECT COUNT(*) FROM profiles WHERE id = ?', [$patient]));
    }

    public function testConfirmationMustBeExact(): void
    {
        $patient = $this->newProfile('patient');

        foreach (['supprimer', ' SUPPRIMER', null, true] as $confirmation) {
            $this->assertDenied(400, 'CONFIRMATION_REQUIRED', fn () => $this->service()->deleteOwnPatientAccount($patient, 'patient', $confirmation));
        }
        $this->assertSame(1, $this->countRows('SELECT COUNT(*) FROM profiles WHERE id = ?', [$patient]));
    }

    public function testNonPatientCannotSelfDelete(): void
    {
        $nurse = $this->newProfile('nurse');

        $this->assertDenied(403, 'NOT_PATIENT', fn () => $this->service()->deleteOwnPatientAccount($nurse, 'nurse', 'SUPPRIMER'));
        $this->assertSame(1, $this->countRows('SELECT COUNT(*) FROM profiles WHERE id = ?', [$nurse]));
    }

    public function testWithoutSuperAdminNothingIsDeleted(): void
    {
        $patient = $this->newProfile('patient');
        $appointment = $this->insertAppointment($patient, 'completed');
        $review = $this->insertReview($appointment, $patient);
        $this->demoteAllSuperAdmins();

        $error = null;
        try {
            $this->service()->deleteOwnPatientAccount($patient, 'patient', 'SUPPRIMER');
        } catch (RuntimeException $e) {
            $error = $e;
        } finally {
            $this->restoreAdmins();
        }

        $this->assertInstanceOf(RuntimeException::class, $error, 'Une suppression sans compte système doit échouer');
        $this->assertNotInstanceOf(AccountDeletionDenied::class, $error);
        $this->assertStringContainsString('super_admin', $error->getMessage());
        $this->assertSame(1, $this->countRows('SELECT COUNT(*) FROM profiles WHERE id = ?', [$patient]));
        $this->assertSame(1, $this->countRows('SELECT COUNT(*) FROM reviews WHERE id = ?', [$review]));
        $this->assertSame(1, $this->countRows('SELECT COUNT(*) FROM appointments WHERE id = ? AND patient_id = ?', [$appointment, $patient]));
    }

    public function testProfessionalRequestEmailsSupportWithServerSideIdentity(): void
    {
        $email = new RecordingEmail();

        $this->service($email)->requestProfessionalDeletion(TestFixtures::NURSE, 'nurse', "  Je cesse mon activité <b>  ");

        $this->assertCount(1, $email->sent);
        $sent = $email->sent[0];
        $this->assertSame(self::SUPPORT, $sent['to']);
        $this->assertSame('nina.nurse@test.invalid', $sent['reply_to']);
        $this->assertStringContainsString(TestFixtures::NURSE, $sent['body']);
        $this->assertStringContainsString('nina.nurse@test.invalid', $sent['body']);
        $this->assertStringContainsString('Nina Infirmiere', $sent['body']);
        $this->assertStringContainsString('Je cesse mon activité &lt;b&gt;', $sent['body']);
        $this->assertSame(1, $this->countRows('SELECT COUNT(*) FROM profiles WHERE id = ?', [TestFixtures::NURSE]));
    }

    public function testPatientCannotUseProfessionalRequest(): void
    {
        $email = new RecordingEmail();

        $this->assertDenied(403, 'PATIENT_USE_SELF_SERVICE', fn () => $this->service($email)->requestProfessionalDeletion(TestFixtures::PATIENT_A, 'patient', null));
        $this->assertSame([], $email->sent);
    }

    public function testProfessionalRequestFailsWhenEmailIsNotSent(): void
    {
        $this->assertDenied(503, 'EMAIL_SEND_FAILED', fn () => $this->service(new RecordingEmail(false))->requestProfessionalDeletion(TestFixtures::PRO, 'pro', null));
    }

    public function testProfessionalRequestRejectsInvalidReason(): void
    {
        $email = new RecordingEmail();
        $service = $this->service($email);

        $this->assertDenied(400, 'VALIDATION_ERROR', fn () => $service->requestProfessionalDeletion(TestFixtures::LAB, 'lab', str_repeat('a', AccountDeletionService::REASON_MAX_LENGTH + 1)));
        $this->assertDenied(400, 'VALIDATION_ERROR', fn () => $service->requestProfessionalDeletion(TestFixtures::LAB, 'lab', ['motif']));
        $this->assertSame([], $email->sent);
    }

    private function service(?Email $email = null): AccountDeletionService
    {
        return new AccountDeletionService($this->db, new User($this->db), new Logger($this->db), $email ?? new RecordingEmail(), self::SUPPORT);
    }

    private function assertDenied(int $status, string $code, callable $operation): void
    {
        try {
            $operation();
            $this->fail('Refus ' . $code . ' attendu');
        } catch (AccountDeletionDenied $e) {
            $this->assertSame([$status, $code], [$e->httpStatus, $e->errorCode]);
        }
    }

    private function newProfile(string $role): string
    {
        $id = TestFixtures::insertProfile($this->db, $role);
        $this->profiles[] = $id;
        return $id;
    }

    private function oldestSuperAdmin(): string
    {
        $id = $this->db->query("SELECT id FROM profiles WHERE role = 'super_admin' ORDER BY created_at ASC, id ASC LIMIT 1")->fetchColumn();
        $this->assertIsString($id, 'Fixture super_admin requise');
        return $id;
    }

    private function insertAppointment(string $patient, string $status): string
    {
        $id = $this->uuid();
        $this->db->prepare(
            'INSERT INTO appointments (
                id, type, status, created_by, created_by_role, form_type,
                location_lat, location_lng, address_encrypted, address_dek, scheduled_at, patient_id
            ) VALUES (?, ?, ?, ?, ?, ?, 48.86, 2.35, ?, ?, NOW(), ?)'
        )->execute([$id, 'blood_test', $status, $patient, 'patient', 'blood_test', 'fixture-addr', 'fixture-dek', $patient]);
        $this->appointments[] = $id;
        return $id;
    }

    private function insertReview(string $appointment, string $patient): string
    {
        $id = $this->uuid();
        $this->db->prepare("INSERT INTO reviews (id, appointment_id, patient_id, reviewee_id, reviewee_type, rating) VALUES (?, ?, ?, ?, 'nurse', 5)")
            ->execute([$id, $appointment, $patient, TestFixtures::NURSE]);
        return $id;
    }

    private function insertDocument(string $uploadedBy, ?string $appointment): string
    {
        $id = $this->uuid();
        $this->db->prepare(
            "INSERT INTO medical_documents (id, appointment_id, uploaded_by, file_name, file_path, file_size, mime_type)
             VALUES (?, ?, ?, 'carte.pdf', ?, 10, 'application/pdf')"
        )->execute([$id, $appointment, $uploadedBy, '/uploads/medical/' . $id . '/carte.pdf.encrypted']);
        return $id;
    }

    private function storeFile(string $documentId): string
    {
        $directory = MedicalDocumentsInternal::backendRoot() . '/uploads/medical/' . $documentId;
        if (!is_dir($directory)) {
            mkdir($directory, 0755, true);
        }
        $path = $directory . '/carte.pdf.encrypted';
        file_put_contents($path, 'chiffré');
        $this->files[] = $path;
        return $path;
    }

    private function demoteAllSuperAdmins(): void
    {
        $this->demotedAdmins = $this->db->query("SELECT id FROM profiles WHERE role = 'super_admin'")->fetchAll(PDO::FETCH_COLUMN);
        $this->db->exec("UPDATE profiles SET role = 'lab' WHERE role = 'super_admin'");
    }

    private function restoreAdmins(): void
    {
        if ($this->demotedAdmins === []) {
            return;
        }
        $placeholders = implode(',', array_fill(0, count($this->demotedAdmins), '?'));
        $this->db->prepare("UPDATE profiles SET role = 'super_admin' WHERE id IN ({$placeholders})")->execute($this->demotedAdmins);
        $this->demotedAdmins = [];
    }

    private function cleanup(): void
    {
        if ($this->appointments !== []) {
            $placeholders = implode(',', array_fill(0, count($this->appointments), '?'));
            $this->db->prepare("DELETE FROM appointments WHERE id IN ({$placeholders})")->execute($this->appointments);
        }
        if ($this->profiles !== []) {
            $placeholders = implode(',', array_fill(0, count($this->profiles), '?'));
            $this->db->prepare("DELETE FROM pharmacy_orders WHERE patient_id IN ({$placeholders})")->execute($this->profiles);
            $this->db->prepare("DELETE FROM reviews WHERE patient_id IN ({$placeholders})")->execute($this->profiles);
            $this->db->prepare("DELETE FROM medical_documents WHERE uploaded_by IN ({$placeholders})")->execute($this->profiles);
            $this->db->prepare("DELETE FROM profiles WHERE id IN ({$placeholders})")->execute($this->profiles);
        }
        foreach ($this->files as $path) {
            if (is_file($path)) {
                unlink($path);
            }
            if (is_dir(dirname($path))) {
                rmdir(dirname($path));
            }
        }
    }

    private function countRows(string $sql, array $params): int
    {
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return (int) $stmt->fetchColumn();
    }

    private function uuid(): string
    {
        $bytes = random_bytes(16);
        $bytes[6] = chr(ord($bytes[6]) & 0x0f | 0x40);
        $bytes[8] = chr(ord($bytes[8]) & 0x3f | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($bytes), 4));
    }
}

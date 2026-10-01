<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../fixtures/SkipsWithoutPdo.php';
require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../fixtures/TestFixtures.php';
require_once __DIR__ . '/../../models/User.php';

/**
 * Un e-mail déjà porté par un compte lève EmailAlreadyUsed (code EMAIL_ALREADY_USED), distinct des autres conflits.
 */
final class EmailAlreadyUsedTest extends TestCase
{
    use SkipsWithoutPdo;

    private PDO $db;
    private string $existingId = '';
    private ?string $createdId = null;

    protected function setUp(): void
    {
        parent::setUp();
        $this->requirePdo();
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN');
        }
        $this->db = TestDatabase::pdo();
        $this->existingId = TestFixtures::insertProfile($this->db, 'nurse');
    }

    protected function tearDown(): void
    {
        foreach (array_filter([$this->existingId, $this->createdId]) as $id) {
            $this->db->prepare('DELETE FROM profiles WHERE id = ?')->execute([$id]);
        }
        unset($this->db);
        parent::tearDown();
    }

    public function testDuplicateEmailRaisesDedicatedException(): void
    {
        $email = 'nurse-' . $this->existingId . '@test.invalid';

        try {
            $this->createdId = (new User($this->db))->create([
                'email' => strtoupper($email),
                'first_name' => 'Double',
                'last_name' => 'Compte',
                'role' => 'nurse',
                'phone' => '',
            ], TestFixtures::ADMIN, 'super_admin');
        } catch (EmailAlreadyUsed $e) {
            $this->assertSame('EMAIL_ALREADY_USED', EmailAlreadyUsed::CODE);
            $this->assertInstanceOf(DomainException::class, $e);
            $this->assertInstanceOf(PDOException::class, $e->getPrevious());
            return;
        }
        $this->fail('EmailAlreadyUsed attendue');
    }
}

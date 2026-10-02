<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../fixtures/SkipsWithoutPdo.php';
require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../fixtures/TestFixtures.php';
require_once __DIR__ . '/../../models/User.php';

/**
 * Réglages de commandes pharmacie via User::update : refus explicite (DomainException → 403 FORBIDDEN
 * côté PUT /users/{id}) au lieu d'une suppression silencieuse des champs.
 */
final class UserPharmacySettingsUpdateTest extends TestCase
{
    use SkipsWithoutPdo;

    private PDO $db;
    private User $userModel;
    private string $pharmacistId;

    protected function setUp(): void
    {
        parent::setUp();
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN');
        }
        $this->db = TestDatabase::pdo();
        $this->userModel = new User($this->db);
        $this->pharmacistId = TestFixtures::insertProfile($this->db, 'pro');
        $this->db->prepare('UPDATE profiles SET emploi = ?, pharmacy_orders_enabled = 1, pharmacy_orders_paused = 0 WHERE id = ?')
            ->execute(['Pharmacien', $this->pharmacistId]);
    }

    protected function tearDown(): void
    {
        if (isset($this->pharmacistId)) {
            $this->db->prepare('DELETE FROM profiles WHERE id = ?')->execute([$this->pharmacistId]);
        }
        parent::tearDown();
    }

    public function testPharmacistUpdatesOwnOperationSettings(): void
    {
        $this->assertTrue($this->userModel->update($this->pharmacistId, [
            'pharmacy_orders_paused' => true,
            'pharmacy_click_collect_days_json' => [1, 2, 3],
        ], $this->pharmacistId, 'pro'));

        $this->assertSame(1, $this->storedFlag($this->pharmacistId, 'pharmacy_orders_paused'));
    }

    public function testNonPharmacistProIsRefused(): void
    {
        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('Seule l’officine elle-même peut modifier ses réglages de commandes pharmacie.');

        $this->userModel->update(TestFixtures::PRO, ['pharmacy_orders_paused' => true], TestFixtures::PRO, 'pro');
    }

    public function testOtherActorCannotChangePharmacySettings(): void
    {
        try {
            $this->userModel->update($this->pharmacistId, ['pharmacy_orders_paused' => true], TestFixtures::LAB, 'lab');
            $this->fail('DomainException attendue');
        } catch (DomainException $e) {
            $this->assertSame('Seule l’officine elle-même peut modifier ses réglages de commandes pharmacie.', $e->getMessage());
        }

        $this->assertSame(0, $this->storedFlag($this->pharmacistId, 'pharmacy_orders_paused'));
    }

    public function testOnlyAdminTogglesPharmacyModule(): void
    {
        try {
            $this->userModel->update($this->pharmacistId, ['pharmacy_orders_enabled' => false], $this->pharmacistId, 'pro');
            $this->fail('DomainException attendue');
        } catch (DomainException $e) {
            $this->assertSame('Seul un administrateur peut activer ou désactiver le module de commandes pharmacie.', $e->getMessage());
        }
        $this->assertSame(1, $this->storedFlag($this->pharmacistId, 'pharmacy_orders_enabled'));

        $this->assertTrue($this->userModel->update($this->pharmacistId, [
            'pharmacy_orders_enabled' => false,
            'pharmacy_orders_paused' => true,
        ], TestFixtures::ADMIN, 'super_admin'));
        $this->assertSame(0, $this->storedFlag($this->pharmacistId, 'pharmacy_orders_enabled'));
        $this->assertSame(1, $this->storedFlag($this->pharmacistId, 'pharmacy_orders_paused'));
    }

    public function testMobileScopeKeepsEmploiButNotProfessionalIdentifiers(): void
    {
        $user = $this->userModel->getById($this->pharmacistId, $this->pharmacistId, 'pro', 'mobile');

        $this->assertNotNull($user);
        $this->assertSame('Pharmacien', $user['emploi']);
        $this->assertNull($user['rpps']);
        $this->assertNull($user['adeli']);
    }

    public function testUpdateWithoutPharmacyFieldsIsUnaffected(): void
    {
        $this->assertTrue($this->userModel->update(TestFixtures::PRO, ['phone' => '0601020304'], TestFixtures::PRO, 'pro'));
    }

    private function storedFlag(string $id, string $column): int
    {
        $stmt = $this->db->prepare("SELECT {$column} FROM profiles WHERE id = ?");
        $stmt->execute([$id]);

        return (int) $stmt->fetchColumn();
    }
}

<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../fixtures/SkipsWithoutPdo.php';
require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../fixtures/TestFixtures.php';
require_once __DIR__ . '/../../models/User.php';

/**
 * Photo de profil / couverture : enregistrement puis suppression via User::update (fixtures Docker).
 */
final class UserProfileImageUpdateTest extends TestCase
{
    use SkipsWithoutPdo;

    private const IMAGE = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';

    private PDO $db;
    private User $userModel;

    protected function setUp(): void
    {
        parent::setUp();
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN');
        }
        $this->db = TestDatabase::pdo();
        $this->userModel = new User($this->db);
    }

    public function testNullRemovesProfileAndCoverImages(): void
    {
        $id = TestFixtures::NURSE;
        $this->assertTrue($this->userModel->update($id, ['profile_image_url' => self::IMAGE, 'cover_image_url' => self::IMAGE], $id, 'nurse'));
        $this->assertSame([self::IMAGE, self::IMAGE], $this->storedImages($id));

        $this->assertTrue($this->userModel->update($id, ['profile_image_url' => null, 'cover_image_url' => null], $id, 'nurse'));
        $this->assertSame([null, null], $this->storedImages($id));
    }

    public function testOmittedImageFieldsAreLeftUntouched(): void
    {
        $id = TestFixtures::LAB;
        $this->assertTrue($this->userModel->update($id, ['profile_image_url' => self::IMAGE, 'cover_image_url' => self::IMAGE], $id, 'lab'));

        $this->assertTrue($this->userModel->update($id, ['phone' => '0601020304'], $id, 'lab'));
        $this->assertSame([self::IMAGE, self::IMAGE], $this->storedImages($id));
    }

    /** @return array{0: ?string, 1: ?string} */
    private function storedImages(string $id): array
    {
        $stmt = $this->db->prepare('SELECT profile_image_url, cover_image_url FROM profiles WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return [$row['profile_image_url'], $row['cover_image_url']];
    }
}

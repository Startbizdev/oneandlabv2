<?php

declare(strict_types=1);

require_once __DIR__ . '/../fixtures/SkipsWithoutPdo.php';
require_once __DIR__ . '/../fixtures/TestFixtures.php';
require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../../lib/Crypto.php';
require_once __DIR__ . '/../../lib/users/bootstrap.php';
require_once __DIR__ . '/../../models/User.php';

use PHPUnit\Framework\TestCase;

final class UserBatchLookupTest extends TestCase
{
    use SkipsWithoutPdo;

    public function testCompactForPickerDropsHeavyFields(): void
    {
        $out = UserDirectoryHelpers::compactForPicker([
            'id' => 'x',
            'role' => 'patient',
            'first_name' => 'A',
            'last_name' => 'B',
            'email' => 'a@b.test',
            'profile_image_url' => 'http://x',
            'gender' => 'female',
        ]);
        $this->assertSame('x', $out['id']);
        $this->assertSame('female', $out['gender']);
        $this->assertArrayNotHasKey('profile_image_url', $out);
    }

    public function testProfileMatchesAdminSearchByName(): void
    {
        $user = ['first_name' => 'Alice', 'last_name' => 'Patiente', 'email' => 'a@b.test'];
        $this->assertTrue(UserDirectoryHelpers::profileMatchesAdminSearch($user, 'alice'));
        $this->assertFalse(UserDirectoryHelpers::profileMatchesAdminSearch($user, 'zzz'));
    }

    public function testBatchDisplayNamesViaUserFacade(): void
    {
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN');
        }
        $user = new User(TestDatabase::pdo());
        $names = $user->getDisplayNamesByIds([TestFixtures::PATIENT_A, TestFixtures::NURSE]);
        $this->assertSame('Alice Patiente', $names[TestFixtures::PATIENT_A] ?? null);
        $this->assertSame('Nina Infirmiere', $names[TestFixtures::NURSE] ?? null);
    }
}

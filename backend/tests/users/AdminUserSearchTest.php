<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../models/User.php';

final class AdminUserSearchTest extends TestCase
{
    private function userMatchesSearch(array $user, string $q): bool
    {
        $ref = new ReflectionClass(User::class);
        $m = $ref->getMethod('profileMatchesAdminSearch');
        $m->setAccessible(true);

        return (bool) $m->invoke(new User(), $user, $q);
    }

    public function testMatchesFirstName(): void
    {
        $this->assertTrue($this->userMatchesSearch(['first_name' => 'Marie', 'last_name' => 'Dupont'], 'marie'));
    }

    public function testMatchesEmail(): void
    {
        $this->assertTrue($this->userMatchesSearch(['email' => 'Test@Example.com'], 'example.com'));
    }

    public function testMatchesCompany(): void
    {
        $this->assertTrue($this->userMatchesSearch(['company_name' => 'VITA SANTÉ'], 'vita'));
    }
}

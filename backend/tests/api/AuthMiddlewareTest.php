<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../fixtures/SkipsWithoutPdo.php';
require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../fixtures/TestFixtures.php';
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';

/**
 * Jeton refusé : message générique côté client, détail de la bibliothèque JWT conservé
 * en cause chaînée et journalisé côté serveur ; authentification facultative (POST /contact).
 */
final class AuthMiddlewareTest extends TestCase
{
    use SkipsWithoutPdo;

    private string $logFile;
    private string|false $previousLog;

    protected function setUp(): void
    {
        parent::setUp();
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN');
        }
        $this->logFile = (string) tempnam(sys_get_temp_dir(), 'auth-middleware-');
        $this->previousLog = ini_get('error_log');
        ini_set('error_log', $this->logFile);
        unset($_SERVER['HTTP_AUTHORIZATION']);
    }

    protected function tearDown(): void
    {
        unset($_SERVER['HTTP_AUTHORIZATION']);
        if (isset($this->logFile)) {
            ini_set('error_log', $this->previousLog === false ? '' : $this->previousLog);
            if (is_file($this->logFile)) {
                unlink($this->logFile);
            }
        }
        parent::tearDown();
    }

    public function testInvalidJwtIsGenericWithLibraryCauseChained(): void
    {
        try {
            (new Auth())->verifyJWT('pas.un.jwt');
            $this->fail('UnexpectedValueException attendue');
        } catch (UnexpectedValueException $e) {
            $this->assertSame('Token JWT invalide', $e->getMessage());
            $this->assertInstanceOf(Throwable::class, $e->getPrevious());
        }
    }

    public function testTryAuthenticateWithoutHeaderReturnsNull(): void
    {
        $this->assertNull((new AuthMiddleware())->tryAuthenticate());
    }

    public function testTryAuthenticateWithInvalidTokenReturnsNullAndLogsDetail(): void
    {
        $_SERVER['HTTP_AUTHORIZATION'] = 'Bearer pas.un.jwt';

        $this->assertNull((new AuthMiddleware())->tryAuthenticate());

        $log = (string) file_get_contents($this->logFile);
        $this->assertStringContainsString('JWT rejeté', $log);
        $this->assertStringContainsString('UnexpectedValueException: Token JWT invalide', $log);
    }

    public function testTryAuthenticateWithMalformedHeaderReturnsNull(): void
    {
        $_SERVER['HTTP_AUTHORIZATION'] = 'Basic dXNlcjpwYXNz';

        $this->assertNull((new AuthMiddleware())->tryAuthenticate());
    }

    public function testTryAuthenticateUsesRoleFromDatabase(): void
    {
        $token = (new Auth())->generateJWT(TestFixtures::PRO, 'patient');
        $_SERVER['HTTP_AUTHORIZATION'] = 'Bearer ' . $token;

        $this->assertSame(
            ['user_id' => TestFixtures::PRO, 'role' => 'pro'],
            (new AuthMiddleware())->tryAuthenticate()
        );
    }

    public function testTryAuthenticateForUnknownUserReturnsNull(): void
    {
        $token = (new Auth())->generateJWT('00000000-0000-4000-8000-0000000fffff', 'patient');
        $_SERVER['HTTP_AUTHORIZATION'] = 'Bearer ' . $token;

        $this->assertNull((new AuthMiddleware())->tryAuthenticate());
    }
}

<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/ApiServerError.php';

final class ApiServerErrorTest extends TestCase
{
    private const SECRET = "SQLSTATE[42S22]: Column not found: 1054 Unknown column 'secret_col' in /var/www/html/models/User.php";

    private string $logFile;
    private string|false $previousLog;

    protected function setUp(): void
    {
        $this->logFile = (string) tempnam(sys_get_temp_dir(), 'api-server-error-');
        $this->previousLog = ini_get('error_log');
        ini_set('error_log', $this->logFile);
        $_SERVER['REQUEST_METHOD'] = 'PUT';
        $_SERVER['REQUEST_URI'] = '/api/users/abc?token=xyz';
    }

    protected function tearDown(): void
    {
        ini_set('error_log', $this->previousLog === false ? '' : $this->previousLog);
        unset($_SERVER['REQUEST_METHOD'], $_SERVER['REQUEST_URI']);
        http_response_code(200);
        if (is_file($this->logFile)) {
            unlink($this->logFile);
        }
    }

    /** @return array{0: array<string, mixed>, 1: string} */
    private function respond(?string $message = null): array
    {
        $exception = new PDOException(self::SECRET);
        ob_start();
        if ($message === null) {
            ApiServerError::respond('users/update user=42', $exception);
        } else {
            ApiServerError::respond('users/update user=42', $exception, $message);
        }
        $body = (string) ob_get_clean();

        return [json_decode($body, true, 512, JSON_THROW_ON_ERROR), $body];
    }

    public function testRespondsWithGenericServerErrorContract(): void
    {
        [$payload] = $this->respond();

        $this->assertSame(500, http_response_code());
        $this->assertSame(
            ['success' => false, 'error' => ApiServerError::DEFAULT_MESSAGE, 'code' => 'SERVER_ERROR'],
            $payload
        );
    }

    public function testNeverLeaksExceptionDetailsInResponse(): void
    {
        [, $body] = $this->respond();

        $this->assertStringNotContainsString('SQLSTATE', $body);
        $this->assertStringNotContainsString('secret_col', $body);
        $this->assertStringNotContainsString('/var/www', $body);
        $this->assertStringNotContainsString(basename(__FILE__), $body);
    }

    public function testUsesCustomFrenchMessage(): void
    {
        [$payload, $body] = $this->respond('Impossible de mettre à jour l\'utilisateur. Réessayez plus tard.');

        $this->assertSame(500, http_response_code());
        $this->assertSame('SERVER_ERROR', $payload['code']);
        $this->assertSame('Impossible de mettre à jour l\'utilisateur. Réessayez plus tard.', $payload['error']);
        $this->assertStringNotContainsString('SQLSTATE', $body);
    }

    public function testLogsContextualizedDetailsServerSide(): void
    {
        $this->respond();

        $log = (string) file_get_contents($this->logFile);
        $this->assertStringContainsString('[PUT /api/users/abc]', $log);
        $this->assertStringNotContainsString('token=xyz', $log);
        $this->assertStringContainsString('users/update user=42', $log);
        $this->assertStringContainsString('PDOException', $log);
        $this->assertStringContainsString(self::SECRET, $log);
    }
}

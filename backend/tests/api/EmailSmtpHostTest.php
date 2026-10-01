<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/Email.php';

/**
 * Sans SMTP_HOST, aucun envoi n'est tenté vers un serveur par défaut : échec fermé et journalisé.
 */
final class EmailSmtpHostTest extends TestCase
{
    private ?string $previousHost = null;
    private bool $hadHost = false;
    private string $previousErrorLog = '';
    private string $logFile = '';

    protected function setUp(): void
    {
        parent::setUp();
        $this->hadHost = array_key_exists('SMTP_HOST', $_ENV);
        $this->previousHost = $this->hadHost ? (string) $_ENV['SMTP_HOST'] : null;
        $this->logFile = (string) tempnam(sys_get_temp_dir(), 'email-log');
        $this->previousErrorLog = (string) ini_get('error_log');
        ini_set('error_log', $this->logFile);
    }

    protected function tearDown(): void
    {
        ini_set('error_log', $this->previousErrorLog);
        if ($this->hadHost) {
            $_ENV['SMTP_HOST'] = $this->previousHost;
        } else {
            unset($_ENV['SMTP_HOST']);
        }
        if ($this->logFile !== '' && is_file($this->logFile)) {
            unlink($this->logFile);
        }
        parent::tearDown();
    }

    /** @return iterable<string, array{0: string|null}> */
    public static function missingHostProvider(): iterable
    {
        yield 'variable absente' => [null];
        yield 'variable vide' => [''];
        yield 'espaces seulement' => ['   '];
    }

    /** @dataProvider missingHostProvider */
    public function testSendFailsClosedAndLogsWithoutSmtpHost(?string $host): void
    {
        if ($host === null) {
            unset($_ENV['SMTP_HOST']);
        } else {
            $_ENV['SMTP_HOST'] = $host;
        }

        $started = microtime(true);
        $sent = (new Email())->send('destinataire@test.invalid', 'Sujet', '<p>Corps</p>');

        $this->assertFalse($sent);
        $this->assertLessThan(1.0, microtime(true) - $started, 'Aucune connexion réseau ne doit être tentée');
        $this->assertStringContainsString('SMTP_HOST not configured', (string) file_get_contents($this->logFile));
    }
}

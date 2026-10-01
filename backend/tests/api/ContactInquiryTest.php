<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../fixtures/SkipsWithoutPdo.php';
require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../fixtures/TestFixtures.php';
require_once __DIR__ . '/../../lib/ContactInquiry.php';

/**
 * POST /contact : le bloc « compte » de l'e-mail vient uniquement de la session vérifiée,
 * le message anonyme n'en contient aucun, et les valeurs saisies sont échappées.
 */
final class ContactInquiryTest extends TestCase
{
    use SkipsWithoutPdo;

    private const ENDPOINT = __DIR__ . '/../../api/contact/index.php';

    public function testAccountRowsComeFromVerifiedSession(): void
    {
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN');
        }

        $rows = ContactInquiry::accountRows(
            ['user_id' => TestFixtures::PATIENT_A, 'role' => 'patient'],
            new User(TestDatabase::pdo())
        );

        $this->assertSame([
            'Identifiant compte' => TestFixtures::PATIENT_A,
            'Rôle' => 'patient',
            'E-mail compte' => 'alice.patient@test.invalid',
        ], $rows);
    }

    public function testAnonymousMessageHasNoAccountSection(): void
    {
        $html = ContactInquiry::innerHtml('Question générale', 'Jean', 'jean@example.test', 'Bonjour', []);

        $this->assertStringNotContainsString('Compte connecté', $html);
        $this->assertStringNotContainsString('Identifiant compte', $html);
    }

    public function testConnectedMessageListsServerRowsAndEscapesValues(): void
    {
        $html = ContactInquiry::innerHtml(
            'Réclamation',
            '<script>alert(1)</script>',
            'jean@example.test',
            "Ligne 1\n<b>Ligne 2</b>",
            ['Identifiant compte' => TestFixtures::PATIENT_A, 'Rôle' => 'patient', 'E-mail compte' => '']
        );

        $this->assertStringContainsString('Compte connecté (vérifié par le serveur)', $html);
        $this->assertStringContainsString(TestFixtures::PATIENT_A, $html);
        $this->assertStringNotContainsString('E-mail compte', $html);
        $this->assertStringNotContainsString('<script>', $html);
        $this->assertStringContainsString('&lt;script&gt;', $html);
        $this->assertStringContainsString('&lt;b&gt;Ligne 2&lt;/b&gt;', $html);
    }

    public function testClientRowsKeepOnlyWhitelistedWellFormedValues(): void
    {
        $rows = ContactInquiry::clientRows([
            'app_version' => ' 2.4.1 ',
            'build' => '142',
            'platform' => 'android',
            'device_model' => 'Google Pixel 8 (API 35)',
            'user_id' => TestFixtures::PATIENT_B,
            'role' => 'super_admin',
        ]);

        $this->assertSame([
            'Version de l\'application' => '2.4.1',
            'Build' => '142',
            'Plateforme' => 'android',
            'Appareil' => 'Google Pixel 8 (API 35)',
        ], $rows);
    }

    /** @return iterable<string, array{mixed}> */
    public static function rejectedClientProvider(): iterable
    {
        yield 'pas un objet' => ['ios'];
        yield 'plateforme inconnue' => [['platform' => 'windows']];
        yield 'version trop longue' => [['app_version' => str_repeat('1', 33)]];
        yield 'version avec balise' => [['app_version' => '<b>1</b>']];
        yield 'appareil trop long' => [['device_model' => str_repeat('a', 65)]];
        yield 'appareil avec saut de ligne' => [['device_model' => "Pixel\nBcc: x@y.z"]];
        yield 'valeur non textuelle' => [['build' => ['142']]];
    }

    /** @dataProvider rejectedClientProvider */
    public function testClientRowsDropInvalidValues(mixed $client): void
    {
        $this->assertSame([], ContactInquiry::clientRows($client));
    }

    public function testClientSectionIsSeparateFromVerifiedAccount(): void
    {
        $html = ContactInquiry::innerHtml(
            'Assistance application Cary (mobile)',
            'Jean',
            'jean@example.test',
            'Bonjour',
            [],
            ContactInquiry::clientRows(['platform' => 'ios', 'app_version' => '2.4.1'])
        );

        $this->assertStringNotContainsString('Compte connecté', $html);
        $this->assertStringContainsString('Application (déclaré par l&#039;appareil, non vérifié)', $html);
        $this->assertStringContainsString('<strong>Plateforme :</strong> ios', $html);
    }

    public function testEndpointIgnoresClientSuppliedContext(): void
    {
        $source = (string) file_get_contents(self::ENDPOINT);

        $this->assertDoesNotMatchRegularExpression('/\$input\[\s*[\'"]context[\'"]\s*\]/', $source);
        $this->assertStringContainsString('tryAuthenticate()', $source);
    }
}

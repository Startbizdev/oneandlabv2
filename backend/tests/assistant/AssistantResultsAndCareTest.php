<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../support/HttpHarness.php';
require_once __DIR__ . '/support/AssistantFixtures.php';
require_once __DIR__ . '/../../lib/assistant/AssistantTools.php';

/**
 * Lecture du dernier compte rendu avec l'accord du patient, réglage de cet accord, catalogue des soins
 * pour la réservation préremplie, dictée réservée aux rôles qui écrivent des transmissions.
 */
final class AssistantResultsAndCareTest extends TestCase
{
    private AssistantFixtures $fixtures;
    private PDO $db;

    protected function setUp(): void
    {
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN non défini');
        }
        $this->db = TestDatabase::pdo();
        $this->fixtures = new AssistantFixtures($this->db);
        HttpHarness::baseUrl();
    }

    protected function tearDown(): void
    {
        if (isset($this->fixtures)) {
            $this->fixtures->cleanup();
        }
        parent::tearDown();
    }

    /** @return array{0: AssistantTools, 1: ArrayObject<int, array<string, mixed>>} cartes émises */
    private function tools(string $userId, string $role): array
    {
        $actions = new ArrayObject();
        $tools = new AssistantTools($this->db, ['user_id' => $userId, 'role' => $role], null, new PrivacyGateway(), static function (array $action) use ($actions): void {
            $actions->append($action);
        });

        return [$tools, $actions];
    }

    private function resultsDocument(string $patientId, string $bytes, string $mime = 'application/pdf'): string
    {
        $appointmentId = $this->fixtures->appointment($patientId, null, 'completed', '-2 days 08:00');
        $id = $this->fixtures->document($patientId, $patientId, $mime, $bytes);
        $this->db->prepare('UPDATE medical_documents SET appointment_id = ?, document_type = \'resultats\' WHERE id = ?')->execute([$appointmentId, $id]);

        return $id;
    }

    /** PDF minimal d'une page, texte lisible par pdftotext. */
    private static function pdf(string $line): string
    {
        $stream = 'BT /F1 12 Tf 40 760 Td (' . $line . ') Tj ET';
        $objects = [
            '<< /Type /Catalog /Pages 2 0 R >>',
            '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
            '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
            '<< /Length ' . strlen($stream) . " >>\nstream\n" . $stream . "\nendstream",
            '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
        ];
        $out = "%PDF-1.4\n";
        $offsets = [];
        foreach ($objects as $i => $object) {
            $offsets[] = strlen($out);
            $out .= ($i + 1) . " 0 obj\n" . $object . "\nendobj\n";
        }
        $xref = strlen($out);
        $out .= 'xref' . "\n0 " . (count($objects) + 1) . "\n0000000000 65535 f \n";
        foreach ($offsets as $offset) {
            $out .= sprintf("%010d 00000 n \n", $offset);
        }

        return $out . 'trailer << /Size ' . (count($objects) + 1) . " /Root 1 0 R >>\nstartxref\n" . $xref . "\n%%EOF";
    }

    public function testWithoutConsentResultsStayMinimalAndOfferTheConsentButton(): void
    {
        $patientId = $this->fixtures->profile('patient');
        $this->resultsDocument($patientId, self::pdf('Hemoglobine 10.1 g/dL'));
        [$tools, $actions] = $this->tools($patientId, 'patient');

        $out = $tools->execute('get_lab_results', []);

        $this->assertCount(1, $out['items']);
        $this->assertArrayNotHasKey('dernier_compte_rendu', $out);
        $this->assertSame([['type' => 'enable_results_reading', 'label' => 'Autoriser la lecture de mes résultats', 'params' => []]], $actions->getArrayCopy());
    }

    public function testWithConsentTheLatestReportIsReadAndMasked(): void
    {
        if (trim((string) shell_exec('command -v pdftotext')) === '') {
            $this->markTestSkipped('pdftotext absent');
        }
        $patientId = $this->fixtures->profile('patient', 'Odile', 'Bernard');
        $this->resultsDocument($patientId, self::pdf('Odile Bernard - Hemoglobine 10.1 g/dL - tel 06 11 22 33 44'));
        AssistantResultsConsent::set($this->db, $patientId, true);
        [$tools, $actions] = $this->tools($patientId, 'patient');
        $tools->registerKnownNames();

        $out = $tools->execute('get_lab_results', []);

        $this->assertStringContainsString('Hemoglobine 10.1 g/dL', $out['dernier_compte_rendu']);
        $this->assertStringNotContainsString('Odile', $out['dernier_compte_rendu'], 'Nom remplacé par un alias');
        $this->assertStringContainsString('[téléphone masqué]', $out['dernier_compte_rendu']);
        $this->assertSame([], $actions->getArrayCopy());
    }

    public function testStaffNeverGetsTheAutomaticReading(): void
    {
        $nurseId = $this->fixtures->profile('nurse');
        $patientId = $this->fixtures->profile('patient');
        $this->resultsDocument($patientId, self::pdf('Glycemie 1.4 g/L'));
        $this->fixtures->appointment($patientId, $nurseId);
        AssistantResultsConsent::set($this->db, $patientId, true);
        [$tools, $actions] = $this->tools($nurseId, 'nurse');

        $out = $tools->execute('get_lab_results', ['patient_id' => $patientId]);

        $this->assertArrayNotHasKey('dernier_compte_rendu', $out);
        $this->assertSame([], $actions->getArrayCopy());
    }

    public function testConsentSettingIsPatientOnlyAndRevocable(): void
    {
        $patientId = $this->fixtures->profile('patient');
        $token = HttpHarness::token($patientId, 'patient');

        $this->assertFalse(HttpHarness::request('GET', '/api/assistant/settings', $token)['json']['data']['results_reading']);
        $on = HttpHarness::request('PUT', '/api/assistant/settings', $token, ['results_reading' => true]);
        $this->assertSame(200, $on['status'], $on['raw']);
        $this->assertTrue($on['json']['data']['results_reading']);
        $this->assertTrue(AssistantResultsConsent::has($this->db, $patientId));
        $off = HttpHarness::request('PUT', '/api/assistant/settings', $token, ['results_reading' => false]);
        $this->assertFalse($off['json']['data']['results_reading']);
        $this->assertFalse(AssistantResultsConsent::has($this->db, $patientId));
        $this->assertSame(400, HttpHarness::request('PUT', '/api/assistant/settings', $token, ['results_reading' => 'oui'])['status']);
        $nurse = HttpHarness::request('GET', '/api/assistant/settings', HttpHarness::token($this->fixtures->profile('nurse'), 'nurse'));
        $this->assertSame(403, $nurse['status']);
    }

    public function testCareCatalogForBookingHidesStaffOnlyCare(): void
    {
        $patientId = $this->fixtures->profile('patient');
        [$tools] = $this->tools($patientId, 'patient');

        $names = array_column($tools->execute('list_care_categories', [])['items'], 'soin');

        $this->assertNotSame([], $names);
        foreach ($names as $name) {
            $this->assertDoesNotMatchRegularExpression('/certificat\s+(de\s+)?d[ée]c[èe]s/iu', $name);
        }
        $this->assertContains('list_care_categories', array_map(static fn (array $t): string => $t['function']['name'], AssistantTools::definitions('patient')));
        $this->assertNotContains('list_care_categories', array_map(static fn (array $t): string => $t['function']['name'], AssistantTools::definitions('nurse')));
    }

    public function testBookingCardKeepsDateAndTimeRange(): void
    {
        $patientId = $this->fixtures->profile('patient');
        [$tools, $actions] = $this->tools($patientId, 'patient');

        $tools->execute('propose_action', ['type' => 'book_appointment', 'label' => 'Réserver', 'params' => ['category_id' => 'cat-1', 'date' => '2026-11-03', 'time_from' => '8', 'time_to' => '10', 'body' => 'x']]);

        $this->assertSame(['category_id' => 'cat-1', 'date' => '2026-11-03', 'time_from' => '8', 'time_to' => '10'], $actions[0]['params']);
    }

    public function testDictationIsClosedToPhlebotomists(): void
    {
        $preleveurId = $this->fixtures->profile('preleveur');
        $res = HttpHarness::request('POST', '/api/assistant/dictation', HttpHarness::token($preleveurId, 'preleveur'), ['transcript' => 'x', 'patient_id' => $this->fixtures->profile('patient')]);

        $this->assertSame(403, $res['status']);
        $this->assertSame('ASSISTANT_ROLE_NOT_SUPPORTED', $res['json']['code']);
    }
}

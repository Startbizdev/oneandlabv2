<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/assistant/PrivacyGateway.php';

final class PrivacyGatewayTest extends TestCase
{
    private function gateway(): PrivacyGateway
    {
        $gateway = new PrivacyGateway();
        $this->assertSame('Patient A', $gateway->alias('Hélène Dupont-Léger', 'Patient'));
        $this->assertSame('Proche A', $gateway->alias('Jean Martin', 'Proche'));
        $this->assertSame('Soignant A', $gateway->alias('Claire Petit', 'Soignant'));

        return $gateway;
    }

    public function testAliasesAreStablePerNameAndKind(): void
    {
        $gateway = $this->gateway();
        $this->assertSame('Patient A', $gateway->alias('  hélène   dupont-léger '), 'Même personne, casse et espaces différents');
        $this->assertSame('Patient B', $gateway->alias('Paul Durand'));
        $this->assertSame('Proche B', $gateway->alias('Lucie Martin', 'Proche'));
        $this->assertSame([['Hélène Dupont-Léger', 'Patient'], ['Jean Martin', 'Proche'], ['Claire Petit', 'Soignant'], ['Paul Durand', 'Patient'], ['Lucie Martin', 'Proche']], $gateway->names());
        $this->assertSame('le patient', $gateway->alias(''));
    }

    public function testMaskReplacesNamesWhateverTheCaseAccentsAndOrder(): void
    {
        $gateway = $this->gateway();
        $masked = $gateway->mask('helene dupont leger a vu DUPONT-LÉGER, puis Hélène ; MARTIN Jean et la fille de Jean viennent. Une réponse claire de Petit.');
        $this->assertSame('Patient A a vu Patient A, puis Patient A ; Proche A et la fille de Proche A viennent. Une réponse claire de Soignant A.', $masked);
        $this->assertSame('le petit déjeuner et une martingale', $gateway->mask('le petit déjeuner et une martingale'), 'Mots communs en minuscules non masqués');
        $this->assertSame('l\'avis d\'Patient A', $gateway->mask('l\'avis d\'Hélène'));
    }

    public function testMaskRemovesContactAndIdentifiers(): void
    {
        $gateway = new PrivacyGateway();
        $text = $gateway->mask(
            'Tél 06 12 34 56 78 ou +33 6 12 34 56 78, mail jeanne.martin@example.fr, NIR 1 85 05 78 006 084 36, '
            . 'IBAN FR76 3000 6000 0112 3456 7890 189, dossier n° AB12345, né le 01/02/1950, '
            . 'habite 12 bis rue des Lilas, 75011 Paris (48.86612, 2.35231).'
        );
        foreach (['06 12', '+33', 'jeanne', '85 05', 'FR76', 'AB12345', '01/02/1950', 'Lilas', '75011', '48.866'] as $leak) {
            $this->assertStringNotContainsString($leak, $text, $leak);
        }
        $this->assertStringContainsString('[téléphone masqué]', $text);
        $this->assertStringContainsString('[e-mail masqué]', $text);
        $this->assertStringContainsString('[n° de sécurité sociale masqué]', $text);
        $this->assertStringContainsString('[IBAN masqué]', $text);
        $this->assertStringContainsString('[adresse masquée]', $text);
        $this->assertStringContainsString('âgé(e) de ' . PrivacyGateway::ageFromBirthDate('1950-02-01') . ' ans', $text);
        $this->assertStringContainsString('Paris', $text, 'La ville reste utile');
    }

    public function testMaskKeepsMedicalValuesIntact(): void
    {
        $text = 'Hémoglobine 13,5 g/dL ; plaquettes 250000 /mm3 ; glycémie 1,05 g/L le 12/03/2025 à 08:30.';
        $this->assertSame($text, (new PrivacyGateway())->mask($text));
    }

    public function testMaskDataKeepsTechnicalIds(): void
    {
        $gateway = $this->gateway();
        $data = $gateway->maskData(['id' => '06123456789', 'patient_id' => 'x', 'date' => '2025-01-01', 'items' => [['note' => 'Appeler Hélène au 0612345678']]]);
        $this->assertSame('06123456789', $data['id']);
        $this->assertSame('Appeler Patient A au [téléphone masqué]', $data['items'][0]['note']);
    }

    public function testRehydrateRestoresNamesWithPossessivesAndWordBoundaries(): void
    {
        $gateway = $this->gateway();
        $this->assertSame('Le dossier de Hélène Dupont-Léger et de Jean Martin.', $gateway->rehydrate('Le dossier de Patient A et de Proche A.'));
        $this->assertSame('Patient AB, le patient a', $gateway->rehydrate('Patient AB, le patient a'), 'Alias inconnu ou en minuscules : inchangé');
    }

    public function testStreamRehydrationHandlesAliasesSplitAcrossChunks(): void
    {
        $gateway = $this->gateway();
        $chunks = ['Bonjour ', 'Pat', 'ient', ' A', ', voici ', 'le suivi de Pro', 'che A et P', 'aul. Soignant', ' A'];
        $out = '';
        foreach ($chunks as $chunk) {
            $out .= $gateway->rehydrateStream($chunk);
        }
        $out .= $gateway->flush();
        $this->assertSame('Bonjour Hélène Dupont-Léger, voici le suivi de Jean Martin et Paul. Claire Petit', $out);
    }

    public function testStreamDoesNotHoldOrdinaryText(): void
    {
        $gateway = $this->gateway();
        $this->assertSame('Bonjour, comment ', $gateway->rehydrateStream('Bonjour, comment '));
        $this->assertSame('allez-vous ?', $gateway->rehydrateStream('allez-vous ?'));
        $this->assertSame('', $gateway->flush());
    }

    public function testStreamWithoutAliasesIsPassThrough(): void
    {
        $gateway = new PrivacyGateway();
        $this->assertSame('Pat', $gateway->rehydrateStream('Pat'));
    }

    public function testAgeFromBirthDate(): void
    {
        $tenYearsAgo = (new DateTimeImmutable('today'))->modify('-10 years')->format('Y-m-d');
        $this->assertSame(10, PrivacyGateway::ageFromBirthDate($tenYearsAgo));
        $this->assertNull(PrivacyGateway::ageFromBirthDate('pas une date'));
        $this->assertNull(PrivacyGateway::ageFromBirthDate(null));
    }
}

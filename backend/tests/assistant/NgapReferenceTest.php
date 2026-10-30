<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/assistant/NgapReference.php';

final class NgapReferenceTest extends TestCase
{
    private const SAMPLE = <<<TXT
        NOMENCLATURE GÉNÉRALE DES ACTES PROFESSIONNELS
        Version du 15 juillet 2026

        TITRE XVI - SOINS INFIRMIERS
        CHAPITRE I - SOINS DE PRATIQUE COURANTE
        Article 1 - Prélèvements et injections
        Prélèvement par ponction veineuse directe ................ AMI 1,5
        Injection intramusculaire ................................ AMI 1
        Article 3 - Pansements courants
        Pansement de plaie opératoire étendue ..................... AMI 2
        Ablation de fils ou d'agrafes, dix ou moins, y compris le pansement éventuel ..... AMI 2
        CHAPITRE II - SOINS SPÉCIALISÉS
        Article 5 bis - Prise en charge à domicile d'un patient insulino-traité
        Surveillance et observation d'un patient diabétique insulino-traité ..... AMI 1
        TXT;

    public function testIndexKeepsVersionAndOnePassagePerArticleUnderItsHeadings(): void
    {
        $index = NgapReference::buildIndex(self::SAMPLE, '01/01/2026');

        $this->assertSame('15 juillet 2026', $index['version']);
        $titles = array_column($index['chunks'], 'title');
        $this->assertContains('TITRE XVI - SOINS INFIRMIERS › CHAPITRE I - SOINS DE PRATIQUE COURANTE › Article 3 - Pansements courants', $titles);
        $this->assertContains('TITRE XVI - SOINS INFIRMIERS › CHAPITRE II - SOINS SPÉCIALISÉS › Article 5 bis - Prise en charge à domicile d\'un patient insulino-traité', $titles);
    }

    public function testSearchRanksTheMatchingArticleFirst(): void
    {
        $index = NgapReference::buildIndex(self::SAMPLE, '01/01/2026');

        $passages = NgapReference::search('Comment coter une ablation d\'agrafes ?', 4, $index);

        $this->assertNotSame([], $passages);
        $this->assertStringContainsString('Article 3 - Pansements courants', $passages[0]['titre']);
        $this->assertStringContainsString('AMI 2', $passages[0]['texte']);
        $this->assertSame([], NgapReference::search('comment coter', 4, $index), 'Mots vides seulement : rien');
        $this->assertStringContainsString('insulino', NgapReference::search('patient diabétique insuline', 4, $index)[0]['titre']);
    }

    public function testFallbackVersionWhenThePdfHasNone(): void
    {
        $this->assertSame('01/01/2026', NgapReference::buildIndex("Article 1 - Test\nUn texte assez long pour former un passage complet.", '01/01/2026')['version']);
    }

    public function testTokensIgnoreAccentsAndCase(): void
    {
        $this->assertSame(['ablation', 'agrafes', 'pansement'], NgapReference::tokens('Ablation d\'Agrafes — PANSEMENT'));
    }
}

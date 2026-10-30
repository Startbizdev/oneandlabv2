<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/assistant/BillingEstimate.php';

/** Montants calculés par le serveur avec la grille officielle (AMI 3,15 €, IFD 2,75 €, MAU 1,35 €, dimanche 8,50 €). */
final class BillingEstimateTest extends TestCase
{
    private const INSULIN_DAY = [
        'passages' => [
            // Le modèle ne donne que les actes : cumul, IFD et MAU sont appliqués par le serveur.
            ['label' => '7 h', 'actes' => [['code' => 'AMI', 'coefficient' => 1], ['code' => 'AMI', 'coefficient' => 1]]],
            ['label' => '12 h', 'actes' => [['code' => 'AMI', 'coefficient' => 1]]],
            ['label' => '19 h', 'actes' => [['code' => 'AMI', 'coefficient' => 1], ['code' => 'AMI', 'coefficient' => 1], ['code' => 'AMI', 'coefficient' => 1]]],
        ],
        'dimanche_ferie' => true,
    ];

    public function testPerPassageDaySundayAndWeekTotals(): void
    {
        $out = BillingEstimate::estimate(self::INSULIN_DAY);

        $this->assertSame([
            ['passage' => '7 h', 'cotation' => 'AMI 1 + AMI 1 à 50 % + IFD', 'montant' => '7,48 €'],
            ['passage' => '12 h', 'cotation' => 'AMI 1 + IFD + MAU', 'montant' => '7,25 €'],
            ['passage' => '19 h', 'cotation' => 'AMI 1 + AMI 1 à 50 % + IFD', 'montant' => '7,48 €'],
        ], $out['passages']);
        $this->assertSame('22,21 €', $out['total_jour_semaine'], '7,475 arrondi à 7,48 par passage');
        $this->assertStringStartsWith('47,71 €', $out['total_dimanche_ferie'], '22,21 + 3 × 8,50');
        $this->assertSame('180,97 €', $out['total_semaine'], '6 × 22,21 + 47,71');
        $this->assertStringContainsString('ameli.fr', $out['source']);
    }

    public function testDurationCountsTheSundaysOfTheRange(): void
    {
        // Du lundi 2 au dimanche 15 novembre 2026 : 14 jours dont 2 dimanches.
        $out = BillingEstimate::estimate(self::INSULIN_DAY + ['duree_jours' => 14, 'date_debut' => '2026-11-02']);

        $this->assertStringStartsWith('361,94 €', $out['total_duree'], '12 × 22,21 + 2 × 47,71');
        $this->assertStringContainsString('2 dimanches', $out['total_duree']);
    }

    public function testHighestCoefficientFirstAndBloodTestAtFullRate(): void
    {
        $out = BillingEstimate::estimate(['passages' => [[
            'label' => 'Matin',
            'actes' => [['code' => 'AMI', 'coefficient' => 1], ['code' => 'AMI', 'coefficient' => 2.02], ['code' => 'AMI', 'coefficient' => 1.5, 'cumul_taux_plein' => true]],
        ]], 'domicile' => false]);

        $this->assertSame('AMI 2,02 + AMI 1,5 + AMI 1 à 50 %', $out['passages'][0]['cotation'], 'Pansement 100 %, prise de sang à taux plein, injection à 50 %');
        $this->assertSame('12,66 €', $out['passages'][0]['montant'], '(2,02 + 1,5 + 0,5) × 3,15 = 12,663, sans IFD au cabinet');

        $named = BillingEstimate::estimate(['passages' => [['label' => 'Matin', 'actes' => [
            ['libelle' => 'Pansement simple', 'code' => 'AMI', 'coefficient' => 2.02],
            ['libelle' => 'Prise de sang', 'code' => 'AMI', 'coefficient' => 1.5],
        ]]]]);
        $this->assertSame('AMI 2,02 + AMI 1,5 + IFD', $named['passages'][0]['cotation'], 'Prise de sang reconnue à son libellé : taux plein');
    }

    public function testOverseasRatesAndInvalidActs(): void
    {
        $out = BillingEstimate::estimate(['passages' => [['label' => 'Matin', 'actes' => [['code' => 'AMI', 'coefficient' => 1.5]]]], 'zone' => 'outre_mer']);
        $this->assertSame('9,05 €', $out['passages'][0]['montant'], '1,5 × 3,30 + IFD 2,75 + MAU 1,35');

        $this->assertArrayHasKey('error', BillingEstimate::estimate(['passages' => [['label' => 'X', 'actes' => [['code' => 'ZZZ', 'coefficient' => 1]]]]]));
        $this->assertArrayHasKey('error', BillingEstimate::estimate(['passages' => []]));
    }
}

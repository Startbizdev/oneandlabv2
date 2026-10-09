<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/AddressDisplayFr.php';

/** Arrondissements de Paris, Marseille et Lyon : même règle que `frenchCityDistrictLabel` (shared-utils). */
final class AddressDisplayFrDistrictTest extends TestCase
{
    /** @return array<string, array{0: string, 1: ?string}> */
    public static function postcodes(): array
    {
        return [
            'Marseille 3e' => ['13003', 'Marseille 3e'],
            'Marseille 1er' => ['13001', 'Marseille 1er'],
            'Marseille 16e' => ['13016', 'Marseille 16e'],
            'Marseille hors arrondissement' => ['13017', null],
            'Aubagne' => ['13400', null],
            'Lyon 1er' => ['69001', 'Lyon 1er'],
            'Lyon 9e' => ['69009', 'Lyon 9e'],
            'Villeurbanne' => ['69100', null],
            'Paris 15e' => ['75015', 'Paris 15e'],
            'Paris 20e' => ['75020', 'Paris 20e'],
            'Paris 16e bis' => ['75116', null],
            'Code incomplet' => ['1300', null],
        ];
    }

    /** @dataProvider postcodes */
    public function testCityDistrictLabel(string $postcode, ?string $expected): void
    {
        $this->assertSame($expected, AddressDisplayFr::cityDistrictLabel($postcode));
    }

    public function testShareLineShowsMarseilleDistrictWithoutStreetNumber(): void
    {
        $this->assertSame(
            'Rue Bouès, Marseille 3e',
            AddressDisplayFr::shareWhatsAppAddressLine('12 Rue Bouès, 13003 Marseille, France'),
        );
    }

    public function testShareLineShowsLyonAndParisDistricts(): void
    {
        $this->assertSame('Rue Mercière, Lyon 2e', AddressDisplayFr::shareWhatsAppAddressLine('8 Rue Mercière, 69002 Lyon'));
        $this->assertSame('Rue de la Paix, Paris 2e', AddressDisplayFr::shareWhatsAppAddressLine('5 Rue de la Paix, 75002 Paris, France'));
    }

    public function testShareLineKeepsPostcodeAndCityElsewhere(): void
    {
        $this->assertSame(
            'Avenue des Goums, 13400 Aubagne',
            AddressDisplayFr::shareWhatsAppAddressLine('3 Avenue des Goums, 13400 Aubagne, France'),
        );
    }
}

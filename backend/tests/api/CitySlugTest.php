<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/CitySlug.php';

final class CitySlugTest extends TestCase
{
    /** @return iterable<string, array{0: string, 1: string}> */
    public static function slugProvider(): iterable
    {
        yield 'simple' => ['Aubagne', 'aubagne'];
        yield 'accents' => ['Saint-Étienne', 'saint-etienne'];
        yield 'spaces' => ['Le Havre', 'le-havre'];
        yield 'punctuation' => ['L\'Haÿ-les-Roses', 'l-hay-les-roses'];
        yield 'collapse hyphens' => ['Foo---Bar', 'foo-bar'];
        yield 'trim' => ['  Marseille  ', 'marseille'];
        yield 'empty' => ['', ''];
    }

    /** @dataProvider slugProvider */
    public function testFromNormalizesCity(string $input, string $expected): void
    {
        $this->assertSame($expected, CitySlug::from($input));
    }

    public function testMatchesAcceptsRawNameAndSlug(): void
    {
        $this->assertTrue(CitySlug::matches('Aubagne', 'Aubagne'));
        $this->assertTrue(CitySlug::matches('Aubagne', 'aubagne'));
        $this->assertTrue(CitySlug::matches('Saint-Étienne', 'saint-etienne'));
        $this->assertTrue(CitySlug::matches('Aubagne', 'AUBAGNE'));
        $this->assertFalse(CitySlug::matches('Aubagne', 'marseille'));
        $this->assertFalse(CitySlug::matches('', 'aubagne'));
    }

    public function testFilterMatchingReturnsDistinctTrimmedCities(): void
    {
        $this->assertSame(
            ['Aubagne'],
            CitySlug::filterMatching([' Aubagne ', 'Marseille', 'Saint-Étienne'], 'aubagne')
        );
        $this->assertSame(
            ['Saint-Étienne'],
            CitySlug::filterMatching(['Aubagne', 'Saint-Étienne'], 'saint-etienne')
        );
        $this->assertSame([], CitySlug::filterMatching(['Aubagne'], 'paris'));
    }
}


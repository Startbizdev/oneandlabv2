<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/assistant/PatientMentions.php';

final class PatientMentionsTest extends TestCase
{
    private const PATIENTS = [
        ['id' => 'a', 'name' => 'Simone Leroy', 'birth_date' => '1941-02-03'],
        ['id' => 'b', 'name' => 'Jean Martin', 'birth_date' => '1951-06-01'],
        ['id' => 'c', 'name' => 'Claire Martin', 'birth_date' => '1980-01-01'],
        ['id' => 'd', 'name' => 'Hélène Dupont-Léger', 'birth_date' => null],
    ];

    private function ids(string $question): array
    {
        return array_column(PatientMentions::resolve(self::PATIENTS, $question), 'id');
    }

    public function testFullNameFirstNameOrLastNameDesignatesThePatient(): void
    {
        $this->assertSame(['a'], $this->ids('Résume le dossier de Mme Leroy'));
        $this->assertSame(['a'], $this->ids('et Simone, elle va mieux ?'));
        $this->assertSame(['b'], $this->ids('Prépare le passage chez Jean Martin demain'));
        $this->assertSame(['d'], $this->ids('ordonnance de helene dupont leger'), 'Accents, tirets, casse');
    }

    public function testAmbiguousLastNameReturnsEveryCandidate(): void
    {
        $this->assertSame(['b', 'c'], $this->ids('Quels sont les résultats de M. Martin ?'));
    }

    public function testNoNameNoPatient(): void
    {
        $this->assertSame([], $this->ids('Comment coter une injection intramusculaire ?'));
        $this->assertSame([], $this->ids('Résume ma tournée'), 'Pas de faux positif sur un mot courant');
    }
}

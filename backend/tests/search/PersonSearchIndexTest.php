<?php

declare(strict_types=1);

require_once __DIR__ . '/../../lib/search/PersonSearchIndex.php';

use PHPUnit\Framework\TestCase;

/** Empreintes de recherche : un mot saisi doit retrouver les débuts de mots indexés, et rien d'autre. */
final class PersonSearchIndexTest extends TestCase
{
    private function index(): PersonSearchIndex
    {
        $reflection = new ReflectionClass(PersonSearchIndex::class);

        return $reflection->newInstance(new PDO('sqlite::memory:'));
    }

    /** @param list<string> $person */
    private function personMatches(PersonSearchIndex $index, array $person, string $query): bool
    {
        $tokens = array_flip($index->tokensFor($person[0], $person[1], $person[2] ?? null));
        $wanted = $index->queryTokens($query);
        if ($wanted === []) {
            return false;
        }
        foreach ($wanted as $token) {
            if (!isset($tokens[$token])) {
                return false;
            }
        }

        return true;
    }

    public function testFindsByStartOfFirstOrLastNameCaseAndAccentInsensitive(): void
    {
        $index = $this->index();
        $person = ['Éloïse', 'Allouche', '06 12 34 56 78'];

        self::assertTrue($this->personMatches($index, $person, 'Allouche'));
        self::assertTrue($this->personMatches($index, $person, 'allou'));
        self::assertTrue($this->personMatches($index, $person, 'ALLOUCHE'));
        self::assertTrue($this->personMatches($index, $person, 'eloise'));
        self::assertTrue($this->personMatches($index, $person, 'Éloïse Allouche'));
        self::assertTrue($this->personMatches($index, $person, 'allouche elo'));
    }

    public function testFindsByPhonePrefixInAnyFormat(): void
    {
        $index = $this->index();
        $person = ['Jean', 'Dupont', '+33 6 12 34 56 78'];

        self::assertTrue($this->personMatches($index, $person, '0612345678'));
        self::assertTrue($this->personMatches($index, $person, '06 12 34'));
        self::assertTrue($this->personMatches($index, $person, '+33612'));
        self::assertTrue($this->personMatches($index, $person, '06.12.34.56.78'));
    }

    public function testNoMatchInMiddleOfWordOrOtherPerson(): void
    {
        $index = $this->index();
        $person = ['Éloïse', 'Allouche', '0612345678'];

        self::assertFalse($this->personMatches($index, $person, 'louche'));
        self::assertFalse($this->personMatches($index, $person, 'Allouche Martin'));
        self::assertFalse($this->personMatches($index, $person, '0799'));
        self::assertFalse($this->personMatches($index, $person, 'a'), 'une lettre seule ne cherche rien');
    }

    public function testTokensAreKeyedHashesNotPlainText(): void
    {
        $tokens = $this->index()->tokensFor('Allouche', 'Eloise', null);
        self::assertNotEmpty($tokens);
        foreach ($tokens as $token) {
            self::assertMatchesRegularExpression('/^[0-9a-f]{64}$/', $token);
            self::assertNotSame(hash('sha256', 'n|al'), $token);
        }
    }
}

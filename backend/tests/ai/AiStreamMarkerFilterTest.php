<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/ai/AiStreamMarkerFilter.php';

/**
 * Flux SSE : aucun marqueur brut [ref:…] ne doit atteindre l'application, même coupé entre deux deltas.
 */
final class AiStreamMarkerFilterTest extends TestCase
{
    /**
     * @param list<string> $deltas
     */
    private function filtered(array $deltas): string
    {
        $out = '';
        $filter = new AiStreamMarkerFilter(static function (string $text) use (&$out): void {
            $out .= $text;
        });
        foreach ($deltas as $delta) {
            $filter->push($delta);
        }
        $filter->flush();

        return $out;
    }

    public function testMarkerSplitAcrossDeltasIsRemoved(): void
    {
        $out = $this->filtered(['Votre bilan du 3 mars ', '[re', 'f:doc-12', '34] est normal.']);
        $this->assertSame('Votre bilan du 3 mars est normal.', $out);
    }

    public function testCompleteMarkerInsideDeltaIsRemoved(): void
    {
        $this->assertSame('Rendez-vous demain.', $this->filtered(['Rendez-vous demain [ref:apt-1].']));
    }

    public function testBracketWithoutMarkerIsKept(): void
    {
        $this->assertSame('Valeur [normale] ici', $this->filtered(['Valeur [norm', 'ale] ici']));
    }

    public function testUnclosedBracketIsReleasedOnFlush(): void
    {
        $this->assertSame('Note [à compléter', $this->filtered(['Note [à com', 'pléter']));
    }

    public function testLongUnclosedBracketIsNotHeldForever(): void
    {
        $emitted = [];
        $filter = new AiStreamMarkerFilter(static function (string $text) use (&$emitted): void {
            $emitted[] = $text;
        });
        $filter->push('[' . str_repeat('x', 250));
        $this->assertNotSame([], $emitted, 'Le texte doit être libéré sans attendre la fin du flux');
    }
}

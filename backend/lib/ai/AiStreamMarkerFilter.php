<?php

declare(strict_types=1);

require_once __DIR__ . '/AiSourceResolver.php';

/**
 * Retire les marqueurs [ref:…] du flux SSE, y compris lorsqu'un marqueur est coupé entre deux deltas.
 */
final class AiStreamMarkerFilter
{
    /** Au-delà, un « [ » sans « ] » n'est pas un marqueur : le texte retenu est libéré. */
    private const MAX_HELD_BYTES = 200;

    private string $held = '';

    /** @var callable(string): void */
    private $sink;

    /** @param callable(string): void $sink */
    public function __construct(callable $sink)
    {
        $this->sink = $sink;
    }

    public function push(string $delta): void
    {
        $buffer = $this->held . $delta;
        $open = strrpos($buffer, '[');
        if ($open !== false && !str_contains(substr($buffer, $open), ']') && strlen($buffer) - $open <= self::MAX_HELD_BYTES) {
            $cut = strlen(rtrim(substr($buffer, 0, $open), " \t"));
        } else {
            // Les espaces finaux attendent le delta suivant : stripMarkers retire l'espace qui précède un marqueur.
            $cut = strlen(rtrim($buffer, " \t"));
        }
        $this->held = substr($buffer, $cut);
        $this->emit(substr($buffer, 0, $cut));
    }

    public function flush(): void
    {
        $rest = $this->held;
        $this->held = '';
        $this->emit($rest);
    }

    private function emit(string $text): void
    {
        $clean = AiSourceResolver::stripMarkers($text);
        if ($clean !== '') {
            ($this->sink)($clean);
        }
    }
}

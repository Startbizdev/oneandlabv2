<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/assistant/AssistantEmergencyDetector.php';

final class AssistantEmergencyDetectorTest extends TestCase
{
    /** @return array<string, array{0: string, 1: ?string}> */
    public static function messages(): array
    {
        return [
            'douleur thoracique' => ['J\'ai une douleur dans la poitrine depuis ce matin', '15'],
            'AVC' => ['Mon père a la bouche de travers et n\'arrive plus à parler', '15'],
            'respiration' => ['Je n\'arrive plus à respirer', '15'],
            'suicide' => ['J\'ai envie d\'en finir', '3114'],
            'suicide passé' => ['J\'ai eu des idées suicidaires il y a 3 ans', '3114'],
            'hémorragie' => ['Il saigne énormément', '15'],
            'négation' => ['Pas de douleur thoracique, tout va bien', null],
            'informatif' => ['C\'est quoi un AVC ?', null],
            'ancien' => ['J\'ai fait un infarctus il y a 5 ans', null],
            'gencives' => ['Mes gencives saignent beaucoup', null],
            'banal' => ['Comment préparer ma prise de sang ?', null],
        ];
    }

    /** @dataProvider messages */
    public function testDetect(string $message, ?string $number): void
    {
        $emergency = AssistantEmergencyDetector::detect($message);
        $this->assertSame($number, $emergency['number'] ?? null);
        if ($emergency !== null) {
            $this->assertNotSame('', $emergency['message']);
            $this->assertContains($number, $emergency['numbers']);
        }
    }
}

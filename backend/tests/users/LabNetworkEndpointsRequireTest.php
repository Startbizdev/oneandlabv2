<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

/**
 * Endpoints réseau labo / préleveur : chaque require relatif pointe vers un fichier existant
 * (un chemin faux ne casse qu'à l'exécution de la route, pas au lint).
 */
final class LabNetworkEndpointsRequireTest extends TestCase
{
    /** @return iterable<string, array{string}> */
    public static function endpointProvider(): iterable
    {
        $api = dirname(__DIR__, 2) . '/api';
        foreach (['admin/lab-brands/index.php', 'admin/lab-brands/[id].php', 'lab/preleveurs/[id]/patients.php', 'patients/index.php'] as $rel) {
            yield $rel => [$api . '/' . $rel];
        }
    }

    /** @dataProvider endpointProvider */
    public function testRelativeRequiresResolve(string $file): void
    {
        $this->assertFileExists($file);
        $source = (string) file_get_contents($file);
        preg_match_all("/__DIR__\\s*\\.\\s*'([^']+)'/", $source, $matches);
        $this->assertNotEmpty($matches[1]);
        foreach ($matches[1] as $relative) {
            $this->assertFileExists(dirname($file) . $relative, basename($file) . ' → ' . $relative);
        }
    }
}

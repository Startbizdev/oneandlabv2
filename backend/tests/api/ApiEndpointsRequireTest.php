<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

/**
 * Chaque require relatif (__DIR__ . '...') des endpoints pointe vers un fichier existant :
 * un chemin faux ne casse qu'à l'exécution de la route, pas au lint.
 */
final class ApiEndpointsRequireTest extends TestCase
{
    /** @return iterable<string, array{string}> */
    public static function endpointProvider(): iterable
    {
        $api = dirname(__DIR__, 2) . '/api';
        $files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($api, FilesystemIterator::SKIP_DOTS));
        foreach ($files as $file) {
            if ($file->getExtension() === 'php') {
                yield substr($file->getPathname(), strlen($api) + 1) => [$file->getPathname()];
            }
        }
    }

    /** @dataProvider endpointProvider */
    public function testRelativeRequiresResolve(string $file): void
    {
        preg_match_all("/__DIR__\\s*\\.\\s*'([^']+)'/", (string) file_get_contents($file), $matches);
        foreach ($matches[1] as $relative) {
            $this->assertFileExists(dirname($file) . $relative, basename($file) . ' → ' . $relative);
        }
        $this->addToAssertionCount(1);
    }
}

<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/ApiRouteResolver.php';

/**
 * Résolution partagée par backend/index.php (local, Nginx) et backend/api/index.php (Apache).
 */
final class ApiRouteResolverTest extends TestCase
{
    private const API = __DIR__ . '/../../api';

    /**
     * @return array<string, array{0: string, 1: string, 2: array<string, string>}>
     */
    public static function routes(): array
    {
        return [
            'fichier exact' => ['auth/request-otp', 'auth/request-otp.php', []],
            'index de dossier' => ['coverage-zones', 'coverage-zones/index.php', []],
            'slug' => ['public/nurse/mon-cabinet', 'public/nurse/[slug].php', ['slug' => 'mon-cabinet']],
            'id' => ['users/abc', 'users/[id].php', ['id' => 'abc']],
            'action après id' => ['medical-documents/abc/download', 'medical-documents/[id]/download.php', ['id' => 'abc']],
            'snooze offre infirmier' => ['appointments/abc/offer/snooze', 'appointments/[id]/offer/snooze.php', ['id' => 'abc']],
            'action imbriquée mot de passe' => ['users/abc/password/reset-email', 'users/[id]/password/reset-email.php', ['id' => 'abc']],
            'double dynamique' => ['nurse/patients/abc/absences/def', 'nurse/patients/[id]/absences/[absenceId].php', ['id' => 'abc', 'absenceId' => 'def']],
            'index sous id' => ['nurse/passages/series/abc', 'nurse/passages/series/[id]/index.php', ['id' => 'abc']],
            'action sous id en dossier' => ['nurse/patients/abc/absences', 'nurse/patients/[id]/absences/index.php', ['id' => 'abc']],
            'proche' => ['patient-relatives/abc', 'patient-relatives/[id]/index.php', ['id' => 'abc']],
        ];
    }

    /**
     * @dataProvider routes
     * @param array<string, string> $params
     */
    public function testResolvesRoute(string $path, string $file, array $params): void
    {
        $route = ApiRouteResolver::resolve('/' . $path . '/', self::API);
        $this->assertNotNull($route, $path);
        $this->assertSame(realpath(self::API . '/' . $file), realpath($route['file']));
        $this->assertSame($params, $route['params']);
    }

    public function testUnknownAndUnsafePathsAreNotResolved(): void
    {
        $this->assertNull(ApiRouteResolver::resolve('', self::API));
        $this->assertNull(ApiRouteResolver::resolve('route/inexistante', self::API));
        $this->assertNull(ApiRouteResolver::resolve('appointments/abc/offer/inconnue', self::API));
        $this->assertNull(ApiRouteResolver::resolve('public/../auth/request-otp', self::API));
    }

    public function testBothEntryPointsDelegateToResolver(): void
    {
        foreach (['/../../index.php', '/../../api/index.php'] as $entry) {
            $source = (string) file_get_contents(__DIR__ . $entry);
            $this->assertStringContainsString('ApiRouteResolver::resolve(', $source, $entry);
            $this->assertStringNotContainsString("'/[id]/'", $source, $entry);
        }
    }
}

<?php

declare(strict_types=1);

/**
 * Résolution d'un chemin d'API (sans préfixe /api) vers un fichier de backend/api.
 * Partagée par backend/index.php et backend/api/index.php : les deux points d'entrée doivent router à l'identique.
 */
final class ApiRouteResolver
{
    /**
     * @return array{file: string, params: array<string, string>}|null
     */
    public static function resolve(string $path, string $apiDir): ?array
    {
        $path = trim($path, '/');
        if ($path === '') {
            return null;
        }
        $segments = explode('/', $path);
        if (in_array('..', $segments, true)) {
            return null;
        }
        $count = count($segments);

        // /auth/request-otp → auth/request-otp.php
        $route = self::file($apiDir . '/' . $path . '.php', []);
        if ($route !== null) {
            return $route;
        }
        // /coverage-zones → coverage-zones/index.php
        $route = self::file($apiDir . '/' . $path . '/index.php', []);
        if ($route !== null) {
            return $route;
        }

        if ($count >= 2) {
            $last = $segments[$count - 1];
            $base = $apiDir . '/' . implode('/', array_slice($segments, 0, -1));
            // /public/nurse/mon-slug → public/nurse/[slug].php ; /users/123 → users/[id].php
            $route = self::file($base . '/[slug].php', ['slug' => $last])
                ?? self::file($base . '/[id].php', ['id' => $last]);
            if ($route !== null) {
                return $route;
            }
        }

        if ($count >= 3) {
            // /users/123/incidents → users/[id]/incidents.php
            $route = self::file(
                $apiDir . '/' . implode('/', array_slice($segments, 0, -2)) . '/[id]/' . $segments[$count - 1] . '.php',
                ['id' => $segments[$count - 2]]
            );
            if ($route !== null) {
                return $route;
            }
        }

        if ($count >= 4) {
            // /appointments/123/offer/snooze → appointments/[id]/offer/snooze.php
            $route = self::file(
                $apiDir . '/' . implode('/', array_slice($segments, 0, -3)) . '/[id]/' . $segments[$count - 2] . '/' . $segments[$count - 1] . '.php',
                ['id' => $segments[$count - 3]]
            );
            if ($route !== null) {
                return $route;
            }
        }

        if ($count >= 5) {
            // /nurse/patients/123/absences/456 → nurse/patients/[id]/absences/[absenceId].php
            $nestedDir = $apiDir . '/' . implode('/', array_slice($segments, 0, -3)) . '/[id]/' . $segments[$count - 2];
            // scandir et non glob : le chemin contient « [id] », que glob lirait comme une classe de caractères.
            $entries = is_dir($nestedDir) ? scandir($nestedDir) : false;
            foreach ($entries ?: [] as $entry) {
                if (preg_match('/^\[([^\]]+)\]\.php$/', $entry, $m) && is_file($nestedDir . '/' . $entry)) {
                    return ['file' => $nestedDir . '/' . $entry, 'params' => ['id' => $segments[$count - 3], $m[1] => $segments[$count - 1]]];
                }
            }
        }

        if ($count >= 2) {
            $last = $segments[$count - 1];
            $base = $apiDir . '/' . implode('/', array_slice($segments, 0, -1));
            // /nurse/passages/series/123 → nurse/passages/series/[id]/index.php
            $route = self::file($base . '/[id]/index.php', ['id' => $last])
                ?? self::file($base . '/[slug]/index.php', ['slug' => $last]);
            if ($route !== null) {
                return $route;
            }
        }

        if ($count >= 3) {
            // /nurse/patients/123/absences → nurse/patients/[id]/absences/index.php
            $route = self::file(
                $apiDir . '/' . implode('/', array_slice($segments, 0, -2)) . '/[id]/' . $segments[$count - 1] . '/index.php',
                ['id' => $segments[$count - 2]]
            );
            if ($route !== null) {
                return $route;
            }
        }

        return null;
    }

    /**
     * @param array<string, string> $params
     * @return array{file: string, params: array<string, string>}|null
     */
    private static function file(string $file, array $params): ?array
    {
        return is_file($file) ? ['file' => $file, 'params' => $params] : null;
    }
}

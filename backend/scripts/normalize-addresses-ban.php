#!/usr/bin/env php
<?php
/**
 * Normalise les adresses migrées : géocode BAN (api-adresse.data.gouv.fr) et met à jour
 * - profiles.address_encrypted : JSON { label, lat, lng [, complement] }
 * - appointments : label chiffré + location_lat / location_lng
 *
 * Usage :
 *   php backend/scripts/normalize-addresses-ban.php --dry-run
 *   php backend/scripts/normalize-addresses-ban.php --only=profiles
 *   php backend/scripts/normalize-addresses-ban.php --only=appointments
 *   php backend/scripts/normalize-addresses-ban.php
 */

declare(strict_types=1);

$baseDir = dirname(__DIR__);
require_once $baseDir . '/config/database.php';
require_once $baseDir . '/lib/Crypto.php';
require_once $baseDir . '/lib/BAN.php';

$config = require $baseDir . '/config/database.php';

$dryRun = in_array('--dry-run', $argv, true);
$only = null;
foreach ($argv as $a) {
    if (str_starts_with($a, '--only=')) {
        $only = substr($a, 7);
    }
}

$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);
$pdo = new PDO($dsn, $config['username'], $config['password'], $config['options']);

$crypto = new Crypto();
$ban = new BAN();

$stats = [
    'profiles_total' => 0,
    'profiles_updated' => 0,
    'profiles_skip_ok' => 0,
    'profiles_skip_empty' => 0,
    'profiles_ban_miss' => 0,
    'profiles_error' => 0,
    'appointments_total' => 0,
    'appointments_updated' => 0,
    'appointments_skip_ok' => 0,
    'appointments_skip_empty' => 0,
    'appointments_ban_miss' => 0,
    'appointments_error' => 0,
];

/**
 * @return array<int, array<string, mixed>>
 */
function banSearchRetry(BAN $ban, string $label, int $attempts = 3): array
{
    $last = null;
    for ($i = 0; $i < $attempts; $i++) {
        try {
            return $ban->search($label, 1);
        } catch (Throwable $e) {
            $last = $e;
            if ($i < $attempts - 1) {
                sleep(2);
            }
        }
    }
    if ($last) {
        throw $last;
    }

    return [];
}

function needsGeocode(?float $lat, ?float $lng): bool
{
    if ($lat === null || $lng === null) {
        return true;
    }
    if (!is_finite($lat) || !is_finite($lng)) {
        return true;
    }
    if (abs($lat) < 1e-6 && abs($lng) < 1e-6) {
        return true;
    }
    return false;
}

function parseProfileAddress(string $decrypted): array
{
    $decrypted = trim($decrypted);
    if ($decrypted === '') {
        return ['label' => '', 'lat' => null, 'lng' => null, 'complement' => null];
    }
    $decoded = json_decode($decrypted, true);
    if ($decoded === null && json_last_error() !== JSON_ERROR_NONE) {
        return ['label' => $decrypted, 'lat' => null, 'lng' => null, 'complement' => null];
    }
    if (is_string($decoded)) {
        return ['label' => trim($decoded), 'lat' => null, 'lng' => null, 'complement' => null];
    }
    if (is_array($decoded)) {
        $label = isset($decoded['label']) ? trim((string) $decoded['label']) : '';
        $lat = isset($decoded['lat']) && is_numeric($decoded['lat']) ? (float) $decoded['lat'] : null;
        $lng = isset($decoded['lng']) && is_numeric($decoded['lng']) ? (float) $decoded['lng'] : null;
        $complement = isset($decoded['complement']) ? (string) $decoded['complement'] : null;

        return ['label' => $label, 'lat' => $lat, 'lng' => $lng, 'complement' => $complement];
    }

    return ['label' => '', 'lat' => null, 'lng' => null, 'complement' => null];
}

if ($only === null || $only === 'profiles') {
    $stmt = $pdo->query(
        'SELECT id, role, address_encrypted, address_dek FROM profiles
         WHERE address_encrypted IS NOT NULL AND LENGTH(address_encrypted) > 0
           AND address_dek IS NOT NULL AND LENGTH(address_dek) > 0'
    );
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $stats['profiles_total'] = count($rows);

    foreach ($rows as $row) {
        try {
            $plain = $crypto->decryptField($row['address_encrypted'], $row['address_dek']);
        } catch (Throwable $e) {
            $stats['profiles_error']++;
            fwrite(STDERR, "[profile {$row['id']}] decrypt error: {$e->getMessage()}\n");
            continue;
        }

        $parsed = parseProfileAddress($plain);
        if ($parsed['label'] === '') {
            $stats['profiles_skip_empty']++;
            continue;
        }

        if (!needsGeocode($parsed['lat'], $parsed['lng'])) {
            $stats['profiles_skip_ok']++;
            continue;
        }

        try {
            $results = banSearchRetry($ban, $parsed['label']);
        } catch (Throwable $e) {
            $stats['profiles_error']++;
            fwrite(STDERR, "[profile {$row['id']}] BAN error: {$e->getMessage()}\n");
            continue;
        }

        if ($results === []) {
            $stats['profiles_ban_miss']++;
            fwrite(STDERR, "[profile {$row['id']}] BAN aucun résultat pour: {$parsed['label']}\n");
            continue;
        }

        $first = $results[0];
        $newAddr = [
            'label' => $first['label'],
            'lat' => $first['lat'],
            'lng' => $first['lng'],
        ];
        if (!empty($parsed['complement'])) {
            $newAddr['complement'] = $parsed['complement'];
        }

        $json = json_encode($newAddr, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        $enc = $crypto->encryptField($json);

        $stats['profiles_updated']++;
        if (!$dryRun) {
            $u = $pdo->prepare('UPDATE profiles SET address_encrypted = ?, address_dek = ? WHERE id = ?');
            $u->execute([$enc['encrypted'], $enc['dek'], $row['id']]);
        }

        usleep(150000);
    }
}

if ($only === null || $only === 'appointments') {
    $stmt = $pdo->query(
        'SELECT id, address_encrypted, address_dek, location_lat, location_lng FROM appointments
         WHERE address_encrypted IS NOT NULL AND LENGTH(address_encrypted) > 0
           AND address_dek IS NOT NULL AND LENGTH(address_dek) > 0'
    );
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $stats['appointments_total'] = count($rows);

    foreach ($rows as $row) {
        try {
            $label = trim($crypto->decryptField($row['address_encrypted'], $row['address_dek']));
        } catch (Throwable $e) {
            $stats['appointments_error']++;
            fwrite(STDERR, "[appointment {$row['id']}] decrypt error: {$e->getMessage()}\n");
            continue;
        }

        if ($label === '') {
            $stats['appointments_skip_empty']++;
            continue;
        }

        $lat = isset($row['location_lat']) ? (float) $row['location_lat'] : null;
        $lng = isset($row['location_lng']) ? (float) $row['location_lng'] : null;

        if (!needsGeocode($lat, $lng)) {
            $stats['appointments_skip_ok']++;
            continue;
        }

        try {
            $results = banSearchRetry($ban, $label);
        } catch (Throwable $e) {
            $stats['appointments_error']++;
            fwrite(STDERR, "[appointment {$row['id']}] BAN error: {$e->getMessage()}\n");
            continue;
        }

        if ($results === []) {
            $stats['appointments_ban_miss']++;
            fwrite(STDERR, "[appointment {$row['id']}] BAN aucun résultat pour: {$label}\n");
            continue;
        }

        $first = $results[0];
        $enc = $crypto->encryptField($first['label']);
        $stats['appointments_updated']++;
        if (!$dryRun) {
            $u = $pdo->prepare(
                'UPDATE appointments SET address_encrypted = ?, address_dek = ?, location_lat = ?, location_lng = ? WHERE id = ?'
            );
            $u->execute([$enc['encrypted'], $enc['dek'], $first['lat'], $first['lng'], $row['id']]);
        }

        usleep(150000);
    }
}

echo json_encode($stats, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
if ($dryRun) {
    echo "(dry-run: aucune écriture en base)\n";
}

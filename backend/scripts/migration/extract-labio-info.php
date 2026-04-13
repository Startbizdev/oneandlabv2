<?php

/**
 * Extrait et déchiffre toutes les infos du labo Labio principal depuis legacy-export.json
 * Usage: php extract-labio-info.php --data=/path/to/legacy-export.json
 */

$options = getopt('', ['data:']);
$dataPath = $options['data'] ?? __DIR__ . '/../../../data/legacy-export.json';

if (!file_exists($dataPath)) {
    fwrite(STDERR, "Usage: php extract-labio-info.php --data=/path/to/legacy-export.json\n");
    exit(1);
}

$config = require __DIR__ . '/config.php';
$legacyKey = $config['legacy_encryption_key'] ?? '';
if (empty($legacyKey)) {
    fwrite(STDERR, "LEGACY_ENCRYPTION_KEY ou ENCRYPTION_KEY requis dans .env\n");
    exit(1);
}

require_once __DIR__ . '/LegacyCrypto.php';

$json = file_get_contents($dataPath);
$data = json_decode($json, true);
if (!$data) {
    fwrite(STDERR, "JSON invalide\n");
    exit(1);
}

$labioId = '689233af3b78f462d126e06a';

function decryptLegacy(?string $val, string $key): string {
    if (empty($val)) return '';
    if (!LegacyCrypto::isEncrypted($val)) return $val;
    try {
        return LegacyCrypto::decrypt($val, $key);
    } catch (Exception $e) {
        return "[decrypt error]";
    }
}

$labs = $data['laboratories'] ?? [];
$labio = null;
foreach ($labs as $lab) {
    if (($lab['_id'] ?? '') === $labioId) {
        $labio = $lab;
        break;
    }
}

if (!$labio) {
    fwrite(STDERR, "Labio $labioId non trouvé\n");
    exit(1);
}

$out = [
    'legacy_id' => $labioId,
    'name' => decryptLegacy($labio['name'] ?? '', $legacyKey),
    'email' => decryptLegacy($labio['email'] ?? '', $legacyKey),
    'phone' => decryptLegacy($labio['phone'] ?? '', $legacyKey),
    'address' => decryptLegacy($labio['address'] ?? '', $legacyKey),
    'city' => $labio['city'] ?? '',
    'postalCode' => $labio['postalCode'] ?? '',
    'siretNumber' => decryptLegacy($labio['siretNumber'] ?? '', $legacyKey),
    'responsible' => decryptLegacy($labio['responsible'] ?? '', $legacyKey),
    'openingHours' => $labio['openingHours'] ?? '',
    'subscriptionStatus' => $labio['subscriptionStatus'] ?? '',
    'stripeCustomerId' => $labio['stripeCustomerId'] ?? '',
    'logo' => $labio['logo'] ?? '',
    'location' => $labio['location'] ?? null,
    'patients_count' => count($labio['patients'] ?? []),
];

// Préleveurs du Labio
$phlebs = array_filter($data['phlebotomists'] ?? [], fn($p) => ($p['labId'] ?? '') === $labioId);
$out['phlebotomists'] = [];
foreach ($phlebs as $p) {
    $out['phlebotomists'][] = [
        'legacy_id' => $p['_id'] ?? '',
        'name' => decryptLegacy($p['name'] ?? '', $legacyKey),
        'email' => decryptLegacy($p['email'] ?? '', $legacyKey),
        'phone' => decryptLegacy($p['phone'] ?? '', $legacyKey),
    ];
}

// RDV avec ce lab
$appts = array_filter($data['appointments'] ?? [], fn($a) => ($a['labId'] ?? '') === $labioId);
$out['appointments_count'] = count($appts);

echo json_encode($out, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

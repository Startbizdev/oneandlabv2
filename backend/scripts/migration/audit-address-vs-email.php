<?php

/**
 * Audit : décrypter address et email de chaque patient legacy
 * Trouver les cas où address ressemble à un email (contient @)
 * Usage: php audit-address-vs-email.php --data=../../data/legacy-export.json
 */

$options = getopt('', ['data:']);
$dataPath = $options['data'] ?? __DIR__ . '/../../data/legacy-export.json';

if (!file_exists($dataPath)) {
    fwrite(STDERR, "Usage: php audit-address-vs-email.php --data=/path/to/legacy-export.json\n");
    exit(1);
}

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/LegacyCrypto.php';

$config = require __DIR__ . '/config.php';
$legacyKey = $config['legacy_encryption_key'] ?? '';
if (empty($legacyKey)) {
    fwrite(STDERR, "LEGACY_ENCRYPTION_KEY requis dans .env\n");
    exit(1);
}

function decryptLegacy(?string $value, string $key): string
{
    if ($value === null || $value === '') return '';
    if (LegacyCrypto::isEncrypted($value)) {
        try {
            return LegacyCrypto::decrypt($value, $key);
        } catch (Exception $e) {
            return '[decrypt error]';
        }
    }
    return $value;
}

$json = file_get_contents($dataPath);
$data = json_decode($json, true);
$patients = $data['patients'] ?? [];
$appointments = $data['appointments'] ?? [];

echo "Patients à auditer: " . count($patients) . "\n";
echo str_repeat('-', 80) . "\n";

$suspicious = [];
$ok = 0;

foreach ($patients as $p) {
    $legacyId = $p['_id'] ?? '';
    $email = decryptLegacy($p['email'] ?? '', $legacyKey);
    $address = decryptLegacy($p['address'] ?? '', $legacyKey);
    $firstName = decryptLegacy($p['firstName'] ?? '', $legacyKey);
    $lastName = decryptLegacy($p['lastName'] ?? '', $legacyKey);

    if (strpos($address, '@') !== false) {
        $suspicious[] = [
            'legacy_id' => $legacyId,
            'email' => $email,
            'address_decrypted' => $address,
            'first_name' => $firstName,
            'last_name' => $lastName,
        ];
    } elseif (!empty(trim($address))) {
        $ok++;
    }
}

echo "Adresses correctes (non vides, sans @): $ok\n";
echo "Adresses suspectes (contiennent @): " . count($suspicious) . "\n\n";

if (!empty($suspicious)) {
    echo "Détail des cas suspects:\n";
    foreach ($suspicious as $s) {
        echo "  - Legacy ID: {$s['legacy_id']}\n";
        echo "    Email: {$s['email']}\n";
        echo "    Address (décrypté): {$s['address_decrypted']}\n";
        echo "    Nom: {$s['first_name']} {$s['last_name']}\n";
        echo "\n";
    }

    // Chercher l'adresse réelle dans les RDV pour ces patients
    echo str_repeat('-', 80) . "\n";
    echo "Recherche des adresses dans les RDV pour ces patients...\n\n";

    foreach ($suspicious as $s) {
        $legacyId = $s['legacy_id'];
        $foundAddress = null;
        foreach ($appointments as $apt) {
            if (($apt['patientId'] ?? '') === $legacyId) {
                $aptAddress = decryptLegacy($apt['address'] ?? '', $legacyKey);
                if (!empty(trim($aptAddress)) && strpos($aptAddress, '@') === false) {
                    $foundAddress = $aptAddress;
                    break;
                }
            }
        }
        if ($foundAddress) {
            echo "  Patient {$legacyId} ({$s['email']}): adresse trouvée dans RDV: $foundAddress\n";
        } else {
            echo "  Patient {$legacyId} ({$s['email']}): pas d'adresse valide dans les RDV\n";
        }
    }
}

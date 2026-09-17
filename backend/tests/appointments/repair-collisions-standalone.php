<?php

declare(strict_types=1);

require_once __DIR__ . '/../../lib/RepairCollisions.php';

final class RepairCollisionsTestCrypto extends Crypto
{
    public function __construct()
    {
        // Le dry-run ne chiffre ni ne déchiffre : aucune KEK requise pour ce test.
    }
}

$checks = 0;
$check = static function (bool $condition, string $message) use (&$checks): void {
    if (!$condition) {
        throw new RuntimeException("Repair collisions regression: $message");
    }
    $checks++;
};

$patientId = '11111111-1111-4111-8111-111111111111';
$relativeId = '22222222-2222-4222-8222-222222222222';
$appointmentId = '33333333-3333-4333-8333-333333333333';
$manifest = [
    'version' => 1,
    'manifest_id' => '44444444-4444-4444-8444-444444444444',
    'reviewed' => true,
    'review_phrase' => RepairCollisions::REVIEW_PHRASE,
    'operations' => [[
        'operation_id' => '55555555-5555-4555-8555-555555555555',
        'patient_id' => $patientId,
        'holder_restore' => [
            'first_name' => 'Titulaire',
            'last_name' => 'Exemple',
            'email' => 'holder@example.test',
        ],
        'relative' => [
            'action' => 'create',
            'id' => $relativeId,
            'data' => [
                'first_name' => 'Proche',
                'last_name' => 'Exemple',
                'relationship_type' => 'child',
                'birth_date' => '2015-04-03',
            ],
        ],
        'appointment_ids' => [$appointmentId],
    ]],
];

$check(RepairCollisions::validateManifest($manifest) === [], 'le manifeste valide est accepté');

$invalid = $manifest;
$invalid['reviewed'] = false;
$invalid['operations'][0]['appointment_ids'] = [];
$invalid['operations'][0]['relative']['data']['unexpected'] = 'interdit';
$errors = RepairCollisions::validateManifest($invalid);
$check(count($errors) >= 3, 'les validations reviewed, RDV et allowlist sont cumulées');

$duplicate = $manifest;
$duplicate['operations'][] = $duplicate['operations'][0];
$check(
    count(array_filter(
        RepairCollisions::validateManifest($duplicate),
        static fn(string $error): bool => str_contains($error, 'dupliqué')
    )) >= 2,
    'les IDs opération et rendez-vous dupliqués sont refusés'
);

$hash = RepairCollisions::manifestHash(json_encode($manifest, JSON_THROW_ON_ERROR));
$check(
    RepairCollisions::confirmationErrors($hash, 'APPLY-' . $hash, 'YES-' . $hash) === [],
    'la double confirmation exacte est acceptée'
);
$check(
    count(RepairCollisions::confirmationErrors($hash, null, null)) === 2,
    'apply est refusé sans flag et variable environnement'
);
$check(
    count(RepairCollisions::confirmationErrors($hash, 'APPLY-wrong', 'YES-' . $hash)) === 1,
    'un hash de flag incorrect est refusé'
);

if (!in_array('sqlite', PDO::getAvailableDrivers(), true)) {
    echo "$checks assertions passed; dry-run SQLite skipped (driver unavailable).\n";
    exit(0);
}

$db = new PDO('sqlite::memory:', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$db->exec('CREATE TABLE profiles (id TEXT PRIMARY KEY, role TEXT NOT NULL)');
$db->exec('CREATE TABLE patient_relatives (id TEXT PRIMARY KEY, patient_id TEXT NOT NULL)');
$db->exec('CREATE TABLE appointments (id TEXT PRIMARY KEY, patient_id TEXT, relative_id TEXT)');
$insertProfile = $db->prepare('INSERT INTO profiles (id, role) VALUES (?, ?)');
$insertProfile->execute([$patientId, 'patient']);
$insertAppointment = $db->prepare('INSERT INTO appointments (id, patient_id, relative_id) VALUES (?, ?, NULL)');
$insertAppointment->execute([$appointmentId, $patientId]);

$service = new RepairCollisions($db, new RepairCollisionsTestCrypto(), sys_get_temp_dir());
$before = [
    'profiles' => (int) $db->query('SELECT COUNT(*) FROM profiles')->fetchColumn(),
    'relatives' => (int) $db->query('SELECT COUNT(*) FROM patient_relatives')->fetchColumn(),
    'appointments_unlinked' => (int) $db->query('SELECT COUNT(*) FROM appointments WHERE relative_id IS NULL')->fetchColumn(),
];
$result = $service->dryRun($manifest);
$after = [
    'profiles' => (int) $db->query('SELECT COUNT(*) FROM profiles')->fetchColumn(),
    'relatives' => (int) $db->query('SELECT COUNT(*) FROM patient_relatives')->fetchColumn(),
    'appointments_unlinked' => (int) $db->query('SELECT COUNT(*) FROM appointments WHERE relative_id IS NULL')->fetchColumn(),
];
$check($result['writes_performed'] === 0, 'le dry-run annonce zéro écriture');
$check($before === $after, 'le dry-run ne modifie aucune table');

try {
    $service->apply($manifest, $hash, null, null);
    $check(false, 'apply sans confirmations aurait dû être refusé');
} catch (InvalidArgumentException) {
    $afterRefusal = [
        'profiles' => (int) $db->query('SELECT COUNT(*) FROM profiles')->fetchColumn(),
        'relatives' => (int) $db->query('SELECT COUNT(*) FROM patient_relatives')->fetchColumn(),
        'appointments_unlinked' => (int) $db->query('SELECT COUNT(*) FROM appointments WHERE relative_id IS NULL')->fetchColumn(),
    ];
    $check($before === $afterRefusal && !$db->inTransaction(), 'apply sans confirmations est refusé avant transaction');
}

$wrongOwner = $manifest;
$wrongOwner['operations'][0]['patient_id'] = '66666666-6666-4666-8666-666666666666';
try {
    $service->dryRun($wrongOwner);
    $check(false, 'un titulaire absent aurait dû être refusé');
} catch (RuntimeException) {
    $check(true, 'le dry-run refuse les cibles incohérentes');
}

echo "$checks assertions passed: manifeste, confirmations fortes, dry-run read-only et cohérence des cibles.\n";

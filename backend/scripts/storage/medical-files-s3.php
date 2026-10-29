<?php

declare(strict_types=1);

/**
 * Fichiers des documents médicaux vers S3 (à lancer sur le serveur, utilisateur www-data).
 *
 *   php medical-files-s3.php smoke   <bucket>              écrit, relit, supprime un objet de test
 *   php medical-files-s3.php migrate <bucket>              copie dans S3 les fichiers référencés en base absents du bucket
 *   php medical-files-s3.php verify  <bucket>              compare chaque fichier référencé (taille disque = taille S3)
 *   php medical-files-s3.php prune-local <bucket>          supprime du disque les fichiers dont la copie S3 est vérifiée
 *
 * Seuls les chemins de medical_documents.file_path sont traités : les fichiers hors base ne sont jamais touchés.
 */

require_once __DIR__ . '/../../lib/storage/LocalObjectStore.php';
require_once __DIR__ . '/../../lib/storage/S3ObjectStore.php';

use Aws\S3\Exception\S3Exception;

$command = $argv[1] ?? '';
$bucket = $argv[2] ?? '';
if (!in_array($command, ['smoke', 'migrate', 'verify', 'prune-local'], true) || $bucket === '') {
    fwrite(STDERR, "Usage : php medical-files-s3.php smoke|migrate|verify|prune-local <bucket>\n");
    exit(2);
}

$region = getenv('MEDICAL_FILES_REGION') ?: 'eu-west-3';
$client = S3ObjectStore::client($region);
$backendRoot = realpath(__DIR__ . '/../..');
$local = new LocalObjectStore($backendRoot);
$s3 = new S3ObjectStore($client, $bucket);

if ($command === 'smoke') {
    $key = 'uploads/medical/_smoke/' . bin2hex(random_bytes(8)) . '.encrypted';
    $payload = random_bytes(4096);
    $s3->put($key, $payload);
    $ok = $s3->get($key) === $payload && $s3->exists($key);
    $s3->delete($key);
    $gone = !$s3->exists($key) && $s3->get($key) === null;
    echo ($ok && $gone) ? "SMOKE OK : écriture, lecture, suppression\n" : "SMOKE ÉCHEC (lecture=" . var_export($ok, true) . ", suppression=" . var_export($gone, true) . ")\n";
    exit($ok && $gone ? 0 : 1);
}

$config = require __DIR__ . '/../../config/database.php';
$db = new PDO(
    sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['database'], $config['charset']),
    $config['username'],
    $config['password'],
    $config['options']
);
$paths = $db->query("SELECT DISTINCT file_path FROM medical_documents WHERE file_path LIKE '/uploads/medical/%'")->fetchAll(PDO::FETCH_COLUMN);

$s3Size = static function (string $key) use ($client, $bucket): ?int {
    try {
        return (int) $client->headObject(['Bucket' => $bucket, 'Key' => $key])['ContentLength'];
    } catch (S3Exception $e) {
        if ($e->getStatusCode() === 404) {
            return null;
        }
        throw $e;
    }
};

$stats = ['total' => count($paths), 'local_absent' => 0, 'deja_dans_s3' => 0, 'copies' => 0, 'verifies' => 0, 'differents' => 0, 'absents_s3' => 0, 'supprimes_disque' => 0, 'erreurs' => 0];
foreach ($paths as $path) {
    $key = ltrim((string) $path, '/');
    if (str_contains($key, '..')) {
        continue;
    }
    $localPath = $backendRoot . '/' . $key;
    $localSize = is_file($localPath) ? filesize($localPath) : null;
    try {
        $remoteSize = $s3Size($key);
        if ($command === 'migrate') {
            if ($localSize === null) {
                $stats['local_absent']++;
            } elseif ($remoteSize === $localSize) {
                $stats['deja_dans_s3']++;
            } else {
                $s3->put($key, (string) file_get_contents($localPath));
                $stats['copies']++;
            }
            continue;
        }
        if ($remoteSize === null) {
            $stats['absents_s3']++;
            if ($localSize !== null) {
                fwrite(STDERR, "Absent de S3 : $path\n");
            }
            continue;
        }
        if ($localSize !== null && $localSize !== $remoteSize) {
            $stats['differents']++;
            fwrite(STDERR, "Taille différente : $path\n");
            continue;
        }
        $stats['verifies']++;
        if ($command === 'prune-local' && $localSize !== null) {
            // Contrôle d'intégrité complet avant suppression : contenu S3 identique octet par octet.
            if ($s3->get($key) !== file_get_contents($localPath)) {
                $stats['differents']++;
                fwrite(STDERR, "Contenu différent, conservé sur disque : $path\n");
                continue;
            }
            if ($local->delete($key)) {
                $stats['supprimes_disque']++;
            }
        }
    } catch (Throwable $e) {
        $stats['erreurs']++;
        fwrite(STDERR, "Erreur $path : " . $e->getMessage() . "\n");
    }
}

foreach ($stats as $label => $value) {
    echo str_pad($label, 18) . $value . "\n";
}
exit($stats['erreurs'] === 0 && $stats['differents'] === 0 ? 0 : 1);

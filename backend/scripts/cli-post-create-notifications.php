<?php

/**
 * Exécution hors requête HTTP de runPostCreateNotifications (Appointment).
 * Utilisé avec le serveur de dev `php -S` : le worker mono-requête ne doit pas garder
 * un shutdown handler long sous peine de bloquer les POST suivants (création multi-RDV).
 *
 * Arguments : argv[1] = chemin d’un fichier JSON { "id": "…", "input": { … }, "role": "patient" | … }
 */

declare(strict_types=1);

$file = isset($argv[1]) ? (string) $argv[1] : '';
if ($file === '' || !is_readable($file)) {
    fwrite(STDERR, "cli-post-create-notifications: fichier payload invalide ou illisible\n");
    exit(1);
}

$raw = file_get_contents($file);
@unlink($file);

$data = json_decode($raw !== false ? $raw : 'null', true);
if (!is_array($data)) {
    fwrite(STDERR, "cli-post-create-notifications: JSON invalide\n");
    exit(1);
}

$id = isset($data['id']) ? trim((string) $data['id']) : '';
$input = $data['input'] ?? null;
$role = array_key_exists('role', $data) ? $data['role'] : null;
$roleStr = $role !== null && $role !== '' ? (string) $role : null;

if ($id === '' || !is_array($input)) {
    fwrite(STDERR, "cli-post-create-notifications: id ou input manquant\n");
    exit(1);
}

require_once __DIR__ . '/../models/Appointment.php';

try {
    $model = new Appointment();
    $model->runPostCreateNotifications($id, $input, $roleStr);
} catch (Throwable $e) {
    error_log('cli-post-create-notifications: ' . $e->getMessage());
    exit(1);
}

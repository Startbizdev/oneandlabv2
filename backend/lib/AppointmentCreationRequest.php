<?php
declare(strict_types=1);
require_once __DIR__ . '/DatabaseTransaction.php';

final class AppointmentCreationConflict extends RuntimeException {}

/** The claim and the appointment must commit on the same connection. */
final class AppointmentCreationRequest
{
    public static function run(PDO $db, string $actor, string $key, string $hash, callable $create, ?callable $onReplay = null): string
    {
        if (!preg_match('/^[a-zA-Z0-9_-]{16,64}$/D', $key)) {
            throw new AppointmentCreationConflict('Identifiant de demande invalide.');
        }
        return DatabaseTransaction::run($db, static function () use ($db, $actor, $key, $hash, $create, $onReplay): string {
            $claim = $db->prepare('INSERT INTO appointment_creation_requests (actor_id, request_key, request_hash)
                VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE request_key = request_key');
            $claim->execute([$actor, $key, $hash]);
            $read = $db->prepare('SELECT request_hash, appointment_id, response_completed FROM appointment_creation_requests
                WHERE actor_id = ? AND request_key = ? FOR UPDATE');
            $read->execute([$actor, $key]);
            $row = $read->fetch(PDO::FETCH_ASSOC);
            if (!$row || !hash_equals($row['request_hash'], $hash)) {
                throw new AppointmentCreationConflict('Cette demande a déjà été envoyée avec des informations différentes. Consultez vos rendez-vous avant de recommencer.');
            }
            if ($row['appointment_id'] !== null) {
                if ($onReplay !== null) $onReplay((bool)$row['response_completed']);
                return $row['appointment_id'];
            }
            $id = $create();
            if (!is_string($id) || $id === '') throw new RuntimeException('Création sans identifiant.');
            $save = $db->prepare('UPDATE appointment_creation_requests SET appointment_id = ? WHERE actor_id = ? AND request_key = ?');
            $save->execute([$id, $actor, $key]);
            return $id;
        });
    }
}

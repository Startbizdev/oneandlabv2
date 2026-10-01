<?php

declare(strict_types=1);

/**
 * Références vers un profil à traiter avant son DELETE : RDV encore actifs (bloquants)
 * et colonnes FK ON DELETE RESTRICT à réattribuer à un autre profil.
 */
final class ProfileReferences
{
    /** RDV qui empêchent de supprimer le patient concerné. */
    public const ACTIVE_APPOINTMENT_STATUSES = ['pending', 'confirmed', 'planned', 'inProgress'];

    /** @var list<array{0: string, 1: string}> */
    public const RESTRICT_REFERENCES = [
        ['appointment_status_updates', 'actor_id'],
        ['appointments', 'created_by'],
        ['medical_documents', 'uploaded_by'],
        ['reviews', 'patient_id'],
        ['reviews', 'reviewee_id'],
    ];

    public static function countActiveAppointments(PDO $db, string $patientId): int
    {
        $placeholders = implode(',', array_fill(0, count(self::ACTIVE_APPOINTMENT_STATUSES), '?'));
        $stmt = $db->prepare("SELECT COUNT(*) FROM appointments WHERE patient_id = ? AND status IN ({$placeholders})");
        $stmt->execute([$patientId, ...self::ACTIVE_APPOINTMENT_STATUSES]);

        return (int) $stmt->fetchColumn();
    }

    /**
     * Réattribue chaque colonne de $fromId à $toId. Une colonne en échec (table absente sur une
     * base partiellement migrée) est journalisée et renvoyée ; les autres sont tout de même traitées.
     *
     * @param list<array{0: string, 1: string}> $references
     * @return array<string, string> "table.colonne" => message d'erreur
     */
    public static function reassign(PDO $db, string $fromId, string $toId, array $references = self::RESTRICT_REFERENCES): array
    {
        $failures = [];
        foreach ($references as [$table, $column]) {
            try {
                $stmt = $db->prepare("UPDATE {$table} SET {$column} = ? WHERE {$column} = ?");
                $stmt->execute([$toId, $fromId]);
            } catch (PDOException $e) {
                $failures[$table . '.' . $column] = $e->getMessage();
                error_log('ProfileReferences::reassign ' . $table . '.' . $column . ': ' . $e->getMessage());
            }
        }

        return $failures;
    }
}

<?php

declare(strict_types=1);

require_once __DIR__ . '/../DbSchemaCache.php';

/**
 * Archivage intermédiaire des dossiers patients (registre RGPD : 5 ans actifs puis 15 ans d'archive).
 * Un dossier archivé (profiles.archived_at) n'est plus visible des professionnels ; le patient y garde accès.
 * Toute nouvelle activité (connexion, nouveau lien de soin) le réactive avec les dossiers de ses proches.
 */
final class PatientArchive
{
    /** @var array<string, bool> */
    private static array $cache = [];

    public static function isAvailable(PDO $db): bool
    {
        return DbSchemaCache::tableHasColumn($db, 'profiles', 'archived_at');
    }

    public static function isArchived(PDO $db, string $patientId): bool
    {
        if ($patientId === '' || !self::isAvailable($db)) {
            return false;
        }
        if (!array_key_exists($patientId, self::$cache)) {
            $stmt = $db->prepare('SELECT archived_at IS NOT NULL FROM profiles WHERE id = ?');
            $stmt->execute([$patientId]);
            self::$cache[$patientId] = (bool) $stmt->fetchColumn();
        }

        return self::$cache[$patientId];
    }

    /** Archive le dossier d'un titulaire et ceux de ses proches. */
    public static function archive(PDO $db, string $ownerId, DateTimeImmutable $at): void
    {
        self::setArchivedAt($db, $ownerId, $at->format('Y-m-d H:i:s'));
    }

    /** Réactive le dossier (titulaire ou proche : toute la famille est réactivée). Sans effet s'il n'est pas archivé. */
    public static function restore(PDO $db, string $patientId): void
    {
        if ($patientId === '' || !self::isAvailable($db)) {
            return;
        }
        $owner = $patientId;
        if (DbSchemaCache::tableHasColumn($db, 'patient_relatives', 'profile_id')) {
            $stmt = $db->prepare('SELECT patient_id FROM patient_relatives WHERE profile_id = ? LIMIT 1');
            $stmt->execute([$patientId]);
            $owner = (string) ($stmt->fetchColumn() ?: $patientId);
        }
        self::setArchivedAt($db, $owner, null);
    }

    public static function forget(): void
    {
        self::$cache = [];
    }

    private static function setArchivedAt(PDO $db, string $ownerId, ?string $value): void
    {
        if (!self::isAvailable($db)) {
            return;
        }
        $condition = $value === null ? 'archived_at IS NOT NULL' : 'archived_at IS NULL';
        // updated_at = updated_at : l'archivage n'est pas une modification du profil.
        $db->prepare("UPDATE profiles SET archived_at = ?, updated_at = updated_at WHERE id = ? AND {$condition}")
            ->execute([$value, $ownerId]);
        if (DbSchemaCache::tableHasColumn($db, 'patient_relatives', 'profile_id')) {
            $db->prepare("
                UPDATE profiles SET archived_at = ?, updated_at = updated_at
                WHERE {$condition} AND id IN (SELECT profile_id FROM patient_relatives WHERE patient_id = ? AND profile_id IS NOT NULL)
            ")->execute([$value, $ownerId]);
        }
        self::forget();
    }
}

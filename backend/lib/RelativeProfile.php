<?php

declare(strict_types=1);

require_once __DIR__ . '/DatabaseTransaction.php';
require_once __DIR__ . '/DbSchemaCache.php';
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../models/PatientRelative.php';

/**
 * Dossier patient d'un proche : profil role=patient sans connexion relié par patient_relatives.profile_id.
 * Carnet, constantes, téléphones et transmissions du proche sont rattachés à ce profil ; ses RDV restent
 * portés par le titulaire (appointments.patient_id) avec appointments.relative_id, y compris ceux saisis
 * depuis son dossier (normalizeSubject).
 *
 * Suppression du proche : le profil et ses données de santé sont conservés (les soignants liés gardent le dossier).
 */
final class RelativeProfile
{
    /** Reste sous le suffixe reconnu comme technique par User::appendDelegatedPatientEmailDisplay. */
    private const EMAIL_PREFIX = 'delegated-relative-';
    private const EMAIL_DOMAIN = '@patients.internal.local';

    /** @var array<string, array{relative_id: string, owner_id: string}|null> */
    private static array $resolved = [];

    public static function technicalEmail(string $relativeId): string
    {
        return self::EMAIL_PREFIX . strtolower($relativeId) . self::EMAIL_DOMAIN;
    }

    /**
     * Crée le dossier du proche s'il n'existe pas encore (ligne du proche verrouillée : pas de double création).
     */
    public static function ensureProfile(PDO $db, string $relativeId): string
    {
        if (!self::isAvailable($db)) {
            throw new RuntimeException('Migration 126 requise (patient_relatives.profile_id)');
        }

        return DatabaseTransaction::run($db, static function () use ($db, $relativeId): string {
            $stmt = $db->prepare('SELECT patient_id, profile_id FROM patient_relatives WHERE id = ? FOR UPDATE');
            $stmt->execute([$relativeId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($row === false) {
                throw new InvalidArgumentException('Proche introuvable');
            }
            $ownerId = (string) $row['patient_id'];
            if (!empty($row['profile_id'])) {
                return (string) $row['profile_id'];
            }

            $users = new User($db);
            $email = self::technicalEmail($relativeId);
            $profileId = $users->findPatientIdByEmailHash(hash('sha256', $email));
            if ($profileId === null) {
                $relative = (new PatientRelative($db))->getById($relativeId, $ownerId);
                if ($relative === null) {
                    throw new RuntimeException('Proche introuvable après verrouillage');
                }
                $profileId = $users->createRelativeProfile($email, self::identityOf($relative));
            }
            $db->prepare('UPDATE patient_relatives SET profile_id = ?, updated_at = updated_at WHERE id = ?')->execute([$profileId, $relativeId]);
            self::$resolved[$profileId] = ['relative_id' => $relativeId, 'owner_id' => $ownerId];

            return $profileId;
        });
    }

    /**
     * Identité recopiée de la fiche du proche vers son dossier.
     *
     * @param array<string, mixed> $relative ligne déchiffrée (PatientRelative) ou champs saisis
     * @return array<string, mixed>
     */
    public static function identityOf(array $relative): array
    {
        return array_intersect_key($relative, array_flip(['first_name', 'last_name', 'phone', 'birth_date', 'gender', 'address']));
    }

    /**
     * Identité modifiée depuis le dossier du proche (fiche patient côté soignant) : recopiée sur la fiche du proche.
     *
     * @param array<string, mixed> $identity champs déjà filtrés par identityOf
     */
    public static function syncRelativeFromProfile(PDO $db, string $profileId, array $identity, array $actor): void
    {
        $relative = self::resolve($db, $profileId);
        if ($relative === null || $identity === []) {
            return;
        }
        (new PatientRelative($db))->update($relative['relative_id'], $identity, $relative['owner_id'], $actor, false);
    }

    /** Dossier du proche s'il existe déjà (lecture seule : aucune création). */
    public static function profileIdForRelative(PDO $db, string $relativeId): ?string
    {
        if ($relativeId === '' || !self::isAvailable($db)) {
            return null;
        }
        $stmt = $db->prepare('SELECT profile_id FROM patient_relatives WHERE id = ? LIMIT 1');
        $stmt->execute([$relativeId]);
        $profileId = $stmt->fetchColumn();

        return is_string($profileId) && $profileId !== '' ? $profileId : null;
    }

    /**
     * @return array{relative_id: string, owner_id: string}|null null si le profil n'est pas le dossier d'un proche
     */
    public static function resolve(PDO $db, string $profileId): ?array
    {
        if ($profileId === '' || !self::isAvailable($db)) {
            return null;
        }
        if (!array_key_exists($profileId, self::$resolved)) {
            $stmt = $db->prepare('SELECT id, patient_id FROM patient_relatives WHERE profile_id = ? LIMIT 1');
            $stmt->execute([$profileId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            self::$resolved[$profileId] = $row === false
                ? null
                : ['relative_id' => (string) $row['id'], 'owner_id' => (string) $row['patient_id']];
        }

        return self::$resolved[$profileId];
    }

    public static function isOwner(PDO $db, string $ownerUserId, string $profileId): bool
    {
        $relative = self::resolve($db, $profileId);

        return $relative !== null && $ownerUserId !== '' && $relative['owner_id'] === $ownerUserId;
    }

    /** À appeler quand un lien proche ↔ dossier disparaît (suppression du proche). */
    public static function forget(string $profileId): void
    {
        unset(self::$resolved[$profileId]);
    }

    /**
     * Dossier concerné par un RDV : celui du proche (créé au besoin) si le RDV est pour un proche, sinon le titulaire.
     */
    public static function ensureAppointmentSubject(PDO $db, string $patientId, ?string $relativeId): string
    {
        $relativeId = trim((string) $relativeId);
        if ($relativeId === '' || !self::isAvailable($db)) {
            return $patientId;
        }
        $profileId = self::ensureProfile($db, $relativeId);
        if (!self::isOwner($db, $patientId, $profileId)) {
            throw new InvalidArgumentException('Le proche du RDV n\'appartient pas au patient');
        }

        return $profileId;
    }

    /**
     * RDV concernant un dossier : pour le dossier d'un proche, ses RDV (relative_id) ; pour un patient,
     * ses propres RDV uniquement (pas ceux de ses proches, qui relèvent de leur dossier).
     *
     * @return array{0: string, 1: list<string>} fragment SQL sans AND initial, paramètres
     */
    public static function appointmentSubjectSql(PDO $db, string $alias, string $profileId): array
    {
        if (!preg_match('/^[a-z_][a-z0-9_]*$/', $alias)) {
            throw new InvalidArgumentException('Alias SQL invalide');
        }
        $relative = self::resolve($db, $profileId);
        if ($relative !== null) {
            return ["({$alias}.patient_id = ? AND {$alias}.relative_id = ?)", [$relative['owner_id'], $relative['relative_id']]];
        }

        return ["({$alias}.patient_id = ? AND {$alias}.relative_id IS NULL)", [$profileId]];
    }

    /**
     * RDV ou commande saisi depuis le dossier d'un proche (patient_id = dossier) : stocké sous le titulaire avec
     * relative_id, seule représentation lue par les listes, les contrôles d'accès et les notifications.
     *
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    public static function normalizeSubject(PDO $db, array $data): array
    {
        $patientId = trim((string) ($data['patient_id'] ?? ''));
        $relative = $patientId !== '' ? self::resolve($db, $patientId) : null;
        if ($relative === null) {
            return $data;
        }
        $relativeId = trim((string) ($data['relative_id'] ?? ''));
        if ($relativeId !== '' && $relativeId !== $relative['relative_id']) {
            throw new InvalidArgumentException('Le proche indiqué ne correspond pas au dossier sélectionné');
        }
        $data['patient_id'] = $relative['owner_id'];
        $data['relative_id'] = $relative['relative_id'];

        return $data;
    }

    /**
     * Dossiers existants de plusieurs proches en une requête.
     *
     * @param list<string> $relativeIds
     * @return array<string, string> relative_id => profile_id (proches sans dossier absents)
     */
    public static function profileIdsForRelatives(PDO $db, array $relativeIds): array
    {
        $relativeIds = array_values(array_unique(array_filter($relativeIds, static fn ($id): bool => $id !== '')));
        if ($relativeIds === [] || !self::isAvailable($db)) {
            return [];
        }
        $placeholders = implode(',', array_fill(0, count($relativeIds), '?'));
        $stmt = $db->prepare("SELECT id, profile_id FROM patient_relatives WHERE id IN ($placeholders) AND profile_id IS NOT NULL");
        $stmt->execute($relativeIds);
        $map = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
            $map[(string) $row['id']] = (string) $row['profile_id'];
        }

        return $map;
    }

    /**
     * Ajoute relative_profile_id (dossier du proche ; null pour le titulaire ou un proche sans dossier) à des lignes portant relative_id.
     *
     * @param list<array<string, mixed>> $rows
     * @return list<array<string, mixed>>
     */
    public static function withRelativeProfileIds(PDO $db, array $rows): array
    {
        $map = self::profileIdsForRelatives($db, array_map(
            static fn (array $row): string => (string) ($row['relative_id'] ?? ''),
            $rows,
        ));

        return array_map(static function (array $row) use ($map): array {
            $relativeId = (string) ($row['relative_id'] ?? '');
            $row['relative_profile_id'] = $relativeId !== '' ? ($map[$relativeId] ?? null) : null;

            return $row;
        }, $rows);
    }

    private static function isAvailable(PDO $db): bool
    {
        return DbSchemaCache::tableHasColumn($db, 'patient_relatives', 'profile_id');
    }
}

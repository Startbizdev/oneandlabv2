<?php

declare(strict_types=1);

require_once __DIR__ . '/../Crypto.php';
require_once __DIR__ . '/../users/UserBatchLookup.php';

/**
 * Binôme infirmier : règle unique « ce RDV est-il partagé avec cet infirmier ? » (table nurse_collaborations).
 * Une collaboration ne couvre que les RDV soins dont son titulaire est encore l'infirmier assigné :
 * réassigner le RDV met fin au partage, quel que soit le périmètre.
 */
final class NurseCollaboration
{
    /**
     * Prédicat SQL sans paramètre : la collaboration {$collab} couvre le RDV {$apt}.
     */
    public static function coversAppointmentSql(string $apt, string $collab): string
    {
        self::assertAlias($apt);
        self::assertAlias($collab);

        return "({$collab}.revoked_at IS NULL
            AND {$apt}.type = 'nursing'
            AND {$apt}.assigned_nurse_id = {$collab}.owner_nurse_id
            AND (
                ({$collab}.scope = 'appointment' AND {$collab}.appointment_id = {$apt}.id)
                OR ({$collab}.scope = 'series' AND {$collab}.passage_series_id = {$apt}.passage_series_id)
                OR ({$collab}.scope = 'range' AND {$apt}.scheduled_at IS NOT NULL
                    AND DATE({$apt}.scheduled_at) BETWEEN {$collab}.start_date AND {$collab}.end_date)
            ))";
    }

    /**
     * Le RDV {$alias} est partagé avec l'infirmier invité.
     *
     * @return array{0: string, 1: list<string>}
     */
    public static function sharedWithNurseSql(string $alias, string $nurseId): array
    {
        return [
            '(EXISTS (SELECT 1 FROM nurse_collaborations nc_shared WHERE nc_shared.co_nurse_id = ? AND '
                . self::coversAppointmentSql($alias, 'nc_shared') . '))',
            [$nurseId],
        ];
    }

    /**
     * Le RDV {$alias} est assigné à l'infirmier ou partagé avec lui.
     *
     * @return array{0: string, 1: list<string>}
     */
    public static function assignedOrSharedSql(string $alias, string $nurseId): array
    {
        [$sharedSql, $sharedParams] = self::sharedWithNurseSql($alias, $nurseId);

        return ["({$alias}.assigned_nurse_id = ? OR {$sharedSql})", [$nurseId, ...$sharedParams]];
    }

    public static function isAppointmentSharedWith(PDO $db, string $appointmentId, string $nurseId): bool
    {
        if ($appointmentId === '' || $nurseId === '') {
            return false;
        }
        [$sharedSql, $params] = self::sharedWithNurseSql('a', $nurseId);
        $stmt = $db->prepare("SELECT 1 FROM appointments a WHERE a.id = ? AND {$sharedSql} LIMIT 1");
        $stmt->execute([$appointmentId, ...$params]);

        return $stmt->fetchColumn() !== false;
    }

    /**
     * La série est lisible par l'invité : partage de la série, d'un de ses RDV, ou d'une plage qui en couvre un.
     * Le titulaire reste nurse_id ; l'invité ne fait que lire.
     */
    public static function isSeriesSharedWith(PDO $db, string $seriesId, string $nurseId): bool
    {
        if ($seriesId === '' || $nurseId === '') {
            return false;
        }
        $stmt = $db->prepare("
            SELECT 1
            FROM nurse_passage_series s
            WHERE s.id = ?
              AND EXISTS (
                SELECT 1 FROM nurse_collaborations nc
                WHERE nc.revoked_at IS NULL
                  AND nc.co_nurse_id = ?
                  AND nc.owner_nurse_id = s.nurse_id
                  AND (
                    (nc.scope = 'series' AND nc.passage_series_id = s.id)
                    OR (nc.scope = 'appointment' AND EXISTS (
                        SELECT 1 FROM appointments a
                        WHERE a.id = nc.appointment_id
                          AND a.passage_series_id = s.id
                          AND a.type = 'nursing'
                          AND a.assigned_nurse_id = nc.owner_nurse_id
                    ))
                    OR (nc.scope = 'range' AND EXISTS (
                        SELECT 1 FROM appointments a
                        WHERE a.passage_series_id = s.id
                          AND a.type = 'nursing'
                          AND a.assigned_nurse_id = nc.owner_nurse_id
                          AND a.scheduled_at IS NOT NULL
                          AND DATE(a.scheduled_at) BETWEEN nc.start_date AND nc.end_date
                    ))
                  )
              )
            LIMIT 1
        ");
        $stmt->execute([$seriesId, $nurseId]);

        return $stmt->fetchColumn() !== false;
    }

    /**
     * Confrères invités et titulaire qui partage, par RDV, en une requête.
     *
     * @param list<string> $appointmentIds
     * @return array<string, array{co_nurses: list<array{id: string, name: string}>, shared_by_name: string}>
     */
    public static function collaborationsByAppointmentIds(PDO $db, array $appointmentIds): array
    {
        $appointmentIds = array_values(array_unique(array_filter(array_map('strval', $appointmentIds))));
        if ($appointmentIds === []) {
            return [];
        }
        $placeholders = implode(',', array_fill(0, count($appointmentIds), '?'));
        $stmt = $db->prepare('
            SELECT DISTINCT a.id AS appointment_id, nc.co_nurse_id, nc.owner_nurse_id
            FROM appointments a
            INNER JOIN nurse_collaborations nc ON ' . self::coversAppointmentSql('a', 'nc') . "
            WHERE a.id IN ($placeholders)
            ORDER BY nc.co_nurse_id
        ");
        $stmt->execute($appointmentIds);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        if ($rows === []) {
            return [];
        }
        $names = (new UserBatchLookup($db, new Crypto()))->displayNamesByIds(
            [...array_column($rows, 'co_nurse_id'), ...array_column($rows, 'owner_nurse_id')],
        );
        $out = [];
        foreach ($rows as $row) {
            $aptId = (string) $row['appointment_id'];
            $nurseId = (string) $row['co_nurse_id'];
            $out[$aptId] ??= ['co_nurses' => [], 'shared_by_name' => (string) ($names[(string) $row['owner_nurse_id']] ?? '')];
            if (!in_array($nurseId, array_column($out[$aptId]['co_nurses'], 'id'), true)) {
                $out[$aptId]['co_nurses'][] = ['id' => $nurseId, 'name' => (string) ($names[$nurseId] ?? '')];
            }
        }

        return $out;
    }

    /**
     * Ajoute co_nurses, is_co_nurse (le lecteur est invité, pas titulaire) et shared_by_name (titulaire, pour l'invité)
     * à des lignes RDV portant id et assigned_nurse_id.
     *
     * @param list<array<string, mixed>> $rows
     * @return list<array<string, mixed>>
     */
    public static function withCoNurses(PDO $db, array $rows, string $viewerId): array
    {
        $map = self::collaborationsByAppointmentIds($db, array_map(static fn (array $row): string => (string) ($row['id'] ?? ''), $rows));
        foreach ($rows as $i => $row) {
            $rows[$i] = self::decorate($row, $map[(string) ($row['id'] ?? '')] ?? null, $viewerId);
        }

        return $rows;
    }

    /**
     * @param array<string, mixed> $row
     * @param array{co_nurses: list<array{id: string, name: string}>, shared_by_name: string}|null $collaboration
     * @return array<string, mixed>
     */
    public static function decorate(array $row, ?array $collaboration, string $viewerId): array
    {
        $coNurses = $collaboration['co_nurses'] ?? [];
        $isCoNurse = $viewerId !== ''
            && (string) ($row['assigned_nurse_id'] ?? '') !== $viewerId
            && in_array($viewerId, array_column($coNurses, 'id'), true);
        $row['co_nurses'] = $coNurses;
        $row['is_co_nurse'] = $isCoNurse;
        $row['shared_by_name'] = $isCoNurse && ($collaboration['shared_by_name'] ?? '') !== ''
            ? $collaboration['shared_by_name']
            : null;

        return $row;
    }

    /**
     * Titulaires dont la tournée du jour est partagée avec l'invité (séries ou plages) : leurs séries doivent être
     * matérialisées pour que l'invité voie les passages du jour.
     *
     * @return list<string>
     */
    public static function ownerIdsSharingDate(PDO $db, string $coNurseId, string $date): array
    {
        $stmt = $db->prepare("
            SELECT DISTINCT owner_nurse_id FROM nurse_collaborations
            WHERE co_nurse_id = ? AND revoked_at IS NULL
              AND (scope = 'series' OR (scope = 'range' AND ? BETWEEN start_date AND end_date))
        ");
        $stmt->execute([$coNurseId, $date]);

        return array_map('strval', $stmt->fetchAll(PDO::FETCH_COLUMN) ?: []);
    }

    private static function assertAlias(string $alias): void
    {
        if (!preg_match('/^[a-z_][a-z0-9_]*$/', $alias)) {
            throw new InvalidArgumentException('Alias SQL invalide');
        }
    }
}

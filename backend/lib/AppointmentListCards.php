<?php

declare(strict_types=1);

/**
 * Pagination liste admin par cartes (lots multisoins regroupés côté serveur).
 */
final class AppointmentListCards
{
    public static function cardKeyExpr(string $alias = 'a'): string
    {
        return "CASE
            WHEN {$alias}.creation_batch_id IS NOT NULL AND {$alias}.creation_batch_id != ''
                 AND {$alias}.type IN ('nursing', 'blood_test')
            THEN CONCAT({$alias}.type, ':', {$alias}.creation_batch_id)
            ELSE CONCAT('single:', {$alias}.id)
        END";
    }

    public static function cardKeyFromAppointment(array $apt): string
    {
        $bid = $apt['creation_batch_id'] ?? null;
        $type = (string) ($apt['type'] ?? '');
        if (
            is_string($bid) && $bid !== ''
            && in_array($type, ['nursing', 'blood_test'], true)
        ) {
            return $type . ':' . $bid;
        }

        return 'single:' . (string) ($apt['id'] ?? '');
    }

    /**
     * @param list<mixed> $params
     * @return array{keys: list<string>, total_cards: int, has_more: bool}
     */
    public static function paginateCardKeys(
        PDO $db,
        string $listSql,
        array $params,
        int $page,
        int $limit,
        bool $skipCount
    ): array {
        $cardExpr = self::cardKeyExpr('a');
        $fromWhere = preg_replace('/^\s*SELECT[\s\S]*?\bFROM\b/i', 'FROM', $listSql, 1);
        if (!is_string($fromWhere) || $fromWhere === '' || preg_match('/^\s*SELECT\b/i', $fromWhere)) {
            throw new RuntimeException('SQL liste RDV invalide pour pagination cartes');
        }

        $innerSql = "
            SELECT {$cardExpr} AS card_key, a.created_at AS sort_created_at
            {$fromWhere}
        ";

        $offset = max(0, ($page - 1) * $limit);
        $pageSql = "
            SELECT card_key, MAX(sort_created_at) AS sort_created_at
            FROM ({$innerSql}) card_src
            GROUP BY card_key
            ORDER BY sort_created_at DESC, card_key DESC
            LIMIT " . (int) $limit . ' OFFSET ' . (int) $offset;

        $stmt = $db->prepare($pageSql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $keys = array_values(array_map(static fn(array $r): string => (string) $r['card_key'], $rows));

        $totalCards = 0;
        if (!$skipCount) {
            $countSql = "
                SELECT COUNT(*) AS total_cards
                FROM (
                    SELECT card_key
                    FROM ({$innerSql}) card_src
                    GROUP BY card_key
                ) counted
            ";
            $countStmt = $db->prepare($countSql);
            $countStmt->execute($params);
            $totalCards = (int) ($countStmt->fetch(PDO::FETCH_ASSOC)['total_cards'] ?? 0);
        }

        $hasMore = count($keys) >= $limit;
        if (!$skipCount && $totalCards > 0) {
            $hasMore = ($offset + count($keys)) < $totalCards;
        }

        return [
            'keys' => $keys,
            'total_cards' => $totalCards,
            'has_more' => $hasMore,
        ];
    }

    /**
     * @param list<string> $cardKeys
     * @param list<mixed> $params
     */
    public static function appendCardKeysFilter(string $listSql, array $cardKeys, array &$params): string
    {
        if ($cardKeys === []) {
            return $listSql . ' AND 1=0';
        }

        $singleIds = [];
        $nursingBatches = [];
        $bloodBatches = [];

        foreach ($cardKeys as $key) {
            if (str_starts_with($key, 'single:')) {
                $singleIds[] = substr($key, 7);
            } elseif (str_starts_with($key, 'nursing:')) {
                $nursingBatches[] = substr($key, 8);
            } elseif (str_starts_with($key, 'blood_test:')) {
                $bloodBatches[] = substr($key, 11);
            }
        }

        $parts = [];
        if ($singleIds !== []) {
            $ph = implode(',', array_fill(0, count($singleIds), '?'));
            $parts[] = "a.id IN ($ph)";
            foreach ($singleIds as $id) {
                $params[] = $id;
            }
        }
        if ($nursingBatches !== []) {
            $ph = implode(',', array_fill(0, count($nursingBatches), '?'));
            $parts[] = "(a.type = 'nursing' AND a.creation_batch_id IN ($ph))";
            foreach ($nursingBatches as $bid) {
                $params[] = $bid;
            }
        }
        if ($bloodBatches !== []) {
            $ph = implode(',', array_fill(0, count($bloodBatches), '?'));
            $parts[] = "(a.type = 'blood_test' AND a.creation_batch_id IN ($ph))";
            foreach ($bloodBatches as $bid) {
                $params[] = $bid;
            }
        }

        return $listSql . ' AND (' . implode(' OR ', $parts) . ')';
    }

    /**
     * IDs représentatifs (1 par carte) — premier créneau pour les lots.
     *
     * @param list<string> $cardKeys
     * @param list<mixed> $params
     * @return list<array{id: string, card_key: string}>
     */
    public static function fetchRepresentativeIdRows(
        PDO $db,
        string $listSql,
        array $cardKeys,
        array $params
    ): array {
        if ($cardKeys === []) {
            return [];
        }

        $cardExpr = self::cardKeyExpr('a');
        $fromWhere = preg_replace('/^\s*SELECT[\s\S]*?\bFROM\b/i', 'FROM', $listSql, 1);
        if (!is_string($fromWhere) || $fromWhere === '' || preg_match('/^\s*SELECT\b/i', $fromWhere)) {
            throw new RuntimeException('SQL liste RDV invalide pour IDs représentatifs');
        }

        $keyPlaceholders = implode(',', array_fill(0, count($cardKeys), '?'));
        $rankedSql = "
            SELECT id, card_key FROM (
                SELECT
                    a.id,
                    {$cardExpr} AS card_key,
                    ROW_NUMBER() OVER (
                        PARTITION BY {$cardExpr}
                        ORDER BY COALESCE(a.scheduled_at, a.created_at) ASC, a.id ASC
                    ) AS rn
                {$fromWhere}
            ) ranked
            WHERE rn = 1 AND card_key IN ({$keyPlaceholders})
        ";

        $execParams = array_merge($params, $cardKeys);
        $stmt = $db->prepare($rankedSql);
        $stmt->execute($execParams);

        return array_map(
            static fn(array $row): array => [
                'id' => (string) ($row['id'] ?? ''),
                'card_key' => (string) ($row['card_key'] ?? ''),
            ],
            $stmt->fetchAll(PDO::FETCH_ASSOC)
        );
    }

    /**
     * @param list<string> $excludeIds
     * @param list<mixed> $params
     */
    public static function appendExcludeIdsFilter(string $listSql, array $excludeIds, array &$params): string
    {
        if ($excludeIds === []) {
            return $listSql;
        }
        $ph = implode(',', array_fill(0, count($excludeIds), '?'));
        foreach ($excludeIds as $id) {
            $params[] = $id;
        }

        return $listSql . " AND a.id NOT IN ($ph)";
    }

    /**
     * Frère de lot : champs planifiés + copie des données déchiffrées du représentant.
     *
     * @param array<string, mixed> $representative
     * @param array<string, mixed> $rawRow
     * @return array<string, mixed>
     */
    public static function siblingStubFromRepresentative(array $representative, array $rawRow): array
    {
        $stub = [
            'id' => $rawRow['id'] ?? null,
            'type' => $rawRow['type'] ?? null,
            'status' => $rawRow['status'] ?? null,
            'scheduled_at' => $rawRow['scheduled_at'] ?? null,
            'created_at' => $rawRow['created_at'] ?? null,
            'creation_batch_id' => $rawRow['creation_batch_id'] ?? null,
            'patient_id' => $rawRow['patient_id'] ?? $representative['patient_id'] ?? null,
            'category_id' => $rawRow['category_id'] ?? null,
            'category_name' => $rawRow['category_name'] ?? null,
            'category_type' => $rawRow['category_type'] ?? null,
            'category_icon' => $rawRow['category_icon'] ?? null,
            'category_image_url' => $rawRow['category_image_url'] ?? null,
            'assigned_nurse_id' => $rawRow['assigned_nurse_id'] ?? $representative['assigned_nurse_id'] ?? null,
            'assigned_lab_id' => $rawRow['assigned_lab_id'] ?? $representative['assigned_lab_id'] ?? null,
            'assigned_to' => $rawRow['assigned_to'] ?? $representative['assigned_to'] ?? null,
            'is_urgent' => $rawRow['is_urgent'] ?? $representative['is_urgent'] ?? null,
            'urgency_level' => $rawRow['urgency_level'] ?? $representative['urgency_level'] ?? null,
        ];

        foreach ([
            'address', 'form_data', 'relative',
            'assigned_lab_display_name', 'assigned_nurse_display_name', 'assigned_to_display_name',
            'assigned_lab_profile_image_url', 'assigned_nurse_profile_image_url', 'assigned_to_profile_image_url',
            'beneficiary_profile_image_url', 'assigned_lab_gender', 'assigned_nurse_gender', 'assigned_to_gender',
            'beneficiary_gender',
            'assigned_lab_average_rating', 'assigned_lab_reviews_count',
            'assigned_nurse_average_rating', 'assigned_nurse_reviews_count',
            'assigned_to_average_rating', 'assigned_to_reviews_count',
        ] as $copyKey) {
            if (array_key_exists($copyKey, $representative)) {
                $stub[$copyKey] = $representative[$copyKey];
            }
        }

        return $stub;
    }

    /**
     * @param list<array<string, mixed>> $decryptedRepresentatives
     * @param list<array<string, mixed>> $rawSiblings
     * @return list<array<string, mixed>>
     */
    public static function mergeRepresentativesWithSiblings(
        array $decryptedRepresentatives,
        array $rawSiblings
    ): array {
        if ($rawSiblings === []) {
            return $decryptedRepresentatives;
        }

        $repByKey = [];
        foreach ($decryptedRepresentatives as $apt) {
            $repByKey[self::cardKeyFromAppointment($apt)] = $apt;
        }

        $merged = $decryptedRepresentatives;
        foreach ($rawSiblings as $raw) {
            $key = self::cardKeyFromAppointment($raw);
            $rep = $repByKey[$key] ?? null;
            if (!is_array($rep)) {
                continue;
            }
            $merged[] = self::siblingStubFromRepresentative($rep, $raw);
        }

        return $merged;
    }

    /**
     * @param list<array<string, mixed>> $appointments
     * @param list<string> $orderedCardKeys
     * @return list<array<string, mixed>>
     */
    public static function groupIntoRows(array $appointments, array $orderedCardKeys): array
    {
        $byKey = [];
        foreach ($appointments as $apt) {
            $key = self::cardKeyFromAppointment($apt);
            if (!isset($byKey[$key])) {
                $byKey[$key] = [];
            }
            $byKey[$key][] = $apt;
        }

        $rows = [];
        foreach ($orderedCardKeys as $key) {
            $group = $byKey[$key] ?? [];
            if ($group === []) {
                continue;
            }
            usort($group, static function (array $a, array $b): int {
                $ax = strtotime((string) ($a['scheduled_at'] ?? $a['created_at'] ?? '')) ?: 0;
                $bx = strtotime((string) ($b['scheduled_at'] ?? $b['created_at'] ?? '')) ?: 0;
                return $ax <=> $bx;
            });
            if (count($group) <= 1 && str_starts_with($key, 'single:')) {
                $rows[] = [
                    'kind' => 'single',
                    'appointment' => $group[0],
                ];
            } else {
                $rows[] = [
                    'kind' => 'batch',
                    'key' => $key,
                    'appointments' => $group,
                ];
            }
        }

        return $rows;
    }
}

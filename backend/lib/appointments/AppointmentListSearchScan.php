<?php

declare(strict_types=1);

/**
 * Recherche dans la liste des RDV : les champs patient sont chiffrés, la base ne peut pas filtrer.
 * Parcourt la liste triée par lots (déchiffrés par `$fetchBatch`) et garde les correspondances
 * jusqu'à remplir une page ; `next_cursor` reprend juste après la dernière ligne lue.
 */
final class AppointmentListSearchScan
{
    /** Lignes lues au plus par requête : au-delà, la page suivante reprend au curseur. */
    public const MAX_SCANNED_ROWS = 1000;

    /**
     * @param callable(int $offset, int $count): list<array<string, mixed>> $fetchBatch lignes déchiffrées, ordre de la liste
     * @param callable(array<string, mixed>): bool $matches
     * @return array{items: list<array<string, mixed>>, next_cursor: int, has_more: bool}
     */
    public static function run(
        callable $fetchBatch,
        callable $matches,
        int $limit,
        int $cursor,
        int $maxScanned = self::MAX_SCANNED_ROWS
    ): array {
        $limit = max(1, $limit);
        $cursor = max(0, $cursor);
        $batchSize = max($limit, 50);
        $items = [];
        $scanned = 0;

        while (count($items) < $limit && $scanned < $maxScanned) {
            $requested = min($batchSize, $maxScanned - $scanned);
            $rows = $fetchBatch($cursor, $requested);
            $consumed = 0;
            foreach ($rows as $row) {
                $cursor++;
                $scanned++;
                $consumed++;
                if ($matches($row)) {
                    $items[] = $row;
                    if (count($items) >= $limit) {
                        break;
                    }
                }
            }
            if (count($rows) < $requested && $consumed === count($rows)) {
                // Lot incomplet lu en entier : fin de la liste.
                return ['items' => $items, 'next_cursor' => $cursor, 'has_more' => false];
            }
        }

        return ['items' => $items, 'next_cursor' => $cursor, 'has_more' => true];
    }
}

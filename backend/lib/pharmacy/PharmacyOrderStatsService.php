<?php

declare(strict_types=1);

/**
 * Statistiques commandes pharmacie (v2).
 */
final class PharmacyOrderStatsService
{
    public function __construct(private PDO $db)
    {
    }

    /** @return array<string, mixed> */
    public function adminStats(?string $from = null, ?string $to = null): array
    {
        [$fromSql, $toSql, $params] = $this->dateRange($from, $to);

        $total = $this->scalar(
            "SELECT COUNT(*) FROM pharmacy_orders WHERE created_at >= ? AND created_at < ?",
            $params
        );

        $byStatus = $this->groupCount(
            "SELECT status AS grp, COUNT(*) AS cnt FROM pharmacy_orders
             WHERE created_at >= ? AND created_at < ?
             GROUP BY status",
            $params
        );

        $byMode = $this->groupCount(
            "SELECT fulfillment_mode AS grp, COUNT(*) AS cnt FROM pharmacy_orders
             WHERE created_at >= ? AND created_at < ?
             GROUP BY fulfillment_mode",
            $params
        );

        return [
            'total' => $total,
            'by_status' => $byStatus,
            'by_fulfillment_mode' => $byMode,
            'from' => $fromSql,
            'to' => $toSql,
        ];
    }

    /** @return array<string, mixed> */
    public function pharmacyReceivedStats(string $pharmacyId, ?string $from = null, ?string $to = null): array
    {
        [$fromSql, $toSql, $dateParams] = $this->dateRange($from, $to);
        $params = array_merge([$pharmacyId], $dateParams);

        $total = $this->scalar(
            'SELECT COUNT(*) FROM pharmacy_orders WHERE pharmacy_id = ? AND created_at >= ? AND created_at < ?',
            $params
        );
        $accepted = $this->scalar(
            "SELECT COUNT(*) FROM pharmacy_orders WHERE pharmacy_id = ? AND created_at >= ? AND created_at < ?
             AND status IN ('acceptee','en_cours','terminee')",
            $params
        );
        $refused = $this->scalar(
            "SELECT COUNT(*) FROM pharmacy_orders WHERE pharmacy_id = ? AND created_at >= ? AND created_at < ?
             AND status = 'refusee'",
            $params
        );

        return [
            'received' => $total,
            'accepted' => $accepted,
            'refused' => $refused,
            'acceptance_rate' => $total > 0 ? round($accepted / $total * 100, 1) : 0,
            'from' => $fromSql,
            'to' => $toSql,
        ];
    }

    /** @return array<string, mixed> */
    public function requesterSentStats(string $requesterId, ?string $from = null, ?string $to = null): array
    {
        [$fromSql, $toSql, $dateParams] = $this->dateRange($from, $to);
        $params = array_merge([$requesterId], $dateParams);

        $total = $this->scalar(
            'SELECT COUNT(*) FROM pharmacy_orders WHERE requester_id = ? AND created_at >= ? AND created_at < ?',
            $params
        );
        $completed = $this->scalar(
            "SELECT COUNT(*) FROM pharmacy_orders WHERE requester_id = ? AND created_at >= ? AND created_at < ?
             AND status = 'terminee'",
            $params
        );

        return [
            'sent' => $total,
            'completed' => $completed,
            'from' => $fromSql,
            'to' => $toSql,
        ];
    }

    /** @return array{0: string, 1: string, 2: list<string>} */
    private function dateRange(?string $from, ?string $to): array
    {
        $fromDt = $from !== null && $from !== ''
            ? date('Y-m-d 00:00:00', strtotime($from))
            : date('Y-m-d 00:00:00', strtotime('-30 days'));
        $toDt = $to !== null && $to !== ''
            ? date('Y-m-d 23:59:59', strtotime($to))
            : date('Y-m-d 23:59:59');

        return [$fromDt, $toDt, [$fromDt, $toDt]];
    }

    /** @param list<string|int> $params */
    private function scalar(string $sql, array $params): int
    {
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        return (int) $stmt->fetchColumn();
    }

    /**
     * @param list<string|int> $params
     * @return array<string, int>
     */
    private function groupCount(string $sql, array $params): array
    {
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $out = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
            $out[(string) ($row['grp'] ?? '')] = (int) $row['cnt'];
        }

        return $out;
    }
}

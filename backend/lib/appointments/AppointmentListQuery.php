<?php

declare(strict_types=1);

/**
 * Valeur immuable pour les paramètres GET de liste RDV (comportement figé de api/appointments/index.php).
 */
final class AppointmentListQuery
{
    public function __construct(
        public readonly string $listScope,
        public readonly bool $calendarView,
        public readonly bool $lightListPayload,
        public readonly ?string $status,
        public readonly ?string $type,
        public readonly int $page,
        public readonly int $limit,
        public readonly int $offset,
        public readonly ?string $patientPeriod,
        public readonly ?string $dateFrom,
        public readonly ?string $dateTo,
        public readonly bool $skipCount,
        public readonly ?string $segment,
        public readonly ?string $userIdOverride,
        public readonly ?string $patientId,
        public readonly ?string $view,
    ) {
    }

    /** @param array<string, mixed> $get */
    public static function fromArray(array $get): self
    {
        $status = isset($get['status']) ? (string) $get['status'] : null;
        if ($status === '') {
            $status = null;
        }
        $type = isset($get['type']) ? (string) $get['type'] : null;
        if ($type === '') {
            $type = null;
        }
        $page = (int) ($get['page'] ?? 1);
        if ($page < 1) {
            $page = 1;
        }
        $limit = (int) ($get['limit'] ?? 20);
        $calendarView = (($get['view'] ?? '') === 'calendar');
        $listScope = isset($get['scope']) ? trim((string) $get['scope']) : 'full';
        if ($listScope !== 'list') {
            $listScope = 'full';
        }
        $lightListPayload = $calendarView || $listScope === 'list';
        $limit = min(max($limit, 1), $calendarView ? 250 : 50);
        $offset = ($page - 1) * $limit;

        $patientPeriod = isset($get['patient_period']) ? trim((string) $get['patient_period']) : null;
        if ($patientPeriod !== null && !in_array($patientPeriod, ['upcoming', 'past'], true)) {
            $patientPeriod = null;
        }
        $dateFrom = !empty($get['date_from']) ? trim((string) $get['date_from']) : null;
        $dateTo = !empty($get['date_to']) ? trim((string) $get['date_to']) : null;
        $view = isset($get['view']) ? trim((string) $get['view']) : null;
        if ($view === '') {
            $view = null;
        }

        return new self(
            listScope: $listScope,
            calendarView: $calendarView,
            lightListPayload: $lightListPayload,
            status: $status,
            type: $type,
            page: $page,
            limit: $limit,
            offset: $offset,
            patientPeriod: $patientPeriod,
            dateFrom: $dateFrom,
            dateTo: $dateTo,
            skipCount: isset($get['skip_count']) && (string) $get['skip_count'] === '1',
            segment: isset($get['segment']) ? trim((string) $get['segment']) : null,
            userIdOverride: isset($get['user_id']) ? trim((string) $get['user_id']) : null,
            patientId: !empty($get['patient_id']) ? trim((string) $get['patient_id']) : null,
            view: $view,
        );
    }

    public static function fromGlobals(): self
    {
        return self::fromArray($_GET);
    }
}

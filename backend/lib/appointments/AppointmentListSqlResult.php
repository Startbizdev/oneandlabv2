<?php

declare(strict_types=1);

/** SELECT + COUNT pair and bind params for appointment list queries. */
final class AppointmentListSqlResult
{
    /**
     * @param array<int, mixed> $params
     */
    public function __construct(
        public readonly string $selectSql,
        public readonly string $countSql,
        public readonly array $params,
        public readonly string $effectiveRole,
        public readonly string $effectiveUserId,
        public readonly bool $useRelativeJoin,
        public readonly bool $hasMergedColumn,
    ) {
    }
}

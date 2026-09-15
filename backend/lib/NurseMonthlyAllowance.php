<?php

declare(strict_types=1);

/** One definition of accepted monthly appointments for display and assignment checks. */
final class NurseMonthlyAllowance
{
    public static function count(PDO $db, string $nurseId, ?DateTimeImmutable $now = null, ?string $excludeAppointmentId = null): int
    {
        $clock = ($now ?? new DateTimeImmutable('now'))->setTimezone(new DateTimeZone('Europe/Paris'));
        $start = $clock->modify('first day of this month')->setTime(0, 0);
        $end = $start->modify('+1 month');
        $mysql = $db->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
        // History uses TIMESTAMP; compare instants independently of the connection timezone.
        // scheduled_at remains a France-local DATETIME for legacy rows without acceptance history.
        $acceptedAt = $mysql ? 'UNIX_TIMESTAMP(created_at)' : 'created_at';
        $sql = "SELECT COUNT(*) FROM appointments a
            LEFT JOIN (
                SELECT appointment_id, MIN({$acceptedAt}) AS first_accepted_at
                FROM appointment_status_updates
                WHERE status = 'confirmed' AND actor_role = 'nurse' AND actor_id = ?
                GROUP BY appointment_id
            ) u ON u.appointment_id = a.id
            WHERE a.assigned_nurse_id = ?
            AND a.status NOT IN ('canceled', 'refused', 'expired')
            AND (
                (u.first_accepted_at IS NOT NULL AND u.first_accepted_at >= ? AND u.first_accepted_at < ?)
                OR (u.first_accepted_at IS NULL
                    AND a.status IN ('confirmed', 'planned', 'inProgress', 'completed')
                    AND a.scheduled_at >= ? AND a.scheduled_at < ?)
            )";
        $params = [$nurseId, $nurseId, $mysql ? $start->getTimestamp() : $start->format('Y-m-d H:i:s'), $mysql ? $end->getTimestamp() : $end->format('Y-m-d H:i:s'), $start->format('Y-m-d H:i:s'), $end->format('Y-m-d H:i:s')];
        if ($excludeAppointmentId !== null && $excludeAppointmentId !== '') {
            $sql .= ' AND a.id <> ?';
            $params[] = $excludeAppointmentId;
        }
        $statement = $db->prepare($sql);
        $statement->execute($params);
        return (int) $statement->fetchColumn();
    }
}

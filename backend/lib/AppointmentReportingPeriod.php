<?php
declare(strict_types=1);

/** Calendar reporting follows the appointment's local France date. */
final class AppointmentReportingPeriod
{
    private DateTimeImmutable $monthStart;
    private DateTimeImmutable $monthEnd;
    private DateTimeImmutable $dayStart;
    private DateTimeImmutable $dayEnd;
    private DateTimeZone $zone;

    public function __construct(?DateTimeImmutable $now = null)
    {
        $this->zone = new DateTimeZone('Europe/Paris');
        $local = ($now ?? new DateTimeImmutable('now', $this->zone))->setTimezone($this->zone);
        $this->dayStart = $local->setTime(0, 0);
        $this->dayEnd = $this->dayStart->modify('+1 day');
        $this->monthStart = $local->modify('first day of this month')->setTime(0, 0);
        $this->monthEnd = $this->monthStart->modify('+1 month');
    }

    public function containsMonth(?string $date): bool { return $this->contains($date, $this->monthStart, $this->monthEnd); }
    public function containsDay(?string $date): bool { return $this->contains($date, $this->dayStart, $this->dayEnd); }

    private function contains(?string $date, DateTimeImmutable $start, DateTimeImmutable $end): bool
    {
        if ($date === null || trim($date) === '') return false;
        try { $value = new DateTimeImmutable($date, $this->zone); }
        catch (Exception) { return false; }
        $errors = DateTimeImmutable::getLastErrors();
        if ($errors !== false && ($errors['warning_count'] || $errors['error_count'])) return false;
        return $value >= $start && $value < $end;
    }
}

<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/NurseTourService.php';

final class TourIcsExporter
{
    public function exportDay(string $nurseId, string $tourDate): string
    {
        $service = new NurseTourService();
        $tour = $service->getTour($nurseId, $tourDate);
        $events = [];
        foreach ($tour['stops'] ?? [] as $stop) {
            if (!is_array($stop)) {
                continue;
            }
            $startRaw = (string) ($stop['scheduled_at'] ?? '');
            if ($startRaw === '') {
                continue;
            }
            $start = new DateTimeImmutable($startRaw, new DateTimeZone('UTC'));
            $end = $start->modify('+45 minutes');
            $title = trim((string) ($stop['patient_name'] ?? 'Soin'));
            $cat = trim((string) ($stop['category_name'] ?? ''));
            if ($cat !== '') {
                $title .= ' — ' . $cat;
            }
            $events[] = $this->buildEvent(
                (string) ($stop['appointment_id'] ?? nurse_tour_uuid()),
                $title,
                (string) ($stop['address_line'] ?? ''),
                $start,
                $end,
            );
        }

        return $this->wrapCalendar($events);
    }

    private function buildEvent(string $uid, string $title, string $location, DateTimeImmutable $start, DateTimeImmutable $end): string
    {
        $fmt = static fn (DateTimeImmutable $dt): string => $dt->setTimezone(new DateTimeZone('UTC'))->format('Ymd\THis\Z');
        $esc = static fn (string $s): string => str_replace(["\n", ',', ';'], ['\\n', '\\,', '\\;'], $s);

        return implode("\r\n", [
            'BEGIN:VEVENT',
            'UID:' . $esc($uid) . '@oneandlab.fr',
            'DTSTART:' . $fmt($start),
            'DTEND:' . $fmt($end),
            'SUMMARY:' . $esc($title),
            $location !== '' ? 'LOCATION:' . $esc($location) : '',
            'END:VEVENT',
        ]);
    }

    /**
     * @param list<string> $events
     */
    private function wrapCalendar(array $events): string
    {
        return implode("\r\n", array_merge(
            ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//OneAndLab//NurseTour//FR'],
            $events,
            ['END:VCALENDAR'],
        ));
    }
}

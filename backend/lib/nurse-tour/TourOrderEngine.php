<?php

declare(strict_types=1);

require_once __DIR__ . '/TourProximity.php';

final class TourOrderEngine
{
    /**
     * @param list<array<string, mixed>> $appointments
     * @param array<string, mixed> $plan
     * @param array{lat: float, lng: float}|null $origin
     * @return list<string> appointment ids
     */
    public function orderIds(array $appointments, array $plan, ?array $origin = null): array
    {
        if ($appointments === []) {
            return [];
        }

        $sortMode = (string) ($plan['sort_mode'] ?? 'smart');
        $locked = (bool) ($plan['manual_order_locked'] ?? false);
        $manualOrder = $this->decodeOrderJson($plan['appointment_order_json'] ?? null);

        if ($locked || $sortMode === 'manual') {
            return $this->applyManualOrder($appointments, $manualOrder);
        }

        return match ($sortMode) {
            'schedule' => $this->orderBySchedule($appointments),
            'nearest' => array_map(
                static fn (array $a): string => (string) ($a['id'] ?? ''),
                TourProximity::nearestNeighborOrder($appointments, $origin),
            ),
            default => $this->orderSmart($appointments, $origin),
        };
    }

    /**
     * @param list<array<string, mixed>> $appointments
     * @return list<string>
     */
    public function orderSmart(array $appointments, ?array $origin): array
    {
        $byAddress = [];
        foreach ($appointments as $apt) {
            $key = TourProximity::addressKey($apt);
            $byAddress[$key][] = $apt;
        }

        $groups = [];
        foreach ($byAddress as $rows) {
            usort($rows, [$this, 'compareSchedule']);
            $groups[] = [
                'anchor' => $this->scheduleTimestamp($rows[0] ?? []),
                'rows' => $rows,
            ];
        }
        usort($groups, static fn ($a, $b) => $a['anchor'] <=> $b['anchor']);

        $flat = [];
        foreach ($groups as $group) {
            foreach ($group['rows'] as $row) {
                $flat[] = $row;
            }
        }

        return array_values(array_filter(array_map(
            static fn (array $a): string => (string) ($a['id'] ?? ''),
            $flat,
        )));
    }

    /**
     * @param list<array<string, mixed>> $appointments
     * @return list<string>
     */
    public function orderBySchedule(array $appointments): array
    {
        $copy = $appointments;
        usort($copy, [$this, 'compareSchedule']);

        return array_values(array_filter(array_map(
            static fn (array $a): string => (string) ($a['id'] ?? ''),
            $copy,
        )));
    }

    /**
     * @param list<array<string, mixed>> $appointments
     * @param list<string> $manualOrder
     * @return list<string>
     */
    public function applyManualOrder(array $appointments, array $manualOrder): array
    {
        $byId = [];
        foreach ($appointments as $apt) {
            $id = (string) ($apt['id'] ?? '');
            if ($id !== '') {
                $byId[$id] = $apt;
            }
        }
        $ordered = [];
        foreach ($manualOrder as $id) {
            if (isset($byId[$id])) {
                $ordered[] = $id;
                unset($byId[$id]);
            }
        }
        foreach ($byId as $id => $_apt) {
            $ordered[] = $id;
        }

        return $ordered;
    }

    /**
     * @return list<string>
     */
    private function decodeOrderJson(mixed $json): array
    {
        if (is_string($json) && $json !== '') {
            $decoded = json_decode($json, true);
            if (is_array($decoded)) {
                return array_values(array_filter(array_map('strval', $decoded)));
            }
        }
        if (is_array($json)) {
            return array_values(array_filter(array_map('strval', $json)));
        }

        return [];
    }

    private function compareSchedule(array $a, array $b): int
    {
        return $this->scheduleTimestamp($a) <=> $this->scheduleTimestamp($b);
    }

    private function scheduleTimestamp(array $apt): int
    {
        $tz = new \DateTimeZone('Europe/Paris');
        $raw = (string) ($apt['scheduled_at'] ?? '');
        if ($raw !== '') {
            $dt = \DateTimeImmutable::createFromFormat('Y-m-d H:i:s', $raw, $tz);
            if (!$dt) {
                try {
                    $dt = new \DateTimeImmutable($raw, $tz);
                } catch (\Throwable) {
                    return PHP_INT_MAX;
                }
            }

            return $dt->getTimestamp();
        }
        $fd = is_array($apt['form_data'] ?? null) ? $apt['form_data'] : [];
        $start = (string) ($fd['availability_start'] ?? '');
        if ($start !== '') {
            try {
                return (new \DateTimeImmutable($start, $tz))->getTimestamp();
            } catch (\Throwable) {
                return PHP_INT_MAX;
            }
        }

        return PHP_INT_MAX;
    }
}

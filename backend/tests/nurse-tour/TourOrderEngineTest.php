<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/nurse-tour/TourOrderEngine.php';
require_once __DIR__ . '/../../lib/nurse-tour/TourProximity.php';

final class TourOrderEngineTest extends TestCase
{
    public function testManualOrderIsSticky(): void
    {
        $engine = new TourOrderEngine();
        $appointments = [
            ['id' => 'a', 'scheduled_at' => '2026-06-24 08:00:00', 'form_data' => []],
            ['id' => 'b', 'scheduled_at' => '2026-06-24 09:00:00', 'form_data' => []],
            ['id' => 'c', 'scheduled_at' => '2026-06-24 10:00:00', 'form_data' => []],
        ];
        $plan = [
            'sort_mode' => 'manual',
            'manual_order_locked' => true,
            'appointment_order_json' => json_encode(['c', 'a', 'b']),
        ];

        $ids = $engine->orderIds($appointments, $plan);

        $this->assertSame(['c', 'a', 'b'], $ids);
    }

    public function testSmartDoesNotOverwriteWhenLocked(): void
    {
        $engine = new TourOrderEngine();
        $appointments = [
            ['id' => 'a', 'scheduled_at' => '2026-06-24 08:00:00', 'form_data' => []],
            ['id' => 'b', 'scheduled_at' => '2026-06-24 09:00:00', 'form_data' => []],
        ];
        $plan = [
            'sort_mode' => 'smart',
            'manual_order_locked' => true,
            'appointment_order_json' => json_encode(['b', 'a']),
        ];

        $ids = $engine->orderIds($appointments, $plan);

        $this->assertSame(['b', 'a'], $ids);
    }

    public function testSmartOrdersByScheduleChronologically(): void
    {
        $engine = new TourOrderEngine();
        $appointments = [
            ['id' => 'late', 'scheduled_at' => '2026-07-10 14:00:00', 'form_data' => []],
            ['id' => 'early', 'scheduled_at' => '2026-07-10 08:30:00', 'form_data' => []],
            ['id' => 'mid', 'scheduled_at' => '2026-07-10 11:00:00', 'form_data' => []],
        ];
        $plan = ['sort_mode' => 'smart', 'manual_order_locked' => false];

        $ids = $engine->orderIds($appointments, $plan);

        $this->assertSame(['early', 'mid', 'late'], $ids);
    }

    public function testSmartKeepsSameAddressApartWhenWindowsDoNotOverlap(): void
    {
        $engine = new TourOrderEngine();
        $home = ['label' => '27 Rue d\'Aubagne, 13001 Marseille'];
        $appointments = [
            ['id' => 'home-evening', 'scheduled_at' => '2026-10-06 17:45:00', 'form_data' => ['address' => $home, 'availability' => '{"type":"custom","range":[17,19]}']],
            ['id' => 'other-noon', 'scheduled_at' => '2026-10-06 11:00:00', 'form_data' => ['address' => ['label' => '45 Boulevard Longchamp'], 'availability' => '{"type":"custom","range":[11,13]}']],
            ['id' => 'home-morning', 'scheduled_at' => '2026-10-06 08:30:00', 'form_data' => ['address' => $home, 'availability' => '{"type":"custom","range":[8,10]}']],
        ];

        $ids = $engine->orderIds($appointments, ['sort_mode' => 'smart', 'manual_order_locked' => false]);

        $this->assertSame(['home-morning', 'other-noon', 'home-evening'], $ids);
    }

    public function testSmartGroupsSameAddressWhenWindowsOverlap(): void
    {
        $engine = new TourOrderEngine();
        $building = ['label' => '12 Rue Paradis, 13001 Marseille'];
        $appointments = [
            ['id' => 'other', 'scheduled_at' => '2026-10-06 09:30:00', 'form_data' => ['address' => ['label' => '45 Boulevard Longchamp']]],
            ['id' => 'flat-a', 'scheduled_at' => '2026-10-06 09:00:00', 'form_data' => ['address' => $building, 'availability' => '{"type":"custom","range":[9,11]}']],
            ['id' => 'flat-b', 'scheduled_at' => '2026-10-06 10:00:00', 'form_data' => ['address' => $building, 'availability' => '{"type":"custom","range":[10,12]}']],
        ];

        $ids = $engine->orderIds($appointments, ['sort_mode' => 'smart', 'manual_order_locked' => false]);

        $this->assertSame(['flat-a', 'flat-b', 'other'], $ids);
    }

    public function testSmartNeverGroupsStopsWithoutAddress(): void
    {
        $engine = new TourOrderEngine();
        $appointments = [
            ['id' => 'late', 'scheduled_at' => '2026-10-06 16:00:00', 'form_data' => ['availability' => '{"type":"all_day"}']],
            ['id' => 'mid', 'scheduled_at' => '2026-10-06 12:00:00', 'form_data' => ['address' => ['label' => '45 Boulevard Longchamp']]],
            ['id' => 'early', 'scheduled_at' => '2026-10-06 08:00:00', 'form_data' => ['availability' => '{"type":"all_day"}']],
        ];

        $ids = $engine->orderIds($appointments, ['sort_mode' => 'smart', 'manual_order_locked' => false]);

        $this->assertSame(['early', 'mid', 'late'], $ids);
    }

    public function testScheduleModeOrdersEarliestFirst(): void
    {
        $engine = new TourOrderEngine();
        $appointments = [
            ['id' => 'b', 'scheduled_at' => '2026-07-10 16:00:00', 'form_data' => []],
            ['id' => 'a', 'scheduled_at' => '2026-07-10 09:00:00', 'form_data' => []],
        ];
        $plan = ['sort_mode' => 'schedule'];

        $ids = $engine->orderIds($appointments, $plan);

        $this->assertSame(['a', 'b'], $ids);
    }

    public function testHaversineParisDistancePositive(): void
    {
        $km = TourProximity::haversineKm(48.8566, 2.3522, 48.8738, 2.2950);
        $this->assertGreaterThan(3.0, $km);
        $this->assertLessThan(8.0, $km);
    }

    public function testNearestNeighborPrefersCloserPoint(): void
    {
        $start = ['lat' => 48.8566, 'lng' => 2.3522];
        $appointments = [
            ['id' => 'far', 'location_lat' => 48.90, 'location_lng' => 2.40, 'form_data' => []],
            ['id' => 'near', 'location_lat' => 48.858, 'location_lng' => 2.354, 'form_data' => []],
        ];
        $ordered = TourProximity::nearestNeighborOrder($appointments, $start);
        $this->assertSame('near', $ordered[0]['id'] ?? null);
    }
}

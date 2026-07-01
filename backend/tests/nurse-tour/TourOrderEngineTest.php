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

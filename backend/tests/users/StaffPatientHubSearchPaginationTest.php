<?php

declare(strict_types=1);

require_once __DIR__ . '/../../lib/StaffPatientHubSearch.php';

use PHPUnit\Framework\TestCase;

/**
 * Pagination du hub soignant : pages successives sans chevauchement ni perte, `has_more` exact.
 */
final class StaffPatientHubSearchPaginationTest extends TestCase
{
    /**
     * @return array{items: list<array<string, mixed>>, has_more: bool}
     */
    private function page(array $items, int $limit, int $offset): array
    {
        $method = new ReflectionMethod(StaffPatientHubSearch::class, 'dedupeAndSort');
        $search = (new ReflectionClass(StaffPatientHubSearch::class))->newInstanceWithoutConstructor();

        return $method->invoke($search, $items, $limit, $offset);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function patients(int $count): array
    {
        $items = [];
        for ($i = 0; $i < $count; $i++) {
            // Dates identiques par paires : l'ordre doit rester total.
            $items[] = [
                'kind' => 'patient',
                'id' => sprintf('patient-%03d', $i),
                'patient_id' => sprintf('patient-%03d', $i),
                'sort_at' => sprintf('2026-01-%02d 10:00:00', 1 + intdiv($i, 2) % 28),
            ];
        }

        return $items;
    }

    public function testPagesCoverEveryPatientOnce(): void
    {
        $items = $this->patients(125);
        $seen = [];
        $offset = 0;
        do {
            $page = $this->page($items, 50, $offset);
            foreach ($page['items'] as $item) {
                $seen[] = $item['id'];
            }
            $offset += 50;
        } while ($page['has_more']);

        $this->assertCount(125, $seen);
        $this->assertCount(125, array_unique($seen));
    }

    public function testHasMoreOnlyWhenItemsRemain(): void
    {
        $items = $this->patients(100);

        $this->assertTrue($this->page($items, 50, 0)['has_more']);
        $this->assertSame(100, $this->page($items, 50, 0)['total']);
        $this->assertFalse($this->page($items, 50, 50)['has_more']);
        $this->assertSame([], $this->page($items, 50, 100)['items']);
    }

    public function testActivityDateIsExposedAndSortKeyHidden(): void
    {
        $item = $this->page($this->patients(1), 50, 0)['items'][0];

        $this->assertSame('2026-01-01 10:00:00', $item['activity_at']);
        $this->assertArrayNotHasKey('sort_at', $item);
    }
}

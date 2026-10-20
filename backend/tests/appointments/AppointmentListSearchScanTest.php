<?php

declare(strict_types=1);

require_once __DIR__ . '/../../lib/appointments/AppointmentListSearchScan.php';
require_once __DIR__ . '/../../lib/appointments/AppointmentListGetHandler.php';

use PHPUnit\Framework\TestCase;

/**
 * Recherche dans la liste des RDV chiffrés : parcours par lots, reprise au curseur, sans perte ni doublon.
 */
final class AppointmentListSearchScanTest extends TestCase
{
    /** @var list<array<string, mixed>> */
    private array $rows = [];

    protected function setUp(): void
    {
        for ($i = 0; $i < 230; $i++) {
            $this->rows[] = [
                'id' => 'apt-' . $i,
                'form_data' => ['first_name' => $i % 3 === 0 ? 'Martin' : 'Durand', 'last_name' => 'P' . $i],
            ];
        }
    }

    private function fetch(): callable
    {
        return fn (int $from, int $count): array => array_slice($this->rows, $from, $count);
    }

    public function testCollectsEveryMatchAcrossPagesWithoutDuplicates(): void
    {
        $matcher = AppointmentListGetHandler::searchMatcher('martin');
        $seen = [];
        $cursor = 0;
        do {
            $page = AppointmentListSearchScan::run($this->fetch(), $matcher, 20, $cursor);
            $this->assertLessThanOrEqual(20, count($page['items']));
            foreach ($page['items'] as $item) {
                $seen[] = $item['id'];
            }
            $cursor = $page['next_cursor'];
        } while ($page['has_more']);

        $this->assertCount(77, $seen, '1 RDV sur 3 correspond');
        $this->assertCount(77, array_unique($seen));
    }

    public function testFullPageStopsRightAfterLastMatch(): void
    {
        $page = AppointmentListSearchScan::run($this->fetch(), AppointmentListGetHandler::searchMatcher('MARTIN'), 2, 0);

        $this->assertSame(['apt-0', 'apt-3'], array_column($page['items'], 'id'));
        $this->assertSame(4, $page['next_cursor']);
        $this->assertTrue($page['has_more']);
    }

    public function testScanCapReturnsPartialPageAndResumes(): void
    {
        $page = AppointmentListSearchScan::run($this->fetch(), AppointmentListGetHandler::searchMatcher('introuvable'), 20, 0, 100);

        $this->assertSame([], $page['items']);
        $this->assertSame(100, $page['next_cursor']);
        $this->assertTrue($page['has_more'], 'Le plafond atteint laisse la suite à la page suivante');
    }

    public function testEndOfListHasNoMore(): void
    {
        $page = AppointmentListSearchScan::run($this->fetch(), AppointmentListGetHandler::searchMatcher('introuvable'), 20, 200);

        $this->assertSame([], $page['items']);
        $this->assertFalse($page['has_more']);
    }
}

<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/ai/AiSearchService.php';

final class AiSearchEmptyQueryTest extends TestCase
{
    public function testShortQuerySkipsDatabase(): void
    {
        $pdo = $this->createMock(PDO::class);
        $pdo->expects($this->never())->method('prepare');
        $svc = new AiSearchService($pdo);
        $result = $svc->search('user-1', 'a');
        $this->assertSame([], $result['conversations']);
        $this->assertSame([], $result['messages']);
    }

    public function testBlankQueryReturnsEmpty(): void
    {
        $pdo = $this->createMock(PDO::class);
        $pdo->expects($this->never())->method('prepare');
        $svc = new AiSearchService($pdo);
        $result = $svc->search('user-1', '   ');
        $this->assertSame([], $result['conversations']);
    }
}

<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/rag/EmbeddingService.php';

final class EmbeddingServiceTest extends TestCase
{
    public function testLocalEmbeddingVectorSize(): void
    {
        $service = new EmbeddingService();
        $expected = $service->getVectorSize();
        $vector = $service->embed('Test ferritine vitamine D bilan sanguin');
        $this->assertCount($expected, $vector);
        $norm = sqrt(array_sum(array_map(static fn (float $v): float => $v * $v, $vector)));
        $this->assertGreaterThan(0.0, $norm);
    }

    public function testEmptyTextReturnsZeroVector(): void
    {
        $service = new EmbeddingService();
        $size = $service->getVectorSize();
        $vector = $service->embed('');
        $this->assertCount($size, $vector);
        $this->assertSame(0.0, array_sum($vector));
    }
}

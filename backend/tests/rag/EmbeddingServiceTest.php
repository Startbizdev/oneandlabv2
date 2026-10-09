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

    /** Sans clé xAI : un seul fournisseur (local) et une dimension fixe, quel que soit EMBEDDING_VECTOR_SIZE. */
    public function testWithoutXaiKeyProviderIsLocalWithFixedDimension(): void
    {
        if ((string) getenv('XAI_API_KEY') !== '') {
            $this->markTestSkipped('XAI_API_KEY présente');
        }
        $previous = getenv('EMBEDDING_VECTOR_SIZE');
        putenv('EMBEDDING_VECTOR_SIZE=1536');
        try {
            $service = new EmbeddingService();
            $this->assertSame(EmbeddingService::PROVIDER_LOCAL, $service->getProvider());
            $this->assertSame(EmbeddingService::LOCAL_VECTOR_SIZE, $service->getVectorSize());
            $this->assertCount(EmbeddingService::LOCAL_VECTOR_SIZE, $service->embed('glycémie à jeun'));
        } finally {
            putenv($previous === false ? 'EMBEDDING_VECTOR_SIZE' : 'EMBEDDING_VECTOR_SIZE=' . $previous);
        }
    }
}

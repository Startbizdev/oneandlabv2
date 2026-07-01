<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/rag/QdrantClient.php';

final class QdrantClientTest extends TestCase
{
    public function testCollectionNameDefault(): void
    {
        $client = new QdrantClient('http://127.0.0.1:6333', null, 'cary_patient_rag');
        $this->assertSame('cary_patient_rag', $client->getCollectionName());
        $this->assertTrue($client->isConfigured());
    }
}

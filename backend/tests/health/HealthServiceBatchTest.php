<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/health/bootstrap.php';
require_once __DIR__ . '/../../lib/health/HealthService.php';

/**
 * Vérifie la déduplication external_id (INSERT IGNORE) si TEST_DATABASE_URL ou DB de test configurée.
 */
final class HealthServiceBatchTest extends TestCase
{
    private ?PDO $db = null;
    private ?string $patientId = null;

    protected function setUp(): void
    {
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN non défini');
        }
        $this->db = TestDatabase::pdo();
        $this->patientId = getenv('TEST_PATIENT_ID') ?: null;
        if ($this->patientId === null || $this->patientId === '') {
            $this->markTestSkipped('TEST_PATIENT_ID requis pour test batch');
        }
    }

    public function testBatchDedupByExternalId(): void
    {
        $service = new HealthService($this->db);
        $externalId = 'test:steps:' . uniqid('', true);
        $payload = [
            'platform' => 'ios',
            'metrics' => [
                [
                    'metric_type' => 'steps',
                    'value' => 1000,
                    'recorded_at' => gmdate('c'),
                    'external_id' => $externalId,
                ],
            ],
        ];

        $first = $service->ingestBatch((string) $this->patientId, $payload);
        $second = $service->ingestBatch((string) $this->patientId, $payload);

        $this->assertSame(1, $first['inserted']);
        $this->assertSame(0, $second['inserted']);
        $this->assertGreaterThanOrEqual(1, $second['skipped_duplicates']);
    }
}

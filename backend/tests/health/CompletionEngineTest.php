<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/health/bootstrap.php';
require_once __DIR__ . '/../../lib/health/CompletionEngine.php';
require_once __DIR__ . '/../../lib/health/HealthRecordSchema.php';

final class CompletionEngineTest extends TestCase
{
    public function testUnknownAnswerScoresHalfWeight(): void
    {
        $engine = new CompletionEngine();
        $ref = new ReflectionClass($engine);
        $method = $ref->getMethod('scoreAnswer');
        $method->setAccessible(true);

        $score = $method->invoke($engine, ['value' => 'unknown']);
        $this->assertSame(0.5, $score);
    }

    public function testYesAnswerScoresFullWeight(): void
    {
        $engine = new CompletionEngine();
        $ref = new ReflectionClass($engine);
        $method = $ref->getMethod('scoreAnswer');
        $method->setAccessible(true);

        $score = $method->invoke($engine, ['value' => 'yes']);
        $this->assertSame(1.0, $score);
    }

    public function testGapMetaLoadedFromSchema(): void
    {
        $meta = HealthRecordSchema::gapMeta('lipid_panel_unknown');
        $this->assertIsArray($meta);
        $this->assertSame('book_blood_test', $meta['action'] ?? null);
        $this->assertNotEmpty($meta['label_fr'] ?? '');
    }
}

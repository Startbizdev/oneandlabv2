<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/ai/AiGrokRealtimeToolCatalog.php';

final class AiGrokRealtimeToolCatalogTest extends TestCase
{
    public function testRealtimeToolsUseFlatFunctionSchema(): void
    {
        foreach (AiGrokRealtimeToolCatalog::allTools() as $tool) {
            $this->assertSame('function', $tool['type'] ?? null);
            $this->assertNotEmpty($tool['name'] ?? null);
            $this->assertArrayHasKey('parameters', $tool);
            $this->assertArrayNotHasKey('function', $tool);
        }
    }

    public function testNoAppointmentConfirmTool(): void
    {
        $names = AiGrokRealtimeToolCatalog::allowedToolNames();
        foreach ($names as $name) {
            $this->assertStringNotContainsString('confirm', strtolower($name));
        }
    }

    public function testIncludesContextSearchTool(): void
    {
        $this->assertContains('search_cary_context', AiGrokRealtimeToolCatalog::allowedToolNames());
    }

    public function testToolsEncodeAsValidJson(): void
    {
        $json = json_encode(['tools' => AiGrokRealtimeToolCatalog::allTools()], JSON_UNESCAPED_UNICODE);
        $this->assertIsString($json);
        $decoded = json_decode($json, true);
        $this->assertIsArray($decoded);
        $this->assertGreaterThanOrEqual(5, count($decoded['tools']));
    }
}

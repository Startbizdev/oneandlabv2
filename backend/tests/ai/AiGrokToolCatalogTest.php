<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/ai/AiGrokToolCatalog.php';

final class AiGrokToolCatalogTest extends TestCase
{
    public function testBookingToolsEncodePropertiesAsJsonObjects(): void
    {
        $tools = AiGrokToolCatalog::bookingTools();
        $json = json_encode(['tools' => $tools], JSON_UNESCAPED_UNICODE);
        $this->assertIsString($json);
        $this->assertStringNotContainsString('"properties":[]', $json);

        $decoded = json_decode($json, true);
        $this->assertIsArray($decoded);
        foreach ($decoded['tools'] as $tool) {
            $properties = $tool['function']['parameters']['properties'] ?? null;
            $this->assertIsArray($properties, (string) ($tool['function']['name'] ?? 'tool'));
        }
    }
}

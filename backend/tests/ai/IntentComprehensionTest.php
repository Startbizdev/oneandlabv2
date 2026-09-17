<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/ai/CaryContextFocus.php';
require_once __DIR__ . '/../../lib/ai/Cary360Assertions.php';

final class IntentComprehensionTest extends TestCase
{
    public function testLocalFocusMatrix(): void
    {
        foreach (Cary360Assertions::localFocusScenarios() as $scenario) {
            $got = CaryContextFocus::resolve(
                (string) $scenario['message'],
                (bool) $scenario['has_attachment'],
                $scenario['draft'],
                (bool) $scenario['has_docs'],
            );
            $this->assertSame(
                $scenario['expect'],
                $got,
                'Scénario ' . ($scenario['id'] ?? '?') . ' : « ' . $scenario['message'] . ' »',
            );
        }
    }

    public function testDocumentFollowUpTraps(): void
    {
        foreach (Cary360Assertions::documentFollowUpTraps() as $trap) {
            $got = CaryContextFocus::matchesDocumentFollowUp((string) $trap['message']);
            $this->assertSame(
                $trap['expect'],
                $got,
                'Piège ' . ($trap['id'] ?? '?'),
            );
        }
    }

    public function testActiveDraftPrioritizedOverDocumentFollowUp(): void
    {
        $this->assertSame(
            CaryContextFocus::BOOKING,
            CaryContextFocus::resolve('explique mon alat', false, ['status' => 'collecting'], true),
        );
    }

    public function testHealthRecordWithDocuments(): void
    {
        $this->assertSame(
            CaryContextFocus::HEALTH_RECORD,
            CaryContextFocus::resolve('compléter mon carnet', false, null, true),
        );
    }
}

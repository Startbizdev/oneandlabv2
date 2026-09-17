<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../fixtures/MockGrokProvider.php';
require_once __DIR__ . '/../../lib/ai/AIGateway.php';
require_once __DIR__ . '/../../lib/ai/AiTurnOrchestrator.php';
require_once __DIR__ . '/../../lib/ai/CaryContextFocus.php';
require_once __DIR__ . '/../fixtures/StubAiBookingService.php';

final class AiTurnOrchestratorTest extends TestCase
{
    protected function tearDown(): void
    {
        ProviderRetryPolicy::resetForTests();
    }

    public function testUsesToolsForBookingIntent(): void
    {
        $mock = new MockGrokProvider();
        $mock->pushResponse(['content' => 'Parfait, quel créneau vous convient ?']);
        $gateway = new AIGateway(null, $mock); // db null = tests sans MySQL
        $orchestrator = new AiTurnOrchestrator($gateway, new StubAiBookingService());

        $user = ['user_id' => 'test-user', 'role' => 'patient'];
        $context = ['active_intent' => CaryContextFocus::BOOKING];
        $result = $orchestrator->runTurn(
            $user,
            [['role' => 'user', 'content' => 'pansement demain 14h']],
            $context,
            'conv-1',
            'test-user',
            'chat_simple',
        );

        $this->assertStringContainsString('créneau', mb_strtolower($result['content']));
        $this->assertSame(1, count($mock->calls));
    }

    public function testHealthRecordDisablesToolsPath(): void
    {
        $mock = new MockGrokProvider();
        $mock->pushResponse(['content' => 'Ouvrez Plus → Mon carnet de santé pour compléter vos questionnaires.']);
        $gateway = new AIGateway(null, $mock); // db null = tests sans MySQL
        $orchestrator = new AiTurnOrchestrator($gateway, new StubAiBookingService());

        $user = ['user_id' => 'test-user', 'role' => 'patient'];
        $context = ['active_intent' => CaryContextFocus::HEALTH_RECORD];
        $result = $orchestrator->runTurn(
            $user,
            [['role' => 'user', 'content' => 'compléter mon carnet']],
            $context,
            'conv-2',
            'test-user',
            'chat_simple',
        );

        $this->assertStringContainsString('carnet', mb_strtolower($result['content']));
        $this->assertSame(0, $result['tool_calls_count']);
    }

    public function testToolLoopGracefulFallback(): void
    {
        $mock = new MockGrokProvider();
        for ($i = 0; $i < 9; $i++) {
            $mock->pushResponse([
                'content' => '',
                'tool_calls' => [[
                    'id' => 'call_' . $i,
                    'type' => 'function',
                    'function' => ['name' => 'nonexistent_tool', 'arguments' => '{}'],
                ]],
            ]);
        }
        $gateway = new AIGateway(null, $mock); // db null = tests sans MySQL
        $orchestrator = new AiTurnOrchestrator($gateway, new StubAiBookingService());

        $user = ['user_id' => 'test-user', 'role' => 'patient'];
        $context = ['active_intent' => CaryContextFocus::BOOKING, 'tools_enabled' => true];
        $result = $orchestrator->runTurn(
            $user,
            [['role' => 'user', 'content' => 'pansement']],
            $context,
            'conv-3',
            'test-user',
            'chat_simple',
        );

        $this->assertStringContainsString('finaliser', mb_strtolower($result['content']));
        $this->assertGreaterThan(0, $result['tool_calls_count']);
    }
}

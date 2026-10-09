<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/ai/AiAdminService.php';

/**
 * Console admin IA : seuls les fournisseurs réellement servis par AIGateway peuvent être routés.
 */
final class AiAdminRoutingTest extends TestCase
{
    private PDO $db;

    protected function setUp(): void
    {
        $this->db = new PDO('sqlite::memory:', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        $this->db->exec('CREATE TABLE ai_task_routing (task_type TEXT PRIMARY KEY, provider TEXT, model TEXT, priority INT, enabled INT)');
        $this->db->exec("INSERT INTO ai_task_routing VALUES ('chat_simple', 'grok', 'grok-4', 1, 1)");
    }

    protected function tearDown(): void
    {
        unset($this->db);
        parent::tearDown();
    }

    public function testRemovedProvidersAreRejected(): void
    {
        $service = new AiAdminService($this->db);
        foreach (['openai', 'deepseek', '', 'GROK'] as $provider) {
            try {
                $service->updateRouting('chat_simple', $provider, null, true);
                $this->fail('Fournisseur accepté à tort : ' . $provider);
            } catch (InvalidArgumentException $e) {
                $this->assertSame('Fournisseur IA non pris en charge', $e->getMessage());
            }
        }
        $this->assertSame('grok', $this->db->query("SELECT provider FROM ai_task_routing WHERE task_type = 'chat_simple'")->fetchColumn());
    }

    public function testGrokAndLocalAreAccepted(): void
    {
        $service = new AiAdminService($this->db);
        $service->updateRouting('chat_simple', 'local', 'local-mock', false);
        $this->assertSame('local', $this->db->query("SELECT provider FROM ai_task_routing WHERE task_type = 'chat_simple'")->fetchColumn());
        $service->updateRouting('chat_simple', 'grok', null, true);
        $this->assertSame('grok', $this->db->query("SELECT provider FROM ai_task_routing WHERE task_type = 'chat_simple'")->fetchColumn());
    }
}

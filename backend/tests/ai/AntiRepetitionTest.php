<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/ai/AiAssistantResponseGuard.php';

final class AntiRepetitionTest extends TestCase
{
    public function testBlocksEchoOfUserMessage(): void
    {
        $user = 'Je voudrais un pansement demain vers 14h à mon adresse';
        $assistant = 'Je voudrais un pansement demain vers 14h à mon adresse, c\'est noté.';
        $result = AiAssistantResponseGuard::normalize($user, $assistant, null);
        $this->assertNotSame($assistant, $result['text']);
        $this->assertTrue($result['repaired']);
        $this->assertSame('echo_repair', $result['reason']);
    }

    public function testBlocksRepeatedCareQuestionWhenCategoryKnown(): void
    {
        $draft = [
            'status' => 'collecting',
            'payload' => ['category_id' => 'nursing', 'category_name' => 'Pansement'],
            'missing_fields' => ['scheduled_at'],
        ];
        $result = AiAssistantResponseGuard::normalize(
            'demain 14h',
            'Quel type de soin souhaitez-vous ?',
            $draft,
        );
        $this->assertStringNotContainsString('Quel type de soin', $result['text']);
    }

    public function testBlocksFalseConfirmation(): void
    {
        $draft = ['status' => 'ready', 'payload' => []];
        $result = AiAssistantResponseGuard::normalize(
            'je confirme',
            'Parfait, votre rendez-vous est confirmé !',
            $draft,
        );
        $this->assertStringContainsString('Valider', $result['text']);
        $this->assertSame('false_confirmation', $result['reason']);
    }

    public function testEmptyResponseReplaced(): void
    {
        $result = AiAssistantResponseGuard::normalize('bonjour', '…', null);
        $this->assertNotSame('…', $result['text']);
        $this->assertSame('empty_response', $result['reason']);
    }
}

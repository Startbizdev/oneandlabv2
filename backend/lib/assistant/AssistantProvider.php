<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

/**
 * Fournisseur LLM interchangeable. Un appel = une complétion streamée.
 * $onDelta(string $text) reçoit le texte au fil de l'eau ; $onToolCall(string $name) est appelé dès qu'un appel
 * d'outil commence (pour afficher un statut). Retour :
 * {content, tool_calls: list<{id, name, arguments: array}>, model, input_tokens, output_tokens}.
 * Un message dont le contenu contient un image_url est traité par le modèle vision.
 */
interface AssistantProvider
{
    /**
     * @param list<array<string, mixed>> $messages
     * @param list<array<string, mixed>> $tools
     * @return array{content: string, tool_calls: list<array{id: string, name: string, arguments: array<string, mixed>}>, model: string, input_tokens: ?int, output_tokens: ?int}
     */
    public function stream(array $messages, array $tools, callable $onDelta, callable $onToolCall): array;
}

final class AssistantProviderFactory
{
    public static function create(): AssistantProvider
    {
        $provider = assistant_env('ASSISTANT_PROVIDER', 'openai_compatible');
        if ($provider === 'mock') {
            require_once __DIR__ . '/MockAssistantProvider.php';

            return new MockAssistantProvider();
        }
        require_once __DIR__ . '/OpenAiCompatibleProvider.php';
        $model = (string) assistant_env('ASSISTANT_MODEL', 'grok-4.20-0309-non-reasoning');

        return new OpenAiCompatibleProvider(
            (string) assistant_env('ASSISTANT_API_BASE', 'https://api.x.ai/v1'),
            (string) (assistant_env('ASSISTANT_API_KEY') ?? assistant_env('XAI_API_KEY', '')),
            $model,
            (string) assistant_env('ASSISTANT_VISION_MODEL', $model),
        );
    }
}

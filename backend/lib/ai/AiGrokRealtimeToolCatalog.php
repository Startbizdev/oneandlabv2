<?php

declare(strict_types=1);

require_once __DIR__ . '/AiGrokToolCatalog.php';
require_once __DIR__ . '/AiBookingAccess.php';

/**
 * Outils Cary au format xAI Realtime (function tools côté client).
 */
final class AiGrokRealtimeToolCatalog
{
    /**
     * @return list<array<string, mixed>>
     */
    public static function bookingTools(): array
    {
        $tools = [];
        foreach (AiGrokToolCatalog::bookingTools() as $tool) {
            $fn = is_array($tool['function'] ?? null) ? $tool['function'] : null;
            if ($fn === null) {
                continue;
            }
            $tools[] = self::realtimeFunction(
                (string) ($fn['name'] ?? ''),
                (string) ($fn['description'] ?? ''),
                $fn['parameters'] ?? ['type' => 'object', 'properties' => new stdClass()],
            );
        }

        return $tools;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public static function contextTools(): array
    {
        return [
            self::realtimeFunction(
                'search_cary_context',
                'Recherche dans les documents, résultats labo et historique Cary du patient pour répondre à une question.',
                [
                    'type' => 'object',
                    'properties' => [
                        'query' => [
                            'type' => 'string',
                            'description' => 'Question ou mots-clés à rechercher dans le contexte patient.',
                        ],
                    ],
                    'required' => ['query'],
                ],
            ),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public static function allTools(): array
    {
        return array_merge(self::bookingTools(), self::contextTools());
    }

    /**
     * Outils proposés à l'utilisateur : la réservation seulement pour les rôles qui y ont droit.
     *
     * @param array<string, mixed> $user
     * @return list<array<string, mixed>>
     */
    public static function toolsFor(array $user): array
    {
        return AiBookingAccess::allows($user) ? self::allTools() : self::contextTools();
    }

    /**
     * Outils autorisés côté serveur (proxy mobile).
     *
     * @return list<string>
     */
    public static function allowedToolNames(): array
    {
        return self::names(self::allTools());
    }

    /**
     * @param array<string, mixed> $user
     * @return list<string>
     */
    public static function allowedToolNamesFor(array $user): array
    {
        return self::names(self::toolsFor($user));
    }

    /**
     * @param list<array<string, mixed>> $tools
     * @return list<string>
     */
    private static function names(array $tools): array
    {
        return array_map(static fn (array $tool): string => (string) ($tool['name'] ?? ''), $tools);
    }

    /**
     * @param array<string, mixed> $parameters
     * @return array<string, mixed>
     */
    private static function realtimeFunction(string $name, string $description, array $parameters): array
    {
        return [
            'type' => 'function',
            'name' => $name,
            'description' => $description,
            'parameters' => $parameters,
        ];
    }
}

<?php

declare(strict_types=1);

require_once __DIR__ . '/AIProviderInterface.php';
require_once __DIR__ . '/CaryContextFocus.php';
require_once __DIR__ . '/bootstrap.php';

/**
 * Fournisseur IA déterministe, sans réseau : tests PHPUnit (réponses scriptées via pushResponse) et QA locale
 * (réponses réalistes par mode). Activé en QA uniquement par isAllowed() : jamais avec une clé xAI ni hors
 * de la base de test.
 */
final class LocalMockAiProvider implements AIProviderInterface
{
    public const ROUTING_PROVIDER = 'local';
    public const TEST_DATABASE = 'oneandlab_test';

    /** @var list<array{content?: string, tool_calls?: list<array<string, mixed>>}> */
    private array $script = [];

    private int $callIndex = 0;

    /** @var list<array{messages: list<array<string, mixed>>, options: array<string, mixed>}> */
    public array $calls = [];

    public static function isAllowed(PDO $db): bool
    {
        if (ai_env('XAI_API_KEY') !== null) {
            return false;
        }
        $database = $db->query('SELECT DATABASE()');

        return $database !== false && $database->fetchColumn() === self::TEST_DATABASE;
    }

    /**
     * @param array{content?: string, tool_calls?: list<array<string, mixed>>} $response
     */
    public function pushResponse(array $response): self
    {
        $this->script[] = $response;

        return $this;
    }

    public function reset(): self
    {
        $this->script = [];
        $this->callIndex = 0;
        $this->calls = [];

        return $this;
    }

    public function getName(): string
    {
        return 'local_mock';
    }

    public function chat(array $messages, array $options = []): array
    {
        $this->calls[] = ['messages' => $messages, 'options' => $options];
        $item = $this->script[$this->callIndex] ?? $this->deterministicReply($messages, $options);
        $this->callIndex++;

        return [
            'content' => (string) ($item['content'] ?? ''),
            'tool_calls' => is_array($item['tool_calls'] ?? null) ? $item['tool_calls'] : [],
            'model' => 'local-mock',
            'tokens_input' => 12,
            'tokens_output' => 18,
        ];
    }

    public function chatStream(array $messages, callable $onDelta, array $options = []): array
    {
        $result = $this->chat($messages, $options);
        $content = (string) $result['content'];
        foreach (preg_split('/(?<=\s)/u', $content, -1, PREG_SPLIT_NO_EMPTY) ?: [] as $piece) {
            $onDelta($piece);
        }

        return [
            'content' => $content,
            'model' => 'local-mock',
            'tokens_input' => 12,
            'tokens_output' => 18,
        ];
    }

    /**
     * @param list<array<string, mixed>> $messages
     * @param array<string, mixed> $options
     * @return array{content: string, tool_calls?: list<array<string, mixed>>}
     */
    private function deterministicReply(array $messages, array $options): array
    {
        $system = (string) (($messages[0]['role'] ?? '') === 'system' ? ($messages[0]['content'] ?? '') : '');
        $last = $messages[count($messages) - 1] ?? [];
        $role = preg_match('/"role":\s*"(patient|pro|nurse|preleveur)"/', $system, $m) ? $m[1] : 'patient';

        if (($last['role'] ?? '') === 'tool') {
            return ['content' => $this->afterToolReply((string) ($last['content'] ?? ''), $role)];
        }

        $userText = mb_strtolower(trim((string) ($last['content'] ?? '')));
        if (!empty($options['tools']) && CaryContextFocus::matchesBookingRequest($userText)) {
            return [
                'content' => '',
                'tool_calls' => [[
                    'id' => 'local_' . substr(hash('sha256', $userText), 0, 12),
                    'type' => 'function',
                    'function' => [
                        'name' => 'update_booking_draft',
                        'arguments' => json_encode(['patch' => $this->bookingPatch($userText, $role)], JSON_UNESCAPED_UNICODE),
                    ],
                ]],
            ];
        }

        if (str_contains($system, '"chat_attachments"')) {
            return ['content' => $this->documentReply($system)];
        }

        if ($role === 'preleveur' && CaryContextFocus::matchesBookingRequest($userText)) {
            return ['content' => "Je ne peux pas créer ce rendez-vous depuis Cary.\n\n"
                . "Pour une nouvelle prise de sang, utilisez le bouton « Demander un prélèvement » sur l'accueil : "
                . "il recueille le consentement du patient et l'envoie au laboratoire."];
        }

        return ['content' => $this->generalReply($system, $role)];
    }

    /** @return array<string, mixed> */
    private function bookingPatch(string $userText, string $role): array
    {
        $isBloodTest = (bool) preg_match('/prise de sang|pr[ée]l[èe]vement|bilan|analyse/u', $userText);
        $patch = [
            'type' => $isBloodTest ? 'blood_test' : 'nursing',
            'booking_step' => 'services',
        ];
        if ($role === 'patient') {
            $patch['patient_mode'] = 'self';
        }

        return $patch;
    }

    private function afterToolReply(string $toolContent, string $role): string
    {
        $result = json_decode($toolContent, true);
        if (!is_array($result) || empty($result['ok'])) {
            return "Je n'ai pas pu enregistrer cette information.\n\nPouvez-vous la préciser ?";
        }
        $missing = is_array($result['missing_fields'] ?? null) ? $result['missing_fields'] : [];
        $questions = [
            'patient_id' => 'Pour quel patient souhaitez-vous ce rendez-vous ?',
            'type' => 'Souhaitez-vous une prise de sang ou un soin infirmier ?',
            'category_id' => 'Quel soin précis souhaitez-vous ?',
            'address' => 'À quelle adresse doit avoir lieu le passage ?',
            'scheduled_at' => 'Quel jour vous arrangerait ?',
            'availability' => 'Plutôt le matin, l\'après-midi ou toute la journée ?',
        ];
        foreach ($missing as $field) {
            if (isset($questions[$field])) {
                return "C'est noté, je prépare la demande.\n\n" . $questions[$field];
            }
        }

        return $role === 'patient'
            ? "Tout est prêt.\n\nVérifiez le récapitulatif puis validez la demande de rendez-vous."
            : "Tout est prêt pour votre patient.\n\nVérifiez le récapitulatif puis validez la demande.";
    }

    private function documentReply(string $system): string
    {
        $ref = preg_match('/"citation_ref":\s*"([^"]+)"/', $system, $m) ? ' [ref:' . $m[1] . ']' : '';

        return "Voici ce que j'ai repéré dans votre document.\n\n"
            . "Points principaux :\n\n"
            . "- Le document a bien été lu et rattaché à la conversation{$ref}\n"
            . "- Les valeurs hors normes sont à revoir avec votre médecin\n"
            . "- Aucune interprétation médicale n'est faite ici\n\n"
            . 'Voulez-vous que je détaille un paramètre ?';
    }

    private function generalReply(string $system, string $role): string
    {
        $ref = preg_match('/"citation_ref":\s*"([^"]+)"/', $system, $m) ? ' [ref:' . $m[1] . ']' : '';
        $intro = "Je suis Cary, votre assistant (mode démonstration locale).\n\nVoici ce que je peux faire pour vous :\n\n";

        return match ($role) {
            'nurse', 'pro' => $intro
                . "- Planifier un soin ou une prise de sang pour un patient\n"
                . "- Retrouver vos prochains passages{$ref}\n"
                . "- Expliquer un document partagé par un patient\n\n"
                . 'Par quoi commençons-nous ?',
            'preleveur' => $intro
                . "- Retrouver vos prochaines tournées{$ref}\n"
                . "- Répondre à une question sur un prélèvement\n"
                . "- Vous orienter vers « Demander un prélèvement » pour une nouvelle demande\n\n"
                . 'Que souhaitez-vous faire ?',
            default => $intro
                . "- Préparer une demande de rendez-vous (prise de sang, soins infirmiers)\n"
                . "- Retrouver vos prochains rendez-vous{$ref}\n"
                . "- Vous aider à comprendre un document ou un résultat\n\n"
                . 'Que souhaitez-vous faire ?',
        };
    }
}

<?php

declare(strict_types=1);

require_once __DIR__ . '/AIGateway.php';
require_once __DIR__ . '/MemoryComposer.php';
require_once __DIR__ . '/AiBookingService.php';
require_once __DIR__ . '/CaryContextFocus.php';
require_once __DIR__ . '/AiBookingDraftSummary.php';
require_once __DIR__ . '/CaryBookingPromptRules.php';

/**
 * Instructions système Cary pour sessions Realtime.
 */
final class VoiceRealtimePromptBuilder
{
    private MemoryComposer $memory;
    private AiBookingService $booking;
    private AIGateway $gateway;

    public function __construct(?MemoryComposer $memory = null, ?AiBookingService $booking = null, ?AIGateway $gateway = null)
    {
        $this->memory = $memory ?? new MemoryComposer();
        $this->booking = $booking ?? new AiBookingService();
        $this->gateway = $gateway ?? new AIGateway();
    }

    /**
     * @return array{instructions: string, context: array<string, mixed>, draft: ?array<string, mixed>}
     */
    public function build(array $user, string $conversationId, string $locale = 'fr', ?string $userMessage = null): array
    {
        $convPatientId = $this->resolveConversationPatientId($conversationId, (string) $user['user_id']);
        $draftPreview = $this->booking->getLatestDraftForConversation($conversationId, (string) $user['user_id']);
        $contextFocus = CaryContextFocus::resolve(
            (string) ($userMessage ?? ''),
            false,
            $draftPreview,
            $this->conversationHasDocuments($conversationId),
        );

        $context = $this->memory->compose($user, $convPatientId, 'voice', true, $userMessage, $conversationId);
        $context['disclaimer'] = $this->gateway->getDisclaimerPublic();
        $context['locale'] = $locale;
        $context['active_intent'] = $contextFocus;
        $context['active_intent_label_fr'] = CaryContextFocus::labelFr($contextFocus);
        $context['conversation_mode'] = 'voice_chat';
        $context['tools_enabled'] = true;
        if ($draftPreview !== null) {
            $context['active_booking_draft'] = AiBookingDraftSummary::forPrompt($draftPreview);
        }

        return [
            'instructions' => $this->renderInstructions($context, $locale),
            'context' => $context,
            'draft' => $draftPreview,
        ];
    }

    /**
     * Payload session.update après mutation brouillon ou nouveau transcript.
     *
     * @return array{session_update: array{instructions: string, active_intent: string, draft: ?array<string, mixed>}}
     */
    public function buildSessionUpdate(array $user, string $conversationId, string $locale, string $userMessage): array
    {
        $pack = $this->build($user, $conversationId, $locale, $userMessage);

        return [
            'session_update' => [
                'instructions' => $pack['instructions'],
                'active_intent' => (string) ($pack['context']['active_intent'] ?? CaryContextFocus::GENERAL),
                'draft' => $pack['draft'],
            ],
        ];
    }

    /**
     * @param array<string, mixed> $context
     */
    private function renderInstructions(array $context, string $locale): string
    {
        $role = (string) ($context['role'] ?? 'patient');
        $voiceRules = CaryBookingPromptRules::voiceModeBlock();
        $workflow = CaryBookingPromptRules::workflowBlock($role);
        $roleIntro = CaryBookingPromptRules::isStaffRole($role)
            ? 'Tu aides des professionnels de santé à organiser les soins de leurs patients.'
            : 'Tu accompagnes des patients dans leur parcours de santé au quotidien.';

        $contextJson = json_encode($context, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        if ($contextJson === false) {
            $contextJson = '{}';
        }

        return <<<PROMPT
Tu es Cary, assistant santé informatif en conversation vocale temps réel.
{$roleIntro}
{$voiceRules}
{$workflow}

Règles vocales strictes :
- Réponses courtes (1-2 phrases), naturelles, en {$locale}.
- Une question à la fois.
- Jamais de diagnostic ni prescription.
- Jamais confirmer un RDV automatiquement : l'utilisateur doit appuyer sur Valider sur la carte récap.
- Quand tu collectes une info RDV, appelle l'outil update_booking_draft en silence.
- Ne mentionne jamais les noms d'outils ni d'étapes techniques.
- active_booking_draft dans le contexte = état actuel — ne redemande jamais un champ déjà rempli.

Contexte Cary :
{$contextJson}
PROMPT;
    }

    private function resolveConversationPatientId(string $conversationId, string $userId): ?string
    {
        $stmt = ai_db()->prepare('SELECT patient_id FROM ai_conversations WHERE id = ? AND user_id = ? LIMIT 1');
        $stmt->execute([$conversationId, $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return null;
        }
        $pid = $row['patient_id'] ?? null;

        return $pid !== null && $pid !== '' ? (string) $pid : null;
    }

    private function conversationHasDocuments(string $conversationId): bool
    {
        $stmt = ai_db()->prepare('
            SELECT 1 FROM ai_conversation_attachments WHERE conversation_id = ? LIMIT 1
        ');
        $stmt->execute([$conversationId]);

        return (bool) $stmt->fetch(PDO::FETCH_ASSOC);
    }
}

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
    public function build(array $user, string $conversationId, string $locale = 'fr'): array
    {
        $convPatientId = $this->resolveConversationPatientId($conversationId, (string) $user['user_id']);
        $draftPreview = $this->booking->getLatestDraftForConversation($conversationId, (string) $user['user_id']);
        $contextFocus = CaryContextFocus::resolve('', false, $draftPreview, false);

        $context = $this->memory->compose($user, $convPatientId, 'voice', true, null, $conversationId);
        $context['disclaimer'] = $this->gateway->getDisclaimerPublic();
        $context['locale'] = $locale;
        $context['active_intent'] = $contextFocus;
        $context['conversation_mode'] = 'voice_chat';
        $context['tools_enabled'] = true;
        if ($draftPreview !== null) {
            $context['active_booking_draft'] = AiBookingDraftSummary::forPrompt($draftPreview);
        }

        $role = (string) ($user['role'] ?? 'patient');
        $voiceRules = CaryBookingPromptRules::voiceModeBlock();
        $workflow = CaryBookingPromptRules::workflowBlock($role);
        $roleIntro = CaryBookingPromptRules::isStaffRole($role)
            ? 'Tu aides des professionnels de santé à organiser les soins de leurs patients.'
            : 'Tu accompagnes des patients dans leur parcours de santé au quotidien.';

        $contextJson = json_encode($context, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        if ($contextJson === false) {
            $contextJson = '{}';
        }

        $instructions = <<<PROMPT
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

Contexte Cary :
{$contextJson}
PROMPT;

        return [
            'instructions' => $instructions,
            'context' => $context,
            'draft' => $draftPreview,
        ];
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
}

<?php

declare(strict_types=1);

require_once __DIR__ . '/ContextComposer.php';
require_once __DIR__ . '/AiMemoryService.php';
require_once __DIR__ . '/CaryAppNavigation.php';
require_once __DIR__ . '/../rag/RagSearchService.php';

/**
 * Assemble contexte SQL (Phase 1) + mémoire 3 niveaux + chunks RAG (Phase 3).
 */
final class MemoryComposer
{
    private ContextComposer $context;
    private AiMemoryService $memory;
    private RagSearchService $rag;

    public function __construct()
    {
        $this->context = new ContextComposer();
        $this->memory = new AiMemoryService();
        $this->rag = new RagSearchService();
    }

    /**
     * @return array<string, mixed>
     */
    public function compose(
        array $user,
        ?string $patientId = null,
        ?string $conversationType = null,
        bool $light = false,
        ?string $userMessage = null,
        ?string $conversationId = null,
    ): array {
        $ctx = $this->context->compose($user, $patientId, $conversationType, $light);
        $role = (string) ($user['role'] ?? '');
        $nav = CaryAppNavigation::forRole($role);
        if ($nav !== []) {
            $ctx['app_navigation'] = $nav;
        }
        $userId = (string) ($user['user_id'] ?? '');
        $targetPatientId = $patientId;
        if (($user['role'] ?? '') === 'patient') {
            $targetPatientId = $userId;
        }

        $ctx['user_memory'] = $this->memory->getUserMemory($userId);
        if ($conversationId !== null && $conversationId !== '') {
            $summary = $this->memory->getConversationSummary($conversationId);
            if ($summary !== null && $summary !== '') {
                $ctx['conversation_memory'] = ['summary' => $summary];
            }
        }

        if ($targetPatientId !== null && $targetPatientId !== '') {
            $medical = [];
            foreach (['documents_index', 'lab_results_index', 'appointments_recent', 'health_metrics_summary'] as $type) {
                $snap = $this->memory->getMedicalSnapshot($targetPatientId, $type);
                if ($snap !== null) {
                    $medical[$type] = $snap;
                }
            }
            if ($medical !== []) {
                $ctx['medical_memory'] = $medical;
            }
            if (!class_exists('TrendEngine')) {
                require_once __DIR__ . '/TrendEngine.php';
            }
            $trends = (new TrendEngine())->listForPatient($targetPatientId, 6);
            if ($trends !== []) {
                $ctx['health_trends'] = $trends;
            }
            if (!class_exists('HealthRecordService')) {
                require_once __DIR__ . '/../health/HealthRecordService.php';
            }
            try {
                $hrSummary = (new HealthRecordService())->buildSummaryForAi($targetPatientId);
                if ($hrSummary !== []) {
                    $ctx['health_record_summary'] = $hrSummary;
                }
            } catch (Throwable) {
                /* carnet optional */
            }
            $query = trim((string) ($userMessage ?? ''));
            if ($query !== '') {
                $chunks = $this->rag->searchForUser($user, $targetPatientId, $query, $light ? 4 : 8);
                if ($chunks !== []) {
                    $ctx['rag_chunks'] = $chunks;
                    $ctx['citation_refs'] = array_values(array_filter(array_column($chunks, 'citation_ref')));
                }
            }
        }

        return $ctx;
    }
}

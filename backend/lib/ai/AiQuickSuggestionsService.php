<?php

declare(strict_types=1);

require_once __DIR__ . '/ContextComposer.php';
require_once __DIR__ . '/bootstrap.php';

final class AiQuickSuggestionsService
{
    private ContextComposer $composer;

    public function __construct(?ContextComposer $composer = null)
    {
        $this->composer = $composer ?? new ContextComposer();
    }

    /**
     * @return list<array{id: string, label: string}>
     */
    public function suggestionsForUser(array $user, ?string $patientId = null): array
    {
        $role = (string) ($user['role'] ?? '');
        $items = [];

        try {
            $ctx = $this->composer->compose($user, $patientId);
        } catch (Throwable $e) {
            return $this->fallbackSuggestions($role);
        }

        $upcoming = $ctx['appointments']['upcoming'] ?? [];
        $labResults = $ctx['lab_results'] ?? [];

        if ($upcoming !== []) {
            $next = $upcoming[0];
            $when = $next['scheduled_at'] ?? '';
            $items[] = [
                'id' => 'next_appointment',
                'label' => $when ? 'Mon prochain RDV' : 'Mes rendez-vous à venir',
            ];
        }

        if ($role === 'patient') {
            $items[] = ['id' => 'book', 'label' => 'Prendre un rendez-vous'];
        } elseif ($upcoming === []) {
            $items[] = ['id' => 'book', 'label' => 'Prendre un rendez-vous'];
        }

        if ($labResults !== []) {
            $items[] = ['id' => 'lab_results', 'label' => 'Explique mes derniers résultats'];
        }

        $documents = $ctx['documents'] ?? $ctx['profile_documents'] ?? [];
        if (is_array($documents) && $documents !== []) {
            $items[] = ['id' => 'analyze_docs', 'label' => 'Analyse mes documents'];
        }

        $health = $ctx['health_metrics'] ?? null;
        if (is_array($health) && !empty($health['has_data'])) {
            $items[] = ['id' => 'health_trends', 'label' => 'Montre mes tendances santé'];
        }

        if ($role === 'patient') {
            try {
                require_once __DIR__ . '/../health/HealthRecordService.php';
                $pid = (string) ($user['user_id'] ?? '');
                $hr = (new HealthRecordService())->buildSummaryForAi($pid);
                $pct = (int) ($hr['completion_percent'] ?? 100);
                if ($pct < 100) {
                    $items[] = ['id' => 'complete_health_record', 'label' => 'Compléter mon carnet'];
                }
                foreach ($hr['gaps'] ?? [] as $gap) {
                    if (is_array($gap) && ($gap['gap_key'] ?? '') === 'lipid_panel_unknown') {
                        $items[] = ['id' => 'book_blood_test', 'label' => 'Réserver un bilan'];
                        break;
                    }
                }
            } catch (Throwable) {
                /* optional */
            }
        }

        if ($role === 'patient') {
            $items[] = ['id' => 'prepare_rdv', 'label' => 'Préparer mon prochain RDV'];
        } elseif (in_array($role, ['pro', 'nurse'], true)) {
            $items[] = ['id' => 'patient_rdv', 'label' => 'Planifier un RDV patient'];
        }

        $items[] = ['id' => 'general', 'label' => 'Question sur mon suivi'];

        $seen = [];
        $out = [];
        foreach ($items as $item) {
            if (isset($seen[$item['id']])) {
                continue;
            }
            $seen[$item['id']] = true;
            $out[] = $item;
            if (count($out) >= 6) {
                break;
            }
        }

        return $out;
    }

    /**
     * @return list<array{id: string, label: string}>
     */
    private function fallbackSuggestions(string $role): array
    {
        if (in_array($role, ['pro', 'nurse'], true)) {
            return [
                ['id' => 'patient_rdv', 'label' => 'Planifier un RDV patient'],
                ['id' => 'general', 'label' => 'Question sur un dossier'],
            ];
        }

        return [
            ['id' => 'book', 'label' => 'Prendre un rendez-vous'],
            ['id' => 'lab_results', 'label' => 'Mes résultats de labo'],
            ['id' => 'general', 'label' => 'Question sur mon suivi'],
        ];
    }
}

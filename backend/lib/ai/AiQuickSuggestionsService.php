<?php

declare(strict_types=1);

require_once __DIR__ . '/ContextComposer.php';
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/AiBookingAccess.php';

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
        try {
            $ctx = $this->composer->compose($user, $patientId);
        } catch (Throwable $e) {
            return $this->fallbackSuggestions((string) ($user['role'] ?? ''));
        }

        return $this->suggestionsFromContext($user, $ctx);
    }

    /**
     * Suggestions à partir d'un contexte déjà composé (`ContextComposer::compose`).
     *
     * @return list<array{id: string, label: string}>
     */
    public function suggestionsFromContext(array $user, array $ctx): array
    {
        $role = (string) ($user['role'] ?? '');
        $isPatient = $role === 'patient';
        $items = [];

        $upcoming = $ctx['appointments']['upcoming'] ?? [];
        $labResults = $ctx['lab_results'] ?? [];

        if ($upcoming !== []) {
            $next = $upcoming[0];
            $when = $next['scheduled_at'] ?? '';
            $items[] = [
                'id' => 'next_appointment',
                'label' => $when ? 'Mon prochain rendez-vous' : 'Mes rendez-vous à venir',
            ];
        }

        if ($role === 'patient') {
            $items[] = ['id' => 'book', 'label' => 'Prendre un rendez-vous'];
        }

        if ($labResults !== []) {
            $items[] = $isPatient
                ? ['id' => 'lab_results', 'label' => 'Expliquer mes résultats']
                : ['id' => 'patient_lab_results', 'label' => 'Résultats récents des patients'];
        }

        $documents = $ctx['documents'] ?? $ctx['profile_documents'] ?? [];
        if (is_array($documents) && $documents !== []) {
            $items[] = $isPatient
                ? ['id' => 'analyze_docs', 'label' => 'Analyser mes documents']
                : ['id' => 'patient_docs', 'label' => 'Analyser les documents du patient'];
        }

        $health = $ctx['health_metrics'] ?? null;
        if (is_array($health) && !empty($health['has_data'])) {
            $items[] = ['id' => 'health_trends', 'label' => 'Voir mes tendances santé'];
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
                        $items[] = ['id' => 'book_blood_test', 'label' => 'Réserver un bilan lipidique'];
                        break;
                    }
                }
            } catch (Throwable) {
                /* optional */
            }
        }

        if ($role === 'patient') {
            $items[] = ['id' => 'prepare_rdv', 'label' => 'Préparer mon rendez-vous'];
        } elseif (AiBookingAccess::allows($user)) {
            $items[] = ['id' => 'patient_rdv', 'label' => 'Planifier un rendez-vous patient'];
        }

        $items[] = $role === 'patient'
            ? ['id' => 'general', 'label' => 'Question sur mon suivi']
            : ['id' => 'case_question', 'label' => 'Question sur un dossier'];

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
        if ($role !== 'patient') {
            $items = AiBookingAccess::allows(['role' => $role])
                ? [['id' => 'patient_rdv', 'label' => 'Planifier un rendez-vous patient']]
                : [];
            $items[] = ['id' => 'case_question', 'label' => 'Question sur un dossier'];

            return $items;
        }

        return [
            ['id' => 'book', 'label' => 'Prendre un rendez-vous'],
            ['id' => 'lab_results', 'label' => 'Expliquer mes résultats'],
            ['id' => 'general', 'label' => 'Question sur mon suivi'],
        ];
    }
}

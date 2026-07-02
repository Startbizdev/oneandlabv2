<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/HealthRecordSchema.php';
require_once __DIR__ . '/HealthPatientProfile.php';
require_once __DIR__ . '/CompletionEngine.php';
require_once __DIR__ . '/CareGapEngine.php';
require_once __DIR__ . '/HealthService.php';
require_once __DIR__ . '/../PatientDossierAccess.php';
require_once __DIR__ . '/../../models/User.php';

final class HealthRecordService
{
    private const EMPTY_DISPLAY = 'Non renseigné';

    private PDO $db;
    private CompletionEngine $completion;
    private CareGapEngine $gaps;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? health_db();
        $this->completion = new CompletionEngine($this->db);
        $this->gaps = new CareGapEngine($this->db);
    }

    /**
     * @return array<string, mixed>
     */
    public function getSchemaForPatient(string $patientId): array
    {
        HealthRecordSchema::ensureDbSeed($this->db);
        $gender = $this->patientGender($patientId);
        $def = HealthRecordSchema::definition();

        return [
            'version' => $def['version'] ?? '1',
            'disclaimer_fr' => $def['disclaimer_fr'] ?? '',
            'sections' => HealthRecordSchema::sections($gender),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function getCompletion(string $patientId): array
    {
        $result = $this->completion->compute($patientId);
        try {
            $this->completion->persist($patientId, $result);
        } catch (Throwable $e) {
            error_log('[health-record] persist completion: ' . $e->getMessage());
        }

        $openGaps = [];
        try {
            $this->gaps->detectAndSync($patientId);
            $openGaps = $this->gaps->listOpen($patientId);
        } catch (Throwable $e) {
            error_log('[health-record] care gaps: ' . $e->getMessage());
        }

        $missingCount = count($result['missing_questions'] ?? []);

        return [
            'percent' => $result['percent'],
            'missing_sections' => $result['missing_sections'],
            'missing_questions' => $result['missing_questions'],
            'missing_count' => $missingCount,
            'open_gaps' => $openGaps,
            'computed_at' => (new DateTimeImmutable())->format('c'),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function getRecap(string $patientId, bool $staffView = false): array
    {
        $completion = $this->getCompletion($patientId);
        $gender = $this->patientGender($patientId);
        $answers = $this->loadAnswersMap($patientId);
        $sections = [];
        foreach (HealthRecordSchema::sections($gender) as $section) {
            $sectionId = (string) ($section['id'] ?? '');
            $items = [];
            foreach ($section['questions'] ?? [] as $q) {
                if (!is_array($q)) {
                    continue;
                }
                $key = (string) ($q['key'] ?? '');
                $items[] = [
                    'key' => $key,
                    'label_fr' => $q['label_fr'] ?? $key,
                    'type' => $q['type'] ?? 'text',
                    'optional' => (bool) ($q['optional'] ?? true),
                    'placeholder' => $q['placeholder'] ?? null,
                    'options' => $q['options'] ?? null,
                    'value' => $answers[$key]['value'] ?? null,
                    'display' => $this->formatDisplay($answers[$key]['value'] ?? null),
                ];
            }
            $sections[] = [
                'id' => $sectionId,
                'label_fr' => $section['label_fr'] ?? $sectionId,
                'items' => $items,
            ];
        }

        $health = new HealthService($this->db);
        $metricsSummary = ['has_data' => false];
        try {
            $metricsSummary = $health->metricsSummary($patientId);
        } catch (Throwable $e) {
            error_log('[health-record] metrics summary: ' . $e->getMessage());
        }

        $trends = [];
        try {
            if (class_exists('TrendEngine')) {
                require_once __DIR__ . '/../ai/TrendEngine.php';
                $trends = (new TrendEngine($this->db))->listForPatient($patientId, 6);
            }
        } catch (Throwable $e) {
            error_log('[health-record] trends: ' . $e->getMessage());
        }

        return [
            'completion' => $completion,
            'sections' => $sections,
            'health_summary' => $metricsSummary,
            'trends' => $trends,
            'open_gaps' => $completion['open_gaps'] ?? [],
            'disclaimer_fr' => HealthRecordSchema::definition()['disclaimer_fr'] ?? '',
            'staff_view' => $staffView,
        ];
    }

    /**
     * @param array<string, array{value: mixed}> $answers
     * @return array<string, mixed>
     */
    public function upsertAnswers(string $patientId, array $answers, string $source = 'patient'): array
    {
        $stmt = $this->db->prepare('
            INSERT INTO health_record_answers (id, patient_id, question_key, value_json, source)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE value_json = VALUES(value_json), source = VALUES(source), updated_at = NOW()
        ');
        foreach ($answers as $key => $payload) {
            if (!is_string($key) || $key === '') {
                continue;
            }
            $value = is_array($payload) ? ($payload['value'] ?? $payload) : $payload;
            $stmt->execute([
                health_uuid(),
                $patientId,
                $key,
                json_encode(['value' => $value], JSON_UNESCAPED_UNICODE),
                $source,
            ]);
        }

        return $this->getRecap($patientId);
    }

    /**
     * @return array<string, mixed>
     */
    public function exportForPatient(string $patientId): array
    {
        return [
            'exported_at' => (new DateTimeImmutable())->format('c'),
            'patient_id' => $patientId,
            'recap' => $this->getRecap($patientId),
        ];
    }

    /**
     * @param array<string, mixed> $viewer
     * @return array<string, mixed>
     */
    public function getRecapForStaff(array $viewer, string $patientId): array
    {
        $userModel = new User();
        if (!PatientDossierAccess::canAccess($this->db, $userModel, $viewer, $patientId)) {
            throw new RuntimeException('Accès carnet refusé');
        }
        $this->logAccess($viewer, $patientId);

        return $this->getRecap($patientId, true);
    }

    /**
     * @return array<string, mixed>
     */
    public function buildSummaryForAi(string $patientId): array
    {
        $gender = $this->patientGender($patientId);
        $recap = $this->getRecap($patientId);
        $computed = $this->completion->compute($patientId);
        $blocks = HealthRecordSchema::definition()['blocks'] ?? [];

        $allergies = [];
        $conditions = [];
        foreach ($recap['sections'] ?? [] as $section) {
            foreach ($section['items'] ?? [] as $item) {
                $key = (string) ($item['key'] ?? '');
                $val = $item['value'] ?? null;
                if ($val === null || $val === '' || $val === 'unknown') {
                    continue;
                }
                if (str_contains($key, 'allerg')) {
                    $allergies[] = is_string($val) ? $val : json_encode($val);
                }
                if (in_array($key, ['hypertension', 'diabetes', 'heart_event_history', 'thyroid_disorder'], true) && $val === 'yes') {
                    $conditions[] = $item['label_fr'] ?? $key;
                }
            }
        }

        $missingQuestionsDetailed = [];
        foreach ($computed['missing_questions'] ?? [] as $qKey) {
            $meta = HealthRecordSchema::questionByKey((string) $qKey, $gender);
            if ($meta === null) {
                continue;
            }
            $missingQuestionsDetailed[] = [
                'key' => $qKey,
                'label_fr' => $meta['label_fr'] ?? $qKey,
                'section_id' => $meta['section_id'] ?? '',
                'section_label_fr' => $meta['section_label_fr'] ?? '',
                'block' => $meta['block'] ?? 'clinical',
            ];
        }

        $missingSectionsDetailed = [];
        foreach ($computed['missing_sections'] ?? [] as $sectionId) {
            $sec = HealthRecordSchema::sectionById((string) $sectionId, $gender);
            $missingSectionsDetailed[] = [
                'id' => $sectionId,
                'label_fr' => $sec['label_fr'] ?? $sectionId,
            ];
        }

        $healthSync = $this->healthSyncStatusForAi($patientId);
        $priorityActions = $this->buildPriorityActions($missingQuestionsDetailed, $healthSync, $recap['open_gaps'] ?? [], $blocks);

        $blockLabels = [];
        foreach ($blocks as $blockId => $blockMeta) {
            if (is_array($blockMeta)) {
                $blockLabels[$blockId] = $blockMeta['label_fr'] ?? $blockId;
            }
        }

        return [
            'completion_percent' => $recap['completion']['percent'] ?? 0,
            'block_scores' => $computed['blocks'] ?? [],
            'block_labels_fr' => $blockLabels,
            'missing_questions' => $missingQuestionsDetailed,
            'missing_sections' => $missingSectionsDetailed,
            'missing_count' => count($missingQuestionsDetailed),
            'priority_actions' => $priorityActions,
            'health_sync' => $healthSync,
            'allergies' => $allergies,
            'conditions' => $conditions,
            'gaps' => $recap['open_gaps'] ?? [],
        ];
    }

    /**
     * @param list<array<string, mixed>> $missingQuestions
     * @param array<string, mixed> $healthSync
     * @param list<array<string, mixed>> $gaps
     * @param array<string, mixed> $blocks
     * @return list<array<string, mixed>>
     */
    private function buildPriorityActions(
        array $missingQuestions,
        array $healthSync,
        array $gaps,
        array $blocks,
    ): array {
        $actions = [];

        if (empty($healthSync['connected'])) {
            $platform = (string) ($healthSync['platform'] ?? 'ios');
            $actions[] = [
                'type' => 'health_sync',
                'label_fr' => $platform === 'android' ? 'Connecter Health Connect' : 'Connecter Apple Santé',
                'reason_fr' => 'Aucune source santé liée — cela représente une part importante de votre complétion',
                'app_screen' => 'Mes données santé',
            ];
        }

        $topQuestions = array_slice($missingQuestions, 0, 3);
        foreach ($topQuestions as $q) {
            $actions[] = [
                'type' => 'health_record_question',
                'label_fr' => (string) ($q['label_fr'] ?? ''),
                'section_label_fr' => (string) ($q['section_label_fr'] ?? ''),
                'section_id' => (string) ($q['section_id'] ?? ''),
                'app_screen' => 'Mon carnet de santé',
            ];
        }

        foreach ($gaps as $gap) {
            if (!is_array($gap)) {
                continue;
            }
            $actions[] = [
                'type' => 'care_gap',
                'label_fr' => (string) ($gap['label_fr'] ?? ''),
                'gap_key' => (string) ($gap['gap_key'] ?? ''),
            ];
            if (count($actions) >= 5) {
                break;
            }
        }

        return array_slice($actions, 0, 5);
    }

    /**
     * @return array<string, mixed>
     */
    private function healthSyncStatusForAi(string $patientId): array
    {
        $stmt = $this->db->prepare('
            SELECT platform, display_name, updated_at
            FROM health_sources
            WHERE patient_id = ? AND revoked_at IS NULL
            ORDER BY updated_at DESC
            LIMIT 1
        ');
        $stmt->execute([$patientId]);
        $source = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;

        $lastSyncAt = null;
        $hasMetrics = false;
        try {
            $summary = (new HealthService($this->db))->metricsSummary($patientId);
            $lastSyncAt = $summary['last_sync_at'] ?? null;
            $hasMetrics = !empty($summary['has_data']);
        } catch (Throwable) {
            /* optional */
        }

        $platform = (string) ($source['platform'] ?? 'ios');

        return [
            'connected' => $source !== null,
            'platform' => $platform,
            'display_name' => (string) ($source['display_name'] ?? ($platform === 'android' ? 'Health Connect' : 'Apple Santé')),
            'last_sync_at' => $lastSyncAt,
            'has_metrics' => $hasMetrics,
        ];
    }

    /**
     * @param array<string, mixed> $viewer
     */
    public function logAccess(array $viewer, string $patientId): void
    {
        $this->db->prepare('
            INSERT INTO health_record_access_log (id, patient_id, viewer_id, viewer_role, ip_address, accessed_at)
            VALUES (?, ?, ?, ?, ?, NOW())
        ')->execute([
            health_uuid(),
            $patientId,
            (string) ($viewer['user_id'] ?? ''),
            (string) ($viewer['role'] ?? ''),
            $_SERVER['REMOTE_ADDR'] ?? null,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function loadAnswersMap(string $patientId): array
    {
        $stmt = $this->db->prepare('SELECT question_key, value_json FROM health_record_answers WHERE patient_id = ?');
        $stmt->execute([$patientId]);
        $map = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $decoded = json_decode((string) ($row['value_json'] ?? '{}'), true);
            $map[(string) $row['question_key']] = is_array($decoded) ? $decoded : [];
        }

        return $map;
    }

    private function patientGender(string $patientId): ?string
    {
        return HealthPatientProfile::gender($this->db, $patientId);
    }

    private function formatDisplay(mixed $value): string
    {
        if ($value === null || $value === '') {
            return self::EMPTY_DISPLAY;
        }
        if (is_string($value) && strtolower(trim($value)) === 'null') {
            return self::EMPTY_DISPLAY;
        }
        return match ($value) {
            'yes' => 'Oui',
            'no' => 'Non',
            'unknown', 'je_ne_sais_pas' => 'Je ne sais pas',
            'never' => 'Jamais',
            'former' => 'Ancien fumeur',
            'occasional' => 'Occasionnel',
            'regular' => 'Régulier',
            'sedentary' => 'Sédentaire',
            'moderate' => 'Modérée',
            'active' => 'Active',
            default => is_scalar($value) ? (string) $value : json_encode($value, JSON_UNESCAPED_UNICODE),
        };
    }
}

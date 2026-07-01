<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/HealthRecordSchema.php';
require_once __DIR__ . '/HealthPatientProfile.php';

final class CompletionEngine
{
    private PDO $db;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? health_db();
    }

    /**
     * @return array{percent: int, missing_sections: list<string>, missing_questions: list<string>, blocks: array<string, float>}
     */
    public function compute(string $patientId): array
    {
        HealthRecordSchema::ensureDbSeed($this->db);
        $profile = $this->loadProfile($patientId);
        $gender = (string) ($profile['gender'] ?? '');
        $answers = $this->loadAnswersMap($patientId);
        $blocks = HealthRecordSchema::definition()['blocks'] ?? [];
        $blockScores = [];
        $missingSections = [];
        $missingQuestions = [];

        foreach ($blocks as $blockId => $blockMeta) {
            if (!is_array($blockMeta)) {
                continue;
            }
            $blockScores[$blockId] = match ($blockId) {
                'profile' => $this->scoreProfile($profile),
                'health_sync' => $this->scoreHealthSync($patientId),
                'documents' => $this->scoreDocuments($patientId),
                default => $this->scoreQuestionBlock($blockId, $gender, $answers, $missingSections, $missingQuestions),
            };
        }

        $percent = 0;
        foreach ($blocks as $blockId => $blockMeta) {
            if (!is_array($blockMeta)) {
                continue;
            }
            $weight = (float) ($blockMeta['weight'] ?? 0);
            $percent += ($blockScores[$blockId] ?? 0) * $weight / 100.0;
        }
        $percent = (int) min(100, max(0, round($percent)));

        $missingSections = array_values(array_unique($missingSections));

        return [
            'percent' => $percent,
            'missing_sections' => $missingSections,
            'missing_questions' => $missingQuestions,
            'blocks' => $blockScores,
        ];
    }

    public function persist(string $patientId, array $result): void
    {
        $this->db->prepare('
            INSERT INTO health_record_completion (patient_id, percent, missing_sections_json, computed_at)
            VALUES (?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE percent = VALUES(percent),
                missing_sections_json = VALUES(missing_sections_json),
                computed_at = NOW()
        ')->execute([
            $patientId,
            (int) ($result['percent'] ?? 0),
            json_encode($result['missing_sections'] ?? [], JSON_UNESCAPED_UNICODE),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function loadProfile(string $patientId): array
    {
        return HealthPatientProfile::load($this->db, $patientId);
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

    /**
     * @param array<string, mixed> $profile
     */
    private function scoreProfile(array $profile): float
    {
        $fields = ['birth_date', 'gender', 'phone'];
        $filled = 0;
        foreach ($fields as $f) {
            $v = $profile[$f] ?? null;
            if ($v !== null && trim((string) $v) !== '') {
                $filled++;
            }
        }

        return ($filled / count($fields)) * 100.0;
    }

    private function scoreHealthSync(string $patientId): float
    {
        $stmt = $this->db->prepare('
            SELECT COUNT(*) FROM health_sources
            WHERE patient_id = ? AND revoked_at IS NULL
        ');
        $stmt->execute([$patientId]);

        return ((int) $stmt->fetchColumn()) > 0 ? 100.0 : 0.0;
    }

    private function scoreDocuments(string $patientId): float
    {
        $stmt = $this->db->prepare('
            SELECT COUNT(*) FROM patient_documents
            WHERE patient_id = ? AND document_type IN (\'carte_vitale\', \'ordonnance\')
        ');
        $stmt->execute([$patientId]);
        if ((int) $stmt->fetchColumn() > 0) {
            return 100.0;
        }
        $stmt2 = $this->db->prepare('
            SELECT COUNT(*) FROM medical_documents
            WHERE patient_id = ? AND document_type IN (\'carte_vitale\', \'ordonnance\')
        ');
        $stmt2->execute([$patientId]);

        return ((int) $stmt2->fetchColumn()) > 0 ? 100.0 : 0.0;
    }

    /**
     * @param array<string, mixed> $answers
     * @param list<string> $missingSections
     * @param list<string> $missingQuestions
     */
    private function scoreQuestionBlock(
        string $blockId,
        string $gender,
        array $answers,
        array &$missingSections,
        array &$missingQuestions,
    ): float {
        $questions = array_filter(
            HealthRecordSchema::allQuestions($gender),
            static fn (array $q) => ($q['block'] ?? '') === $blockId,
        );
        if ($questions === []) {
            return 100.0;
        }
        $totalWeight = 0.0;
        $earned = 0.0;
        $sectionIncomplete = [];
        foreach ($questions as $q) {
            $key = (string) $q['key'];
            $sectionId = (string) ($q['section_id'] ?? '');
            $w = 1.0;
            $totalWeight += $w;
            $score = $this->scoreAnswer($answers[$key] ?? null);
            $earned += $score * $w;
            if ($score < 1.0) {
                $missingQuestions[] = $key;
                $sectionIncomplete[$sectionId] = true;
            }
        }
        foreach (array_keys($sectionIncomplete) as $sid) {
            $missingSections[] = $sid;
        }
        if ($totalWeight <= 0) {
            return 100.0;
        }

        return ($earned / $totalWeight) * 100.0;
    }

    /**
     * @param array<string, mixed>|null $value
     */
    private function scoreAnswer(?array $value): float
    {
        if ($value === null || !array_key_exists('value', $value)) {
            return 0.0;
        }
        $v = $value['value'];
        if ($v === null || $v === '') {
            return 0.0;
        }
        if ($v === 'unknown' || $v === 'je_ne_sais_pas') {
            return 0.5;
        }

        return 1.0;
    }
}

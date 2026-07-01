<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/../Uuid.php';
require_once __DIR__ . '/../PatientDossierAccess.php';
require_once __DIR__ . '/../../models/User.php';

/**
 * Tendances descriptives — jamais diagnostic.
 */
final class TrendEngine
{
    private PDO $db;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? ai_db();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function computeForPatient(string $patientId): array
    {
        $trends = [];
        $trends = array_merge($trends, $this->computeWeightTrend($patientId));
        $trends = array_merge($trends, $this->computeStepsTrend($patientId));
        $trends = array_merge($trends, $this->computeHeartRateTrend($patientId));
        $trends = array_merge($trends, $this->computeLabOverdueTrend($patientId));

        foreach ($trends as $t) {
            $this->upsertTrend($patientId, $t);
        }

        return $this->listForPatient($patientId);
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listForPatient(string $patientId, int $limit = 12): array
    {
        $stmt = $this->db->prepare('
            SELECT id, metric_type, trend_key, observation_fr, observation_en, window_days, data_points_count, computed_at
            FROM ai_trends WHERE patient_id = ?
            ORDER BY computed_at DESC LIMIT ?
        ');
        $stmt->bindValue(1, $patientId);
        $stmt->bindValue(2, $limit, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    /**
     * @param array<string, mixed> $user
     * @return list<array<string, mixed>>
     */
    public function listForUser(array $user): array
    {
        if (($user['role'] ?? '') !== 'patient') {
            return [];
        }

        return $this->listForPatient((string) $user['user_id']);
    }

    /**
     * @param array{metric_type: ?string, trend_key: string, observation_fr: string, window_days: int, data_points_count: int} $t
     */
    private function upsertTrend(string $patientId, array $t): void
    {
        $this->db->prepare('
            INSERT INTO ai_trends (id, patient_id, metric_type, trend_key, observation_fr, window_days, data_points_count, computed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE observation_fr = VALUES(observation_fr), data_points_count = VALUES(data_points_count), computed_at = NOW()
        ')->execute([
            Uuid::v4(),
            $patientId,
            $t['metric_type'],
            $t['trend_key'],
            $t['observation_fr'],
            $t['window_days'],
            $t['data_points_count'],
        ]);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function computeWeightTrend(string $patientId): array
    {
        $stmt = $this->db->prepare('
            SELECT value, recorded_at FROM health_metrics
            WHERE patient_id = ? AND metric_type = \'weight\' AND recorded_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            ORDER BY recorded_at ASC
        ');
        $stmt->execute([$patientId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        if (count($rows) < 3) {
            return [];
        }
        $first = (float) $rows[0]['value'];
        $last = (float) $rows[array_key_last($rows)]['value'];
        $delta = $last - $first;
        if (abs($delta) < 0.3) {
            $obs = 'Votre poids est relativement stable sur les 30 derniers jours.';
        } elseif ($delta < 0) {
            $obs = sprintf('Poids en légère baisse sur 30 jours (environ %.1f kg).', abs($delta));
        } else {
            $obs = sprintf('Poids en légère hausse sur 30 jours (environ %.1f kg).', $delta);
        }

        return [[
            'metric_type' => 'weight',
            'trend_key' => 'weight_30d',
            'observation_fr' => $obs,
            'window_days' => 30,
            'data_points_count' => count($rows),
        ]];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function computeStepsTrend(string $patientId): array
    {
        $stmt = $this->db->prepare('
            SELECT DATE(recorded_at) AS d, AVG(value) AS avg_steps
            FROM health_metrics
            WHERE patient_id = ? AND metric_type = \'steps\' AND recorded_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
            GROUP BY DATE(recorded_at) HAVING avg_steps > 0
        ');
        $stmt->execute([$patientId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        if (count($rows) < 5) {
            return [];
        }
        $vals = array_map(static fn ($r) => (float) $r['avg_steps'], $rows);
        $recent = array_slice($vals, -3);
        $older = array_slice($vals, 0, max(1, count($vals) - 3));
        $recentAvg = array_sum($recent) / count($recent);
        $olderAvg = array_sum($older) / count($older);
        if ($olderAvg < 1) {
            return [];
        }
        $ratio = $recentAvg / $olderAvg;
        if ($ratio < 0.85) {
            $obs = 'Activité (pas) inférieure à votre moyenne récente sur 2 semaines.';
        } elseif ($ratio > 1.15) {
            $obs = 'Activité (pas) supérieure à votre moyenne récente sur 2 semaines.';
        } else {
            $obs = 'Votre activité (pas) est stable sur les 2 dernières semaines.';
        }

        return [[
            'metric_type' => 'steps',
            'trend_key' => 'steps_14d',
            'observation_fr' => $obs,
            'window_days' => 14,
            'data_points_count' => count($rows),
        ]];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function computeHeartRateTrend(string $patientId): array
    {
        $stmt = $this->db->prepare('
            SELECT AVG(value) AS avg_hr FROM health_metrics
            WHERE patient_id = ? AND metric_type = \'heart_rate\' AND recorded_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        ');
        $stmt->execute([$patientId]);
        $avg = $stmt->fetchColumn();
        if ($avg === false || $avg === null) {
            return [];
        }
        $avgF = (float) $avg;

        return [[
            'metric_type' => 'heart_rate',
            'trend_key' => 'hr_7d_avg',
            'observation_fr' => sprintf('Fréquence cardiaque moyenne ~%d bpm sur 7 jours (données synchronisées).', (int) round($avgF)),
            'window_days' => 7,
            'data_points_count' => 1,
        ]];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function computeLabOverdueTrend(string $patientId): array
    {
        $stmt = $this->db->prepare('
            SELECT MAX(created_at) AS last_at FROM medical_documents
            WHERE patient_id = ? AND document_type = \'resultats\'
        ');
        $stmt->execute([$patientId]);
        $last = $stmt->fetchColumn();
        if ($last === false || $last === null) {
            return [[
                'metric_type' => null,
                'trend_key' => 'lab_overdue',
                'observation_fr' => 'Aucun bilan de laboratoire récent dans votre dossier Cary.',
                'window_days' => 365,
                'data_points_count' => 0,
            ]];
        }
        if (strtotime((string) $last) < strtotime('-12 months')) {
            return [[
                'metric_type' => null,
                'trend_key' => 'lab_overdue',
                'observation_fr' => 'Pas de bilan uploadé depuis plus de 12 mois.',
                'window_days' => 365,
                'data_points_count' => 1,
            ]];
        }

        return [];
    }
}

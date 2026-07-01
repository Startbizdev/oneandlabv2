<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

final class AiAdminService
{
    private PDO $db;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? ai_db();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listRouting(): array
    {
        $stmt = $this->db->query('
            SELECT task_type, provider, model, priority, enabled, updated_at
            FROM ai_task_routing ORDER BY task_type ASC
        ');

        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function updateRouting(string $taskType, string $provider, ?string $model, bool $enabled): void
    {
        $stmt = $this->db->prepare('
            UPDATE ai_task_routing SET provider = ?, model = ?, enabled = ?, updated_at = NOW()
            WHERE task_type = ?
        ');
        $stmt->execute([$provider, $model, $enabled ? 1 : 0, $taskType]);
    }

    /**
     * @return array<string, mixed>
     */
    public function usageStats(int $days = 30): array
    {
        $stmt = $this->db->prepare('
            SELECT provider, task_type,
                   COUNT(*) AS calls,
                   SUM(COALESCE(tokens_input, 0)) AS tokens_in,
                   SUM(COALESCE(tokens_output, 0)) AS tokens_out,
                   AVG(latency_ms) AS avg_latency_ms,
                   SUM(CASE WHEN error_message IS NOT NULL THEN 1 ELSE 0 END) AS errors
            FROM ai_audits
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY provider, task_type
            ORDER BY calls DESC
        ');
        $stmt->execute([$days]);
        $byTask = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $totals = $this->db->prepare('
            SELECT COUNT(*) AS total_calls,
                   SUM(COALESCE(tokens_input, 0) + COALESCE(tokens_output, 0)) AS total_tokens,
                   SUM(CASE WHEN error_message IS NOT NULL THEN 1 ELSE 0 END) AS total_errors
            FROM ai_audits WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        ');
        $totals->execute([$days]);
        $totalRow = $totals->fetch(PDO::FETCH_ASSOC) ?: [];

        return ['days' => $days, 'by_task' => $byTask, 'totals' => $totalRow, 'latency' => $this->latencyPercentiles($days), 'feedback' => $this->feedbackStats($days), 'costs' => $this->estimateCosts($days)];
    }

    /**
     * @return array<string, mixed>
     */
    private function latencyPercentiles(int $days): array
    {
        $stmt = $this->db->prepare('
            SELECT latency_ms FROM ai_audits
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) AND latency_ms IS NOT NULL AND error_message IS NULL
            ORDER BY latency_ms ASC
        ');
        $stmt->execute([$days]);
        $vals = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN) ?: []);
        $n = count($vals);
        if ($n === 0) {
            return ['p50' => null, 'p95' => null, 'count' => 0];
        }
        $p50 = $vals[(int) floor($n * 0.5)] ?? $vals[0];
        $p95 = $vals[(int) floor($n * 0.95)] ?? $vals[$n - 1];

        return ['p50' => $p50, 'p95' => $p95, 'count' => $n];
    }

    /**
     * @return array<string, mixed>
     */
    private function feedbackStats(int $days): array
    {
        require_once __DIR__ . '/AiFeedbackService.php';

        return (new AiFeedbackService($this->db))->stats($days);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function estimateCosts(int $days): array
    {
        $stmt = $this->db->prepare('
            SELECT provider,
                   SUM(COALESCE(tokens_input, 0)) AS tokens_in,
                   SUM(COALESCE(tokens_output, 0)) AS tokens_out
            FROM ai_audits WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY provider
        ');
        $stmt->execute([$days]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $rates = ['grok' => ['in' => 5.0, 'out' => 15.0], 'openai' => ['in' => 2.5, 'out' => 10.0]];
        foreach ($rows as &$row) {
            $p = (string) ($row['provider'] ?? 'grok');
            $r = $rates[$p] ?? $rates['grok'];
            $tin = (int) ($row['tokens_in'] ?? 0);
            $tout = (int) ($row['tokens_out'] ?? 0);
            $row['estimated_usd'] = round(($tin * $r['in'] + $tout * $r['out']) / 1_000_000, 4);
        }

        return $rows;
    }

    /**
     * @return array{disclaimer_fr: ?string, temperature: ?float}
     */
    public function getSettings(): array
    {
        $stmt = $this->db->query("SELECT setting_key, setting_value FROM platform_settings WHERE setting_key IN ('ai_disclaimer_fr', 'ai_temperature')");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $out = ['disclaimer_fr' => null, 'temperature' => null];
        foreach ($rows as $row) {
            if ($row['setting_key'] === 'ai_disclaimer_fr') {
                $out['disclaimer_fr'] = (string) $row['setting_value'];
            }
            if ($row['setting_key'] === 'ai_temperature') {
                $out['temperature'] = (float) $row['setting_value'];
            }
        }

        return $out;
    }

    public function updateSettings(?string $disclaimerFr, ?float $temperature): void
    {
        if ($disclaimerFr !== null) {
            $this->upsertSetting('ai_disclaimer_fr', $disclaimerFr);
        }
        if ($temperature !== null) {
            $this->upsertSetting('ai_temperature', (string) $temperature);
        }
    }

    private function upsertSetting(string $key, string $value): void
    {
        $this->db->prepare('
            INSERT INTO platform_settings (setting_key, setting_value) VALUES (?, ?)
            ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()
        ')->execute([$key, $value]);
    }

    public function exportAuditsCsv(int $days = 30): string
    {
        $stmt = $this->db->prepare('
            SELECT id, user_id, patient_id, conversation_id, task_type, provider, model,
                   latency_ms, tokens_input, tokens_output, error_message, created_at
            FROM ai_audits WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            ORDER BY created_at DESC LIMIT 5000
        ');
        $stmt->execute([$days]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $fp = fopen('php://temp', 'r+');
        if ($fp === false) {
            throw new RuntimeException('Impossible de créer le flux CSV');
        }
        fputcsv($fp, ['id', 'user_id', 'patient_id', 'conversation_id', 'task_type', 'provider', 'model', 'latency_ms', 'tokens_input', 'tokens_output', 'error_message', 'created_at'], ';');
        foreach ($rows as $row) {
            fputcsv($fp, [
                $row['id'], $row['user_id'], $row['patient_id'], $row['conversation_id'],
                $row['task_type'], $row['provider'], $row['model'], $row['latency_ms'],
                $row['tokens_input'], $row['tokens_output'], $row['error_message'], $row['created_at'],
            ], ';');
        }
        rewind($fp);
        $csv = stream_get_contents($fp);
        fclose($fp);

        return is_string($csv) ? $csv : '';
    }
}

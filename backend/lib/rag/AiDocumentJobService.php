<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/DocumentOcrService.php';
require_once __DIR__ . '/DocumentVisionService.php';
require_once __DIR__ . '/LabResultAnalysisPrompt.php';
require_once __DIR__ . '/../ai/AiDocumentIntent.php';
require_once __DIR__ . '/RagIndexer.php';
require_once __DIR__ . '/../ai/AIGateway.php';
require_once __DIR__ . '/../Uuid.php';
require_once __DIR__ . '/../NotificationService.php';

final class AiDocumentJobService
{
    private PDO $db;
    private DocumentOcrService $ocr;
    private RagIndexer $indexer;
    private AIGateway $gateway;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? rag_db();
        $this->ocr = new DocumentOcrService();
        $this->indexer = new RagIndexer($this->db);
        $this->gateway = new AIGateway($this->db);
    }

    public function queueDocument(string $patientId, string $medicalDocumentId, string $summaryType = 'document_ocr'): string
    {
        $existing = $this->db->prepare('
            SELECT id FROM ai_summaries
            WHERE medical_document_id = ? AND summary_type = ? AND status IN (\'pending\', \'processing\', \'completed\')
            LIMIT 1
        ');
        $existing->execute([$medicalDocumentId, $summaryType]);
        $row = $existing->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            return (string) $row['id'];
        }
        $id = Uuid::v4();
        $stmt = $this->db->prepare('
            INSERT INTO ai_summaries (id, patient_id, medical_document_id, summary_type, status, created_at)
            VALUES (?, ?, ?, ?, \'pending\', NOW())
        ');
        $stmt->execute([$id, $patientId, $medicalDocumentId, $summaryType]);

        return $id;
    }

    /**
     * Résumé pour le chat — réutilise un résumé terminé ou tente une analyse rapide.
     *
     * @return array{summary_text: string, ocr_text: string, title: string, analysis_ready: bool}
     */
    public function getSummaryForChat(string $patientId, string $medicalDocumentId): array
    {
        $stmt = $this->db->prepare('
            SELECT id, status, summary_text, ocr_text, title
            FROM ai_summaries
            WHERE medical_document_id = ? AND summary_type = ?
            ORDER BY updated_at DESC
            LIMIT 1
        ');
        $stmt->execute([$medicalDocumentId, 'document_analysis']);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($row && ($row['status'] ?? '') === 'completed') {
            return [
                'summary_text' => (string) ($row['summary_text'] ?? ''),
                'ocr_text' => (string) ($row['ocr_text'] ?? ''),
                'title' => (string) ($row['title'] ?? 'Document'),
                'analysis_ready' => trim((string) ($row['summary_text'] ?? '')) !== ''
                    || trim((string) ($row['ocr_text'] ?? '')) !== '',
            ];
        }

        try {
            $summaryId = $this->queueDocument($patientId, $medicalDocumentId, 'document_analysis');
            $processed = $this->processOne($summaryId);

            return [
                'summary_text' => (string) ($processed['summary_text'] ?? ''),
                'ocr_text' => (string) ($processed['ocr_text'] ?? ''),
                'title' => (string) ($row['title'] ?? 'Document'),
                'analysis_ready' => trim((string) ($processed['summary_text'] ?? '')) !== '',
            ];
        } catch (Throwable $e) {
            error_log('AiDocumentJobService getSummaryForChat: ' . $e->getMessage());

            return [
                'summary_text' => '',
                'ocr_text' => '',
                'title' => 'Document',
                'analysis_ready' => false,
            ];
        }
    }

    /**
     * Attend l'OCR / résumé pour un document (traitement synchrone si encore pending).
     *
     * @return array{summary_text: string, ocr_text: string, title: string}
     */
    public function ensureAnalyzed(string $patientId, string $medicalDocumentId, string $summaryType = 'document_analysis'): array
    {
        $summaryId = $this->queueDocument($patientId, $medicalDocumentId, $summaryType);
        $stmt = $this->db->prepare('
            SELECT id, status, summary_text, ocr_text, title
            FROM ai_summaries
            WHERE id = ?
            LIMIT 1
        ');
        $stmt->execute([$summaryId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return ['summary_text' => '', 'ocr_text' => '', 'title' => 'Document'];
        }
        if (($row['status'] ?? '') === 'completed' && !$this->isUselessSummary($row)) {
            return [
                'summary_text' => (string) ($row['summary_text'] ?? ''),
                'ocr_text' => (string) ($row['ocr_text'] ?? ''),
                'title' => (string) ($row['title'] ?? 'Document'),
            ];
        }
        if (($row['status'] ?? '') === 'completed' && $this->isUselessSummary($row)) {
            $this->db->prepare('UPDATE ai_summaries SET status = \'pending\', updated_at = NOW() WHERE id = ?')
                ->execute([$summaryId]);
        }

        $processed = $this->processOne($summaryId);

        return [
            'summary_text' => (string) ($processed['summary_text'] ?? ''),
            'ocr_text' => (string) ($processed['ocr_text'] ?? ''),
            'title' => (string) ($row['title'] ?? 'Document'),
        ];
    }

    public function processPending(int $limit = 5): int
    {
        $stmt = $this->db->prepare('
            SELECT s.id, s.patient_id, s.medical_document_id, s.summary_type
            FROM ai_summaries s
            WHERE s.status = \'pending\'
            ORDER BY s.created_at ASC
            LIMIT ?
        ');
        $stmt->bindValue(1, $limit, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $processed = 0;
        foreach ($rows as $row) {
            try {
                $this->processOne((string) $row['id']);
                $processed++;
            } catch (Throwable $e) {
                $this->markFailed((string) $row['id'], $e->getMessage());
            }
        }

        return $processed;
    }

    public function processOne(string $summaryId): array
    {
        $stmt = $this->db->prepare('SELECT * FROM ai_summaries WHERE id = ? LIMIT 1');
        $stmt->execute([$summaryId]);
        $summary = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$summary) {
            throw new RuntimeException('Résumé introuvable');
        }
        $this->db->prepare('UPDATE ai_summaries SET status = \'processing\', updated_at = NOW() WHERE id = ?')
            ->execute([$summaryId]);

        $docId = (string) ($summary['medical_document_id'] ?? '');
        $patientId = (string) ($summary['patient_id'] ?? '');
        $docStmt = $this->db->prepare('SELECT * FROM medical_documents WHERE id = ? LIMIT 1');
        $docStmt->execute([$docId]);
        $doc = $docStmt->fetch(PDO::FETCH_ASSOC);
        if (!$doc) {
            throw new RuntimeException('Document introuvable');
        }

        $ocrText = $this->ocr->extractText($doc);
        $title = (string) ($doc['file_name'] ?? 'Document');
        $intent = AiDocumentIntent::classify($doc, $ocrText);
        $mime = strtolower((string) ($doc['mime_type'] ?? ''));
        $ext = strtolower(pathinfo($title, PATHINFO_EXTENSION));
        $isImage = str_starts_with($mime, 'image/') || in_array($ext, ['jpg', 'jpeg', 'png', 'webp'], true);
        $isPdf = str_contains($mime, 'pdf') || $ext === 'pdf';

        $visionUsed = false;
        if ($this->ocrNeedsVision($ocrText) && in_array($intent['category'], ['medical', 'unclear'], true)) {
            $vision = new DocumentVisionService($this->ocr);
            $visionText = $isPdf
                ? $vision->analyzeMedicalPdf($doc, (string) $intent['label_fr'])
                : ($isImage ? $vision->analyzeMedicalImage($doc, (string) $intent['label_fr']) : '');
            if ($visionText !== '') {
                $ocrText = $visionText;
                $visionUsed = true;
                $intent = AiDocumentIntent::classify($doc, $ocrText);
            }
        }

        if ($intent['category'] === 'non_medical') {
            $analysis = [
                'summary_text' => 'Document non médical (« ' . $title . ' ») — facture, administratif ou hors sujet santé.',
                'structured' => ['intent_category' => 'non_medical'],
                'flags' => [],
                'audit_id' => null,
            ];
        } elseif ($visionUsed && LabResultAnalysisPrompt::isLabDocument($doc, (string) $intent['kind'], $ocrText)) {
            $analysis = $this->analyzeText($patientId, $title, $ocrText, (string) $intent['label_fr'], $doc);
        } elseif ($visionUsed) {
            $analysis = [
                'summary_text' => mb_substr(trim($ocrText), 0, 6000),
                'structured' => ['title' => $title, 'source' => 'vision'],
                'flags' => $this->detectInformativeFlags($ocrText),
                'audit_id' => null,
            ];
        } else {
            $analysis = $this->analyzeText($patientId, $title, $ocrText, (string) $intent['label_fr'], $doc);
        }
        $flags = $analysis['flags'] ?? [];

        $upd = $this->db->prepare('
            UPDATE ai_summaries
            SET status = \'completed\', title = ?, ocr_text = ?, summary_text = ?,
                structured_json = ?, flags_json = ?, source_ai_audit_id = ?, updated_at = NOW()
            WHERE id = ?
        ');
        $upd->execute([
            $title,
            $ocrText !== '' ? $ocrText : null,
            $analysis['summary_text'],
            json_encode($analysis['structured'] ?? [], JSON_UNESCAPED_UNICODE),
            json_encode($flags, JSON_UNESCAPED_UNICODE),
            $analysis['audit_id'] ?? null,
            $summaryId,
        ]);

        if ($ocrText !== '' || ($analysis['summary_text'] ?? '') !== '') {
            try {
                $this->indexer->indexDocumentSummary(
                    $patientId,
                    $summaryId,
                    $title,
                    ($analysis['summary_text'] ?? '') !== '' ? (string) $analysis['summary_text'] : $ocrText,
                    $docId,
                );
                $this->indexer->indexPatient($patientId);
            } catch (Throwable $e) {
                error_log('AiDocumentJobService RAG index: ' . $e->getMessage());
            }
        }

        $this->notifySummaryReady($patientId, $docId, $title);

        return [
            'id' => $summaryId,
            'summary_text' => $analysis['summary_text'],
            'ocr_text' => $ocrText,
            'flags' => $flags,
        ];
    }

    /**
     * @param array<string, mixed> $doc
     * @return array{summary_text: string, structured: array<string, mixed>, flags: list<array<string, mixed>>, audit_id: ?string}
     */
    private function analyzeText(
        string $patientId,
        string $title,
        string $ocrText,
        string $intentLabel = 'Document médical',
        array $doc = [],
    ): array {
        if (trim($ocrText) === '') {
            return [
                'summary_text' => '',
                'structured' => [],
                'flags' => [],
                'audit_id' => null,
            ];
        }
        $systemUser = ['user_id' => $patientId, 'role' => 'patient'];
        $excerpt = mb_substr($ocrText, 0, 14000);
        $isLab = LabResultAnalysisPrompt::isLabDocument($doc, '', $ocrText);
        $userMessage = $isLab
            ? LabResultAnalysisPrompt::buildUserMessage($title, $intentLabel, $excerpt)
            : "Analyse ce {$intentLabel} « {$title} » et produis un résumé patient en français (vulgarisation, pas de diagnostic). Texte OCR:\n\n{$excerpt}";

        $result = $this->gateway->chat(
            $systemUser,
            [['role' => 'user', 'content' => $userMessage]],
            'document_analysis',
            ['patient_id' => $patientId],
            null,
            $patientId,
        );
        $content = trim((string) ($result['content'] ?? ''));
        $flags = $this->detectInformativeFlags($ocrText . "\n" . $content);

        return [
            'summary_text' => $content !== '' ? $content : mb_substr($ocrText, 0, 1500),
            'structured' => [
                'title' => $title,
                'analysis_version' => LabResultAnalysisPrompt::ANALYSIS_VERSION,
                'lab_strict' => $isLab,
            ],
            'flags' => $flags,
            'audit_id' => $result['audit_id'] ?? null,
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function detectInformativeFlags(string $text): array
    {
        $flags = [];
        if (preg_match('/\b(élevé|eleve|hors norme|anormal|critique)\b/ui', $text)) {
            $flags[] = ['type' => 'value_out_of_range_hint', 'severity' => 'informational'];
        }

        return $flags;
    }

    private function ocrNeedsVision(string $ocrText): bool
    {
        $trimmed = trim($ocrText);

        return $trimmed === ''
            || str_contains($trimmed, 'analyse visuelle requise')
            || mb_strlen($trimmed) < 80;
    }

    /**
     * @param array<string, mixed> $row
     */
    private function isUselessSummary(array $row): bool
    {
        $summary = trim((string) ($row['summary_text'] ?? ''));
        $ocr = trim((string) ($row['ocr_text'] ?? ''));

        if ($summary === '' && $ocr === '') {
            return true;
        }
        if (str_starts_with($summary, 'Aucun texte extractible')) {
            return true;
        }
        if ($this->ocrNeedsVision($ocr) && $this->ocrNeedsVision($summary)) {
            return true;
        }
        $structuredRaw = $row['structured_json'] ?? null;
        if (is_string($structuredRaw) && $structuredRaw !== '') {
            $structured = json_decode($structuredRaw, true);
            if (is_array($structured) && (int) ($structured['analysis_version'] ?? 0) < LabResultAnalysisPrompt::ANALYSIS_VERSION) {
                return true;
            }
        }

        return false;
    }

    private function markFailed(string $summaryId, string $message): void
    {
        $this->db->prepare('
            UPDATE ai_summaries SET status = \'failed\', error_message = ?, updated_at = NOW() WHERE id = ?
        ')->execute([mb_substr($message, 0, 500), $summaryId]);
    }

    private function notifySummaryReady(string $patientId, string $docId, string $title): void
    {
        try {
            $notif = new NotificationService();
            $notif->createNotification(
                $patientId,
                'lab_results_ai_summary_ready',
                'Analyse Cary prête',
                'Le résumé de « ' . $title . ' » est disponible dans votre assistant.',
                ['medical_document_id' => $docId],
            );
        } catch (Throwable) {
            // non bloquant
        }
    }

    public function getSummaryForDocument(string $medicalDocumentId, string $userId): ?array
    {
        $stmt = $this->db->prepare('
            SELECT s.* FROM ai_summaries s
            INNER JOIN medical_documents md ON md.id = s.medical_document_id
            WHERE s.medical_document_id = ? AND s.status = \'completed\'
              AND (md.patient_id = ? OR md.uploaded_by = ?)
            ORDER BY s.updated_at DESC
            LIMIT 1
        ');
        $stmt->execute([$medicalDocumentId, $userId, $userId]);

        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }
}

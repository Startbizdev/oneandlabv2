<?php

declare(strict_types=1);

require_once __DIR__ . '/QdrantClient.php';
require_once __DIR__ . '/EmbeddingService.php';
require_once __DIR__ . '/../Uuid.php';
require_once __DIR__ . '/../PatientDossierAccess.php';
require_once __DIR__ . '/../../models/User.php';

final class RagIndexer
{
    private const CHUNK_SIZE = 900;

    private PDO $db;
    private QdrantClient $qdrant;
    private EmbeddingService $embeddings;
    private User $userModel;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? rag_db();
        $this->qdrant = new QdrantClient();
        $this->embeddings = new EmbeddingService();
        $this->userModel = new User();
    }

    public function indexPatient(string $patientId, ?array $actingUser = null): int
    {
        if ($actingUser !== null && !PatientDossierAccess::canAccess($this->db, $this->userModel, $actingUser, $patientId)) {
            throw new RuntimeException('Accès patient refusé');
        }
        if (!$this->qdrant->isConfigured()) {
            return 0;
        }
        $this->qdrant->ensureCollection($this->embeddings->getVectorSize());

        $documents = [];
        $documents = array_merge($documents, $this->chunksFromSummaries($patientId));
        $documents = array_merge($documents, $this->chunksFromAppointments($patientId));
        $documents = array_merge($documents, $this->chunksFromLabResults($patientId));
        $documents = array_merge($documents, $this->chunksFromHealth($patientId));

        $points = [];
        foreach ($documents as $doc) {
            $text = trim((string) ($doc['text'] ?? ''));
            if ($text === '') {
                continue;
            }
            foreach ($this->splitChunks($text) as $i => $chunk) {
                $pointId = hash('sha256', $patientId . '|' . ($doc['source_type'] ?? '') . '|' . ($doc['source_id'] ?? '') . '|' . $i);
                $citationRef = ($doc['source_type'] ?? 'doc') . ':' . ($doc['source_id'] ?? '') . ':' . $i;
                $points[] = [
                    'id' => substr($pointId, 0, 32),
                    'vector' => $this->embeddings->embed($chunk),
                    'payload' => [
                        'patient_id' => $patientId,
                        'source_type' => (string) ($doc['source_type'] ?? 'unknown'),
                        'source_id' => (string) ($doc['source_id'] ?? ''),
                        'title' => (string) ($doc['title'] ?? ''),
                        'text' => mb_substr($chunk, 0, 2000),
                        'citation_ref' => $citationRef,
                        'chunk_index' => $i,
                    ],
                ];
            }
        }
        foreach (array_chunk($points, 32) as $batch) {
            $this->qdrant->upsertPoints($batch);
        }

        return count($points);
    }

    public function indexDocumentSummary(string $patientId, string $summaryId, string $title, string $text, ?string $medicalDocumentId = null): int
    {
        if (!$this->qdrant->isConfigured() || trim($text) === '') {
            return 0;
        }
        $this->qdrant->ensureCollection($this->embeddings->getVectorSize());
        $points = [];
        foreach ($this->splitChunks($text) as $i => $chunk) {
            $pointId = hash('sha256', $patientId . '|summary|' . $summaryId . '|' . $i);
            $points[] = [
                'id' => substr($pointId, 0, 32),
                'vector' => $this->embeddings->embed($chunk),
                'payload' => [
                    'patient_id' => $patientId,
                    'source_type' => 'medical_document',
                    'source_id' => $medicalDocumentId ?? $summaryId,
                    'title' => $title,
                    'text' => mb_substr($chunk, 0, 2000),
                    'citation_ref' => 'doc:' . ($medicalDocumentId ?? $summaryId) . ':' . $i,
                    'chunk_index' => $i,
                ],
            ];
        }
        $this->qdrant->upsertPoints($points);

        return count($points);
    }

    /**
     * @return list<array{source_type: string, source_id: string, title: string, text: string}>
     */
    private function chunksFromSummaries(string $patientId): array
    {
        $stmt = $this->db->prepare('
            SELECT id, medical_document_id, title, summary_text, ocr_text
            FROM ai_summaries
            WHERE patient_id = ? AND status = \'completed\'
              AND (summary_text IS NOT NULL OR ocr_text IS NOT NULL)
            ORDER BY updated_at DESC
            LIMIT 40
        ');
        $stmt->execute([$patientId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $out = [];
        foreach ($rows as $row) {
            $text = trim((string) ($row['summary_text'] ?? ''));
            if ($text === '') {
                $text = trim((string) ($row['ocr_text'] ?? ''));
            }
            if ($text === '') {
                continue;
            }
            $out[] = [
                'source_type' => 'ai_summary',
                'source_id' => (string) $row['id'],
                'title' => (string) ($row['title'] ?? 'Document'),
                'text' => $text,
            ];
        }

        return $out;
    }

    /**
     * @return list<array{source_type: string, source_id: string, title: string, text: string}>
     */
    private function chunksFromAppointments(string $patientId): array
    {
        $stmt = $this->db->prepare('
            SELECT id, type, status, scheduled_at
            FROM appointments
            WHERE patient_id = ? OR relative_id IN (
                SELECT id FROM patient_relatives WHERE patient_id = ?
            )
            ORDER BY scheduled_at DESC
            LIMIT 20
        ');
        $stmt->execute([$patientId, $patientId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $out = [];
        foreach ($rows as $row) {
            $text = sprintf(
                'Rendez-vous %s le %s, statut %s.',
                (string) ($row['type'] ?? ''),
                (string) ($row['scheduled_at'] ?? ''),
                (string) ($row['status'] ?? ''),
            );
            $out[] = [
                'source_type' => 'appointment',
                'source_id' => (string) $row['id'],
                'title' => 'Rendez-vous',
                'text' => $text,
            ];
        }

        return $out;
    }

    /**
     * @return list<array{source_type: string, source_id: string, title: string, text: string}>
     */
    private function chunksFromLabResults(string $patientId): array
    {
        $stmt = $this->db->prepare('
            SELECT id, file_name, document_type, created_at
            FROM medical_documents
            WHERE patient_id = ? AND document_type = \'resultats\'
            ORDER BY created_at DESC
            LIMIT 15
        ');
        $stmt->execute([$patientId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $out = [];
        foreach ($rows as $row) {
            $out[] = [
                'source_type' => 'lab_result_meta',
                'source_id' => (string) $row['id'],
                'title' => (string) ($row['file_name'] ?? 'Résultats'),
                'text' => sprintf(
                    'Résultat de laboratoire « %s » reçu le %s.',
                    (string) ($row['file_name'] ?? ''),
                    (string) ($row['created_at'] ?? '')
                ),
            ];
        }

        return $out;
    }

    /**
     * @return list<array{source_type: string, source_id: string, title: string, text: string}>
     */
    private function chunksFromHealth(string $patientId): array
    {
        if (!class_exists('HealthService')) {
            require_once __DIR__ . '/../health/HealthService.php';
        }
        $health = new HealthService($this->db);
        $summary = $health->metricsSummary($patientId, false);
        if ($summary === null) {
            return [];
        }
        $json = json_encode($summary, JSON_UNESCAPED_UNICODE);
        if ($json === false) {
            return [];
        }

        return [[
            'source_type' => 'health_metrics',
            'source_id' => $patientId,
            'title' => 'Données santé synchronisées',
            'text' => 'Résumé santé 7j/30j: ' . $json,
        ]];
    }

    /**
     * @return list<string>
     */
    private function splitChunks(string $text): array
    {
        $text = preg_replace('/\s+/u', ' ', $text) ?? $text;
        if (mb_strlen($text) <= self::CHUNK_SIZE) {
            return [$text];
        }
        $chunks = [];
        $offset = 0;
        $len = mb_strlen($text);
        while ($offset < $len) {
            $chunks[] = mb_substr($text, $offset, self::CHUNK_SIZE);
            $offset += self::CHUNK_SIZE;
        }

        return $chunks;
    }
}

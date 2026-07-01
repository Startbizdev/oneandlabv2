<?php

declare(strict_types=1);

require_once __DIR__ . '/QdrantClient.php';
require_once __DIR__ . '/EmbeddingService.php';
require_once __DIR__ . '/../Uuid.php';
require_once __DIR__ . '/../PatientDossierAccess.php';
require_once __DIR__ . '/../../models/User.php';

final class RagSearchService
{
    private QdrantClient $qdrant;
    private EmbeddingService $embeddings;
    private PDO $db;
    private User $userModel;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? rag_db();
        $this->qdrant = new QdrantClient();
        $this->embeddings = new EmbeddingService();
        $this->userModel = new User();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function searchForUser(array $user, string $patientId, string $query, int $limit = 6): array
    {
        if (!PatientDossierAccess::canAccess($this->db, $this->userModel, $user, $patientId)) {
            throw new RuntimeException('Accès patient refusé');
        }
        if (!$this->qdrant->isConfigured() || trim($query) === '') {
            return [];
        }
        try {
            $this->qdrant->ensureCollection($this->embeddings->getVectorSize());
            $vector = $this->embeddings->embed($query);
            $hits = $this->qdrant->search($vector, $patientId, $limit);
        } catch (Throwable) {
            return [];
        }

        $chunks = [];
        foreach ($hits as $hit) {
            $payload = $hit['payload'] ?? [];
            if (!is_array($payload)) {
                continue;
            }
            $chunks[] = [
                'id' => (string) ($hit['id'] ?? Uuid::v4()),
                'score' => (float) ($hit['score'] ?? 0),
                'source_type' => (string) ($payload['source_type'] ?? 'unknown'),
                'source_id' => (string) ($payload['source_id'] ?? ''),
                'title' => (string) ($payload['title'] ?? ''),
                'text' => (string) ($payload['text'] ?? ''),
                'citation_ref' => (string) ($payload['citation_ref'] ?? ''),
            ];
        }

        return $chunks;
    }
}

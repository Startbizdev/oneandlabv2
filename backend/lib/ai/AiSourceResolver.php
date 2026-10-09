<?php

declare(strict_types=1);

/**
 * Transforme les marqueurs [ref:…] cités par le modèle en sources typées (document, rendez-vous, résultat,
 * ordonnance) et les retire du texte. Seules les références présentes dans les extraits RAG du tour
 * (déjà filtrés par droits d'accès) et les documents joints au tour sont retenues : une référence inventée
 * par le modèle est ignorée.
 */
final class AiSourceResolver
{
    private const MARKER = '/\s?\[ref:[^\]]*\]/u';

    public function __construct(private readonly PDO $db)
    {
    }

    public static function stripMarkers(string $content): string
    {
        $clean = preg_replace(self::MARKER, '', $content) ?? $content;

        return preg_replace('/[ \t]+(\r?\n)/u', '$1', $clean) ?? $clean;
    }

    /**
     * @param list<array<string, mixed>> $ragChunks
     * @param list<array<string, mixed>> $chatAttachments
     * @return array{content: string, sources: list<array{type: string, id: string, label: string}>}
     */
    public function resolve(string $content, array $ragChunks, array $chatAttachments): array
    {
        preg_match_all('/\[ref:([^\]\s]+)\]/u', $content, $matches);
        $cited = array_flip($matches[1] ?? []);

        $documentIds = [];
        $summaryIds = [];
        $appointments = [];
        foreach ($ragChunks as $chunk) {
            $ref = (string) ($chunk['citation_ref'] ?? '');
            $sourceId = (string) ($chunk['source_id'] ?? '');
            if ($ref === '' || $sourceId === '' || !isset($cited[$ref])) {
                continue;
            }
            match ((string) ($chunk['source_type'] ?? '')) {
                'medical_document', 'lab_result_meta' => $documentIds[$sourceId] = true,
                'ai_summary' => $summaryIds[$sourceId] = true,
                'appointment' => $appointments[$sourceId] = true,
                default => null,
            };
        }
        foreach ($chatAttachments as $attachment) {
            $id = trim((string) ($attachment['medical_document_id'] ?? ''));
            if ($id !== '') {
                $documentIds[$id] = true;
            }
        }
        foreach ($this->documentIdsForSummaries(array_keys($summaryIds)) as $id) {
            $documentIds[$id] = true;
        }

        $sources = $this->documentSources(array_keys($documentIds));
        foreach ($this->appointmentLabels(array_keys($appointments)) as $id => $label) {
            $sources[] = ['type' => 'appointment', 'id' => $id, 'label' => $label];
        }

        return ['content' => self::stripMarkers($content), 'sources' => $sources];
    }

    /**
     * @param list<string> $summaryIds
     * @return list<string>
     */
    private function documentIdsForSummaries(array $summaryIds): array
    {
        if ($summaryIds === []) {
            return [];
        }
        $placeholders = implode(',', array_fill(0, count($summaryIds), '?'));
        $stmt = $this->db->prepare("SELECT medical_document_id FROM ai_summaries WHERE id IN ($placeholders) AND medical_document_id IS NOT NULL");
        $stmt->execute($summaryIds);

        return array_values(array_unique(array_map('strval', $stmt->fetchAll(PDO::FETCH_COLUMN) ?: [])));
    }

    /**
     * @param list<string> $documentIds
     * @return list<array{type: string, id: string, label: string}>
     */
    private function documentSources(array $documentIds): array
    {
        if ($documentIds === []) {
            return [];
        }
        $placeholders = implode(',', array_fill(0, count($documentIds), '?'));
        $stmt = $this->db->prepare("SELECT id, document_type, file_name FROM medical_documents WHERE id IN ($placeholders)");
        $stmt->execute($documentIds);
        $out = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
            $type = match ((string) ($row['document_type'] ?? '')) {
                'resultats' => 'result',
                'ordonnance' => 'prescription',
                default => 'document',
            };
            $label = trim((string) ($row['file_name'] ?? ''));
            $out[] = [
                'type' => $type,
                'id' => (string) $row['id'],
                'label' => $label !== '' ? $label : self::defaultLabel($type),
            ];
        }

        return $out;
    }

    /**
     * @param list<string> $appointmentIds
     * @return array<string, string>
     */
    private function appointmentLabels(array $appointmentIds): array
    {
        if ($appointmentIds === []) {
            return [];
        }
        $placeholders = implode(',', array_fill(0, count($appointmentIds), '?'));
        $stmt = $this->db->prepare("SELECT id, scheduled_at FROM appointments WHERE id IN ($placeholders)");
        $stmt->execute($appointmentIds);
        $out = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
            $when = !empty($row['scheduled_at']) ? date('d/m/Y', strtotime((string) $row['scheduled_at'])) : null;
            $out[(string) $row['id']] = $when !== null ? 'Rendez-vous du ' . $when : 'Rendez-vous';
        }

        return $out;
    }

    private static function defaultLabel(string $type): string
    {
        return match ($type) {
            'result' => 'Résultat d\'analyses',
            'prescription' => 'Ordonnance',
            default => 'Document',
        };
    }
}

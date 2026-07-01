<?php

declare(strict_types=1);

/**
 * Test analyse document (OCR + vision fallback) — usage serveur :
 * php scripts/test-document-analysis.php [medical_document_id]
 */

require_once __DIR__ . '/../lib/rag/bootstrap.php';
require_once __DIR__ . '/../lib/rag/AiDocumentJobService.php';
require_once __DIR__ . '/../lib/rag/DocumentOcrService.php';

$docId = $argv[1] ?? '';
$db = rag_db();

if ($docId === '') {
    $stmt = $db->query("
        SELECT id, patient_id, file_name, document_type, mime_type
        FROM medical_documents
        WHERE mime_type LIKE '%pdf%' OR file_name LIKE '%.pdf'
        ORDER BY created_at DESC
        LIMIT 1
    ");
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        fwrite(STDERR, "Aucun PDF en base.\n");
        exit(1);
    }
    $docId = (string) $row['id'];
    echo "Document auto: {$row['file_name']} ({$docId})\n";
} else {
    $stmt = $db->prepare('SELECT id, patient_id, file_name, document_type, mime_type FROM medical_documents WHERE id = ?');
    $stmt->execute([$docId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        fwrite(STDERR, "Document introuvable: {$docId}\n");
        exit(1);
    }
    echo "Document: {$row['file_name']} ({$docId})\n";
}

$ocr = new DocumentOcrService();
$full = $db->prepare('SELECT * FROM medical_documents WHERE id = ?');
$full->execute([$docId]);
$doc = $full->fetch(PDO::FETCH_ASSOC);

$path = $ocr->resolveReadablePath($doc ?: []);
echo 'Fichier lisible: ' . ($path !== null ? 'oui (' . strlen((string) file_get_contents($path)) . ' octets)' : 'NON') . "\n";

$rawOcr = $ocr->extractText($doc ?: []);
echo 'OCR brut: ' . mb_strlen(trim($rawOcr)) . " caractères\n";
if (trim($rawOcr) !== '') {
    echo mb_substr(trim($rawOcr), 0, 200) . "…\n";
}

$db->prepare("UPDATE ai_summaries SET status = 'failed' WHERE medical_document_id = ? AND summary_type = 'document_analysis'")
    ->execute([$docId]);

$jobs = new AiDocumentJobService($db);
$patientId = (string) ($row['patient_id'] ?? $doc['patient_id'] ?? '');
if ($patientId === '') {
    $patientId = (string) ($doc['uploaded_by'] ?? '');
}

echo "Analyse en cours (OCR + vision si besoin)…\n";
$t0 = microtime(true);
$result = $jobs->ensureAnalyzed($patientId, $docId, 'document_analysis');
$elapsed = round(microtime(true) - $t0, 1);

$summary = trim((string) ($result['summary_text'] ?? ''));
echo "Durée: {$elapsed}s\n";
echo 'Résumé: ' . mb_strlen($summary) . " caractères\n";
if ($summary === '') {
    echo "ÉCHEC — résumé vide\n";
    exit(1);
}
echo "---\n" . mb_substr($summary, 0, 1200) . "\n---\n";
echo "OK\n";

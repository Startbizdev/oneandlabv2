<?php

declare(strict_types=1);

/**
 * Test vision Cary sur une image médicale (serveur prod).
 * Usage: php scripts/test-image-vision.php [medical_document_id] [patient_email]
 */

require_once __DIR__ . '/../lib/rag/bootstrap.php';
require_once __DIR__ . '/../lib/rag/AiDocumentJobService.php';
require_once __DIR__ . '/../lib/rag/DocumentOcrService.php';
require_once __DIR__ . '/../lib/rag/DocumentVisionService.php';
require_once __DIR__ . '/../lib/ai/AiChatService.php';
require_once __DIR__ . '/../lib/ai/AiConversationService.php';

$docId = trim((string) ($argv[1] ?? ''));
$email = trim((string) ($argv[2] ?? 'charle.barth@test.oneandlab.fr'));
if ($docId !== '' && str_contains($docId, '@') && $email === 'charle.barth@test.oneandlab.fr') {
    $email = $docId;
    $docId = '';
}
$db = rag_db();
$backendDir = dirname(__DIR__);

exec('cd ' . escapeshellarg($backendDir) . ' && php get-last-otp.php ' . escapeshellarg($email) . ' 2>&1', $otpOut);
$otpText = implode("\n", $otpOut);
preg_match('/User ID:\s*(\S+)/', $otpText, $m);
$userId = trim($m[1] ?? '');
if ($userId === '') {
    fwrite(STDERR, "Utilisateur introuvable: {$email}\n");
    exit(1);
}
$user = ['user_id' => $userId, 'role' => 'patient'];

if ($docId === '') {
    $stmt = $db->prepare("
        SELECT id, patient_id, file_name, document_type, mime_type, created_at
        FROM medical_documents
        WHERE patient_id = ?
          AND (mime_type LIKE 'image/%' OR file_name REGEXP '\\.(jpg|jpeg|png|webp|heic)$')
        ORDER BY created_at DESC
        LIMIT 1
    ");
    $stmt->execute([$user['user_id']]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        $stmt = $db->query("
            SELECT id, patient_id, file_name, document_type, mime_type, created_at
            FROM medical_documents
            WHERE mime_type LIKE 'image/%' OR file_name REGEXP '\\.(jpg|jpeg|png|webp|heic)$'
            ORDER BY created_at DESC
            LIMIT 1
        ");
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
    }
    if (!$row) {
        fwrite(STDERR, "Aucune image en base pour {$email}\n");
        exit(1);
    }
    $docId = (string) $row['id'];
} else {
    $stmt = $db->prepare('SELECT id, patient_id, file_name, document_type, mime_type, created_at FROM medical_documents WHERE id = ?');
    $stmt->execute([$docId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        fwrite(STDERR, "Document introuvable: {$docId}\n");
        exit(1);
    }
}

echo "=== Test vision image Cary ===\n";
echo 'Patient: ' . $email . ' (' . $user['user_id'] . ")\n";
echo 'Document: ' . ($row['file_name'] ?? '?') . " ({$docId})\n";
echo 'MIME: ' . ($row['mime_type'] ?? '?') . "\n";
echo 'Type: ' . ($row['document_type'] ?? '?') . "\n";

$full = $db->prepare('SELECT * FROM medical_documents WHERE id = ?');
$full->execute([$docId]);
$doc = $full->fetch(PDO::FETCH_ASSOC) ?: [];

$ocr = new DocumentOcrService();
$path = $ocr->resolveReadablePath($doc);
$bytes = ($path !== null && is_readable($path)) ? filesize($path) : 0;
echo 'Fichier lisible: ' . ($path !== null ? "oui ({$bytes} octets)" : 'NON') . "\n";
if ($path === null) {
    fwrite(STDERR, "ÉCHEC — fichier image introuvable sur disque\n");
    exit(1);
}

$rawOcr = trim($ocr->extractText($doc));
echo 'OCR brut: ' . mb_strlen($rawOcr) . " car.\n";
if ($rawOcr !== '') {
    echo '  → ' . mb_substr($rawOcr, 0, 120) . "\n";
}

$db->prepare("UPDATE ai_summaries SET status = 'failed' WHERE medical_document_id = ? AND summary_type = 'document_analysis'")
    ->execute([$docId]);

$jobs = new AiDocumentJobService($db);
$patientId = (string) ($row['patient_id'] ?? $doc['patient_id'] ?? $user['user_id']);

echo "\n--- Analyse ensureAnalyzed (vision prioritaire) ---\n";
$t0 = microtime(true);
$result = $jobs->ensureAnalyzed($patientId, $docId, 'document_analysis');
$elapsed = round(microtime(true) - $t0, 1);

$summary = trim((string) ($result['summary_text'] ?? ''));
$ocrText = trim((string) ($result['ocr_text'] ?? ''));
$useful = $summary !== ''
    && !str_contains($summary, 'analyse visuelle requise')
    && !str_starts_with($summary, 'Aucun texte extractible')
    && !preg_match('/(j[\'’]ai bien reçu|ne contient pas de texte lisible|photo plus nette)/ui', $summary);

echo "Durée: {$elapsed}s\n";
echo 'Résumé: ' . mb_strlen($summary) . " car.\n";
echo 'OCR final: ' . mb_strlen($ocrText) . " car.\n";

if (!$useful) {
    echo "\n❌ ÉCHEC analyse — contenu inutilisable\n";
    if ($summary !== '') {
        echo mb_substr($summary, 0, 400) . "\n";
    }
    exit(1);
}

echo "\n✅ Analyse OK — extrait:\n";
echo mb_substr($summary, 0, 800) . "\n";

echo "\n--- Chat Cary avec pièce jointe ---\n";
$conversations = new AiConversationService($db);
$conv = $conversations->create($user, [
    'conversation_type' => 'lab_results',
    'custom_title' => 'Test vision image ' . date('Y-m-d H:i'),
]);
$convId = (string) ($conv['id'] ?? '');
if ($convId === '') {
    fwrite(STDERR, "ÉCHEC — conversation non créée\n");
    exit(1);
}

$chat = new AiChatService();
$t1 = microtime(true);
$chatResult = $chat->handleMessage($user, [
    'conversation_id' => $convId,
    'message' => 'Voici mes résultats en photo. Résume les points importants simplement.',
    'medical_document_ids' => [$docId],
]);
$chatElapsed = round(microtime(true) - $t1, 1);

$reply = trim((string) ($chatResult['message']['content'] ?? ''));

$generic = (bool) preg_match('/(bien reçu.{0,40}(image|photo|document)|pas de contenu|contenu détaillé|je ne dispose pas|extraction automatique a échoué)/uis', $reply);
echo "Durée chat: {$chatElapsed}s\n";
echo 'Réponse Cary: ' . mb_strlen($reply) . " car.\n";

if ($reply === '' || $generic) {
    echo "\n❌ ÉCHEC chat — réponse générique ou vide\n";
    echo mb_substr($reply, 0, 600) . "\n";
    exit(1);
}

echo "\n✅ Chat OK — extrait:\n";
echo mb_substr($reply, 0, 900) . "\n";
echo "\n=== TEST IMAGE RÉUSSI ===\n";

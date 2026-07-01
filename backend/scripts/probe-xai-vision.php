<?php

declare(strict_types=1);

require_once __DIR__ . '/../lib/rag/bootstrap.php';
require_once __DIR__ . '/../lib/rag/DocumentOcrService.php';

$docId = $argv[1] ?? '872be3841ba64df00d91f5da17812e93';
$model = $argv[2] ?? 'grok-4.3';
$db = rag_db();
$stmt = $db->prepare('SELECT * FROM medical_documents WHERE id = ?');
$stmt->execute([$docId]);
$doc = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$doc) {
    exit(1);
}

$ocr = new DocumentOcrService();
$path = $ocr->resolveReadablePath($doc);
$bytes = file_get_contents($path);
$mime = strtolower((string) ($doc['mime_type'] ?? 'image/jpeg'));
$dataUrl = 'data:' . $mime . ';base64,' . base64_encode((string) $bytes);
$apiKey = rag_env('XAI_API_KEY') ?? '';

$payloads = [
    'openai_image_url' => [
        'model' => $model,
        'temperature' => 0.2,
        'messages' => [[
            'role' => 'user',
            'content' => [
                ['type' => 'text', 'text' => 'Décris ce document médical en français.'],
                ['type' => 'image_url', 'image_url' => ['url' => $dataUrl, 'detail' => 'high']],
            ],
        ]],
    ],
    'xai_input_image' => [
        'model' => $model,
        'temperature' => 0.2,
        'messages' => [[
            'role' => 'user',
            'content' => [
                ['type' => 'input_text', 'text' => 'Décris ce document médical en français.'],
                ['type' => 'input_image', 'image_url' => $dataUrl, 'detail' => 'high'],
            ],
        ]],
    ],
];

foreach ($payloads as $label => $payload) {
    echo "=== {$label} / {$model} ===\n";
    $ch = curl_init('https://api.x.ai/v1/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiKey,
        ],
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
        CURLOPT_TIMEOUT => 120,
    ]);
    $raw = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    echo "HTTP {$code}\n";
    if (!is_string($raw)) {
        continue;
    }
    $json = json_decode($raw, true);
    if ($code >= 400) {
        echo mb_substr($raw, 0, 400) . "\n\n";
        continue;
    }
    $text = trim((string) ($json['choices'][0]['message']['content'] ?? ''));
    echo mb_substr($text, 0, 500) . "\n\n";
}

<?php

declare(strict_types=1);

require_once __DIR__ . '/../lib/rag/bootstrap.php';

$apiKey = rag_env('XAI_API_KEY') ?? '';
if ($apiKey === '') {
    fwrite(STDERR, "XAI_API_KEY missing\n");
    exit(1);
}

$ch = curl_init('https://api.x.ai/v1/models');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $apiKey],
    CURLOPT_TIMEOUT => 30,
]);
$raw = curl_exec($ch);
$code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP {$code}\n";
if (!is_string($raw)) {
    exit(1);
}

$json = json_decode($raw, true);
if (!is_array($json)) {
    echo $raw . "\n";
    exit(1);
}

foreach ($json['data'] ?? [] as $model) {
    if (!is_array($model)) {
        continue;
    }
    $id = (string) ($model['id'] ?? '');
    if ($id === '') {
        continue;
    }
    if (preg_match('/vision|image|grok-4|grok-3|grok-2/i', $id)) {
        echo $id . "\n";
    }
}

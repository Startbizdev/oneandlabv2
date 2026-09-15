#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * Smoke opt-in xAI Realtime — ne jamais passer de secret en argument CLI.
 * Usage: XAI_SMOKE=1 php backend/scripts/test-voice-realtime-smoke.php
 */

if (getenv('XAI_SMOKE') !== '1') {
    fwrite(STDERR, "Refusé — définir XAI_SMOKE=1 pour exécuter ce smoke.\n");
    exit(2);
}

require_once __DIR__ . '/../lib/ai/bootstrap.php';
require_once __DIR__ . '/../lib/ai/VoiceRealtimeTokenService.php';
require_once __DIR__ . '/../lib/ai/VoiceRealtimeConfig.php';

$started = hrtime(true);
$metrics = [
    'connect_ms' => null,
    'first_transcript_ms' => null,
    'first_audio_ms' => null,
    'total_ms' => null,
];

try {
    $tokenPack = (new VoiceRealtimeTokenService())->createEphemeralToken();
    $token = $tokenPack['token'];
    $url = VoiceRealtimeConfig::websocketUrl();

    $ctx = stream_context_create([
        'ssl' => ['verify_peer' => true, 'verify_peer_name' => true],
    ]);

    $client = @stream_socket_client(
        'tcp://api.x.ai:443',
        $errno,
        $errstr,
        15,
        STREAM_CLIENT_CONNECT,
        $ctx,
    );
    if ($client === false) {
        throw new RuntimeException('TCP connect failed: ' . $errstr);
    }

    $key = bin2hex(random_bytes(16));
    $headers = implode("\r\n", [
        "GET /v1/realtime?model=" . rawurlencode(VoiceRealtimeConfig::model()) . " HTTP/1.1",
        'Host: api.x.ai',
        'Upgrade: websocket',
        'Connection: Upgrade',
        'Sec-WebSocket-Key: ' . base64_encode($key),
        'Sec-WebSocket-Version: 13',
        'Sec-WebSocket-Protocol: xai-client-secret.' . $token,
    ]);
    fwrite($client, $headers . "\r\n\r\n");

    $handshake = '';
    while (!feof($client) && !str_contains($handshake, "\r\n\r\n")) {
        $handshake .= (string) fgets($client, 8192);
    }
    if (!str_contains($handshake, '101')) {
        throw new RuntimeException('WebSocket upgrade failed');
    }
    $metrics['connect_ms'] = (int) round((hrtime(true) - $started) / 1_000_000);

    $sessionUpdate = json_encode([
        'type' => 'session.update',
        'session' => [
            'voice' => VoiceRealtimeConfig::voiceId(),
            'instructions' => 'Réponds en une phrase courte.',
            'turn_detection' => ['type' => 'server_vad'],
            'audio' => [
                'input' => ['format' => ['type' => 'audio/pcm', 'rate' => 24000], 'transport' => 'binary'],
                'output' => ['format' => ['type' => 'audio/pcm', 'rate' => 24000], 'transport' => 'binary'],
            ],
        ],
    ], JSON_UNESCAPED_UNICODE);

    ws_send_text($client, $sessionUpdate);
    ws_send_text($client, json_encode([
        'type' => 'conversation.item.create',
        'item' => [
            'type' => 'message',
            'role' => 'user',
            'content' => [['type' => 'input_text', 'text' => 'Dis bonjour en français.']],
        ],
    ]));
    ws_send_text($client, json_encode(['type' => 'response.create']));

    $deadline = time() + 45;
    $gotTranscript = false;
    $gotAudio = false;
    $gotDone = false;

    while (time() < $deadline && !$gotDone) {
        $frame = ws_read_frame($client);
        if ($frame === null) {
            break;
        }
        [$opcode, $payload] = $frame;
        if ($opcode === 0x8) {
            break;
        }
        if ($opcode === 0x2 && !$gotAudio) {
            $gotAudio = true;
            $metrics['first_audio_ms'] = (int) round((hrtime(true) - $started) / 1_000_000);
        }
        if ($opcode !== 0x1) {
            continue;
        }
        $event = json_decode($payload, true);
        if (!is_array($event)) {
            continue;
        }
        $type = (string) ($event['type'] ?? '');
        if (!$gotTranscript && str_contains($type, 'transcript')) {
            $gotTranscript = true;
            $metrics['first_transcript_ms'] = (int) round((hrtime(true) - $started) / 1_000_000);
        }
        if ($type === 'response.done') {
            $gotDone = true;
        }
    }

    fclose($client);
    $metrics['total_ms'] = (int) round((hrtime(true) - $started) / 1_000_000);

    echo json_encode([
        'ok' => $gotTranscript && $gotAudio && $gotDone,
        'metrics' => $metrics,
    ], JSON_PRETTY_UNESCAPED_UNICODE) . "\n";

    exit($gotTranscript && $gotAudio && $gotDone ? 0 : 1);
} catch (Throwable $e) {
    $metrics['total_ms'] = (int) round((hrtime(true) - $started) / 1_000_000);
    echo json_encode([
        'ok' => false,
        'error' => $e->getMessage(),
        'metrics' => $metrics,
    ], JSON_PRETTY_UNESCAPED_UNICODE) . "\n";
    exit(1);
}

/** @return array{0: int, 1: string}|null */
function ws_read_frame($stream): ?array
{
    $header = fread($stream, 2);
    if ($header === false || strlen($header) < 2) {
        return null;
    }
    $b1 = ord($header[0]);
    $b2 = ord($header[1]);
    $opcode = $b1 & 0x0f;
    $masked = ($b2 & 0x80) !== 0;
    $len = $b2 & 0x7f;
    if ($len === 126) {
        $ext = fread($stream, 2);
        $len = unpack('n', $ext === false ? '' : $ext)[1] ?? 0;
    } elseif ($len === 127) {
        $ext = fread($stream, 8);
        $parts = unpack('N2', $ext === false ? '' : $ext);
        $len = (($parts[1] ?? 0) << 32) | ($parts[2] ?? 0);
    }
    $mask = $masked ? fread($stream, 4) : '';
    $payload = $len > 0 ? (string) fread($stream, $len) : '';
    if ($masked && $mask !== false && strlen($mask) === 4) {
        $out = '';
        for ($i = 0; $i < strlen($payload); $i++) {
            $out .= $payload[$i] ^ $mask[$i % 4];
        }
        $payload = $out;
    }

    return [$opcode, $payload];
}

function ws_send_text($stream, string $payload): void
{
    $frame = chr(0x81);
    $len = strlen($payload);
    if ($len <= 125) {
        $frame .= chr(0x80 | $len);
    } elseif ($len <= 65535) {
        $frame .= chr(0x80 | 126) . pack('n', $len);
    } else {
        $frame .= chr(0x80 | 127) . pack('NN', 0, $len);
    }
    $mask = random_bytes(4);
    $frame .= $mask;
    for ($i = 0; $i < $len; $i++) {
        $frame .= $payload[$i] ^ $mask[$i % 4];
    }
    fwrite($stream, $frame);
}

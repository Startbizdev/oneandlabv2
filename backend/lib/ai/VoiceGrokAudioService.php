<?php

declare(strict_types=1);

/**
 * STT + TTS Grok (xAI) — même stack que Grok Voice, sans OpenAI ni STT natif mobile.
 */
require_once __DIR__ . '/VoiceGrokNaturalSpeech.php';

final class VoiceGrokAudioService
{
    private const STT_URL = 'https://api.x.ai/v1/stt';
    private const TTS_URL = 'https://api.x.ai/v1/tts';

    public function transcribe(string $audioBase64, string $locale): string
    {
        $apiKey = $this->requireApiKey();
        $binary = base64_decode($audioBase64, true);
        if ($binary === false || $binary === '') {
            throw new InvalidArgumentException('audio_base64 invalide');
        }

        $tmp = tempnam(sys_get_temp_dir(), 'cary_grok_stt_');
        if ($tmp === false) {
            throw new RuntimeException('Impossible de préparer le fichier audio');
        }
        $path = $tmp . '.m4a';
        @unlink($tmp);
        file_put_contents($path, $binary);

        try {
            $lang = substr($locale, 0, 2);
            $post = [
                'language' => $lang,
                'format' => 'true',
                'file' => new CURLFile($path, 'audio/m4a', 'audio.m4a'),
            ];
            $ch = curl_init(self::STT_URL);
            curl_setopt_array($ch, [
                CURLOPT_POST => true,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $apiKey],
                CURLOPT_POSTFIELDS => $post,
                CURLOPT_TIMEOUT => 90,
            ]);
            $raw = curl_exec($ch);
            $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($raw === false || $code >= 400) {
                error_log('[voice] Grok STT HTTP ' . $code . ' body=' . substr((string) $raw, 0, 400));
                throw new RuntimeException('Transcription vocale indisponible');
            }
            $decoded = json_decode((string) $raw, true);
            $text = trim((string) ($decoded['text'] ?? ''));
            if ($text === '') {
                throw new InvalidArgumentException('Je n’ai rien entendu — réessayez en parlant près du micro.');
            }

            return $text;
        } finally {
            @unlink($path);
        }
    }

    /**
     * @return array{audio_base64: string, mime: string}
     */
    public function synthesize(string $text, string $locale): array
    {
        $trimmed = trim($text);
        if ($trimmed === '') {
            throw new InvalidArgumentException('Texte TTS vide');
        }

        $apiKey = $this->requireApiKey();
        $voiceId = ai_env('XAI_TTS_VOICE_ID', 'sal') ?? 'sal';
        $speedRaw = ai_env('XAI_TTS_SPEED', '0.93') ?? '0.93';
        $speed = max(0.7, min(1.5, (float) $speedRaw));
        $lang = substr($locale, 0, 2);
        $spokenText = VoiceGrokNaturalSpeech::humanize($trimmed);

        $payload = json_encode([
            'text' => $spokenText,
            'voice_id' => $voiceId,
            'language' => $lang,
            'text_normalization' => true,
            'speed' => $speed,
            'output_format' => [
                'codec' => 'mp3',
                'sample_rate' => 24000,
                'bit_rate' => 128000,
            ],
        ], JSON_UNESCAPED_UNICODE);

        $ch = curl_init(self::TTS_URL);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $apiKey,
                'Content-Type: application/json',
            ],
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_TIMEOUT => 90,
        ]);
        $raw = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($raw === false || $code >= 400) {
            error_log('[voice] Grok TTS HTTP ' . $code . ' body=' . substr((string) $raw, 0, 400));
            throw new RuntimeException('Synthèse vocale indisponible');
        }

        return [
            'audio_base64' => base64_encode((string) $raw),
            'mime' => 'audio/mpeg',
        ];
    }

    private function requireApiKey(): string
    {
        $key = ai_env('XAI_API_KEY');
        if ($key === null || $key === '') {
            throw new InvalidArgumentException('XAI_API_KEY manquante pour la voix Cary');
        }

        return $key;
    }
}

<?php

declare(strict_types=1);

/** Prépare le texte Cary pour un TTS Grok plus naturel (pauses, rythme conversationnel). */
final class VoiceGrokNaturalSpeech
{
    public static function humanize(string $text): string
    {
        $t = trim(preg_replace('/\s+/u', ' ', $text) ?? '');
        if ($t === '') {
            return $t;
        }

        $t = preg_replace('/^(Bonjour[^,!?]*,)\s+/u', '$1 [pause] ', $t) ?? $t;
        $t = preg_replace('/([.!?…])\s+(?=[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ])/u', '$1 [pause] ', $t) ?? $t;
        $t = preg_replace('/\s+([?!])/u', ' [pause]$1', $t) ?? $t;
        $t = str_replace([' — ', ' – ', ' - '], ' [pause] ', $t);
        $t = preg_replace('/(\[pause\]\s*){2,}/u', '[pause] ', $t) ?? $t;

        return trim($t);
    }
}

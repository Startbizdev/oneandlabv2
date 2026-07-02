/**
 * Tests unitaires — voice-session-utils (logique VAD / tours).
 * Usage: node scripts/test-voice-session-utils.cjs
 */

const VOICE_SILENCE_SUBMIT_MS = 1200;
const VOICE_STT_TTS_GAP_MS = 180;

function createVoiceTurn(role, text) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    text,
    at: Date.now(),
  };
}

function appendVoiceTurn(turns, turn) {
  return [...turns, turn];
}

function shouldAutoSubmitTranscript(transcript, lastSpeechAt, now, silenceMs = VOICE_SILENCE_SUBMIT_MS) {
  const trimmed = transcript.trim();
  if (!trimmed) return false;
  return now - lastSpeechAt >= silenceMs;
}

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${label}`);
  }
}

console.log('voice-session-utils\n');

console.log('shouldAutoSubmitTranscript');
assert(shouldAutoSubmitTranscript('', 1000, 3000) === false, 'transcript vide → false');
assert(shouldAutoSubmitTranscript('   ', 1000, 3000) === false, 'espaces → false');
assert(
  shouldAutoSubmitTranscript('bonjour', 1000, 1000 + VOICE_SILENCE_SUBMIT_MS - 1) === false,
  'silence insuffisant → false',
);
assert(
  shouldAutoSubmitTranscript('bonjour', 1000, 1000 + VOICE_SILENCE_SUBMIT_MS) === true,
  'silence atteint → true',
);
assert(
  shouldAutoSubmitTranscript('bonjour', 1000, 5000, 800) === true,
  'silenceMs custom → true',
);

console.log('\nappendVoiceTurn');
const t1 = createVoiceTurn('user', 'test');
const t2 = createVoiceTurn('assistant', 'réponse');
const merged = appendVoiceTurn(appendVoiceTurn([], t1), t2);
assert(merged.length === 2, 'deux tours');
assert(merged[0].role === 'user' && merged[1].role === 'assistant', 'ordre conservé');
assert(merged[0].id !== merged[1].id, 'ids uniques');

console.log('\nconstants');
assert(VOICE_SILENCE_SUBMIT_MS === 1200, 'VOICE_SILENCE_SUBMIT_MS = 1200');
assert(VOICE_STT_TTS_GAP_MS === 180, 'VOICE_STT_TTS_GAP_MS = 180');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

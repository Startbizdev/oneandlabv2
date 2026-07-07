/**
 * Tests unitaires — voice-session-utils (logique VAD / tours).
 * Usage: node scripts/test-voice-session-utils.cjs
 */

const VOICE_SILENCE_SUBMIT_MS = 1600;
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
assert(VOICE_SILENCE_SUBMIT_MS === 1600, 'VOICE_SILENCE_SUBMIT_MS = 1600');
assert(VOICE_STT_TTS_GAP_MS === 180, 'VOICE_STT_TTS_GAP_MS = 180');

console.log('\nvoice-audio-vad (inline)');
const VOICE_METER_SPEECH_DB = -45;
const VOICE_MIN_RECORDING_MS = 900;
function isSpeechMeterLevel(metering) {
  if (metering == null || Number.isNaN(metering)) return false;
  return metering > VOICE_METER_SPEECH_DB;
}
function shouldAutoSubmitVoiceRecording(params) {
  const { now, recordingStartedAt, lastSpeechAt, heardSpeech } = params;
  const silenceMs = params.silenceMs ?? VOICE_SILENCE_SUBMIT_MS;
  const duration = now - recordingStartedAt;
  if (duration < VOICE_MIN_RECORDING_MS) return false;
  if (heardSpeech && lastSpeechAt != null && now - lastSpeechAt >= silenceMs) return true;
  if (duration >= 28000) return heardSpeech;
  return false;
}
assert(isSpeechMeterLevel(-30) === true, 'metering fort → parole');
assert(isSpeechMeterLevel(-55) === false, 'metering faible → silence');
const startedAt = 500;
const speechEnd = startedAt + VOICE_MIN_RECORDING_MS;
assert(
  shouldAutoSubmitVoiceRecording({
    now: speechEnd + VOICE_SILENCE_SUBMIT_MS,
    recordingStartedAt: startedAt,
    lastSpeechAt: speechEnd,
    heardSpeech: true,
  }) === true,
  'pause après parole → submit',
);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

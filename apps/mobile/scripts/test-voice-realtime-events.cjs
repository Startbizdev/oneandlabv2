/**
 * Tests unitaires — parseur événements xAI Realtime.
 * Usage: node scripts/test-voice-realtime-events.cjs
 */

const path = require('path');
const ts = require('typescript');

const sourcePath = path.join(__dirname, '../src/features/ai-hub/utils/voice-realtime-events.ts');
const source = require('fs').readFileSync(sourcePath, 'utf8');
const transpiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

const mod = { exports: {} };
// eslint-disable-next-line no-new-func
new Function('exports', 'module', transpiled)(mod.exports, mod);

const {
  parseRealtimeJsonMessage,
  extractUserTranscript,
  extractAssistantTranscriptDelta,
  extractAssistantTranscriptFinal,
  extractFunctionCallDone,
  extractXaiConversationId,
  isResponseDone,
  isResponseCreated,
  isSpeechStarted,
} = mod.exports;

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

console.log('voice-realtime-events\n');

console.log('parseRealtimeJsonMessage');
assert(parseRealtimeJsonMessage('not json') === null, 'non-JSON → null');
assert(parseRealtimeJsonMessage('{"type":"response.done"}')?.type === 'response.done', 'JSON valide');

console.log('\nextractUserTranscript');
assert(
  extractUserTranscript({
    type: 'conversation.item.input_audio_transcription.completed',
    transcript: ' bonjour ',
  }) === 'bonjour',
  'transcript utilisateur final',
);

console.log('\nextractAssistantTranscript');
assert(
  extractAssistantTranscriptDelta({ type: 'response.output_audio_transcript.delta', delta: 'Salut' }) === 'Salut',
  'delta assistant',
);
assert(
  extractAssistantTranscriptFinal({ type: 'response.output_audio_transcript.done', transcript: ' Salut ' }) === 'Salut',
  'transcript assistant final',
);

console.log('\nextractFunctionCallDone');
const fn = extractFunctionCallDone({
  type: 'response.function_call_arguments.done',
  call_id: 'c1',
  name: 'update_booking_draft',
  arguments: '{"patch":{}}',
});
assert(fn?.callId === 'c1' && fn?.name === 'update_booking_draft', 'function call');

console.log('\nevent flags');
assert(isResponseCreated({ type: 'response.created' }), 'response.created');
assert(isResponseDone({ type: 'response.done' }), 'response.done');
assert(isSpeechStarted({ type: 'input_audio_buffer.speech_started' }), 'speech started');
assert(
  extractXaiConversationId({ type: 'conversation.created', conversation: { id: 'conv-1' } }) === 'conv-1',
  'conversation id',
);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

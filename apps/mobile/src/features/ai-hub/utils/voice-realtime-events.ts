export type RealtimeServerEvent = {
  type: string;
  [key: string]: unknown;
};

export function parseRealtimeJsonMessage(raw: string): RealtimeServerEvent | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(trimmed) as RealtimeServerEvent;
    return typeof parsed.type === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

export function extractUserTranscript(event: RealtimeServerEvent): string | null {
  if (event.type === 'conversation.item.input_audio_transcription.completed') {
    const transcript = (event as { transcript?: string }).transcript;
    return typeof transcript === 'string' ? transcript.trim() : null;
  }
  if (event.type === 'conversation.item.input_audio_transcription.updated') {
    const transcript = (event as { transcript?: string }).transcript;
    return typeof transcript === 'string' ? transcript.trim() : null;
  }
  return null;
}

export function extractAssistantTranscriptDelta(event: RealtimeServerEvent): string | null {
  if (event.type === 'response.output_audio_transcript.delta') {
    const delta = (event as { delta?: string }).delta;
    return typeof delta === 'string' ? delta : null;
  }
  return null;
}

export function extractAssistantTranscriptFinal(event: RealtimeServerEvent): string | null {
  if (event.type === 'response.output_audio_transcript.done') {
    const transcript = (event as { transcript?: string }).transcript;
    return typeof transcript === 'string' ? transcript.trim() : null;
  }
  return null;
}

export function extractFunctionCallDone(event: RealtimeServerEvent): {
  callId: string;
  name: string;
  arguments: string;
} | null {
  if (event.type !== 'response.function_call_arguments.done') return null;
  const callId = String((event as { call_id?: string }).call_id ?? '');
  const name = String((event as { name?: string }).name ?? '');
  const args = String((event as { arguments?: string }).arguments ?? '{}');
  if (!callId || !name) return null;
  return { callId, name, arguments: args };
}

export function extractXaiConversationId(event: RealtimeServerEvent): string | null {
  if (event.type !== 'conversation.created') return null;
  const conversation = (event as { conversation?: { id?: string } }).conversation;
  const id = conversation?.id;
  return typeof id === 'string' && id.trim() ? id.trim() : null;
}

export function isResponseDone(event: RealtimeServerEvent): boolean {
  return event.type === 'response.done';
}

export function isSpeechStarted(event: RealtimeServerEvent): boolean {
  return event.type === 'input_audio_buffer.speech_started';
}

export function isSpeechStopped(event: RealtimeServerEvent): boolean {
  return event.type === 'input_audio_buffer.speech_stopped';
}

export function isResponseCreated(event: RealtimeServerEvent): boolean {
  return event.type === 'response.created';
}

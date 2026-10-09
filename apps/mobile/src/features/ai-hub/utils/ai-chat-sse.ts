import type { AiChatResponse } from '@oneandlab/shared-types';

export type AiChatStreamHandlers = {
  /** Le serveur a accepté le message (`event: start`) : ne plus jamais renvoyer ce même envoi autrement. */
  onStart?: () => void;
  onDelta: (text: string) => void;
  onEmergency?: (payload: unknown) => void;
};

export type AiChatSseOutcome =
  | { kind: 'pending' }
  | { kind: 'done'; payload: AiChatResponse }
  | { kind: 'error'; message: string; code?: string; retryAfterSeconds?: number };

function isAiChatResponse(value: unknown): value is AiChatResponse {
  if (typeof value !== 'object' || value === null) return false;
  if (!('message' in value) || !('disclaimer' in value)) return false;
  return typeof value.message === 'object' && value.message !== null && typeof value.disclaimer === 'string';
}

function parseBlock(block: string): { event: string; data: unknown } | null {
  let event = 'message';
  const dataLines: string[] = [];
  for (const line of block.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
  }
  if (dataLines.length === 0) return null;
  try {
    return { event, data: JSON.parse(dataLines.join('\n')) };
  } catch (e) {
    console.warn('[cary-ai] bloc SSE illisible ignoré', event, e);
    return null;
  }
}

function readField(value: unknown, key: string): unknown {
  if (typeof value !== 'object' || value === null) return undefined;
  return Object.entries(value).find(([k]) => k === key)?.[1];
}

function readString(value: unknown, key: string): string | undefined {
  const field = readField(value, key);
  return typeof field === 'string' ? field : undefined;
}

function readPositiveInt(value: unknown, key: string): number | undefined {
  const field = readField(value, key);
  return typeof field === 'number' && Number.isInteger(field) && field > 0 ? field : undefined;
}

/**
 * Lecteur SSE de `POST /ai/chat/stream` (`start`, `delta`, `emergency`, `tool_*`, `done`, `error`, `end`).
 * Les morceaux réseau peuvent couper un bloc : le reste est conservé jusqu'au morceau suivant.
 */
export function createAiChatSseReader(handlers: AiChatStreamHandlers) {
  let buffer = '';
  let outcome: AiChatSseOutcome = { kind: 'pending' };

  const handle = (block: string) => {
    const parsed = parseBlock(block.replace(/\r/g, ''));
    if (!parsed) return;
    const { event, data } = parsed;
    if (event === 'start') handlers.onStart?.();
    else if (event === 'delta') {
      const text = readString(data, 'text');
      if (text) handlers.onDelta(text);
    } else if (event === 'emergency') handlers.onEmergency?.(data);
    else if (event === 'done' && isAiChatResponse(data)) outcome = { kind: 'done', payload: data };
    else if (event === 'error') {
      outcome = {
        kind: 'error',
        message: readString(data, 'error') ?? '',
        code: readString(data, 'code'),
        retryAfterSeconds: readPositiveInt(data, 'retry_after'),
      };
    }
  };

  return {
    push(chunk: string) {
      buffer += chunk;
      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop() ?? '';
      blocks.forEach(handle);
    },
    finish(): AiChatSseOutcome {
      if (buffer.trim()) handle(buffer);
      buffer = '';
      return outcome;
    },
  };
}

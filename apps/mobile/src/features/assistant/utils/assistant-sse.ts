import type { AssistantAction, AssistantEmergency } from '@oneandlab/shared-types';

export type AssistantStreamHandlers = {
  onStart?: (data: { conversationId: string; userMessageId: string }) => void;
  onStatus?: (text: string) => void;
  onDelta?: (text: string) => void;
  onAction?: (action: AssistantAction) => void;
  onEmergency?: (emergency: AssistantEmergency) => void;
};

export type AssistantStreamOutcome =
  | { kind: 'pending' }
  | { kind: 'done'; messageId: string; conversationId: string; text: string; actions: AssistantAction[] }
  | { kind: 'error'; code?: string; message: string; retryAfter?: number };

type Json = Record<string, unknown>;

function asObject(value: unknown): Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Json) : {};
}

function str(data: Json, key: string): string {
  const value = data[key];
  return typeof value === 'string' ? value : '';
}

export function parseAction(value: unknown): AssistantAction | null {
  const data = asObject(value);
  const type = str(data, 'type');
  if (!type) return null;
  const params: Record<string, string> = {};
  for (const [key, raw] of Object.entries(asObject(data.params))) {
    if (typeof raw === 'string' || typeof raw === 'number') params[key] = String(raw);
  }
  return { type, label: str(data, 'label'), params };
}

export function parseActions(value: unknown): AssistantAction[] {
  if (!Array.isArray(value)) return [];
  return value.map(parseAction).filter((a): a is AssistantAction => a !== null);
}

function parseBlock(block: string): { event: string; data: Json } | null {
  let event = 'message';
  const dataLines: string[] = [];
  for (const line of block.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
  }
  if (dataLines.length === 0) return null;
  try {
    return { event, data: asObject(JSON.parse(dataLines.join('\n'))) };
  } catch {
    console.warn('[assistant] bloc SSE illisible ignoré', event);
    return null;
  }
}

/**
 * Lecteur SSE de `POST /assistant/chat`. Un morceau réseau peut couper un bloc ou en contenir plusieurs :
 * le reste est gardé jusqu'au morceau suivant.
 */
export function createAssistantSseReader(handlers: AssistantStreamHandlers) {
  let buffer = '';
  let outcome: AssistantStreamOutcome = { kind: 'pending' };

  const handle = (block: string) => {
    const parsed = parseBlock(block);
    if (!parsed || outcome.kind !== 'pending') return;
    const { event, data } = parsed;
    switch (event) {
      case 'start':
        handlers.onStart?.({ conversationId: str(data, 'conversation_id'), userMessageId: str(data, 'user_message_id') });
        break;
      case 'status':
        handlers.onStatus?.(str(data, 'text'));
        break;
      case 'delta': {
        const text = str(data, 'text');
        if (text) handlers.onDelta?.(text);
        break;
      }
      case 'action': {
        const action = parseAction(data);
        if (action) handlers.onAction?.(action);
        break;
      }
      case 'emergency':
        handlers.onEmergency?.({ message: str(data, 'message'), number: str(data, 'number') || '15' });
        break;
      case 'done':
        outcome = {
          kind: 'done',
          messageId: str(data, 'message_id'),
          conversationId: str(data, 'conversation_id'),
          text: str(data, 'text'),
          actions: parseActions(data.actions),
        };
        break;
      case 'error': {
        const retryAfter = data.retry_after;
        outcome = {
          kind: 'error',
          code: str(data, 'code') || undefined,
          message: str(data, 'message'),
          retryAfter: typeof retryAfter === 'number' && retryAfter > 0 ? retryAfter : undefined,
        };
        break;
      }
    }
  };

  return {
    push(chunk: string) {
      buffer += chunk.replace(/\r/g, '');
      const blocks = buffer.split('\n\n');
      buffer = blocks.pop() ?? '';
      blocks.forEach(handle);
    },
    finish(): AssistantStreamOutcome {
      if (buffer.trim()) handle(buffer);
      buffer = '';
      return outcome;
    },
  };
}

import { SESSION_EXPIRED_MESSAGE } from '@/lib/auth/session-expiry';
import { ApiRequestError, parseRetryAfterSeconds } from '@/lib/errors/api-request-error';
import { createAiChatSseReader } from '../utils/ai-chat-sse';
import {
  AiBusyError,
  AiChatStreamError,
  AiChatTimeoutError,
  aiActionErrorMessage,
  aiChatErrorMessage,
  aiRegenerateErrorMessage,
  isRegenerateRefused,
} from '../utils/ai-chat-errors';
import { EMERGENCY_ACTIONS, emergencyTelUrl, normalizeAiEmergency } from '../utils/ai-emergency';
import { normalizeAiFollowUpSuggestions, normalizeAiMessageSources } from '../utils/ai-message-sources';

const DONE_PAYLOAD = {
  message: { id: 'm1', role: 'assistant', content: 'Bonjour' },
  disclaimer: 'IA',
  suggestions: ['Et ensuite ?'],
};

function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

describe('createAiChatSseReader', () => {
  it('streams deltas, the emergency event and the final payload across split chunks', () => {
    const onDelta = jest.fn();
    const onEmergency = jest.fn();
    const onStart = jest.fn();
    const reader = createAiChatSseReader({ onDelta, onEmergency, onStart });
    const stream =
      sse('start', {}) +
      sse('delta', { text: 'Bon' }) +
      sse('emergency', { title: 'Urgence', body: 'Appelez le 15' }) +
      sse('delta', { text: 'jour' }) +
      sse('done', DONE_PAYLOAD);
    reader.push(stream.slice(0, 37));
    reader.push(stream.slice(37, 90));
    reader.push(stream.slice(90));

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onDelta.mock.calls.map(([text]) => text)).toEqual(['Bon', 'jour']);
    expect(onEmergency).toHaveBeenCalledWith({ title: 'Urgence', body: 'Appelez le 15' });
    expect(reader.finish()).toEqual({ kind: 'done', payload: DONE_PAYLOAD });
  });

  it('reads a final block without trailing blank line and CRLF separators', () => {
    const reader = createAiChatSseReader({ onDelta: jest.fn() });
    reader.push(`event: done\r\ndata: ${JSON.stringify(DONE_PAYLOAD)}`);
    expect(reader.finish()).toEqual({ kind: 'done', payload: DONE_PAYLOAD });
  });

  it('reports a server error event with its code', () => {
    const reader = createAiChatSseReader({ onDelta: jest.fn() });
    reader.push(sse('error', { error: 'Indisponible', code: 'AI_UNAVAILABLE' }));
    expect(reader.finish()).toEqual({ kind: 'error', message: 'Indisponible', code: 'AI_UNAVAILABLE' });
  });

  it('keeps retry_after of a stream error event', () => {
    const reader = createAiChatSseReader({ onDelta: jest.fn() });
    reader.push(sse('error', { error: 'Trop de messages', code: 'AI_RATE_LIMITED', retry_after: 45 }));
    expect(reader.finish()).toEqual({
      kind: 'error',
      message: 'Trop de messages',
      code: 'AI_RATE_LIMITED',
      retryAfterSeconds: 45,
    });
  });

  it('stays pending when the stream is cut before the final event', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const reader = createAiChatSseReader({ onDelta: jest.fn() });
    reader.push(sse('delta', { text: 'Bon' }) + 'event: done\ndata: {"message":');
    expect(reader.finish()).toEqual({ kind: 'pending' });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('aiChatErrorMessage', () => {
  it('gives a clear French message for each contract error', () => {
    expect(aiChatErrorMessage(new ApiRequestError('x', 400, 'AI_MESSAGE_TOO_LONG'))).toBe(
      'Message trop long : 4\u202f000 caractères maximum.',
    );
    expect(aiChatErrorMessage(new ApiRequestError('x', 403, 'AI_ROLE_NOT_SUPPORTED'))).toBe(
      "Cary n'est pas disponible pour votre profil.",
    );
    expect(aiChatErrorMessage(new ApiRequestError('x', 403))).toBe("Vous n'avez pas accès à cette conversation.");
    expect(aiChatErrorMessage(new ApiRequestError('x', 404))).toBe("Cette conversation n'existe plus.");
    expect(aiChatErrorMessage(new ApiRequestError('x', 503, 'AI_UNAVAILABLE'))).toBe(
      'Cary est momentanément indisponible. Réessayez dans quelques minutes.',
    );
    expect(aiChatErrorMessage(new ApiRequestError('x', null))).toBe(
      'Connexion impossible. Vérifiez votre réseau puis réessayez.',
    );
  });

  it('uses Retry-After on 429', () => {
    expect(aiChatErrorMessage(new ApiRequestError('x', 429, 'RATE_LIMITED', undefined, 30))).toBe(
      "Trop de messages d'affilée. Réessayez dans 30 s.",
    );
    expect(aiChatErrorMessage(new ApiRequestError('x', 429, 'RATE_LIMITED', undefined, 90))).toBe(
      "Trop de messages d'affilée. Réessayez dans 2 min.",
    );
    expect(aiChatErrorMessage(new ApiRequestError('x', 429))).toBe(
      "Trop de messages d'affilée. Patientez un instant puis réessayez.",
    );
  });

  it('explains the 409 conflicts of the final contract', () => {
    expect(aiChatErrorMessage(new ApiRequestError('x', 409, 'AI_MESSAGE_IN_PROGRESS'))).toBe(
      'Cary termine encore sa réponse à ce message. Réessayez dans quelques secondes.',
    );
    expect(aiChatErrorMessage(new ApiRequestError('x', 409, 'VOICE_SESSION_ENDED'))).toBe(
      'La conversation vocale est terminée. Relancez le mode vocal pour continuer.',
    );
    expect(aiChatErrorMessage(new ApiRequestError('x', 409))).toBe(
      'Cette action a déjà été prise en compte. Actualisez la conversation.',
    );
  });

  it('uses Retry-After on 503 and on stream errors', () => {
    expect(aiChatErrorMessage(new ApiRequestError('x', 503, 'AI_UNAVAILABLE', undefined, 30))).toBe(
      'Cary est momentanément indisponible. Réessayez dans 30 s.',
    );
    expect(aiChatErrorMessage(new ApiRequestError('x', 503))).toBe(
      'Cary est momentanément indisponible. Réessayez dans quelques minutes.',
    );
    expect(aiChatErrorMessage(new AiChatStreamError('AI_RATE_LIMITED', 120))).toBe(
      "Trop de messages d'affilée. Réessayez dans 2 min.",
    );
    expect(aiChatErrorMessage(new AiChatStreamError('AI_MESSAGE_IN_PROGRESS'))).toMatch(/termine encore sa réponse/);
    expect(aiChatErrorMessage(new AiChatStreamError('AI_INTERNAL_ERROR'))).toBe(
      'Une erreur est survenue. Réessayez ou reformulez votre message.',
    );
  });

  it('shows a clear message when the server answers 2xx without JSON (PHP warning)', () => {
    const err = new ApiRequestError('Réponse inattendue du serveur. Réessayez dans un instant.', 200, 'INVALID_API_RESPONSE');
    expect(aiChatErrorMessage(err)).toBe('Réponse inattendue du serveur. Réessayez dans un instant.');
  });

  it('covers timeout, cut stream and expired session without technical text', () => {
    expect(aiChatErrorMessage(new AiChatTimeoutError())).toBe('Cary met trop de temps à répondre. Réessayez.');
    expect(aiChatErrorMessage(new AiChatStreamError())).toBe('La réponse de Cary a été coupée. Réessayez.');
    expect(aiChatErrorMessage(new ApiRequestError(SESSION_EXPIRED_MESSAGE, 401, 'UNAUTHORIZED'))).toBe(
      SESSION_EXPIRED_MESSAGE,
    );
  });

  it('uses the action fallback outside the chat, and explains a refused switch', () => {
    expect(aiActionErrorMessage(new Error('disk full'), 'Export impossible. Réessayez.')).toBe(
      'Export impossible. Réessayez.',
    );
    expect(aiActionErrorMessage(new AiBusyError(), 'x')).toBe('Attendez la fin de la réponse de Cary, ou arrêtez-la.');
  });
});

describe('parseRetryAfterSeconds', () => {
  it('reads seconds and HTTP dates', () => {
    expect(parseRetryAfterSeconds('120')).toBe(120);
    expect(parseRetryAfterSeconds('Wed, 21 Oct 2026 07:28:30 GMT', Date.parse('Wed, 21 Oct 2026 07:28:00 GMT'))).toBe(30);
    expect(parseRetryAfterSeconds('soon')).toBeUndefined();
    expect(parseRetryAfterSeconds(undefined)).toBeUndefined();
  });
});

describe('normalizeAiEmergency', () => {
  it('keeps valid server actions and dial URLs', () => {
    expect(
      normalizeAiEmergency({ kind: 'suicide', title: 'Besoin d’aide', body: 'Appelez', actions: [{ label: '3114', phone: '3114' }] }),
    ).toEqual({ kind: 'suicide', title: 'Besoin d’aide', body: 'Appelez', actions: [{ label: '3114', phone: '3114' }] });
    expect(emergencyTelUrl('+33 1 23')).toBe('tel:+33123');
    expect(emergencyTelUrl('abc')).toBeNull();
  });

  it('falls back to 15 / 112 / 3114 when no action is dialable', () => {
    expect(normalizeAiEmergency({ title: 'Urgence', actions: [{ phone: 'x' }] })?.actions).toEqual([...EMERGENCY_ACTIONS]);
  });

  it('ignores an empty or invalid payload (backward compatible)', () => {
    expect(normalizeAiEmergency(null)).toBeNull();
    expect(normalizeAiEmergency({ title: ' ', body: '' })).toBeNull();
  });
});

describe('message sources and follow-up suggestions', () => {
  it('keeps known, unique sources with a readable label', () => {
    expect(
      normalizeAiMessageSources([
        { type: 'document', id: 'd1', label: 'Bilan.pdf' },
        { type: 'document', id: 'd1', label: 'Doublon' },
        { type: 'appointment', id: 'a1' },
        { type: 'toString', id: 'x' },
        { type: 'result', id: '' },
      ]),
    ).toEqual([
      { type: 'document', id: 'd1', label: 'Bilan.pdf' },
      { type: 'appointment', id: 'a1', label: 'Rendez-vous' },
    ]);
    expect(normalizeAiMessageSources(undefined)).toEqual([]);
  });

  it('keeps at most three distinct suggestions', () => {
    expect(normalizeAiFollowUpSuggestions(['A', 'A', ' ', 'B', 'C', 'D', 4])).toEqual(['A', 'B', 'C']);
  });
});

describe('régénérer et supprimer : codes du contrat', () => {
  it('hides « Régénérer » only when the server refuses for good', () => {
    expect(isRegenerateRefused(new ApiRequestError('x', 409, 'AI_REGENERATE_NOT_LAST'))).toBe(true);
    expect(isRegenerateRefused(new ApiRequestError('x', 409, 'AI_REGENERATE_NOT_ALLOWED'))).toBe(true);
    expect(isRegenerateRefused(new ApiRequestError('x', 404, 'NOT_FOUND'))).toBe(true);
    expect(isRegenerateRefused(new ApiRequestError('x', 409, 'AI_MESSAGE_IN_PROGRESS'))).toBe(false);
    expect(isRegenerateRefused(new AiChatStreamError('AI_UNAVAILABLE', 30))).toBe(false);
    expect(isRegenerateRefused(new ApiRequestError('x', null))).toBe(false);
  });

  it('explains each refusal in French', () => {
    expect(aiRegenerateErrorMessage(new ApiRequestError('x', 409, 'AI_REGENERATE_NOT_LAST'))).toBe(
      'Une réponse plus récente existe déjà. Actualisez la conversation.',
    );
    expect(aiRegenerateErrorMessage(new ApiRequestError('x', 409, 'AI_REGENERATE_NOT_ALLOWED'))).toBe(
      'Cette réponse ne peut pas être régénérée. Reformulez votre question.',
    );
    expect(aiRegenerateErrorMessage(new ApiRequestError('x', 404, 'NOT_FOUND'))).toBe(
      'Cette réponse a déjà été remplacée. Actualisez la conversation.',
    );
    expect(aiActionErrorMessage(new ApiRequestError('x', 409, 'AI_CONVERSATION_SYSTEM'), 'Action impossible.')).toBe(
      'Cette conversation ne peut pas être supprimée.',
    );
  });
});

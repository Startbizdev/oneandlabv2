import { createAssistantSseReader } from '../utils/assistant-sse';

function handlers() {
  return { onStart: jest.fn(), onStatus: jest.fn(), onDelta: jest.fn(), onAction: jest.fn(), onEmergency: jest.fn() };
}

const block = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

describe('createAssistantSseReader', () => {
  it('reconstitue un bloc coupé entre deux morceaux', () => {
    const h = handlers();
    const reader = createAssistantSseReader(h);
    const raw = block('delta', { text: 'Bonjour' });
    reader.push(raw.slice(0, 12));
    expect(h.onDelta).not.toHaveBeenCalled();
    reader.push(raw.slice(12));
    expect(h.onDelta).toHaveBeenCalledWith('Bonjour');
  });

  it('traite plusieurs événements dans un même morceau, CRLF compris', () => {
    const h = handlers();
    const reader = createAssistantSseReader(h);
    reader.push(
      (
        block('start', { conversation_id: 'c1', user_message_id: 'u1' }) +
        block('status', { text: 'Je consulte vos rendez-vous…' }) +
        block('delta', { text: 'Votre ' }) +
        block('delta', { text: 'RDV' }) +
        block('action', { type: 'open_appointment', label: 'Voir', params: { id: 'a1' } })
      ).replace(/\n/g, '\r\n'),
    );
    reader.push(block('done', { message_id: 'm1', conversation_id: 'c1', text: 'Votre RDV', actions: [] }));
    expect(h.onStart).toHaveBeenCalledWith({ conversationId: 'c1', userMessageId: 'u1' });
    expect(h.onStatus).toHaveBeenCalledWith('Je consulte vos rendez-vous…');
    expect(h.onDelta.mock.calls).toEqual([['Votre '], ['RDV']]);
    expect(h.onAction).toHaveBeenCalledWith({ type: 'open_appointment', label: 'Voir', params: { id: 'a1' } });
    expect(reader.finish()).toEqual({ kind: 'done', messageId: 'm1', conversationId: 'c1', text: 'Votre RDV', actions: [] });
  });

  it('rend l’erreur du serveur avec son délai', () => {
    const reader = createAssistantSseReader(handlers());
    reader.push(block('error', { code: 'ASSISTANT_RATE_LIMITED', message: 'Trop', retry_after: 30 }));
    reader.push(block('end', {}));
    expect(reader.finish()).toEqual({ kind: 'error', code: 'ASSISTANT_RATE_LIMITED', message: 'Trop', retryAfter: 30 });
  });

  it('urgence : numéro par défaut 15 ; flux coupé sans done reste en attente', () => {
    const h = handlers();
    const reader = createAssistantSseReader(h);
    reader.push(block('emergency', { message: 'Appelez le 15' }));
    reader.push('event: delta\ndata: {"text":"x"');
    expect(h.onEmergency).toHaveBeenCalledWith({ message: 'Appelez le 15', number: '15' });
    expect(reader.finish()).toEqual({ kind: 'pending' });
  });

  it('ignore un bloc illisible', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const h = handlers();
    const reader = createAssistantSseReader(h);
    reader.push('event: delta\ndata: {pas du json}\n\n' + block('delta', { text: 'ok' }));
    expect(h.onDelta).toHaveBeenCalledWith('ok');
    warn.mockRestore();
  });
});

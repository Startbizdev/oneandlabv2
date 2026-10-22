import type { AssistantChatRequest } from '@oneandlab/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import renderer, { act } from 'react-test-renderer';
import { getConversation, streamChat } from '../api/assistant.service';
import { useAssistantChat } from '../hooks/use-assistant-chat';
import { AssistantStreamError } from '../utils/assistant-errors';
import type { AssistantStreamHandlers } from '../utils/assistant-sse';

jest.mock('../api/assistant.service', () => ({
  streamChat: jest.fn(),
  getConversation: jest.fn(async (id: string) => ({ id, title: 'T', messages: [] })),
}));

const stream = jest.mocked(streamChat);
let chat: ReturnType<typeof useAssistantChat> | null = null;
const clients: QueryClient[] = [];

afterEach(() => {
  clients.splice(0).forEach((c) => c.clear());
});

function Harness() {
  chat = useAssistantChat({ patientId: 'p1' });
  return null;
}

function current() {
  if (!chat) throw new Error('Hook non monté');
  return chat;
}

async function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  clients.push(client);
  let tree: renderer.ReactTestRenderer | undefined;
  await act(async () => {
    tree = renderer.create(
      <QueryClientProvider client={client}>
        <Harness />
      </QueryClientProvider>,
    );
  });
  return { tree, client };
}

const flush = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));

describe('useAssistantChat', () => {
  beforeEach(() => stream.mockReset());

  it('envoie, affiche le direct puis range la réponse dans la conversation', async () => {
    stream.mockImplementation(async (_body: AssistantChatRequest, h: AssistantStreamHandlers) => {
      h.onStart?.({ conversationId: 'c1', userMessageId: 'um1' });
      h.onDelta?.('Bonjour');
      return { messageId: 'm1', conversationId: 'c1', text: 'Bonjour', actions: [] };
    });
    const { tree } = await mount();
    await act(async () => {
      current().send('Salut');
    });
    await flush();
    expect(stream.mock.calls[0]?.[0]).toMatchObject({ message: 'Salut', patient_id: 'p1' });
    expect(current().conversationId).toBe('c1');
    expect(current().phase).toBe('idle');
    expect(current().messages.map((m) => [m.id, m.role, m.text])).toEqual([
      ['um1', 'user', 'Salut'],
      ['m1', 'assistant', 'Bonjour'],
    ]);
    act(() => tree?.unmount());
  });

  it('« Réessayer » renvoie le même client_message_id dans la conversation créée', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    stream.mockImplementationOnce(async (_body, h) => {
      h.onStart?.({ conversationId: 'c9', userMessageId: 'um9' });
      throw new AssistantStreamError('ASSISTANT_TIMEOUT');
    });
    stream.mockResolvedValueOnce({ messageId: 'm9', conversationId: 'c9', text: 'Voilà', actions: [] });
    const { tree } = await mount();
    await act(async () => {
      current().send('Question');
    });
    await flush();
    expect(current().phase).toBe('error');
    await act(async () => {
      current().retry();
    });
    await flush();
    const [first, second] = stream.mock.calls.map((call) => call[0]);
    expect(second?.client_message_id).toBe(first?.client_message_id);
    expect(second?.conversation_id).toBe('c9');
    expect(current().phase).toBe('idle');
    act(() => tree?.unmount());
    warn.mockRestore();
  });

  it('« Arrêter » annule le flux et garde le texte déjà reçu', async () => {
    // Rechargement serveur en attente : on vérifie ce qui est affiché localement.
    jest.mocked(getConversation).mockImplementation(() => new Promise(() => undefined));
    stream.mockImplementation(
      (_body, h, signal) =>
        new Promise((_resolve, reject) => {
          h.onStart?.({ conversationId: 'c2', userMessageId: 'um2' });
          h.onDelta?.('Début de ');
          signal.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    const { tree } = await mount();
    await act(async () => {
      current().send('Longue question');
    });
    expect(current().phase).toBe('streaming');
    await act(async () => {
      current().stop();
    });
    await flush();
    expect(current().phase).toBe('idle');
    expect(current().messages.map((m) => m.text)).toEqual(['Longue question', 'Début de ']);
    act(() => tree?.unmount());
  });
});

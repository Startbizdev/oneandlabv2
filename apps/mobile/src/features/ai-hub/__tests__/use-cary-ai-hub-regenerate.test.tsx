import type { AiChatResponse, AiMessage } from '@oneandlab/shared-types';
import { act } from 'react-test-renderer';
import { ApiRequestError } from '@/lib/errors/api-request-error';
import {
  createAiConversation,
  deleteAiConversation,
  fetchAiConversationDetail,
  fetchAiQuickSuggestions,
  streamAiChatMessage,
} from '../api/ai.service';
import { AiChatStreamError } from '../utils/ai-chat-errors';
import { resolveAiConversationContext } from '../utils/ai-conversation-context';
import { conversation, deferred, flush, hub, mount, reply, unmountHub, welcome } from './cary-ai-hub-harness';

jest.mock('@/providers/ToastProvider', () => ({
  useToast: () => ({ show: jest.fn() }),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

jest.mock('@/lib/uploads/pick-care-photo', () => ({
  pickCarePhoto: jest.fn(),
  pickCarePhotoFromSource: jest.fn(),
  carePhotoPickErrorMessage: () => 'Envoi impossible.',
}));

jest.mock('@/lib/uploads/upload-file', () => ({
  uploadMedicalDocument: jest.fn(),
}));

jest.mock('../api/ai.service', () => ({
  createAiConversation: jest.fn(),
  deleteAiConversation: jest.fn(),
  fetchAiConversationDetail: jest.fn(),
  fetchAiConversations: jest.fn(),
  fetchAiQuickSuggestions: jest.fn(),
  streamAiChatMessage: jest.fn(),
}));

const fetchDetail = jest.mocked(fetchAiConversationDetail);
const stream = jest.mocked(streamAiChatMessage);

function messages(conversationId: string): AiMessage[] {
  return [
    welcome(conversationId),
    { id: 'q1', conversation_id: conversationId, role: 'user', content: 'Faut-il être à jeun ?' },
    { id: 'a1', conversation_id: conversationId, role: 'assistant', content: 'Oui.' },
  ];
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(fetchAiQuickSuggestions).mockResolvedValue({ suggestions: [], disclaimer: 'IA' });
  jest.mocked(createAiConversation).mockImplementation(async (input) => conversation(`conv-${input.context_id ?? 'general'}`));
  fetchDetail.mockImplementation(async (id) => ({ conversation: conversation(id), messages: messages(id), has_more: false }));
});

afterEach(() => {
  unmountHub();
});

describe('useCaryAiHub — régénérer', () => {
  it('sends regenerate_of with a new client id and replaces the last reply without repeating the question', async () => {
    stream.mockResolvedValueOnce({ ...reply('conv-a1', 'Oui, 12 heures de jeûne.'), replaced_message_id: 'a1' });
    await mount(resolveAiConversationContext('patient', { appointment_id: 'a1' }));

    await act(async () => {
      hub().regenerate('a1');
    });
    await flush();

    const body = stream.mock.calls[0]?.[0];
    expect(body?.regenerate_of).toBe('a1');
    expect(body?.client_message_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(body && 'message' in body).toBe(false);
    expect(hub().activeConversation?.messages.map((m) => m.id)).toEqual(['welcome-conv-a1', 'q1', 'reply-Oui, 12 heures de jeûne.']);
  });

  it('puts the previous reply back and hides the action when the server refuses (409)', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    stream.mockRejectedValueOnce(new ApiRequestError('Plus la dernière', 409, 'AI_REGENERATE_NOT_LAST'));
    await mount(resolveAiConversationContext('patient', { appointment_id: 'a1' }));

    await act(async () => {
      hub().regenerate('a1');
    });
    await flush();

    expect(hub().activeConversation?.messages.map((m) => m.id)).toEqual(['welcome-conv-a1', 'q1', 'a1']);
    expect(hub().regenerateRefusedIds.has('a1')).toBe(true);
    expect(hub().sendFailure).toBeNull();
    warn.mockRestore();
  });

  it('keeps the previous reply when the model fails during the stream, and lets the user try again', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    stream.mockRejectedValueOnce(new AiChatStreamError('AI_UNAVAILABLE', 30));
    await mount(resolveAiConversationContext('patient', { appointment_id: 'a1' }));

    await act(async () => {
      hub().regenerate('a1');
    });
    await flush();

    expect(hub().activeConversation?.messages.at(-1)?.text).toBe('Oui.');
    expect(hub().regenerateRefusedIds.has('a1')).toBe(false);
    warn.mockRestore();
  });

  it('replays a stopped reply with its original client id (no regenerate_of, no duplicated question)', async () => {
    const pending = deferred<AiChatResponse>();
    stream.mockImplementationOnce((_input, _handlers, signal) => {
      signal.addEventListener('abort', () => pending.resolve(reply('conv-a1', 'jamais')));
      return pending.promise.then(() => Promise.reject(new Error('aborted')));
    });
    stream.mockResolvedValueOnce(reply('conv-a1', 'Réponse complète.'));
    await mount(resolveAiConversationContext('patient', { appointment_id: 'a1' }));

    await act(async () => {
      void hub().sendMessage('Et après le prélèvement ?');
    });
    await act(async () => {
      hub().stop();
    });
    await flush();
    const stopped = hub().activeConversation?.messages.at(-1);
    expect(stopped?.interrupted).toBe(true);

    await act(async () => {
      hub().regenerate(stopped?.id ?? '');
    });
    await flush();

    const first = stream.mock.calls[0]?.[0];
    const replay = stream.mock.calls[1]?.[0];
    expect(replay?.client_message_id).toBe(first?.client_message_id);
    expect(replay?.regenerate_of).toBeUndefined();
    const texts = hub().activeConversation?.messages.map((m) => m.text) ?? [];
    expect(texts.filter((t) => t === 'Et après le prélèvement ?')).toHaveLength(1);
    expect(texts.at(-1)).toBe('Réponse complète.');
  });
});

describe('useCaryAiHub — suppression définitive', () => {
  it('removes the deleted conversation and opens a new one when it was the open one', async () => {
    jest.mocked(deleteAiConversation).mockResolvedValueOnce({ deleted: { messages: 3, voice_sessions: 1, drafts: 1 } });
    await mount(resolveAiConversationContext('patient', { appointment_id: 'a1' }));

    await act(async () => {
      await hub().deleteConversation('conv-a1');
    });

    expect(deleteAiConversation).toHaveBeenCalledWith('conv-a1');
    expect(hub().conversations.map((c) => c.id)).toEqual(['conv-general']);
    expect(hub().activeId).toBe('conv-general');
  });

  it('keeps the conversation listed when the server refuses the deletion', async () => {
    jest.mocked(deleteAiConversation).mockRejectedValueOnce(new ApiRequestError('Système', 409, 'AI_CONVERSATION_SYSTEM'));
    await mount(resolveAiConversationContext('patient', { appointment_id: 'a1' }));

    await act(async () => {
      await expect(hub().deleteConversation('conv-a1')).rejects.toBeInstanceOf(ApiRequestError);
    });
    expect(hub().conversations.map((c) => c.id)).toEqual(['conv-a1']);
  });
});

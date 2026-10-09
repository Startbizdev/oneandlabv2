import type { AiConversation, AiMessage } from '@oneandlab/shared-types';
import type { PatientAiChatMessage, PatientAiConversation } from '../types/patient-ai-conversation';
import { resolveAiConversationContext } from '../utils/ai-conversation-context';
import {
  appendMessage,
  conversationsForView,
  latestFollowUpSuggestions,
  mapAiMessage,
  mergeConversationList,
  prependOlderMessages,
  previousUserMessage,
} from '../utils/ai-conversation-state';
import { buildAiStarterSuggestions } from '../utils/ai-starter-suggestions';
import { buildConversationRowActions } from '../utils/conversation-row-actions';

function conversation(id: string, patch: Partial<PatientAiConversation> = {}): PatientAiConversation {
  return { id, title: id, messages: [], createdAt: 0, updatedAt: 0, ...patch };
}

function message(id: string, role: PatientAiChatMessage['role'], patch: Partial<PatientAiChatMessage> = {}): PatientAiChatMessage {
  return { id, role, text: id, ...patch };
}

function apiConversation(id: string, patch: Partial<AiConversation> = {}): AiConversation {
  return { id, user_id: 'u', conversation_type: 'general', created_at: '2026-10-01T10:00:00Z', ...patch };
}

function apiMessage(id: string, role: AiMessage['role'], content: string, patch: Partial<AiMessage> = {}): AiMessage {
  return { id, conversation_id: 'c1', role, content, ...patch };
}

describe('resolveAiConversationContext', () => {
  it('opens one conversation per appointment, then per lab result', () => {
    expect(resolveAiConversationContext('patient', { appointment_id: 'a1', lab_result_id: 'r1' })).toMatchObject({
      kind: 'object',
      key: 'appointment:a1',
      contextType: 'appointment',
      contextId: 'a1',
    });
    expect(resolveAiConversationContext('patient', { lab_result_id: ' r1 ' })).toMatchObject({
      key: 'lab_result:r1',
      contextType: 'lab_result',
      conversationType: 'lab_results',
    });
  });

  it('gives staff a patient conversation, never a patient', () => {
    expect(resolveAiConversationContext('nurse', { patient_id: 'p1' })).toMatchObject({
      key: 'patient:p1',
      contextType: 'patient',
      patientId: 'p1',
    });
    expect(resolveAiConversationContext('pro', { patient_id: 'p1' }).kind).toBe('object');
    expect(resolveAiConversationContext('patient', { patient_id: 'p1' })).toEqual({ kind: 'general', key: 'general' });
    expect(resolveAiConversationContext('preleveur', { patient_id: 'p1' }).kind).toBe('general');
  });

  it('falls back to the system conversation, then the general one', () => {
    expect(resolveAiConversationContext('patient', { conversation_type: 'health_tracking', initial_message: 'Salut' })).toEqual({
      kind: 'system',
      key: 'system:health_tracking',
      systemKey: 'health_tracking',
      initialMessage: 'Salut',
    });
    expect(resolveAiConversationContext('patient', { appointment_id: '  ' })).toEqual({ kind: 'general', key: 'general' });
  });
});

describe('buildAiStarterSuggestions', () => {
  const general = { kind: 'general', key: 'general' } as const;

  it('offers three questions about the object to a patient', () => {
    const appointment = resolveAiConversationContext('patient', { appointment_id: 'a1' });
    const labels = buildAiStarterSuggestions({ role: 'patient', context: appointment, quick: [] }).map((s) => s.label);
    expect(labels).toEqual(['Comment me préparer ?', 'Faut-il être à jeun ?', 'Quels documents prévoir ?']);
  });

  it('uses the server quick suggestions in the general conversation', () => {
    const suggestions = buildAiStarterSuggestions({
      role: 'patient',
      context: general,
      quick: [
        { id: 'next_appointment', label: 'Mon prochain RDV' },
        { id: 'book', label: '' },
        { id: 'lab_results', label: 'Mes résultats' },
        { id: 'general', label: 'Autre' },
      ],
    });
    expect(suggestions.map((s) => s.label)).toEqual(['Mon prochain RDV', 'Je souhaite prendre un rendez-vous', 'Mes résultats']);
    expect(suggestions[0]?.message).toBe('Quand est mon prochain rendez-vous ?');
  });

  it('asks staff to choose a patient first, then offers the staff questions', () => {
    expect(buildAiStarterSuggestions({ role: 'nurse', context: general, quick: [] })).toEqual([]);
    const patient = resolveAiConversationContext('pro', { patient_id: 'p1' });
    expect(buildAiStarterSuggestions({ role: 'pro', context: patient, quick: [] }).map((s) => s.label)).toEqual([
      'Prépare un passage',
      'Résume le dossier',
      'Quels documents manquent ?',
    ]);
  });

  it('keeps the collector on preparation and instructions, never booking', () => {
    const messages = buildAiStarterSuggestions({ role: 'preleveur', context: general, quick: [] }).map((s) => s.message);
    expect(messages).toHaveLength(3);
    expect(messages.join(' ')).not.toMatch(/rendez-vous|réserv/i);
  });
});

describe('buildConversationRowActions (menu Android et iOS)', () => {
  it('lists every action of an active conversation, delete last and destructive', () => {
    const actions = buildConversationRowActions({ archived: false, isPinned: false });
    expect(actions.map((a) => a.key)).toEqual(['rename', 'pin', 'archive', 'export', 'delete']);
    expect(actions.at(-1)?.destructive).toBe(true);
    expect(buildConversationRowActions({ archived: false, isPinned: true }).map((a) => a.key)).toContain('unpin');
  });

  it('restricts archived and system conversations', () => {
    expect(buildConversationRowActions({ archived: true }).map((a) => a.key)).toEqual(['restore', 'export', 'delete']);
    expect(buildConversationRowActions({ archived: false, isSystem: true }).map((a) => a.key)).toEqual(['export']);
  });
});

describe('conversation state', () => {
  it('maps server messages without technical annotations and with sources / emergency', () => {
    const user = mapAiMessage(
      apiMessage('u1', 'user', 'Et ce bilan ?\n\n[Document(s) joint(s) dans ce message : bilan.pdf]'),
    );
    expect(user.text).toBe('Et ce bilan ?');
    const assistant = mapAiMessage(
      apiMessage('a1', 'assistant', 'Réponse', {
        sources: [{ type: 'document', id: 'd1', label: 'Bilan' }],
        metadata: { emergency: { kind: 'emergency', title: 'Urgence', body: 'Appelez', actions: [] } },
      }),
    );
    expect(assistant.metadata?.sources).toEqual([{ type: 'document', id: 'd1', label: 'Bilan' }]);
    expect(assistant.metadata?.emergency?.actions.map((a) => a.phone)).toEqual(['15', '112', '3114']);
  });

  it('shows the history attachment chip from metadata only, without the server annotation', () => {
    const user = mapAiMessage(
      apiMessage('u2', 'user', 'Que dit ce document ?\n\n[Document(s) joint(s) dans ce message : ordonnance-antibiotique.pdf]', {
        metadata: {
          attachment: {
            fileName: 'ordonnance-antibiotique.pdf',
            mimeType: 'application/pdf',
            documentType: 'ordonnance',
            medicalDocumentId: '7596e64e48419ac044e2077f4cb343bf',
          },
        },
      }),
    );
    expect(user.text).toBe('Que dit ce document ?');
    expect(user.metadata?.attachment).toMatchObject({
      fileName: 'ordonnance-antibiotique.pdf',
      mimeType: 'application/pdf',
      documentType: 'ordonnance',
      medicalDocumentId: '7596e64e48419ac044e2077f4cb343bf',
    });
  });

  it('never appends the same message twice (replayed reply)', () => {
    const list = [conversation('c1')];
    const once = appendMessage(list, 'c1', message('m1', 'assistant'));
    expect(appendMessage(once, 'c1', message('m1', 'assistant'))[0]?.messages).toHaveLength(1);
  });

  it('prepends an older page without duplicates', () => {
    const list = [conversation('c1', { messages: [message('m2', 'user'), message('m3', 'assistant')], hasMore: true })];
    const next = prependOlderMessages(list, 'c1', [message('m1', 'assistant'), message('m2', 'user')], false);
    expect(next[0]?.messages.map((m) => m.id)).toEqual(['m1', 'm2', 'm3']);
    expect(next[0]?.hasMore).toBe(false);
  });

  it('keeps the open conversation and its messages when the archives are listed', () => {
    const open = conversation('open', { messages: [message('m1', 'user')] });
    const merged = mergeConversationList([open], [apiConversation('old', { archived_at: '2026-09-01T00:00:00Z' })], 'open');
    expect(merged.find((c) => c.id === 'open')?.messages).toHaveLength(1);
    expect(conversationsForView(merged, true).map((c) => c.id)).toEqual(['old']);
    expect(conversationsForView(merged, false).map((c) => c.id)).toEqual(['open']);
  });

  it('finds the question to ask again and the follow-ups of the last answer', () => {
    const messages = [
      message('u1', 'user'),
      message('a1', 'assistant'),
      message('u2', 'user'),
      message('a2', 'assistant', { metadata: { suggestions: ['Et après ?'] } }),
    ];
    expect(previousUserMessage(messages, 3)?.id).toBe('u2');
    expect(latestFollowUpSuggestions(messages)).toEqual(['Et après ?']);
    expect(latestFollowUpSuggestions([...messages, message('u3', 'user')])).toEqual([]);
  });
});

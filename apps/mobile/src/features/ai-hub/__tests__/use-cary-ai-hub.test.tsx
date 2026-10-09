import type { AiChatRequest, AiChatResponse } from '@oneandlab/shared-types';
import { act } from 'react-test-renderer';
import { uploadPatientProfileDocument } from '@/features/patients/api/patient-profile.service';
import { ApiRequestError } from '@/lib/errors/api-request-error';
import { pickCarePhoto } from '@/lib/uploads/pick-care-photo';
import { uploadMedicalDocument } from '@/lib/uploads/upload-file';
import { useAuthStore } from '@/store/auth-store';
import {
  analyzeMedicalDocument,
  createAiConversation,
  fetchAiConversationDetail,
  fetchAiConversations,
  fetchAiQuickSuggestions,
  streamAiChatMessage,
} from '../api/ai.service';
import { resolveAiConversationContext } from '../utils/ai-conversation-context';
import { conversation, deferred, flush, Harness, hub, mount, reply, unmountHub, welcome } from './cary-ai-hub-harness';

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

jest.mock('@/features/patients/api/patient-profile.service', () => ({
  ...jest.requireActual('@/features/patients/api/patient-profile.service'),
  uploadPatientProfileDocument: jest.fn(),
}));

jest.mock('../api/ai.service', () => ({
  analyzeMedicalDocument: jest.fn(),
  attachDocumentToAiDraft: jest.fn(),
  confirmAiBookingDraft: jest.fn(),
  createAiConversation: jest.fn(),
  deleteAiConversation: jest.fn(),
  ensureAiSystemConversation: jest.fn(),
  exportAiConversations: jest.fn(),
  fetchAiConversationDetail: jest.fn(),
  fetchAiConversations: jest.fn(),
  fetchAiConversationTranscript: jest.fn(),
  fetchAiQuickSuggestions: jest.fn(),
  patchAiConversation: jest.fn(),
  streamAiChatMessage: jest.fn(),
  submitAiFeedback: jest.fn(),
}));

const createConversation = jest.mocked(createAiConversation);
const fetchDetail = jest.mocked(fetchAiConversationDetail);
const fetchQuick = jest.mocked(fetchAiQuickSuggestions);
const stream = jest.mocked(streamAiChatMessage);
const uploadMedical = jest.mocked(uploadMedicalDocument);
const uploadProfile = jest.mocked(uploadPatientProfileDocument);
const pickPhoto = jest.mocked(pickCarePhoto);

beforeEach(() => {
  jest.clearAllMocks();
  fetchQuick.mockResolvedValue({ suggestions: [], disclaimer: 'IA' });
  createConversation.mockImplementation(async (input) => conversation(`conv-${input.context_id ?? 'general'}`));
  fetchDetail.mockImplementation(async (id) => ({ conversation: conversation(id), messages: [welcome(id)], has_more: false }));
});

afterEach(() => {
  unmountHub();
  useAuthStore.setState({ user: null });
});

describe('useCaryAiHub — une conversation par objet', () => {
  it('opens the conversation of the appointment, then resets when the appointment changes', async () => {
    const tree = await mount(resolveAiConversationContext('patient', { appointment_id: 'a1' }));
    expect(createConversation).toHaveBeenCalledWith(
      expect.objectContaining({ context_type: 'appointment', context_id: 'a1', conversation_type: 'appointment' }),
    );
    expect(hub().activeId).toBe('conv-a1');
    expect(hub().inContext).toBe(true);
    expect(hub().starterSuggestions).toHaveLength(3);

    await act(async () => {
      tree.update(<Harness context={resolveAiConversationContext('patient', { appointment_id: 'a2' })} />);
    });
    await flush();
    expect(hub().activeId).toBe('conv-a2');
    expect(hub().conversations.map((c) => c.id)).toEqual(['conv-a2']);
  });

  it('shows the error instead of falling back to another conversation', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    createConversation.mockRejectedValueOnce(new ApiRequestError('Interdit', 403, 'AI_ROLE_NOT_SUPPORTED'));
    await mount(resolveAiConversationContext('patient', { lab_result_id: 'r1' }));
    expect(hub().initError).toBeInstanceOf(ApiRequestError);
    expect(hub().activeConversation).toBeNull();
    expect(hub().conversations).toEqual([]);
    warn.mockRestore();
  });
});

describe('useCaryAiHub — envoi', () => {
  it('never sends twice while a reply is in progress', async () => {
    const pending = deferred<AiChatResponse>();
    stream.mockReturnValueOnce(pending.promise);
    await mount(resolveAiConversationContext('patient', { appointment_id: 'a1' }));

    let first: Promise<boolean> = Promise.resolve(false);
    let second: Promise<boolean> = Promise.resolve(true);
    await act(async () => {
      first = hub().sendMessage('Faut-il être à jeun ?');
      second = hub().sendMessage('Faut-il être à jeun ?');
    });
    await expect(second).resolves.toBe(false);
    expect(stream).toHaveBeenCalledTimes(1);
    const body: AiChatRequest | undefined = stream.mock.calls[0]?.[0];
    expect(body?.conversation_id).toBe('conv-a1');
    expect(body?.client_message_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(hub().awaitingReply).toBe(true);

    await act(async () => {
      pending.resolve(reply('conv-a1', 'Oui, 12 heures.'));
      await first;
    });
    expect(hub().awaitingReply).toBe(false);
    const texts = hub().activeConversation?.messages.map((m) => m.text);
    expect(texts?.filter((t) => t === 'Faut-il être à jeun ?')).toHaveLength(1);
    expect(texts?.at(-1)).toBe('Oui, 12 heures.');
  });

  it('retries a failed message with the same client id, without duplicating it', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    stream
      .mockRejectedValueOnce(new ApiRequestError('Erreur réseau', null))
      .mockResolvedValueOnce(reply('conv-a1', 'Voici.'));
    await mount(resolveAiConversationContext('patient', { appointment_id: 'a1' }));

    await act(async () => {
      await hub().sendMessage('Quels documents ?');
    });
    expect(hub().sendFailure?.text).toBe('Quels documents ?');

    await act(async () => {
      hub().retryFailedSend();
    });
    await flush();
    expect(stream).toHaveBeenCalledTimes(2);
    expect(stream.mock.calls[1]?.[0].client_message_id).toBe(stream.mock.calls[0]?.[0].client_message_id);
    expect(hub().sendFailure).toBeNull();
    const texts = hub().activeConversation?.messages.map((m) => m.text) ?? [];
    expect(texts.filter((t) => t === 'Quels documents ?')).toHaveLength(1);
    expect(texts.at(-1)).toBe('Voici.');
    warn.mockRestore();
  });
});

describe('useCaryAiHub — pièce jointe d’un soignant', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: { id: 'nurse-1', role: 'nurse' } });
    jest.mocked(fetchAiConversations).mockResolvedValue([]);
    jest.mocked(analyzeMedicalDocument).mockResolvedValue({ summary_job_id: 'job-1' });
    pickPhoto.mockResolvedValue({ uri: 'file:///ordonnance.jpg', fileName: 'ordonnance.jpg', mimeType: 'image/jpeg' });
    uploadMedical.mockResolvedValue({ id: 'doc-1', file_name: 'ordonnance.jpg' });
  });

  it('asks to choose a patient first, without picking nor uploading anything', async () => {
    await mount(resolveAiConversationContext('nurse', {}), 'nurse');
    let outcome: string | undefined;
    await act(async () => {
      outcome = await hub().handleAttach('ordonnance');
    });
    expect(outcome).toBe('patient_required');
    expect(pickPhoto).not.toHaveBeenCalled();
    expect(uploadMedical).not.toHaveBeenCalled();
    expect(uploadProfile).not.toHaveBeenCalled();
  });

  it('uploads for the selected patient, never with the nurse id', async () => {
    await mount(resolveAiConversationContext('nurse', { patient_id: 'p1' }), 'nurse');
    await act(async () => {
      await hub().handleAttach('ordonnance');
    });
    expect(uploadMedical).toHaveBeenCalledWith(
      { uri: 'file:///ordonnance.jpg', fileName: 'ordonnance.jpg', mimeType: 'image/jpeg' },
      { patient_id: 'p1', document_type: 'ordonnance' },
    );
    expect(hub().pendingAttachment?.medicalDocumentId).toBe('doc-1');
    expect(JSON.stringify(uploadMedical.mock.calls)).not.toContain('nurse-1');
  });

  it('sends the document id only: the server attaches it and sets the chip of the user message', async () => {
    stream.mockResolvedValueOnce(reply('conv-p1', 'Ordonnance reçue.'));
    await mount(resolveAiConversationContext('nurse', { patient_id: 'p1' }), 'nurse');
    await act(async () => {
      await hub().handleAttach('ordonnance');
    });
    const attachment = hub().pendingAttachment ?? undefined;
    await act(async () => {
      await hub().sendMessage('', { attachment });
    });
    const body = stream.mock.calls[0]?.[0];
    expect(body?.medical_document_ids).toEqual(['doc-1']);
    expect(body && 'attachment_ids' in body).toBe(false);
    const userMessage = hub().activeConversation?.messages.find((m) => m.role === 'user');
    expect(userMessage?.metadata?.attachment?.medicalDocumentId).toBe('doc-1');
  });
});

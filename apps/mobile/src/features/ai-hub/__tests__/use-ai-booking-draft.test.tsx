import type { MobileRole } from '@oneandlab/shared-constants';
import { STAFF_PATIENT_BOOKING_CONSENT_ERROR } from '@oneandlab/shared-constants';
import type { AiAppointmentDraft } from '@oneandlab/shared-types';
import type { SetStateAction } from 'react';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { ApiRequestError } from '@/lib/errors/api-request-error';
import { confirmAiBookingDraft } from '../api/ai.service';
import { useAiBookingDraft } from '../hooks/use-ai-booking-draft';
import type { PatientAiConversation } from '../types/patient-ai-conversation';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

jest.mock('../api/ai.service', () => ({
  attachDocumentToAiDraft: jest.fn(),
  confirmAiBookingDraft: jest.fn(),
  fetchAiConversationDetail: jest.fn(),
}));

const confirm = jest.mocked(confirmAiBookingDraft);
const showToast = jest.fn();

type DraftHook = ReturnType<typeof useAiBookingDraft>;
let current: DraftHook | null = null;
let mounted: ReactTestRenderer | null = null;
let conversations: PatientAiConversation[] = [];

function setConversations(action: SetStateAction<PatientAiConversation[]>) {
  conversations = typeof action === 'function' ? action(conversations) : action;
}

function Harness({ role }: { role: MobileRole }) {
  current = useAiBookingDraft({
    role,
    activeId: 'c1',
    conversationsRef: { current: conversations },
    setConversations,
    showToast,
    onDraftClosed: jest.fn(),
  });
  return null;
}

function hook(): DraftHook {
  if (!current) throw new Error('Hook non monté');
  return current;
}

const draft: AiAppointmentDraft = {
  id: 'd1',
  user_id: 'nurse-1',
  status: 'ready',
  payload: {},
  missing_fields: [],
  created_by_role: 'nurse',
  expires_at: '2099-01-01T00:00:00Z',
};

async function mount(role: MobileRole) {
  await act(async () => {
    mounted = renderer.create(<Harness role={role} />);
  });
}

function lastMessageText(): string | undefined {
  return conversations[0]?.messages.at(-1)?.text;
}

beforeEach(() => {
  jest.clearAllMocks();
  current = null;
  conversations = [{ id: 'c1', title: 'Cary', messages: [], createdAt: 0, updatedAt: 0 }];
  confirm.mockResolvedValue({ appointment_id: 'apt-1', draft: { ...draft, status: 'confirmed' } });
});

afterEach(() => {
  act(() => mounted?.unmount());
  mounted = null;
});

describe('useAiBookingDraft — consentement du patient (infirmier / pro)', () => {
  it('blocks the confirmation until the nurse confirms the patient consent', async () => {
    await mount('nurse');
    await act(async () => {
      await hook().confirmDraft(draft);
    });
    expect(confirm).not.toHaveBeenCalled();
    expect(hook().bookingConsent?.errorDraftId).toBe('d1');
    expect(showToast).toHaveBeenCalledWith(STAFF_PATIENT_BOOKING_CONSENT_ERROR, { type: 'error' });
  });

  it('sends patient_booking_consent once the box is checked', async () => {
    await mount('pro');
    act(() => hook().bookingConsent?.toggle('d1'));
    expect(hook().bookingConsent?.checkedDraftId).toBe('d1');
    expect(hook().bookingConsent?.errorDraftId).toBeNull();
    await act(async () => {
      await hook().confirmDraft(draft);
    });
    expect(confirm).toHaveBeenCalledWith('d1', { patient_booking_consent: true });
  });

  it('unchecks the box and flags it when the server still requires the consent (400)', async () => {
    confirm.mockRejectedValueOnce(
      new ApiRequestError('Consentement requis', 400, 'PATIENT_BOOKING_CONSENT_REQUIRED'),
    );
    await mount('nurse');
    act(() => hook().bookingConsent?.toggle('d1'));
    await act(async () => {
      await hook().confirmDraft(draft);
    });
    expect(hook().bookingConsent).toMatchObject({ checkedDraftId: null, errorDraftId: 'd1' });
    expect(lastMessageText()).toMatch(/consentement du patient/);
  });

  it('explains a duplicate patient e-mail (409 PATIENT_ALREADY_EXISTS)', async () => {
    confirm.mockRejectedValueOnce(new ApiRequestError('Doublon', 409, 'PATIENT_ALREADY_EXISTS'));
    await mount('nurse');
    act(() => hook().bookingConsent?.toggle('d1'));
    await act(async () => {
      await hook().confirmDraft(draft);
    });
    expect(lastMessageText()).toMatch(/patient existe déjà avec cet e-mail/);
  });

  it('never asks a patient for a consent', async () => {
    await mount('patient');
    expect(hook().bookingConsent).toBeNull();
    await act(async () => {
      await hook().confirmDraft(draft);
    });
    expect(confirm).toHaveBeenCalledWith('d1', undefined);
  });

  it('runs beforeSubmit (closing the voice mode) only after the local checks', async () => {
    const beforeSubmit = jest.fn(async () => undefined);
    await mount('nurse');
    await act(async () => {
      await hook().confirmDraft(draft, beforeSubmit);
    });
    expect(beforeSubmit).not.toHaveBeenCalled();
    act(() => hook().bookingConsent?.toggle('d1'));
    await act(async () => {
      await hook().confirmDraft(draft, beforeSubmit);
    });
    expect(beforeSubmit).toHaveBeenCalledTimes(1);
    expect(confirm).toHaveBeenCalledTimes(1);
  });
});

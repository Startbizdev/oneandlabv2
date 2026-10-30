import type { AssistantMessage } from '@oneandlab/shared-types';
import { assistantSchedulePatch } from '@/features/appointments/form/hooks/use-assistant-booking-prefill';
import { bookingPrefillParams, resolveAssistantAction } from '../utils/assistant-actions';
import { isAffirmative, voiceBookingConfirmation } from '../utils/voice-confirm';

const action = (type: string, params: Record<string, string> = {}) => ({ type, label: '', params });
const message = (role: 'user' | 'assistant', actions = [] as ReturnType<typeof action>[]): AssistantMessage => ({
  id: role,
  role,
  text: '',
  actions,
  created_at: '2026-10-30T10:00:00Z',
});

describe('réservation préremplie par l’assistant', () => {
  it('soin, jour et plage horaire transmis au formulaire', () => {
    expect(
      resolveAssistantAction(
        'patient',
        action('book_appointment', { category_id: 'cat-1', date: '2026-11-03', time_from: '8', time_to: '10' }),
      ),
    ).toEqual({
      kind: 'navigate',
      href: {
        pathname: '/(patient)/booking/new',
        params: { category_id: 'cat-1', date: '2026-11-03', time_from: '8', time_to: '10' },
      },
    });
  });

  it('valeurs mal formées ignorées', () => {
    expect(bookingPrefillParams({ category_id: '../x', date: 'mardi', time_from: '10', time_to: '8' })).toEqual({});
    expect(bookingPrefillParams({ time_from: '7', time_to: '25' })).toEqual({});
  });

  it('créneau appliqué au soin : jour et plage personnalisée', () => {
    expect(assistantSchedulePatch({ date: '2026-11-03', timeFrom: '8', timeTo: '10' })).toMatchObject({
      scheduled_at: '2026-11-03',
      availability_type: 'custom',
      availabilityRange: [8, 10],
    });
    expect(assistantSchedulePatch({ date: '3 novembre' })).toEqual({});
  });
});

describe('confirmation vocale', () => {
  it('reconnaît un « oui » court, pas une nouvelle demande', () => {
    expect(isAffirmative('Oui.')).toBe(true);
    expect(isAffirmative("D'accord, vas-y")).toBe(true);
    expect(isAffirmative('ok')).toBe(true);
    expect(isAffirmative('non')).toBe(false);
    expect(isAffirmative('oui mais plutôt jeudi après-midi vers quinze heures si possible')).toBe(false);
  });

  it('ouvre la réservation proposée juste avant, sinon rien', () => {
    const book = action('book_appointment', { category_id: 'cat-1' });
    expect(voiceBookingConfirmation('oui', [message('user'), message('assistant', [book])])).toEqual(book);
    expect(voiceBookingConfirmation('oui', [message('assistant', [action('open_lab_results')])])).toBeNull();
    expect(voiceBookingConfirmation('oui', [message('assistant', [book]), message('user')])).toBeNull();
    expect(voiceBookingConfirmation('mardi', [message('assistant', [book])])).toBeNull();
  });
});

describe('accord de lecture des résultats', () => {
  it('carte réservée au patient', () => {
    expect(resolveAssistantAction('patient', action('enable_results_reading'))).toEqual({ kind: 'consent' });
    expect(resolveAssistantAction('nurse', action('enable_results_reading'))).toBeNull();
  });
});

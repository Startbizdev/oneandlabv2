import { TRANSMISSION_BODY_MAX_LENGTH } from '@oneandlab/shared-types';
import { headerAssistantHref } from '@/navigation/TabHeaderActions';
import { emergencyTelUrl, resolveAssistantAction, transmissionPrefill } from '../utils/assistant-actions';
import { attachmentUploadMeta } from '../utils/attachment-target';

const action = (type: string, params: Record<string, string> = {}) => ({ type, label: '', params });

describe('resolveAssistantAction', () => {
  it('réservation : écran du rôle, patient prérempli pour le soignant seulement', () => {
    expect(resolveAssistantAction('patient', action('book_appointment', { patient_id: 'x' }))).toEqual({
      kind: 'navigate',
      href: { pathname: '/(patient)/booking/new', params: {} },
    });
    expect(resolveAssistantAction('nurse', action('book_appointment'), 'p1')).toEqual({
      kind: 'navigate',
      href: { pathname: '/(nurse)/appointments/new', params: { patient_id: 'p1' } },
    });
    expect(resolveAssistantAction('preleveur', action('book_appointment'))).toEqual({
      kind: 'navigate',
      href: { pathname: '/(preleveur)/appointments/new', params: {} },
    });
  });

  it('type de soin transmis à la prise de RDV (filtre initial), valeur inconnue ignorée', () => {
    expect(resolveAssistantAction('patient', action('book_appointment', { care_type: 'blood_test' }))).toEqual({
      kind: 'navigate',
      href: { pathname: '/(patient)/booking/new', params: { care_type: 'blood_test' } },
    });
    expect(resolveAssistantAction('nurse', action('book_appointment', { care_type: 'nursing' }), 'p1')).toEqual({
      kind: 'navigate',
      href: { pathname: '/(nurse)/appointments/new', params: { patient_id: 'p1', care_type: 'nursing' } },
    });
    expect(resolveAssistantAction('patient', action('book_appointment', { care_type: 'radiologie' }))).toEqual({
      kind: 'navigate',
      href: { pathname: '/(patient)/booking/new', params: {} },
    });
  });

  it('rendez-vous, résultats, carnet, tournée selon le rôle', () => {
    expect(resolveAssistantAction('pro', action('open_appointment', { id: 'a1' }))).toEqual({
      kind: 'navigate',
      href: { pathname: '/(pro)/appointment/[id]', params: { id: 'a1' } },
    });
    expect(resolveAssistantAction('pro', action('open_appointment'))).toBeNull();
    expect(resolveAssistantAction('patient', action('open_lab_results'))).toEqual({
      kind: 'navigate',
      href: '/(patient)/resultats',
    });
    expect(resolveAssistantAction('preleveur', action('open_lab_results'))).toBeNull();
    expect(resolveAssistantAction('patient', action('open_health_record'))).toEqual({
      kind: 'navigate',
      href: '/(patient)/health-record',
    });
    expect(resolveAssistantAction('nurse', action('open_health_record'), 'p1')).toEqual({
      kind: 'navigate',
      href: { pathname: '/(nurse)/patient/[id]/health-record', params: { id: 'p1' } },
    });
    expect(resolveAssistantAction('nurse', action('open_health_record'))).toBeNull();
    expect(resolveAssistantAction('nurse', action('open_tour', { date: '2026-10-22' }))).toEqual({
      kind: 'navigate',
      href: { pathname: '/(nurse)/(tabs)/tournee', params: { date: '2026-10-22' } },
    });
    expect(resolveAssistantAction('pro', action('open_tour'))).toBeNull();
    expect(resolveAssistantAction('patient', action('open_tour'))).toBeNull();
  });

  it('transmission : soignant seulement, texte borné', () => {
    const body = 'x'.repeat(TRANSMISSION_BODY_MAX_LENGTH + 10);
    expect(
      resolveAssistantAction('nurse', action('create_transmission', { patient_id: 'p1', appointment_id: 'a1', body })),
    ).toEqual({
      kind: 'transmission',
      patientId: 'p1',
      prefill: { body: 'x'.repeat(TRANSMISSION_BODY_MAX_LENGTH), appointmentId: 'a1' },
    });
    expect(resolveAssistantAction('patient', action('create_transmission', { patient_id: 'p1', body: 'a' }))).toBeNull();
  });

  it('urgence : numéros connus seulement, 15 sinon ; type inconnu ignoré', () => {
    expect(resolveAssistantAction('patient', action('call_emergency', { number: '3114' }))).toEqual({
      kind: 'call',
      url: 'tel:3114',
    });
    expect(emergencyTelUrl('0600000000')).toBe('tel:15');
    expect(resolveAssistantAction('patient', action('delete_everything'))).toBeNull();
  });
});

describe('dictée → transmission', () => {
  it('préremplit le texte relu et le rendez-vous', () => {
    expect(transmissionPrefill('  Pansement refait.  ', 'a1')).toEqual({ body: 'Pansement refait.', appointmentId: 'a1' });
    expect(transmissionPrefill('Texte')).toEqual({ body: 'Texte' });
  });
});

describe('pièce jointe', () => {
  it('dossier du patient, rendez-vous du soignant, sinon explication', () => {
    expect(attachmentUploadMeta('patient', { userId: 'u1' }, 'bilan.pdf')).toEqual({
      patient_id: 'u1',
      document_type: 'resultats',
    });
    expect(attachmentUploadMeta('nurse', { userId: 'n1', appointmentId: 'a1' }, 'photo.jpg')).toEqual({
      appointment_id: 'a1',
      document_type: 'other',
    });
    expect(attachmentUploadMeta('pro', { userId: 'n1', patientId: 'p1' }, 'photo.jpg')).toEqual({
      patient_id: 'p1',
      document_type: 'ordonnance',
    });
    expect(typeof attachmentUploadMeta('nurse', { userId: 'n1' }, 'photo.jpg')).toBe('string');
    expect(typeof attachmentUploadMeta('preleveur', { userId: 'n1', patientId: 'p1' }, 'photo.jpg')).toBe('string');
  });
});

describe('bouton assistant de l’en-tête', () => {
  it('soignants seulement', () => {
    expect(headerAssistantHref('nurse')).toEqual({ pathname: '/(nurse)/ai', params: {} });
    expect(headerAssistantHref('pro')).toEqual({ pathname: '/(pro)/ai', params: {} });
    expect(headerAssistantHref('preleveur')).toEqual({ pathname: '/(preleveur)/ai', params: {} });
    expect(headerAssistantHref('patient')).toBeNull();
    expect(headerAssistantHref(undefined)).toBeNull();
  });
});

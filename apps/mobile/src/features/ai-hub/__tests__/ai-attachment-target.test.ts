import { aiAttachmentUpload, resolveAiAttachmentTarget } from '../utils/ai-attachment-target';

const NURSE_ID = 'nurse-1';

describe('resolveAiAttachmentTarget', () => {
  it('attaches a patient document to the patient himself', () => {
    expect(resolveAiAttachmentTarget('patient', null)).toEqual({ kind: 'own' });
  });

  it('uses the appointment of the conversation for staff', () => {
    const conversation = { contextType: 'appointment' as const, contextId: 'apt-1', patientId: 'p1' };
    expect(resolveAiAttachmentTarget('nurse', conversation)).toEqual({ kind: 'appointment', appointmentId: 'apt-1' });
    expect(resolveAiAttachmentTarget('preleveur', conversation)).toEqual({ kind: 'appointment', appointmentId: 'apt-1' });
  });

  it('uses the selected patient: pill, conversation, then route', () => {
    expect(resolveAiAttachmentTarget('nurse', { contextType: 'patient', contextId: 'p1' })).toEqual({
      kind: 'patient',
      patientId: 'p1',
    });
    expect(resolveAiAttachmentTarget('pro', { contextType: 'general', contextId: null, patientId: 'p2' })).toEqual({
      kind: 'patient',
      patientId: 'p2',
    });
    expect(resolveAiAttachmentTarget('nurse', { contextType: 'lab_result', contextId: 'r1' }, 'p3')).toEqual({
      kind: 'patient',
      patientId: 'p3',
    });
  });

  it('asks staff to choose a patient instead of using their own id', () => {
    expect(resolveAiAttachmentTarget('nurse', null)).toEqual({ kind: 'patient_required' });
    expect(resolveAiAttachmentTarget('pro', { contextType: 'general', contextId: null, patientId: null })).toEqual({
      kind: 'patient_required',
    });
  });

  it('only lets the préleveur attach from an appointment', () => {
    expect(resolveAiAttachmentTarget('preleveur', null)).toEqual({ kind: 'appointment_required' });
  });
});

describe('aiAttachmentUpload', () => {
  it('keeps the patient flow: profile documents and own medical documents', () => {
    expect(aiAttachmentUpload({ kind: 'own' }, 'carte_vitale', 'u1')).toEqual({
      kind: 'profile',
      patientUserId: 'u1',
      docType: 'carte_vitale',
    });
    expect(aiAttachmentUpload({ kind: 'own' }, 'other', 'u1')).toEqual({
      kind: 'medical',
      meta: { patient_id: 'u1', document_type: 'other' },
    });
  });

  it('uploads on the appointment, the server deriving the patient', () => {
    expect(aiAttachmentUpload({ kind: 'appointment', appointmentId: 'apt-1' }, 'resultats', NURSE_ID)).toEqual({
      kind: 'medical',
      meta: { appointment_id: 'apt-1', document_type: 'resultats' },
    });
  });

  it('sends the selected patient id, never the staff id', () => {
    const target = { kind: 'patient' as const, patientId: 'p1' };
    const ordonnance = aiAttachmentUpload(target, 'ordonnance', NURSE_ID);
    const vitale = aiAttachmentUpload(target, 'carte_vitale', NURSE_ID);
    expect(ordonnance).toEqual({ kind: 'medical', meta: { patient_id: 'p1', document_type: 'ordonnance' } });
    expect(vitale).toEqual({ kind: 'profile', patientUserId: 'p1', docType: 'carte_vitale' });
    expect(JSON.stringify([ordonnance, vitale])).not.toContain(NURSE_ID);
  });

  it('explains which documents need an appointment, as the server requires', () => {
    const upload = aiAttachmentUpload({ kind: 'patient', patientId: 'p1' }, 'resultats', NURSE_ID);
    expect(upload.kind).toBe('unsupported');
  });
});

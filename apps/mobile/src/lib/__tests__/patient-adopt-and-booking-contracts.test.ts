import {
  appointmentCreateErrorMessage,
  appointmentReassignErrorMessage,
  buildPatientAdoptBody,
  coverageZoneSaveErrorMessage,
  firstApiErrorMessage,
  isEmailAlreadyUsedError,
  lookupPatientByContact,
  patientAdoptErrorMessage,
  patientCreateErrorMessage,
} from '@oneandlab/shared-api';
import { buildDashboardAppointmentPayloads, type SelectedServiceInput } from '@oneandlab/shared-utils';
import type { Appointment } from '@oneandlab/shared-types';
import { buildReschedulePayload } from '@/features/appointments/reschedule/utils/build-reschedule-payload';
import { ApiRequestError } from '@/lib/errors/api-request-error';
import { apiErrorMessage } from '@/lib/errors/handle-api-error';

describe('adoption d’un dossier trouvé par recherche (POST /patients/adopt)', () => {
  it('rejoue uniquement le contact qui a trouvé le dossier, avec le consentement', () => {
    expect(buildPatientAdoptBody('p1', { email: 'a@b.fr' }, true)).toEqual({
      patient_id: 'p1',
      email: 'a@b.fr',
      patient_booking_consent: true,
    });
    expect(buildPatientAdoptBody('p1', { phone: '0612345678' }, false)).toEqual({
      patient_id: 'p1',
      phone: '0612345678',
      patient_booking_consent: false,
    });
  });

  it('cherche par e-mail d’abord et ne garde que id, nom et date de naissance', async () => {
    const get = jest.fn(async (path: string) =>
      path.includes('email=')
        ? {
            success: true,
            data: { id: 42, first_name: 'Ana', last_name: 'Diaz', birth_date: '1990-02-03', email: 'x', address: 'y' },
          }
        : { success: true, data: null },
    );
    const found = await lookupPatientByContact(get, ' ana@test.fr ', '0612345678');
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith('/patients/lookup?email=ana%40test.fr');
    expect(found).toEqual({
      patient: { id: '42', first_name: 'Ana', last_name: 'Diaz', birth_date: '1990-02-03' },
      contact: { email: 'ana@test.fr' },
    });
  });

  it('se rabat sur le téléphone et le renvoie comme contact d’adoption', async () => {
    const get = jest.fn(async (path: string) =>
      path.includes('phone=') ? { success: true, data: { id: 'p9' } } : { success: true, data: null },
    );
    const found = await lookupPatientByContact(get, 'ana@test.fr', '06 12 34 56 78');
    expect(get).toHaveBeenCalledTimes(2);
    expect(found?.contact).toEqual({ phone: '06 12 34 56 78' });
    expect(found?.patient).toEqual({ id: 'p9', first_name: null, last_name: null, birth_date: null });
  });

  it('ne lance aucune recherche sans e-mail ni téléphone valides', async () => {
    const get = jest.fn(async () => ({ success: true, data: { id: 'p1' } }));
    expect(await lookupPatientByContact(get, 'pas-un-email', '123')).toBeNull();
    expect(get).not.toHaveBeenCalled();
  });

  it('messages : consentement (400), contact qui ne correspond plus (403), autre refus (403)', () => {
    expect(patientAdoptErrorMessage(400, 'PATIENT_BOOKING_CONSENT_REQUIRED')).toMatch(/consentement/);
    expect(patientAdoptErrorMessage(403, 'PATIENT_LOOKUP_MISMATCH')).toMatch(/ne correspond plus/);
    expect(patientAdoptErrorMessage(403, undefined)).toMatch(/ne pouvez pas utiliser/);
    expect(patientAdoptErrorMessage(400, 'VALIDATION_ERROR')).toBeNull();
  });
});

describe('création patient : 409 EMAIL_ALREADY_USED', () => {
  it('teste le code, pas le texte', () => {
    expect(isEmailAlreadyUsedError(409, 'EMAIL_ALREADY_USED')).toBe(true);
    expect(isEmailAlreadyUsedError(409, undefined)).toBe(false);
    expect(isEmailAlreadyUsedError(400, 'EMAIL_ALREADY_USED')).toBe(false);
    expect(patientCreateErrorMessage(409, 'EMAIL_ALREADY_USED')).toMatch(/existe déjà/);
  });

  it('ApiRequestError conserve existing_patient_id pour proposer le dossier', () => {
    const err = new ApiRequestError('Email déjà utilisé', 409, 'EMAIL_ALREADY_USED', 'p7');
    expect(err.existingPatientId).toBe('p7');
    expect(apiErrorMessage(err, patientCreateErrorMessage)).toMatch(/existe déjà/);
  });
});

describe('création et reprogrammation de rendez-vous', () => {
  it('messages : accès patient et attribution refusés (403), VALIDATION_ERROR garde le détail serveur', () => {
    expect(appointmentCreateErrorMessage(403, 'PATIENT_ACCESS_DENIED')).toMatch(/pas accès au dossier/);
    expect(appointmentCreateErrorMessage(403, 'ASSIGNMENT_FORBIDDEN')).toMatch(/ne peut pas être attribué/);
    expect(appointmentCreateErrorMessage(400, 'VALIDATION_ERROR')).toBeNull();
  });

  it('firstApiErrorMessage enchaîne les résolveurs dans l’ordre', () => {
    const resolve = firstApiErrorMessage(patientCreateErrorMessage, appointmentCreateErrorMessage);
    expect(resolve(409, 'EMAIL_ALREADY_USED')).toMatch(/existe déjà/);
    expect(resolve(403, 'ASSIGNMENT_FORBIDDEN')).toMatch(/ne peut pas être attribué/);
    expect(resolve(500, undefined)).toBeNull();
  });

  const services: SelectedServiceInput[] = [
    { id: 's1', type: 'blood_test', name: 'Bilan', category_id: 'c1' },
    { id: 's2', type: 'blood_test', name: 'Glycémie', category_id: 'c2' },
    { id: 's3', type: 'nursing', name: 'Pansement', category_id: 'c3' },
    { id: 's4', type: 'nursing', name: 'Injection', category_id: 'c4' },
  ];

  it('infirmier : jamais de status ; s’attribue le soin, jamais la prise de sang', () => {
    const payloads = buildDashboardAppointmentPayloads('p1', { address: { label: 'x' }, formDataByService: {} }, services, {
      creatorRole: 'nurse',
      creatorUserId: 'n1',
    });
    expect(payloads.length).toBeGreaterThan(0);
    for (const p of payloads) {
      expect(p).not.toHaveProperty('status');
      if (p.type === 'blood_test') expect(p).not.toHaveProperty('assigned_nurse_id');
      if (p.type === 'nursing') expect(p.assigned_nurse_id).toBe('n1');
    }
  });

  const appointment: Appointment = {
    id: 'a1',
    type: 'blood_test',
    status: 'confirmed',
    patient_id: 'p1',
    assigned_lab_id: 'lab1',
    assigned_to: 'prel1',
    form_data: {},
    scheduled_at: '2026-10-02 09:00:00',
    created_at: '2026-10-01 09:00:00',
  };
  const form = {
    category_id: 'c1',
    address: { label: '1 rue de Paris', lat: 48.85, lng: 2.35 },
    address_complement: '',
    scheduled_at: '2026-10-10',
    availability_type: 'all_day' as const,
    availability_range: [8, 12] as [number, number],
    notes: '',
  };

  it('reprogrammation par un pro : ni status, ni labo, ni préleveur (le RDV repart en attente)', () => {
    const payload = buildReschedulePayload({ appointment, form, role: 'pro', userId: 'pro1' });
    expect(payload).not.toBeNull();
    expect(payload).not.toHaveProperty('status');
    expect(payload).not.toHaveProperty('assigned_lab_id');
    expect(payload).not.toHaveProperty('assigned_to');
    expect(payload?.patient_booking_consent).toBe(true);
  });

  it('reprogrammation par un préleveur : reprise de son RDV, statut décidé par le serveur', () => {
    const payload = buildReschedulePayload({ appointment, form, role: 'preleveur', userId: 'prel1', labId: 'lab1' });
    expect(payload).not.toHaveProperty('status');
    expect(payload).toMatchObject({ assigned_to: 'prel1', assigned_lab_id: 'lab1', reschedule_from_appointment_id: 'a1' });
  });
});

describe('réassignation et zones de couverture', () => {
  it('réassignation : RDV hors équipe vs préleveur hors équipe', () => {
    expect(appointmentReassignErrorMessage(403, 'NOT_ASSIGNED_TO_TEAM')).toMatch(/pas attribué à votre laboratoire/);
    expect(appointmentReassignErrorMessage(403, 'FORBIDDEN')).toMatch(/ne fait pas partie de votre laboratoire/);
    expect(appointmentReassignErrorMessage(400, 'VALIDATION_ERROR')).toBeNull();
  });

  it('zone : propriétaire étranger (403 FORBIDDEN) ; PLAN_LIMIT garde le message serveur', () => {
    expect(coverageZoneSaveErrorMessage(403, 'FORBIDDEN')).toMatch(/votre zone/);
    expect(coverageZoneSaveErrorMessage(403, 'PLAN_LIMIT')).toBeNull();
  });
});

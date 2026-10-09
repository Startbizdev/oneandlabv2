import {
  appointmentCreateErrorMessage,
  appointmentCreateErrorResolver,
  nurseInviteAppointmentErrorMessage,
} from '@oneandlab/shared-api';
import {
  FRENCH_MOBILE_PHONE_ERROR,
  formatFrenchPhoneDisplay,
  normalizeFrenchMobilePhone,
  nurseBookingAwaitsLabConfirmation,
} from '@oneandlab/shared-utils';
import {
  applyProNurseAssignmentToPayloads,
  externalNursePhoneError,
  validateProNurseAssignment,
} from '@/features/appointments/form/utils/pro-nurse-assignment';

describe('normalizeFrenchMobilePhone (aligné sur NurseInviteService::normalizeInvitePhone)', () => {
  it('accepte 06 / 07 et +33 6 / 7, espaces, points et tirets tolérés', () => {
    expect(normalizeFrenchMobilePhone('06 12 34 56 78')).toBe('0612345678');
    expect(normalizeFrenchMobilePhone('+33712345678')).toBe('0712345678');
    expect(normalizeFrenchMobilePhone(' +33 7 12.34-56 78 ')).toBe('0712345678');
    expect(normalizeFrenchMobilePhone('07.12.34.56.78')).toBe('0712345678');
  });

  it('refuse les fixes, les numéros étrangers et les saisies incomplètes', () => {
    for (const bad of ['0145678901', '0912345678', '+447123456789', '06123', '', 'abc', '+33012345678', '0033612345678']) {
      expect(normalizeFrenchMobilePhone(bad)).toBeNull();
    }
  });
});

describe('formatFrenchPhoneDisplay (fiche patient)', () => {
  it('affiche un numéro français par paires, mobile ou fixe', () => {
    expect(formatFrenchPhoneDisplay('0611223344')).toBe('06 11 22 33 44');
    expect(formatFrenchPhoneDisplay('+33 4 91.23-45 67')).toBe('04 91 23 45 67');
    expect(formatFrenchPhoneDisplay('06 98 76 54 32')).toBe('06 98 76 54 32');
  });

  it('rend tel quel un numéro étranger ou incomplet', () => {
    expect(formatFrenchPhoneDisplay(' +44 7123 456789 ')).toBe('+44 7123 456789');
    expect(formatFrenchPhoneDisplay('06123')).toBe('06123');
  });
});

describe('invitation SMS d’un infirmier externe (wizard pro mobile)', () => {
  it('message sous le champ uniquement pour un numéro saisi et invalide', () => {
    expect(externalNursePhoneError('')).toBeNull();
    expect(externalNursePhoneError('06 12 34 56 78')).toBeNull();
    expect(externalNursePhoneError('01 45 67 89 01')).toBe(FRENCH_MOBILE_PHONE_ERROR);
  });

  it('bloque l’envoi d’un numéro invalide, pas le choix d’un infirmier de la liste', () => {
    expect(validateProNurseAssignment({ mode: 'patient_nurse', external: { phone: '0145678901' } })).toBe(
      FRENCH_MOBILE_PHONE_ERROR,
    );
    expect(validateProNurseAssignment({ mode: 'patient_nurse', external: { phone: '+33 6 12 34 56 78' } })).toBeNull();
    expect(validateProNurseAssignment({ mode: 'patient_nurse', linkedNurseId: 'n1' })).toBeNull();
    expect(validateProNurseAssignment({ mode: 'patient_nurse' })).toMatch(/Choisissez un infirmier/);
  });

  it('envoie le numéro normalisé, une seule invitation par lot', () => {
    const out = applyProNurseAssignmentToPayloads(
      [{ type: 'nursing' }, { type: 'nursing' }, { type: 'blood_test' }],
      { mode: 'patient_nurse', external: { phone: '+33 6 12 34 56 78' } },
    );
    expect(out[0]).toEqual({ type: 'nursing', skip_zone_dispatch: true, external_nurse_invite: { phone: '0612345678' } });
    expect(out[1]).toEqual({ type: 'nursing', skip_zone_dispatch: true });
    expect(out[2]).toEqual({ type: 'blood_test' });
  });
});

describe('messages d’erreur de création avec invitation', () => {
  it('400 VALIDATION_ERROR vise le numéro seulement si une invitation est envoyée', () => {
    expect(nurseInviteAppointmentErrorMessage(400, 'VALIDATION_ERROR')).toMatch(/mobile français/);
    expect(appointmentCreateErrorResolver({ external_nurse_invite: { phone: '0612345678' } })).toBe(
      nurseInviteAppointmentErrorMessage,
    );
    expect(appointmentCreateErrorResolver({})).toBe(appointmentCreateErrorMessage);
    expect(appointmentCreateErrorMessage(400, 'VALIDATION_ERROR')).toBeNull();
  });

  it('429 NURSE_INVITE_RATE_LIMITED : quota SMS du jour atteint', () => {
    expect(appointmentCreateErrorMessage(429, 'NURSE_INVITE_RATE_LIMITED')).toMatch(/Trop d’invitations SMS/);
    expect(nurseInviteAppointmentErrorMessage(429, 'NURSE_INVITE_RATE_LIMITED')).toMatch(/Réessayez demain/);
    expect(nurseInviteAppointmentErrorMessage(403, 'ASSIGNMENT_FORBIDDEN')).toMatch(/ne peut pas être attribué/);
  });
});

describe('prise de sang créée par un infirmier', () => {
  it('reste en attente de confirmation du laboratoire', () => {
    expect(nurseBookingAwaitsLabConfirmation('nurse', [{ type: 'nursing' }, { type: 'blood_test' }])).toBe(true);
    expect(nurseBookingAwaitsLabConfirmation('nurse', [{ type: 'nursing' }])).toBe(false);
    expect(nurseBookingAwaitsLabConfirmation('pro', [{ type: 'blood_test' }])).toBe(false);
  });
});

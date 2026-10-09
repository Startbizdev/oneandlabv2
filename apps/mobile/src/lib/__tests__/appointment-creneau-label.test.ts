import type { Appointment } from '@oneandlab/shared-types';
import { appointmentCreneauLabel } from '../../utils/appointment-display';

describe('créneau affiché sur la carte agenda', () => {
  const base: Appointment = {
    id: 'apt-1',
    type: 'nursing',
    status: 'confirmed',
    form_data: { availability: JSON.stringify({ type: 'custom', range: [12.5, 13.5] }) },
    scheduled_at: '2030-01-07 12:30:00',
    created_at: '2030-01-01 09:00:00',
  };

  it('affiche l’heure précise d’un passage, comme la tournée', () => {
    expect(appointmentCreneauLabel({ ...base, passage_source: 'nurse_passage' })).toBe('12h30');
  });

  it('garde le nom du créneau pour un passage sur une plage large', () => {
    const morning = { ...base, passage_source: 'nurse_passage', form_data: { availability: JSON.stringify({ type: 'custom', range: [8, 12] }) } };
    expect(appointmentCreneauLabel(morning)).toBe('Matin · 8h00 — 12h00');
  });

  it('garde la plage d’un rendez-vous classique', () => {
    const rdv = { ...base, form_data: { availability: JSON.stringify({ type: 'custom', range: [9, 11] }) } };
    expect(appointmentCreneauLabel(rdv)).toBe('9h00 - 11h00');
  });
});

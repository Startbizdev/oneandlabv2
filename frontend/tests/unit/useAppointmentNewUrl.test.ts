import { describe, it, expect } from 'vitest';
import { getDashboardNewAppointmentPath } from '~/composables/useAppointmentNewUrl';

describe('getDashboardNewAppointmentPath', () => {
  it('ouvre le wizard préleveur (prise de sang vers son labo)', () => {
    expect(getDashboardNewAppointmentPath('preleveur')).toBe('/preleveur/appointments/new');
  });

  it('garde les parcours existants des autres rôles', () => {
    expect(getDashboardNewAppointmentPath('lab')).toBe('/lab/appointments/new');
    expect(getDashboardNewAppointmentPath('subaccount')).toBe('/subaccount/appointments/new');
    expect(getDashboardNewAppointmentPath('super_admin')).toBe('/admin/appointments/new');
    expect(getDashboardNewAppointmentPath('patient')).toBeNull();
    expect(getDashboardNewAppointmentPath(undefined)).toBeNull();
  });
});

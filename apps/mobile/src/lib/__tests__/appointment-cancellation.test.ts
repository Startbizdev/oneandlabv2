import { canCancelAppointment } from '@oneandlab/shared-utils';

describe('canCancelAppointment', () => {
  it('nurse cancels only appointments she created', () => {
    expect(canCancelAppointment({ created_by: 'n1', assigned_nurse_id: null }, { role: 'nurse', id: 'n1' })).toBe(true);
  });

  it('nurse cannot cancel an appointment sent by the platform or a pro, even when assigned', () => {
    expect(canCancelAppointment({ created_by: 'patient-1', assigned_nurse_id: 'n1' }, { role: 'nurse', id: 'n1' })).toBe(false);
    expect(canCancelAppointment({ created_by: 'pro-1', assigned_nurse_id: 'n1' }, { role: 'nurse', id: 'n1' })).toBe(false);
  });

  it('pro and patient cancel only their own appointments', () => {
    expect(canCancelAppointment({ created_by: 'pro-1' }, { role: 'pro', id: 'pro-1' })).toBe(true);
    expect(canCancelAppointment({ created_by: 'n1' }, { role: 'pro', id: 'pro-1' })).toBe(false);
    expect(canCancelAppointment({ created_by: 'p1' }, { role: 'patient', id: 'p1' })).toBe(true);
    expect(canCancelAppointment({ created_by: 'n1' }, { role: 'patient', id: 'p1' })).toBe(false);
  });

  it('lab keeps creator or assignment, preleveur keeps assignment', () => {
    expect(canCancelAppointment({ created_by: 'n1', assigned_lab_id: 'lab-1' }, { role: 'lab', id: 'lab-1' })).toBe(true);
    expect(canCancelAppointment({ created_by: 'n1', assigned_to: 'prel-1' }, { role: 'preleveur', id: 'prel-1' })).toBe(true);
    expect(canCancelAppointment({ created_by: 'prel-1' }, { role: 'preleveur', id: 'prel-1' })).toBe(false);
  });

  it('super admin cancels anything, unknown viewer nothing', () => {
    expect(canCancelAppointment(null, { role: 'super_admin', id: 'a1' })).toBe(true);
    expect(canCancelAppointment({ created_by: '' }, { role: 'patient', id: '' })).toBe(false);
  });
});

import { offerLinkAppointmentId } from '../../features/navigation/utils/offer-link';

describe('offerLinkAppointmentId', () => {
  it('lit le RDV partagé depuis openAppointment', () => {
    expect(offerLinkAppointmentId({ openAppointment: 'a1', shareToken: 't' })).toBe('a1');
  });

  it('ignore appointment_id, paramètre de route du détail de passage', () => {
    expect(offerLinkAppointmentId({ appointment_id: 'a1' })).toBeNull();
  });

  it('ignore une valeur absente, vide ou multiple', () => {
    expect(offerLinkAppointmentId(null)).toBeNull();
    expect(offerLinkAppointmentId({ openAppointment: '' })).toBeNull();
    expect(offerLinkAppointmentId({ openAppointment: ['a1', 'a2'] })).toBeNull();
  });
});

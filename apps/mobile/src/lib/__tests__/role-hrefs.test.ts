import {
  appointmentDetailHref,
  appointmentEditHref,
  appointmentsListHref,
  bookingNewHref,
  pharmacyOrderDetailHref,
  pharmacyOrderNewHref,
  pharmacyOrdersListHref,
  staffPatientHref,
} from '../../navigation/role-hrefs';
import {
  pharmacyOrderMessagesHref,
  pharmacyOrderPrescriptionsHref,
} from '../../features/pharmacy-orders/utils/prescriptions-route';

describe('role hrefs', () => {
  it('opens the appointment detail of each role, query params kept alongside the id', () => {
    expect(appointmentDetailHref('/(preleveur)', 'a1', { alreadyAccepted: '1' })).toEqual({
      pathname: '/(preleveur)/appointment/[id]',
      params: { alreadyAccepted: '1', id: 'a1' },
    });
    expect(appointmentDetailHref('/(patient)', 'a2')).toEqual({
      pathname: '/(patient)/appointment/[id]',
      params: { id: 'a2' },
    });
  });

  it('never lets a query param override the appointment id', () => {
    expect(appointmentDetailHref('/(nurse)', 'a1', { id: 'other' })).toEqual({
      pathname: '/(nurse)/appointment/[id]',
      params: { id: 'a1' },
    });
  });

  it('only offers staff rescheduling', () => {
    expect(appointmentEditHref('/(pro)', 'a1')).toEqual({
      pathname: '/(pro)/appointment/[id]/edit',
      params: { id: 'a1' },
    });
    expect(appointmentEditHref('/(patient)', 'a1')).toBeNull();
  });

  it('targets an existing appointments tab for every role', () => {
    expect(appointmentsListHref('/(nurse)')).toBe('/(nurse)/(tabs)/appointments');
    expect(appointmentsListHref('/(preleveur)')).toBe('/(preleveur)/(tabs)');
    expect(appointmentsListHref('/(patient)')).toBe('/(patient)/(tabs)/appointments');
  });

  it('routes booking to the staff wizard or the patient booking', () => {
    expect(bookingNewHref('/(preleveur)', { patient_id: 'p1' })).toEqual({
      pathname: '/(preleveur)/appointments/new',
      params: { patient_id: 'p1' },
    });
    expect(bookingNewHref('/(patient)', { relative_id: 'r1' })).toEqual({
      pathname: '/(patient)/booking/new',
      params: { relative_id: 'r1' },
    });
  });

  it('opens the staff patient file and its sections', () => {
    expect(staffPatientHref('/(pro)', 'p1')).toEqual({ pathname: '/(pro)/patient/[id]', params: { id: 'p1' } });
    expect(staffPatientHref('/(nurse)', 'p1', 'health-record')).toEqual({
      pathname: '/(nurse)/patient/[id]/health-record',
      params: { id: 'p1' },
    });
  });

  it('builds pharmacy order routes per role', () => {
    expect(pharmacyOrderNewHref('/(nurse)', 'p1')).toEqual({
      pathname: '/(nurse)/commandes-pharmacie/new',
      params: { patientId: 'p1' },
    });
    expect(pharmacyOrderNewHref('/(pro)')).toEqual({ pathname: '/(pro)/commandes-pharmacie/new', params: {} });
    expect(pharmacyOrderNewHref('/(patient)', 'p1')).toBe('/(patient)/traitements/new');
    expect(pharmacyOrdersListHref('/(nurse)')).toBe('/(nurse)/commandes-pharmacie');
    expect(pharmacyOrdersListHref('/(patient)')).toBe('/(patient)/traitements');
    expect(pharmacyOrderDetailHref('/(patient)', 'o1')).toEqual({
      pathname: '/(patient)/traitements/[id]',
      params: { id: 'o1' },
    });
  });

  it('opens the prescriptions of a received order from the pharmacy inbox', () => {
    expect(pharmacyOrderPrescriptionsHref('/(pro)', 'received', 'o1')).toEqual({
      pathname: '/(pro)/commandes-recues/[id]/ordonnances',
      params: { id: 'o1' },
    });
    expect(pharmacyOrderPrescriptionsHref('/(nurse)', 'sent', 'o1')).toEqual({
      pathname: '/(nurse)/commandes-pharmacie/[id]/ordonnances',
      params: { id: 'o1' },
    });
    expect(pharmacyOrderPrescriptionsHref('/(patient)', 'sent', 'o1')).toEqual({
      pathname: '/(patient)/traitements/[id]/ordonnances',
      params: { id: 'o1' },
    });
    expect(pharmacyOrderPrescriptionsHref('/(nurse)', 'sent', '')).toBeNull();
  });

  it('opens the messages of a pharmacy order, scrolled to the notified message', () => {
    expect(pharmacyOrderMessagesHref('/(pro)', 'received', 'o1', 'm1')).toEqual({
      pathname: '/(pro)/commandes-recues/[id]/messages',
      params: { id: 'o1', messageId: 'm1' },
    });
    expect(pharmacyOrderMessagesHref('/(pro)', 'sent', 'o1')).toEqual({
      pathname: '/(pro)/commandes-pharmacie/[id]/messages',
      params: { id: 'o1' },
    });
    expect(pharmacyOrderMessagesHref('/(nurse)', 'sent', 'o1')).toEqual({
      pathname: '/(nurse)/commandes-pharmacie/[id]/messages',
      params: { id: 'o1' },
    });
    expect(pharmacyOrderMessagesHref('/(patient)', 'sent', 'o1')).toEqual({
      pathname: '/(patient)/traitements/[id]/messages',
      params: { id: 'o1' },
    });
    expect(pharmacyOrderMessagesHref('/(patient)', 'sent', '')).toBeNull();
  });
});

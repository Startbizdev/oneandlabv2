import {
  BOOKING_DRAFT_TTL_MS,
  bookingDraftOwnerKey,
  hasBookingDraftContent,
  isBookingDraftExpired,
  pruneBookingDrafts,
  restoredBookingStep,
  sanitizeDraftFormDataByService,
  type BookingDraft,
  type BookingDraftData,
} from '../../features/appointments/form/utils/booking-draft';

function draftData(overrides: Partial<BookingDraftData> = {}): BookingDraftData {
  return {
    step: 1,
    wizardIndex: 0,
    selectedServices: [{ id: 'svc-1', type: 'nursing', name: 'Pansement', category_id: 'cat-1' }],
    formDataByService: {},
    patient: {
      first_name: 'Ana',
      last_name: 'Martin',
      email: '',
      phone: '',
      gender: '',
      birth_date: '',
      address: null,
    },
    addressComplement: '',
    selectedPatientId: '',
    patientMode: 'existing',
    selectedRelativeId: null,
    labPreferenceMode: 'platform_match',
    preferredLabBrandId: null,
    nurseAssignmentMode: 'cary_dispatch',
    proLinkedNurseId: '',
    externalNursePhone: '',
    ...overrides,
  };
}

describe('booking draft', () => {
  it('is scoped to the user id and role', () => {
    expect(bookingDraftOwnerKey({ id: 'u1', role: 'patient' })).toBe('patient:u1');
    expect(bookingDraftOwnerKey({ id: 'u1', role: 'pro' })).toBe('pro:u1');
    expect(bookingDraftOwnerKey({ id: 'u1', role: null })).toBeNull();
    expect(bookingDraftOwnerKey(null)).toBeNull();
  });

  it('expires after 24 hours', () => {
    const now = 1_000_000_000_000;
    const fresh: BookingDraft = { savedAt: now - BOOKING_DRAFT_TTL_MS + 1, data: draftData() };
    const stale: BookingDraft = { savedAt: now - BOOKING_DRAFT_TTL_MS - 1, data: draftData() };
    expect(isBookingDraftExpired(fresh, now)).toBe(false);
    expect(isBookingDraftExpired(stale, now)).toBe(true);
  });

  it('never keeps documents or local file uris', () => {
    const clean = sanitizeDraftFormDataByService({
      'svc-1': {
        scheduled_at: '2026-10-02',
        notes: 'Sonner deux fois',
        care_options: { size: 'M', scan: { uri: 'file:///scan.jpg', name: 'scan.jpg' } },
        files: { prescription: { uri: 'file:///rx.pdf', name: 'rx.pdf' } },
        attachments: [{ uri: 'file:///a.jpg' }, 'keep'],
      },
    });
    expect(clean).toEqual({
      'svc-1': {
        scheduled_at: '2026-10-02',
        notes: 'Sonner deux fois',
        care_options: { size: 'M' },
        attachments: ['keep'],
      },
    });
  });

  it('requires at least one selected care to be resumable', () => {
    expect(hasBookingDraftContent(draftData())).toBe(true);
    expect(hasBookingDraftContent(draftData({ selectedServices: [] }))).toBe(false);
  });

  it('restores a step reachable with the selected cares', () => {
    expect(restoredBookingStep(draftData({ step: 1 }), 'patient')).toBe(1);
    expect(restoredBookingStep(draftData({ step: 2 }), 'patient')).toBe(1);
    expect(restoredBookingStep(draftData({ step: 3, selectedServices: [] }), 'patient')).toBe(0);
    const blood = [{ id: 'b1', type: 'blood_test', name: 'Bilan', category_id: 'c2' }];
    expect(restoredBookingStep(draftData({ step: 2, selectedServices: blood }), 'patient')).toBe(2);
    expect(restoredBookingStep(draftData({ step: 2, selectedServices: blood }), 'preleveur')).toBe(1);
  });

  it('drops malformed and expired drafts read from storage', () => {
    const now = Date.now();
    const kept: BookingDraft = { savedAt: now - 1000, data: draftData() };
    const pruned = pruneBookingDrafts(
      {
        'patient:u1': kept,
        'patient:u2': { savedAt: now - BOOKING_DRAFT_TTL_MS - 1, data: draftData() },
        'patient:u3': { savedAt: now, data: { step: 'x' } },
        'patient:u4': 'garbage',
      },
      now,
    );
    expect(pruned).toEqual({ 'patient:u1': kept });
    expect(pruneBookingDrafts(null, now)).toEqual({});
  });
});

import type { AddressPayload } from '@/features/appointments/form/types';

type CreatePatientDraft = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: AddressPayload | null;
  addressComplement: string;
};

function addressForApi(address: AddressPayload | null, complement: string): Record<string, unknown> | undefined {
  if (!address?.label?.trim()) return undefined;
  return {
    label: address.label.trim(),
    lat: address.lat,
    lng: address.lng,
    ...(address.city ? { city: address.city } : {}),
    ...(address.postal_code ? { postal_code: address.postal_code } : {}),
    ...(complement.trim() ? { complement: complement.trim() } : {}),
  };
}

/** Corps de POST /patients : champs vides omis, consentement du patient déjà recueilli par le formulaire. */
export function createPatientBody(draft: CreatePatientDraft): Record<string, unknown> {
  const phone = draft.phone.trim();
  const email = draft.email.trim();
  const address = addressForApi(draft.address, draft.addressComplement);
  return {
    first_name: draft.firstName.trim(),
    last_name: draft.lastName.trim(),
    ...(phone ? { phone } : {}),
    ...(email ? { email } : {}),
    ...(address ? { address } : {}),
    patient_booking_consent: true,
  };
}

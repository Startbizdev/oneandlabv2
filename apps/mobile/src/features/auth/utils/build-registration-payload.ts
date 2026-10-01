import { resolveRegistrationRole, splitProfessionalId } from '@oneandlab/shared-types';
import type { AddressPayload } from '@/features/appointments/form/types';
import type {
  GuestToUserPayload,
  RegistrationRequestPayload,
} from '@/features/auth/api/registration.service';
import type { RegisterFormValues } from '@/features/auth/utils/register-form-validation';

export interface RegisterPayloadInput extends RegisterFormValues {
  phone: string;
  address: AddressPayload | null;
}

function addressPayload(address: AddressPayload | null) {
  const label = address?.label?.trim();
  return label && address ? { label, lat: address.lat, lng: address.lng } : undefined;
}

/** Corps de `POST /auth/guest-to-user` (patient : compte créé immédiatement). */
export function buildGuestToUserPayload(values: RegisterPayloadInput): GuestToUserPayload {
  return {
    email: values.email.trim(),
    first_name: values.firstName.trim(),
    last_name: values.lastName.trim(),
    phone: values.phone.trim() || undefined,
    birth_date: values.birthDate.trim(),
    gender: values.gender,
    address: addressPayload(values.address),
  };
}

/** Corps de `POST /registration-requests` (infirmier / pro : demande validée par l'équipe). */
export function buildRegistrationRequestPayload(
  values: RegisterPayloadInput,
): RegistrationRequestPayload {
  const effectiveRole =
    values.role === 'pro' ? resolveRegistrationRole('pro', values.emploi) : 'nurse';
  const base = {
    role: effectiveRole,
    email: values.email.trim(),
    first_name: values.firstName.trim(),
    last_name: values.lastName.trim(),
    phone: values.phone.trim() || undefined,
    address: addressPayload(values.address),
  };
  if (effectiveRole !== 'nurse') {
    return { ...base, rpps: values.proRpps.replace(/\s/g, ''), emploi: values.emploi.trim() };
  }
  const split = splitProfessionalId(values.role === 'pro' ? values.proRpps : values.professionalId);
  return {
    ...base,
    ...(split.rpps ? { rpps: split.rpps } : {}),
    ...(split.adeli ? { adeli: split.adeli } : {}),
    gender: values.gender,
  };
}

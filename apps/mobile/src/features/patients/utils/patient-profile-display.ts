import { formatBirthDateFr } from '@oneandlab/shared-utils';
import { GENDER_OPTIONS } from '@/constants/pro-emploi';
import type { PatientProfile } from '../api/patient-profile.service';

export function patientAddressLines(
  address?: PatientProfile['address'],
): { main: string; complement?: string } | null {
  if (!address || typeof address !== 'object') return null;
  const label = typeof address.label === 'string' ? address.label.trim() : '';
  const complement =
    typeof address.complement === 'string' ? address.complement.trim() : '';
  if (!label && !complement) return null;
  return {
    main: label || complement,
    complement: label && complement ? complement : undefined,
  };
}

export function patientGenderLabel(gender?: string | null): string | null {
  if (!gender) return null;
  return GENDER_OPTIONS.find((g) => g.value === gender)?.label ?? gender;
}

export function patientBirthLine(birthDate?: string | null, ageYears?: number | null): string | null {
  if (!birthDate) return null;
  const formatted = formatBirthDateFr(birthDate);
  if (!formatted) return null;
  if (ageYears != null) {
    return `${formatted} · ${ageYears} ans`;
  }
  return formatted;
}

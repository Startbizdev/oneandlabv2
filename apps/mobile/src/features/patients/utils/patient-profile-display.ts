import { ageFromBirthDate, formatBirthDateFr, formatFrenchPhoneDisplay } from '@oneandlab/shared-utils';
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

export type IdentityInfoLine = { label: string; value: string; secondary?: string };

/** Lignes « Informations » d'une fiche patient ou proche, dans l'ordre d'affichage. */
export function identityInfoLines(identity: {
  birthDate?: string | null;
  gender?: string | null;
  nir?: string | null;
  address?: PatientProfile['address'] | null;
  phone?: string | null;
  email?: string | null;
}): IdentityInfoLine[] {
  const lines: IdentityInfoLine[] = [];
  const birthLine = patientBirthLine(identity.birthDate, ageFromBirthDate(identity.birthDate));
  const genderLine = patientGenderLabel(identity.gender);
  const nir = identity.nir?.trim();
  const address = patientAddressLines(identity.address ?? undefined);
  const phone = identity.phone?.trim();
  const email = identity.email?.trim();
  if (birthLine) lines.push({ label: 'Date de naissance', value: birthLine });
  if (genderLine) lines.push({ label: 'Genre', value: genderLine });
  if (nir) lines.push({ label: 'N° de sécurité sociale', value: nir });
  if (address) {
    lines.push({
      label: 'Adresse',
      value: address.main,
      ...(address.complement ? { secondary: address.complement } : {}),
    });
  }
  if (phone) lines.push({ label: 'Téléphone', value: formatFrenchPhoneDisplay(phone) });
  if (email) lines.push({ label: 'E-mail', value: email });
  return lines;
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

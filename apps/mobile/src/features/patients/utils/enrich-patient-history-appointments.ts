import type { Appointment } from '@oneandlab/shared-types';
import type { PatientProfile } from '../api/patient-profile.service';
import { beneficiaryFirstName, beneficiaryLastName } from '@/utils/beneficiary-display-name';

type AptExt = Appointment & {
  relative?: { first_name?: string; last_name?: string };
  beneficiary_profile_image_url?: string | null;
  beneficiary_gender?: string | null;
};

/** Complète nom / photo bénéficiaire quand le payload liste est incomplet (dossier patient connu). */
export function enrichPatientHistoryAppointments(
  appointments: Appointment[],
  profile: Pick<PatientProfile, 'first_name' | 'last_name' | 'gender' | 'profile_image_url'> | undefined,
): Appointment[] {
  if (!profile) return appointments;

  return appointments.map((apt) => {
    const ext = apt as AptExt;
    const hasName =
      Boolean(beneficiaryFirstName(apt)) ||
      Boolean(beneficiaryLastName(apt)) ||
      Boolean(ext.relative?.first_name?.trim());

    if (!hasName && (profile.first_name?.trim() || profile.last_name?.trim())) {
      const fd = { ...((apt.form_data ?? {}) as Record<string, unknown>) };
      if (!String(fd.first_name ?? '').trim()) fd.first_name = profile.first_name ?? '';
      if (!String(fd.last_name ?? '').trim()) fd.last_name = profile.last_name ?? '';
      return {
        ...apt,
        form_data: fd,
        beneficiary_profile_image_url:
          ext.beneficiary_profile_image_url ?? profile.profile_image_url ?? null,
        beneficiary_gender: ext.beneficiary_gender ?? profile.gender ?? null,
      } as Appointment;
    }

    if (ext.beneficiary_profile_image_url == null && profile.profile_image_url) {
      return {
        ...apt,
        beneficiary_profile_image_url: profile.profile_image_url,
        beneficiary_gender: ext.beneficiary_gender ?? profile.gender ?? null,
      } as Appointment;
    }

    return apt;
  });
}

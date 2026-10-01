import type { Appointment } from '@oneandlab/shared-types';
import type { PatientProfile } from '../api/patient-profile.service';
import { beneficiaryFirstName, beneficiaryLastName } from '@/utils/beneficiary-display-name';

type HistoryAppointment = Appointment & {
  relative?: { first_name?: string; last_name?: string };
  beneficiary_profile_image_url?: string | null;
  beneficiary_gender?: string | null;
};

/** Complète nom / photo bénéficiaire quand le payload liste est incomplet (dossier patient connu). */
export function enrichPatientHistoryAppointments(
  appointments: HistoryAppointment[],
  profile: Pick<PatientProfile, 'first_name' | 'last_name' | 'gender' | 'profile_image_url'> | undefined,
): HistoryAppointment[] {
  if (!profile) return appointments;

  return appointments.map((apt) => {
    const hasName =
      Boolean(beneficiaryFirstName(apt)) ||
      Boolean(beneficiaryLastName(apt)) ||
      Boolean(apt.relative?.first_name?.trim());

    if (!hasName && apt.form_data && (profile.first_name?.trim() || profile.last_name?.trim())) {
      return {
        ...apt,
        form_data: {
          ...apt.form_data,
          first_name: String(apt.form_data.first_name ?? '').trim() || profile.first_name || '',
          last_name: String(apt.form_data.last_name ?? '').trim() || profile.last_name || '',
        },
        beneficiary_profile_image_url:
          apt.beneficiary_profile_image_url ?? profile.profile_image_url ?? null,
        beneficiary_gender: apt.beneficiary_gender ?? profile.gender ?? null,
      };
    }

    if (apt.beneficiary_profile_image_url == null && profile.profile_image_url) {
      return {
        ...apt,
        beneficiary_profile_image_url: profile.profile_image_url,
        beneficiary_gender: apt.beneficiary_gender ?? profile.gender ?? null,
      };
    }

    return apt;
  });
}

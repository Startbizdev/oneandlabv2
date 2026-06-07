import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import type { Appointment } from '@oneandlab/shared-types';
import { isBloodTestAppointment, isNursingAppointment } from '@oneandlab/shared-utils';
import {
  appointmentAssigneeGender,
  appointmentBeneficiaryGender,
  beneficiaryDisplayName,
  beneficiaryFirstName,
  beneficiaryLastName,
} from '@/features/appointments/detail/utils/patient-appointment-display';
import {
  offerAddressLine,
  offerLabPartnerFromAppointment,
} from '@/features/appointments/detail/utils/offer-appointment-display';
import { appointmentAddressLine, appointmentCreneauLabel } from '@/utils/appointment-display';
import { capitalizeFrench } from '@/utils/appointment-datetime-fr';
import { rdvCatalogDisplayLines } from '@/utils/rdv-catalog-lines';

dayjs.locale('fr');

export type RdvListCardViewerRole =
  | 'patient'
  | 'nurse'
  | 'pro'
  | 'preleveur'
  | 'lab'
  | 'demande';

type AptExt = Appointment & Record<string, unknown>;

export type RdvMaquetteCounterparty = {
  /** Prénom seul (carte patient) ou prénom + nom (carte pro). */
  name: string;
  /** Rôle après la virgule (gris) ; vide = pas de virgule. */
  subtitle: string;
  profileImageUrl?: string | null;
  gender?: string | null;
};

function capitalizeWords(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function beneficiaryFullName(apt: Appointment): string {
  const first = beneficiaryFirstName(apt);
  const last = beneficiaryLastName(apt);
  const joined = [first, last].filter(Boolean).join(' ').trim();
  if (joined) return capitalizeWords(joined);
  const fallback = beneficiaryDisplayName(apt);
  return fallback && fallback !== '—' ? capitalizeWords(fallback) : '';
}

function professionalFirstName(displayName: string, fallback: string): string {
  const trimmed = displayName.trim() || fallback;
  const part = trimmed.split(/\s+/).filter(Boolean)[0];
  return part ? capitalizeWords(part) : fallback;
}

/** Badge « Demain », « Vendredi », « Aujourd'hui »… */
export function rdvMaquetteDayBadge(scheduledAt?: string | null): string {
  if (!scheduledAt) return '';
  const d = dayjs(scheduledAt);
  const today = dayjs().startOf('day');
  const target = d.startOf('day');
  const diff = target.diff(today, 'day');
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return 'Demain';
  if (diff > 1 && diff < 7) return capitalizeFrench(d.format('dddd'));
  return capitalizeFrench(d.format('ddd D MMM'));
}

/** Créneau en gros : « 9h00 - 11h00 », « Toute la journée », urgence VIP… (pas l’heure seule du RDV). */
export function rdvMaquetteTimeLabel(apt: Appointment): string {
  const label = appointmentCreneauLabel(apt).trim();
  return label || 'Non précisé';
}

/** Date complète pied de carte (ex. « 18 mai 2025 »). */
export function rdvMaquetteFooterDate(scheduledAt?: string | null): string {
  if (!scheduledAt) return '';
  return capitalizeFrench(dayjs(scheduledAt).format('D MMMM YYYY'));
}

/** Libellé soin(s) affiché sous le créneau — virgules pour les lots, sans titre générique. */
export function rdvMaquetteActsLine(apt: Appointment, role?: RdvListCardViewerRole): string {
  const lines = rdvCatalogDisplayLines(
    apt,
    role === 'patient' ? { hideStaffOnlyCares: true } : undefined,
  );
  const labels = lines.map((l) => l.label.trim()).filter(Boolean);
  if (labels.length === 0) {
    return apt.category_name?.trim() || 'Rendez-vous';
  }
  if (labels.length > 1) {
    return [...labels].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' })).join(', ');
  }
  return labels[0]!;
}

export function rdvMaquetteAddressLine(
  apt: Appointment,
  role: RdvListCardViewerRole,
): string {
  if (role === 'demande') {
    const offer = offerAddressLine(apt);
    if (offer && offer !== '—') return offer;
  }
  return appointmentAddressLine(apt);
}

function assigneeForPatientView(apt: AptExt): RdvMaquetteCounterparty | null {
  if (isNursingAppointment(apt.type)) {
    const display = String(apt.assigned_nurse_display_name ?? '').trim();
    if (!display && !apt.assigned_nurse_id) return null;
    return {
      name: professionalFirstName(display, 'Professionnel'),
      subtitle: 'Infirmier(e)',
      profileImageUrl: apt.assigned_nurse_profile_image_url as string | null | undefined,
      gender: appointmentAssigneeGender(apt, 'nurse'),
    };
  }
  if (isBloodTestAppointment(apt.type)) {
    const preleveur = String(apt.assigned_to_display_name ?? '').trim();
    if (preleveur || apt.assigned_to) {
      return {
        name: professionalFirstName(preleveur, 'Préleveur'),
        subtitle: 'Préleveur',
        profileImageUrl: apt.assigned_to_profile_image_url as string | null | undefined,
        gender: appointmentAssigneeGender(apt, 'preleveur'),
      };
    }
    const lab = String(apt.assigned_lab_display_name ?? '').trim();
    if (lab || apt.assigned_lab_id) {
      return {
        name: lab || 'Laboratoire',
        subtitle: '',
        profileImageUrl: apt.assigned_lab_profile_image_url as string | null | undefined,
        gender: appointmentAssigneeGender(apt, 'lab'),
      };
    }
  }
  return null;
}

function patientForProView(apt: Appointment): RdvMaquetteCounterparty {
  const ext = apt as AptExt;
  const fullName = beneficiaryFullName(apt) || 'Patient';
  return {
    name: fullName,
    subtitle: '',
    profileImageUrl:
      (ext.beneficiary_profile_image_url as string | null | undefined) ?? null,
    gender: appointmentBeneficiaryGender(apt),
  };
}

/** Photo ronde : patient côté pro / demandes, professionnel côté patient. */
export function rdvMaquetteAvatarCounterparty(
  apt: Appointment,
  role: RdvListCardViewerRole,
): RdvMaquetteCounterparty | null {
  if (role === 'patient') return assigneeForPatientView(apt as AptExt);
  if (role === 'demande' || role === 'nurse' || role === 'pro' || role === 'preleveur' || role === 'lab') {
    return patientForProView(apt);
  }
  return null;
}

/** Pied de carte (nom + rôle). */
export function rdvMaquetteFooterCounterparty(
  apt: Appointment,
  role: RdvListCardViewerRole,
): RdvMaquetteCounterparty | null {
  const ext = apt as AptExt;
  if (role === 'patient') return assigneeForPatientView(ext);
  if (role === 'demande') {
    const lab = offerLabPartnerFromAppointment(apt);
    return {
      name: lab?.displayName?.trim() || 'Demande',
      subtitle: lab ? 'Laboratoire partenaire' : 'En attente',
      profileImageUrl: null,
    };
  }
  if (role === 'nurse' || role === 'pro' || role === 'preleveur' || role === 'lab') {
    return patientForProView(apt);
  }
  return null;
}

/** @deprecated Utiliser `rdvMaquetteFooterCounterparty`. */
export function rdvMaquetteCounterparty(
  apt: Appointment,
  role: RdvListCardViewerRole,
): RdvMaquetteCounterparty | null {
  return rdvMaquetteFooterCounterparty(apt, role);
}

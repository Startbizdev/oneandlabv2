/** Libellés, dates et statuts partagés entre la liste patient (`PatientRdvListRow`) et la page. */

import {
  filterRdvCatalogLinesForPatientViewer,
  isStaffOnlyCareCategory,
} from '@oneandlab/shared-utils';
import { appointmentListAddressLine } from '~/utils/address-display';
import {
  MULTI_BLOOD_TEST_ITEMS_CARD_LABEL,
  MULTI_NURSING_ITEMS_CARD_LABEL,
} from '~/utils/appointment-type-rules';
import { formatPatientUrgentCreneauShortFr } from '~/utils/patient-urgency-display';

function capitalizeWords(str: string): string {
  if (!str) return '';
  return str
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/** Libellé « Prénom Nom » pour la carte (formulaire ou proche du RDV). */
export function patientRdvPatientHeadline(apt: any): string {
  if (!apt) return '';
  const fromForm =
    apt?.form_data?.first_name != null || apt?.form_data?.last_name != null
      ? [apt.form_data.first_name, apt.form_data.last_name]
          .filter(Boolean)
          .map((s: string) => String(s).trim())
          .join(' ')
      : '';
  if (fromForm) return capitalizeWords(fromForm);
  const rel = apt?.relative;
  if (rel?.first_name != null || rel?.last_name != null) {
    const parts = [rel.first_name, rel.last_name].filter(Boolean).map((s: string) => String(s).trim());
    return capitalizeWords(parts.join(' '));
  }
  return '';
}

/** Une ligne d’adresse pour sous-titre carte ; vide si rien à montrer. */
export function patientRdvAddressLine(apt: any): string {
  if (!apt) return '';
  return appointmentListAddressLine(apt).trim();
}

export type PatientRdvCategorySummaryOpts = {
  /** Nombre de RDV prise de sang dans la même carte (lot `creation_batch_id`). >1 ⇒ libellé lot. */
  bloodTestBatchPeerTotal?: number;
  /** Index 0-based dans ce lot trié par date — 0 ⇒ titre « Prélèvement laboratoire ». */
  bloodTestBatchPeerIndex?: number;
  /** Même logique pour un lot multisoins infirmiers (plusieurs lignes `nursing`). */
  nursingBatchPeerTotal?: number;
  nursingBatchPeerIndex?: number;
};

/** Titre soin comme liste pro (`AppointmentListCard`). */
export function patientRdvAppointmentCategorySummary(apt: any, opts?: PatientRdvCategorySummaryOpts): string {
  const items = Array.isArray(apt?.blood_test_items) ? apt.blood_test_items : [];
  const batchPeers = opts?.bloodTestBatchPeerTotal ?? 0;
  const batchIdx = opts?.bloodTestBatchPeerIndex ?? 0;

  const nursingRaw =
    Array.isArray(apt?.nursing_items_display) && apt.nursing_items_display.length
      ? apt.nursing_items_display
      : Array.isArray(apt?.nursing_items)
        ? apt.nursing_items
        : [];
  const nurBatchPeers = opts?.nursingBatchPeerTotal ?? 0;
  const nurBatchIdx = opts?.nursingBatchPeerIndex ?? 0;

  /** Plusieurs actes sur un même RDV (résolu côté API : table + form_data). */
  if (apt?.type === 'blood_test' && items.length > 1) {
    return MULTI_BLOOD_TEST_ITEMS_CARD_LABEL;
  }
  if (apt?.type === 'nursing' && nursingRaw.length > 1) {
    return MULTI_NURSING_ITEMS_CARD_LABEL;
  }
  /** Plusieurs RDV prise de sang distincts mais même réservation (`creation_batch_id`). */
  if (apt?.type === 'blood_test' && batchPeers > 1) {
    if (batchIdx === 0) return MULTI_BLOOD_TEST_ITEMS_CARD_LABEL;
    return `Prélèvement ${batchIdx + 1}`;
  }
  /** Plusieurs RDV soins distincts, même lot. */
  if (apt?.type === 'nursing' && nurBatchPeers > 1) {
    if (nurBatchIdx === 0) return MULTI_NURSING_ITEMS_CARD_LABEL;
    return `Soin ${nurBatchIdx + 1}`;
  }

  const name = apt?.category_name || apt?.form_data?.category_name;
  const label = name ? patientVisibleCareLabel(String(name).trim(), true) : '';
  return label || (apt?.type === 'blood_test' ? 'Prélèvement' : 'Soin');
}

export type PatientRdvCatalogDisplayOpts = {
  /** Vue patient : masque certificat de décès et actes staff-only. */
  hideStaffOnlyCares?: boolean;
};

function patientVisibleCareLabel(label: string, hideStaffOnlyCares?: boolean): string {
  const trimmed = String(label ?? '').trim();
  if (!trimmed || !hideStaffOnlyCares) return trimmed;
  return isStaffOnlyCareCategory({ label: trimmed, name: trimmed }) ? '' : trimmed;
}

/** Ligne affichée sous la date (image + titre du soin / de l’analyse). */
export type PatientRdvCatalogLine = {
  category_id: string | null;
  category_image_url?: string | null;
  label: string;
};

/**
 * Lignes catalogue pour la carte liste patient (une entrée par analyse ou par soin du panier / du lot fusionné).
 */
export function patientRdvCatalogDisplayLines(
  apt: any,
  opts?: PatientRdvCatalogDisplayOpts,
): PatientRdvCatalogLine[] {
  if (!apt) {
    return [{ category_id: null, label: 'Rendez-vous' }];
  }
  const t = apt?.type;
  if (t === 'blood_test') {
    const raw = Array.isArray(apt.blood_test_items) ? apt.blood_test_items : [];
    if (raw.length > 0) {
      return finalizePatientRdvCatalogLines(
        raw.map((it: any) => ({
          category_id: it?.category_id != null && String(it.category_id).trim() !== '' ? String(it.category_id) : null,
          category_image_url: it?.category_image_url ?? null,
          label:
            String(it?.label ?? it?.category_name ?? apt?.category_name ?? 'Analyse').trim() || 'Analyse',
        })),
        opts,
      );
    }
  }
  if (t === 'nursing' || t === 'nurse') {
    const raw =
      Array.isArray(apt.nursing_items_display) && apt.nursing_items_display.length
        ? apt.nursing_items_display
        : Array.isArray(apt.nursing_items)
          ? apt.nursing_items
          : [];
    if (raw.length > 0) {
      return finalizePatientRdvCatalogLines(
        raw.map((it: any) => ({
          category_id: it?.category_id != null && String(it.category_id).trim() !== '' ? String(it.category_id) : null,
          category_image_url: it?.category_image_url ?? null,
          label: String(it?.label ?? it?.category_name ?? '').trim() || 'Soin',
        })),
        opts,
      );
    }
  }
  const catId =
    apt?.category_id != null && String(apt.category_id).trim() !== ''
      ? String(apt.category_id)
      : apt?.form_data?.category_id != null && String(apt.form_data.category_id).trim() !== ''
        ? String(apt.form_data.category_id)
        : null;
  const label = String(
    apt?.category_name ?? apt?.form_data?.category_name ?? (t === 'blood_test' ? 'Prélèvement' : 'Soin'),
  ).trim();
  return finalizePatientRdvCatalogLines(
    [
      {
        category_id: catId,
        category_image_url: apt?.category_image_url ?? null,
        label: label || (t === 'blood_test' ? 'Prélèvement' : 'Soin'),
      },
    ],
    opts,
  );
}

function finalizePatientRdvCatalogLines(
  lines: PatientRdvCatalogLine[],
  opts?: PatientRdvCatalogDisplayOpts,
): PatientRdvCatalogLine[] {
  return opts?.hideStaffOnlyCares ? filterRdvCatalogLinesForPatientViewer(lines) : lines;
}

/** Couleurs `UBadge` alignées dashboard infirmier. */
export function patientRdvStatusColor(status: string | undefined | null): string {
  const colors: Record<string, string> = {
    pending: 'warning',
    confirmed: 'info',
    planned: 'info',
    in_progress: 'primary',
    inProgress: 'primary',
    completed: 'success',
    canceled: 'error',
    cancelled: 'error',
    refused: 'error',
    expired: 'neutral',
  };
  return colors[status ?? ''] || 'neutral';
}

/** Date courte « Aujourd’hui » / jeu. 12 mai — comme `AppointmentListCard`. */
export function patientRdvFormatDateCompact(date: string | undefined | null): string {
  if (!date) return '—';
  try {
    const d = new Date(date);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
    const s = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  } catch {
    return '—';
  }
}

function capitalizeFirst(str: string): string {
  if (!str || str.length === 0) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function patientRdvAppointmentTypeLabel(apt: any): string {
  return apt?.type === 'blood_test' ? 'Prélèvement' : 'Soins infirmiers';
}

export function patientRdvTypeDeSoinLabel(
  apt: any,
  opts?: Pick<
    PatientRdvCategorySummaryOpts,
    'bloodTestBatchPeerTotal' | 'bloodTestBatchPeerIndex' | 'nursingBatchPeerTotal' | 'nursingBatchPeerIndex'
  >,
): string {
  const items = Array.isArray(apt?.blood_test_items) ? apt.blood_test_items : [];
  const batchPeers = opts?.bloodTestBatchPeerTotal ?? 0;
  const batchIdx = opts?.bloodTestBatchPeerIndex ?? 0;

  const nursingRaw =
    Array.isArray(apt?.nursing_items_display) && apt.nursing_items_display.length
      ? apt.nursing_items_display
      : Array.isArray(apt?.nursing_items)
        ? apt.nursing_items
        : [];
  const nurPeers = opts?.nursingBatchPeerTotal ?? 0;
  const nurIdx = opts?.nursingBatchPeerIndex ?? 0;

  if (apt?.type === 'blood_test' && items.length > 1) {
    return MULTI_BLOOD_TEST_ITEMS_CARD_LABEL;
  }
  if (apt?.type === 'nursing' && nursingRaw.length > 1) {
    return MULTI_NURSING_ITEMS_CARD_LABEL;
  }
  if (apt?.type === 'blood_test' && batchPeers > 1 && batchIdx === 0) {
    return MULTI_BLOOD_TEST_ITEMS_CARD_LABEL;
  }
  if (apt?.type === 'nursing' && nurPeers > 1 && nurIdx === 0) {
    return MULTI_NURSING_ITEMS_CARD_LABEL;
  }
  const name = apt?.category_name || apt?.form_data?.category_name;
  return name ? patientVisibleCareLabel(String(name).trim(), true) : '';
}

export function patientRdvAppointmentCardTitle(apt: any, opts?: PatientRdvCategorySummaryOpts): string {
  const peers = opts?.bloodTestBatchPeerTotal ?? 0;
  const nurPeers = opts?.nursingBatchPeerTotal ?? 0;
  if (apt?.type === 'blood_test' && peers > 1) {
    return patientRdvAppointmentCategorySummary(apt, opts);
  }
  if (apt?.type === 'nursing' && nurPeers > 1) {
    return patientRdvAppointmentCategorySummary(apt, opts);
  }
  return patientRdvTypeDeSoinLabel(apt, opts) || patientRdvAppointmentTypeLabel(apt);
}

export function patientRdvFormatDateShort(dateString: string): string {
  if (!dateString) return '—';
  const formatted = new Date(dateString).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return capitalizeFirst(formatted);
}

function formatAvailability(availability: string | object | null | undefined): string {
  if (availability == null) return '';
  try {
    let avail: any = availability;
    if (typeof availability === 'string') {
      const trimmed = availability.trim();
      if (!trimmed) return '';
      avail = JSON.parse(trimmed);
    }
    if (!avail || typeof avail !== 'object') return '';
    const urgent = formatPatientUrgentCreneauShortFr(avail);
    if (urgent) return urgent;
    if (avail.type === 'all_day') return 'Toute la journée';
    if (avail.type === 'custom' && Array.isArray(avail.range) && avail.range.length >= 2) {
      const start = Math.floor(Number(avail.range[0]));
      const end = Math.floor(Number(avail.range[1]));
      if (Number.isNaN(start) || Number.isNaN(end)) return '';
      return `${start}h00 - ${end}h00`;
    }
  } catch {
    // ignore
  }
  return '';
}

export function patientRdvGetCreneauLabel(appointment: any): string {
  const availability = appointment.form_data?.availability;
  const formatted = formatAvailability(availability);
  if (formatted) return formatted;
  if (appointment.scheduled_at) {
    try {
      const d = new Date(appointment.scheduled_at);
      return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      // ignore
    }
  }
  return 'Non précisé';
}

export function patientRdvStatusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
    confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
    planned: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
    in_progress: 'bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-200',
    inProgress: 'bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-200',
    completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
    cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    canceled: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    expired: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    refused: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
  };
  return map[status] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
}

export function patientRdvGetStatusLabel(status: string | undefined | null): string {
  const labels: Record<string, string> = {
    pending: 'En attente',
    confirmed: 'Confirmé',
    planned: 'Planifié',
    in_progress: 'En cours',
    inProgress: 'En cours',
    completed: 'Terminé',
    cancelled: 'Annulé',
    canceled: 'Annulé',
    expired: 'Expiré',
    refused: 'Refusé',
  };
  return labels[status ?? ''] ?? status ?? '—';
}

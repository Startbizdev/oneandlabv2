import type {
  AppointmentCoNurse,
  NurseCollaboration,
  NurseCollaborationCreateBody,
  NurseCollaborationScope,
} from '@oneandlab/shared-types';
import { formatAbsenceEndDateShort } from './patient-absence-display';

/** Plage maximale d'un remplacement (`POST /nurse/collaborations`, portée `range`). */
export const NURSE_COLLABORATION_RANGE_MAX_DAYS = 92;

export const NURSE_COLLABORATION_SCOPE_LABELS: Record<NurseCollaborationScope, string> = {
  appointment: 'Ce rendez-vous',
  series: 'Toute la série',
  range: 'Une période',
};

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

const INACTIVE_APPOINTMENT_STATUSES = new Set(['canceled', 'cancelled', 'completed', 'expired', 'refused']);

export type NurseCollaborationContext = {
  appointmentId?: string | null;
  passageSeriesId?: string | null;
  /** `false` : pas de portée « Une période » (ex. depuis une fiche, la tournée la propose). */
  allowRange?: boolean;
};

/** Portées proposées, dans l'ordre d'affichage ; « Toute la série » seulement pour un passage en série. */
export function nurseCollaborationScopeOptions(ctx: NurseCollaborationContext): NurseCollaborationScope[] {
  const scopes: NurseCollaborationScope[] = [];
  if (ctx.appointmentId) scopes.push('appointment');
  if (ctx.passageSeriesId) scopes.push('series');
  if (ctx.allowRange !== false) scopes.push('range');
  return scopes;
}

/** `GET` (filtré sur un RDV si fourni) et `POST` des collaborations. */
export function nurseCollaborationsPath(appointmentId?: string | null): string {
  return appointmentId
    ? `/nurse/collaborations?appointment_id=${encodeURIComponent(appointmentId)}`
    : '/nurse/collaborations';
}

export function nurseCollaborationPath(id: string): string {
  return `/nurse/collaborations/${encodeURIComponent(id)}`;
}

export function nursePickerSearchPath(search: string): string {
  return `/users?role=nurse&scope=picker&limit=20&search=${encodeURIComponent(search)}`;
}

/** Confrère trouvé par `GET /users?role=nurse&scope=picker` (`UserDirectoryHelpers::compactForPicker`). */
export type NursePickerUser = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  company_name?: string | null;
};

export function nursePickerDisplayName(user: NursePickerUser): string {
  return [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.email?.trim() || 'Infirmier';
}

/** Nombre de jours couverts, bornes incluses ; `null` si une date est invalide ou la fin précède le début. */
export function nurseCollaborationRangeDays(startDate: string, endDate: string): number | null {
  if (!ISO_DAY.test(startDate) || !ISO_DAY.test(endDate)) return null;
  const start = Date.UTC(Number(startDate.slice(0, 4)), Number(startDate.slice(5, 7)) - 1, Number(startDate.slice(8, 10)));
  const end = Date.UTC(Number(endDate.slice(0, 4)), Number(endDate.slice(5, 7)) - 1, Number(endDate.slice(8, 10)));
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
  return Math.round((end - start) / 86_400_000) + 1;
}

export type NurseCollaborationDraft = {
  coNurseId: string;
  scope: NurseCollaborationScope;
  appointmentId?: string | null;
  passageSeriesId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
};

export type NurseCollaborationBodyResult =
  | { ok: true; body: NurseCollaborationCreateBody }
  | { ok: false; error: string };

/** Corps de `POST /nurse/collaborations` ; le serveur reste seul juge (doublon, droits, plage). */
export function buildNurseCollaborationBody(draft: NurseCollaborationDraft): NurseCollaborationBodyResult {
  const coNurseId = draft.coNurseId.trim();
  if (!coNurseId) return { ok: false, error: 'Choisissez un confrère.' };
  if (draft.scope === 'appointment') {
    const appointmentId = draft.appointmentId?.trim();
    if (!appointmentId) return { ok: false, error: 'Rendez-vous introuvable.' };
    return { ok: true, body: { co_nurse_id: coNurseId, scope: 'appointment', appointment_id: appointmentId } };
  }
  if (draft.scope === 'series') {
    const seriesId = draft.passageSeriesId?.trim();
    if (!seriesId) return { ok: false, error: 'Série introuvable.' };
    return { ok: true, body: { co_nurse_id: coNurseId, scope: 'series', passage_series_id: seriesId } };
  }
  const startDate = draft.startDate?.trim() ?? '';
  const endDate = draft.endDate?.trim() ?? '';
  const days = nurseCollaborationRangeDays(startDate, endDate);
  if (days === null) return { ok: false, error: 'Choisissez une date de début et une date de fin.' };
  if (days > NURSE_COLLABORATION_RANGE_MAX_DAYS) {
    return { ok: false, error: `Période limitée à ${NURSE_COLLABORATION_RANGE_MAX_DAYS} jours.` };
  }
  return { ok: true, body: { co_nurse_id: coNurseId, scope: 'range', start_date: startDate, end_date: endDate } };
}

/** Portée lisible d'une collaboration (« Ce rendez-vous », « Toute la série », « Du 12 oct. 2026 au 20 oct. 2026 »). */
export function nurseCollaborationScopeSummary(
  item: Pick<NurseCollaboration, 'scope' | 'start_date' | 'end_date'>,
): string {
  if (item.scope !== 'range') return NURSE_COLLABORATION_SCOPE_LABELS[item.scope];
  const start = item.start_date ? formatAbsenceEndDateShort(item.start_date) : '';
  const end = item.end_date ? formatAbsenceEndDateShort(item.end_date) : '';
  if (start && end) return start === end ? `Le ${start}` : `Du ${start} au ${end}`;
  return NURSE_COLLABORATION_SCOPE_LABELS.range;
}

export type NurseCollaborationRowCopy = {
  /** Le lecteur est le confrère invité de cette collaboration. */
  guest: boolean;
  title: string;
  removeLabel: string;
  confirmTitle: string;
  confirmMessage: string;
};

/** Textes d'une ligne de collaboration : le titulaire voit le confrère, le confrère voit qui l'a ajouté. */
export function nurseCollaborationRowCopy(
  item: Pick<NurseCollaboration, 'co_nurse_id' | 'co_nurse_name' | 'owner_name'>,
  viewerId: string | null | undefined,
): NurseCollaborationRowCopy {
  const guest = Boolean(viewerId) && item.co_nurse_id === viewerId;
  return guest
    ? {
        guest,
        title: `Partagé par ${item.owner_name}`,
        removeLabel: 'Me retirer',
        confirmTitle: 'Vous retirer ?',
        confirmMessage: 'Vous n’aurez plus accès à ces passages.',
      }
    : {
        guest,
        title: item.co_nurse_name,
        removeLabel: 'Retirer',
        confirmTitle: `Retirer ${item.co_nurse_name} ?`,
        confirmMessage: 'Ces passages ne seront plus partagés.',
      };
}

type CoNurseAppointment = {
  status?: string | null;
  assigned_nurse_id?: string | null;
  is_co_nurse?: boolean;
};

/** Le lecteur est le confrère invité (le serveur renseigne `is_co_nurse`). */
export function isCoNurseViewer(apt: Pick<CoNurseAppointment, 'is_co_nurse'> | null | undefined): boolean {
  return apt?.is_co_nurse === true;
}

/** Annuler, partager le lien, céder : réservés au titulaire, masqués pour le confrère. */
export function nurseOwnerOnlyActionsVisible(apt: Pick<CoNurseAppointment, 'is_co_nurse'> | null | undefined): boolean {
  return !isCoNurseViewer(apt);
}

/** « Ajouter un confrère » : titulaire assigné d'un RDV encore actif. */
export function canAddCoNurse(apt: CoNurseAppointment | null | undefined, viewerId: string | null | undefined): boolean {
  if (!apt || !viewerId || isCoNurseViewer(apt)) return false;
  if (apt.assigned_nurse_id !== viewerId) return false;
  return !INACTIVE_APPOINTMENT_STATUSES.has(String(apt.status ?? ''));
}

/** Mention courte d'un RDV partagé : « Marie D. », « Marie D. et Paul R. », « Marie D. et 2 autres ». */
export function coNurseNamesLabel(coNurses: readonly AppointmentCoNurse[] | null | undefined): string {
  const names = (coNurses ?? []).map((n) => n.name.trim()).filter(Boolean);
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} et ${names[1]}`;
  return `${names[0]} et ${names.length - 1} autres`;
}

/** Mention d'un arrêt ou d'une ligne d'agenda partagé ; vide si le RDV n'est pas partagé. */
export function sharedAppointmentMention(apt: {
  co_nurses?: readonly AppointmentCoNurse[] | null;
  is_co_nurse?: boolean;
  shared_by_name?: string | null;
}): string {
  if (apt.is_co_nurse) {
    const sharedBy = apt.shared_by_name?.trim();
    return sharedBy ? `Partagé par ${sharedBy}` : 'Partagé avec vous';
  }
  const names = coNurseNamesLabel(apt.co_nurses);
  return names ? `Avec ${names}` : '';
}

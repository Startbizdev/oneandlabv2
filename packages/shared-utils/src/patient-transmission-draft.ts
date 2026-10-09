import type {
  PatientTransmission,
  PatientTransmissionInput,
  TransmissionCareItem,
  TransmissionCareItemRef,
  TransmissionCareItemsForDate,
} from '@oneandlab/shared-types';
import { ROLE_LABELS } from '@oneandlab/shared-constants';
import {
  PARIS_TIME_ZONE,
  appointmentDayFrance,
  appointmentTimeFrance,
  parseAppointmentDateFrance,
} from './appointment-date-france';

export interface TransmissionDayGroup {
  /** Jour du soin (Y-m-d). */
  day: string;
  items: PatientTransmission[];
}

/** Fil groupé par jour du soin (déjà trié du plus récent au plus ancien par l'API). */
export function groupTransmissionsByDay(items: PatientTransmission[]): TransmissionDayGroup[] {
  const groups: TransmissionDayGroup[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.day === item.occurred_on) {
      last.items.push(item);
    } else {
      groups.push({ day: item.occurred_on, items: [item] });
    }
  }
  return groups;
}

/** Heure d'écriture le jour du soin ; saisie après coup : « Écrite le 6 oct. », pour ne pas la lire comme l'heure du soin. */
export function transmissionTimeLabel(transmission: Pick<PatientTransmission, 'occurred_on' | 'created_at'>): string {
  const writtenDay = appointmentDayFrance(transmission.created_at);
  if (!writtenDay) return '';
  if (writtenDay === transmission.occurred_on) return appointmentTimeFrance(transmission.created_at);
  const writtenOn = parseAppointmentDateFrance(transmission.created_at).toLocaleDateString('fr-FR', {
    timeZone: PARIS_TIME_ZONE,
    day: 'numeric',
    month: 'short',
  });
  return `Écrite le ${writtenOn}`;
}

/** « Nina Infirmière · Infirmier » ; auteur supprimé : rôle seul. */
export function transmissionAuthorLine(author: PatientTransmission['author']): string {
  const role = ROLE_LABELS[author.role] ?? author.role;
  return author.name ? `${author.name} · ${role}` : role;
}

/** Préremplissage de la saisie : fiche passage (rendez-vous et jour du passage) ou dictée Cary (texte). */
export interface TransmissionPrefill {
  /** Rendez-vous d'origine : ses soins du jour sont précochés. */
  appointmentId?: string;
  /** Jour du soin (Y-m-d), aujourd'hui par défaut. */
  occurredOn?: string;
  body?: string;
}

export interface TransmissionDraft {
  occurredOn: string;
  body: string;
  forDoctor: boolean;
  selected: TransmissionCareItem[];
  appointmentId: string | null;
  /** Soins de ce rendez-vous à précocher dès que les soins du jour sont chargés. */
  autoSelectAppointmentId: string | null;
}

export function careItemKey(item: TransmissionCareItemRef): string {
  return `${item.kind}:${item.id}`;
}

export function initialTransmissionDraft(
  today: string,
  transmission?: PatientTransmission | null,
  prefill?: TransmissionPrefill,
): TransmissionDraft {
  if (transmission) {
    return {
      occurredOn: transmission.occurred_on,
      body: transmission.body,
      forDoctor: transmission.for_doctor,
      selected: transmission.care_items,
      appointmentId: transmission.appointment_id,
      autoSelectAppointmentId: null,
    };
  }
  return {
    occurredOn: prefill?.occurredOn && prefill.occurredOn <= today ? prefill.occurredOn : today,
    body: prefill?.body ?? '',
    forDoctor: false,
    selected: [],
    appointmentId: prefill?.appointmentId ?? null,
    autoSelectAppointmentId: prefill?.appointmentId ?? null,
  };
}

/** Pastilles proposées : soins des passages du jour, sinon catalogue ; les soins déjà cochés restent visibles. */
export function transmissionCareOptions(
  data: TransmissionCareItemsForDate | undefined,
  selected: TransmissionCareItem[],
): TransmissionCareItem[] {
  const offered: TransmissionCareItem[] = data
    ? data.passage_items.length > 0
      ? data.passage_items.map(({ kind, id, label }) => ({ kind, id, label }))
      : data.categories
    : [];
  const offeredKeys = new Set(offered.map(careItemKey));
  return [...offered, ...selected.filter((item) => !offeredKeys.has(careItemKey(item)))];
}

/** Soins du passage à précocher : ceux cochés faits pendant le passage, sinon tous ceux du rendez-vous. */
export function passageItemsToPreselect(
  data: TransmissionCareItemsForDate,
  appointmentId: string,
): TransmissionCareItem[] {
  const ofAppointment = data.passage_items.filter((item) => item.appointment_id === appointmentId);
  const done = ofAppointment.filter((item) => item.done);
  return (done.length > 0 ? done : ofAppointment).map(({ kind, id, label }) => ({ kind, id, label }));
}

export function toggleCareItem(selected: TransmissionCareItem[], item: TransmissionCareItem): TransmissionCareItem[] {
  const key = careItemKey(item);
  return selected.some((s) => careItemKey(s) === key)
    ? selected.filter((s) => careItemKey(s) !== key)
    : [...selected, item];
}

/** Changement de jour : les soins de passage de l'ancien jour et son rendez-vous ne s'appliquent plus. */
export function withOccurredOn(draft: TransmissionDraft, occurredOn: string): TransmissionDraft {
  if (occurredOn === draft.occurredOn) return draft;
  return {
    ...draft,
    occurredOn,
    selected: draft.selected.filter((item) => item.kind === 'category'),
    appointmentId: null,
    autoSelectAppointmentId: null,
  };
}

/** Rendez-vous rattaché : celui du préremplissage, sinon l'unique passage dont des soins sont cochés. */
function draftAppointmentId(
  draft: TransmissionDraft,
  data: TransmissionCareItemsForDate | undefined,
): string | null {
  if (draft.appointmentId) return draft.appointmentId;
  const selectedKeys = new Set(draft.selected.map(careItemKey));
  const appointments = new Set(
    (data?.passage_items ?? [])
      .filter((item) => selectedKeys.has(careItemKey(item)))
      .map((item) => item.appointment_id),
  );
  const [only] = appointments;
  return appointments.size === 1 && only ? only : null;
}

export function transmissionInputFromDraft(
  draft: TransmissionDraft,
  data: TransmissionCareItemsForDate | undefined,
): PatientTransmissionInput {
  return {
    body: draft.body.trim(),
    occurred_on: draft.occurredOn,
    care_items: draft.selected.map(({ kind, id }) => ({ kind, id })),
    appointment_id: draftAppointmentId(draft, data),
    for_doctor: draft.forDoctor,
  };
}

import type { NursePassageNursingItem, PassageTimeSlot } from '@oneandlab/shared-types';
import dayjs from 'dayjs';
import { PASSAGE_TIME_SLOT_LABELS } from '@oneandlab/shared-utils';
import type { PassagePlanningFormState } from './passage-planning';
import { formatPassageNursingItemLabel } from './passage-nursing-item-label';

const PLANNING_MODE_LABELS: Record<PassagePlanningFormState['planningMode'], string> = {
  single_day: 'Un seul jour',
  interval: 'Intervalle régulier',
  weekdays: 'Jours de la semaine',
  custom_dates: 'Dates personnalisées',
  manual: 'Ajout manuel',
};

const WEEKDAY_SHORT = ['', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export function formatPlanningSummary(
  state: PassagePlanningFormState,
  passageCount: number,
): string {
  const start = dayjs(state.startDate).format('D MMM YYYY');
  const parts: string[] = [PLANNING_MODE_LABELS[state.planningMode]];

  if (state.planningMode === 'interval') {
    parts.push(`tous les ${state.everyDays || '3'} j`);
  }
  if (state.planningMode === 'weekdays' && state.weekdays.length > 0) {
    parts.push(state.weekdays.map((d) => WEEKDAY_SHORT[d]).join(', '));
  }
  if (state.planningMode === 'custom_dates' && state.customDates.length > 0) {
    parts.push(`${state.customDates.length} date(s)`);
  }

  parts.push(`début ${start}`);
  if (state.endDate.trim()) {
    parts.push(`fin ${dayjs(state.endDate).format('D MMM YYYY')}`);
  }
  if (passageCount > 0) {
    parts.push(`${passageCount} passage${passageCount > 1 ? 's' : ''}`);
  }

  return parts.join(' · ');
}

export function formatTimeSummary(timeSlot: PassageTimeSlot, customTime: string): string {
  if (timeSlot === 'all_day') {
    return 'Toute la journée';
  }
  if (timeSlot === 'custom') {
    const t = customTime.trim() || '—';
    return `Personnalisée · ${t}`;
  }
  return PASSAGE_TIME_SLOT_LABELS[timeSlot] ?? timeSlot;
}

export function formatLocationSummary(atHome: boolean, addressLabel?: string | null): string {
  const label = addressLabel?.trim();
  if (label) {
    return atHome ? `À domicile · ${label}` : `Au cabinet · ${label}`;
  }
  return atHome ? 'À domicile' : 'Au cabinet (profil pro)';
}

export function formatPassageDurationSummary(duration: number, customDuration: string): string {
  if (duration === -1) {
    const min = parseInt(customDuration, 10);
    return min > 0 ? `${min} min (personnalisée)` : 'Durée personnalisée';
  }
  if (duration === 60) return '1 h';
  return `${duration} min`;
}

export function formatCareSummary(
  items: NursePassageNursingItem[],
  categories: Array<{ id: string; name?: string; label?: string; options?: unknown[] }> = [],
): string {
  if (items.length === 0) return 'Ajouter au moins un soin';
  return items
    .map((item) => {
      if (categories.length > 0) {
        return formatPassageNursingItemLabel(item, categories);
      }
      const label = String(item.label ?? '').trim();
      if (label && !['soin', 'soins', 'prestation', 'prestations'].includes(label.toLowerCase())) {
        return label;
      }
      return label || 'Soin';
    })
    .join(' · ');
}

export function formatNotesSummary(notes: string): string {
  const t = notes.trim();
  return t || 'Ajouter une note (optionnelle)';
}

export function formatPassageActionsSummary(hasStop: boolean): string {
  if (hasStop) {
    return 'Tournée, fiche RDV, suppression…';
  }
  return 'Fiche RDV, suppression…';
}

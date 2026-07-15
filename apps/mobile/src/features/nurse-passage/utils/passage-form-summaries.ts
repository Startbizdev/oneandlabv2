import type { NursePassageNursingItem, PassageDailyTimeSlot, PassageTimeSlot } from '@oneandlab/shared-types';
import dayjs from 'dayjs';
import { PASSAGE_TIME_SLOT_LABELS } from './passage-display';
import type { PassagePlanningFormState } from './passage-planning';
import type { CareCategory } from '@/features/categories/api/categories.service';
import { resolveCareItemDisplayLabel } from '@/utils/appointment-detail-display';
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
  } else if (state.openEnded && (state.planningMode === 'interval' || state.planningMode === 'weekdays')) {
    parts.push('sans fin (chronique)');
  }
  if (passageCount > 0) {
    parts.push(`${passageCount} passage${passageCount > 1 ? 's' : ''}`);
  }

  return parts.join(' · ');
}

export function formatTimeSummary(
  timeSlot: PassageTimeSlot,
  customTime: string,
  timeRange?: [number, number] | null,
): string {
  if (timeRange && timeRange.length >= 2) {
    const fmt = (h: number) => `${String(h).padStart(2, '0')}h`;
    return `Plage ${fmt(timeRange[0])} – ${fmt(timeRange[1])}`;
  }
  if (timeSlot === 'custom') {
    const t = customTime.trim() || '—';
    return `Personnalisée · ${t}`;
  }
  return PASSAGE_TIME_SLOT_LABELS[timeSlot] ?? timeSlot;
}

export function formatDailyTimesSummary(slots: PassageDailyTimeSlot[]): string {
  if (slots.length === 0) return 'Matin';
  const label = slots
    .map((s) => PASSAGE_TIME_SLOT_LABELS[s.time_slot] ?? s.time_slot)
    .join(' + ');
  return slots.length > 1 ? `${slots.length} passages · ${label}` : label;
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
  categories?: CareCategory[],
): string {
  if (items.length === 0) return 'Ajouter au moins un soin';
  return items
    .map((item) => {
      if (categories?.length) {
        return formatPassageNursingItemLabel(item, categories);
      }
      return resolveCareItemDisplayLabel(item as unknown as Record<string, unknown>, categories);
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

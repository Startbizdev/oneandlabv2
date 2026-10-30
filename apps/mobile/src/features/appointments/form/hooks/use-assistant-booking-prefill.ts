import { useEffect, useRef } from 'react';
import { buildAvailabilityFormPatch } from '../utils/availability';
import type { useMultiAppointmentWizard } from './useAppointmentForm';

type Wizard = Pick<ReturnType<typeof useMultiAppointmentWizard>, 'selectedServices' | 'setFormDataByService'>;

/** Jour et plage horaire proposés par l'assistant, appliqués au soin une fois ajouté (puis modifiables). */
export function assistantSchedulePatch(prefill: { date?: string; timeFrom?: string; timeTo?: string }): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (prefill.date && /^\d{4}-\d{2}-\d{2}$/.test(prefill.date)) patch.scheduled_at = prefill.date;
  const from = Number(prefill.timeFrom);
  const to = Number(prefill.timeTo);
  if (Number.isInteger(from) && Number.isInteger(to) && from >= 0 && to <= 24 && to > from) {
    Object.assign(patch, buildAvailabilityFormPatch('custom', [from, to]));
  }
  return patch;
}

/** Réservation ouverte depuis l'assistant : préremplit le créneau du soin qu'il a choisi, une seule fois. */
export function useAssistantBookingPrefill(
  wizard: Wizard,
  categoryId: string | undefined,
  prefill: { date?: string; timeFrom?: string; timeTo?: string },
) {
  const appliedRef = useRef(false);
  const { selectedServices, setFormDataByService } = wizard;
  const { date, timeFrom, timeTo } = prefill;
  useEffect(() => {
    if (appliedRef.current || !categoryId) return;
    const service = selectedServices.find((s) => s.id === categoryId || s.category_id === categoryId);
    if (!service) return;
    appliedRef.current = true;
    const patch = assistantSchedulePatch({ date, timeFrom, timeTo });
    if (Object.keys(patch).length === 0) return;
    setFormDataByService((prev) => ({ ...prev, [service.id]: { ...prev[service.id], ...patch } }));
  }, [categoryId, date, selectedServices, setFormDataByService, timeFrom, timeTo]);
}

import { useEffect, useRef } from 'react';
import { buildAvailabilityFormPatch } from '../utils/availability';
import type { useMultiAppointmentWizard } from './useAppointmentForm';

type Wizard = Pick<ReturnType<typeof useMultiAppointmentWizard>, 'selectedServices' | 'setFormDataByService'>;
type Prefill = { date?: string; timeFrom?: string; timeTo?: string };

/** Jour et plage horaire proposés par l'assistant, appliqués au soin une fois ajouté (puis modifiables). */
export function assistantSchedulePatch(prefill: Prefill): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (prefill.date && /^\d{4}-\d{2}-\d{2}$/.test(prefill.date)) patch.scheduled_at = prefill.date;
  const from = Number(prefill.timeFrom);
  const to = Number(prefill.timeTo);
  if (Number.isInteger(from) && Number.isInteger(to) && from >= 0 && to <= 24 && to > from) {
    Object.assign(patch, buildAvailabilityFormPatch('custom', [from, to]));
  }
  return patch;
}

/**
 * Réservation ouverte depuis l'assistant : préremplit une seule fois le créneau du soin qu'il a choisi,
 * ou, si la demande ne nommait pas de soin précis, du premier soin que le patient ajoute.
 */
export function useAssistantBookingPrefill(wizard: Wizard, categoryId: string | undefined, prefill: Prefill) {
  const appliedRef = useRef(false);
  const { selectedServices, setFormDataByService } = wizard;
  const { date, timeFrom, timeTo } = prefill;
  useEffect(() => {
    if (appliedRef.current) return;
    const patch = assistantSchedulePatch({ date, timeFrom, timeTo });
    if (Object.keys(patch).length === 0) return;
    const service = categoryId
      ? selectedServices.find((s) => s.id === categoryId || s.category_id === categoryId)
      : selectedServices[0];
    if (!service) return;
    appliedRef.current = true;
    setFormDataByService((prev) => ({ ...prev, [service.id]: { ...prev[service.id], ...patch } }));
  }, [categoryId, date, selectedServices, setFormDataByService, timeFrom, timeTo]);
}

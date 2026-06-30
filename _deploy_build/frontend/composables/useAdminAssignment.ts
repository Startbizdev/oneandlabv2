/**
 * Assignation admin (super_admin) — labo / sous-compte + préleveur ou infirmier.
 */

import { apiFetch } from '~/utils/api';
import { fetchAllUsers, sortUsersByLabel, userDisplayLabel } from '~/utils/fetch-all-users';

export const ADMIN_PRELEVEUR_NONE = '__aucun__';

export type AssignSelectItem = {
  value: string;
  label: string;
  description?: string;
  group?: string;
};

function toId(v: unknown): string {
  if (v == null || v === '') return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && v !== null && 'value' in v) return String((v as { value: unknown }).value);
  return String(v);
}

export function useAdminAssignment() {
  const toast = useAppToast();

  const labs = ref<any[]>([]);
  const subaccounts = ref<any[]>([]);
  const nurses = ref<any[]>([]);
  const preleveurs = ref<any[]>([]);
  const optionsLoading = ref(false);
  const reassigning = ref(false);

  const selectedLabId = ref('');
  const selectedNurseId = ref('');
  const selectedPreleveurId = ref(ADMIN_PRELEVEUR_NONE);

  const labSelectItems = computed<AssignSelectItem[]>(() => {
    const items: AssignSelectItem[] = [];
    for (const lab of sortUsersByLabel(labs.value)) {
      items.push({
        value: String(lab.id),
        label: userDisplayLabel(lab),
        description: lab.email ? String(lab.email) : undefined,
        group: 'Laboratoires',
      });
    }
    for (const sub of sortUsersByLabel(subaccounts.value)) {
      items.push({
        value: String(sub.id),
        label: userDisplayLabel(sub),
        description: sub.email ? String(sub.email) : undefined,
        group: 'Sous-comptes',
      });
    }
    ensureSelectedInItems(items, selectedLabId.value, 'Laboratoire actuel');
    return items;
  });

  const nurseSelectItems = computed<AssignSelectItem[]>(() => {
    const items = sortUsersByLabel(nurses.value).map((n) => ({
      value: String(n.id),
      label: userDisplayLabel(n),
      description: n.email ? String(n.email) : undefined,
    }));
    ensureSelectedInItems(items, selectedNurseId.value, 'Infirmier actuel');
    return items;
  });

  const preleveurSelectItems = computed<AssignSelectItem[]>(() => {
    const labId = selectedLabId.value;
    const items: AssignSelectItem[] = [{ value: ADMIN_PRELEVEUR_NONE, label: 'Aucun préleveur' }];
    for (const p of sortUsersByLabel(preleveurs.value)) {
      if (labId && String(p.lab_id ?? '') !== String(labId)) continue;
      items.push({
        value: String(p.id),
        label: userDisplayLabel(p),
        description: p.email ? String(p.email) : undefined,
      });
    }
    const preleveurId = selectedPreleveurId.value;
    if (preleveurId && preleveurId !== ADMIN_PRELEVEUR_NONE && !items.some((i) => i.value === preleveurId)) {
      items.unshift({ value: preleveurId, label: 'Préleveur actuel' });
    }
    return items;
  });

  function ensureSelectedInItems(items: AssignSelectItem[], id: string, fallbackLabel: string) {
    if (!id || items.some((i) => i.value === id)) return;
    items.unshift({ value: id, label: fallbackLabel });
  }

  async function fetchOptions() {
    optionsLoading.value = true;
    try {
      const [labRows, subRows, nurseRows, prelRows] = await Promise.all([
        fetchAllUsers({ role: 'lab', status: 'active' }),
        fetchAllUsers({ role: 'subaccount', status: 'active' }),
        fetchAllUsers({ role: 'nurse', status: 'active' }),
        fetchAllUsers({ role: 'preleveur', status: 'active' }),
      ]);
      labs.value = labRows;
      subaccounts.value = subRows;
      nurses.value = nurseRows;
      preleveurs.value = prelRows;
    } catch (e) {
      console.error('Erreur chargement options assignation admin:', e);
      toast.add({
        title: 'Chargement incomplet',
        description: 'Impossible de charger tous les profils. Réessayez.',
        color: 'error',
      });
    } finally {
      optionsLoading.value = false;
    }
  }

  function syncFromAppointment(appointment: any) {
    if (!appointment) return;
    if (appointment.type === 'blood_test') {
      selectedLabId.value = appointment.assigned_lab_id != null ? String(appointment.assigned_lab_id) : '';
      const to = appointment.assigned_to != null ? String(appointment.assigned_to) : '';
      selectedPreleveurId.value = to || ADMIN_PRELEVEUR_NONE;
      selectedNurseId.value = '';
    } else if (appointment.type === 'nursing') {
      selectedNurseId.value =
        appointment.assigned_nurse_id != null ? String(appointment.assigned_nurse_id) : '';
      selectedLabId.value = '';
      selectedPreleveurId.value = ADMIN_PRELEVEUR_NONE;
    }
  }

  watch(selectedLabId, (labId, prev) => {
    if (!labId || labId === prev) return;
    const preleveurId = selectedPreleveurId.value;
    if (preleveurId === ADMIN_PRELEVEUR_NONE || !preleveurId) return;
    const match = preleveurs.value.find((p) => String(p.id) === preleveurId);
    if (match && String(match.lab_id ?? '') !== String(labId)) {
      selectedPreleveurId.value = ADMIN_PRELEVEUR_NONE;
    }
  });

  function hasChange(appointment: any): boolean {
    if (!appointment) return false;
    if (appointment.type === 'blood_test') {
      const currentLab = appointment.assigned_lab_id ? String(appointment.assigned_lab_id) : '';
      const currentPrel = appointment.assigned_to ? String(appointment.assigned_to) : '';
      const selPrel =
        selectedPreleveurId.value === ADMIN_PRELEVEUR_NONE ? '' : selectedPreleveurId.value;
      return selectedLabId.value !== currentLab || selPrel !== currentPrel;
    }
    if (appointment.type === 'nursing') {
      const currentNurse = appointment.assigned_nurse_id ? String(appointment.assigned_nurse_id) : '';
      return selectedNurseId.value !== currentNurse;
    }
    return false;
  }

  function currentSummary(appointment: any): { lab?: string; preleveur?: string; nurse?: string } {
    if (!appointment) return {};
    if (appointment.type === 'blood_test') {
      const labId = selectedLabId.value;
      const labItem = labSelectItems.value.find((i) => i.value === labId);
      const prelId =
        selectedPreleveurId.value === ADMIN_PRELEVEUR_NONE ? '' : selectedPreleveurId.value;
      const prelItem = preleveurSelectItems.value.find((i) => i.value === prelId);
      return {
        lab: labItem?.label,
        preleveur: prelId ? prelItem?.label : 'Non assigné',
      };
    }
    if (appointment.type === 'nursing') {
      const nurseItem = nurseSelectItems.value.find((i) => i.value === selectedNurseId.value);
      return { nurse: nurseItem?.label };
    }
    return {};
  }

  async function apply(appointment: { id: string; type?: string }, loadAppointment: () => Promise<void>) {
    if (!appointment?.id) return;
    const body: Record<string, string> = {};
    if (appointment.type === 'blood_test') {
      const labId = toId(selectedLabId.value);
      if (!labId) {
        toast.add({ title: 'Laboratoire requis', description: 'Choisissez un laboratoire ou sous-compte.', color: 'warning' });
        return;
      }
      body.assigned_lab_id = labId;
      const prelId = toId(selectedPreleveurId.value);
      if (prelId && prelId !== ADMIN_PRELEVEUR_NONE) body.assigned_to = prelId;
    } else if (appointment.type === 'nursing') {
      const nurseId = toId(selectedNurseId.value);
      if (!nurseId) {
        toast.add({ title: 'Infirmier requis', description: 'Choisissez un infirmier.', color: 'warning' });
        return;
      }
      body.assigned_nurse_id = nurseId;
    } else {
      return;
    }

    reassigning.value = true;
    try {
      const response = await apiFetch(`/appointments/${appointment.id}/reassign`, {
        method: 'POST',
        body,
      });
      if (response?.success) {
        toast.add({ title: 'Assignation enregistrée', color: 'success' });
        await loadAppointment();
      } else {
        const errMsg = (response as any)?.error ?? (response as any)?.message ?? 'Impossible de réassigner.';
        toast.add({ title: 'Erreur', description: errMsg, color: 'error' });
      }
    } catch (error: any) {
      const errMsg = error?.message ?? error?.data?.error ?? 'Impossible de réassigner.';
      toast.add({ title: 'Erreur', description: errMsg, color: 'error' });
    } finally {
      reassigning.value = false;
    }
  }

  const optionsCountLabel = computed(() => {
    const labCount = labs.value.length + subaccounts.value.length;
    return `${labCount} labo${labCount > 1 ? 's' : ''} · ${nurses.value.length} infirmier${nurses.value.length > 1 ? 's' : ''} · ${preleveurs.value.length} préleveur${preleveurs.value.length > 1 ? 's' : ''}`;
  });

  return {
    labs,
    nurses,
    preleveurs,
    optionsLoading,
    reassigning,
    selectedLabId,
    selectedNurseId,
    selectedPreleveurId,
    labSelectItems,
    nurseSelectItems,
    preleveurSelectItems,
    optionsCountLabel,
    fetchOptions,
    syncFromAppointment,
    hasChange,
    currentSummary,
    apply,
  };
}

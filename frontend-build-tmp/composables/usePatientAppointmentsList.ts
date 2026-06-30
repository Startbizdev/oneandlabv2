/**
 * Liste RDV patient — pagination serveur (20/page) + filtre `patient_period`.
 * Aligné mobile `useInfiniteAppointmentsList` + `PatientAppointmentsListScreen`.
 */

import { apiFetch } from '~/utils/api';
import type { Appointment } from '~/types/appointments';
import type { AppointmentsPagination } from '~/composables/useAppointments';
import { APPOINTMENTS_LIST_PAGE_SIZE } from '~/constants/appointments-pagination';

export type PatientListTab = 'upcoming' | 'past';

export function usePatientAppointmentsList() {
  const appointments = ref<Appointment[]>([]);
  const loading = ref(false);
  const loadingMore = ref(false);
  const error = ref<string | null>(null);
  const hasMore = ref(false);
  const listReady = ref(false);
  const currentPage = ref(1);
  const listTab = ref<PatientListTab>('upcoming');

  async function fetchPage(page: number, options?: { silent?: boolean }) {
    const append = page > 1;
    if (append) {
      loadingMore.value = true;
    } else if (!options?.silent) {
      loading.value = true;
    }
    error.value = null;

    try {
      const params: Record<string, string> = {
        page: String(page),
        limit: String(APPOINTMENTS_LIST_PAGE_SIZE),
        patient_period: listTab.value,
      };
      const queryString = new URLSearchParams(params).toString();
      const response = await apiFetch<{
        success: boolean;
        data?: Appointment[];
        pagination?: AppointmentsPagination;
        error?: string;
      }>(`/appointments?${queryString}`, { method: 'GET' });

      if (response.success && response.data) {
        const chunk = response.data;
        if (append) {
          const seen = new Set(appointments.value.map((a) => a.id));
          const merged = [...appointments.value];
          for (const apt of chunk) {
            if (!seen.has(apt.id)) {
              seen.add(apt.id);
              merged.push(apt);
            }
          }
          appointments.value = merged;
        } else {
          appointments.value = chunk;
        }
        currentPage.value = page;
        hasMore.value = response.pagination?.has_more === true;
      } else {
        error.value = response.error || 'Erreur lors du chargement';
        if (!append) appointments.value = [];
        hasMore.value = false;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur réseau';
      error.value = msg;
      if (!append) appointments.value = [];
      hasMore.value = false;
    } finally {
      loading.value = false;
      loadingMore.value = false;
      listReady.value = true;
    }
  }

  async function refresh(options?: { silent?: boolean }) {
    currentPage.value = 1;
    hasMore.value = false;
    return fetchPage(1, options);
  }

  async function loadMore() {
    if (!hasMore.value || loadingMore.value || loading.value) return;
    await fetchPage(currentPage.value + 1);
  }

  watch(listTab, () => {
    appointments.value = [];
    hasMore.value = false;
    currentPage.value = 1;
    void refresh();
  });

  return {
    appointments,
    loading,
    loadingMore,
    error,
    hasMore,
    listReady,
    listTab,
    refresh,
    loadMore,
  };
}

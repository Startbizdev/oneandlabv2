<template>
  <UCard class="h-full min-h-0 overflow-hidden">
    <template #header>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <span class="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 ring-1 ring-primary-100 dark:bg-primary-950/40 dark:text-primary-300 dark:ring-primary-900/50">
              <UIcon name="i-lucide-history" class="h-4 w-4" />
            </span>
            <div>
              <h2 class="text-lg font-normal text-gray-950 dark:text-white">
                Historique patient
              </h2>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                Rendez-vous liés à ce dossier, avec accès rapide aux résultats uniquement.
              </p>
            </div>
          </div>
        </div>
        <UBadge v-if="pagination.total > 0" color="primary" variant="subtle" class="w-fit">
          {{ pagination.total }} RDV
        </UBadge>
      </div>
    </template>

    <div v-if="loading" class="flex items-center justify-center py-10">
      <UIcon name="i-lucide-loader-2" class="h-5 w-5 animate-spin text-primary-500" />
    </div>

    <UEmpty
      v-else-if="!appointments.length"
      icon="i-lucide-calendar-x"
      title="Aucun historique disponible"
      description="Aucun autre rendez-vous n'est rattaché à ce patient pour le moment."
      variant="naked"
      class="py-8"
    />

    <div v-else class="space-y-4">
      <div class="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900/50">
        <article
          v-for="item in appointments"
          :key="item.id"
          class="p-3.5 transition-colors sm:p-4 hover:bg-gray-50/80 dark:hover:bg-gray-800/35"
        >
          <div class="flex flex-col gap-4">
            <div class="min-w-0 flex-1 space-y-3">
              <div class="flex flex-wrap items-center gap-2">
                <UBadge :color="typeColor(item.type)" variant="subtle" size="sm">
                  {{ typeLabel(item.type) }}
                </UBadge>
                <UBadge :color="statusColor(item.status)" variant="subtle" size="sm">
                  {{ statusLabel(item.status) }}
                </UBadge>
                <UBadge v-if="item.id === currentAppointmentId" color="neutral" variant="outline" size="sm">
                  RDV actuel
                </UBadge>
              </div>

              <div>
                <p class="text-sm font-semibold text-gray-950 dark:text-white">
                  {{ formatDateTime(item.scheduled_at || item.created_at) }}
                </p>
                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {{ item.category_name || 'Catégorie non renseignée' }}
                </p>
              </div>

              <div v-if="careTeamLabel(item)" class="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300">
                <UIcon name="i-lucide-user-round-check" class="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                <span class="min-w-0 break-words leading-snug">{{ careTeamLabel(item) }}</span>
              </div>
            </div>

            <div class="w-full min-w-0">
              <div
                v-if="item.resultats.length"
                class="rounded-2xl border border-red-100 bg-red-50/70 p-3 dark:border-red-900/50 dark:bg-red-950/25"
              >
                <div class="mb-2 flex items-center justify-between gap-2">
                  <p class="flex items-center gap-1.5 text-xs font-semibold text-red-900 dark:text-red-100">
                    <UIcon name="i-lucide-flask-conical" class="h-3.5 w-3.5" />
                    Résultats disponibles
                  </p>
                  <span class="text-[11px] font-medium text-red-700/80 dark:text-red-300/80">
                    {{ item.resultats.length }}
                  </span>
                </div>
                <div class="space-y-2">
                  <div
                    v-for="doc in item.resultats"
                    :key="doc.id"
                    class="flex items-center gap-2 rounded-xl bg-white/75 px-2.5 py-2 ring-1 ring-red-100/80 dark:bg-gray-950/25 dark:ring-red-900/40"
                  >
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-xs font-medium text-gray-900 dark:text-gray-100">
                        {{ doc.file_name || 'Résultats' }}
                      </p>
                      <p class="text-[11px] text-gray-500 dark:text-gray-400">
                        {{ formatFileSize(doc.file_size) }}
                      </p>
                    </div>
                    <UButton
                      color="primary"
                      variant="soft"
                      size="xs"
                      icon="i-lucide-download"
                      :loading="downloadingIds.has(doc.id)"
                      :loading-auto="false"
                      aria-label="Télécharger les résultats"
                      @click="downloadResult(doc)"
                    />
                  </div>
                </div>
              </div>
              <div
                v-else
                class="rounded-2xl border border-dashed border-gray-200 bg-gray-50/70 px-3 py-4 text-center dark:border-gray-800 dark:bg-gray-900/30"
              >
                <UIcon name="i-lucide-file-minus-2" class="mx-auto h-4 w-4 text-gray-400" />
                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Aucun résultat joint
                </p>
              </div>
            </div>
          </div>
        </article>
      </div>

      <div class="flex flex-col gap-3 border-t border-gray-100 pt-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between sm:pt-3">
        <p class="text-center text-xs text-gray-500 dark:text-gray-400 sm:text-left">
          Page {{ pagination.page }} sur {{ totalPages }}
        </p>
        <div class="flex w-full items-stretch justify-center gap-2 sm:w-auto sm:justify-end sm:items-center">
          <UButton
            color="neutral"
            variant="outline"
            size="sm"
            class="min-h-10 flex-1 sm:min-h-0 sm:flex-initial"
            icon="i-lucide-chevron-left"
            :disabled="pagination.page <= 1 || loading"
            @click="goToPage(pagination.page - 1)"
          >
            Précédent
          </UButton>
          <UButton
            color="neutral"
            variant="outline"
            size="sm"
            class="min-h-10 flex-1 sm:min-h-0 sm:flex-initial"
            trailing-icon="i-lucide-chevron-right"
            :disabled="pagination.page >= totalPages || loading"
            @click="goToPage(pagination.page + 1)"
          >
            Suivant
          </UButton>
        </div>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { apiFetch } from '~/utils/api';

type HistoryDocument = {
  id: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  document_type: 'resultats';
  created_at?: string;
};

type HistoryAppointment = {
  id: string;
  type?: string;
  status?: string;
  scheduled_at?: string;
  created_at?: string;
  category_name?: string | null;
  assigned_lab_display_name?: string | null;
  assigned_nurse_display_name?: string | null;
  assigned_to_display_name?: string | null;
  resultats: HistoryDocument[];
};

const props = withDefaults(defineProps<{
  patientId?: string | null;
  relativeId?: string | null;
  currentAppointmentId?: string | null;
  limit?: number;
}>(), {
  patientId: null,
  relativeId: null,
  currentAppointmentId: null,
  limit: 5,
});

const toast = useAppToast();
const loading = ref(false);
const appointments = ref<HistoryAppointment[]>([]);
const downloadingIds = ref(new Set<string>());
const pagination = reactive({
  page: 1,
  limit: props.limit,
  total: 0,
  pages: 1,
});

const totalPages = computed(() => Math.max(1, pagination.pages || Math.ceil(pagination.total / pagination.limit) || 1));

async function loadHistory(page = pagination.page) {
  if (!props.patientId) return;
  loading.value = true;
  try {
    const query = new URLSearchParams({
      patient_id: String(props.patientId),
      page: String(page),
      limit: String(pagination.limit),
    });
    if (props.relativeId) {
      query.set('relative_id', String(props.relativeId));
    }
    const response = await apiFetch(`/patient-history?${query.toString()}`, { method: 'GET' });
    if (!response.success) {
      throw new Error(response.error || 'Impossible de charger l’historique patient');
    }
    appointments.value = Array.isArray(response.data) ? response.data : [];
    Object.assign(pagination, {
      page: response.pagination?.page ?? page,
      limit: response.pagination?.limit ?? pagination.limit,
      total: response.pagination?.total ?? appointments.value.length,
      pages: response.pagination?.pages ?? 1,
    });
  } catch (error: any) {
    appointments.value = [];
    toast.add({ title: 'Historique indisponible', description: error.message || 'Impossible de charger l’historique patient.', color: 'error' });
  } finally {
    loading.value = false;
  }
}

function goToPage(page: number) {
  if (page < 1 || page > totalPages.value) return;
  loadHistory(page);
}

async function downloadResult(doc: HistoryDocument) {
  if (!doc?.id) return;
  const next = new Set(downloadingIds.value);
  next.add(doc.id);
  downloadingIds.value = next;
  try {
    const config = useRuntimeConfig();
    const apiBase = config.public.apiBase || 'http://localhost:8888/api';
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const response = await fetch(`${apiBase}/medical-documents/${encodeURIComponent(doc.id)}/download`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Erreur lors du téléchargement');
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = doc.file_name || 'resultats.pdf';
    document.body.appendChild(link);
    link.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(link);
  } catch (error: any) {
    toast.add({ title: 'Erreur', description: error.message || 'Impossible de télécharger les résultats.', color: 'error' });
  } finally {
    const clean = new Set(downloadingIds.value);
    clean.delete(doc.id);
    downloadingIds.value = clean;
  }
}

function typeLabel(type?: string) {
  if (type === 'blood_test') return 'Prélèvement';
  if (type === 'nursing' || type === 'nurse') return 'Soin infirmier';
  return 'Rendez-vous';
}

function typeColor(type?: string): 'primary' | 'info' | 'neutral' {
  if (type === 'blood_test') return 'primary';
  if (type === 'nursing' || type === 'nurse') return 'info';
  return 'neutral';
}

function statusLabel(status?: string) {
  const map: Record<string, string> = {
    pending: 'En attente',
    planned: 'Planifié',
    confirmed: 'Confirmé',
    inProgress: 'En cours',
    completed: 'Terminé',
    canceled: 'Annulé',
    cancelled: 'Annulé',
  };
  return map[status || ''] || status || 'Statut inconnu';
}

function statusColor(status?: string): 'primary' | 'success' | 'warning' | 'error' | 'neutral' {
  if (status === 'completed') return 'success';
  if (status === 'canceled' || status === 'cancelled') return 'error';
  if (status === 'pending') return 'warning';
  if (status === 'confirmed' || status === 'planned' || status === 'inProgress') return 'primary';
  return 'neutral';
}

function careTeamLabel(item: HistoryAppointment) {
  const parts = [
    item.assigned_lab_display_name ? `Lab : ${item.assigned_lab_display_name}` : '',
    item.assigned_to_display_name ? `Préleveur : ${item.assigned_to_display_name}` : '',
    item.assigned_nurse_display_name ? `Infirmier : ${item.assigned_nurse_display_name}` : '',
  ].filter(Boolean);
  return parts.join(' · ');
}

function formatDateTime(value?: string) {
  if (!value) return 'Date non renseignée';
  try {
    return new Date(value).toLocaleDateString('fr-FR', {
      timeZone: 'Europe/Paris',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

function formatFileSize(bytes?: number) {
  const value = Number(bytes || 0);
  if (!value) return 'Taille inconnue';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${Math.round((value / Math.pow(1024, index)) * 100) / 100} ${units[index]}`;
}

watch(
  () => [props.patientId, props.relativeId],
  () => {
    pagination.page = 1;
    loadHistory(1);
  },
);

onMounted(() => loadHistory(1));
</script>

<template>
  <AppPageShell class="space-y-6" :header-bleed="layoutBleed">
    <template #pageHeader>
      <AppPageHeader :edge-bleed="false" :title="title" :description="description" />
    </template>

    <div class="container mx-auto max-w-7xl px-4">
      <div class="mb-4">
        <UInput
          v-model="search"
          icon="i-lucide-search"
          placeholder="Rechercher un patient, une analyse, un fichier…"
          size="lg"
          :ui="{ icon: { trailing: { pointer: '' } } }"
        />
      </div>

      <div v-if="loading" class="py-12 text-center">
        <UIcon name="i-lucide-loader-2" class="mx-auto mb-2 h-8 w-8 animate-spin text-primary" />
        <p class="text-gray-500">Chargement des résultats…</p>
      </div>

      <UEmpty
        v-else-if="filteredItems.length === 0"
        icon="i-lucide-flask-conical"
        :title="search.trim() ? 'Aucun résultat trouvé' : emptyTitle"
        :description="search.trim() ? 'Essayez un autre mot-clé.' : emptyDescription"
      />

      <div v-else class="space-y-3">
        <p class="text-xs font-medium uppercase tracking-wide text-gray-500">
          {{ filteredItems.length }} résultat{{ filteredItems.length > 1 ? 's' : '' }}
        </p>

        <UCard
          v-for="item in filteredItems"
          :key="item.medical_document_id || item.id"
          class="transition hover:shadow-md"
        >
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="min-w-0 flex-1">
              <div class="flex items-start gap-3">
                <span
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100"
                >
                  <UIcon name="i-lucide-flask-conical" class="h-5 w-5" />
                </span>
                <div class="min-w-0">
                  <p class="font-medium text-gray-950 dark:text-white">Résultats d'analyses</p>
                  <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    {{ subtitle(item) }}
                  </p>
                </div>
              </div>
            </div>

            <div class="flex shrink-0 flex-wrap gap-2">
              <UButton
                size="sm"
                color="neutral"
                variant="outline"
                icon="i-lucide-calendar"
                :to="appointmentHref(item.appointment_id)"
              >
                Voir le RDV
              </UButton>
              <UButton
                size="sm"
                color="primary"
                icon="i-lucide-download"
                :loading="downloadingId === (item.medical_document_id || item.id)"
                :on-click="() => downloadItem(item)"
              >
                Télécharger
              </UButton>
            </div>
          </div>
        </UCard>
      </div>
    </div>
  </AppPageShell>
</template>

<script setup lang="ts">
import type { LabResultListItem } from '@oneandlab/shared-types';
import { apiFetch } from '~/utils/api';

const props = withDefaults(
  defineProps<{
    role: 'patient' | 'nurse' | 'pro';
    appointmentBasePath: string;
    title?: string;
    description?: string;
    emptyTitle?: string;
    emptyDescription?: string;
    layoutBleed?: 'patient' | false;
  }>(),
  {
    title: 'Résultats',
    description: 'Consultez et téléchargez vos résultats d’analyses.',
    emptyTitle: 'Aucun résultat',
    emptyDescription: 'Les résultats déposés par le laboratoire apparaîtront ici.',
    layoutBleed: false,
  },
);

const toast = useAppToast();
const config = useRuntimeConfig();

const search = ref('');
const loading = ref(true);
const items = ref<LabResultListItem[]>([]);
const downloadingId = ref<string | null>(null);

const filteredItems = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return items.value;
  return items.value.filter((item) => {
    const haystack = [
      item.file_name,
      item.category_name,
      item.patient_first_name,
      item.patient_last_name,
      patientName(item),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
});

function patientName(item: LabResultListItem): string {
  const n = `${item.patient_first_name ?? ''} ${item.patient_last_name ?? ''}`.trim();
  return n || 'Patient';
}

function formatDate(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function subtitle(item: LabResultListItem): string {
  const parts: string[] = [];
  if (props.role !== 'patient') parts.push(patientName(item));
  if (item.category_name) parts.push(item.category_name);
  const rdvDate = formatDate(item.appointment_scheduled_at ?? item.created_at);
  if (rdvDate) parts.push(`RDV ${rdvDate}`);
  if (item.file_name?.trim()) parts.push(item.file_name.trim());
  return parts.join(' · ') || 'Document PDF';
}

function appointmentHref(appointmentId: string) {
  return `${props.appointmentBasePath}/${encodeURIComponent(appointmentId)}#resultats`;
}

async function loadResults() {
  loading.value = true;
  try {
    const res = await apiFetch('/lab-results?limit=100', { method: 'GET' });
    items.value = res?.success && res.data?.items ? res.data.items : [];
  } catch (e: any) {
    items.value = [];
    toast.add({
      title: 'Erreur',
      description: e?.message || 'Impossible de charger les résultats',
      color: 'error',
    });
  } finally {
    loading.value = false;
  }
}

async function downloadItem(item: LabResultListItem) {
  const id = item.medical_document_id || item.id;
  if (!id) return;
  downloadingId.value = id;
  try {
    const apiBase = config.public?.apiBase || '';
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const url = `${apiBase}/medical-documents/${encodeURIComponent(id)}/download?t=${Date.now()}`;
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(url, { headers, credentials: 'include' });
    if (!response.ok) throw new Error('Téléchargement impossible');
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = item.file_name?.trim() || 'resultats.pdf';
    link.click();
    URL.revokeObjectURL(objectUrl);
    toast.add({ title: 'Téléchargement lancé', color: 'success' });
  } catch (e: any) {
    toast.add({
      title: 'Erreur',
      description: e?.message || 'Téléchargement impossible',
      color: 'error',
    });
  } finally {
    downloadingId.value = null;
  }
}

onMounted(() => {
  void loadResults();
});
</script>

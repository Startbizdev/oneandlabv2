<template>
  <UModal
    v-model:open="open"
    :title="`Patients de ${preleveurName}`"
    description="Le préleveur peut prendre rendez-vous pour ces patients ; ses demandes arrivent chez vous pour validation."
    :ui="{ content: 'max-w-lg' }"
  >
    <template #body>
      <div class="space-y-4" data-testid="preleveur-assigned-patients">
        <UFormField label="Assigner un patient du laboratoire">
          <div class="flex gap-2">
            <USelectMenu
              v-model="selectedPatientId"
              v-model:search-term="patientSearchTerm"
              aria-label="Choisir un patient à assigner"
              :items="patientSelectItems"
              value-key="value"
              :loading="patientsLoading"
              placeholder="Rechercher un patient…"
              class="w-full min-w-0"
              :search-input="{ placeholder: PATIENT_SELECT_SEARCH_PLACEHOLDER }"
              :filter-fields="['label', 'searchText']"
              data-testid="preleveur-assign-select"
            >
              <template #item-label="{ item }">
                <div class="min-w-0 flex-1 py-0.5 text-left">
                  <p class="truncate font-medium text-gray-900 dark:text-white">{{ item.label }}</p>
                  <p v-if="item.metaLine" class="truncate text-xs text-gray-500 dark:text-gray-400">{{ item.metaLine }}</p>
                </div>
              </template>
            </USelectMenu>
            <UButton
              color="primary"
              icon="i-lucide-user-plus"
              :loading="assigning"
              :disabled="!selectedPatientId"
              data-testid="preleveur-assign-submit"
              @click="assignSelected"
            >
              Assigner
            </UButton>
          </div>
          <p v-if="patientsError" class="mt-1 text-xs text-red-600">Recherche indisponible, réessayez.</p>
        </UFormField>

        <p v-if="loading" role="status" class="py-6 text-center text-sm text-gray-500">Chargement…</p>
        <UAlert v-else-if="loadError" color="error" variant="soft" title="Impossible de charger les patients du préleveur">
          <template #actions><UButton color="neutral" variant="outline" @click="loadAssigned">Réessayer</UButton></template>
        </UAlert>
        <p v-else-if="assigned.length === 0" class="py-4 text-center text-sm text-gray-500">
          Aucun patient pour ce préleveur.
        </p>
        <ul v-else class="divide-y divide-gray-100 dark:divide-gray-800">
          <li v-for="p in assigned" :key="p.id" class="flex items-center justify-between gap-3 py-2">
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-gray-900 dark:text-white">{{ buildPatientSelectRow(p).label }}</p>
              <p class="truncate text-xs text-gray-500">
                {{ p.assigned_by_lab ? 'Assigné par le laboratoire' : 'Créé par le préleveur' }}
              </p>
            </div>
            <UButton
              v-if="p.assigned_by_lab"
              size="xs"
              color="error"
              variant="soft"
              icon="i-lucide-user-minus"
              :loading="removingId === p.id"
              @click="removeAssignment(p)"
            >
              Retirer
            </UButton>
          </li>
        </ul>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { apiFetch } from '~/utils/api';
import { searchPatientsPicker } from '~/utils/fetch-all-patients';
import { usePatientPicker } from '~/composables/usePatientPicker';
import { PATIENT_SELECT_SEARCH_PLACEHOLDER, buildPatientSelectRow } from '~/utils/patient-select-menu';

const props = defineProps<{ preleveurId: string; preleveurName: string }>();
const open = defineModel<boolean>('open', { default: false });

const toast = useAppToast();
const assigned = ref<any[]>([]);
const loading = ref(false);
const loadError = ref(false);
const assigning = ref(false);
const removingId = ref<string | null>(null);
const selectedPatientId = ref<string | undefined>(undefined);

const { patients, patientsLoading, patientsError, patientSearchTerm, resetPatientPickerList } = usePatientPicker({
  searchPatients: (q) => searchPatientsPicker(apiFetch, q, 40),
});

const patientSelectItems = computed(() => {
  const assignedIds = new Set(assigned.value.map((p) => String(p.id)));
  return patients.value
    .filter((p) => !assignedIds.has(String(p.id)))
    .map((p) => buildPatientSelectRow(p));
});

const basePath = computed(() => `/lab/preleveurs/${encodeURIComponent(props.preleveurId)}/patients`);

async function loadAssigned() {
  loading.value = true;
  loadError.value = false;
  try {
    const res = await apiFetch(`${basePath.value}?limit=100`, { method: 'GET' });
    if (!res?.success || !Array.isArray(res.data)) throw new Error('Chargement impossible');
    assigned.value = res.data;
  } catch {
    loadError.value = true;
    assigned.value = [];
  } finally {
    loading.value = false;
  }
}

async function assignSelected() {
  if (!selectedPatientId.value) return;
  assigning.value = true;
  try {
    const res = await apiFetch(basePath.value, { method: 'POST', body: { patient_id: selectedPatientId.value } });
    if (!res?.success) throw new Error(res?.error || 'Assignation impossible');
    toast.add({ title: 'Patient assigné', color: 'success' });
    selectedPatientId.value = undefined;
    patientSearchTerm.value = '';
    resetPatientPickerList();
    await loadAssigned();
  } catch (e: any) {
    toast.add({ title: 'Assignation impossible', description: e?.message, color: 'error' });
  } finally {
    assigning.value = false;
  }
}

async function removeAssignment(patient: any) {
  removingId.value = String(patient.id);
  try {
    const res = await apiFetch(`${basePath.value}?patient_id=${encodeURIComponent(String(patient.id))}`, { method: 'DELETE' });
    if (!res?.success) throw new Error(res?.error || 'Retrait impossible');
    toast.add({ title: 'Assignation retirée', color: 'success' });
    await loadAssigned();
  } catch (e: any) {
    toast.add({ title: 'Retrait impossible', description: e?.message, color: 'error' });
  } finally {
    removingId.value = null;
  }
}

watch(
  () => [open.value, props.preleveurId] as const,
  ([isOpen]) => {
    if (isOpen) void loadAssigned();
  },
  { immediate: true },
);
</script>

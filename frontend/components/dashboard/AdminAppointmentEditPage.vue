<template>
  <div class="min-h-[min(80vh,42rem)] pb-8">
    <div class="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <header class="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 pb-4 dark:border-gray-800">
        <div class="min-w-0">
          <UButton to="/admin/appointments" variant="ghost" color="neutral" size="sm" icon="i-lucide-arrow-left" class="mb-2">
            Retour
          </UButton>
          <h1 class="text-xl font-semibold text-gray-900 dark:text-white">
            Modifier le rendez-vous
          </h1>
          <p v-if="appointment" class="mt-1 font-mono text-xs text-muted">
            {{ appointment.id }}
          </p>
        </div>
      </header>

      <div v-if="loadError" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
        {{ loadError }}
      </div>

      <div v-else-if="loading" class="flex flex-col items-center justify-center gap-3 py-24">
        <UIcon name="i-lucide-loader-2" class="h-10 w-10 animate-spin text-primary" />
        <p class="text-sm text-muted">Chargement…</p>
      </div>

      <template v-else-if="ready && appointment">
        <UCard
          id="admin-rdv-settings-card"
          class="mb-6 rounded-2xl border border-gray-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.06)] ring-1 ring-black/5 dark:border-gray-800 dark:ring-white/10"
        >
          <template #header>
            <div class="flex items-center gap-3 sm:gap-4">
              <div
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-gray-200/90 bg-white dark:border-gray-700 dark:bg-gray-950 sm:h-12 sm:w-12"
              >
                <UIcon name="i-lucide-shield-check" class="size-6 text-gray-600 dark:text-gray-400" aria-hidden="true" />
              </div>
              <div class="min-w-0">
                <h2 class="text-base font-semibold text-gray-900 dark:text-white">Réglages administrateur</h2>
              </div>
            </div>
          </template>
          <div class="space-y-5 p-4 sm:p-6">
            <div class="flex flex-col gap-5 md:flex-row md:flex-wrap md:items-start">
              <UFormField label="Statut" class="w-full md:max-w-[16rem]" name="edit_status_admin">
                <USelect v-model="editStatus" :items="statusSelectItems" value-key="value" class="w-full" size="md" />
              </UFormField>
              <UFormField v-if="isBloodApt" label="Laboratoire assigné" class="w-full min-w-0 flex-1 md:min-w-[14rem]" name="edit_lab_admin">
                <USelectMenu
                  v-model="editLabId"
                  :items="labSelectItems"
                  value-key="value"
                  class="w-full min-w-0"
                  clearable
                  :loading="labsLoading"
                  :filter-fields="['label']"
                  :search-input="{ placeholder: 'Rechercher…' }"
                  size="md"
                >
                  <template #label>
                    <span v-if="!editLabId" class="text-muted">Aucun</span>
                    <span v-else>{{ labSelectItems.find((i) => i.value === editLabId)?.label }}</span>
                  </template>
                </USelectMenu>
              </UFormField>
              <UFormField v-if="isNursingApt" label="Infirmier(e) assigné(e)" class="w-full min-w-0 flex-1 md:min-w-[14rem]" name="edit_nurse_admin">
                <USelectMenu
                  v-model="editNurseId"
                  :items="nurseSelectItems"
                  value-key="value"
                  class="w-full min-w-0"
                  clearable
                  :loading="nursesLoading"
                  :filter-fields="['label']"
                  :search-input="{ placeholder: 'Rechercher…' }"
                  size="md"
                >
                  <template #label>
                    <span v-if="!editNurseId" class="text-muted">Aucun</span>
                    <span v-else>{{ nurseSelectItems.find((i) => i.value === editNurseId)?.label }}</span>
                  </template>
                </USelectMenu>
              </UFormField>
            </div>
          </div>
        </UCard>

        <ClientOnly>
          <UnifiedAppointmentForm
            ref="unifiedRef"
            v-model="formDataModel"
            :selected-services="selectedServices"
            :categories="categoriesList"
            patient-section-id="admin-edit-rdv-patient"
            :patient-document-user-id="patientDocumentUserId"
            :allow-patient-email-edit="true"
            :skip-logged-in-patient-prefill="true"
            :patient-email-optional="true"
            accept-saturday
            accept-sunday
            booking-wizard-section="all"
            :min-lead-time-hours="0"
            @submit="onUnifiedSubmit"
          />

          <div class="mt-8 flex flex-wrap items-center justify-end gap-3 border-t border-gray-200 pt-6 dark:border-gray-800">
            <UButton variant="outline" color="neutral" :to="`/admin/appointments/${appointmentId}`">
              Annuler
            </UButton>
            <UButton color="primary" :loading="saving" icon="i-lucide-save" @click="requestSave">
              Enregistrer
            </UButton>
          </div>

          <template #fallback>
            <div class="flex justify-center py-16">
              <UIcon name="i-lucide-loader-2" class="h-9 w-9 animate-spin text-primary" />
            </div>
          </template>
        </ClientOnly>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick } from 'vue';
import type { Appointment } from '~/types/appointments';
import { apiFetch } from '~/utils/api';
import { isBloodTestAppointment, isNursingAppointment as isApptNursing } from '~/utils/appointment-type-rules';
import { hydrateAdminUnifiedAppointment } from '~/utils/admin-unified-appointment-hydrate';
import {
  buildAdminAppointmentPutBody,
  extractUnifiedPayloadFiles,
} from '~/utils/admin-unified-appointment-put';
import { validateUnifiedRdvPayload, type SelectedServiceInput } from '~/utils/dashboard-unified-rdv';

const props = defineProps<{
  appointmentId: string;
}>();

useHead({ title: 'Modifier un rendez-vous – Administration' });

const toast = useAppToast();
const router = useRouter();

const loading = ref(true);
const loadError = ref('');
const saving = ref(false);
const ready = ref(false);

const appointment = ref<Appointment | null>(null);
const categoriesList = ref<
  Array<{
    id: string;
    name: string;
    description?: string;
    type: string;
    icon?: string | null;
    image_url?: string | null;
  }>
>([]);
const selectedServices = ref<SelectedServiceInput[]>([]);
const formDataModel = ref<Record<string, unknown>>({});

const unifiedRef = ref<{ flushDraftToParent?: () => void; commitPatientWizardSubmit?: () => void } | null>(
  null,
);

const editStatus = ref<string>('pending');
const editLabId = ref<string | undefined>(undefined);
const editNurseId = ref<string | undefined>(undefined);

const labs = ref<any[]>([]);
const nurses = ref<any[]>([]);
const labsLoading = ref(false);
const nursesLoading = ref(false);

const statusSelectItems = [
  { label: 'En attente', value: 'pending' },
  { label: 'Confirmé', value: 'confirmed' },
  { label: 'Planifié', value: 'planned' },
  { label: 'En cours', value: 'inProgress' },
  { label: 'Terminé', value: 'completed' },
  { label: 'Refusé', value: 'refused' },
  { label: 'Expiré', value: 'expired' },
  { label: 'Annulé', value: 'canceled' },
];

const labSelectItems = computed(() =>
  labs.value.map((p: any) => ({
    label:
      (p.company_name && String(p.company_name).trim()) ||
      `${(p.first_name || '').trim()} ${(p.last_name || '').trim()}`.trim() ||
      p.email ||
      String(p.id),
    value: String(p.id),
  })),
);

const nurseSelectItems = computed(() =>
  nurses.value.map((p: any) => ({
    label: `${(p.first_name || '').trim()} ${(p.last_name || '').trim()}`.trim() || p.email || String(p.id),
    value: String(p.id),
  })),
);

const patientDocumentUserId = computed(() => {
  const pid = appointment.value?.patient_id;
  return pid != null ? String(pid) : undefined;
});

const isBloodApt = computed(() =>
  appointment.value ? isBloodTestAppointment(appointment.value.type) : false,
);

const isNursingApt = computed(() =>
  appointment.value ? isApptNursing(appointment.value.type) : false,
);

async function loadLabsAndNurses() {
  labsLoading.value = true;
  nursesLoading.value = true;
  try {
    const [labRes, subRes, nurseRes] = await Promise.all([
      apiFetch('/users?role=lab&limit=500', { method: 'GET' }),
      apiFetch('/users?role=subaccount&limit=500', { method: 'GET' }),
      apiFetch('/users?role=nurse&limit=500', { method: 'GET' }),
    ]);
    labs.value = [...(labRes.success && labRes.data ? (labRes.data as any[]) : []),
      ...(subRes.success && subRes.data ? (subRes.data as any[]) : []),
    ];
    nurses.value = nurseRes.success && nurseRes.data ? (nurseRes.data as any[]) : [];
  } finally {
    labsLoading.value = false;
    nursesLoading.value = false;
  }
}

async function uploadAppointmentFiles(apptId: string, filesMap: Record<string, File>) {
  const fieldMapping: Record<string, string> = {
    carte_vitale: 'carte_vitale',
    carte_mutuelle: 'carte_mutuelle',
    ordonnance: 'ordonnance',
    autres_assurances: 'autres_assurances',
  };
  for (const [key, file] of Object.entries(filesMap)) {
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('appointment_id', apptId);
      fd.append('document_type', fieldMapping[key] || key);
      await apiFetch('/medical-documents', { method: 'POST', body: fd });
    } catch {
      toast.add({
        title: 'Document non enregistré',
        description: `Échec de l’envoi (${key}).`,
        color: 'orange',
      });
    }
  }
}

async function bootstrap() {
  loading.value = true;
  loadError.value = '';
  ready.value = false;
  try {
    const [aRes, cRes] = await Promise.all([
      apiFetch(`/appointments/${props.appointmentId}`, { method: 'GET' }),
      apiFetch('/categories', { method: 'GET' }),
    ]);

    if (!aRes.success || !(aRes as any).data) {
      loadError.value = (aRes as any).error || 'Rendez-vous introuvable.';
      appointment.value = null;
      return;
    }

    appointment.value = (aRes as { data: Appointment }).data;

    categoriesList.value = Array.isArray((cRes as any).data) ? ((cRes as any).data as typeof categoriesList.value) : [];

    const hydrated = hydrateAdminUnifiedAppointment(appointment.value, categoriesList.value);
    selectedServices.value = hydrated.selectedServices;

    editStatus.value = appointment.value.status || 'pending';
    editLabId.value = appointment.value.assigned_lab_id
      ? String(appointment.value.assigned_lab_id)
      : undefined;
    editNurseId.value = appointment.value.assigned_nurse_id
      ? String(appointment.value.assigned_nurse_id)
      : undefined;

    await loadLabsAndNurses();

    formDataModel.value = hydrated.formData;

    await nextTick();
    await nextTick();

    ready.value = true;
  } catch (e: unknown) {
    loadError.value = e instanceof Error ? e.message : 'Erreur de chargement';
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.appointmentId,
  () => {
    void bootstrap();
  },
);

onMounted(() => {
  void bootstrap();
});

function requestSave() {
  unifiedRef.value?.flushDraftToParent?.();
  nextTick(() => {
    unifiedRef.value?.commitPatientWizardSubmit?.();
  });
}

async function onUnifiedSubmit(payload: Record<string, unknown>) {
  if (!appointment.value?.id || saving.value) return;

  const v = validateUnifiedRdvPayload(payload, selectedServices.value, { patientEmailOptional: true, patientPhoneOptional: true });
  if (v) {
    toast.add({ title: 'Formulaire incomplet', description: v.message, color: 'error' });
    const el = v.scrollAnchor ? document.getElementById(v.scrollAnchor) : document.getElementById('admin-edit-rdv-patient');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  const first = selectedServices.value[0];
  const putBody = buildAdminAppointmentPutBody(payload, {
    status: editStatus.value,
    assigned_lab_id: editLabId.value ?? '',
    assigned_nurse_id: editNurseId.value ?? '',
    category_id: first?.category_id != null ? String(first.category_id) : appointment.value.category_id ?? null,
  });

  saving.value = true;
  try {
    const res = await apiFetch(`/appointments/${appointment.value.id}`, {
      method: 'PUT',
      body: putBody,
    });

    if (!res.success) {
      toast.add({
        title: 'Erreur',
        description: (res as any).error || 'Enregistrement impossible',
        color: 'error',
      });
      return;
    }

    const filesExtra = extractUnifiedPayloadFiles(payload);
    if (Object.keys(filesExtra).length > 0) {
      await uploadAppointmentFiles(appointment.value.id, filesExtra);
    }

    toast.add({
      title: 'Modifications enregistrées',
      color: 'success',
      icon: 'i-lucide-check-circle',
    });

    await router.push(`/admin/appointments/${appointment.value.id}`);
  } finally {
    saving.value = false;
  }
}
</script>

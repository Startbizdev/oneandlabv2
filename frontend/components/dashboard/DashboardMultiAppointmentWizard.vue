<template>
  <div>
    <RendezVousCareSelection
      v-if="step === 0"
      v-model:selected-services="selectedServices"
      :categories="careCategoriesList"
      :loading="categoriesLoading"
      :restrict-category-types="restrictCategoryTypes"
      :selection-title="selectionTitle"
      :dashboard-layout="true"
      @continue="confirmStep0"
    />

    <div v-else class="min-h-[calc(100vh-4rem)] bg-gray-50 pb-32">
      <div class="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <header class="mb-6 text-left">
          <h1 class="text-xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
            Détails du rendez-vous
          </h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Renseignez d’abord chaque soin (date, créneaux, documents du soin). En bas : choisissez un patient dans votre liste ou créez-en un nouveau avec adresse, pièces et coordonnées — tout se fait sur cette page.
          </p>
        </header>

        <UAlert
          v-if="validationError"
          color="error"
          variant="soft"
          icon="i-lucide-alert-circle"
          title="Champs obligatoires manquants"
          class="mb-6 scroll-mt-6"
          id="form-error-alert"
        >
          <template #description>
            <div class="whitespace-pre-line">{{ validationError }}</div>
          </template>
        </UAlert>

        <ClientOnly>
          <UnifiedAppointmentForm
            v-if="selectedServices.length > 0"
            v-model="formData"
            :selected-services="selectedServices"
            :categories="careCategoriesList"
            patient-section-id="wizard-rdv-patient-card"
            :patient-document-user-id="patientDocumentUserIdForForm"
            :allow-patient-email-edit="true"
            :skip-logged-in-patient-prefill="true"
            :hide-preferred-nurse-gender="isNurseDashboard"
            :patient-email-optional="patientEmailOptional"
            :accept-saturday="true"
            :accept-sunday="true"
            @submit="onUnifiedSubmit"
          >
            <template #patientToolbar>
              <div class="mb-6 space-y-4">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Qui est le patient ?
                </p>
                <div class="flex flex-col gap-2 sm:flex-row">
                  <UButton
                    type="button"
                    :variant="patientMode === 'existing' ? 'solid' : 'outline'"
                    color="primary"
                    class="flex-1 justify-center"
                    icon="i-lucide-users"
                    @click="patientMode = 'existing'"
                  >
                    Patient dans la liste
                  </UButton>
                  <UButton
                    type="button"
                    :variant="patientMode === 'new' ? 'solid' : 'outline'"
                    color="primary"
                    class="flex-1 justify-center"
                    icon="i-lucide-user-plus"
                    @click="patientMode = 'new'"
                  >
                    Nouveau patient
                  </UButton>
                </div>
                <UFormField v-if="patientMode === 'existing'" label="Choisir un patient" name="patient_id" required>
                  <USelectMenu
                    v-model="selectedPatientId"
                    :items="patientSelectItems"
                    value-key="value"
                    :loading="patientsLoading || patientProfileLoading"
                    placeholder="Sélectionner un patient…"
                    size="lg"
                    class="w-full min-w-0"
                    :search-input="{ placeholder: patientSelectSearchPlaceholder }"
                    :filter-fields="['label', 'searchText']"
                  >
                    <template #label>
                      <span v-if="!selectedPatientId" class="text-gray-400">Sélectionner un patient…</span>
                      <span v-else>{{ patientSelectItems.find((i) => i.value === selectedPatientId)?.label }}</span>
                    </template>
                    <template #item-label="{ item }">
                      <div class="min-w-0 flex-1 py-0.5 text-left">
                        <p class="truncate font-medium text-gray-900 dark:text-white">{{ item.label }}</p>
                        <p v-if="item.metaLine" class="truncate text-xs text-gray-500 dark:text-gray-400">
                          {{ item.metaLine }}
                        </p>
                      </div>
                    </template>
                  </USelectMenu>
                  <p v-if="patientProfileLoading" class="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                    <UIcon name="i-lucide-loader-2" class="w-3.5 h-3.5 animate-spin shrink-0" />
                    Chargement du dossier patient (adresse, documents)…
                  </p>
                </UFormField>
                <UAlert
                  v-else
                  color="neutral"
                  variant="subtle"
                  icon="i-lucide-info"
                  title="Création du patient avec le rendez-vous"
                  description="Renseignez ci-dessous identité, adresse (recherche + complément) et pièces."
                  class="rounded-xl"
                />
              </div>
            </template>

            <template #footer>
              <RendezVousStickyFooter
                dashboard-layout
                primary-label="Enregistrer le rendez-vous"
                :primary-submit="true"
                :primary-loading="saving"
                :primary-disabled="saving"
                :back-disabled="saving"
                @back="prevStep"
              />
            </template>
          </UnifiedAppointmentForm>
          <template #fallback>
            <div
              class="flex min-h-[12rem] flex-col items-center justify-center gap-3 py-10"
              role="status"
              aria-live="polite"
            >
              <UIcon name="i-lucide-loader-2" class="h-9 w-9 animate-spin text-primary-500" aria-hidden="true" />
              <span class="sr-only">Chargement du formulaire</span>
            </div>
          </template>
        </ClientOnly>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, watch } from 'vue';
import { apiFetch } from '~/utils/api';
import { fetchAllPatientsForDashboard } from '~/utils/fetch-all-patients';
import {
  validateUnifiedRdvPayload,
  buildDashboardAppointmentPayloads,
  type SelectedServiceInput,
} from '~/utils/dashboard-unified-rdv';
import { resolvePatientAddressForRdvForm, parseRawPatientAddress } from '~/utils/patient-address-rdv';
import {
  PATIENT_SELECT_SEARCH_PLACEHOLDER,
  buildPatientSelectRow,
} from '~/utils/patient-select-menu';

const props = withDefaults(
  defineProps<{
    basePath: string;
    restrictCategoryTypes?: ('blood_test' | 'nursing')[];
    selectionTitle?: string;
  }>(),
  {
    restrictCategoryTypes: undefined,
    selectionTitle: undefined,
  },
);

const route = useRoute();
const router = useRouter();
const toast = useAppToast();
const { user } = useAuth();
const { createMultipleAppointments } = useAppointments();

const isNurseDashboard = computed(() => props.basePath === '/nurse');

const step = ref(0);
const saving = ref(false);
const validationError = ref('');
const categoriesLoading = ref(true);
const careCategoriesList = ref<
  Array<{ id: string; name: string; description?: string; type: string; icon?: string | null; appointment_count?: number }>
>([]);

const selectedServices = ref<SelectedServiceInput[]>([]);
const formData = ref<Record<string, any>>({});

const patients = ref<any[]>([]);
const patientsLoading = ref(false);
const patientProfileLoading = ref(false);
const selectedPatientId = ref<string | undefined>(undefined);
/** Patient existant (liste) ou création inline. */
const patientMode = ref<'existing' | 'new'>('existing');

/** Nouveau patient (wizard) : email patient facultatif pour pro, infirmier, lab, sous-compte. */
const patientEmailOptional = computed(() => {
  if (patientMode.value !== 'new') return false;
  const r = user.value?.role ?? '';
  return r === 'nurse' || r === 'pro' || r === 'lab' || r === 'subaccount';
});

/** Id patient stable pour GET /patient-documents (évite ref/objet mal sérialisé par le select). */
const patientDocumentUserIdForForm = computed(() => {
  if (patientMode.value !== 'existing') return undefined;
  const id = selectedPatientId.value;
  if (id == null) return undefined;
  if (typeof id === 'number' && Number.isFinite(id)) return String(id);
  if (typeof id === 'string') {
    const s = id.trim();
    return s || undefined;
  }
  return undefined;
});

const patientSelectSearchPlaceholder = PATIENT_SELECT_SEARCH_PLACEHOLDER;

const patientSelectItems = computed(() => {
  const list = patients.value.filter((p) => p?.id != null);
  return list.map((p) => buildPatientSelectRow(p, { labelStyle: 'natural' }));
});

function clearPatientFieldsInForm() {
  const fd = formData.value || {};
  formData.value = {
    ...fd,
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    birth_date: '',
    gender: '',
    address: null,
    address_complement: '',
    personalFiles: {},
  };
}

function extractPatientCreateBody(payload: Record<string, any>): Record<string, unknown> {
  const addr = payload.address;
  let addressOut: Record<string, unknown> | null = null;
  if (addr && typeof addr === 'object' && addr !== null && 'label' in addr) {
    const a = addr as Record<string, unknown>;
    const lat = Number(a.lat);
    const lng = Number(a.lng);
    addressOut = {
      label: String(a.label ?? '').trim(),
      lat: Number.isFinite(lat) ? lat : 0,
      lng: Number.isFinite(lng) ? lng : 0,
    };
    const comp = (payload.address_complement as string | undefined)?.trim() || (a.complement as string | undefined)?.trim();
    if (comp) addressOut.complement = comp;
  }
  return {
    first_name: payload.first_name,
    last_name: payload.last_name,
    phone: payload.phone,
    email: (payload.email != null ? String(payload.email) : '').trim(),
    birth_date: payload.birth_date || null,
    gender: payload.gender || null,
    address: addressOut,
  };
}

async function createPatientRecord(payload: Record<string, any>): Promise<string> {
  const body = extractPatientCreateBody(payload);
  try {
    const res = (await apiFetch('/patients', { method: 'POST', body })) as {
      success?: boolean;
      data?: { id?: string };
      error?: string;
    };
    if (res?.success && res.data?.id) {
      return String(res.data.id);
    }
    throw new Error(res?.error || 'Création du patient impossible');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('existe déjà') || msg.includes('déjà avec cet email')) {
      throw new Error(
        'Un patient existe déjà avec cet e-mail. Choisissez « Patient dans la liste » ou modifiez l’e-mail.',
      );
    }
    throw e instanceof Error ? e : new Error(msg);
  }
}

async function loadCareCategories() {
  categoriesLoading.value = true;
  careCategoriesList.value = [];
  try {
    const response = await apiFetch('/categories', { method: 'GET' });
    if (response.success && response.data && Array.isArray(response.data) && response.data.length > 0) {
      careCategoriesList.value = response.data;
    }
  } catch (e) {
    console.error('Chargement catégories:', e);
  } finally {
    categoriesLoading.value = false;
  }
}

async function loadPatients() {
  if (!user.value?.id) return;
  patientsLoading.value = true;
  try {
    patients.value = await fetchAllPatientsForDashboard(apiFetch);
  } catch {
    patients.value = [];
  } finally {
    patientsLoading.value = false;
  }
}

async function applyPatientToForm(p: any) {
  if (!p) return;
  const addr = await resolvePatientAddressForRdvForm(p?.address);
  const parsed = parseRawPatientAddress(p?.address);
  const complement = addr?.complement ?? parsed?.complement ?? '';
  formData.value = {
    ...formData.value,
    first_name: p.first_name || '',
    last_name: p.last_name || '',
    email: p.email || '',
    phone: p.phone || '',
    birth_date: p.birth_date || '',
    gender: p.gender || '',
    address: addr ?? null,
    address_complement: complement || '',
  };
}

async function fetchAndApplyPatientDetail(id: string) {
  if (!id) return;
  let p: any = patients.value.find((x) => String(x.id) === String(id));
  patientProfileLoading.value = true;
  try {
    const res = await apiFetch(`/users/${encodeURIComponent(id)}`, { method: 'GET' });
    if (res?.success && res.data && typeof res.data === 'object') {
      const full = { ...(p || {}), ...res.data };
      const idx = patients.value.findIndex((x) => String(x.id) === String(id));
      if (idx >= 0) {
        patients.value[idx] = { ...patients.value[idx], ...res.data };
      }
      p = full;
    }
  } catch {
    /* conserver la ligne liste si l’API échoue */
  } finally {
    patientProfileLoading.value = false;
  }
  if (p?.id) await applyPatientToForm(p);
}

watch(selectedPatientId, (id) => {
  if (patientMode.value !== 'existing' || !id) return;
  void fetchAndApplyPatientDetail(id);
});

watch(patientMode, (m, prev) => {
  if (m === 'new') {
    selectedPatientId.value = undefined;
    if (prev === 'existing') {
      void nextTick(() => clearPatientFieldsInForm());
    }
  } else if (m === 'existing' && prev === 'new') {
    clearPatientFieldsInForm();
  }
});

async function confirmStep0() {
  if (selectedServices.value.length === 0) return;
  step.value = 1;
  await loadPatients();
  await applyPatientFromRoute();
  nextTick(() => {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

function prevStep() {
  if (step.value <= 0) return;
  step.value = 0;
  validationError.value = '';
  nextTick(() => {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/**
 * Le layout dashboard défile dans <main class="overflow-y-auto">, pas sur window.
 * scrollIntoView fait défiler le bon conteneur ; window.scrollTo ne bougeait pas la vue.
 * On cible d’abord l’UAlert récapitulatif ; sinon le bloc métier (#anchor).
 */
function scrollToValidationError(anchor?: string) {
  nextTick(() => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        const alertEl = document.getElementById('form-error-alert');
        const anchorEl = anchor ? document.getElementById(anchor) : null;
        const el = alertEl ?? anchorEl;
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          const main = document.querySelector('main.flex-1.overflow-y-auto');
          if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
          else window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 50);
    });
  });
}

async function onUnifiedSubmit(payload: any) {
  validationError.value = '';
  formData.value = payload;

  if (patientMode.value === 'existing' && !selectedPatientId.value) {
    validationError.value = 'Veuillez sélectionner un patient dans la liste.';
    scrollToValidationError('wizard-rdv-patient-card');
    return;
  }

  const err = validateUnifiedRdvPayload(payload, selectedServices.value, {
    patientEmailOptional: patientEmailOptional.value,
  });
  if (err) {
    validationError.value = err.message;
    scrollToValidationError(err.scrollAnchor);
    return;
  }

  const uid = user.value?.id;
  const role = user.value?.role || '';
  if (!uid) {
    toast.add({ title: 'Session', description: 'Utilisateur non connecté.', color: 'error' });
    return;
  }

  saving.value = true;
  try {
    let patientId: string;
    if (patientMode.value === 'existing') {
      patientId = String(selectedPatientId.value);
    } else {
      try {
        patientId = await createPatientRecord(payload);
      } catch (e: any) {
        toast.add({
          title: 'Création du patient',
          description: e?.message || 'Impossible de créer le patient',
          color: 'error',
        });
        scrollToValidationError('wizard-rdv-patient-card');
        return;
      }
    }

    const batchId = selectedServices.value.length > 1 ? crypto.randomUUID() : undefined;
    const payloads = buildDashboardAppointmentPayloads(patientId, payload, selectedServices.value, {
      creationBatchId: batchId,
      creatorRole: role,
      creatorUserId: uid,
    });

    const result = await createMultipleAppointments(payloads as any);
    if (result.success) {
      const n = result.createdIds?.length ?? payloads.length;
      toast.add({
        title: n > 1 ? 'Rendez-vous créés' : 'Rendez-vous créé',
        description: n > 1 ? `${n} rendez-vous ont été enregistrés.` : 'Le rendez-vous a été enregistré.',
        color: 'success',
        icon: 'i-lucide-check-circle',
      });
      const t = useState<number>('appointments.listRefreshTrigger', () => 0);
      t.value += 1;
      await router.push(`${props.basePath}/appointments`);
    } else {
      toast.add({
        title: 'Erreur',
        description: result.error || 'Création impossible',
        color: 'error',
        icon: 'i-lucide-alert-circle',
      });
    }
  } catch (e: any) {
    toast.add({
      title: 'Erreur',
      description: e?.message || 'Une erreur est survenue',
      color: 'error',
    });
  } finally {
    saving.value = false;
  }
}

async function applyPatientFromRoute() {
  const pid = route.query.patient_id;
  if (typeof pid !== 'string' || !pid) return;
  patientMode.value = 'existing';
  selectedPatientId.value = pid;
  await fetchAndApplyPatientDetail(pid);
}

onMounted(() => {
  void loadCareCategories();
});
</script>

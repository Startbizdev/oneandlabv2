<template>
  <form class="space-y-6" @submit.prevent="submit">
    <UCard class="ring-1 ring-default/60">
      <template #header>
        <h2 class="text-base font-medium">1. Patient</h2>
      </template>
      <UFormField v-if="!props.initialPatientId" label="Rechercher un patient" name="patient">
        <UInput
          v-model="patientSearch"
          placeholder="Nom, email, téléphone…"
          icon="i-lucide-search"
          size="md"
        />
      </UFormField>
      <div v-if="patientsLoading" class="mt-3 flex justify-center py-4">
        <UIcon name="i-lucide-loader-2" class="h-6 w-6 animate-spin text-primary" />
      </div>
      <ul v-else-if="patientItems.length" class="mt-3 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-default/60 p-1">
        <li v-for="item in patientItems" :key="item.id">
          <button
            type="button"
            class="w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50"
            :class="selectedPatientId === item.patient_id ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/40' : ''"
            @click="selectPatient(item)"
          >
            <span class="font-medium">{{ patientLabel(item) }}</span>
            <span v-if="item.email" class="mt-0.5 block text-xs text-muted">{{ item.email }}</span>
          </button>
        </li>
      </ul>
      <p v-if="selectedPatientLabel" class="mt-3 text-sm text-muted">
        Sélectionné : <span class="font-medium text-foreground">{{ selectedPatientLabel }}</span>
      </p>
    </UCard>

    <UCard class="ring-1 ring-default/60">
      <template #header>
        <h2 class="text-base font-medium">{{ isOwnPharmacy ? '2. Mode de retrait' : '2. Pharmacie et mode' }}</h2>
      </template>
      <p v-if="isOwnPharmacy" class="mb-4 rounded-lg border border-default/60 bg-muted/30 px-3 py-2.5 text-sm">
        Cette commande sera préparée par <span class="font-medium">votre pharmacie</span>.
      </p>
      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField v-if="!isOwnPharmacy" label="Code postal (filtre)" name="postal">
          <UInput v-model="postalCode" placeholder="Ex. 75001" @blur="loadPharmacies" />
        </UFormField>
        <UFormField label="Mode de retrait" name="mode">
          <USelect
            v-model="fulfillmentMode"
            :items="modeOptions"
            value-key="value"
            class="w-full"
            @update:model-value="loadPharmacies"
          />
        </UFormField>
      </div>
      <template v-if="!isOwnPharmacy">
        <div v-if="pharmaciesLoading" class="mt-3 flex justify-center py-4">
          <UIcon name="i-lucide-loader-2" class="h-6 w-6 animate-spin text-primary" />
        </div>
        <UFormField v-else label="Pharmacie" name="pharmacy" class="mt-3">
          <USelect
            v-model="pharmacyId"
            :items="pharmacyOptions"
            value-key="value"
            placeholder="Choisir une pharmacie…"
            class="w-full"
          />
        </UFormField>
      </template>
      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        <UFormField label="Date souhaitée" name="desired_date" required>
          <UInput v-model="desiredDate" type="date" :min="todayIso" :max="maximumDateIso" />
        </UFormField>
        <UFormField
          v-if="fulfillmentMode === 'home_delivery'"
          label="Adresse de livraison"
          name="delivery_address"
          required
        >
          <UInput v-model="deliveryAddress" placeholder="Adresse complète du patient" />
        </UFormField>
      </div>
    </UCard>

    <UCard class="ring-1 ring-default/60">
      <template #header>
        <h2 class="text-base font-medium">3. Ordonnances (optionnel)</h2>
      </template>
      <div class="space-y-4">
        <p class="text-sm text-muted">
          Ajoutez toutes les pages, notamment pour une ordonnance recto-verso. Vous pouvez aussi joindre une ordonnance déjà au dossier.
        </p>
        <p v-if="!selectedPatientId" class="text-sm text-muted">
          Sélectionnez d’abord un patient pour joindre une ordonnance.
        </p>
        <div v-else-if="docsLoading" class="flex justify-center py-4">
          <UIcon name="i-lucide-loader-2" class="h-6 w-6 animate-spin text-primary" />
        </div>
        <div v-else-if="ordonnanceOptions.length" class="space-y-2">
          <p class="text-xs font-medium uppercase tracking-wide text-muted">Déjà au dossier</p>
          <label
            v-for="doc in ordonnanceOptions"
            :key="doc.value"
            class="flex items-start gap-3 rounded-lg border border-default/60 px-3 py-2.5 text-sm"
          >
            <UCheckbox
              :model-value="selectedDocIds.includes(doc.value)"
              @update:model-value="(checked) => toggleDoc(doc.value, checked)"
            />
            <span>{{ doc.label }}</span>
          </label>
        </div>
        <div v-if="pendingFiles.length" class="space-y-2">
          <p class="text-xs font-medium uppercase tracking-wide text-muted">Pages à envoyer</p>
          <div
            v-for="(file, index) in pendingFiles"
            :key="pendingFileKey(file, index)"
            class="flex items-center justify-between gap-3 rounded-lg border border-default/60 px-3 py-2 text-sm"
          >
            <span class="min-w-0 truncate">Page {{ index + 1 }} · {{ file.name }}</span>
            <UButton
              type="button"
              variant="ghost"
              color="error"
              size="xs"
              icon="i-lucide-trash-2"
              @click="removePendingFile(index)"
            >
              Retirer
            </UButton>
          </div>
        </div>
        <input
          ref="fileInputRef"
          type="file"
          class="hidden"
          :accept="MEDICAL_DOCUMENT_ACCEPT"
          multiple
          @change="onOrdonnanceFilesChange"
        >
        <UButton
          type="button"
          color="neutral"
          variant="outline"
          icon="i-lucide-file-plus-2"
          :disabled="totalPrescriptionCount >= 10"
          @click="openOrdonnancePicker"
        >
          {{ pendingFiles.length ? 'Ajouter une autre page' : 'Ajouter une ordonnance' }}
        </UButton>
        <p
          v-if="selectedPatientId && !docsLoading && ordonnanceOptions.length === 0 && pendingFiles.length === 0"
          class="text-sm text-muted"
        >
          Aucune ordonnance pour l’instant — vous pouvez envoyer la commande sans document.
        </p>
      </div>
      <UFormField label="Commentaire (optionnel)" name="comment" class="mt-4">
        <UTextarea v-model="comment" :rows="3" placeholder="Instructions pour la pharmacie…" />
      </UFormField>
    </UCard>

    <div class="flex justify-end gap-2">
      <UButton variant="ghost" color="neutral" :to="roleBase">
        Annuler
      </UButton>
      <UButton type="submit" color="primary" :loading="submitting" icon="i-lucide-send">
        Envoyer la commande
      </UButton>
    </div>
  </form>
</template>

<script setup lang="ts">
import type { PharmacyFulfillmentMode } from '@oneandlab/shared-types';
import { PHARMACY_FULFILLMENT_LABELS } from '@oneandlab/shared-constants';
import { isPharmacyAccount } from '@oneandlab/shared-utils';
import type { StaffHubPatientItem } from '@oneandlab/shared-types';
import { apiFetch } from '~/utils/api';
import { fetchStaffPatientHubSearch } from '~/utils/staff-patient-hub-search';
import {
  MEDICAL_DOCUMENT_ACCEPT,
  isAllowedMedicalDocumentFile,
  isMedicalDocumentTooLarge,
  medicalDocumentFormatError,
} from '~/utils/medical-document-upload';

const props = withDefaults(
  defineProps<{
    roleBase: string;
    redirectToList?: boolean;
    initialPatientId?: string;
  }>(),
  { redirectToList: true },
);

const router = useRouter();
const toast = useAppToast();
const { user } = useAuth();
const { createOrder, fetchPharmacies, uiFlags, fetchModuleFlags } = usePharmacyModule();
const isOwnPharmacy = computed(() => {
  if (uiFlags.value?.is_pharmacy_account || uiFlags.value?.can_receive) return true;
  return isPharmacyAccount({
    role: user.value?.role,
    emploi: user.value?.emploi ?? null,
  });
});

const patientSearch = ref('');
const debouncedPatientSearch = ref('');
const patientItems = ref<StaffHubPatientItem[]>([]);
const patientsLoading = ref(false);
const selectedPatientId = ref(props.initialPatientId ?? '');
const selectedPatientLabel = ref(props.initialPatientId ? 'Patient présélectionné' : '');

const postalCode = ref('');
const fulfillmentMode = ref<PharmacyFulfillmentMode>('click_collect');
const pharmacyId = ref('');
const pharmaciesLoading = ref(false);
const pharmacyOptions = ref<{ label: string; value: string }[]>([]);
const desiredDate = ref(new Date().toISOString().slice(0, 10));
const deliveryAddress = ref('');
const todayIso = new Date().toISOString().slice(0, 10);
const maximumDateIso = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);

const docsLoading = ref(false);
const ordonnanceOptions = ref<{ label: string; value: string }[]>([]);
const selectedDocIds = ref<string[]>([]);
const pendingFiles = ref<File[]>([]);
const fileInputRef = ref<HTMLInputElement | null>(null);
const comment = ref('');
const submitting = ref(false);
const totalPrescriptionCount = computed(() => selectedDocIds.value.length + pendingFiles.value.length);

const modeOptions = [
  { label: PHARMACY_FULFILLMENT_LABELS.click_collect, value: 'click_collect' },
  { label: PHARMACY_FULFILLMENT_LABELS.home_delivery, value: 'home_delivery' },
];

let patientDebounce: ReturnType<typeof setTimeout> | null = null;
watch(patientSearch, (q) => {
  if (patientDebounce) clearTimeout(patientDebounce);
  patientDebounce = setTimeout(() => {
    debouncedPatientSearch.value = q;
  }, 250);
});

watch(debouncedPatientSearch, () => {
  void loadPatients();
}, { immediate: true });

watch(selectedPatientId, (id) => {
  selectedDocIds.value = [];
  pendingFiles.value = [];
  if (id) void loadDocuments(id);
  else ordonnanceOptions.value = [];
});

watch(fulfillmentMode, () => {
  if (!isOwnPharmacy.value) void loadPharmacies();
});

watch(
  [isOwnPharmacy, () => user.value?.id ?? user.value?.user_id],
  ([own, uid]) => {
    if (own && uid) pharmacyId.value = String(uid);
  },
  { immediate: true },
);

function patientLabel(item: StaffHubPatientItem): string {
  return `${item.first_name} ${item.last_name}`.trim();
}

function selectPatient(item: StaffHubPatientItem) {
  selectedPatientId.value = item.patient_id;
  selectedPatientLabel.value = patientLabel(item);
}

function toggleDoc(id: string, checked: boolean | 'indeterminate') {
  if (checked === true) {
    if (totalPrescriptionCount.value >= 10) {
      toast.add({ title: 'Dix ordonnances maximum', color: 'warning' });
      return;
    }
    if (!selectedDocIds.value.includes(id)) {
      selectedDocIds.value = [...selectedDocIds.value, id];
    }
  } else {
    selectedDocIds.value = selectedDocIds.value.filter((x) => x !== id);
  }
}

function pendingFileKey(file: File, index: number): string {
  return `${file.name}-${file.size}-${file.lastModified}-${index}`;
}

function removePendingFile(index: number) {
  pendingFiles.value = pendingFiles.value.filter((_, i) => i !== index);
}

function openOrdonnancePicker() {
  if (!selectedPatientId.value) {
    toast.add({ title: 'Sélectionnez d’abord un patient', color: 'warning' });
    return;
  }
  fileInputRef.value?.click();
}

function onOrdonnanceFilesChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  input.value = '';
  if (files.length === 0) return;

  const next = [...pendingFiles.value];
  for (const file of files) {
    if (next.length + selectedDocIds.value.length >= 10) {
      toast.add({ title: 'Dix pages maximum', color: 'warning' });
      break;
    }
    if (!isAllowedMedicalDocumentFile(file, 'ordonnance')) {
      toast.add({ title: medicalDocumentFormatError('ordonnance'), color: 'warning' });
      continue;
    }
    if (isMedicalDocumentTooLarge(file)) {
      toast.add({ title: 'Fichier trop volumineux (25 Mo max)', color: 'warning' });
      continue;
    }
    next.push(file);
  }
  pendingFiles.value = next;
}

async function uploadPendingOrdonnances(patientId: string): Promise<string[]> {
  const ids: string[] = [];
  for (const file of pendingFiles.value) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', 'ordonnance');
    formData.append('patient_id', patientId);
    const res = (await apiFetch('/medical-documents', {
      method: 'POST',
      body: formData,
    })) as { success?: boolean; data?: { id?: string }; error?: string };
    const id = res.data?.id ? String(res.data.id) : '';
    if (!res.success || !id) {
      throw new Error(res.error || 'Upload ordonnance échoué');
    }
    ids.push(id);
  }
  return ids;
}

async function loadPatients() {
  patientsLoading.value = true;
  try {
    const data = await fetchStaffPatientHubSearch(debouncedPatientSearch.value, 30);
    patientItems.value = (data.items ?? []).filter((i): i is StaffHubPatientItem => i.kind === 'patient');
  } catch {
    patientItems.value = [];
  } finally {
    patientsLoading.value = false;
  }
}

async function loadPharmacies() {
  if (isOwnPharmacy.value) return;
  pharmaciesLoading.value = true;
  try {
    const items = await fetchPharmacies(postalCode.value, fulfillmentMode.value);
    pharmacyOptions.value = items.map((p) => ({
      value: p.id,
      label: `${p.display_name}${p.postal_code ? ` (${p.postal_code})` : ''}${p.is_favorite ? ' ★' : ''}`,
    }));
    if (pharmacyId.value && !pharmacyOptions.value.some((o) => o.value === pharmacyId.value)) {
      pharmacyId.value = '';
    }
  } catch (e: unknown) {
    pharmacyOptions.value = [];
    toast.add({
      title: 'Pharmacies',
      description: e instanceof Error ? e.message : 'Catalogue indisponible',
      color: 'error',
    });
  } finally {
    pharmaciesLoading.value = false;
  }
}

async function loadDocuments(patientId: string) {
  docsLoading.value = true;
  try {
    const res = (await apiFetch(`/patient-documents?user_id=${encodeURIComponent(patientId)}`, {
      method: 'GET',
    })) as { success?: boolean; data?: Array<{ document_type?: string; medical_document_id?: string; file_name?: string }> };
    const docs = (res.data ?? []).filter(
      (d) => d.medical_document_id && d.document_type === 'ordonnance',
    );
    ordonnanceOptions.value = docs.map((d) => ({
      value: String(d.medical_document_id),
      label: d.file_name || `Ordonnance ${String(d.medical_document_id).slice(0, 8)}…`,
    }));
  } catch {
    ordonnanceOptions.value = [];
  } finally {
    docsLoading.value = false;
  }
}

async function submit() {
  if (!selectedPatientId.value) {
    toast.add({ title: 'Patient requis', color: 'warning' });
    return;
  }
  if (!pharmacyId.value) {
    toast.add({ title: 'Pharmacie requise', color: 'warning' });
    return;
  }
  if (!desiredDate.value) {
    toast.add({ title: 'Date souhaitée requise', color: 'warning' });
    return;
  }
  if (fulfillmentMode.value === 'home_delivery' && !deliveryAddress.value.trim()) {
    toast.add({ title: 'Adresse de livraison requise', color: 'warning' });
    return;
  }
  submitting.value = true;
  try {
    const uploadedIds = await uploadPendingOrdonnances(selectedPatientId.value);
    const order = await createOrder({
      patient_id: selectedPatientId.value,
      pharmacy_id: pharmacyId.value,
      fulfillment_mode: fulfillmentMode.value,
      desired_fulfillment_date: desiredDate.value,
      delivery_address: fulfillmentMode.value === 'home_delivery'
        ? { formatted_address: deliveryAddress.value.trim(), label: deliveryAddress.value.trim() }
        : null,
      prescription_document_ids: [...selectedDocIds.value, ...uploadedIds],
      requester_comment: comment.value.trim() || null,
    });
    toast.add({ title: 'Commande créée', color: 'success' });
    await router.push(props.redirectToList ? props.roleBase : `${props.roleBase}/${order.id}`);
  } catch (e: unknown) {
    toast.add({
      title: 'Erreur',
      description: e instanceof Error ? e.message : 'Création impossible',
      color: 'error',
    });
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  void fetchModuleFlags().catch(() => {});
  if (!isOwnPharmacy.value) void loadPharmacies();
  if (selectedPatientId.value) void loadDocuments(selectedPatientId.value);
});
</script>

<template>
  <UCard v-if="visible" class="overflow-hidden">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-map-pin" class="h-5 w-5 text-primary" />
        <span class="font-semibold text-gray-900 dark:text-white">Adresse du rendez-vous</span>
      </div>
    </template>

    <div class="space-y-4">
      <div
        v-if="currentAddressLabel"
        class="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-900/40"
      >
        <p class="font-medium text-gray-900 dark:text-white">Actuellement</p>
        <p class="mt-1 whitespace-pre-wrap text-gray-600 dark:text-gray-300">{{ currentAddressLabel }}</p>
      </div>

      <AddressSelector
        v-model="selectedAddress"
        label="Nouvelle adresse"
        name="admin_appointment_address"
        placeholder="Rechercher une adresse (BAN)…"
        :show-complement="true"
        :complement-value="addressComplement"
        @update:complement="addressComplement = $event"
      />

      <UButton
        type="button"
        color="primary"
        variant="solid"
        size="md"
        leading-icon="i-lucide-check"
        block
        :loading="saving"
        :disabled="!canSave"
        :on-click="onSave"
      >
        Enregistrer l’adresse
      </UButton>

      <p v-if="!canSave && selectedAddress" class="text-center text-xs text-gray-500">
        Sélectionnez une adresse dans les suggestions pour valider les coordonnées GPS.
      </p>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { apiFetch } from '~/utils/api';
import { appointmentDetailAddressLine } from '~/utils/address-display';
import { parseRawPatientAddress } from '~/utils/patient-address-rdv';
import AddressSelector from '~/components/ui/AddressSelector.vue';

type AddressValue = {
  label: string;
  lat?: number;
  lng?: number;
  complement?: string;
};

const props = defineProps<{
  appointment: Record<string, unknown> | null;
  loadAppointment: () => Promise<void>;
}>();

const toast = useAppToast();
const saving = ref(false);
const selectedAddress = ref<AddressValue | null>(null);
const addressComplement = ref('');

const visible = computed(() => {
  const a = props.appointment;
  if (!a?.id) return false;
  const status = String(a.status ?? '').toLowerCase();
  return !['canceled', 'cancelled', 'completed'].includes(status);
});

const currentAddressLabel = computed(() => {
  const line = appointmentDetailAddressLine(props.appointment);
  return line?.trim() || '';
});

function syncFromAppointment() {
  const apt = props.appointment;
  if (!apt) {
    selectedAddress.value = null;
    addressComplement.value = '';
    return;
  }
  const parsed =
    parseRawPatientAddress(apt.address) ??
    parseRawPatientAddress((apt.form_data as Record<string, unknown> | undefined)?.address);
  if (parsed?.label) {
    selectedAddress.value = {
      label: parsed.label,
      lat: parsed.lat,
      lng: parsed.lng,
    };
    addressComplement.value = parsed.complement ?? '';
  } else {
    selectedAddress.value = null;
    addressComplement.value = '';
  }
}

watch(
  () => props.appointment,
  () => syncFromAppointment(),
  { immediate: true, deep: true },
);

const canSave = computed(() => {
  const addr = selectedAddress.value;
  if (!addr?.label?.trim()) return false;
  if (typeof addr.lat !== 'number' || typeof addr.lng !== 'number') return false;
  const current = parseRawPatientAddress(props.appointment?.address);
  const sameLabel = current?.label?.trim() === addr.label.trim();
  const sameComplement = (current?.complement ?? '') === addressComplement.value.trim();
  return !(sameLabel && sameComplement);
});

async function onSave() {
  const apt = props.appointment;
  const addr = selectedAddress.value;
  if (!apt?.id || !addr?.label?.trim()) return;
  if (typeof addr.lat !== 'number' || typeof addr.lng !== 'number') {
    toast.add({
      title: 'Adresse incomplète',
      description: 'Choisissez une adresse dans la liste de suggestions.',
      color: 'warning',
    });
    return;
  }

  saving.value = true;
  try {
    const fd = { ...((apt.form_data as Record<string, unknown> | undefined) ?? {}) };
    const complement = addressComplement.value.trim();
    const addressPayload: Record<string, unknown> = {
      label: addr.label.trim(),
      lat: addr.lat,
      lng: addr.lng,
    };
    if (complement) {
      addressPayload.complement = complement;
      fd.address_complement = complement;
    }
    fd.address = addressPayload;

    const res = await apiFetch(`/appointments/${encodeURIComponent(String(apt.id))}`, {
      method: 'PUT',
      body: { address: addressPayload, form_data: fd },
    });
    if (!res?.success) {
      throw new Error((res as { error?: string })?.error || 'Mise à jour impossible');
    }
    toast.add({ title: 'Adresse enregistrée', color: 'success' });
    await props.loadAppointment();
  } catch (e: unknown) {
    toast.add({
      title: 'Adresse',
      description: e instanceof Error ? e.message : 'Erreur lors de la mise à jour',
      color: 'error',
    });
  } finally {
    saving.value = false;
  }
}
</script>

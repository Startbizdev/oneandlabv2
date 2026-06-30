<template>
  <UCard v-if="show">
    <template #header>
      <h3 class="text-base font-medium">Signature ordonnance</h3>
    </template>
    <p class="text-sm text-muted mb-4">
      Cette signature apparaît sur vos ordonnances PDF lorsque vous cochez « Inclure ma signature ».
    </p>
    <div
      v-if="previewUri"
      class="mb-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3"
    >
      <img :src="previewUri" alt="Signature enregistrée" class="mx-auto max-h-20 object-contain" />
    </div>
    <p v-else class="text-sm text-muted mb-4">Aucune signature enregistrée.</p>
    <div class="flex flex-wrap gap-2">
      <UButton size="sm" color="primary" variant="soft" @click="sheetOpen = true">
        {{ previewUri ? 'Modifier' : 'Créer ma signature' }}
      </UButton>
      <UButton
        v-if="previewUri"
        size="sm"
        color="neutral"
        variant="ghost"
        :loading="clearing"
        @click="clearSignature"
      >
        Supprimer
      </UButton>
    </div>

    <UModal v-model:open="sheetOpen" title="Signature manuscrite">
      <template #body>
        <PrescriptionSignaturePad ref="padRef" />
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="sheetOpen = false">Annuler</UButton>
          <UButton color="primary" :loading="saving" @click="saveSignature">Enregistrer</UButton>
        </div>
      </template>
    </UModal>
  </UCard>
</template>

<script setup lang="ts">
import PrescriptionSignaturePad from '~/components/prescription/PrescriptionSignaturePad.vue';

const props = defineProps<{
  userId: string;
  signaturePng?: string | null;
  show?: boolean;
}>();

const emit = defineEmits<{ saved: [] }>();
const toast = useAppToast();

const sheetOpen = ref(false);
const padRef = ref<InstanceType<typeof PrescriptionSignaturePad> | null>(null);
const saving = ref(false);
const clearing = ref(false);

const previewUri = computed(() => {
  const raw = props.signaturePng?.trim();
  if (!raw) return null;
  return raw.startsWith('data:') ? raw : `data:image/png;base64,${raw}`;
});

watch(sheetOpen, (open) => {
  if (open) {
    nextTick(() => padRef.value?.loadFromBase64(props.signaturePng ?? null));
  }
});

async function saveSignature() {
  const png = padRef.value?.exportPngBase64();
  if (!png) {
    toast.add({ title: 'Signature requise', description: 'Dessinez votre signature.', color: 'warning' });
    return;
  }
  saving.value = true;
  try {
    const res = await apiFetch(`/users/${props.userId}`, {
      method: 'PUT',
      body: { prescription_signature_png: png },
    });
    if (!res?.success) throw new Error((res as any)?.error ?? 'Enregistrement impossible');
    toast.add({ title: 'Signature enregistrée', color: 'success' });
    sheetOpen.value = false;
    emit('saved');
  } catch (e: any) {
    toast.add({ title: 'Erreur', description: e?.message ?? 'Enregistrement impossible', color: 'error' });
  } finally {
    saving.value = false;
  }
}

async function clearSignature() {
  clearing.value = true;
  try {
    const res = await apiFetch(`/users/${props.userId}`, {
      method: 'PUT',
      body: { prescription_signature_png: null },
    });
    if (!res?.success) throw new Error((res as any)?.error ?? 'Suppression impossible');
    toast.add({ title: 'Signature supprimée', color: 'success' });
    emit('saved');
  } catch (e: any) {
    toast.add({ title: 'Erreur', description: e?.message ?? 'Suppression impossible', color: 'error' });
  } finally {
    clearing.value = false;
  }
}
</script>

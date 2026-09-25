<template>
  <AppPageShell max-width="7xl" class="space-y-6">
    <template #pageHeader>
      <AppPageHeader :edge-bleed="false" title="Ordonnances" :description="pageDescription">
        <template #actions>
          <UButton variant="ghost" color="neutral" icon="i-lucide-arrow-left" :to="detailPath">
            Retour à la commande
          </UButton>
        </template>
      </AppPageHeader>
    </template>

    <div v-if="loading" class="flex justify-center py-16">
      <UIcon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-primary" />
    </div>

    <UEmpty
      v-else-if="!documentIds.length"
      icon="i-lucide-file-text"
      title="Aucune ordonnance"
      description="Aucun fichier n’a été joint à cette commande."
      variant="naked"
      class="py-10"
    />

    <UCard v-else class="ring-1 ring-default/60">
      <p class="mb-4 text-sm text-muted">{{ leadText }}</p>
      <ul class="divide-y divide-default/60">
        <li
          v-for="(documentId, index) in documentIds"
          :key="documentId"
          class="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"
        >
          <div class="min-w-0">
            <p class="font-medium">{{ documentIds.length > 1 ? `Ordonnance ${index + 1}` : 'Ordonnance' }}</p>
            <p class="text-xs text-muted font-mono truncate">{{ documentId }}</p>
          </div>
          <UButton
            variant="outline"
            icon="i-lucide-download"
            :loading="downloadingId === documentId"
            @click="() => downloadOne(documentId, index)"
          >
            Télécharger
          </UButton>
        </li>
      </ul>
    </UCard>
  </AppPageShell>
</template>

<script setup lang="ts">
import { downloadMedicalDocument } from '~/utils/download-medical-document';

const props = defineProps<{
  orderId: string;
  listPath: string;
}>();

const toast = useAppToast();
const { fetchOrder } = usePharmacyModule();

const loading = ref(true);
const documentIds = ref<string[]>([]);
const downloadingId = ref<string | null>(null);

const detailPath = computed(() => `${props.listPath}/${props.orderId}`);

const leadText = computed(() =>
  documentIds.value.length === 1
    ? '1 ordonnance jointe à cette commande.'
    : `${documentIds.value.length} ordonnances jointes à cette commande.`,
);

const pageDescription = computed(() =>
  documentIds.value.length
    ? `${documentIds.value.length} fichier${documentIds.value.length > 1 ? 's' : ''}`
    : 'Commande pharmacie',
);

async function downloadOne(documentId: string, index: number) {
  downloadingId.value = documentId;
  try {
    await downloadMedicalDocument(documentId, `ordonnance-${index + 1}`);
  } catch (e: unknown) {
    toast.add({
      title: 'Téléchargement impossible',
      description: e instanceof Error ? e.message : 'Réessayez plus tard.',
      color: 'error',
    });
  } finally {
    downloadingId.value = null;
  }
}

async function load() {
  loading.value = true;
  try {
    const order = await fetchOrder(props.orderId);
    documentIds.value = order?.prescription_document_ids ?? [];
  } catch (e: unknown) {
    toast.add({
      title: 'Erreur',
      description: e instanceof Error ? e.message : 'Commande introuvable',
      color: 'error',
    });
    documentIds.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void load();
});
</script>

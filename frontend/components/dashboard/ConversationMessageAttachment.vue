<template>
  <div v-if="documentId" class="mt-2 space-y-2">
    <div
      v-if="isImage && previewUrl"
      class="overflow-hidden rounded-lg border border-gray-200/80 dark:border-gray-700"
    >
      <img
        :src="previewUrl"
        :alt="label"
        class="max-h-56 w-full object-contain bg-gray-50 dark:bg-gray-900/50"
        loading="lazy"
      />
    </div>
    <div v-else-if="isImage && loading" class="flex items-center gap-2 text-xs text-gray-500">
      <UIcon name="i-lucide-loader-2" class="h-4 w-4 animate-spin" />
      Chargement de l’image…
    </div>
    <button
      type="button"
      class="text-xs font-medium text-primary-600 underline dark:text-primary-400"
      :disabled="downloading"
      @click="openAttachment"
    >
      {{ downloading ? 'Ouverture…' : label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { apiFetchBlob } from '~/utils/api';
import { downloadMedicalDocument } from '~/utils/download-medical-document';

const props = defineProps<{
  documentId: string;
  fileName?: string | null;
  mimeType?: string | null;
}>();

const previewUrl = ref<string | null>(null);
const loading = ref(false);
const downloading = ref(false);
const loadError = ref(false);

const mime = computed(() => String(props.mimeType ?? '').toLowerCase());
const isImage = computed(() => mime.value.startsWith('image/'));
const isPdf = computed(() => mime.value === 'application/pdf');

const label = computed(() => {
  const name = props.fileName?.trim();
  if (name) return name;
  if (isPdf.value) return 'Afficher le PDF';
  if (isImage.value) return 'Afficher l’image';
  return 'Afficher la pièce jointe';
});

async function loadImagePreview() {
  if (!isImage.value || previewUrl.value || loadError.value) return;
  loading.value = true;
  try {
    const { blob } = await apiFetchBlob(
      `/medical-documents/${encodeURIComponent(props.documentId)}/download`,
    );
    previewUrl.value = URL.createObjectURL(blob);
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

async function openAttachment() {
  downloading.value = true;
  try {
    await downloadMedicalDocument(props.documentId, props.fileName ?? undefined);
  } finally {
    downloading.value = false;
  }
}

watch(
  () => props.documentId,
  () => {
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value);
      previewUrl.value = null;
    }
    loadError.value = false;
    void loadImagePreview();
  },
  { immediate: true },
);

onUnmounted(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
});
</script>

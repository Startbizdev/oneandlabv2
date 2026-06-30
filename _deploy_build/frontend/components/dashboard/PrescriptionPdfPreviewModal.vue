<template>
  <UModal v-model:open="open" :ui="{ content: 'max-w-4xl w-full' }">
    <template #content>
      <div class="p-4 sm:p-6 space-y-4">
        <div class="flex items-center justify-between gap-3">
          <h3 class="text-lg font-medium truncate">{{ title }}</h3>
          <UButton color="neutral" variant="ghost" icon="i-lucide-x" @click="open = false" />
        </div>
        <div v-if="loading" class="flex justify-center py-16">
          <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary" />
        </div>
        <iframe
          v-else-if="embedUrl"
          :src="embedUrl"
          class="w-full h-[70vh] rounded-lg border border-default/60 bg-default/5"
          title="Aperçu PDF"
        />
        <p v-else class="text-sm text-muted py-8 text-center">Impossible d'afficher l'aperçu.</p>
        <div class="flex flex-wrap justify-end gap-2">
          <UButton
            v-if="embedUrl"
            color="primary"
            variant="soft"
            leading-icon="i-lucide-download"
            :loading="downloading"
            @click="downloadPdf"
          >
            Télécharger
          </UButton>
          <UButton color="neutral" variant="outline" @click="open = false">Fermer</UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    pdfUrl?: string | null;
    fileName?: string;
    title?: string;
  }>(),
  { title: 'Aperçu ordonnance' },
);

const emit = defineEmits<{ 'update:modelValue': [boolean] }>();

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});

const loading = ref(false);
const downloading = ref(false);

const embedUrl = computed(() => {
  if (!props.pdfUrl) return '';
  return `${props.pdfUrl}#toolbar=1&navpanes=0&view=FitH`;
});

async function downloadPdf() {
  if (!props.pdfUrl) return;
  downloading.value = true;
  try {
    const a = document.createElement('a');
    a.href = props.pdfUrl;
    a.download = props.fileName?.endsWith('.pdf') ? props.fileName : `${props.fileName ?? 'ordonnance'}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } finally {
    downloading.value = false;
  }
}
</script>

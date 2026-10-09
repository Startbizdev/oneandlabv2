<template>
  <UModal :open="open" title="Confrères" @update:open="(value: boolean) => { if (!value) emit('close') }">
    <template #body>
      <div v-if="loading" class="flex justify-center py-8">
        <UIcon name="i-lucide-loader-2" class="h-6 w-6 animate-spin text-primary-500" />
      </div>
      <UAlert
        v-else-if="error"
        color="error"
        variant="soft"
        :title="error"
        :actions="[{ label: 'Réessayer', color: 'neutral', variant: 'outline', onClick: load }]"
      />
      <UEmpty
        v-else-if="items.length === 0"
        icon="i-lucide-users"
        title="Aucun partage en cours"
        description="Un confrère peut vous remplacer sur une période."
        variant="naked"
        class="py-6"
      />
      <NurseCollaborationList v-else :items="items" :viewer-id="viewerId" @removed="load" />
    </template>
    <template #footer>
      <UButton block icon="i-lucide-user-plus" @click="() => { addOpen = true }">Ajouter un confrère</UButton>
    </template>
  </UModal>

  <NurseCoNurseAddModal
    :open="addOpen"
    :default-date="date"
    :exclude-ids="viewerId ? [viewerId] : []"
    @close="addOpen = false"
    @added="load"
  />
</template>

<script setup lang="ts">
import type { NurseCollaboration } from '@oneandlab/shared-types';

const props = defineProps<{
  open: boolean;
  viewerId: string | null | undefined;
  /** Jour affiché dans la tournée : premier jour proposé pour la période. */
  date: string;
}>();

const emit = defineEmits<{ close: [] }>();

const { list } = useNurseCollaborations();
const items = ref<NurseCollaboration[]>([]);
const loading = ref(false);
const error = ref('');
const addOpen = ref(false);

async function load() {
  loading.value = true;
  error.value = '';
  try {
    items.value = await list();
  } catch (e) {
    error.value = e instanceof Error && e.message ? e.message : 'Confrères indisponibles';
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.open,
  (open) => {
    if (open) void load();
  },
  { immediate: true },
);
</script>

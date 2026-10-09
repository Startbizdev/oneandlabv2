<template>
  <UCard v-if="guest || canAdd" :ui="{ body: 'p-4 sm:p-4' }">
    <div class="space-y-3">
      <h3 class="text-sm font-semibold">Infirmiers</h3>
      <UAlert
        v-if="error"
        color="error"
        variant="soft"
        :title="error"
        :actions="[{ label: 'Réessayer', color: 'neutral', variant: 'outline', onClick: load }]"
      />
      <NurseCollaborationList
        v-else-if="visibleItems.length"
        :items="visibleItems"
        :viewer-id="viewerId"
        @removed="onRemoved"
      />
      <UButton
        v-if="canAdd"
        color="neutral"
        variant="outline"
        block
        icon="i-lucide-user-plus"
        @click="() => { addOpen = true }"
      >
        Ajouter un confrère
      </UButton>
    </div>

    <NurseCoNurseAddModal
      v-if="canAdd"
      :open="addOpen"
      :appointment-id="appointment.id"
      :passage-series-id="passageSeriesId ?? appointment.passage_series_id ?? null"
      :allow-range="false"
      :exclude-ids="viewerId ? [viewerId] : []"
      @close="addOpen = false"
      @added="onAdded"
    />
  </UCard>
</template>

<script setup lang="ts">
import type { NurseCollaboration } from '@oneandlab/shared-types';
import { canAddCoNurse, isCoNurseViewer } from '@oneandlab/shared-utils';

type CoNurseAppointment = {
  id: string;
  status?: string | null;
  assigned_nurse_id?: string | null;
  is_co_nurse?: boolean;
  passage_series_id?: string | null;
};

const props = defineProps<{
  appointment: CoNurseAppointment;
  viewerId: string | null | undefined;
  /** Fiche passage en série : propose « Toute la série ». */
  passageSeriesId?: string | null;
}>();

const emit = defineEmits<{
  /** Le confrère s'est retiré : il n'a plus accès à la fiche. */
  'self-removed': [];
  changed: [];
}>();

const { list } = useNurseCollaborations();
const items = ref<NurseCollaboration[]>([]);
const error = ref('');
const addOpen = ref(false);

const guest = computed(() => isCoNurseViewer(props.appointment));
const canAdd = computed(() => canAddCoNurse(props.appointment, props.viewerId));
const visibleItems = computed(() =>
  items.value.filter((item) => !guest.value || item.co_nurse_id === props.viewerId),
);

async function load() {
  if (!guest.value && !canAdd.value) return;
  error.value = '';
  try {
    items.value = await list(props.appointment.id);
  } catch (e) {
    error.value = e instanceof Error && e.message ? e.message : 'Confrères indisponibles';
  }
}

watch(() => [props.appointment.id, guest.value, canAdd.value], load, { immediate: true });

function onAdded() {
  void load();
  emit('changed');
}

function onRemoved(self: boolean) {
  if (self) {
    emit('self-removed');
    return;
  }
  void load();
  emit('changed');
}
</script>

<template>
  <UModal v-model:open="openModel" title="Quelle planification ?">
    <template #body>
      <div class="space-y-3">
        <UButton
          block
          variant="outline"
          color="neutral"
          @click="pick('single_day')"
        >
          <div class="text-left">
            <p class="font-semibold">Passage uniquement ce jour</p>
            <p class="text-sm text-gray-500">{{ dateLabel }}</p>
          </div>
        </UButton>
        <UButton
          block
          variant="outline"
          color="neutral"
          @click="pick('recurring')"
        >
          <div class="text-left">
            <p class="font-semibold">Passage chronique ou un autre jour</p>
            <p class="text-sm opacity-80">Intervalle, jours ou dates au choix</p>
          </div>
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const props = defineProps<{
  open: boolean;
  selectedDate: string;
}>();

const emit = defineEmits<{
  close: [];
  select: [mode: 'single_day' | 'recurring'];
}>();

const openModel = computed({
  get: () => props.open,
  set: (v: boolean) => {
    if (!v) emit('close');
  },
});

const dateLabel = computed(() => {
  try {
    return new Date(`${props.selectedDate}T12:00:00`).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  } catch {
    return props.selectedDate;
  }
});

function pick(mode: 'single_day' | 'recurring') {
  emit('select', mode);
  emit('close');
}
</script>

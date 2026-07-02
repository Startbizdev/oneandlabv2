<template>
  <UModal v-model:open="open" title="Ordre des passages">
    <template #body>
      <p v-if="activeLabel" class="mb-3 text-xs text-gray-500 dark:text-gray-400">
        Actuel : {{ activeLabel }}
      </p>
      <ul class="space-y-2">
        <li v-for="mode in modes" :key="mode.value">
          <button
            type="button"
            class="flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors"
            :class="
              sortMode === mode.value
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30'
                : 'border-gray-200 bg-gray-50 hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900/50'
            "
            @click="select(mode.value)"
          >
            <span>
              <span class="block text-sm font-semibold text-gray-900 dark:text-white">{{ mode.label }}</span>
              <span class="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">{{ mode.hint }}</span>
            </span>
            <UIcon
              v-if="sortMode === mode.value"
              name="i-lucide-check"
              class="h-5 w-5 shrink-0 text-primary-500"
            />
          </button>
        </li>
      </ul>
      <UButton
        v-if="locked"
        block
        color="error"
        variant="soft"
        class="mt-4"
        icon="i-lucide-rotate-ccw"
        @click="onReset"
      >
        Réinitialiser l'ordre
      </UButton>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { TourSortMode } from '~/composables/useNurseTourWeb';

const modes: { value: TourSortMode; label: string; hint: string }[] = [
  { value: 'smart', label: 'Intelligent', hint: 'Créneaux + proximité GPS' },
  { value: 'schedule', label: 'Créneaux', hint: 'Ordre horaire des passages' },
  { value: 'nearest', label: 'Proximité', hint: 'Du plus proche au plus loin' },
  { value: 'manual', label: 'Manuel', hint: 'Réorganiser avec les flèches' },
];

const props = defineProps<{
  sortMode: TourSortMode;
  locked: boolean;
}>();

const open = defineModel<boolean>('open', { default: false });

const emit = defineEmits<{
  select: [mode: TourSortMode];
  reset: [];
}>();

const activeLabel = computed(() => modes.find((m) => m.value === props.sortMode)?.label ?? '');

function select(mode: TourSortMode) {
  if (mode === props.sortMode) {
    open.value = false;
    return;
  }
  if (props.locked && mode !== 'manual') {
    const ok = window.confirm('Remplacer votre ordre manuel par un tri automatique ?');
    if (!ok) return;
  }
  emit('select', mode);
  open.value = false;
}

function onReset() {
  emit('reset');
  open.value = false;
}
</script>

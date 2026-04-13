<template>
  <ClientOnly>
    <Teleport to="body">
      <UModal v-model:open="isOpen" :ui="{ content: 'max-w-md w-full' }">
        <template #content="{ close: closeSlot }">
          <UCard class="w-full border-0">
            <template #header>
              <DialogTitle class="sr-only">Redispatcher le rendez-vous</DialogTitle>
              <DialogDescription class="sr-only">
                Confirmer la remise en attente du rendez-vous pour proposition à un autre infirmier.
              </DialogDescription>
              <div class="flex items-start justify-between gap-4">
                <div class="flex items-start gap-3 min-w-0">
                  <div
                    class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                  >
                    <UIcon name="i-lucide-refresh-ccw" class="w-5 h-5" />
                  </div>
                  <div class="min-w-0">
                    <h2 class="text-lg font-semibold text-gray-900 dark:text-white leading-tight">
                      Redispatcher le rendez-vous
                    </h2>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 font-normal">
                      Action irréversible
                    </p>
                  </div>
                </div>
                <UButton
                  type="button"
                  variant="ghost"
                  color="neutral"
                  icon="i-lucide-x"
                  size="sm"
                  aria-label="Fermer"
                  :on-click="() => closeSlot()"
                />
              </div>
            </template>
            <div class="space-y-3 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              <p>
                Le rendez-vous sera <strong class="text-gray-900 dark:text-white">remis en attente</strong> et proposé
                automatiquement à un <strong class="text-gray-900 dark:text-white">autre infirmier</strong> de la zone.
              </p>
              <div
                v-if="careLines.length > 0"
                class="rounded-lg border border-gray-200/80 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40 px-3 py-2 text-xs"
              >
                <p class="font-medium text-gray-800 dark:text-gray-100 mb-1.5">Soins concernés</p>
                <ul class="space-y-1">
                  <li v-for="(line, idx) in careLines" :key="idx" class="flex justify-between gap-2 text-gray-700 dark:text-gray-300">
                    <span class="min-w-0">{{ line.label }}</span>
                    <span v-if="line.sub" class="shrink-0 text-gray-500 tabular-nums">{{ line.sub }}</span>
                  </li>
                </ul>
              </div>
              <p class="text-xs text-amber-800 dark:text-amber-200/90 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2 border border-amber-200/80 dark:border-amber-800/60">
                Vous ne pourrez pas annuler cette action depuis cet écran.
              </p>
            </div>
            <template #footer>
              <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <UButton type="button" variant="ghost" color="neutral" class="justify-center" :on-click="() => closeSlot()">
                  Retour
                </UButton>
                <UButton
                  type="button"
                  color="warning"
                  class="justify-center"
                  :loading="loading"
                  leading-icon="i-lucide-refresh-ccw"
                  :on-click="handleConfirm"
                >
                  Redispatcher
                </UButton>
              </div>
            </template>
          </UCard>
        </template>
      </UModal>
    </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
import { DialogTitle, DialogDescription } from 'reka-ui';

const props = withDefaults(
  defineProps<{
    open: boolean;
    loading?: boolean;
    /** Multisoins : libellé + date courte par ligne */
    careLines?: { label: string; sub?: string }[];
  }>(),
  { loading: false, careLines: () => [] },
);

const emit = defineEmits<{
  'update:open': [value: boolean];
  confirm: [];
}>();

const isOpen = computed({
  get: () => props.open,
  set: (v) => emit('update:open', v),
});

function handleConfirm() {
  emit('confirm');
}
</script>

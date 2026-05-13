<template>
  <USlideover
    v-model:open="open"
    title="Filtres"
    :ui="{
      width: 'w-full max-w-md',
      body: 'flex flex-col gap-5 p-4 sm:p-5 overflow-y-auto',
      footer: 'border-t border-gray-200 dark:border-gray-800 p-4 sm:p-5',
    }"
  >
    <template #body>
      <!-- Infirmier : même logique que la barre au-dessus de la liste (URL ?tab=&segment=) -->
      <section v-if="showNurseFilters" class="space-y-3">
        <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Type de rendez-vous
        </p>
        <div class="flex flex-wrap gap-8 sm:gap-10" role="tablist" aria-label="Type de rendez-vous">
          <button
            v-for="t in nurseTabOptions"
            :key="t.value"
            type="button"
            role="tab"
            class="inline-flex min-w-0 items-center gap-1.5 border-b-[3px] pb-1 text-left text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950"
            :class="
              nurseTab === t.value
                ? 'border-b-primary-600 text-gray-950 dark:border-b-primary-500 dark:text-white'
                : 'border-b-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
            "
            :aria-selected="nurseTab === t.value"
            :title="t.hint"
            @click="nurseTab = t.value"
          >
            <UIcon :name="t.icon" class="h-3.5 w-3.5 shrink-0 opacity-80 sm:h-4 sm:w-4" aria-hidden="true" />
            <span class="truncate">{{ t.label }}</span>
          </button>
        </div>

        <div v-if="nurseTab === 'soins'" class="space-y-2 pt-1">
          <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Affichage des soins
          </p>
          <div class="flex flex-col gap-2">
            <button
              v-for="seg in nurseSegmentOptions"
              :key="seg.value"
              type="button"
              class="w-full rounded-lg border px-3 py-2.5 text-left transition-colors"
              :class="
                nurseSegment === seg.value
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40 text-primary-900 dark:text-primary-100'
                  : 'border-gray-200/80 dark:border-gray-700 bg-white dark:bg-gray-900/40 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              "
              :aria-pressed="nurseSegment === seg.value"
              @click="nurseSegment = seg.value"
            >
              <span class="block text-sm font-semibold">{{ seg.label }}</span>
              <span class="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">{{ seg.sub }}</span>
            </button>
          </div>
          <UButton
            variant="soft"
            color="primary"
            size="sm"
            icon="i-lucide-inbox"
            class="w-full justify-center"
            @click="nurseSegment = 'en_attente'"
          >
            Voir les demandes à accepter
          </UButton>
          <p class="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2" :title="activeNurseSegmentHint">
            {{ activeNurseSegmentHint }}
          </p>
        </div>
      </section>

      <section v-if="useDateFilter" class="space-y-2">
        <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Période
        </p>
        <div
          class="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-gray-100/90 dark:bg-gray-800/90 ring-1 ring-inset ring-gray-200/60 dark:ring-gray-700/60"
        >
          <button
            v-for="tab in dateTabs"
            :key="tab.value"
            type="button"
            class="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-all"
            :class="
              dateFilter === tab.value
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm ring-1 ring-gray-200/80 dark:ring-gray-600'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            "
            @click="dateFilter = tab.value"
          >
            <UIcon
              :name="tab.value === 'upcoming' ? 'i-lucide-calendar-clock' : 'i-lucide-history'"
              class="w-4 h-4 shrink-0 opacity-90"
            />
            {{ tab.label }}
          </button>
        </div>
        <p class="text-[11px] text-gray-500 dark:text-gray-400">
          <template v-if="dateFilter === 'upcoming'">À partir d’aujourd’hui.</template>
          <template v-else>Avant maintenant.</template>
        </p>
      </section>

      <section class="space-y-2">
        <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Statut
        </p>
        <USelect
          v-model="statusFilter"
          :items="statusFilterOptions"
          value-key="value"
          placeholder="Tous les statuts"
          size="md"
          class="w-full"
          :ui="{ rounded: 'rounded-xl' }"
        >
          <template #leading="{ modelValue: statusVal }">
            <UIcon :name="statusIconForValue(statusVal)" class="w-4 h-4 text-gray-400 shrink-0" />
          </template>
        </USelect>
      </section>

      <section class="space-y-2">
        <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Plage de dates (optionnel)
        </p>
        <DateRangePicker
          :start="dateRangeStart"
          :end="dateRangeEnd"
          placeholder="Du… au…"
          @update:start="dateRangeStart = $event"
          @update:end="dateRangeEnd = $event"
        />
        <UButton
          v-if="dateRangeStart || dateRangeEnd"
          type="button"
          variant="ghost"
          color="neutral"
          size="xs"
          icon="i-lucide-eraser"
          class="self-start"
          @click="clearDateRange"
        >
          Effacer la plage
        </UButton>
        <p class="text-[11px] text-gray-500 dark:text-gray-400">
          Filtre la liste en plus des onglets « À venir / Passés ».
        </p>
      </section>
    </template>

    <template #footer>
      <div class="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
        <UButton
          type="button"
          variant="outline"
          color="neutral"
          class="sm:flex-1"
          @click="resetFilters"
        >
          Réinitialiser
        </UButton>
        <UButton type="button" color="primary" class="sm:flex-1" @click="closeSheet">
          Terminé
        </UButton>
      </div>
    </template>
  </USlideover>
</template>

<script setup lang="ts">
import {
  NURSE_SEGMENT_OPTIONS,
  NURSE_TAB_OPTIONS,
  type NurseListTab,
  type NurseSegment,
} from '~/constants/nurse-appointments-filters';

const open = defineModel<boolean>('open', { default: false });

const props = withDefaults(
  defineProps<{
    useDateFilter?: boolean;
    statusFilterOptions: { label: string; value: string }[];
    /** Affiche type RDV + vue soins (infirmier). */
    showNurseFilters?: boolean;
  }>(),
  { useDateFilter: true, showNurseFilters: false }
);

const dateFilter = defineModel<'upcoming' | 'past'>('dateFilter', { required: true });
const statusFilter = defineModel<string>('statusFilter', { required: true });
const dateRangeStart = defineModel<string | null>('dateRangeStart', { required: true });
const dateRangeEnd = defineModel<string | null>('dateRangeEnd', { required: true });

const nurseTab = defineModel<NurseListTab>('nurseTab', { required: false });
const nurseSegment = defineModel<NurseSegment>('nurseSegment', { required: false });

const nurseTabOptions = NURSE_TAB_OPTIONS;
const nurseSegmentOptions = NURSE_SEGMENT_OPTIONS;

const activeNurseSegmentHint = computed(() => {
  const o = nurseSegmentOptions.find((x) => x.value === nurseSegment.value);
  return o?.hint ?? '';
});

const dateTabs = [
  { label: 'À venir', value: 'upcoming' as const },
  { label: 'Passés', value: 'past' as const },
];

function statusIconForValue(val: unknown): string {
  const v = typeof val === 'string' ? val : 'all';
  const map: Record<string, string> = {
    all: 'i-lucide-list-filter',
    pending: 'i-lucide-hourglass',
    confirmed: 'i-lucide-badge-check',
    inProgress: 'i-lucide-play-circle',
    completed: 'i-lucide-circle-check',
    canceled: 'i-lucide-ban',
    refused: 'i-lucide-circle-x',
  };
  return map[v] || 'i-lucide-flag';
}

function clearDateRange() {
  dateRangeStart.value = null;
  dateRangeEnd.value = null;
}

function resetFilters() {
  if (props.useDateFilter) {
    dateFilter.value = 'upcoming';
  }
  statusFilter.value = 'all';
  clearDateRange();
  if (props.showNurseFilters && nurseTab.value !== undefined && nurseSegment.value !== undefined) {
    nurseTab.value = 'soins';
    nurseSegment.value = 'tous';
  }
}

function closeSheet() {
  open.value = false;
}
</script>

<script setup lang="ts">
import { iconForPreferredNurseGenderPreference } from '~/utils/appointment-type-rules';

type PreferredNurseGenderValue = 'any' | 'female' | 'male';

const props = defineProps<{
  disabled?: boolean;
  name?: string;
}>();

const model = defineModel<PreferredNurseGenderValue>({ default: 'any' });

const choices = computed(() =>
  ([
    { value: 'any' as const, label: 'Peu importe' },
    { value: 'female' as const, label: 'Femme' },
    { value: 'male' as const, label: 'Homme' },
  ]).map((c) => ({ ...c, icon: iconForPreferredNurseGenderPreference(c.value) })),
);

function select(v: PreferredNurseGenderValue) {
  if (props.disabled) return;
  model.value = v;
}
</script>

<template>
  <!-- Même enveloppe segmentée que BookingAvailabilityTabs (dispo horaire) -->
  <div
    class="relative overflow-visible rounded-2xl border border-gray-200/95 bg-gray-100/80 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] dark:border-gray-700/90 dark:bg-gray-900/55 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-2"
    role="group"
    :aria-label="name || 'Préférence pour l’infirmier'"
  >
    <div class="grid grid-cols-3 gap-1.5 sm:gap-2">
      <button
        v-for="c in choices"
        :key="c.value"
        type="button"
        :disabled="disabled"
        :aria-pressed="model === c.value"
        class="group relative flex min-h-[2.75rem] min-w-0 flex-row items-center justify-center gap-1.5 rounded-xl px-1.5 py-2 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/45 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-100 disabled:pointer-events-none disabled:opacity-45 dark:focus-visible:ring-offset-gray-900 sm:min-h-[3rem] sm:gap-2 sm:rounded-[0.8125rem] sm:px-2 sm:py-2.5"
        :class="
          model === c.value
            ? 'z-[1] bg-sky-50 text-sky-950 shadow-[0_1px_3px_rgba(14,165,233,0.14)] outline outline-1 outline-sky-300/75 dark:bg-sky-950/40 dark:text-sky-50 dark:shadow-[0_2px_8px_-2px_rgba(14,165,233,0.2)] dark:outline-sky-500/35'
            : 'z-0 text-gray-600 hover:bg-white/75 hover:text-gray-900 active:bg-white/90 dark:text-gray-400 dark:hover:bg-gray-800/80 dark:hover:text-gray-50 dark:active:bg-gray-800'
        "
        @click="select(c.value)"
      >
        <UIcon
          :name="c.icon"
          class="size-4 shrink-0 transition-[color] sm:size-[1.125rem]"
          aria-hidden="true"
        />
        <span class="max-w-full min-w-0 text-left text-[11px] font-semibold leading-tight sm:text-sm">
          {{ c.label }}
        </span>
      </button>
    </div>
  </div>
</template>

<template>
  <div class="space-y-6">
    <TitleDashboard
      title="Calendrier"
      description="Vue d'ensemble de vos rendez-vous"
    />

    <!-- Onglets compacts (mobile + desktop) : alignés liste RDV infirmier -->
    <div class="w-full">
      <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
        <UIcon name="i-lucide-layout-grid" class="w-4 h-4 text-primary-500" />
        Affichage
      </p>
      <div
        class="grid grid-cols-2 gap-2 rounded-xl border border-gray-200/90 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/50 p-1 relative"
        :class="calendarLoading ? 'opacity-70' : ''"
      >
        <div
          v-if="calendarLoading"
          class="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/50 dark:bg-gray-900/40 pointer-events-none"
          aria-hidden="true"
        >
          <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin text-primary-600 dark:text-primary-400" />
        </div>
        <button
          v-for="t in nurseTabOptions"
          :key="t.value"
          type="button"
          class="flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all min-h-[2.75rem]"
          :class="
            nurseListTab === t.value
              ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm ring-1 ring-gray-200/80 dark:ring-gray-700'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          "
          :aria-pressed="nurseListTab === t.value"
          :aria-label="`Afficher : ${t.label}`"
          :disabled="calendarLoading"
          @click="nurseListTab = t.value"
        >
          <UIcon :name="t.icon" class="w-4 h-4 shrink-0 opacity-90" />
          <span class="truncate">{{ t.label }}</span>
        </button>
      </div>
    </div>

    <CalendarPage
      ref="calendarPageRef"
      base-path="/nurse"
      :show-new-appointment-button="false"
      :nurse-tab="nurseListTab"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'nurse',
});

useHead({
  title: 'Calendrier – Infirmier',
});

const nurseTabOptions = [
  { label: 'Mes soins', value: 'soins' as const, icon: 'i-lucide-stethoscope' },
  { label: 'Bilans sanguins', value: 'demandes' as const, icon: 'i-lucide-droplet' },
];
const nurseListTab = ref<'soins' | 'demandes'>('soins');

const calendarPageRef = ref<{ loading?: Ref<boolean> } | null>(null);
const calendarLoading = computed(() => {
  const l = calendarPageRef.value?.loading;
  return l ? unref(l) : false;
});
</script>

<template>
  <div class="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
    <div class="px-2.5 py-1.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/50">
      <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Horaires</p>
    </div>
    <ul class="divide-y divide-gray-100 dark:divide-gray-800">
      <li
        v-for="row in rows"
        :key="row.day"
        class="flex items-center justify-between gap-2 px-2.5 py-1.5"
        :class="row.isToday ? 'bg-primary-50/60 dark:bg-primary-900/15' : ''"
      >
        <span class="w-20 shrink-0 text-xs font-medium text-gray-700 dark:text-gray-300">{{ row.label }}</span>
        <span
          v-if="row.isOpen"
          class="text-xs tabular-nums text-emerald-700 dark:text-emerald-300"
        >
          {{ row.start }} – {{ row.end }}
        </span>
        <span v-else class="text-xs text-gray-400 dark:text-gray-500">Fermé</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
const DAY_LABELS: Record<string, string> = {
  monday: 'Lundi',
  tuesday: 'Mardi',
  wednesday: 'Mercredi',
  thursday: 'Jeudi',
  friday: 'Vendredi',
  saturday: 'Samedi',
  sunday: 'Dimanche',
}

const props = defineProps<{
  openingHours?: Record<string, { start?: string; end?: string }> | null
}>()

const todayKey = computed(() => {
  const d = new Date().getDay()
  return DAY_ORDER[d === 0 ? 6 : d - 1]
})

const rows = computed(() => {
  const hours = props.openingHours
  if (!hours || typeof hours !== 'object') return []
  return DAY_ORDER.map((day) => {
    const start = (hours[day]?.start || '').trim()
    const end = (hours[day]?.end || '').trim()
    const isOpen = !!(start && end)
    return {
      day,
      label: DAY_LABELS[day] || day,
      start,
      end,
      isOpen,
      isToday: day === todayKey.value,
    }
  })
})
</script>

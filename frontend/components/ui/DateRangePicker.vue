<script setup lang="ts">
import { CalendarDate, DateFormatter, parseDate } from '@internationalized/date'

const props = withDefaults(
  defineProps<{
    /** Date de début (YYYY-MM-DD) */
    start?: string | null
    /** Date de fin (YYYY-MM-DD) */
    end?: string | null
    placeholder?: string
    disabled?: boolean
    /** Année min pour le calendrier (optionnel, pour filtre sans limite passée) */
    minYear?: number
    /** Année max pour le calendrier (optionnel) */
    maxYear?: number
  }>(),
  {
    start: null,
    end: null,
    placeholder: 'Plage de dates',
    disabled: false,
    minYear: undefined,
    maxYear: undefined,
  }
)

const emit = defineEmits<{
  'update:start': [value: string | null]
  'update:end': [value: string | null]
}>()

const df = new DateFormatter('fr-FR', {
  dateStyle: 'medium',
  timeZone: 'Europe/Paris',
})

const internalStart = shallowRef<CalendarDate | null>(null)
const internalEnd = shallowRef<CalendarDate | null>(null)

function parseToCalendarDate(val: string | null | undefined): CalendarDate | null {
  if (!val) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    try { return parseDate(val) } catch { return null }
  }
  const d = new Date(val)
  if (Number.isNaN(d.getTime())) return null
  return new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

watch(
  () => props.start,
  (val) => { internalStart.value = parseToCalendarDate(val) },
  { immediate: true },
)
watch(
  () => props.end,
  (val) => { internalEnd.value = parseToCalendarDate(val) },
  { immediate: true },
)

const minDate = computed(() => {
  if (props.minYear != null) return new CalendarDate(props.minYear, 1, 1)
  return undefined
})
const maxDate = computed(() => {
  if (props.maxYear != null) return new CalendarDate(props.maxYear, 12, 31)
  return undefined
})

const isOpenStart = ref(false)
const isOpenEnd = ref(false)

function isSingleDate(value: unknown): value is { year: number; month: number; day: number } {
  return !!value && typeof value === 'object' && 'year' in value && 'month' in value && 'day' in value
    && typeof value.year === 'number' && typeof value.month === 'number' && typeof value.day === 'number'
}

function handleSelectStart(value: unknown) {
  if (!isSingleDate(value)) return
  const y = value.year
  const m = String(value.month).padStart(2, '0')
  const d = String(value.day).padStart(2, '0')
  emit('update:start', `${y}-${m}-${d}`)
  if (internalEnd.value && new CalendarDate(value.year, value.month, value.day).compare(internalEnd.value) > 0) emit('update:end', null)
  isOpenStart.value = false
}

function handleSelectEnd(value: unknown) {
  if (!isSingleDate(value)) return
  const y = value.year
  const m = String(value.month).padStart(2, '0')
  const d = String(value.day).padStart(2, '0')
  emit('update:end', `${y}-${m}-${d}`)
  isOpenEnd.value = false
}

const displayStart = computed(() => internalStart.value ? df.format(internalStart.value.toDate('Europe/Paris')) : 'Date de début')
const displayEnd = computed(() => internalEnd.value ? df.format(internalEnd.value.toDate('Europe/Paris')) : 'Date de fin')
</script>

<template>
  <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 w-full min-w-0">
    <UPopover v-model:open="isOpenStart" :dismissible="true" class="w-full sm:flex-1 sm:min-w-0">
      <UButton
        color="neutral"
        variant="outline"
        icon="i-lucide-calendar-range"
        :disabled="disabled"
        size="lg"
        block
        class="w-full justify-start bg-white dark:bg-white/5 rounded-xl"
      >
        {{ displayStart }}
      </UButton>
      <template #content>
        <UCalendar
          :model-value="internalStart"
          locale="fr-FR"
          class="p-2"
          :min-value="minDate"
          :max-value="maxDate"
          @update:model-value="handleSelectStart"
        />
      </template>
    </UPopover>
    <span class="hidden sm:inline text-sm text-gray-400 dark:text-gray-500 shrink-0">au</span>
    <UPopover v-model:open="isOpenEnd" :dismissible="true" class="w-full sm:flex-1 sm:min-w-0">
      <UButton
        color="neutral"
        variant="outline"
        icon="i-lucide-calendar-range"
        :disabled="disabled"
        size="lg"
        block
        class="w-full justify-start bg-white dark:bg-white/5 rounded-xl"
      >
        {{ displayEnd }}
      </UButton>
      <template #content>
        <UCalendar
          :model-value="internalEnd"
          locale="fr-FR"
          class="p-2"
          :min-value="internalStart || minDate"
          :max-value="maxDate"
          @update:model-value="handleSelectEnd"
        />
      </template>
    </UPopover>
  </div>
</template>

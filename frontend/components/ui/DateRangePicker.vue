<script setup lang="ts">
import { CalendarDate, DateFormatter } from '@internationalized/date'

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

const internalStart = ref<CalendarDate | null>(null)
const internalEnd = ref<CalendarDate | null>(null)

function parseToCalendarDate(val: string | null | undefined): CalendarDate | null {
  if (!val) return null
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

function handleSelectStart(value: CalendarDate | null) {
  if (!value) return
  const y = value.year
  const m = String(value.month).padStart(2, '0')
  const d = String(value.day).padStart(2, '0')
  emit('update:start', `${y}-${m}-${d}`)
  isOpenStart.value = false
}

function handleSelectEnd(value: CalendarDate | null) {
  if (!value) return
  const y = value.year
  const m = String(value.month).padStart(2, '0')
  const d = String(value.day).padStart(2, '0')
  emit('update:end', `${y}-${m}-${d}`)
  isOpenEnd.value = false
}

const displayStart = computed(() =>
  props.start ? df.format(new Date(props.start)) : 'Du…',
)
const displayEnd = computed(() =>
  props.end ? df.format(new Date(props.end)) : 'au…',
)
</script>

<template>
  <div class="flex items-center gap-2 flex-wrap">
    <UPopover v-model:open="isOpenStart" :dismissible="true">
      <UButton
        color="neutral"
        variant="outline"
        icon="i-lucide-calendar"
        :disabled="disabled"
        size="md"
        class="min-w-[140px] justify-start bg-white dark:bg-white/5"
        @click="isOpenStart = true"
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
    <span class="text-muted text-sm">au</span>
    <UPopover v-model:open="isOpenEnd" :dismissible="true">
      <UButton
        color="neutral"
        variant="outline"
        icon="i-lucide-calendar"
        :disabled="disabled"
        size="md"
        class="min-w-[140px] justify-start bg-white dark:bg-white/5"
        @click="isOpenEnd = true"
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

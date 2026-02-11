<script setup lang="ts">
import { CalendarDate, DateFormatter } from '@internationalized/date'

const PARIS_TIMEZONE = 'Europe/Paris'

const props = defineProps<{
  modelValue?: string | null
  placeholder?: string
  disabled?: boolean
  minYear?: number
  maxYear?: number
  appointmentType?: 'lab' | 'nurse'
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

// -----------------------------------------------------
// Formatter pour affichage
// -----------------------------------------------------
const df = new DateFormatter('fr-FR', {
  dateStyle: 'medium',
  timeZone: PARIS_TIMEZONE
})

// -----------------------------------------------------
// Date actuelle en timezone Paris
// -----------------------------------------------------
const getNowInParis = () => {
  return new Date(
    new Intl.DateTimeFormat("en-US", {
      timeZone: PARIS_TIMEZONE,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false
    }).format(new Date())
  )
}

// -----------------------------------------------------
// Min date selon type RDV - Toujours 48h minimum
// -----------------------------------------------------
const minDate = computed(() => {
  const now = getNowInParis()
  // Toujours minimum 48h à l'avance pour tous les types de RDV
  const min = new Date(now.getTime() + 48 * 60 * 60 * 1000)

  return new CalendarDate(min.getFullYear(), min.getMonth() + 1, min.getDate())
})

// -----------------------------------------------------
// Internal Date pour UCalendar
// -----------------------------------------------------
const internalDate = ref<CalendarDate | null>(null)

watch(
  () => props.modelValue,
  (val) => {
    if (!val) {
      internalDate.value = null
      return
    }

    const d = new Date(val)
    internalDate.value = new CalendarDate(
      d.getFullYear(),
      d.getMonth() + 1,
      d.getDate()
    )
  },
  { immediate: true }
)

// -----------------------------------------------------
// Ouverture/Fermeture Popover
// -----------------------------------------------------
const isOpen = ref(false)

// -----------------------------------------------------
// Sélection date
// -----------------------------------------------------
const handleSelect = (value: CalendarDate | null) => {
  if (!value) return

  const y = value.year
  const m = String(value.month).padStart(2, '0')
  const d = String(value.day).padStart(2, '0')

  emit('update:modelValue', `${y}-${m}-${d}`)

  // ✔️ Fermeture manuelle (fix officiel 4.1.0)
  isOpen.value = false
}

// -----------------------------------------------------
// Affichage bouton
// -----------------------------------------------------
const displayValue = computed(() =>
  props.modelValue
    ? df.format(new Date(props.modelValue))
    : props.placeholder || "Sélectionner une date"
)

const maxDate = computed(() => {
  if (props.maxYear) return new CalendarDate(props.maxYear, 12, 31)
  return undefined
})
</script>

<template>
  <!-- FIX : utiliser v-model:open -->
  <UPopover v-model:open="isOpen" :dismissible="true">
    <UButton
      color="neutral"
      variant="outline"
      icon="i-lucide-calendar"
      :disabled="disabled"
      size="xl"
      class="w-full justify-start bg-white"
      @click="isOpen = true"
    >
      {{ displayValue }}
    </UButton>

    <template #content>
      <UCalendar
        v-model="internalDate"
        @update:modelValue="handleSelect"
        locale="fr-FR"
        class="p-2"
        :min-value="minDate"
        :max-value="maxDate"
      />
    </template>
  </UPopover>
</template>

<style>
[data-disabled] {
  opacity: 0.4 !important;
  color: rgb(156 163 175) !important;
  pointer-events: none !important;
}
</style>

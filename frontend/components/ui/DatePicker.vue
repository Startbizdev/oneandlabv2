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
  /** Délai minimum en heures avant la date sélectionnable (ex. 48). Si non défini, aucun grisage (RDV "à tous"). */
  minLeadTimeHours?: number | null
  /** Accepter les RDV le samedi (sinon grisé). Défaut true. */
  acceptSaturday?: boolean
  /** Accepter les RDV le dimanche (sinon grisé). Défaut true. */
  acceptSunday?: boolean
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
// Min date : uniquement si minLeadTimeHours est défini (RDV avec provider). Sinon pas de grisage (RDV à tous).
// -----------------------------------------------------
const minDate = computed(() => {
  const hours = props.minLeadTimeHours
  if (hours == null || hours === undefined)
    return undefined
  const h = Number(hours)
  if (!Number.isFinite(h) || h < 0)
    return undefined
  const now = getNowInParis()
  const min = new Date(now.getTime() + h * 60 * 60 * 1000)
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

// Désactiver samedi (6) et/ou dimanche (0) selon les paramètres du lab
const isDateDisabled = (date: CalendarDate) => {
  const jsDate = new Date(date.year, date.month - 1, date.day)
  const day = jsDate.getDay()
  if (day === 0 && props.acceptSunday === false) return true
  if (day === 6 && props.acceptSaturday === false) return true
  return false
}
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
        :min-value="minDate ?? undefined"
        :max-value="maxDate"
        :is-date-disabled="isDateDisabled"
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

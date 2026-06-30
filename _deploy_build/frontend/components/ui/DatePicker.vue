<script setup lang="ts">
import { CalendarDate, DateFormatter, parseDate } from '@internationalized/date'
import {
  PARIS_TZ,
  bookingMinCalendarDate,
  isBookingDateUnavailable,
} from '~/utils/booking-date-constraints'

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
  /** Classe du contenu popover, utile quand le calendrier est dans une modale custom. */
  popoverContentClass?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

// -----------------------------------------------------
// Formatter pour affichage
// -----------------------------------------------------
const df = new DateFormatter('fr-FR', {
  dateStyle: 'medium',
  timeZone: PARIS_TZ,
})

// -----------------------------------------------------
// Min date : aujourd'hui à Paris (jours passés grisés) + optionnel minLeadTimeHours
// -----------------------------------------------------
const minDate = computed(() => bookingMinCalendarDate(props.minLeadTimeHours))

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
    const s = String(val).trim()
    try {
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        internalDate.value = parseDate(s)
        return
      }
      const d = new Date(s)
      internalDate.value = new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate())
    } catch {
      internalDate.value = null
    }
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
const displayValue = computed(() => {
  if (!props.modelValue) return props.placeholder || 'Sélectionner une date'
  const s = String(props.modelValue).trim()
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      return df.format(parseDate(s).toDate(PARIS_TZ))
    }
    return df.format(new Date(s))
  } catch {
    return props.modelValue
  }
})

const maxDate = computed(() => {
  if (props.maxYear) return new CalendarDate(props.maxYear, 12, 31)
  return undefined
})

// Désactiver samedi (6) et/ou dimanche (0) selon les paramètres du lab
const isDateDisabled = (date: CalendarDate) =>
  isBookingDateUnavailable(date, {
    acceptSaturday: props.acceptSaturday,
    acceptSunday: props.acceptSunday,
  })
</script>

<template>
  <!-- FIX : utiliser v-model:open -->
  <UPopover
    v-model:open="isOpen"
    :dismissible="true"
    :ui="popoverContentClass ? { content: popoverContentClass } : undefined"
  >
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

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="presentation"
    >
      <div
        class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm motion-safe:transition-opacity"
        aria-hidden="true"
        @click="close"
      />
      <div
        ref="dialogPanelRef"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        class="relative flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-2xl border border-slate-200/90 bg-white shadow-2xl dark:border-slate-700/80 dark:bg-slate-900 sm:rounded-2xl sm:max-h-[90dvh]"
        tabindex="-1"
        @keydown.escape.prevent="close"
      >
        <div class="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-5 sm:py-4">
          <h2 :id="titleId" class="min-w-0 text-base font-semibold tracking-tight text-slate-900 dark:text-white sm:text-lg">
            Reprendre rendez-vous pour
            <span class="text-primary-600 dark:text-primary-400">{{ patientDisplayNameForTitle }}</span>
          </h2>
          <div class="flex shrink-0 items-center gap-1">
            <button
              v-if="step === 'form'"
              type="button"
              class="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-slate-300 dark:hover:bg-slate-800"
              @click="step = 'choice'"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Retour
            </button>
            <button
              type="button"
              class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="Fermer"
              @click="close"
            >
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5">
          <div v-if="step === 'choice'" class="space-y-4">
            <p class="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Choisissez comment reprendre ce rendez-vous, puis continuez.
            </p>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                class="rounded-xl border-2 p-4 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                :class="choiceMode === 'cancel_and_new'
                  ? 'border-primary-500 bg-primary-50/80 ring-2 ring-primary-200 dark:border-primary-400 dark:bg-primary-950/40 dark:ring-primary-900'
                  : 'border-slate-200 hover:border-slate-300 dark:border-slate-600 dark:hover:border-slate-500'"
                @click="choiceMode = 'cancel_and_new'"
              >
                <svg class="mb-2 h-7 w-7 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <h3 class="text-sm font-semibold text-slate-900 dark:text-white">Remplacer le RDV</h3>
                <p class="mt-1 text-xs leading-snug text-slate-600 dark:text-slate-400">Annuler l'ancien, créer le nouveau.</p>
              </button>
              <button
                type="button"
                class="rounded-xl border-2 p-4 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                :class="choiceMode === 'create_only'
                  ? 'border-primary-500 bg-primary-50/80 ring-2 ring-primary-200 dark:border-primary-400 dark:bg-primary-950/40 dark:ring-primary-900'
                  : 'border-slate-200 hover:border-slate-300 dark:border-slate-600 dark:hover:border-slate-500'"
                @click="choiceMode = 'create_only'"
              >
                <svg class="mb-2 h-7 w-7 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 class="text-sm font-semibold text-slate-900 dark:text-white">Créer un nouveau RDV</h3>
                <p class="mt-1 text-xs leading-snug text-slate-600 dark:text-slate-400">L'ancien reste inchangé.</p>
              </button>
            </div>
          </div>

          <form v-else-if="step === 'form'" class="space-y-4" @submit.prevent="submit">
            <div class="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:bg-slate-800/80 dark:text-slate-200">
              <svg class="h-4 w-4 shrink-0 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span class="font-medium">{{ patientDisplayName }}</span>
              <span v-if="patientPhone" class="text-slate-500 dark:text-slate-400">· {{ patientPhone }}</span>
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div class="min-w-0 space-y-1.5">
                <label :for="catSelectId" class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Type de soin</label>
                <select
                  :id="catSelectId"
                  v-model="form.category_id"
                  required
                  class="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                >
                  <option value="" disabled>Sélectionner…</option>
                  <option v-for="opt in categoryOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </div>
              <div class="min-w-0 space-y-1.5">
                <span class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Date</span>
                <DatePicker
                  v-model="form.scheduled_at"
                  class="w-full [&_button]:h-11 [&_button]:min-h-[2.75rem]"
                  :appointment-type="appointment?.type === 'blood_test' ? 'lab' : 'nurse'"
                  popover-content-class="z-[1000]"
                />
              </div>
            </div>

            <div class="space-y-1.5">
              <span class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Adresse</span>
              <AddressSelector
                v-model="form.address"
                label=""
                :show-complement="true"
                :complement-value="form.address_complement"
                class="w-full"
                @update:complement="form.address_complement = $event"
              />
            </div>

            <div class="space-y-2">
              <span class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Créneau</span>
              <div class="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                <button
                  type="button"
                  class="flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                  :class="form.availability_type === 'custom' ? 'bg-white text-slate-900 shadow dark:bg-slate-700 dark:text-white' : 'text-slate-500 dark:text-slate-400'"
                  @click="form.availability_type = 'custom'"
                >
                  Précis
                </button>
                <button
                  type="button"
                  class="flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                  :class="form.availability_type === 'all_day' ? 'bg-white text-slate-900 shadow dark:bg-slate-700 dark:text-white' : 'text-slate-500 dark:text-slate-400'"
                  @click="form.availability_type = 'all_day'"
                >
                  Journée
                </button>
              </div>
              <div v-if="form.availability_type === 'custom'" class="space-y-2 rounded-lg border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                <div class="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Heure de début – fin</span>
                  <span class="font-mono text-sm font-semibold text-primary-600 dark:text-primary-400">{{ formatTime(availabilityRange[0]) }} – {{ formatTime(availabilityRange[1]) }}</span>
                </div>
                <div class="px-1 py-2">
                  <USlider
                    v-model="availabilityRange"
                    :min="6"
                    :max="17"
                    :step="1"
                    color="primary"
                  />
                  <div class="mt-2 flex justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>6h</span>
                    <span>17h</span>
                  </div>
                  <p class="mt-3 text-center text-xs font-medium text-slate-600 dark:text-slate-300">
                    Créneau sélectionné : {{ formatTime(availabilityRange[0]) }} - {{ formatTime(availabilityRange[1]) }}
                    <span class="text-slate-400">({{ availabilityRange[1] - availabilityRange[0] }}h)</span>
                  </p>
                </div>
                <p class="text-[10px] text-slate-500 dark:text-slate-400">Plage minimale : {{ availabilityMinHours }} h.</p>
              </div>
              <div
                v-else
                class="flex items-center gap-2 rounded-lg border border-primary-100 bg-primary-50/90 px-3 py-2 dark:border-primary-900/50 dark:bg-primary-950/30"
              >
                <svg class="h-4 w-4 shrink-0 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <p class="text-xs font-medium text-primary-800 dark:text-primary-200">Disponibilité : toute la journée</p>
              </div>
            </div>

            <div class="space-y-1.5">
              <label :for="notesId" class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Note interne</label>
              <textarea
                :id="notesId"
                v-model="form.notes"
                rows="2"
                placeholder="Optionnel"
                class="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
              />
            </div>
          </form>
        </div>

        <div class="shrink-0 border-t border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/80 sm:px-5">
          <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <template v-if="step === 'choice'">
              <button
                type="button"
                class="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                @click="close"
              >
                Annuler
              </button>
              <button
                type="button"
                class="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:focus-visible:ring-offset-slate-900"
                :disabled="!choiceMode"
                @click="goToForm"
              >
                Suivant
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </template>
            <template v-else-if="step === 'form'">
              <button
                type="button"
                class="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                :disabled="saving"
                @click="close"
              >
                Annuler
              </button>
              <button
                type="button"
                class="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 dark:focus-visible:ring-offset-slate-900"
                :disabled="saving"
                @click="submit"
              >
                <svg v-if="saving" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <svg v-else class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {{ choiceMode === 'cancel_and_new' ? 'Annuler l\'ancien et créer' : 'Créer le RDV' }}
              </button>
            </template>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { apiFetch } from '~/utils/api'
import { AVAILABILITY_MIN_SPAN_HOURS } from '~/constants/availability-slot'

const availabilityMinHours = AVAILABILITY_MIN_SPAN_HOURS

const props = defineProps<{
  modelValue: boolean
  appointment: any
}>()

const emit = defineEmits<{
  'update:modelValue': [v: boolean]
  done: [newAppointmentId?: string]
}>()

const { user } = useAuth()

const isOpen = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const titleId = 'reschedule-appointment-modal-title'
const catSelectId = 'reschedule-appointment-category'
const notesId = 'reschedule-appointment-notes'

const dialogPanelRef = ref<HTMLElement | null>(null)

watch(
  () => isOpen.value,
  async (open) => {
    if (!import.meta.client) return
    if (open) {
      await nextTick()
      dialogPanelRef.value?.focus()
    }
  },
)

const toast = useAppToast()

const step = ref<'choice' | 'form'>('choice')
const choiceMode = ref<'cancel_and_new' | 'create_only' | null>(null)
const saving = ref(false)
const categoryOptions = ref<{ label: string; value: string }[]>([])
const availabilityRange = ref<[number, number]>([9, 11])
const previousAvailabilityRange = ref<[number, number]>([9, 11])

const form = reactive({
  category_id: '',
  address: null as { label: string; lat: number; lng: number } | null,
  address_complement: '',
  scheduled_at: '',
  availability_type: 'custom' as 'custom' | 'all_day',
  notes: '',
})

const patientDisplayName = computed(() => {
  const a = props.appointment
  if (!a) return 'Patient'
  const rel = a.relative
  const fd = a.form_data || {}
  const first = (rel?.first_name ?? fd?.first_name ?? '')?.trim()
  const last = (rel?.last_name ?? fd?.last_name ?? '')?.trim()
  const name = [last, first].filter(Boolean).join(' ') || 'Patient'
  return name
})

const patientDisplayNameForTitle = computed(() => {
  const a = props.appointment
  if (!a) return ''
  const rel = a.relative
  const fd = a.form_data || {}
  const first = (rel?.first_name ?? fd?.first_name ?? '')?.trim()
  const last = (rel?.last_name ?? fd?.last_name ?? '')?.trim()
  return [first, last].filter(Boolean).join(' ') || 'ce patient'
})

const patientPhone = computed(() => {
  const a = props.appointment
  if (!a) return ''
  return (a.relative?.phone ?? a.form_data?.phone ?? '')?.trim() || ''
})

function formatTime(h: number) {
  return `${Math.floor(h)}h00`
}

function clampAvailabilityRange() {
  let [a, b] = availabilityRange.value
  a = Math.min(16, Math.max(6, Math.floor(Number(a) || 9)))
  b = Math.min(17, Math.max(7, Math.floor(Number(b) || 11)))
  if (b < a + AVAILABILITY_MIN_SPAN_HOURS) {
    b = Math.min(17, a + AVAILABILITY_MIN_SPAN_HOURS)
  }
  if (b > 17) {
    a = Math.max(6, b - AVAILABILITY_MIN_SPAN_HOURS)
  }
  availabilityRange.value = [a, b]
  previousAvailabilityRange.value = [a, b]
}

watch(availabilityRange, (newVal) => {
  if (form.availability_type !== 'custom') return
  const start = Number(newVal[0])
  const end = Number(newVal[1])
  if (end - start < AVAILABILITY_MIN_SPAN_HOURS) {
    const [prevStart, prevEnd] = previousAvailabilityRange.value
    if (Math.abs(end - prevEnd) > Math.abs(start - prevStart)) {
      availabilityRange.value = [Math.max(6, end - AVAILABILITY_MIN_SPAN_HOURS), end]
    } else {
      availabilityRange.value = [start, Math.min(17, start + AVAILABILITY_MIN_SPAN_HOURS)]
    }
    return
  }
  previousAvailabilityRange.value = [start, end]
}, { deep: true })

function parisDateYmd(value: Date = new Date()) {
  return value.toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' })
}

function normalizeRescheduleDate(dateValue: string | null | undefined) {
  const todayParis = parisDateYmd()
  if (!dateValue) return todayParis
  const raw = String(dateValue).trim()
  const originalYmd = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? raw
    : parisDateYmd(new Date(raw))
  if (!/^\d{4}-\d{2}-\d{2}$/.test(originalYmd)) return todayParis
  return originalYmd < todayParis ? todayParis : originalYmd
}

function goToForm() {
  if (!choiceMode.value) return
  initFormFromAppointment()
  loadCategories()
  step.value = 'form'
}

function initFormFromAppointment() {
  const a = props.appointment
  if (!a) return
  form.category_id = a.form_data?.category_id || a.category_id || ''
  form.notes = a.form_data?.notes || ''
  form.scheduled_at = normalizeRescheduleDate(a.scheduled_at)
  const rawAddr = a.address
  const lat = a.location_lat != null ? Number(a.location_lat) : 0
  const lng = a.location_lng != null ? Number(a.location_lng) : 0
  if (rawAddr != null && String(rawAddr).trim()) {
    const label = typeof rawAddr === 'object' && (rawAddr as any).label
      ? (rawAddr as any).label
      : String(rawAddr)
    form.address = { label: label.trim(), lat, lng }
  } else if (a.form_data?.address && typeof a.form_data.address === 'object' && (a.form_data.address as any).label) {
    const fdAddr = a.form_data.address as { label: string; lat?: number; lng?: number }
    form.address = {
      label: fdAddr.label,
      lat: fdAddr.lat != null ? Number(fdAddr.lat) : lat,
      lng: fdAddr.lng != null ? Number(fdAddr.lng) : lng,
    }
  } else {
    form.address = null
  }
  form.address_complement = a.form_data?.address_complement || ''
  form.availability_type = 'custom'
  availabilityRange.value = [9, 11]
  if (a.form_data?.availability) {
    try {
      const av = JSON.parse(a.form_data.availability)
      if (av.type === 'all_day') form.availability_type = 'all_day'
      else if (av.range?.length === 2) availabilityRange.value = [av.range[0], av.range[1]]
    } catch {
      /* ignore */
    }
  } else if (a.scheduled_at) {
    const h = new Date(a.scheduled_at).getHours()
    const start = Math.max(6, Math.min(15, h))
    availabilityRange.value = [start, start + AVAILABILITY_MIN_SPAN_HOURS]
  }
  clampAvailabilityRange()
}

async function loadCategories() {
  const type = props.appointment?.type === 'nursing' ? 'nursing' : 'blood_test'
  try {
    const res = await apiFetch(`/categories?type=${type}`, { method: 'GET' })
    if (res?.success && Array.isArray(res.data)) {
      categoryOptions.value = (res.data as Array<{ id: string; name: string }>).map((c) => ({
        label: c.name,
        value: String(c.id),
      }))
    } else {
      categoryOptions.value = []
    }
  } catch {
    categoryOptions.value = []
  }
}

function buildPayload() {
  const a = props.appointment
  if (!a) return null
  const hour = form.availability_type === 'custom' ? Math.floor(availabilityRange.value[0]) : 9
  const scheduledAt = form.scheduled_at ? `${form.scheduled_at} ${String(hour).padStart(2, '0')}:00:00` : undefined
  const availabilityPayload =
    form.availability_type === 'custom'
      ? JSON.stringify({ type: 'custom', range: [availabilityRange.value[0], availabilityRange.value[1]] })
      : JSON.stringify({ type: 'all_day' })

  const addressPayload =
    form.address?.label && form.address?.lat != null && form.address?.lng != null
      ? { ...form.address, complement: form.address_complement || undefined }
      : undefined

  if (!addressPayload || !scheduledAt) return null

  const formData: Record<string, unknown> = {
    ...(a.form_data || {}),
    category_id: form.category_id || undefined,
    address_complement: form.address_complement || undefined,
    availability: availabilityPayload,
    notes: form.notes || undefined,
  }

  const payload: Record<string, unknown> = {
    type: a.type,
    form_type: a.type,
    scheduled_at: scheduledAt,
    address: addressPayload,
    form_data: formData,
    status: 'confirmed',
    patient_id: a.patient_id || undefined,
    relative_id: a.relative_id || undefined,
    category_id: form.category_id || a.category_id || undefined,
  }
  if (!payload.patient_id && (a.form_data?.email || a.relative?.email)) {
    payload.guest_email = a.form_data?.email || a.relative?.email
  }
  const uid = user.value?.id
  const role = user.value?.role
  const labIdFromUser = (user.value as { lab_id?: string } | null)?.lab_id

  if (a.type === 'nursing' && uid && role === 'nurse') {
    payload.assigned_nurse_id = uid
  } else if (a.type === 'blood_test' && uid) {
    if (role === 'preleveur') {
      payload.assigned_to = uid
      const labId = (labIdFromUser && String(labIdFromUser)) || (a.assigned_lab_id && String(a.assigned_lab_id)) || undefined
      if (labId) payload.assigned_lab_id = labId
      payload.reschedule_from_appointment_id = a.id
    } else if (role === 'lab') {
      payload.assigned_lab_id = uid
    } else if (role === 'subaccount') {
      payload.assigned_lab_id = (labIdFromUser && String(labIdFromUser)) || uid
    } else {
      if (a.assigned_lab_id) payload.assigned_lab_id = a.assigned_lab_id
      if (a.assigned_to) payload.assigned_to = a.assigned_to
    }
  }
  return payload
}

async function submit() {
  const a = props.appointment
  if (!a) return
  if (step.value === 'form' && !form.category_id) {
    toast.add({ title: 'Catégorie requise', description: 'Veuillez sélectionner un type de soin.', color: 'error' })
    return
  }
  const payload = buildPayload()
  if (!payload) {
    toast.add({ title: 'Champs requis', description: 'Veuillez remplir la date et l\'adresse.', color: 'error' })
    return
  }
  saving.value = true
  try {
    if (choiceMode.value === 'cancel_and_new') {
      const cancelRes = await apiFetch(`/appointments/${a.id}`, {
        method: 'PUT',
        body: { status: 'canceled', cancellation_reason: 'reschedule', cancellation_comment: 'Remplacé par un nouveau rendez-vous (reprise).' },
      })
      if (!cancelRes?.success) {
        toast.add({ title: 'Erreur', description: cancelRes?.error || 'Impossible d\'annuler l\'ancien rendez-vous', color: 'error' })
        return
      }
    }
    const createRes = await apiFetch('/appointments', { method: 'POST', body: payload })
    if (createRes?.success && createRes?.data?.id) {
      const newId = createRes.data.id as string
      toast.add({ title: 'Rendez-vous créé', description: 'Le nouveau rendez-vous a été enregistré.', color: 'success' })
      close()
      emit('done', newId)
    } else {
      toast.add({ title: 'Erreur', description: (createRes as { error?: string })?.error || 'Impossible de créer le rendez-vous', color: 'error' })
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Une erreur est survenue'
    toast.add({ title: 'Erreur', description: msg, color: 'error' })
  } finally {
    saving.value = false
  }
}

function close() {
  isOpen.value = false
  step.value = 'choice'
  choiceMode.value = null
}

watch(
  () => [props.modelValue, props.appointment] as const,
  () => {
    if (props.modelValue && props.appointment) {
      step.value = 'choice'
      choiceMode.value = null
    }
  },
  { immediate: true },
)
</script>

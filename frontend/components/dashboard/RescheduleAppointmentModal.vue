<template>
  <UModal v-model:open="isOpen" :ui="{ content: 'max-w-lg w-[95vw] max-h-[90dvh] flex flex-col overflow-hidden' }">
    <template #content>
      <div class="overflow-y-auto min-h-0 flex-1 max-h-[85dvh] overscroll-contain">
        <UCard class="w-full border-0">
        <template #header>
          <div class="flex items-center justify-between gap-2">
            <h2 class="text-base sm:text-lg font-normal truncate">
              Reprendre rendez-vous pour {{ patientDisplayNameForTitle }}
            </h2>
            <UButton
              v-if="step === 'form'"
              variant="ghost"
              color="gray"
              size="xs"
              icon="i-lucide-arrow-left"
              @click="step = 'choice'"
            >
              Retour
            </UButton>
          </div>
        </template>

        <!-- Étape 1 : Choix -->
        <div v-if="step === 'choice'" class="space-y-3">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Choisissez comment reprendre ce rendez-vous, puis cliquez sur Suivant.
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              class="p-3 rounded-lg border-2 transition-all text-left"
              :class="choiceMode === 'cancel_and_new'
                ? 'border-primary-500 dark:border-primary-400 bg-primary-50/50 dark:bg-primary-950/30 ring-2 ring-primary-200 dark:ring-primary-800'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'"
              @click="choiceMode = 'cancel_and_new'"
            >
              <UIcon name="i-lucide-rotate-ccw" class="w-6 h-6 text-primary-500 dark:text-primary-400 mb-1.5" />
              <h3 class="text-sm font-medium text-gray-900 dark:text-white">Remplacer le RDV</h3>
              <p class="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Annuler l'ancien, créer le nouveau.</p>
            </button>
            <button
              type="button"
              class="p-3 rounded-lg border-2 transition-all text-left"
              :class="choiceMode === 'create_only'
                ? 'border-primary-500 dark:border-primary-400 bg-primary-50/50 dark:bg-primary-950/30 ring-2 ring-primary-200 dark:ring-primary-800'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'"
              @click="choiceMode = 'create_only'"
            >
              <UIcon name="i-lucide-calendar-plus" class="w-6 h-6 text-primary-500 dark:text-primary-400 mb-1.5" />
              <h3 class="text-sm font-medium text-gray-900 dark:text-white">Créer un nouveau RDV</h3>
              <p class="text-xs text-gray-600 dark:text-gray-400 mt-0.5">L'ancien reste inchangé.</p>
            </button>
          </div>
        </div>

        <!-- Étape 2 : Formulaire -->
        <form v-else-if="step === 'form'" class="space-y-3" @submit.prevent="submit">
          <div class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 py-1">
            <UIcon name="i-lucide-user" class="w-4 h-4 shrink-0 text-gray-500" />
            <span>{{ patientDisplayName }}</span>
            <span v-if="patientPhone" class="text-gray-500">· {{ patientPhone }}</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <UFormField label="Type de soin" name="category_id" required class="min-w-0">
              <template #default>
                <div class="min-h-10 flex items-stretch">
                  <USelectMenu
                    v-model="form.category_id"
                    :items="categoryOptions"
                    value-key="value"
                    placeholder="Sélectionner..."
                    size="md"
                    class="w-full min-h-10 [&_button]:min-h-10"
                  />
                </div>
              </template>
            </UFormField>
            <UFormField label="Date" name="scheduled_at" required class="min-w-0">
              <template #default>
                <div class="min-h-10 flex items-stretch">
                  <DatePicker
                    v-model="form.scheduled_at"
                    class="w-full [&_button]:min-h-10"
                    :appointment-type="appointment?.type === 'blood_test' ? 'lab' : 'nurse'"
                  />
                </div>
              </template>
            </UFormField>
          </div>

          <UFormField label="Adresse" name="address" required class="w-full">
            <template #default>
              <div class="min-h-10 flex items-stretch w-full">
                <AddressSelector
                  v-model="form.address"
                  label=""
                  :show-complement="true"
                  :complement-value="form.address_complement"
                  @update:complement="form.address_complement = $event"
                  class="w-full"
                />
              </div>
            </template>
          </UFormField>

          <div class="space-y-1.5">
            <label class="text-xs font-medium text-gray-700 dark:text-gray-200">Créneau</label>
            <div class="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 p-1 rounded-md">
              <button
                type="button"
                class="px-2.5 py-1 text-xs font-medium rounded transition-all"
                :class="form.availability_type === 'custom' ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' : 'text-gray-500'"
                @click="form.availability_type = 'custom'"
              >
                Précis
              </button>
              <button
                type="button"
                class="px-2.5 py-1 text-xs font-medium rounded transition-all"
                :class="form.availability_type === 'all_day' ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' : 'text-gray-500'"
                @click="form.availability_type = 'all_day'"
              >
                Journée
              </button>
            </div>
            <div v-if="form.availability_type === 'custom'" class="bg-gray-50 dark:bg-gray-800/50 p-2.5 rounded-md">
              <div class="flex justify-between items-center mb-1">
                <span class="text-[10px] text-gray-400">Heure</span>
                <span class="text-sm font-mono text-primary-600">{{ formatTime(availabilityRange[0]) }} - {{ formatTime(availabilityRange[1]) }}</span>
              </div>
              <USlider v-model="availabilityRange" :min="8" :max="17" :step="1" color="primary" />
              <div class="flex justify-between text-[10px] text-gray-400 font-mono">
                <span>08h</span>
                <span>17h</span>
              </div>
            </div>
            <div v-else class="bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-800 p-2 rounded-md flex items-center gap-2">
              <UIcon name="i-lucide-sun" class="w-4 h-4 text-green-600 shrink-0" />
              <p class="text-xs text-green-800 dark:text-green-300">Toute la journée</p>
            </div>
          </div>

          <UFormField label="Note interne" name="notes">
            <template #default>
              <div class="min-h-10 flex items-stretch">
                <UTextarea
                  v-model="form.notes"
                  placeholder="Note interne (optionnel)"
                  :rows="1"
                  class="w-full text-sm min-h-10 resize-none"
                />
              </div>
            </template>
          </UFormField>
        </form>

        <template #footer>
          <div class="flex justify-end gap-2 w-full">
            <template v-if="step === 'choice'">
              <UButton type="button" variant="outline" color="gray" size="md" @click="close">Annuler</UButton>
              <UButton
                type="button"
                color="primary"
                size="md"
                icon="i-lucide-arrow-right"
                :disabled="!choiceMode"
                @click="goToForm"
              >
                Suivant
              </UButton>
            </template>
            <template v-else-if="step === 'form'">
              <UButton type="button" variant="outline" color="gray" size="md" @click="close">Annuler</UButton>
              <UButton
                type="button"
                color="primary"
                size="md"
                :loading="saving"
                icon="i-lucide-check"
                @click="submit"
              >
                {{ choiceMode === 'cancel_and_new' ? 'Annuler l\'ancien et créer' : 'Créer le RDV' }}
              </UButton>
            </template>
          </div>
        </template>
      </UCard>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { apiFetch } from '~/utils/api'

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

// Log à chaque changement (modal ou patient) pour debug adresse / complément
watch([() => props.modelValue, () => props.appointment], ([open, apt]) => {
  console.log('[RescheduleModal] watch modelValue/appointment:', { open, hasAppointment: !!apt, id: apt?.id })
  if (open && apt) {
    console.log('[RescheduleModal] Ouverture modal — appointment reçu:', {
      id: apt.id,
      address: apt.address,
      address_type: typeof apt.address,
      location_lat: apt.location_lat,
      location_lng: apt.location_lng,
      form_data: apt.form_data,
      form_data_address: apt.form_data?.address,
      form_data_address_complement: apt.form_data?.address_complement,
    })
  }
}, { immediate: true })

const toast = useAppToast()

const step = ref<'choice' | 'form'>('choice')
const choiceMode = ref<'cancel_and_new' | 'create_only' | null>(null)
const saving = ref(false)
const categoryOptions = ref<{ label: string; value: string }[]>([])
const availabilityRange = ref<[number, number]>([9, 11])

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

/** Prénom Nom pour le titre (ex. "Reprendre rendez-vous pour Jean Dupont") */
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

function goToForm() {
  if (!choiceMode.value) return
  initFormFromAppointment()
  loadCategories()
  step.value = 'form'
}

function initFormFromAppointment() {
  const a = props.appointment
  if (!a) return
  // Log brut pour debug adresse / complément
  console.log('[RescheduleModal] appointment brut:', {
    address: a.address,
    address_type: typeof a.address,
    location_lat: a.location_lat,
    location_lng: a.location_lng,
    form_data: a.form_data,
    form_data_address: a.form_data?.address,
    form_data_address_complement: a.form_data?.address_complement,
  })
  form.category_id = a.form_data?.category_id || a.category_id || ''
  form.notes = a.form_data?.notes || ''
  form.scheduled_at = a.scheduled_at ? a.scheduled_at.slice(0, 10) : ''
  // Backend retourne address = string (label) et location_lat / location_lng séparés
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
  console.log('[RescheduleModal] après init form:', {
    form_address: form.address,
    form_address_complement: form.address_complement,
  })
  form.availability_type = 'custom'
  availabilityRange.value = [9, 11]
  if (a.form_data?.availability) {
    try {
      const av = JSON.parse(a.form_data.availability)
      if (av.type === 'all_day') form.availability_type = 'all_day'
      else if (av.range?.length === 2) availabilityRange.value = [av.range[0], av.range[1]]
    } catch {}
  } else if (a.scheduled_at) {
    const h = new Date(a.scheduled_at).getHours()
    const start = Math.max(8, Math.min(15, h))
    availabilityRange.value = [start, start + 2]
  }
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
  const scheduledStr = form.scheduled_at ? `${form.scheduled_at} ${String(hour).padStart(2, '0')}:00:00` : ''
  const scheduledAtIso = scheduledStr ? new Date(scheduledStr).toISOString() : undefined
  const availabilityPayload =
    form.availability_type === 'custom'
      ? JSON.stringify({ type: 'custom', range: [availabilityRange.value[0], availabilityRange.value[1]] })
      : JSON.stringify({ type: 'all_day' })

  const addressPayload =
    form.address?.label && form.address?.lat != null && form.address?.lng != null
      ? { ...form.address, complement: form.address_complement || undefined }
      : undefined

  if (!addressPayload || !scheduledAtIso) return null

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
    scheduled_at: scheduledAtIso,
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
  // Assigner le nouveau RDV à l'utilisateur connecté qui reprend (préleveur, lab, sous-compte, infirmier)
  const uid = user.value?.id
  const role = user.value?.role
  if (a.type === 'nursing' && uid && role === 'nurse') {
    payload.assigned_nurse_id = uid
  } else if (a.type === 'blood_test' && uid) {
    if (role === 'preleveur') {
      payload.assigned_to = uid
    } else if (role === 'lab') {
      payload.assigned_lab_id = uid
    } else if (role === 'subaccount') {
      payload.assigned_lab_id = (user.value as any)?.lab_id || uid
    } else {
      // fallback: réutiliser l'ancienne assignation si pas un de ces rôles
      if (a.assigned_lab_id) payload.assigned_lab_id = a.assigned_lab_id
      if (a.assigned_to) payload.assigned_to = a.assigned_to
    }
  }
  return payload
}

async function submit() {
  const a = props.appointment
  if (!a) return
  const payload = buildPayload()
  if (!payload) {
    toast.add({ title: 'Veuillez remplir la date et l\'adresse', color: 'error' })
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
      toast.add({ title: 'Erreur', description: (createRes as any)?.error || 'Impossible de créer le rendez-vous', color: 'error' })
    }
  } catch (e: any) {
    toast.add({ title: 'Erreur', description: e?.message || 'Une erreur est survenue', color: 'error' })
  } finally {
    saving.value = false
  }
}

function close() {
  isOpen.value = false
  step.value = 'choice'
}

watch(
  () => [props.modelValue, props.appointment],
  () => {
    if (props.modelValue && props.appointment) {
      step.value = 'choice'
      choiceMode.value = null
    }
  },
  { immediate: true },
)
</script>

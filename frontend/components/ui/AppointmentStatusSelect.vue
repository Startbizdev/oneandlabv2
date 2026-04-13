<template>
  <div class="inline-flex flex-col items-start gap-2">
    <select
      :value="modelValue"
      :disabled="disabled || updating"
      :class="[
        'rounded-full border-0 px-3 py-1.5 text-sm font-medium shadow-sm focus:ring-2 focus:ring-offset-1 cursor-pointer appearance-none bg-no-repeat pr-8 min-w-[120px] transition-colors',
        statusTailwindClass,
        disabled || updating ? 'cursor-not-allowed opacity-70' : 'cursor-pointer',
      ]"
      style="background-image: url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 20 20%27%3E%3Cpath stroke=%27%236b7280%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%271.5%27 d=%27M6 8l4 4 4-4%27/%3E%3C/svg%3E'); background-position: right 0.5rem center; background-size: 1.25rem 1.25rem;"
      @change="onSelect($event)"
    >
      <option
        v-for="opt in statusOptions"
        :key="opt.value"
        :value="opt.value"
        :disabled="opt.value === 'canceled' && requireCancelForm"
      >
        {{ opt.label }}
      </option>
    </select>
    <span v-if="updating" class="text-xs text-zinc-500">Mise à jour...</span>

    <!-- Inline formulaire annulation (si on a choisi Annulé et qu'on exige raison + commentaire) -->
    <div
      v-if="showCancelForm"
      class="mt-2 p-3 rounded-lg border border-zinc-200 bg-zinc-50 dark:bg-zinc-800/50 dark:border-zinc-700 space-y-3 min-w-[280px]"
    >
      <p class="text-xs font-medium text-zinc-600 dark:text-zinc-400">Motif et commentaire obligatoires</p>
      <select
        v-model="cancelReason"
        class="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-primary focus:border-primary"
      >
        <option value="">Choisir un motif...</option>
        <option v-for="r in cancellationReasonOptions" :key="r.value" :value="r.value">{{ r.label }}</option>
      </select>
      <textarea
        v-model="cancelComment"
        rows="2"
        placeholder="Commentaire (min. 10 caractères)"
        class="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-primary focus:border-primary resize-none"
      />
      <div class="flex gap-2">
        <button
          type="button"
          class="px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
          @click="showCancelForm = false; emit('update:modelValue', previousStatus)"
        >
          Annuler
        </button>
        <button
          type="button"
          :disabled="!cancelReason || !cancelComment || cancelComment.trim().length < 10 || updating"
          class="px-3 py-1.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          @click="confirmCancel"
        >
          Confirmer l'annulation
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CANCELLATION_REASON_OPTIONS } from '~/config/cancellation-reasons'

const props = withDefaults(
  defineProps<{
    modelValue: string
    appointmentId: string
    disabled?: boolean
    /** Si true, sélectionner "Annulé" ouvre le formulaire motif+commentaire au lieu d'appeler l'API directement */
    requireCancelForm?: boolean
  }>(),
  { disabled: false, requireCancelForm: true }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  updated: []
}>()

import { apiFetch } from '~/utils/api'
const toast = useAppToast()

const updating = ref(false)
const showCancelForm = ref(false)
const previousStatus = ref(props.modelValue)
const cancelReason = ref('')
const cancelComment = ref('')

const statusOptions = [
  { value: 'pending', label: 'En attente' },
  { value: 'confirmed', label: 'Confirmé' },
  { value: 'planned', label: 'Planifié' },
  { value: 'inProgress', label: 'En cours' },
  { value: 'completed', label: 'Terminé' },
  { value: 'refused', label: 'Refusé' },
  { value: 'expired', label: 'Expiré' },
  { value: 'canceled', label: 'Annulé' },
]

const cancellationReasonOptions = CANCELLATION_REASON_OPTIONS

const statusTailwindClass = computed(() => {
  const s = props.modelValue || ''
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 focus:ring-amber-500',
    confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 focus:ring-blue-500',
    planned: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200 focus:ring-sky-500',
    inProgress: 'bg-primary/15 text-primary dark:bg-primary/25 focus:ring-primary',
    completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200 focus:ring-emerald-500',
    canceled: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200 focus:ring-red-500',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200 focus:ring-red-500',
    refused: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200 focus:ring-red-500',
    expired: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300 focus:ring-zinc-500',
  }
  return map[s] || 'bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300 focus:ring-zinc-500'
})

async function updateStatus(newStatus: string, cancelPayload?: { cancellation_reason: string; cancellation_comment: string }) {
  if (!props.appointmentId) return
  updating.value = true
  try {
    const body: Record<string, unknown> = { status: newStatus }
    if (newStatus === 'canceled' && cancelPayload) {
      body.cancellation_reason = cancelPayload.cancellation_reason
      body.cancellation_comment = cancelPayload.cancellation_comment
    }
    const res = await apiFetch(`/appointments/${props.appointmentId}`, { method: 'PUT', body })
    if (res?.success) {
      emit('update:modelValue', newStatus)
      emit('updated')
      toast.add({ title: 'Statut mis à jour', color: 'green' })
    } else {
      toast.add({ title: 'Erreur', description: (res as any)?.error || 'Impossible de mettre à jour le statut', color: 'red' })
    }
  } catch (err: any) {
    toast.add({ title: 'Erreur', description: err?.message || 'Une erreur est survenue', color: 'red' })
  } finally {
    updating.value = false
  }
}

function onSelect(event: Event) {
  const target = event.target as HTMLSelectElement
  const newStatus = target.value
  if (newStatus === props.modelValue) return
  if (newStatus === 'canceled' && props.requireCancelForm) {
    previousStatus.value = props.modelValue
    showCancelForm.value = true
    cancelReason.value = ''
    cancelComment.value = ''
    emit('update:modelValue', props.modelValue)
    return
  }
  updateStatus(newStatus)
}

function confirmCancel() {
  if (!cancelReason.value || cancelComment.value.trim().length < 10) return
  updateStatus('canceled', {
    cancellation_reason: cancelReason.value,
    cancellation_comment: cancelComment.value.trim(),
  })
  showCancelForm.value = false
  cancelReason.value = ''
  cancelComment.value = ''
}
</script>

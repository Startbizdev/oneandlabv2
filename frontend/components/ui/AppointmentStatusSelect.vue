<template>
  <div class="inline-flex flex-col items-start gap-2">
    <select
      :value="modelValue"
      :disabled="disabled || updating"
      class="min-w-[12rem] max-w-full rounded-md border border-default bg-default px-2 py-1.5 text-sm text-default disabled:cursor-not-allowed disabled:opacity-70"
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

    <div
      v-if="showRedispatchConfirm"
      class="mt-2 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 space-y-3 min-w-[280px]"
    >
      <p class="text-sm font-medium text-amber-900 dark:text-amber-100">Remettre en dispatch ?</p>
      <p class="text-xs text-amber-800/90 dark:text-amber-200/90 leading-relaxed">
        Les assignations seront effacées et les infirmiers/laboratoires éligibles seront re-notifiés (emails + offres zone).
      </p>
      <div class="flex gap-2">
        <button
          type="button"
          class="px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
          @click="showRedispatchConfirm = false; pendingStatusSelection = null"
        >
          Annuler
        </button>
        <button
          type="button"
          :disabled="updating"
          class="px-3 py-1.5 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          @click="updateStatus('pending', undefined, true)"
        >
          Confirmer le redispatch
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
    /** Admin : passage à pending depuis un statut actif déclenche un redispatch complet */
    adminRedispatch?: boolean
  }>(),
  { disabled: false, requireCancelForm: true, adminRedispatch: false }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  updated: []
}>()

import { apiFetch } from '~/utils/api'
const toast = useAppToast()

const updating = ref(false)
const showCancelForm = ref(false)
const showRedispatchConfirm = ref(false)
const pendingStatusSelection = ref<string | null>(null)
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

const REDISPATCH_FROM_STATUSES = new Set(['confirmed', 'planned', 'inProgress', 'canceled'])

async function updateStatus(
  newStatus: string,
  cancelPayload?: { cancellation_reason: string; cancellation_comment: string },
  redispatch = false,
) {
  if (!props.appointmentId) return
  updating.value = true
  try {
    const body: Record<string, unknown> = { status: newStatus }
    if (redispatch) body.redispatch = true
    if (newStatus === 'canceled' && cancelPayload) {
      body.cancellation_reason = cancelPayload.cancellation_reason
      body.cancellation_comment = cancelPayload.cancellation_comment
    }
    const res = await apiFetch(`/appointments/${props.appointmentId}`, { method: 'PUT', body })
    if (res?.success) {
      emit('update:modelValue', newStatus)
      emit('updated')
      toast.add({
        title: redispatch ? 'Redispatch lancé' : 'Statut mis à jour',
        description: redispatch
          ? 'Les professionnels éligibles ont été re-notifiés.'
          : undefined,
        color: 'green',
      })
    } else {
      toast.add({ title: 'Erreur', description: (res as any)?.error || 'Impossible de mettre à jour le statut', color: 'red' })
    }
  } catch (err: any) {
    toast.add({ title: 'Erreur', description: err?.message || 'Une erreur est survenue', color: 'red' })
  } finally {
    updating.value = false
    showRedispatchConfirm.value = false
    pendingStatusSelection.value = null
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
  if (
    props.adminRedispatch
    && newStatus === 'pending'
    && newStatus !== props.modelValue
    && REDISPATCH_FROM_STATUSES.has(props.modelValue)
  ) {
    previousStatus.value = props.modelValue
    pendingStatusSelection.value = newStatus
    showRedispatchConfirm.value = true
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

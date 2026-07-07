<template>
  <UModal
    v-model:open="isOpen"
    :ui="modalUiClasses"
  >
    <template #header>
      <DialogTitle class="sr-only">
        {{ appointment ? `Détails du rendez-vous - ${getAppointmentTypeLabel(appointment.type)}` : 'Détails du rendez-vous' }}
      </DialogTitle>
      <DialogDescription class="sr-only">
        {{ appointment ? `Informations détaillées du rendez-vous de type ${getAppointmentTypeLabel(appointment.type)}` : 'Informations détaillées du rendez-vous' }}
      </DialogDescription>
      <div class="w-full min-w-0">
        <h2 class="text-base font-semibold tracking-tight text-gray-900 dark:text-white">
          {{ modalHeaderTitle }}
        </h2>
        <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
          {{ modalHeaderSubtitle }}
        </p>
      </div>
    </template>

    <template #body>
      <!-- LOADING -->
      <div v-if="loading" class="text-center py-10">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto text-primary" />
        <p class="text-gray-500 mt-2">Chargement...</p>
      </div>

      <!-- LIMITE PLAN ATTEINTE (nurse offre Découverte) -->
      <div v-else-if="planLimitReached" class="text-center py-10 px-6">
        <UIcon name="i-lucide-lock" class="w-16 h-16 mx-auto text-amber-500 mb-4" />
        <h3 class="text-xl font-normal mb-2">Limite atteinte ce mois</h3>
        <p class="text-gray-600 dark:text-gray-400 mb-6">
          Vous avez atteint la limite de 10 rendez-vous ce mois (offre Découverte). Passez à l'offre Pro pour accepter des rendez-vous illimités.
        </p>
        <div class="flex flex-col sm:flex-row gap-3 justify-center">
          <UButton
            color="primary"
            variant="solid"
            size="md"
            leading-icon="i-lucide-sparkles"
            to="/nurse/abonnement"
          >
            Abonnez-vous
          </UButton>
          <UButton
            color="neutral"
            variant="outline"
            size="md"
            @click="closeModalAndGoToList"
          >
            Fermer
          </UButton>
        </div>
      </div>

      <!-- Déjà pris : flux linéaire, sans double scroll -->
      <div v-else-if="isAlreadyAccepted" class="flex flex-col gap-5">
        <div class="flex flex-col items-center text-center gap-3 px-1">
          <div
            class="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 ring-1 ring-gray-200/80 dark:ring-gray-700"
            aria-hidden="true"
          >
            <UIcon name="i-lucide-user-x" class="h-5 w-5" />
          </div>
          <div class="space-y-1">
            <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Non disponible
            </p>
            <h3 class="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
              Rendez-vous déjà attribué
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-300 leading-relaxed max-w-sm mx-auto">
              Un autre professionnel a confirmé cette prise en charge entre-temps.
            </p>
          </div>
        </div>
        <div class="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <UButton color="neutral" variant="ghost" size="md" class="justify-center" @click="closeModalOnly">
            Fermer
          </UButton>
          <UButton
            color="primary"
            size="md"
            class="justify-center font-semibold"
            leading-icon="i-lucide-calendar-days"
            @click="closeModalAndGoToList"
          >
            Mes rendez-vous
          </UButton>
        </div>
      </div>

      <!-- Détail offre : un seul scroll (corps modal), pas de scroll imbriqué -->
      <div v-else-if="appointment" class="space-y-4">
        <div
          v-if="batchLotSummaryLabel && batchAppointmentsSorted.length <= 1"
          class="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 dark:border-primary/25 dark:bg-primary/10"
        >
          <UIcon name="i-lucide-layers" class="w-4 h-4 text-primary-500 shrink-0" />
          <span class="text-[11px] sm:text-xs font-semibold text-gray-800 dark:text-gray-100 leading-snug">
            {{ batchLotSummaryLabel }}
          </span>
        </div>

        <!-- Lot (soins ou labo) -->
        <template v-if="showBatchStyleCard && batchAppointmentsSorted.length > 1">
          <div class="rounded-xl border border-gray-200/90 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-950">
            <div class="flex items-center gap-2 px-3 py-2.5 sm:px-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/90 dark:bg-gray-900/60">
              <UIcon name="i-lucide-layers" class="w-4 h-4 text-primary-500 shrink-0" />
              <span class="text-[11px] sm:text-xs font-semibold text-gray-800 dark:text-gray-100 leading-snug">
                {{ batchLotSummaryLabel }}
              </span>
            </div>
            <ul class="divide-y divide-gray-100 dark:divide-gray-800">
              <li
                v-for="(appt, batchIdx) in batchAppointmentsSorted"
                :key="appt.id"
                class="px-3 py-2.5 sm:px-4 sm:py-3"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-900 dark:text-white leading-snug">
                      <span>
                        <span class="tabular-nums text-gray-400 mr-1">{{ batchIdx + 1 }}.</span>{{ categoryLabelFor(appt) }}
                      </span>
                      <PatientUrgencyBadge :appointment="appt" />
                    </p>
                    <p v-if="durationLabelFor(appt)" class="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-snug">
                      {{ durationLabelFor(appt) }}
                      <template v-if="appt.form_data?.availability">
                        · {{ formatAvailability(appt.form_data.availability, appt.scheduled_at) }}
                      </template>
                    </p>
                  </div>
                  <p class="shrink-0 text-[11px] tabular-nums text-gray-500 dark:text-gray-400 text-right leading-snug max-w-[40%]">
                    {{
                      appt.form_data?.availability
                        ? compactDateOnlyShort(appt.scheduled_at)
                        : compactDateShort(appt.scheduled_at)
                    }}
                  </p>
                </div>
              </li>
            </ul>
            <div class="px-3 py-2.5 sm:px-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/50">
              <p class="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Adresse</p>
              <p class="text-xs font-medium text-gray-900 dark:text-white mt-1 leading-snug">
                {{ addressLineFor(batchAppointmentsSorted[0]) }}
              </p>
            </div>
            <div v-if="hasAppointmentNotes(batchAppointmentsSorted[0])" class="px-3 py-2.5 sm:px-4 border-t border-gray-100 dark:border-gray-800">
              <p class="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Message</p>
              <p class="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{{ getAppointmentNotes(batchAppointmentsSorted[0]) }}</p>
            </div>
          </div>
        </template>

        <!-- Une ligne = une carte compacte type « liste » -->
        <template v-else>
          <template v-for="appt in batchAppointmentsSorted" :key="appt.id">
            <div class="rounded-xl border border-gray-200/90 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden bg-white dark:bg-gray-950">
              <div v-if="categoryLabelFor(appt)" class="flex gap-3 px-3 py-2.5 sm:px-4 sm:py-3">
                <UIcon
                  :name="appt.type === 'blood_test' ? 'i-lucide-droplet' : 'i-lucide-stethoscope'"
                  class="w-4 h-4 text-gray-400 shrink-0 mt-0.5"
                />
                <div class="min-w-0 flex-1">
                  <p class="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Type</p>
                  <p class="text-sm text-gray-900 dark:text-gray-100 mt-0.5 leading-snug">{{ categoryLabelFor(appt) }}</p>
                </div>
              </div>
              <div class="flex gap-3 px-3 py-2.5 sm:px-4 sm:py-3">
                <UIcon name="i-lucide-calendar" class="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                <div class="min-w-0 flex-1">
                  <p class="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Date souhaitée</p>
                  <div class="mt-0.5 flex flex-wrap items-center gap-2">
                    <p class="text-sm text-gray-900 dark:text-gray-100 leading-snug">{{ formatDateTime(appt.scheduled_at) }}</p>
                    <PatientUrgencyBadge :appointment="appt" />
                  </div>
                </div>
              </div>
              <div v-if="appt.form_data?.blood_test_type" class="flex gap-3 px-3 py-2.5 sm:px-4 sm:py-3">
                <UIcon name="i-lucide-droplet" class="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                <div class="min-w-0 flex-1">
                  <p class="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Prélèvement</p>
                  <p class="text-sm text-gray-900 dark:text-gray-100 mt-0.5 leading-snug">{{ getBloodTestTypeLabel(appt.form_data) }}</p>
                </div>
              </div>
              <div v-if="appt.form_data?.duration_days" class="flex gap-3 px-3 py-2.5 sm:px-4 sm:py-3">
                <UIcon name="i-lucide-calendar-days" class="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                <div class="min-w-0 flex-1">
                  <p class="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Durée</p>
                  <p class="text-sm text-gray-900 dark:text-gray-100 mt-0.5 leading-snug">{{ durationLabelFor(appt) || '—' }}</p>
                </div>
              </div>
              <div v-if="appt.form_data?.frequency" class="flex gap-3 px-3 py-2.5 sm:px-4 sm:py-3">
                <UIcon name="i-lucide-repeat" class="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                <div class="min-w-0 flex-1">
                  <p class="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Fréquence</p>
                  <p class="text-sm text-gray-900 dark:text-gray-100 mt-0.5 leading-snug">{{ getFrequencyLabel(appt.form_data.frequency) }}</p>
                </div>
              </div>
              <div v-if="appt.form_data?.availability" class="flex gap-3 px-3 py-2.5 sm:px-4 sm:py-3">
                <UIcon name="i-lucide-clock" class="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                <div class="min-w-0 flex-1">
                  <p class="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Créneaux</p>
                  <p class="text-sm text-gray-900 dark:text-gray-100 mt-0.5 leading-snug">{{ formatAvailability(appt.form_data.availability, appt.scheduled_at) }}</p>
                </div>
              </div>
              <div class="flex gap-3 px-3 py-2.5 sm:px-4 sm:py-3">
                <UIcon name="i-lucide-map-pin" class="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                <div class="min-w-0 flex-1">
                  <p class="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Adresse</p>
                  <p class="text-sm text-gray-900 dark:text-gray-100 mt-0.5 leading-snug">{{ addressLineFor(appt) }}</p>
                </div>
              </div>
              <div v-if="hasAppointmentNotes(appt)" class="px-3 py-3 sm:px-4 bg-gray-50/60 dark:bg-gray-900/40">
                <p class="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Message</p>
                <p class="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{{ getAppointmentNotes(appt) }}</p>
              </div>
            </div>
          </template>
        </template>

        <section v-if="isAccepted" class="rounded-xl border border-gray-200/80 dark:border-gray-800 px-3 py-3 sm:px-4 sm:py-4 bg-gray-50/40 dark:bg-gray-900/30">
          <h3 class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 flex items-center gap-2 mb-3">
            <UIcon name="i-lucide-lock" class="w-3.5 h-3.5" />
            Informations confidentielles
          </h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
            <InfoField label="Nom complet" :value="patientDisplayName" />
            <InfoField label="Téléphone" :value="appointment.phone" />
            <InfoField label="Email" :value="confidentialEmailDisplay" />
            <InfoField
              v-if="appointment.form_data?.birth_date"
              label="Date de naissance"
              :value="formatDateOnly(appointment.form_data.birth_date)"
            />
            <InfoField
              v-if="appointment.form_data?.gender"
              label="Genre"
              :value="getGenderLabel(appointment.form_data.gender)"
            />
            <div v-if="appointment.form_data?.address" class="sm:col-span-2">
              <InfoField
                label="Adresse complète"
                :value="
                  typeof appointment.form_data.address === 'object'
                    ? appointment.form_data.address.label
                    : appointment.form_data.address
                "
              />
            </div>
          </div>
        </section>
      </div>
    </template>

    <template #footer="{ close }">
      <div v-if="planLimitReached" class="hidden" />
      <div v-else-if="loading || isAlreadyAccepted" class="flex justify-end">
        <UButton 
          color="neutral" 
          variant="outline"
          @click="close"
        >
          Fermer
        </UButton>
      </div>
      <div v-else-if="appointment && !isAccepted && canAccept" class="flex flex-col gap-4 w-full">
        <label class="flex items-start gap-3 cursor-pointer rounded-lg border border-gray-100 dark:border-gray-800 bg-white/60 dark:bg-gray-950/40 px-3 py-2.5">
          <USwitch v-model="acceptTermsChecked" class="shrink-0 mt-0.5" />
          <span class="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-snug">
            En acceptant vous confirmez la prise en charge et le respect de la confidentialité du patient.
          </span>
        </label>
        <div class="flex flex-col-reverse sm:flex-row gap-2">
          <UButton
            v-if="showDeclineOfferButton"
            color="error"
            variant="outline"
            leading-icon="i-lucide-x"
            :loading="refusing"
            class="flex-1 justify-center min-h-10"
            block
            @click="refuseAppointment"
          >
            Refuser
          </UButton>
          <UButton
            v-if="showSnoozeOfferButton"
            color="neutral"
            variant="outline"
            leading-icon="i-lucide-clock"
            :loading="snoozing"
            class="flex-1 justify-center min-h-10"
            block
            @click="snoozeAppointment"
          >
            Plus tard
          </UButton>
          <UButton
            color="primary"
            :class="acceptTermsChecked ? '' : 'opacity-50 cursor-not-allowed'"
            :disabled="!acceptTermsChecked"
            leading-icon="i-lucide-check"
            :loading="accepting"
            class="flex-1 justify-center min-h-10 font-semibold"
            block
            @click="acceptAppointment"
          >
            Accepter
          </UButton>
        </div>
      </div>
      <div v-else class="flex justify-end">
        <UButton 
          color="neutral" 
          variant="outline"
          @click="close"
        >
          Fermer
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { apiFetch } from '~/utils/api'
import {
  isTakenByColleagueFromDetail,
  parseAppointmentAccessResponse,
  unavailableNoticeMessage,
  unavailableNoticeTitle,
} from '~/utils/appointment-access-response'
import { useAuth } from '~/composables/useAuth'
import { useAppointmentModalQueue } from '~/composables/useAppointmentModalQueue'
import { useAppToast } from '~/composables/useAppToast'
import { appointmentOfferAddressLine, appointmentDetailAddressLine } from '@oneandlab/shared-utils'
import { getNursingDurationLabel } from '~/constants/nursing-duration'
import { formatBloodTestSeriesDurationDays } from '~/utils/duration-display'
import { patientUiEmailLine } from '~/utils/patient-address-rdv'
import { formatAvailabilityDisplayFr } from '~/utils/appointment-datetime-fr'
import { appointmentPatientDisplayName } from '~/utils/appointment-patient-display'
import { getAppointmentNotes, hasAppointmentNotes } from '~/utils/appointment-notes'
import { ref, computed, watch, nextTick, h } from 'vue'
import { DialogTitle, DialogDescription } from 'reka-ui'

/* ---------------- COMPONENTS ---------------- */

const InfoField = (props: { label: string; value: string }) => {
  return h('div', {}, [
    h('label', { class: 'block text-sm font-medium text-gray-700 dark:text-gray-300' }, props.label),
    h('p', { class: 'text-gray-900 dark:text-gray-100' }, props.value)
  ])
}

/* ---------------- PROPS / EMITS ---------------- */

interface Props {
  modelValue: boolean
  appointment?: any
  role?: 'nurse' | 'lab' | 'subaccount' | 'preleveur'
}

const props = withDefaults(defineProps<Props>(), {
  role: 'nurse'
})

const emit = defineEmits(['update:modelValue', 'accepted', 'refused', 'refresh'])

/* ---------------- STATE ---------------- */

const isOpen = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v)
})

const { user } = useAuth()
const toast = useAppToast()
const { shareTokenForAccept } = useAppointmentModalQueue()

/** Lien partagé : même jeton pour tout le lot multisoins (backend grantsNurseShareAccess). */
function appointmentGetUrl(apptId: string) {
  const st = shareTokenForAccept.value
  if (st) {
    return `/appointments/${encodeURIComponent(apptId)}?share_token=${encodeURIComponent(st)}`
  }
  return `/appointments/${encodeURIComponent(apptId)}`
}

const loading = ref(false)
/** Autres RDV du même lot (GET détail pour chaque id). */
const batchSiblingsFull = ref<any[]>([])
const accepting = ref(false)
const refusing = ref(false)
const snoozing = ref(false)
const skipSnoozeOnClose = ref(false)
const isAlreadyAccepted = ref(false)
const planLimitReached = ref(false)
const acceptedBy = ref<any>(null)
const isAccepted = ref(false)
const acceptTermsChecked = ref(false)

const batchAppointmentsSorted = computed(() => {
  const a = props.appointment
  if (!a) return []
  if (!batchSiblingsFull.value.length) return [a]
  return [a, ...batchSiblingsFull.value].sort(
    (x, y) => new Date(x.scheduled_at || 0).getTime() - new Date(y.scheduled_at || 0).getTime(),
  )
})

const modalUiClasses = computed(() => ({
  content:
    'flex flex-col w-[calc(100vw-1.5rem)] sm:w-full max-w-md max-h-[min(92dvh,42rem)] overflow-hidden rounded-xl border border-gray-200/90 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-xl',
  body: 'flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-4 py-4 sm:px-5 sm:py-5',
  header: 'shrink-0 border-b border-gray-100 dark:border-gray-800 px-4 py-3 sm:px-5 sm:py-4',
  footer:
    'shrink-0 border-t border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/50 px-4 py-3 sm:px-5 sm:py-4',
}))

const batchAppointmentIds = computed(() => {
  const a = props.appointment
  if (!a?.id) return []
  if (!batchSiblingsFull.value.length) return [String(a.id)]
  return [String(a.id), ...batchSiblingsFull.value.map((s: any) => String(s.id))]
})

const modalHeaderTitle = computed(() => {
  if (planLimitReached.value) return 'Limite atteinte'
  if (isAlreadyAccepted.value) return 'Offre non disponible'
  return 'Nouveau rendez-vous'
})

const nursingMultiActCount = computed((): number => {
  const a = props.appointment
  if (!a || a.type !== 'nursing') return 0
  const raw =
    Array.isArray(a.nursing_items_display) && a.nursing_items_display.length
      ? a.nursing_items_display
      : Array.isArray(a.nursing_items)
        ? a.nursing_items
        : []
  return raw.length > 1 ? raw.length : 0
})

const showBatchStyleCard = computed(
  () => batchAppointmentsSorted.value.length > 1 || nursingMultiActCount.value > 1,
)

const batchLotSummaryLabel = computed(() => {
  const rows = batchAppointmentsSorted.value
  const rowCount = rows.length
  const n = rowCount > 1 ? rowCount : nursingMultiActCount.value > 1 ? nursingMultiActCount.value : 0
  if (n < 2) return ''
  const labOnly = rows.every((r: any) => r.type === 'blood_test')
  const nurseOnly = rows.every((r: any) => r.type === 'nursing')
  if (labOnly) return `Lot · ${n} prélèvements · une acceptation`
  if (nurseOnly || nursingMultiActCount.value > 1) return `Lot · ${n} actes infirmiers · une acceptation`
  return `Lot · ${n} rendez-vous · une acceptation`
})

const modalHeaderSubtitle = computed(() => {
  if (planLimitReached.value) return 'Passez à l’offre Pro pour continuer.'
  if (isAlreadyAccepted.value)
    return 'Ce soin a déjà été pris en charge par un autre professionnel.'
  const rows = batchAppointmentsSorted.value
  if (showBatchStyleCard.value && rows.length > 1) {
    const labOnly = rows.every((r: any) => r.type === 'blood_test')
    if (labOnly) {
      return `${rows.length} prélèvements groupés — une seule acceptation pour tout le lot.`
    }
    return `${rows.length} soins dans ce lot — une seule acceptation pour tout le lot.`
  }
  if (showBatchStyleCard.value && nursingMultiActCount.value > 1) {
    return `${nursingMultiActCount.value} actes sur ce rendez-vous — une seule acceptation.`
  }
  return "Acceptez rapidement avant qu'un autre professionnel ne le prenne."
})

const patientDisplayName = computed(() => {
  const a = props.appointment
  if (!a) return '·'
  const n = appointmentPatientDisplayName(a)
  return n || '·'
})

const confidentialEmailDisplay = computed(() => {
  const a = props.appointment
  if (!a) return '·'
  const raw = a.email || a.form_data?.email || ''
  if (!String(raw).trim()) return '·'
  return patientUiEmailLine({
    email: raw,
    email_display: a.patient_email_display ?? null,
  })
})

function categoryLabelFor(appt: any) {
  if (!appt) return ''
  const niRaw =
    Array.isArray(appt.nursing_items_display) && appt.nursing_items_display.length > 0
      ? appt.nursing_items_display
      : Array.isArray(appt.nursing_items) && appt.nursing_items.length > 0
        ? appt.nursing_items
        : [];
  if (appt.type === 'nursing' && niRaw.length > 1) {
    const parts = niRaw
      .map((x: any) => String(x?.label ?? x?.category_name ?? '').trim())
      .filter((s: string) => s !== '');
    if (parts.length > 0) return parts.join(' · ');
    return 'Soins infirmiers (multi-actes)';
  }
  const fromRoot = typeof appt.category_name === 'string' ? appt.category_name.trim() : ''
  const fromForm = typeof appt.form_data?.category_name === 'string' ? appt.form_data.category_name.trim() : ''
  if (fromRoot) return fromRoot
  if (fromForm) return fromForm
  if (appt.type === 'nursing') return 'Soins infirmiers'
  if (appt.type === 'blood_test') return 'Prélèvement'
  return ''
}

function durationLabelFor(appt: any) {
  if (!appt?.form_data?.duration_days) return ''
  const fd = appt.form_data
  if (appt.type === 'nursing') {
    return getNursingDurationLabel(fd.duration_days, fd.custom_days)
  }
  if (appt.type === 'blood_test') {
    return formatBloodTestSeriesDurationDays(fd.duration_days, fd.custom_days)
  }
  return ''
}

function addressLineFor(appt: any) {
  if (!appt) return '-'
  if (isAccepted.value) {
    return appointmentDetailAddressLine(appt) || '-'
  }
  return appointmentOfferAddressLine(appt) || '-'
}

/**
 * Charge les GET détail des fratries listées dans `batch_siblings`.
 * `batch_siblings` est renseigné uniquement par `Appointment::getById` (GET `/appointments/:id`),
 * pas par `decryptRowForList` (GET `/appointments` liste) — voir backend `Appointment.php` (~893–917 vs ~941–1008).
 * On prend donc en priorité l’objet renvoyé par le premier GET de la modal (`checkIfAlreadyAccepted`), pas seulement la prop.
 */
async function loadBatchSiblings(fromAppt?: any) {
  batchSiblingsFull.value = []
  const a = fromAppt ?? props.appointment
  if (!a?.batch_siblings?.length) return
  const full = await Promise.all(
    (a.batch_siblings as { id: string; status?: string; scheduled_at?: string; category_name?: string }[]).map(async (s) => {
      try {
        const r = await apiFetch(appointmentGetUrl(s.id))
        if (r.success && r.data) return r.data
      } catch {
        /* ignore */
      }
      // Fallback sur les données partielles du sibling (id, status, scheduled_at, category_name)
      // si le GET échoue (ex. accès non encore matérialisé), pour toujours afficher la vue multi-soins
      return s.id ? s : null
    }),
  )
  batchSiblingsFull.value = full.filter(Boolean) as any[]
}

/* ---------------- LOGIC ---------------- */

/** Retourne le JSON du GET `/appointments/:id` (inclut `batch_siblings` si lot multisoins côté serveur). */
const checkIfAlreadyAccepted = async (appointment: any): Promise<any | null> => {
  isAccepted.value = false
  acceptedBy.value = null
  if (appointment?.__modalPresetTaken) {
    isAlreadyAccepted.value = true
    return null
  }
  isAlreadyAccepted.value = false
  const res = await apiFetch(appointmentGetUrl(appointment.id))
  const parsed = parseAppointmentAccessResponse(res)
  if (parsed.kind === 'already_accepted') {
    isAlreadyAccepted.value = true
    return null
  }
  if (parsed.kind === 'unavailable') {
    toast.add({
      title: unavailableNoticeTitle(parsed.reason),
      description: unavailableNoticeMessage(parsed.reason),
      color: 'neutral',
    })
    return null
  }
  if (parsed.kind !== 'data') return null
  const curr = parsed.data
  if (['canceled', 'cancelled', 'refused', 'expired'].includes(String(curr.status ?? ''))) {
    toast.add({
      title: unavailableNoticeTitle(String(curr.status) === 'cancelled' ? 'canceled' : String(curr.status)),
      description: unavailableNoticeMessage(String(curr.status) === 'cancelled' ? 'canceled' : String(curr.status)),
      color: 'neutral',
    })
    return null
  }

  const myId = user.value?.id != null && user.value?.id !== '' ? String(user.value.id) : ''

  if (isTakenByColleagueFromDetail(curr, props.role, myId)) {
    isAlreadyAccepted.value = true
    if (props.role === 'nurse') {
      acceptedBy.value = { name: curr.assigned_nurse_name }
    } else if (props.role === 'preleveur') {
      acceptedBy.value = { name: curr.assigned_to_display_name }
    } else {
      acceptedBy.value = { name: curr.assigned_lab_name }
    }
    return null
  }

  if (props.role === 'nurse') {
    const aid =
      curr.assigned_nurse_id != null && curr.assigned_nurse_id !== ''
        ? String(curr.assigned_nurse_id)
        : ''
    if (aid && myId && aid === myId && curr.status === 'confirmed') {
      isAccepted.value = true
    }
  }

  if (props.role === 'lab' || props.role === 'subaccount' || props.role === 'preleveur') {
    const lid =
      curr.assigned_lab_id != null && curr.assigned_lab_id !== ''
        ? String(curr.assigned_lab_id)
        : ''
    const pid =
      curr.assigned_to != null && curr.assigned_to !== ''
        ? String(curr.assigned_to)
        : ''
    if (props.role === 'preleveur') {
      if (pid && myId && pid === myId && curr.status === 'confirmed') {
        isAccepted.value = true
      }
    } else if (lid && myId && lid === myId && curr.status === 'confirmed') {
      isAccepted.value = true
    }
  }

  return curr
}

watch(
  () => props.appointment,
  async appt => {
    if (!appt) {
      loading.value = false
      batchSiblingsFull.value = []
      return
    }
    if (appt.__modalPresetTaken) {
      isAccepted.value = false
      acceptedBy.value = null
      planLimitReached.value = false
      isAlreadyAccepted.value = true
      batchSiblingsFull.value = []
      loading.value = false
      return
    }
    loading.value = true
    try {
      const detail = await checkIfAlreadyAccepted(appt)
      await loadBatchSiblings(detail ?? appt)
    } finally {
      loading.value = false
    }
  },
  { immediate: true },
)

const canAccept = computed(() => {
  if (!props.appointment || props.appointment.status !== 'pending') return false
  const myId = user.value?.id

  if (props.role === 'nurse') {
    if (props.appointment.type === 'blood_test') return false
    return props.appointment.assigned_nurse_id === myId || !props.appointment.assigned_nurse_id
  }

  if (props.role === 'lab' || props.role === 'subaccount')
    return props.appointment.assigned_lab_id === myId || !props.appointment.assigned_lab_id

  if (props.role === 'preleveur')
    return props.appointment.type === 'blood_test'
      && (props.appointment.assigned_to === myId || !props.appointment.assigned_to)

  return false
})

/** Préleveur : refus = retirer l'offre. Nurse/lab/sub : snooze uniquement. */
const showDeclineOfferButton = computed(
  () => props.role === 'preleveur' && canAccept.value,
)
const showSnoozeOfferButton = computed(
  () => ['nurse', 'lab', 'subaccount'].includes(props.role ?? '') && canAccept.value,
)
const shouldSnoozeOnDismiss = computed(
  () =>
    showSnoozeOfferButton.value &&
    !!props.appointment &&
    props.appointment.status === 'pending' &&
    !isAlreadyAccepted.value &&
    !planLimitReached.value,
)

const appointmentsListPath = computed(() => {
  if (props.role === 'nurse') return '/nurse/appointments'
  if (props.role === 'subaccount') return '/subaccount/appointments'
  if (props.role === 'preleveur') return '/preleveur/appointments'
  return '/lab/appointments'
})

function closeModalAndGoToList() {
  closeModal()
  navigateTo(appointmentsListPath.value)
}

/** Fermeture sans navigation (CTA secondaire sur l’écran « déjà pris »). */
function closeModalOnly() {
  closeModal()
}

/** Erreur API : un confrère a accepté entre-temps (course B/C sur la même offre). */
function isRdvAlreadyTakenMessage(text: string | undefined | null): boolean {
  if (!text) return false
  return /déjà été accepté|déjà accepté|plus disponible|ne peut plus être accepté|ne vous est pas proposé|autre infirmier|autre professionnel|n'est plus disponible/i.test(
    String(text),
  )
}

/* ---------------- ACTIONS ---------------- */

const acceptAppointment = async () => {
  if (!acceptTermsChecked.value) {
    toast.add({ title: 'Veuillez accepter la prise en charge et la confidentialité du patient', color: 'orange' })
    return
  }
  accepting.value = true
  planLimitReached.value = false
  try {
    const id = String(props.appointment!.id)
    const body: Record<string, unknown> = { status: 'confirmed' }
    const st = shareTokenForAccept.value
    if (st) body.share_token = st
    // Un PUT : le backend propage la confirmation aux frères du lot (creation_batch_id).
    const res = await apiFetch(`/appointments/${encodeURIComponent(id)}`, { method: 'PUT', body })
    if (res?.success) {
      const n = batchAppointmentIds.value.length
      toast.add({
        title: n > 1 ? 'Rendez-vous acceptés' : 'Rendez-vous accepté',
        description: n > 1 ? `${n} soins ont été confirmés (lot).` : undefined,
        color: 'green',
      })
      isAccepted.value = true
      shareTokenForAccept.value = null
      skipSnoozeOnClose.value = true
      emit('accepted', props.appointment)
      emit('refresh')
      const detailId = props.appointment!.id
      closeModal()
      await navigateTo(`${appointmentsListPath.value}/${detailId}`)
      const { fetchAppointments } = useAppointments()
      void fetchAppointments()
    } else {
      const errMsg = (res as any)?.error || (res as any)?.message || ''
      if (isRdvAlreadyTakenMessage(errMsg)) {
        isAlreadyAccepted.value = true
        shareTokenForAccept.value = null
        batchSiblingsFull.value = []
      } else {
        toast.add({
          title: 'Erreur',
          description: errMsg || 'Impossible de confirmer le rendez-vous.',
          color: 'error',
        })
      }
    }
  } catch (err: any) {
    if (err?.code === 'PLAN_LIMIT' || (err?.message && /limite|offre Découverte/i.test(err.message))) {
      planLimitReached.value = true
    } else if (isRdvAlreadyTakenMessage(err?.message)) {
      isAlreadyAccepted.value = true
      shareTokenForAccept.value = null
      batchSiblingsFull.value = []
    } else {
      toast.add({ title: 'Erreur', description: err?.message || 'Impossible d\'accepter le rendez-vous', color: 'red' })
    }
  } finally {
    accepting.value = false
  }
}

const refuseAppointment = async () => {
  refusing.value = true
  try {
    const ids = batchAppointmentIds.value
    const results = await Promise.all(
      ids.map((id) =>
        apiFetch(`/appointments/${encodeURIComponent(id)}`, {
          method: 'PUT',
          body: { status: 'refused' },
        }),
      ),
    )
    const first = results[0] as any
    if (ids.length && results.every((r: any) => r?.success)) {
      if (first?.declined_offer) {
        toast.add({
          title: 'Proposition retirée',
          description: 'Le rendez-vous reste en attente pour le patient.',
          color: 'neutral',
        })
      } else {
        const n = ids.length
        toast.add({
          title: n > 1 ? 'Rendez-vous refusés' : 'Rendez-vous refusé',
          color: 'orange',
        })
      }
      skipSnoozeOnClose.value = true
      emit('refused', props.appointment!.id)
      emit('refresh')
      closeModal()
      const { fetchAppointments } = useAppointments()
      void fetchAppointments()
    } else if (ids.length) {
      toast.add({ title: 'Erreur', description: 'Impossible de refuser tous les rendez-vous du lot.', color: 'error' })
    }
  } finally {
    refusing.value = false
  }
}

const snoozeAppointment = async () => {
  if (!props.appointment?.id) return
  snoozing.value = true
  try {
    const ids = batchAppointmentIds.value
    await Promise.all(
      ids.map((id) =>
        apiFetch(`/appointments/${encodeURIComponent(id)}/offer/snooze`, {
          method: 'POST',
          body: {},
        }),
      ),
    )
    skipSnoozeOnClose.value = true
    emit('refresh')
    closeModal()
  } catch (err: any) {
    toast.add({
      title: 'Erreur',
      description: err?.message || 'Impossible de reporter cette offre',
      color: 'error',
    })
  } finally {
    snoozing.value = false
  }
}

const closeModal = () => {
  isOpen.value = false
  // Réinitialiser l'état après la fermeture
  nextTick(() => {
    isAlreadyAccepted.value = false
    planLimitReached.value = false
    acceptedBy.value = null
    isAccepted.value = false
    acceptTermsChecked.value = false
    batchSiblingsFull.value = []
  })
}

watch(isOpen, async (open, wasOpen) => {
  if (wasOpen && !open && shouldSnoozeOnDismiss.value && !skipSnoozeOnClose.value) {
    try {
      const ids = batchAppointmentIds.value
      if (ids.length) {
        await Promise.all(
          ids.map((id) =>
            apiFetch(`/appointments/${encodeURIComponent(id)}/offer/snooze`, {
              method: 'POST',
              body: {},
            }),
          ),
        )
        emit('refresh')
      }
    } catch {
      /* Fermeture sans bloquer l'utilisateur */
    }
  }
  if (!open) {
    skipSnoozeOnClose.value = false
  }
})

/* ---------------- UTIL ---------------- */

/** Date + heure (si pas de ligne « créneau » dédiée avec availability). */
function compactDateShort(date: string | null | undefined) {
  if (!date) return '·'
  try {
    const d = new Date(date)
    return d.toLocaleString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return String(date)
  }
}

/** Date seule — à droite du titre quand les disponibilités horaires sont déjà affichées en dessous. */
function compactDateOnlyShort(date: string | null | undefined) {
  if (!date) return '·'
  try {
    const d = new Date(date)
    return d.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
  } catch {
    return String(date)
  }
}

const formatDateTime = date => {
  if (!date) return '-';
  try {
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  } catch {
    return date;
  }
}

const formatDateOnly = d => new Date(d).toLocaleDateString('fr-FR')

const getAppointmentTypeLabel = t => (t === 'blood_test' ? 'Prélèvement' : 'Soins infirmiers')

const getBloodTestTypeLabel = (formData: any) => {
  if (!formData?.blood_test_type) return ''
  
  if (formData.blood_test_type === 'single') {
    return 'Une seule fois'
  }

  if (formData.blood_test_type === 'multiple') {
    const d = formatBloodTestSeriesDurationDays(formData.duration_days, formData.custom_days)
    return d ? `Plusieurs prélèvements sur ${d}` : 'Plusieurs prélèvements sur plusieurs jours'
  }

  return ''
}

const getFrequencyLabel = v =>
  ({
    once_daily: '1 fois par jour',
    twice_daily: '2 fois par jour',
    thrice_daily: '3 fois par jour',
    twice_weekly: '2 fois par semaine',
    thrice_weekly: '3 fois par semaine',
    to_define: 'A voir avec le professionnel',
    daily: '1 fois par jour',
    every_other_day: '1 jour sur 2',
  }[v] || v)

const getGenderLabel = v =>
  ({ male: 'Homme', female: 'Femme', other: 'Autre' }[v] || v)

function formatAvailability(raw: unknown, scheduledAt?: string | null) {
  const v = formatAvailabilityDisplayFr(raw, scheduledAt ?? null)
  if (v) return v
  try {
    const a = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (a.type === 'all_day') return 'Disponible toute la journée'
    if (a.type === 'custom') return `${a.range[0]}h - ${a.range[1]}h`
  } catch {}
  return typeof raw === 'string' ? raw : ''
}
</script>


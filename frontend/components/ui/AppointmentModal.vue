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
      <div class="w-full">
        <h2 class="text-xl font-normal text-gray-900 dark:text-gray-100">
          {{ modalHeaderTitle }}
        </h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
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

      <!-- ALREADY ACCEPTED — vue « marketing » : pas d’adresse / pas d’accepter -->
      <div
        v-else-if="isAlreadyAccepted"
        class="py-8 px-5 sm:px-8"
      >
        <div
          class="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50 via-white to-sky-50/80 px-6 py-8 text-center shadow-sm dark:border-slate-700/80 dark:from-slate-900/90 dark:via-slate-900 dark:to-sky-950/40"
        >
          <div
            class="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100 text-sky-600 ring-1 ring-sky-200/80 dark:bg-sky-950/50 dark:text-sky-400 dark:ring-sky-800/60"
            aria-hidden="true"
          >
            <UIcon name="i-lucide-calendar-check-2" class="h-9 w-9" />
          </div>
          <p class="text-[11px] font-semibold uppercase tracking-wider text-sky-600/90 dark:text-sky-400/90">
            Offre clôturée
          </p>
          <h3 class="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
            Rendez-vous déjà attribué
          </h3>
          <p class="mt-3 text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
            Un autre professionnel de santé a confirmé cette prise en charge entre-temps.
            <span class="block mt-2 text-sm text-slate-500 dark:text-slate-400">
              C’est une bonne nouvelle pour le patient — votre réactivité compte aussi pour les prochaines propositions.
            </span>
          </p>
          <div class="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
            <UButton
              color="primary"
              size="lg"
              class="font-semibold"
              leading-icon="i-lucide-calendar-days"
              @click="closeModalAndGoToList"
            >
              Voir mes rendez-vous
            </UButton>
            <UButton
              color="neutral"
              variant="ghost"
              size="lg"
              @click="closeModalOnly"
            >
              Fermer
            </UButton>
          </div>
        </div>
      </div>

      <!-- CONTENT -->
      <div v-else-if="appointment" :class="batchAppointmentsSorted.length > 1 ? 'space-y-3' : 'space-y-6'">
        <!-- Lot multisoins : vue compacte (évite le scroll excessif) -->
        <template v-if="batchAppointmentsSorted.length > 1">
          <div class="rounded-lg border border-gray-200/90 dark:border-gray-700 overflow-hidden bg-white/60 dark:bg-gray-900/40">
            <div class="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50/90 dark:bg-gray-800/50">
              <UIcon name="i-lucide-layers" class="w-4 h-4 text-primary-500 shrink-0" />
              <span class="text-xs font-semibold text-gray-800 dark:text-gray-100">
                {{ batchAppointmentsSorted.length }} soins — même prise en charge
              </span>
            </div>
            <ul class="divide-y divide-gray-100 dark:divide-gray-800 max-h-[min(42vh,14rem)] overflow-y-auto">
              <li
                v-for="(appt, batchIdx) in batchAppointmentsSorted"
                :key="appt.id"
                class="px-3 py-2 text-xs"
              >
                <div class="flex items-start justify-between gap-2">
                  <span class="font-medium text-gray-900 dark:text-white leading-snug min-w-0">
                    {{ batchIdx + 1 }}. {{ categoryLabelFor(appt) }}
                  </span>
                  <span class="text-gray-500 dark:text-gray-400 shrink-0 tabular-nums text-[11px]">
                    {{
                      appt.form_data?.availability
                        ? compactDateOnlyShort(appt.scheduled_at)
                        : compactDateShort(appt.scheduled_at)
                    }}
                  </span>
                </div>
                <div v-if="durationLabelFor(appt)" class="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                  {{ durationLabelFor(appt) }}
                  <span v-if="appt.form_data?.availability"> · {{ formatAvailability(appt.form_data.availability) }}</span>
                </div>
              </li>
            </ul>
            <div class="px-3 py-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/40">
              <p class="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Adresse</p>
              <p class="text-xs font-medium text-gray-900 dark:text-white mt-0.5 leading-snug">
                {{ addressLineFor(batchAppointmentsSorted[0]) }}
              </p>
            </div>
            <div v-if="batchAppointmentsSorted[0]?.notes" class="px-3 py-2 text-xs border-t border-gray-100 dark:border-gray-800">
              <p class="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-0.5">Notes</p>
              <p class="text-gray-700 dark:text-gray-300 leading-snug">{{ batchAppointmentsSorted[0].notes }}</p>
            </div>
          </div>
        </template>
        <!-- Un seul soin : grille classique -->
        <template v-else>
          <template v-for="(appt, batchIdx) in batchAppointmentsSorted" :key="appt.id">
          <section
            class="space-y-4 rounded-xl border border-gray-200/80 dark:border-gray-700 p-4 bg-white/50 dark:bg-gray-900/30"
          >
            <div v-if="categoryLabelFor(appt)" class="flex items-start gap-2">
              <UIcon
                :name="appt.type === 'blood_test' ? 'i-lucide-droplet' : 'i-lucide-stethoscope'"
                class="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0"
              />
              <div>
                <p class="text-sm text-gray-500 dark:text-gray-400">Type de soin</p>
                <p class="text-gray-700 dark:text-gray-300 font-medium">{{ categoryLabelFor(appt) }}</p>
              </div>
            </div>
            <div class="flex items-start gap-2">
              <UIcon name="i-lucide-calendar" class="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p class="text-sm text-gray-500 dark:text-gray-400">Date souhaitée</p>
                <p class="text-gray-700 dark:text-gray-300 font-medium">{{ formatDateTime(appt.scheduled_at) }}</p>
              </div>
            </div>
            <div v-if="appt.form_data?.blood_test_type" class="flex items-start gap-2">
              <UIcon name="i-lucide-droplet" class="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p class="text-sm text-gray-500 dark:text-gray-400">Type de prélèvement</p>
                <p class="text-gray-700 dark:text-gray-300 font-medium">{{ getBloodTestTypeLabel(appt.form_data) }}</p>
              </div>
            </div>
            <div v-if="appt.form_data?.duration_days" class="flex items-start gap-2">
              <UIcon name="i-lucide-calendar-days" class="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p class="text-sm text-gray-500 dark:text-gray-400">Durée</p>
                <p class="text-gray-700 dark:text-gray-300 font-medium">{{ durationLabelFor(appt) }}</p>
              </div>
            </div>
            <div v-if="appt.form_data?.frequency" class="flex items-start gap-2">
              <UIcon name="i-lucide-repeat" class="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p class="text-sm text-gray-500 dark:text-gray-400">Fréquence</p>
                <p class="text-gray-700 dark:text-gray-300 font-medium">{{ getFrequencyLabel(appt.form_data.frequency) }}</p>
              </div>
            </div>
            <div v-if="appt.form_data?.availability" class="flex items-start gap-2">
              <UIcon name="i-lucide-clock" class="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p class="text-sm text-gray-500 dark:text-gray-400">Disponibilités horaires</p>
                <p class="text-gray-700 dark:text-gray-300 font-medium">{{ formatAvailability(appt.form_data.availability) }}</p>
              </div>
            </div>
            <div class="flex items-start gap-2">
              <UIcon name="i-lucide-map-pin" class="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
              <div class="flex-1">
                <p class="text-sm text-gray-500 dark:text-gray-400">Adresse</p>
                <p class="text-gray-700 dark:text-gray-300 font-medium">
                  {{ addressLineFor(appt) }}
                </p>
              </div>
            </div>
            <div v-if="appt.notes" class="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg mt-2">
              <p class="font-medium text-sm text-gray-700 dark:text-gray-300 mb-1">Notes du patient</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">{{ appt.notes }}</p>
            </div>
          </section>
          </template>
        </template>

        <!-- CONFIDENTIAL -->
        <section v-if="isAccepted" class="border-t pt-6">
          <h3 class="font-normal text-md flex items-center gap-2 mb-4">
            <UIcon name="i-lucide-lock" class="w-4 h-4" /> Informations confidentielles
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <InfoField
              v-if="appointment.form_data?.address"
              class="md:col-span-2"
              label="Adresse"
              :value="
                typeof appointment.form_data.address === 'object'
                  ? appointment.form_data.address.label
                  : appointment.form_data.address
              "
            />
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
      <div v-else-if="appointment && !isAccepted && canAccept" class="space-y-4 w-full">
        <label class="flex items-center gap-3 cursor-pointer">
          <USwitch v-model="acceptTermsChecked" />
          <span class="text-sm text-gray-600 dark:text-gray-400">
            En acceptant le RDV vous acceptez la prise en charge et la confidentialité du patient.
          </span>
        </label>
        <div class="flex gap-3">
          <UButton
            color="error"
            variant="outline"
            leading-icon="i-lucide-x"
            :loading="refusing"
            block
            @click="refuseAppointment"
          >
            Refuser
          </UButton>
          <UButton
            :class="acceptTermsChecked ? 'bg-emerald-600 hover:bg-emerald-700' : 'opacity-50 cursor-not-allowed'"
            :disabled="!acceptTermsChecked"
            leading-icon="i-lucide-check"
            :loading="accepting"
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
import { useAuth } from '~/composables/useAuth'
import { useAppointmentModalQueue } from '~/composables/useAppointmentModalQueue'
import { useAppToast } from '~/composables/useAppToast'
import { formatStreetAndDistrictWithoutStreetNumber } from '~/utils/address-display'
import { getNursingDurationLabel } from '~/constants/nursing-duration'
import { formatBloodTestSeriesDurationDays } from '~/utils/duration-display'
import { patientUiEmailLine } from '~/utils/patient-address-rdv'
import { ref, computed, watch, nextTick, h, resolveComponent } from 'vue'
import { DialogTitle, DialogDescription } from 'reka-ui'

/* ---------------- COMPONENTS ---------------- */

const InfoRow = (props: { icon: string; text: string }) => {
  return h('div', { class: 'flex items-start gap-2' }, [
    h(resolveComponent('UIcon'), { name: props.icon, class: 'w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5' }),
    h('span', { class: 'text-gray-700 dark:text-gray-300' }, props.text)
  ])
}

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
  role?: 'nurse' | 'lab' | 'subaccount'
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

const modalUiClasses = computed(() => {
  const multi = batchAppointmentsSorted.value.length > 1
  return {
    footer: 'justify-end',
    ...(multi
      ? { body: 'max-h-[min(78vh,32rem)] overflow-y-auto sm:max-h-[min(70vh,28rem)]' }
      : {}),
  }
})

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

const modalHeaderSubtitle = computed(() => {
  if (planLimitReached.value) return 'Passez à l’offre Pro pour continuer.'
  if (isAlreadyAccepted.value)
    return 'Ce soin a déjà été pris en charge par un autre professionnel.'
  if (batchAppointmentsSorted.value.length > 1)
    return `${batchAppointmentsSorted.value.length} soins à prendre en charge dans ce lot — acceptez-les ensemble.`
  return "Acceptez rapidement avant qu'un autre professionnel ne le prenne !"
})

const patientDisplayName = computed(() => {
  const a = props.appointment
  if (!a) return '—'
  const fn = a.first_name || a.form_data?.first_name || ''
  const ln = a.last_name || a.form_data?.last_name || ''
  const s = [fn, ln].filter(Boolean).join(' ').trim()
  return s || '—'
})

const confidentialEmailDisplay = computed(() => {
  const a = props.appointment
  if (!a) return '—'
  const raw = a.email || a.form_data?.email || ''
  if (!String(raw).trim()) return '—'
  return patientUiEmailLine({
    email: raw,
    email_display: a.patient_email_display ?? null,
  })
})

function categoryLabelFor(appt: any) {
  if (!appt) return ''
  const fromRoot = typeof appt.category_name === 'string' ? appt.category_name.trim() : ''
  const fromForm = typeof appt.form_data?.category_name === 'string' ? appt.form_data.category_name.trim() : ''
  if (fromRoot) return fromRoot
  if (fromForm) return fromForm
  if (appt.type === 'nursing') return 'Soins infirmiers'
  if (appt.type === 'blood_test') return 'Prise de sang'
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
  const raw =
    typeof appt.address === 'object' && appt.address?.label
      ? String(appt.address.label)
      : String(appt.address || '')
  if (isAccepted.value) {
    return raw || '-'
  }
  return formatStreetAndDistrictWithoutStreetNumber(raw) || raw || '-'
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
  /** Réponse dédiée infirmier/lab : pas de fiche détail si un confrère a déjà accepté */
  if (res?.success && (res as any).alreadyAccepted) {
    isAlreadyAccepted.value = true
    return null
  }
  const curr = res?.data
  if (!curr) return null

  const myId = user.value?.id != null && user.value?.id !== '' ? String(user.value.id) : ''

  if (props.role === 'nurse') {
    const aid =
      curr.assigned_nurse_id != null && curr.assigned_nurse_id !== ''
        ? String(curr.assigned_nurse_id)
        : ''
    const labTaken = curr.assigned_lab_id != null && String(curr.assigned_lab_id).length > 0
    if (labTaken || (aid && myId && aid !== myId)) {
      isAlreadyAccepted.value = true
      acceptedBy.value = { name: curr.assigned_nurse_name }
    } else if (aid && myId && aid === myId && curr.status === 'confirmed') {
      isAccepted.value = true
    }
  }

  if (props.role === 'lab' || props.role === 'subaccount') {
    const lid =
      curr.assigned_lab_id != null && curr.assigned_lab_id !== ''
        ? String(curr.assigned_lab_id)
        : ''
    if (lid && myId && lid !== myId) {
      isAlreadyAccepted.value = true
      acceptedBy.value = { name: curr.assigned_lab_name }
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

  return false
})

const appointmentsListPath = computed(() => {
  if (props.role === 'nurse') return '/nurse/appointments'
  if (props.role === 'subaccount') return '/subaccount/appointments'
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

/* ---------------- UTIL ---------------- */

/** Date + heure (si pas de ligne « créneau » dédiée avec availability). */
function compactDateShort(date: string | null | undefined) {
  if (!date) return '—'
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
  if (!date) return '—'
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

const formatAddressShort = (address: string) => {
  if (!address) return '-'
  
  // Extraire le code postal et la ville
  // Format attendu : "rue, code postal ville" ou "rue code postal ville"
  const postalCodeMatch = address.match(/(\d{5})\s+([^,]+)/);
  
  if (postalCodeMatch) {
    const postalCode = postalCodeMatch[1]
    const city = postalCodeMatch[2].trim()
    
    // Pour Paris, afficher l'arrondissement
    if (postalCode.startsWith('75')) {
      const arrondissement = postalCode.substring(3, 5)
      return `${arrondissement}ème arrondissement, Paris`
    }
    
    return `${postalCode} ${city}`
  }
  
  // Si pas de correspondance, extraire les derniers mots (ville probable)
  const parts = address.split(',').map(p => p.trim())
  if (parts.length > 0) {
    return parts[parts.length - 1]
  }
  
  return address
}

const getAppointmentTypeColor = t => (t === 'blood_test' ? 'blue' : 'green')
const getAppointmentTypeLabel = t => (t === 'blood_test' ? 'Prise de sang' : 'Soins infirmiers')

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

const formatAvailability = raw => {
  try {
    const a = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (a.type === 'all_day') return 'Disponible toute la journée'
    if (a.type === 'custom') return `${a.range[0]}h - ${a.range[1]}h`
  } catch {}
  return raw
}
</script>


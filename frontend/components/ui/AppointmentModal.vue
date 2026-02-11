<template>
  <UModal
    v-model:open="isOpen"
    :ui="{ footer: 'justify-end' }"
  >
    <template #header>
      <DialogTitle class="sr-only">
        {{ appointment ? `Détails du rendez-vous - ${getAppointmentTypeLabel(appointment.type)}` : 'Détails du rendez-vous' }}
      </DialogTitle>
      <DialogDescription class="sr-only">
        {{ appointment ? `Informations détaillées du rendez-vous de type ${getAppointmentTypeLabel(appointment.type)}` : 'Informations détaillées du rendez-vous' }}
      </DialogDescription>
      <div class="w-full">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Nouveau rendez-vous
        </h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Acceptez rapidement avant qu'un autre professionnel ne le prenne !
        </p>
      </div>
    </template>

    <template #body>
      <!-- LOADING -->
      <div v-if="loading" class="text-center py-10">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto text-primary" />
        <p class="text-gray-500 mt-2">Chargement...</p>
      </div>

      <!-- ALREADY ACCEPTED -->
      <div v-else-if="isAlreadyAccepted" class="text-center py-10 px-6">
        <UIcon name="i-lucide-calendar-x" class="w-16 h-16 mx-auto text-red-500 mb-4" />
        <h3 class="text-xl font-semibold mb-2">Rendez-vous déjà pris</h3>
        <p class="text-gray-600 mb-4">
          Ce rendez-vous a déjà été accepté par {{ acceptedBy?.name || 'un autre professionnel' }}.
        </p>
      </div>

      <!-- CONTENT -->
      <div v-else-if="appointment" class="space-y-6">
        <!-- BASIC INFO -->
        <section class="space-y-4">
          <!-- Type de soin / Catégorie -->
          <div v-if="appointment.category_name" class="flex items-start gap-2">
            <UIcon name="i-lucide-stethoscope" class="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">Type de soin</p>
              <p class="text-gray-700 dark:text-gray-300 font-medium">{{ appointment.category_name }}</p>
            </div>
          </div>

          <!-- Date -->
          <div class="flex items-start gap-2">
            <UIcon name="i-lucide-calendar" class="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">Date souhaitée</p>
              <p class="text-gray-700 dark:text-gray-300 font-medium">{{ formatDateTime(appointment.scheduled_at) }}</p>
            </div>
          </div>

          <!-- Pour les laboratoires : Type de prélèvement -->
          <div
            v-if="appointment.form_data?.blood_test_type"
            class="flex items-start gap-2"
          >
            <UIcon name="i-lucide-droplet" class="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">Type de prélèvement</p>
              <p class="text-gray-700 dark:text-gray-300 font-medium">{{ getBloodTestTypeLabel(appointment.form_data) }}</p>
            </div>
          </div>

          <!-- Durée des soins (pour les infirmiers et les prélèvements multiples) -->
          <div
            v-if="appointment.form_data?.duration_days"
            class="flex items-start gap-2"
          >
            <UIcon name="i-lucide-calendar-days" class="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">Durée</p>
              <p class="text-gray-700 dark:text-gray-300 font-medium">{{ getDurationLabel(appointment.form_data.duration_days) }}</p>
            </div>
          </div>

          <!-- Fréquence (pour les soins infirmiers) -->
          <div
            v-if="appointment.form_data?.frequency"
            class="flex items-start gap-2"
          >
            <UIcon name="i-lucide-repeat" class="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">Fréquence</p>
              <p class="text-gray-700 dark:text-gray-300 font-medium">{{ getFrequencyLabel(appointment.form_data.frequency) }}</p>
            </div>
          </div>

          <!-- Disponibilités horaires -->
          <div
            v-if="appointment.form_data?.availability"
            class="flex items-start gap-2"
          >
            <UIcon name="i-lucide-clock" class="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">Disponibilités horaires</p>
              <p class="text-gray-700 dark:text-gray-300 font-medium">{{ formatAvailability(appointment.form_data.availability) }}</p>
            </div>
          </div>

          <!-- Adresse -->
          <div class="flex items-start gap-2">
            <UIcon name="i-lucide-map-pin" class="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
            <div class="flex-1">
              <p class="text-sm text-gray-500 dark:text-gray-400">Adresse</p>
              <p class="text-gray-700 dark:text-gray-300 font-medium">
                {{
                  typeof appointment.address === 'object' && appointment.address?.label
                    ? appointment.address.label
                    : appointment.address || '-'
                }}
              </p>
            </div>
          </div>

          <!-- NOTES -->
          <div v-if="appointment.notes" class="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg mt-4">
            <p class="font-medium text-sm text-gray-700 dark:text-gray-300 mb-1">Notes du patient</p>
            <p class="text-sm text-gray-600 dark:text-gray-400">{{ appointment.notes }}</p>
          </div>
        </section>

        <!-- CONFIDENTIAL -->
        <section v-if="isAccepted" class="border-t pt-6">
          <h3 class="font-semibold text-md flex items-center gap-2 mb-4">
            <UIcon name="i-lucide-lock" class="w-4 h-4" /> Informations confidentielles
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoField label="Nom complet" :value="`${appointment.first_name} ${appointment.last_name}`" />
            <InfoField label="Téléphone" :value="appointment.phone" />
            <InfoField label="Email" :value="appointment.email" />

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
      <div v-if="loading || isAlreadyAccepted" class="flex justify-end">
        <UButton 
          color="neutral" 
          variant="outline"
          @click="close"
        >
          Fermer
        </UButton>
      </div>
      <div v-else-if="appointment && !isAccepted && canAccept" class="flex gap-3 w-full">
        <UButton
          color="error"
          variant="outline"
          leading-icon="i-lucide-x"
          :loading="processing"
          block
          @click="refuseAppointment"
        >
          Refuser
        </UButton>

        <UButton
          color="success"
          leading-icon="i-lucide-check"
          :loading="processing"
          block
          @click="acceptAppointment"
        >
          Accepter
        </UButton>
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
import { useToast } from '#imports'
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
const toast = useToast()

const loading = ref(false)
const processing = ref(false)
const isAlreadyAccepted = ref(false)
const acceptedBy = ref<any>(null)
const isAccepted = ref(false)

/* ---------------- LOGIC ---------------- */

const checkIfAlreadyAccepted = async appointment => {
  loading.value = true
  try {
    const res = await apiFetch(`/appointments/${appointment.id}`)
    const curr = res?.data
    if (!curr) return

    if (props.role === 'nurse') {
      if (curr.assigned_nurse_id && curr.assigned_nurse_id !== user.value?.id) {
        isAlreadyAccepted.value = true
        acceptedBy.value = { name: curr.assigned_nurse_name }
      } else if (curr.assigned_nurse_id === user.value?.id) {
        isAccepted.value = true
      }
    }

    if (props.role === 'lab' || props.role === 'subaccount') {
      if (curr.assigned_lab_id && curr.assigned_lab_id !== user.value?.id) {
        isAlreadyAccepted.value = true
        acceptedBy.value = { name: curr.assigned_lab_name }
      } else if (curr.assigned_lab_id === user.value?.id) {
        isAccepted.value = true
      }
    }
  } finally {
    loading.value = false
  }
}

watch(
  () => props.appointment,
  async appt => {
    if (appt) await checkIfAlreadyAccepted(appt)
  },
  { immediate: true }
)

const canAccept = computed(() => {
  if (!props.appointment) return false

  if (props.role === 'nurse')
    return props.appointment.status === 'pending' && !props.appointment.assigned_nurse_id

  if (props.role === 'lab' || props.role === 'subaccount')
    return props.appointment.status === 'pending' && !props.appointment.assigned_lab_id

  return false
})

/* ---------------- ACTIONS ---------------- */

const acceptAppointment = async () => {
  processing.value = true
  try {
    const res = await apiFetch(`/appointments/${props.appointment.id}`, {
      method: 'PUT',
      body: { status: 'confirmed' }
    })

    if (res.success) {
      toast.add({ title: 'Rendez-vous accepté', color: 'green' })
      isAccepted.value = true
      emit('accepted', props.appointment)
      emit('refresh')
      
      // Recharger la liste des rendez-vous
      const { fetchAppointments } = useAppointments()
      await fetchAppointments()
      
      // Fermer après un délai
      setTimeout(() => {
        closeModal()
      }, 1500)
    }
  } finally {
    processing.value = false
  }
}

const refuseAppointment = async () => {
  processing.value = true
  try {
    const res = await apiFetch(`/appointments/${props.appointment.id}`, {
      method: 'PUT',
      body: { status: 'refused' }
    })

    if (res.success) {
      toast.add({ title: 'Rendez-vous refusé', color: 'orange' })
      emit('refused', props.appointment.id)
      emit('refresh')
      closeModal()
    }
  } finally {
    processing.value = false
  }
}

const closeModal = () => {
  isOpen.value = false
  // Réinitialiser l'état après la fermeture
  nextTick(() => {
    isAlreadyAccepted.value = false
    acceptedBy.value = null
    isAccepted.value = false
  })
}

/* ---------------- UTIL ---------------- */

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

const getDurationLabel = v =>
  ({
    '1': '1 jour',
    '7': '7 jours',
    '10': '10 jours',
    '15': '15 jours (ou jusqu\'à la cicatrisation)',
    '30': '30 jours',
    '60+': 'Longue durée (60 jours ou +)'
  }[v] || v)

const getBloodTestTypeLabel = (formData: any) => {
  if (!formData?.blood_test_type) return ''
  
  if (formData.blood_test_type === 'single') {
    return 'Une seule prise de sang'
  }
  
  if (formData.blood_test_type === 'multiple') {
    if (formData.duration_days === 'custom' && formData.custom_days) {
      return `Plusieurs prélèvements sur ${formData.custom_days} jours`
    }
    
    const daysLabel = {
      '2': '2 jours',
      '3': '3 jours',
      '5': '5 jours',
      '7': '7 jours',
      '10': '10 jours',
      '15': '15 jours'
    }[formData.duration_days] || formData.duration_days
    
    return `Plusieurs prélèvements sur ${daysLabel}`
  }
  
  return ''
}

const getFrequencyLabel = v =>
  ({
    daily: 'Chaque jour',
    every_other_day: '1 jour sur 2',
    twice_weekly: '2 fois par semaine',
    thrice_weekly: '3 fois par semaine'
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


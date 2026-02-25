<template>
  <div class="space-y-6">
    <TitleDashboard
      title="Plans de soins actifs"
      description="Gérez vos soins récurrents sur plusieurs jours"
    >
      <template #actions>
        <div class="flex items-center gap-2">
          <div class="inline-flex rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-1">
            <UButton
              v-for="tab in dateTabs"
              :key="tab.value"
              :variant="dateFilter === tab.value ? 'solid' : 'ghost'"
              :color="dateFilter === tab.value ? 'primary' : 'gray'"
              size="sm"
              @click="dateFilter = tab.value"
              class="transition-all"
            >
              {{ tab.label }}
            </UButton>
          </div>
        </div>
      </template>
    </TitleDashboard>

    <div v-if="loading" class="text-center py-12">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto text-primary-500 mb-2" />
      <p class="text-gray-500 dark:text-gray-400">Chargement des plans de soins...</p>
    </div>
    
    <UEmpty
      v-else-if="recurringCaresByPatient.length === 0"
      icon="i-lucide-calendar-check"
      title="Aucun plan de soins actif"
      description="Vous n'avez pas de soins récurrents en cours. Les traitements sur plusieurs jours apparaîtront ici."
    />
    
    <!-- Grille de cartes -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <UCard 
        v-for="care in recurringCaresByPatient" 
        :key="care.id"
        class="hover:shadow-lg transition-shadow duration-200 relative"
        :ui="{
          body: { padding: 'p-4' },
          footer: { padding: 'p-4 pt-3' }
        }"
      >
        <!-- Badge de statut en haut à droite -->
        <div class="absolute top-4 right-4 z-10">
          <UBadge 
            :color="getStatusColor(care.status)" 
            variant="subtle"
            size="sm"
            :label="getStatusLabel(care.status)"
          />
        </div>

        <div class="space-y-3 pt-1">
          <!-- Patient -->
          <div class="flex items-start gap-3">
            <UIcon
              name="i-lucide-user"
              class="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0"
            />
            <div class="flex-1 min-w-0">
              <p class="text-xs text-gray-500 dark:text-gray-400">Patient</p>
              <p class="text-sm font-medium text-gray-900 dark:text-white">
                {{ care.patient_name }}
              </p>
              <p v-if="care.patient_phone" class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {{ care.patient_phone }}
              </p>
            </div>
          </div>

          <!-- Type de soin -->
          <div class="flex items-start gap-3">
            <UIcon
              name="i-lucide-stethoscope"
              class="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0"
            />
            <div class="flex-1 min-w-0">
              <p class="text-xs text-gray-500 dark:text-gray-400">Type de soin</p>
              <p class="text-sm font-medium text-gray-900 dark:text-white">
                {{ care.category_name || 'Soins infirmiers' }}
              </p>
            </div>
          </div>

          <!-- Durée -->
          <div class="flex items-start gap-3">
            <UIcon
              name="i-lucide-calendar-days"
              class="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0"
            />
            <div class="flex-1 min-w-0">
              <p class="text-xs text-gray-500 dark:text-gray-400">Durée</p>
              <p class="text-sm font-medium text-gray-900 dark:text-white">
                {{ getDurationLabel(care.duration_days) }}
              </p>
            </div>
          </div>

          <!-- Fréquence -->
          <div class="flex items-start gap-3">
            <UIcon
              name="i-lucide-repeat"
              class="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0"
            />
            <div class="flex-1 min-w-0">
              <p class="text-xs text-gray-500 dark:text-gray-400">Fréquence</p>
              <p class="text-sm font-medium text-gray-900 dark:text-white">
                {{ getFrequencyLabel(care.frequency) }}
              </p>
            </div>
          </div>

          <!-- Prochain passage -->
          <div class="flex items-start gap-3">
            <UIcon
              name="i-lucide-clock"
              class="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0"
            />
            <div class="flex-1 min-w-0">
              <p class="text-xs text-gray-500 dark:text-gray-400">Prochain passage</p>
              <p class="text-sm font-medium text-gray-900 dark:text-white">
                {{ formatNextVisit(care.scheduled_at) }}
              </p>
            </div>
          </div>

          <!-- Adresse -->
          <div class="flex items-start gap-3">
            <UIcon
              name="i-lucide-map-pin"
              class="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0"
            />
            <div class="flex-1 min-w-0">
              <p class="text-xs text-gray-500 dark:text-gray-400">Adresse</p>
              <p class="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                {{ care.address }}
              </p>
            </div>
          </div>

          <!-- Disponibilités -->
          <div v-if="care.availability" class="flex items-start gap-3">
            <UIcon
              name="i-lucide-clock"
              class="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0"
            />
            <div class="flex-1 min-w-0">
              <p class="text-xs text-gray-500 dark:text-gray-400">Disponibilités</p>
              <p class="text-sm font-medium text-gray-900 dark:text-white">
                {{ formatAvailability(care.availability) }}
              </p>
            </div>
          </div>

          <!-- En cours -->
          <div v-if="care.status === 'inProgress' && care.started_at" class="flex items-start gap-3">
            <UIcon
              name="i-lucide-play-circle"
              class="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0"
            />
            <div class="flex-1 min-w-0">
              <p class="text-xs text-gray-500 dark:text-gray-400">Statut</p>
              <p class="text-sm font-medium text-primary-600 dark:text-primary-400">
                Démarré à {{ formatTime(care.started_at) }}
              </p>
            </div>
          </div>

          <!-- Notes -->
          <div v-if="care.notes" class="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <UIcon
              name="i-lucide-alert-circle"
              class="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0"
            />
            <div class="flex-1 min-w-0">
              <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Notes</p>
              <p class="text-sm text-amber-700 dark:text-amber-300 line-clamp-3">
                {{ care.notes }}
              </p>
            </div>
          </div>
        </div>

        <!-- Actions dans le footer -->
        <template #footer>
          <div class="flex gap-2">
            <UButton 
              v-if="care.status === 'inProgress'"
              color="success"
              size="sm"
              leading-icon="i-lucide-check-circle"
              @click="completeAppointment(care.id)"
              :loading="processingAppointments.has(care.id)"
              block
            >
              Terminer
            </UButton>
            <UButton
              v-else-if="care.status === 'confirmed' && canStart(care)"
              color="primary"
              size="sm"
              leading-icon="i-lucide-play"
              @click="startAppointment(care.id)"
              :loading="processingAppointments.has(care.id)"
              block
            >
              Commencer
            </UButton>
            <UButton
              variant="outline"
              size="sm"
              leading-icon="i-lucide-eye"
              :to="`/nurse/appointments/${care.id}`"
              block
            >
              Détails
            </UButton>
          </div>
        </template>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'nurse',
});

import { apiFetch } from '~/utils/api';

const { appointments, loading, fetchAppointments } = useAppointments();
const toast = useAppToast();

const dateFilter = ref('today');
const processingAppointments = ref(new Set<string>());

// Options de filtres
const dateTabs = [
  { label: "Aujourd'hui", value: 'today' },
  { label: 'À venir', value: 'upcoming' },
  { label: 'Passés', value: 'past' },
];

// Filtrer UNIQUEMENT les soins récurrents (sur plusieurs jours)
const recurringCaresByPatient = computed(() => {
  // D'abord filtrer les soins récurrents
  const recurringCares = appointments.value
    .filter(a => {
      // Garder seulement les soins confirmés ou en cours
      if (a.status !== 'inProgress' && a.status !== 'confirmed') {
        return false;
      }
      
      // Filtrer uniquement les soins RÉCURRENTS
      const formData = a.form_data;
      if (!formData) return false;
      
      // Critères pour identifier un soin récurrent :
      // 1. duration_days > 1 (plus d'un jour)
      // 2. OU frequency définie et différente de 'single'
      const hasMultipleDays = formData.duration_days && 
                              formData.duration_days !== '1' && 
                              formData.duration_days !== 'single';
      const hasRecurringFrequency = formData.frequency && 
                                   formData.frequency !== 'single' &&
                                   ['daily', 'every_other_day', 'twice_weekly', 'thrice_weekly'].includes(formData.frequency);
      
      return hasMultipleDays || hasRecurringFrequency;
    })
    .map(a => {
      // Extraire les données du form_data
      const formData = a.form_data || {};
      return {
        id: a.id,
        status: a.status,
        scheduled_at: a.scheduled_at,
        started_at: a.started_at,
        address: a.address,
        category_name: a.category_name || formData.category_name,
        patient_name: `${formData.first_name || ''} ${formData.last_name || ''}`.trim() || 'Patient',
        patient_phone: formData.phone,
        patient_email: formData.email,
        duration_days: formData.duration_days || '7',
        frequency: formData.frequency || 'daily',
        availability: formData.availability,
        notes: formData.notes || a.notes,
      };
    });
  
  // Ensuite filtrer par période
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  let filtered = recurringCares.filter(care => {
    const appointmentDate = new Date(care.scheduled_at);

    switch (dateFilter.value) {
      case 'today':
        return appointmentDate >= todayStart && appointmentDate <= todayEnd;
      case 'upcoming':
        return appointmentDate > todayEnd;
      case 'past':
        return appointmentDate < todayStart;
      default:
        return true;
    }
  });

  // Trier par date de prochain passage (les plus proches en premier)
  return filtered.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
});

onMounted(() => {
  fetchAppointments();
});

// Watcher pour recharger quand on change de filtre
watch(dateFilter, () => {
  // Pas besoin de recharger depuis le serveur, 
  // le computed property `recurringCaresByPatient` se met à jour automatiquement
});

const formatDate = (date: string) => {
  return new Date(date).toLocaleString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatTime = (date: string) => {
  return new Date(date).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatNextVisit = (date: string) => {
  const now = new Date();
  const scheduled = new Date(date);
  const diffMs = scheduled.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  
  if (diffMs < 0) {
    return 'Maintenant';
  }
  
  if (diffHours < 1) {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `Dans ${diffMinutes} min`;
  }
  
  if (diffHours < 24) {
    return `Aujourd'hui ${formatTime(date)}`;
  }
  
  if (diffDays === 1) {
    return `Demain ${formatTime(date)}`;
  }
  
  if (diffDays < 7) {
    return scheduled.toLocaleDateString('fr-FR', {
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  
  return scheduled.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getStatusColor = (status: string): 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral' => {
  const colors: Record<string, 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral'> = {
    pending: 'warning',
    confirmed: 'info',
    inProgress: 'primary',
    completed: 'success',
    cancelled: 'error',
  };
  return colors[status] || 'neutral';
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: 'En attente',
    confirmed: 'Confirmé',
    inProgress: 'En cours',
    completed: 'Terminé',
    canceled: 'Annulé',
    cancelled: 'Annulé',
    refused: 'Refusé',
    expired: 'Expiré',
  };
  return labels[status] || status;
};

const getDurationLabel = (duration: string) => {
  const labels: Record<string, string> = {
    '1': '1 jour',
    '7': '7 jours',
    '10': '10 jours',
    '15': '15 jours (ou jusqu\'à la cicatrisation)',
    '30': '30 jours',
    '60+': 'Longue durée (60 jours ou +)',
  };
  return labels[duration] || duration;
};

const getFrequencyLabel = (frequency: string) => {
  const labels: Record<string, string> = {
    daily: 'Chaque jour',
    every_other_day: '1 jour sur 2',
    twice_weekly: '2 fois par semaine',
    thrice_weekly: '3 fois par semaine',
  };
  return labels[frequency] || frequency;
};

const formatDateOnly = (date: string) => {
  return new Date(date).toLocaleDateString('fr-FR');
};

const getGenderLabel = (gender: string) => {
  const labels: Record<string, string> = {
    male: 'Homme',
    female: 'Femme',
    other: 'Autre',
  };
  return labels[gender] || gender;
};

const formatAvailability = (availability: string) => {
  try {
    const avail = typeof availability === 'string' ? JSON.parse(availability) : availability;
    if (avail.type === 'all_day') {
      return 'Disponible toute la journée';
    } else if (avail.type === 'custom' && avail.range) {
      return `${avail.range[0]}h - ${avail.range[1]}h`;
    }
  } catch (e) {
    return availability;
  }
  return availability;
};

const canStart = (appointment: any) => {
  const now = new Date();
  const scheduled = new Date(appointment.scheduled_at);
  const diffMinutes = (scheduled.getTime() - now.getTime()) / (1000 * 60);
  return diffMinutes <= 30 && appointment.status === 'confirmed';
};

const startAppointment = async (id: string) => {
  processingAppointments.value.add(id);
  try {
    const response = await apiFetch(`/appointments/${id}`, {
      method: 'PUT',
      body: { status: 'inProgress' },
    });
    if (response.success) {
      toast.add({
        title: 'Soin démarré',
        description: 'Le soin a été démarré avec succès.',
        color: 'blue',
      });
      await fetchAppointments();
    } else {
      toast.add({
        title: 'Erreur',
        description: response.error || 'Impossible de démarrer le soin',
        color: 'red',
      });
    }
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error.message || 'Une erreur est survenue',
      color: 'red',
    });
  } finally {
    processingAppointments.value.delete(id);
  }
};

const completeAppointment = async (id: string) => {
  processingAppointments.value.add(id);
  try {
    const response = await apiFetch(`/appointments/${id}`, {
      method: 'PUT',
      body: { status: 'completed' },
    });
    if (response.success) {
      toast.add({
        title: 'Soin terminé',
        description: 'Le soin a été terminé avec succès.',
        color: 'green',
      });
      await fetchAppointments();
    } else {
      toast.add({
        title: 'Erreur',
        description: response.error || 'Impossible de terminer le soin',
        color: 'red',
      });
    }
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error.message || 'Une erreur est survenue',
      color: 'red',
    });
  } finally {
    processingAppointments.value.delete(id);
  }
};
</script>

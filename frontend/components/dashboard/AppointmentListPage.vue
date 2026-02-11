<template>
  <div class="space-y-6">
    <!-- En-tête avec filtres (masqué si la page utilise TitleDashboard) -->
    <div v-if="!hideHeader" class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          {{ title }}
        </h1>
        <p v-if="subtitle" class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {{ subtitle }}
        </p>
      </div>

      <!-- Actions d'en-tête (slot pour bouton Créer, Calendrier, etc.) -->
      <div v-if="$slots.headerActions" class="flex items-center gap-2">
        <slot name="headerActions" />
      </div>

      <!-- Filtres par période (liste avec cartes) -->
      <div v-else class="flex items-center gap-2">
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
    </div>

    <!-- Recherche + filtre statut (toujours visible) -->
    <div class="flex flex-col sm:flex-row gap-3 sm:items-center">
      <UInput
        v-model="searchQuery"
        placeholder="Rechercher (patient, téléphone, adresse...)"
        icon="i-lucide-search"
        size="md"
        class="flex-1 min-w-0 max-w-md"
        clearable
      />
      <USelect
        v-model="statusFilter"
        :items="statusFilterOptions"
        value-key="value"
        placeholder="Tous les statuts"
        size="md"
        class="w-full sm:w-48"
      />
    </div>

    <!-- État de chargement -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-16">
      <UIcon
        name="i-lucide-loader-2"
        class="w-10 h-10 animate-spin text-primary-500 mb-4"
      />
      <p class="text-gray-500 dark:text-gray-400">
        Chargement des rendez-vous...
      </p>
    </div>

    <!-- État vide -->
    <UEmpty
      v-else-if="!loading && appointments.length === 0"
      icon="i-lucide-calendar-x"
      :title="emptyStateTitle"
      :description="emptyStateDescription"
    />

    <!-- Grille de cartes -->
    <div v-else class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
        <UCard
          v-for="appointment in appointments"
          :key="appointment.id"
          class="hover:shadow-lg transition-shadow duration-200 relative h-full flex flex-col"
          :ui="{
            root: 'flex flex-col h-full min-h-0',
            body: 'flex-1 flex flex-col min-h-0 p-4 overflow-hidden',
            footer: 'mt-auto border-t border-gray-200 dark:border-gray-800 p-3 flex items-center justify-center gap-1.5 flex-shrink-0'
          }"
        >
          <!-- Badge de statut en haut à droite -->
          <div class="absolute top-4 right-4 z-10">
            <UBadge
              :color="getStatusColor(appointment.status)"
              variant="subtle"
              size="sm"
              :label="getStatusLabel(appointment.status)"
            />
          </div>

          <div class="space-y-3 pt-1">
            <!-- Type d'intervention (Prise de sang / Soins infirmiers) -->
            <div class="flex items-start gap-3">
              <UIcon
                :name="appointment.type === 'blood_test' ? 'i-lucide-droplet' : 'i-lucide-stethoscope'"
                class="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0"
              />
              <div class="flex-1 min-w-0">
                <p class="text-xs text-gray-500 dark:text-gray-400">Type d'intervention</p>
                <p class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ appointment.type === 'blood_test' ? 'Prise de sang' : 'Soins infirmiers' }}
                </p>
              </div>
            </div>

            <!-- Patient -->
            <div class="flex items-start gap-3">
              <UIcon
                name="i-lucide-user"
                class="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0"
              />
              <div class="flex-1 min-w-0">
                <p class="text-xs text-gray-500 dark:text-gray-400">Patient</p>
                <p class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ appointment.form_data?.first_name }} {{ appointment.form_data?.last_name }}
                </p>
                <p v-if="appointment.form_data?.phone" class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {{ appointment.form_data?.phone }}
                </p>
              </div>
            </div>

            <!-- Type d'analyse / Type de soin (catégorie) -->
            <div v-if="appointment.category_name" class="flex items-start gap-3">
              <UIcon
                :name="appointment.type === 'blood_test' ? 'i-lucide-flask-conical' : 'i-lucide-stethoscope'"
                class="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0"
              />
              <div class="flex-1 min-w-0">
                <p class="text-xs text-gray-500 dark:text-gray-400">{{ appointment.type === 'blood_test' ? 'Type d\'analyse' : 'Type de soin' }}</p>
                <p class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ appointment.category_name }}
                </p>
              </div>
            </div>

            <!-- Type de prélèvement (prise de sang uniquement) -->
            <div v-if="appointment.type === 'blood_test' && getBloodTestTypeLabel(appointment.form_data)" class="flex items-start gap-3">
              <UIcon
                name="i-lucide-pipette"
                class="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0"
              />
              <div class="flex-1 min-w-0">
                <p class="text-xs text-gray-500 dark:text-gray-400">Prélèvement</p>
                <p class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ getBloodTestTypeLabel(appointment.form_data) }}
                </p>
              </div>
            </div>

            <!-- Date -->
            <div class="flex items-start gap-3">
              <UIcon
                name="i-lucide-calendar"
                class="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0"
              />
              <div class="flex-1 min-w-0">
                <p class="text-xs text-gray-500 dark:text-gray-400">Date souhaitée</p>
                <p class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ formatDateTime(appointment.scheduled_at) }}
                </p>
              </div>
            </div>

            <!-- Créneau horaire -->
            <div class="flex items-start gap-3">
              <UIcon
                name="i-lucide-clock"
                class="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0"
              />
              <div class="flex-1 min-w-0">
                <p class="text-xs text-gray-500 dark:text-gray-400">Créneau horaire</p>
                <p class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ getCreneauHoraireLabel(appointment) }}
                </p>
              </div>
            </div>

            <!-- Durée -->
            <div v-if="appointment.form_data?.duration_days" class="flex items-start gap-3">
              <UIcon
                name="i-lucide-calendar-days"
                class="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0"
              />
              <div class="flex-1 min-w-0">
                <p class="text-xs text-gray-500 dark:text-gray-400">Durée</p>
                <p class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ getDurationLabel(appointment.form_data.duration_days) }}
                </p>
              </div>
            </div>

            <!-- Fréquence -->
            <div v-if="appointment.form_data?.frequency" class="flex items-start gap-3">
              <UIcon
                name="i-lucide-repeat"
                class="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0"
              />
              <div class="flex-1 min-w-0">
                <p class="text-xs text-gray-500 dark:text-gray-400">Fréquence</p>
                <p class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ getFrequencyLabel(appointment.form_data.frequency) }}
                </p>
              </div>
            </div>

            <!-- Adresse -->
            <div v-if="appointment.address" class="flex items-start gap-3">
              <UIcon
                name="i-lucide-map-pin"
                class="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0"
              />
              <div class="flex-1 min-w-0">
                <p class="text-xs text-gray-500 dark:text-gray-400">Adresse</p>
                <p class="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                  {{ typeof appointment.address === 'object' && appointment.address?.label ? appointment.address.label : appointment.address }}
                </p>
              </div>
            </div>

            <!-- En cours -->
            <div v-if="appointment.status === 'inProgress' && appointment.started_at" class="flex items-start gap-3">
              <UIcon
                name="i-lucide-play-circle"
                class="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0"
              />
              <div class="flex-1 min-w-0">
                <p class="text-xs text-gray-500 dark:text-gray-400">Statut</p>
                <p class="text-sm font-medium text-primary-600 dark:text-primary-400">
                  Démarré à {{ formatTime(appointment.started_at) }}
                </p>
              </div>
            </div>

            <!-- Notes -->
            <div v-if="appointment.notes" class="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <UIcon
                name="i-lucide-alert-circle"
                class="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0"
              />
              <div class="flex-1 min-w-0">
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Notes</p>
                <p class="text-sm text-amber-700 dark:text-amber-300 line-clamp-3">
                  {{ appointment.notes }}
                </p>
              </div>
            </div>
          </div>

          <template #footer>
            <div class="flex items-center justify-center gap-1.5 w-full">
              <slot name="cardActions" :appointment="appointment" :base-path="basePath">
                <UButton
                  variant="soft"
                  color="primary"
                  size="xs"
                  leading-icon="i-lucide-eye"
                  :to="`${basePath}/appointments/${appointment.id}`"
                >
                  Détails
                </UButton>
              </slot>
            </div>
          </template>
        </UCard>
      </div>

      <!-- Pagination -->
      <div
        v-if="totalPages > 1"
        class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-200 dark:border-gray-800"
      >
        <div class="text-sm text-gray-600 dark:text-gray-400">
          Affichage de
          <span class="font-medium text-gray-900 dark:text-white">
            {{ startIndex }}-{{ endIndex }}
          </span>
          sur
          <span class="font-medium text-gray-900 dark:text-white">
            {{ totalItems }}
          </span>
          rendez-vous
        </div>
        <UPagination
          v-model="currentPage"
          :total="totalItems"
          :page-size="pageSize"
          :max="7"
          @update:model-value="handlePageChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { apiFetch } from '~/utils/api';

const props = withDefaults(
  defineProps<{
    basePath: string
    title?: string
    subtitle?: string
    /** Masque l'en-tête (titre + actions) pour utiliser TitleDashboard sur la page parente. */
    hideHeader?: boolean
    /** Si true, utilise les filtres date (À venir / Passés) et fetch nurse-style. Sinon fetch tous et filtre côté client par search/status si besoin. */
    useDateFilter?: boolean
    /** Statuts à inclure dans l'API (ex: "confirmed,inProgress,completed,canceled,refused" pour nurse). Vide = tous. */
    statusFilterApi?: string
  }>(),
  {
    title: 'Mes rendez-vous',
    subtitle: 'Gérez vos rendez-vous',
    hideHeader: false,
    useDateFilter: true,
    statusFilterApi: '',
  }
);

const toast = useToast();

const currentPage = ref(1);
const pageSize = ref(12);
const totalItems = ref(0);
const totalPages = computed(() => Math.ceil(totalItems.value / pageSize.value));

const appointments = ref<any[]>([]);
const loading = ref(false);
const dateFilter = ref('upcoming');
const searchQuery = ref('');
const statusFilter = ref('all');
const processingAppointments = ref(new Set<string>());

const dateTabs = [
  { label: 'À venir', value: 'upcoming' },
  { label: 'Passés', value: 'past' },
];

const statusFilterOptions = [
  { label: 'Tous les statuts', value: 'all' },
  { label: 'En attente', value: 'pending' },
  { label: 'Confirmé', value: 'confirmed' },
  { label: 'En cours', value: 'inProgress' },
  { label: 'Terminé', value: 'completed' },
  { label: 'Annulé', value: 'canceled' },
  { label: 'Refusé', value: 'refused' },
];

/** Liste brute après fetch + filtre date uniquement (sans tri ni filtre statut/recherche). */
const baseAppointments = ref<any[]>([]);

/** Liste filtrée par statut et recherche, triée du plus récent au plus ancien (created_at puis scheduled_at). */
const filteredAndSorted = computed(() => {
  let list = [...baseAppointments.value];
  if (statusFilter.value && statusFilter.value !== 'all') {
    list = list.filter((a: any) => a.status === statusFilter.value);
  }
  const q = (searchQuery.value || '').trim().toLowerCase();
  if (q) {
    list = list.filter((a: any) => {
      const firstName = (a.form_data?.first_name || '').toLowerCase();
      const lastName = (a.form_data?.last_name || '').toLowerCase();
      const phone = (a.form_data?.phone || '').replace(/\s/g, '');
      const address = typeof a.address === 'string' ? a.address.toLowerCase() : (a.address?.label || '').toLowerCase();
      const searchPhone = q.replace(/\s/g, '');
      return (
        firstName.includes(q) ||
        lastName.includes(q) ||
        `${firstName} ${lastName}`.trim().includes(q) ||
        `${lastName} ${firstName}`.trim().includes(q) ||
        phone.includes(searchPhone) ||
        address.includes(q)
      );
    });
  }
  list.sort((a: any, b: any) => {
    const dateA = new Date(a.created_at || a.scheduled_at || 0).getTime();
    const dateB = new Date(b.created_at || b.scheduled_at || 0).getTime();
    return dateB - dateA;
  });
  return list;
});

const startIndex = computed(() => {
  if (totalItems.value === 0) return 0;
  return (currentPage.value - 1) * pageSize.value + 1;
});

const endIndex = computed(() => {
  if (totalItems.value === 0) return 0;
  const end = currentPage.value * pageSize.value;
  return Math.min(end, totalItems.value);
});

const emptyStateTitle = computed(() => {
  if (baseAppointments.value.length > 0 && filteredAndSorted.value.length === 0) {
    return 'Aucun résultat';
  }
  const filterLabel = dateTabs.find((o) => o.value === dateFilter.value)?.label || '';
  return `Aucun rendez-vous ${filterLabel.toLowerCase()}`;
});

const emptyStateDescription = computed(() => {
  if (baseAppointments.value.length > 0 && filteredAndSorted.value.length === 0) {
    return 'Aucun rendez-vous ne correspond à la recherche ou au filtre de statut. Modifiez vos critères.';
  }
  switch (dateFilter.value) {
    case 'upcoming':
      return "Aucun rendez-vous à venir. Ils apparaîtront ici une fois créés ou acceptés.";
    case 'past':
      return "Aucun rendez-vous dans l'historique.";
    default:
      return 'Aucun rendez-vous trouvé.';
  }
});

function getStatusColor(status: string): 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral' {
  const colors: Record<string, 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral'> = {
    pending: 'warning',
    confirmed: 'info',
    inProgress: 'primary',
    completed: 'success',
    canceled: 'error',
    refused: 'error',
  };
  return colors[status] || 'neutral';
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: 'En attente',
    confirmed: 'Confirmé',
    inProgress: 'En cours',
    completed: 'Terminé',
    canceled: 'Annulé',
    refused: 'Refusé',
  };
  return labels[status] || status;
}

function formatDateTime(date: string) {
  if (!date) return '-';
  try {
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return date;
  }
}

function getDurationLabel(v: string) {
  const labels: Record<string, string> = {
    '1': '1 jour',
    '7': '7 jours',
    '10': '10 jours',
    '15': '15 jours (ou jusqu\'à la cicatrisation)',
    '30': '30 jours',
    '60+': 'Longue durée (60 jours ou +)',
  };
  return labels[v] || v;
}

function getBloodTestTypeLabel(fd: any): string {
  if (!fd?.blood_test_type) return '';
  if (fd.blood_test_type === 'single') return 'Une seule prise de sang';
  if (fd.blood_test_type === 'multiple') {
    const days = fd.duration_days === 'custom' && fd.custom_days ? `${fd.custom_days} jours` : getDurationLabel(fd.duration_days || '');
    return days ? `Série sur ${days}` : 'Plusieurs prélèvements';
  }
  return '';
}

function getFrequencyLabel(v: string) {
  const labels: Record<string, string> = {
    daily: 'Chaque jour',
    every_other_day: '1 jour sur 2',
    twice_weekly: '2 fois par semaine',
    thrice_weekly: '3 fois par semaine',
  };
  return labels[v] || v;
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatAvailability(availability: string | object | null | undefined): string {
  if (availability == null) return '';
  try {
    let avail: any = availability;
    if (typeof availability === 'string') {
      const trimmed = availability.trim();
      if (!trimmed) return '';
      avail = JSON.parse(trimmed);
    }
    if (!avail || typeof avail !== 'object') return '';
    if (avail.type === 'all_day') {
      return 'Toute la journée';
    }
    if (avail.type === 'custom' && Array.isArray(avail.range) && avail.range.length >= 2) {
      const start = Math.floor(Number(avail.range[0]));
      const end = Math.floor(Number(avail.range[1]));
      if (Number.isNaN(start) || Number.isNaN(end)) return '';
      return `${start}h00 - ${end}h00`;
    }
  } catch {
    // ignore
  }
  return '';
}

function getCreneauHoraireLabel(appointment: any): string {
  const availability = appointment.form_data?.availability;
  const formatted = formatAvailability(availability);
  if (formatted) return formatted;
  if (appointment.scheduled_at) {
    try {
      const d = new Date(appointment.scheduled_at);
      return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      // ignore
    }
  }
  return 'Non précisé';
}

const fetchAppointments = async () => {
  loading.value = true;
  try {
    const params: Record<string, string> = {
      limit: '1000',
    };
    if (props.statusFilterApi) {
      params.status = props.statusFilterApi;
    }
    const queryString = new URLSearchParams(params).toString();
    const response = await apiFetch(`/appointments?${queryString}`, { method: 'GET' });

    if (response.success && response.data) {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      const filtered = response.data.filter((appointment: any) => {
        if (!appointment.scheduled_at) return false;
        if (props.statusFilterApi && appointment.status === 'pending') return false;
        const appointmentDate = new Date(appointment.scheduled_at);
        if (props.useDateFilter) {
          if (dateFilter.value === 'upcoming') return appointmentDate > todayEnd;
          if (dateFilter.value === 'past') return appointmentDate < todayStart;
        }
        return true;
      });

      baseAppointments.value = filtered;
      applyPagination();
    } else {
      toast.add({
        title: 'Erreur',
        description: response.error || 'Erreur lors du chargement des rendez-vous',
        color: 'red',
      });
      appointments.value = [];
      baseAppointments.value = [];
      totalItems.value = 0;
    }
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error.message || 'Une erreur est survenue',
      color: 'red',
    });
    appointments.value = [];
    baseAppointments.value = [];
    totalItems.value = 0;
  } finally {
    loading.value = false;
  }
};

function applyPagination() {
  const list = filteredAndSorted.value;
  totalItems.value = list.length;
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  appointments.value = list.slice(start, end);
}

function handlePageChange(page: number) {
  currentPage.value = page;
  applyPagination();
  if (typeof window !== 'undefined') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function canStart(appointment: any) {
  const now = new Date();
  const scheduled = new Date(appointment.scheduled_at);
  const diffMinutes = (scheduled.getTime() - now.getTime()) / (1000 * 60);
  return diffMinutes <= 30 && appointment.status === 'confirmed';
}

function isProcessing(id: string) {
  return processingAppointments.value.has(id);
}

defineExpose({
  fetchAppointments,
  processingAppointments,
  canStart,
  isProcessing,
  loading,
});

watch(dateFilter, () => {
  currentPage.value = 1;
  fetchAppointments();
});

watch([searchQuery, statusFilter], () => {
  currentPage.value = 1;
  applyPagination();
});

watch(currentPage, () => {
  if (filteredAndSorted.value.length > 0) {
    applyPagination();
  }
});

onMounted(() => {
  fetchAppointments();
});

onActivated(() => {
  fetchAppointments();
});
</script>

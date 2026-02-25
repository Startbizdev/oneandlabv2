<template>
  <div class="space-y-6 lg:space-y-8">
    <div v-if="!hideHeader" class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-[28px] font-bold text-gray-900 dark:text-white tracking-tight">
          {{ title }}
        </h1>
        <p v-if="subtitle" class="text-[15px] text-gray-500 dark:text-gray-400 mt-1">
          {{ subtitle }}
        </p>
      </div>

      <div v-if="$slots.headerActions" class="flex items-center gap-2">
        <slot name="headerActions" />
      </div>

      <div v-else class="flex items-center">
        <div class="inline-flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 shadow-inner">
          <button
            v-for="tab in dateTabs"
            :key="tab.value"
            @click="dateFilter = tab.value"
            class="px-4 py-1.5 text-[14px] font-medium rounded-lg transition-all duration-200"
            :class="
              dateFilter === tab.value
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            "
          >
            {{ tab.label }}
          </button>
        </div>
      </div>
    </div>

    <div class="flex flex-col sm:flex-row gap-3 sm:items-center flex-wrap">
      <UInput
        v-model="searchQuery"
        placeholder="Rechercher (patient, téléphone, adresse...)"
        icon="i-lucide-search"
        size="lg"
        class="flex-1 min-w-0 max-w-md"
        :ui="{ rounded: 'rounded-xl', icon: { color: 'text-gray-400' } }"
        clearable
      />
      <USelect
        v-model="statusFilter"
        :items="statusFilterOptions"
        value-key="value"
        placeholder="Tous les statuts"
        size="lg"
        class="w-full sm:w-48"
        :ui="{ rounded: 'rounded-xl' }"
      />
      <DateRangePicker
        :start="dateRangeStart"
        :end="dateRangeEnd"
        placeholder="Plage de dates"
        @update:start="dateRangeStart = $event"
        @update:end="dateRangeEnd = $event"
      />
      <UButton
        v-if="dateRangeStart || dateRangeEnd"
        variant="ghost"
        color="gray"
        size="sm"
        icon="i-lucide-x"
        class="shrink-0 rounded-full"
        @click="dateRangeStart = null; dateRangeEnd = null"
      >
        Effacer la plage
      </UButton>
    </div>

    <div v-if="loading" class="flex flex-col items-center justify-center py-20">
      <UIcon
        name="i-lucide-loader-2"
        class="w-10 h-10 animate-spin text-primary-500 mb-4"
      />
      <p class="text-[15px] text-gray-500 dark:text-gray-400 font-medium">
        Chargement de vos rendez-vous...
      </p>
    </div>

    <UEmpty
      v-else-if="!loading && appointments.length === 0"
      icon="i-lucide-calendar-x"
      :title="emptyStateTitle"
      :description="emptyStateDescription"
      class="py-12"
    />

    <div v-else class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6 items-stretch">
        <div
          v-for="appointment in appointments"
          :key="appointment.id"
          class="bg-white dark:bg-gray-900 rounded-[24px] shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-800 transition-all duration-200 flex flex-col h-full overflow-hidden relative"
        >
          <div class="p-5 flex-1 flex flex-col">
            
            <div class="flex items-start justify-between mb-5 gap-3">
              <div class="flex items-center gap-3.5 min-w-0">
                <div 
                  class="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                  :class="appointment.type === 'blood_test' ? 'bg-red-50 dark:bg-red-500/10 text-red-500' : 'bg-blue-50 dark:bg-blue-500/10 text-blue-500'"
                >
                  <UIcon :name="appointment.type === 'blood_test' ? 'i-lucide-droplet' : 'i-lucide-stethoscope'" class="w-6 h-6" />
                </div>
                <div class="min-w-0">
                  <h3 class="text-[17px] font-bold text-gray-900 dark:text-white truncate">
                    {{ appointment.form_data?.first_name }} {{ appointment.form_data?.last_name }}
                  </h3>
                  <p v-if="appointment.form_data?.phone" class="text-[14px] text-gray-500 dark:text-gray-400 truncate mt-0.5 flex items-center gap-1">
                    <UIcon name="i-lucide-phone" class="w-3.5 h-3.5" />
                    {{ appointment.form_data?.phone }}
                  </p>
                </div>
              </div>
              <UBadge
                :color="getStatusColor(appointment.status)"
                variant="subtle"
                size="xs"
                class="rounded-full px-2.5 py-1 font-medium whitespace-nowrap"
                :label="getStatusLabel(appointment.status)"
              />
            </div>

            <div class="bg-gray-50/80 dark:bg-gray-800/40 rounded-2xl p-4 space-y-3.5 flex-1">
              
              <div class="flex items-start gap-3">
                <UIcon :name="appointment.type === 'blood_test' ? 'i-lucide-droplet' : 'i-lucide-stethoscope'" class="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div class="flex-1 min-w-0">
                  <p class="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Intervention</p>
                  <p class="text-[14px] font-medium text-gray-900 dark:text-white">
                    {{ appointment.type === 'blood_test' ? 'Prise de sang' : 'Soins infirmiers' }}
                    <span v-if="appointment.category_name" class="text-gray-500 font-normal"> • {{ appointment.category_name }}</span>
                  </p>
                </div>
              </div>

              <div v-if="appointment.type === 'blood_test' && getBloodTestTypeLabel(appointment.form_data)" class="flex items-start gap-3">
                <UIcon name="i-lucide-pipette" class="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div class="flex-1 min-w-0">
                  <p class="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Prélèvement</p>
                  <p class="text-[14px] font-medium text-gray-900 dark:text-white">{{ getBloodTestTypeLabel(appointment.form_data) }}</p>
                </div>
              </div>

              <div class="flex items-start gap-3">
                <UIcon name="i-lucide-calendar-clock" class="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div class="flex-1 min-w-0">
                  <p class="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Date & Heure</p>
                  <p class="text-[14px] font-medium text-gray-900 dark:text-white capitalize">
                    {{ formatDateTime(appointment.scheduled_at) }}
                  </p>
                  <p class="text-[13px] text-gray-500 mt-0.5">{{ getCreneauHoraireLabel(appointment) }}</p>
                </div>
              </div>

              <div v-if="appointment.form_data?.duration_days || appointment.form_data?.frequency" class="flex items-start gap-3">
                <UIcon name="i-lucide-repeat" class="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div class="flex-1 min-w-0">
                  <p class="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Récurrence</p>
                  <p v-if="appointment.form_data?.duration_days" class="text-[14px] font-medium text-gray-900 dark:text-white">
                    {{ getDurationLabel(appointment.form_data.duration_days) }}
                  </p>
                  <p v-if="appointment.form_data?.frequency" class="text-[13px] text-gray-500 mt-0.5">
                    {{ getFrequencyLabel(appointment.form_data.frequency) }}
                  </p>
                </div>
              </div>

              <div v-if="appointment.type === 'blood_test' && (appointment.assigned_lab_display_name || appointment.assigned_to_display_name)" class="flex items-start gap-3">
                <UIcon name="i-lucide-user-check" class="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div class="flex-1 min-w-0">
                  <p class="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Assigné à</p>
                  <p class="text-[14px] font-medium text-gray-900 dark:text-white">
                    <template v-if="appointment.assigned_lab_display_name">
                      {{ appointment.assigned_lab_role === 'subaccount' ? 'Sous-compte' : 'Labo' }} {{ appointment.assigned_lab_display_name }}
                    </template>
                    <template v-if="appointment.assigned_lab_display_name && appointment.assigned_to_display_name"> · </template>
                    <template v-if="appointment.assigned_to_display_name">Préleveur {{ appointment.assigned_to_display_name }}</template>
                  </p>
                </div>
              </div>

              <div v-if="appointment.address" class="flex items-start gap-3">
                <UIcon name="i-lucide-map-pin" class="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div class="flex-1 min-w-0">
                  <p class="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Adresse</p>
                  <p class="text-[14px] font-medium text-gray-900 dark:text-white leading-snug">
                    {{ typeof appointment.address === 'object' && appointment.address?.label ? appointment.address.label : appointment.address }}
                  </p>
                </div>
              </div>

              <div v-if="appointment.status === 'inProgress' && appointment.started_at" class="flex items-start gap-3 mt-2">
                <UIcon name="i-lucide-play-circle" class="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" />
                <div class="flex-1 min-w-0">
                  <p class="text-[13px] font-medium text-primary-600 dark:text-primary-400">
                    Démarré à {{ formatTime(appointment.started_at) }}
                  </p>
                </div>
              </div>
            </div>

            <div v-if="appointment.notes" class="mt-4 p-3.5 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800/50">
              <div class="flex items-start gap-2.5">
                <UIcon name="i-lucide-alert-circle" class="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div class="flex-1 min-w-0">
                  <p class="text-[11px] font-bold text-amber-600/80 dark:text-amber-400/80 uppercase tracking-wider mb-1">Notes</p>
                  <p class="text-[13px] text-amber-800 dark:text-amber-300 leading-relaxed line-clamp-3">
                    {{ appointment.notes }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div class="px-5 pb-5 pt-0 mt-auto">
            <slot name="cardActions" :appointment="appointment" :base-path="basePath">
              <UButton
                variant="solid"
                color="gray"
                size="md"
                class="w-full justify-center rounded-full font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                leading-icon="i-lucide-chevron-right"
                trailing
                :to="`${basePath}/appointments/${appointment.id}`"
              >
                Voir les détails
              </UButton>
            </slot>
          </div>
        </div>
      </div>

      <div
        v-if="totalPages > 1"
        class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 mt-4 border-t border-gray-100 dark:border-gray-800"
      >
        <p class="text-[14px] text-gray-500 dark:text-gray-400">
          Affichage de <span class="font-semibold text-gray-900 dark:text-white">{{ startIndex }}-{{ endIndex }}</span> 
          sur <span class="font-semibold text-gray-900 dark:text-white">{{ totalItems }}</span>
        </p>
        <UPagination
          v-model="currentPage"
          :total="totalItems"
          :page-size="pageSize"
          :max="7"
          :ui="{ wrapper: 'gap-1', rounded: 'rounded-lg' }"
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
    /** Filtre optionnel : n'afficher que les RDV assignés à ce préleveur (lab). */
    assignedToPreleveurId?: string
    /** Filtre optionnel : n'afficher que les RDV assignés à ce sous-compte / lab (assigned_lab_id). */
    assignedToLabId?: string
    /** Filtre optionnel (admin) : n'afficher que les RDV de cet utilisateur (user_id). */
    userIdFilter?: string
  }>(),
  {
    title: 'Mes rendez-vous',
    subtitle: 'Gérez vos rendez-vous',
    hideHeader: false,
    useDateFilter: true,
    statusFilterApi: '',
    assignedToPreleveurId: '',
    assignedToLabId: '',
    userIdFilter: '',
  }
);

const toast = useAppToast();

const currentPage = ref(1);
const pageSize = ref(12);
const totalItems = ref(0);
const totalPages = computed(() => Math.ceil(totalItems.value / pageSize.value));

const appointments = ref<any[]>([]);
const loading = ref(false);
const dateFilter = ref('upcoming');
const searchQuery = ref('');
const statusFilter = ref('all');
const dateRangeStart = ref<string | null>(null);
const dateRangeEnd = ref<string | null>(null);
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

/** Liste filtrée par statut et recherche (et préleveur si lab), triée du plus récent au plus ancien (created_at puis scheduled_at). */
const filteredAndSorted = computed(() => {
  let list = [...baseAppointments.value];
  if (props.assignedToPreleveurId) {
    list = list.filter((a: any) => a.assigned_to === props.assignedToPreleveurId);
  }
  if (props.assignedToLabId) {
    list = list.filter((a: any) => a.assigned_lab_id === props.assignedToLabId);
  }
  if (statusFilter.value && statusFilter.value !== 'all') {
    list = list.filter((a: any) => a.status === statusFilter.value);
  }
  if (dateRangeStart.value) {
    const startDay = new Date(dateRangeStart.value);
    startDay.setHours(0, 0, 0, 0);
    const startTs = startDay.getTime();
    list = list.filter((a: any) => {
      const at = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0;
      return at >= startTs;
    });
  }
  if (dateRangeEnd.value) {
    const endDay = new Date(dateRangeEnd.value);
    endDay.setHours(23, 59, 59, 999);
    const endTs = endDay.getTime();
    list = list.filter((a: any) => {
      const at = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0;
      return at <= endTs;
    });
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
    cancelled: 'error',
    refused: 'error',
    expired: 'neutral',
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
    cancelled: 'Annulé',
    refused: 'Refusé',
    expired: 'Expiré',
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
    if (props.userIdFilter) {
      params.user_id = props.userIdFilter;
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

watch(() => props.userIdFilter, () => {
  currentPage.value = 1;
  fetchAppointments();
});

watch([searchQuery, statusFilter, dateRangeStart, dateRangeEnd], () => {
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
<template>
  <div class="space-y-4 sm:space-y-6">
    <!-- Barre d’outils : titre = header du layout (breadcrumb), ici uniquement actions + filtres -->
    <div class="flex flex-col gap-3 sm:gap-4">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div class="flex flex-wrap items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <UInput
            v-if="showSearch"
            v-model="searchQuery"
            placeholder="Rechercher (patient, adresse...)"
            icon="i-lucide-search"
            size="sm"
            class="w-full sm:max-w-[200px] md:max-w-[240px]"
          />
          <USelect
            v-model="statusFilter"
            :items="statusOptions"
            value-key="value"
            placeholder="Statut"
            size="sm"
            class="w-full sm:w-auto sm:min-w-[120px]"
          />
          <USelect
            v-if="showTypeFilter"
            v-model="typeFilter"
            :items="typeOptions"
            value-key="value"
            placeholder="Type"
            size="sm"
            class="w-full sm:w-auto sm:min-w-[140px]"
          />
          <div class="flex items-center gap-2 text-xs sm:text-sm text-muted shrink-0 order-last sm:order-none">
            <span class="font-medium text-foreground">{{ filteredAppointments.length }}</span> RDV
            <span class="hidden sm:inline text-muted">·</span>
            <span class="capitalize truncate">{{ todayLabel }}</span>
          </div>
        </div>
        <div v-if="!hideHeaderActions" class="flex items-center gap-2 shrink-0">
          <UButton
            variant="outline"
            color="neutral"
            size="sm"
            icon="i-lucide-refresh-cw"
            :loading="loading"
            class="flex-1 sm:flex-none"
            @click="refresh"
          >
            <span class="hidden sm:inline">Actualiser</span>
            <span class="sm:hidden">Rafraîchir</span>
          </UButton>
          <UButton
            v-if="showNewAppointmentButton"
            color="primary"
            size="sm"
            icon="i-lucide-plus"
            :to="`${basePath}/appointments/new`"
            class="flex-1 sm:flex-none"
          >
            Nouveau RDV
          </UButton>
        </div>
      </div>
    </div>

    <!-- Loading skeleton : jusqu’au premier chargement pour éviter flash ancien → nouveau -->
    <div v-if="loading || !calendarReady" class="space-y-3 sm:space-y-4 animate-pulse">
      <div class="flex justify-between gap-2">
        <div class="h-8 sm:h-9 w-32 sm:w-48 rounded-lg bg-muted shrink-0" />
        <div class="h-8 sm:h-9 flex-1 max-w-[12rem] rounded-lg bg-muted" />
      </div>
      <div class="rounded-xl border border-default/50 overflow-hidden min-w-0">
        <div class="grid grid-cols-7 bg-muted/30">
          <div v-for="i in 7" :key="i" class="h-8 sm:h-10 md:h-12" />
        </div>
        <div class="grid grid-cols-7">
          <div
            v-for="i in 42"
            :key="i"
            class="min-h-[72px] sm:min-h-[96px] md:min-h-[110px] p-1 sm:p-2 border border-default/30"
          />
        </div>
      </div>
    </div>

    <!-- Calendrier + panneau jour -->
    <div v-else class="flex flex-col xl:flex-row gap-4 sm:gap-6 min-w-0">
      <Transition
        enter-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div class="flex-1 min-w-0 w-full overflow-hidden">
          <Calendar
            :items="filteredAppointments"
            item-date-key="scheduled_at"
            item-status-key="status"
            :selected-day="selectedDay"
            :disable-add="!showNewAppointmentButton"
            @item-click="viewAppointment"
            @day-click="onDayClick"
            @add-event="onAddEvent"
            @item-drop="onItemDrop"
          >
            <template #item="{ item }">
              <span class="block truncate">{{ getPatientLabel(item) }}</span>
            </template>
          </Calendar>
        </div>
      </Transition>

      <!-- Panneau RDV du jour sélectionné -->
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 translate-x-4"
        enter-to-class="opacity-100 translate-x-0"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100 translate-x-0"
        leave-to-class="opacity-0 translate-x-4"
      >
        <aside
          v-if="selectedDay"
          class="w-full xl:w-80 xl:max-w-[20rem] shrink-0 min-w-0"
          aria-label="Rendez-vous du jour sélectionné"
        >
          <div class="sticky top-4 rounded-xl border border-default bg-default p-3 sm:p-4 shadow-sm">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-normal text-default">
                {{ selectedDayLabel }}
              </h3>
              <UButton
                variant="ghost"
                size="xs"
                icon="i-lucide-x"
                aria-label="Fermer"
                @click="selectedDay = null"
              />
            </div>
            <div v-if="selectedDayAppointments.length === 0" class="py-8 text-center text-muted text-sm">
              <UIcon name="i-lucide-calendar-off" class="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>Aucun rendez-vous ce jour-là</p>
            </div>
            <ul v-else class="space-y-2">
              <li
                v-for="apt in selectedDayAppointments"
                :key="apt.id"
                class="group"
              >
                <button
                  type="button"
                  class="w-full text-left p-3 rounded-lg border border-default hover:border-primary/30 hover:bg-muted/20 transition-colors"
                  @click.stop="viewAppointment(apt)"
                >
                  <div class="flex items-start justify-between gap-2 flex-wrap">
                    <span class="font-medium text-foreground tabular-nums">
                      {{ getCreneauLabel(apt) }}
                    </span>
                    <UBadge
                      :color="getStatusBadgeColor(apt.status)"
                      size="sm"
                      variant="soft"
                    >
                      {{ getStatusLabel(apt.status) }}
                    </UBadge>
                  </div>
                  <p class="font-medium text-foreground mt-1 truncate">
                    {{ getPatientLabel(apt) }}
                  </p>
                  <p class="text-sm text-muted mt-0.5">
                    {{ apt.type === 'blood_test' ? 'Prise de sang' : 'Soins infirmiers' }}
                  </p>
                  <p v-if="displayAddress(apt)" class="text-xs text-muted mt-1 truncate" :title="displayAddress(apt)">
                    {{ displayAddress(apt) }}
                  </p>
                  <span class="inline-flex items-center gap-1 mt-2 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    Voir le détail
                    <UIcon name="i-lucide-arrow-right" class="w-3 h-3" />
                  </span>
                </button>
              </li>
            </ul>
          </div>
        </aside>
      </Transition>
    </div>

    <UEmpty
      v-if="calendarReady && !loading && filteredAppointments.length === 0"
      icon="i-lucide-calendar-x"
      title="Aucun rendez-vous"
      :description="emptyDescription"
      :actions="emptyActions"
      class="mt-8"
    />
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    basePath: string
    title?: string
    description?: string
    showSearch?: boolean
    showTypeFilter?: boolean
    /** Masquer les boutons Actualiser / Nouveau RDV (à utiliser quand la page utilise TitleDashboard #actions) */
    hideHeaderActions?: boolean
    /** Afficher le bouton Nouveau RDV (masquer pour préleveur : ne crée pas de RDV) */
    showNewAppointmentButton?: boolean
  }>(),
  {
    title: 'Calendrier',
    showSearch: false,
    showTypeFilter: false,
    hideHeaderActions: false,
    showNewAppointmentButton: true,
  }
);

const { appointments, loading, fetchAppointments } = useAppointments();
const searchQuery = ref('');
const statusFilter = ref('all');
const typeFilter = ref('all');
const selectedDay = ref<Date | null>(null);
/** N’afficher le calendrier qu’après le premier fetch pour éviter ancien → nouveau au refresh */
const calendarReady = ref(false);

const statusOptions = [
  { label: 'Tous', value: 'all' },
  { label: 'En attente', value: 'pending' },
  { label: 'Confirmé', value: 'confirmed' },
  { label: 'En cours', value: 'inProgress' },
  { label: 'Terminé', value: 'completed' },
  { label: 'Annulé', value: 'canceled' },
  { label: 'Expiré', value: 'expired' },
  { label: 'Refusé', value: 'refused' },
];

const typeOptions = [
  { label: 'Tous les types', value: 'all' },
  { label: 'Prise de sang', value: 'blood_test' },
  { label: 'Soins infirmiers', value: 'nursing' },
];

const filteredAppointments = computed(() => {
  let filtered = appointments.value;
  if (statusFilter.value !== 'all') {
    filtered = filtered.filter((a) => a.status === statusFilter.value);
  }
  if (props.showTypeFilter && typeFilter.value !== 'all') {
    filtered = filtered.filter((a) => a.type === typeFilter.value);
  }
  if (props.showSearch && searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter((a) =>
      a.address?.toLowerCase().includes(query) ||
      a.patient_name?.toLowerCase().includes(query) ||
      a.id?.toLowerCase().includes(query)
    );
  }
  return filtered;
});

const todayLabel = computed(() => {
  return new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
});

const monthCount = computed(() => {
  const now = new Date();
  return filteredAppointments.value.filter((a) => {
    const d = new Date(a.scheduled_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
});

const selectedDayLabel = computed(() => {
  if (!selectedDay.value) return '';
  return selectedDay.value.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
});

const selectedDayAppointments = computed(() => {
  if (!selectedDay.value) return [];
  const d = selectedDay.value;
  return filteredAppointments.value
    .filter((a) => {
      const ad = new Date(a.scheduled_at);
      return (
        ad.getDate() === d.getDate() &&
        ad.getMonth() === d.getMonth() &&
        ad.getFullYear() === d.getFullYear()
      );
    })
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
});

const emptyDescription = computed(() => {
  const hasFilters = statusFilter.value !== 'all' || (props.showTypeFilter && typeFilter.value !== 'all') || (props.showSearch && searchQuery.value);
  return hasFilters
    ? 'Aucun rendez-vous pour ces filtres.'
    : 'Aucun rendez-vous pour le moment. Ils apparaîtront ici une fois créés.';
});

const emptyActions = computed(() => {
  const hasFilters = statusFilter.value !== 'all' || (props.showTypeFilter && typeFilter.value !== 'all') || (props.showSearch && searchQuery.value);
  if (!hasFilters) return [];
  return [
    {
      label: 'Réinitialiser les filtres',
      variant: 'outline',
      onClick: () => {
        statusFilter.value = 'all';
        typeFilter.value = 'all';
        searchQuery.value = '';
      },
    },
  ];
});

const refresh = () => fetchAppointments();
const onDayClick = (day: { fullDate: Date | null }) => {
  selectedDay.value = day.fullDate ?? null;
};

const toast = useAppToast();

const onAddEvent = (date?: Date) => {
  const query: Record<string, string> = {};
  if (date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    query.date = `${y}-${m}-${d}`;
  }
  navigateTo({ path: `${props.basePath}/appointments/new`, query });
};

const onItemDrop = (item: any, newDate: Date) => {
  // Ici vous connecteriez l'API de mise à jour
  toast.add({
    title: 'Planification mise à jour',
    description: `Rendez-vous déplacé au ${newDate.toLocaleDateString('fr-FR')}`,
    color: 'primary',
    icon: 'i-lucide-calendar-check'
  });
  // Exemple: await updateAppointment(item.id, { scheduled_at: newDate.toISOString() });
  // refresh();
};

watch(loading, (now, prev) => {
  if (prev === true && now === false) calendarReady.value = true;
});

onMounted(() => {
  fetchAppointments();
});

defineExpose({
  fetchAppointments,
  loading,
});

const viewAppointment = (appointment: any) => {
  navigateTo(`${props.basePath}/appointments/${appointment.id}`);
};

// Nom du patient (form_data ou patient_name)
function getPatientLabel(apt: any): string {
  if (apt.patient_name) return apt.patient_name;
  const fn = apt.form_data?.first_name ?? '';
  const ln = apt.form_data?.last_name ?? '';
  const name = [fn, ln].filter(Boolean).join(' ').trim();
  return name || 'Patient';
}

// Créneau : TLJ, Xh - Yh, ou HH:MM (aligné AppointmentListPage)
function getCreneauLabel(apt: any): string {
  const availability = apt.form_data?.availability;
  if (availability != null) {
    try {
      let avail: any = availability;
      if (typeof availability === 'string') {
        const trimmed = availability.trim();
        if (trimmed) {
          avail = JSON.parse(trimmed);
          if (avail?.type === 'all_day') return 'TLJ';
        }
      } else if (typeof avail === 'object' && avail.type === 'all_day') {
        return 'TLJ';
      }
      if (avail?.type === 'custom' && Array.isArray(avail.range) && avail.range.length >= 2) {
        const start = Math.floor(Number(avail.range[0]));
        const end = Math.floor(Number(avail.range[1]));
        if (!Number.isNaN(start) && !Number.isNaN(end)) return `${start}h - ${end}h`;
      }
    } catch {
      /* ignore */
    }
  }
  if (apt.form_data?.availability_type === 'all_day') return 'TLJ';
  const d = apt.scheduled_at ? new Date(apt.scheduled_at) : null;
  return d && !Number.isNaN(d.getTime())
    ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : '–';
}

const displayAddress = (apt: any) => {
  const a = apt.address ?? apt.form_data?.address;
  if (!a) return null;
  return typeof a === 'string' ? a : (a.label ?? a.address ?? null);
};

const statusBadgeClass = (status: string) => {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
    confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
    inProgress: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200',
    completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
    canceled: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
    expired: 'bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-400',
    refused: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
  };
  return map[status] ?? 'bg-muted text-muted';
};

const statusDotClass = (status: string) => {
  const map: Record<string, string> = {
    pending: 'bg-amber-500',
    confirmed: 'bg-blue-500',
    inProgress: 'bg-violet-500',
    completed: 'bg-emerald-500',
    canceled: 'bg-red-500',
    expired: 'bg-slate-500',
    refused: 'bg-red-600',
  };
  return map[status] ?? 'bg-muted';
};

// Couleurs UBadge Nuxt UI (aligné Calendar.vue) pour que les badges soient bien visibles
const getStatusBadgeColor = (status: string): 'warning' | 'info' | 'primary' | 'success' | 'error' | 'neutral' => {
  const map: Record<string, 'warning' | 'info' | 'primary' | 'success' | 'error' | 'neutral'> = {
    pending: 'warning',
    confirmed: 'info',
    inProgress: 'primary',
    completed: 'success',
    canceled: 'error',
    expired: 'neutral',
    refused: 'error',
  };
  return map[status] ?? 'neutral';
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: 'En attente',
    confirmed: 'Confirmé',
    inProgress: 'En cours',
    completed: 'Terminé',
    canceled: 'Annulé',
    expired: 'Expiré',
    refused: 'Refusé',
  };
  return labels[status] ?? status;
};
</script>

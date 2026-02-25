<template>
  <div class="min-h-screen bg-gray-50/50 dark:bg-gray-950/50">
    <div class="max-w-2xl mx-auto px-4 py-6 sm:px-6 sm:py-8 md:py-10">
      <!-- En-tête -->
      <header class="mb-6 sm:mb-8">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div class="min-w-0">
            <h1 class="text-lg font-semibold text-gray-900 dark:text-white sm:text-xl">
              Mes rendez-vous
            </h1>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Consultez vos rendez-vous ou prenez rendez-vous
            </p>
          </div>
          <NuxtLink
            to="/rendez-vous/nouveau"
            class="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:bg-primary-500 dark:hover:bg-primary-600 dark:focus:ring-primary-400 dark:focus:ring-offset-gray-900 transition-colors shrink-0"
          >
            <UIcon name="i-lucide-plus" class="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Nouveau rendez-vous</span>
          </NuxtLink>
        </div>
      </header>

      <!-- Chargement -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-20 sm:py-24">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-gray-400 mb-4" aria-hidden="true" />
        <p class="text-sm text-gray-500 dark:text-gray-400">Chargement de vos rendez-vous...</p>
      </div>

      <!-- Erreur -->
      <div
        v-else-if="error"
        class="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-4 py-4 sm:px-5"
      >
        <p class="text-sm font-medium text-red-800 dark:text-red-200">{{ error }}</p>
      </div>

      <!-- Liste vide -->
      <section
        v-else-if="appointments.length === 0"
        class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-6 text-center sm:p-8"
      >
        <div
          class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800"
          aria-hidden="true"
        >
          <UIcon name="i-lucide-calendar-x" class="w-7 h-7 text-gray-400 dark:text-gray-500" />
        </div>
        <h2 class="text-base font-semibold text-gray-900 dark:text-white sm:text-lg">
          Aucun rendez-vous
        </h2>
        <p class="mt-2 max-w-sm mx-auto text-sm leading-relaxed text-gray-500 dark:text-gray-400">
          Vous n'avez pas encore de rendez-vous. Cliquez ci-dessous pour en créer un.
        </p>
        <NuxtLink
          to="/rendez-vous/nouveau"
          class="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:bg-primary-500 dark:hover:bg-primary-600 transition-colors"
        >
          <UIcon name="i-lucide-plus" class="w-4 h-4 shrink-0" />
          <span>Créer un rendez-vous</span>
        </NuxtLink>
      </section>

      <!-- Liste des rendez-vous -->
      <template v-else>
        <ul class="space-y-3 sm:space-y-4" role="list">
          <li
            v-for="appointment in appointments"
            :key="appointment.id"
            class="group rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 shadow-sm overflow-hidden hover:border-gray-300 hover:shadow dark:hover:border-gray-700 dark:shadow-none transition-all duration-150"
          >
            <NuxtLink
              :to="`/patient/appointments/${appointment.id}`"
              class="block p-4 sm:p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 rounded-xl"
            >
              <div class="flex gap-4">
                <!-- Contenu principal -->
                <div class="flex-1 min-w-0">
                  <!-- Ligne 0 : patient / proche (prénom + nom avec majuscules) -->
                  <p v-if="patientLabel(appointment)" class="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Pour : {{ patientLabel(appointment) }}
                  </p>
                  <!-- Ligne 1 : date (jour avec majuscule) + statut -->
                  <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <time
                      :datetime="appointment.scheduled_at"
                      class="text-sm font-medium text-gray-900 dark:text-white"
                    >
                      {{ formatDateShort(appointment.scheduled_at) }}
                    </time>
                    <span
                      class="inline-flex rounded-md px-2 py-0.5 text-xs font-medium"
                      :class="statusBadgeClass(appointment.status)"
                    >
                      {{ getStatusLabel(appointment.status) }}
                    </span>
                  </div>
                  <!-- Type + Type de soin (texte, pas badge) -->
                  <p class="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-sm text-gray-600 dark:text-gray-400">
                    <span><span class="font-medium text-gray-500 dark:text-gray-500">Type :</span> {{ appointment.type === 'blood_test' ? 'Prise de sang' : 'Soins infirmiers' }}</span>
                    <span v-if="typeDeSoinLabel(appointment)">
                      <span class="font-medium text-gray-500 dark:text-gray-500">Type de soin :</span> {{ typeDeSoinLabel(appointment) }}
                    </span>
                  </p>
                  <!-- Ligne 2 : adresse -->
                  <p class="mt-2 flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <UIcon name="i-lucide-map-pin" class="w-4 h-4 shrink-0 mt-0.5 text-gray-400 dark:text-gray-500" aria-hidden="true" />
                    <span class="line-clamp-2">{{ displayAddress(appointment) }}</span>
                  </p>
                  <!-- Ligne 3 : laboratoire et/ou préleveur (chaque détail compte) -->
                  <div v-if="careTeamLines(appointment).length" class="mt-2 flex flex-col gap-0.5 sm:gap-1">
                    <template v-for="(line, idx) in careTeamLines(appointment)" :key="idx">
                      <p class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <UIcon :name="line.icon" class="w-3.5 h-3.5 shrink-0 text-gray-400 dark:text-gray-500" aria-hidden="true" />
                        <span>{{ line.label }} {{ line.name }}</span>
                      </p>
                    </template>
                  </div>
                </div>
                <!-- Chevron -->
                <div class="flex shrink-0 items-center text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" aria-hidden="true">
                  <UIcon name="i-lucide-chevron-right" class="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
              </div>
            </NuxtLink>
          </li>
        </ul>

        <!-- Pagination -->
        <div
          v-if="pagination && pagination.pages > 1"
          class="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-200 dark:border-gray-800 pt-6"
        >
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Affichage de <span class="font-medium text-gray-900 dark:text-white">{{ startIndex }}-{{ endIndex }}</span>
            sur <span class="font-medium text-gray-900 dark:text-white">{{ pagination.total }}</span>
          </p>
          <UPagination
            v-model="currentPage"
            :total="pagination.total"
            :page-size="pageSize"
            :max="5"
            :ui="{ wrapper: 'gap-1', rounded: 'rounded-lg' }"
            @update:model-value="goToPage"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'patient',
  middleware: ['auth', 'role'],
  role: 'patient',
});

const route = useRoute();
const { appointments, loading, error, pagination, fetchAppointments } = useAppointments();

const pageSize = 10;
const currentPage = ref(1);

const startIndex = computed(() => {
  if (!pagination.value) return 0;
  return (pagination.value.page - 1) * pagination.value.limit + 1;
});
const endIndex = computed(() => {
  if (!pagination.value) return 0;
  return Math.min(pagination.value.page * pagination.value.limit, pagination.value.total);
});

function goToPage(page: number) {
  currentPage.value = page;
  fetchAppointments({ page: currentPage.value, limit: pageSize });
}

/** Type de soin (catégorie) pour affichage dans la liste */
function typeDeSoinLabel(apt: any): string {
  const name = apt?.category_name || apt?.form_data?.category_name;
  return name ? String(name).trim() : '';
}

/** Majuscule en début de chaque mot (ex: "jean-paul" → "Jean-Paul") */
function capitalizeWords(str: string): string {
  if (!str) return '';
  return str
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/** Pour l’affichage : jour avec majuscule (ex: "Lun. 24 févr. 2026") */
function formatDateShort(dateString: string) {
  if (!dateString) return '—';
  const formatted = new Date(dateString).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return capitalizeFirst(formatted);
}

function capitalizeFirst(str: string): string {
  if (!str || str.length === 0) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Libellé "Prénom Nom" du patient ou du proche concerné par le RDV (majuscules) */
function patientLabel(apt: any): string {
  const fromForm =
    apt?.form_data?.first_name != null || apt?.form_data?.last_name != null
      ? [apt.form_data.first_name, apt.form_data.last_name].filter(Boolean).map((s: string) => String(s).trim()).join(' ')
      : '';
  if (fromForm) return capitalizeWords(fromForm);
  const rel = apt?.relative;
  if (rel?.first_name != null || rel?.last_name != null) {
    const parts = [rel.first_name, rel.last_name].filter(Boolean).map((s: string) => String(s).trim());
    return capitalizeWords(parts.join(' '));
  }
  return '';
}

function displayAddress(apt: any) {
  const a = apt?.address;
  if (!a) return '—';
  if (typeof a === 'object' && a?.label) return a.label;
  return String(a);
}

/** Retourne les lignes "Qui s'occupe" : labo + préleveur (les deux si présents), ou infirmier */
function careTeamLines(apt: any): { icon: string; label: string; name: string }[] {
  const lines: { icon: string; label: string; name: string }[] = [];
  if (apt?.type === 'blood_test') {
    if (apt?.assigned_lab_display_name) {
      lines.push({
        icon: 'i-lucide-building-2',
        label: 'Laboratoire :',
        name: capitalizeWords(String(apt.assigned_lab_display_name).trim()),
      });
    }
    if (apt?.assigned_to_display_name) {
      lines.push({
        icon: 'i-lucide-user',
        label: 'Préleveur :',
        name: capitalizeWords(String(apt.assigned_to_display_name).trim()),
      });
    }
  }
  if (apt?.type === 'nursing' && (apt?.assigned_nurse?.first_name || apt?.assigned_nurse?.last_name)) {
    const n = apt.assigned_nurse;
    const name = [n.first_name, n.last_name].filter(Boolean).map((s: string) => String(s).trim()).join(' ');
    lines.push({
      icon: 'i-lucide-stethoscope',
      label: 'Infirmier :',
      name: capitalizeWords(name) || '—',
    });
  }
  return lines;
}

function statusBadgeClass(status: string) {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
    confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
    in_progress: 'bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-200',
    inProgress: 'bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-200',
    completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
    cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    canceled: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    expired: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    refused: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
  };
  return map[status] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
}

function getStatusLabel(status: string | undefined | null) {
  const labels: Record<string, string> = {
    pending: 'En attente',
    confirmed: 'Confirmé',
    in_progress: 'En cours',
    inProgress: 'En cours',
    completed: 'Terminé',
    cancelled: 'Annulé',
    canceled: 'Annulé',
    expired: 'Expiré',
    refused: 'Refusé',
  };
  return labels[status ?? ''] ?? status ?? '—';
}

onMounted(() => {
  fetchAppointments({ page: currentPage.value, limit: pageSize });
});

onActivated(() => {
  fetchAppointments({ page: currentPage.value, limit: pageSize });
});

watch(() => route.path, (newPath) => {
  if (newPath === '/patient') fetchAppointments({ page: currentPage.value, limit: pageSize });
});
</script>

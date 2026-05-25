<template>
  <div class="min-h-screen bg-app-canvas pb-8 dark:bg-gray-950">
    <div class="mx-auto max-w-6xl px-0 py-4 sm:px-6 sm:py-8 lg:px-8">
      <!-- En-tête : sans carte -->
      <div
        role="banner"
        class="mb-6 min-w-0 rounded-none border-0 bg-transparent p-0 shadow-none ring-0 sm:mb-8"
      >
        <div class="flex w-full min-w-0 flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
          <div class="min-w-0 sm:flex-1 sm:pr-2">
            <h1 class="text-xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-2xl">
              Bienvenue<template v-if="showPersonalizedPatientWelcome">{{ patientWelcomeName }}</template>&nbsp;👋
            </h1>
            <p class="mt-1.5 max-w-lg text-sm leading-relaxed text-gray-500 dark:text-gray-400 sm:mt-2">
              Vos rendez-vous et vos prochaines étapes, réunis ici.
            </p>
            <!-- Illustration : mobile uniquement, sous le sous-titre -->
            <div class="mt-4 block sm:hidden">
              <img
                src="/images/espacepatientimage.png"
                alt=""
                class="w-full rounded-2xl object-cover shadow-sm ring-1 ring-gray-200/70 dark:ring-gray-800/80"
                width="1672"
                height="941"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
          <NuxtLink
            v-if="listReady && !error"
            to="/rendez-vous/nouveau"
            class="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:bg-primary-500 dark:hover:bg-primary-600 dark:focus:ring-offset-gray-900 sm:w-auto sm:self-start sm:whitespace-nowrap sm:py-2"
          >
            <UIcon name="i-lucide-calendar-plus" class="h-4 w-4 shrink-0" aria-hidden="true" />
            <span class="text-center sm:text-left">Nouveau rendez-vous</span>
          </NuxtLink>
        </div>
      </div>

      <!-- Filtres : sans encadré -->
      <div
        v-if="listReady && !error"
        class="mb-7"
      >
        <div class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-7">
          <div
            class="flex w-full shrink-0 gap-8 sm:w-auto"
            role="tablist"
            aria-label="Filtrer les rendez-vous"
          >
            <button
              type="button"
              role="tab"
              :aria-selected="listTab === 'upcoming'"
              class="inline-flex items-center gap-1.5 border-b-[3px] pb-1 text-left text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950"
              :class="
                listTab === 'upcoming'
                  ? 'border-b-primary-600 text-gray-950 dark:border-b-primary-500 dark:text-white'
                  : 'border-b-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              "
              @click="listTab = 'upcoming'"
            >
              <UIcon name="i-lucide-calendar-clock" class="h-3.5 w-3.5 shrink-0 opacity-80 sm:h-4 sm:w-4" aria-hidden="true" />
              Prochains rendez-vous
            </button>
            <button
              type="button"
              role="tab"
              :aria-selected="listTab === 'past'"
              class="inline-flex items-center gap-1.5 border-b-[3px] pb-1 text-left text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950"
              :class="
                listTab === 'past'
                  ? 'border-b-primary-600 text-gray-950 dark:border-b-primary-500 dark:text-white'
                  : 'border-b-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              "
              @click="listTab = 'past'"
            >
              <UIcon name="i-lucide-history" class="h-3.5 w-3.5 shrink-0 opacity-80 sm:h-4 sm:w-4" aria-hidden="true" />
              Rendez-vous passés
            </button>
          </div>
          <div class="hidden min-w-0 w-full md:block md:max-w-sm">
            <PatientRdvListSearchField />
          </div>
        </div>
      </div>

      <!-- Chargement -->
      <div v-if="loading" class="rounded-3xl border border-gray-200 bg-white px-6 py-16 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900/70 sm:py-20">
        <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 dark:bg-primary-950/40 dark:text-primary-300">
          <UIcon name="i-lucide-loader-2" class="h-7 w-7 animate-spin" aria-hidden="true" />
        </div>
        <p class="text-sm font-medium text-gray-900 dark:text-white">Chargement de vos rendez-vous...</p>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Nous préparons votre planning patient.</p>
      </div>

      <!-- Erreur -->
      <div
        v-else-if="error"
        class="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 shadow-sm dark:border-red-900/50 dark:bg-red-950/30"
      >
        <div class="flex items-start gap-3">
          <UIcon name="i-lucide-triangle-alert" class="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-300" />
          <div>
            <p class="text-sm font-semibold text-red-900 dark:text-red-100">Impossible de charger vos rendez-vous</p>
            <p class="mt-1 text-sm text-red-800 dark:text-red-200">{{ error }}</p>
            <UButton
              class="mt-3"
              color="neutral"
              variant="soft"
              size="sm"
              icon="i-lucide-refresh-cw"
              @click="refreshPatientAppointments()"
            >
              Réessayer
            </UButton>
          </div>
        </div>
      </div>

      <!-- Liste vide (onglet ou recherche) -->
      <section
        v-else-if="displayRows.length === 0"
        class="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900/70 sm:p-10"
      >
        <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500">
          <UIcon name="i-lucide-search-x" class="h-7 w-7" aria-hidden="true" />
        </div>
        <h2 class="text-lg font-semibold text-gray-950 dark:text-white">
          {{ listTab === 'upcoming' ? 'Aucun rendez-vous à venir' : 'Aucun rendez-vous passé' }}
        </h2>
        <p class="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-500 dark:text-gray-400">
          <template v-if="searchQuery.trim()">
            Aucun résultat pour « {{ searchQuery.trim() }} ». Essayez d’autres mots ou effacez la recherche.
          </template>
          <template v-else-if="listTab === 'upcoming'">
            Vous n’avez pas de rendez-vous à venir. L’historique se trouve sous « Rendez-vous passés », ou réservez un nouveau rendez-vous.
          </template>
          <template v-else>
            Aucun rendez-vous dans l’historique pour l’instant.
          </template>
        </p>
        <NuxtLink
          v-if="!searchQuery.trim() && listTab === 'upcoming'"
          to="/rendez-vous/nouveau"
          class="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:bg-primary-500 dark:hover:bg-primary-600 dark:focus:ring-offset-gray-900 transition-colors"
        >
          <UIcon name="i-lucide-plus" class="h-4 w-4 shrink-0" />
          <span>Créer un rendez-vous</span>
        </NuxtLink>
        <UButton
          v-if="searchQuery.trim()"
          class="mt-5"
          color="neutral"
          variant="soft"
          icon="i-lucide-x"
          @click="searchQuery = ''"
        >
          Effacer la recherche
        </UButton>
      </section>

      <!-- Liste des rendez-vous : cartes alignées `AppointmentListCard` / `DashboardCardShell` (dashboard pro) -->
      <template v-else>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list">
          <div
            v-for="row in displayRows"
            :key="row.kind === 'batch' ? row.key : row.appointment.id"
            role="listitem"
            class="min-h-0 h-full"
          >
            <DashboardCardShell class="h-full">
              <NuxtLink
                :to="rowHref(row)"
                class="flex h-full min-h-0 flex-col gap-2 px-4 py-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset sm:gap-2.5 sm:px-5 sm:py-3"
              >
                <template v-if="row.kind === 'batch' && isBloodTestOnlyBatchRow(row)">
                  <PatientRdvListRow
                    variant="full"
                    :appointment="mergeBloodBatchAppointmentsForListDisplay(sortedPatientBatchRow(row))"
                    :categories="careCategoriesList"
                  />
                </template>
                <template v-else-if="row.kind === 'batch' && isNursingOnlyBatchRow(row)">
                  <PatientRdvListRow
                    variant="full"
                    :appointment="mergeNursingBatchAppointmentsForListDisplay(sortedPatientBatchRow(row))"
                    :categories="careCategoriesList"
                  />
                </template>
                <template v-else-if="row.kind === 'batch'">
                  <div class="space-y-2">
                    <PatientRdvListRow
                      v-for="apt in sortedPatientBatchRow(row)"
                      :key="apt.id"
                      variant="batch"
                      :appointment="apt"
                      :categories="careCategoriesList"
                      :blood-test-batch-peer-total="patientBloodBatchPeerTotal(row)"
                      :blood-test-batch-peer-index="patientBloodBatchPeerIndex(row, apt)"
                      :nursing-batch-peer-total="patientNursingBatchPeerTotal(row)"
                      :nursing-batch-peer-index="patientNursingBatchPeerIndex(row, apt)"
                    />
                  </div>
                </template>
                <PatientRdvListRow v-else variant="full" :appointment="row.appointment" :categories="careCategoriesList" />
              </NuxtLink>
            </DashboardCardShell>
          </div>
        </div>

        <div v-if="hasMore" class="mt-6 flex flex-col items-center gap-2">
          <UButton
            color="neutral"
            variant="outline"
            size="md"
            :loading="loadingMore"
            :disabled="loadingMore || loading"
            icon="i-lucide-chevron-down"
            @click="loadMore"
          >
            Voir plus
          </UButton>
          <p v-if="loadingMore" class="text-xs text-gray-500 dark:text-gray-400">
            Chargement…
          </p>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { apiFetch } from '~/utils/api';
import type { CareCategoryRowMinimal } from '~/utils/care-icons';
import {
  groupAppointmentsByBatch,
  isBloodTestOnlyBatchRow,
  isNursingOnlyBatchRow,
  mergeBloodBatchAppointmentsForListDisplay,
  mergeNursingBatchAppointmentsForListDisplay,
  type AppointmentListRow,
} from '~/utils/appointment-batch';
import {
  MULTI_BLOOD_TEST_ITEMS_CARD_LABEL,
  MULTI_NURSING_ITEMS_CARD_LABEL,
  isBloodTestAppointment,
  isNursingAppointment,
} from '~/utils/appointment-type-rules';
import {
  patientRdvAddressLine,
  patientRdvFormatDateShort as formatDateShort,
  patientRdvGetStatusLabel as getStatusLabel,
  patientRdvPatientHeadline,
  patientRdvTypeDeSoinLabel as typeDeSoinLabel,
} from '~/utils/patient-rdv-list-display';

definePageMeta({
  layout: 'patient',
  middleware: ['auth', 'role'],
  role: 'patient',
});

const route = useRoute();
const { user } = useAuth();
const {
  appointments,
  loading,
  loadingMore,
  error,
  hasMore,
  listReady,
  listTab,
  refresh: refreshPatientAppointments,
  loadMore,
} = usePatientAppointmentsList();

/** Évite mismatch SSR/client : le prénom n’est disponible qu’après hydration auth côté client. */
const showPersonalizedPatientWelcome = ref(false);

/** Aligné sur `/rendez-vous/nouveau` : icônes + pastilles HSL par catégorie */
const careCategoriesList = ref<CareCategoryRowMinimal[]>([]);

async function loadPatientCareCategories() {
  try {
    const response = await apiFetch('/categories', { method: 'GET' });
    if (response?.success && Array.isArray(response.data) && response.data.length > 0) {
      careCategoriesList.value = response.data as CareCategoryRowMinimal[];
    }
  } catch {
    /* ignore */
  }
}

const patientWelcomeName = computed(() => {
  const raw = user.value?.first_name;
  if (raw == null || String(raw).trim() === '') return '';
  return `, ${capitalizeWords(String(raw).trim())}`;
});

const { searchQuery, filtersSectionActive } = usePatientRdvListSearch();

watch(
  [loading, error, listReady],
  () => {
    filtersSectionActive.value = listReady.value && !error.value;
  },
  { immediate: true },
);

function appointmentSearchHaystack(apt: any): string {
  const parts: string[] = [];
  parts.push(patientLabel(apt));
  parts.push(displayAddress(apt));
  const batchBloodPeers = bloodTestBatchPeerCountInCurrentTab(apt);
  const batchNursingPeers = nursingBatchPeerCountInCurrentTab(apt);
  parts.push(
    typeDeSoinLabel(apt, {
      bloodTestBatchPeerTotal: batchBloodPeers > 1 ? batchBloodPeers : undefined,
      bloodTestBatchPeerIndex: 0,
      nursingBatchPeerTotal: batchNursingPeers > 1 ? batchNursingPeers : undefined,
      nursingBatchPeerIndex: 0,
    }),
  );
  if (batchBloodPeers > 1) {
    parts.push(MULTI_BLOOD_TEST_ITEMS_CARD_LABEL);
  }
  if (batchNursingPeers > 1) {
    parts.push(MULTI_NURSING_ITEMS_CARD_LABEL);
  }
  parts.push(apt?.type === 'blood_test' ? 'prélèvement' : 'soins infirmiers');
  parts.push(getStatusLabel(apt?.status));
  parts.push(formatDateShort(apt?.scheduled_at || ''));
  careTeamLines(apt).forEach((l) => {
    parts.push(l.label, l.name);
  });
  return stripDiacritics(parts.filter(Boolean).join(' ').toLowerCase());
}

function bloodTestBatchPeerCountInCurrentTab(apt: any): number {
  if (!apt?.creation_batch_id || !isBloodTestAppointment(apt.type)) return 0;
  const bid = String(apt.creation_batch_id);
  return (appointments.value || []).filter(
    (x) => String(x.creation_batch_id) === bid && isBloodTestAppointment(x.type),
  ).length;
}

function nursingBatchPeerCountInCurrentTab(apt: any): number {
  if (!apt?.creation_batch_id || !isNursingAppointment(apt.type)) return 0;
  const bid = String(apt.creation_batch_id);
  return (appointments.value || []).filter(
    (x) => String(x.creation_batch_id) === bid && isNursingAppointment(x.type),
  ).length;
}

function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const filteredAppointments = computed(() => {
  const list = appointments.value || [];
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return list;
  const qn = stripDiacritics(q);
  return list.filter((apt: any) => appointmentSearchHaystack(apt).includes(qn));
});

/** Lots multi-soins : une carte par lot (comme liste infirmier) */
const displayRows = computed(() => groupAppointmentsByBatch(filteredAppointments.value));

/** Même ordre que `AppointmentListCard` (date croissante). */
function sortedPatientBatchRow(row: { kind: string; appointments: any[] }) {
  return [...row.appointments].sort(
    (a, b) =>
      new Date(a.scheduled_at || a.created_at || 0).getTime() -
      new Date(b.scheduled_at || b.created_at || 0).getTime(),
  );
}

/** Lot patient : plusieurs RDV « prise de sang » même réservation (`creation_batch_id`). */
function patientBloodBatchPeerTotal(row: AppointmentListRow): number {
  if (row.kind !== 'batch') return 0;
  if (!row.appointments?.length) return 0;
  const allBlood = row.appointments.every((a) => isBloodTestAppointment(a?.type));
  return allBlood ? row.appointments.length : 0;
}

function patientBloodBatchPeerIndex(row: AppointmentListRow, apt: any): number {
  if (row.kind !== 'batch') return 0;
  const i = sortedPatientBatchRow(row).findIndex((x) => String(x.id) === String(apt?.id));
  return Math.max(0, i);
}

function patientNursingBatchPeerTotal(row: AppointmentListRow): number {
  if (row.kind !== 'batch') return 0;
  if (!row.appointments?.length) return 0;
  const allNursing = row.appointments.every((a) => isNursingAppointment(a?.type));
  return allNursing ? row.appointments.length : 0;
}

function patientNursingBatchPeerIndex(row: AppointmentListRow, apt: any): number {
  if (row.kind !== 'batch') return 0;
  const i = sortedPatientBatchRow(row).findIndex((x) => String(x.id) === String(apt?.id));
  return Math.max(0, i);
}

function rowPrimaryAppointment(row: any): any {
  return row?.kind === 'batch' ? row.appointments?.[0] : row?.appointment;
}

function rowHref(row: any): string {
  const apt = rowPrimaryAppointment(row);
  return `/patient/appointments/${apt?.id}`;
}

/** Majuscule en début de chaque mot (ex: "jean-paul" → "Jean-Paul") */
function capitalizeWords(str: string): string {
  if (!str) return '';
  return str
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/** Libellé patient / proche (recherche + cartes) */
function patientLabel(apt: any): string {
  return patientRdvPatientHeadline(apt);
}

function displayAddress(apt: any) {
  const line = patientRdvAddressLine(apt);
  return line ? line : '—';
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
  if (apt?.type === 'nursing' && (apt?.assigned_nurse_display_name || apt?.assigned_nurse?.first_name || apt?.assigned_nurse?.last_name)) {
    const n = apt.assigned_nurse || {};
    const name = apt.assigned_nurse_display_name || [n.first_name, n.last_name].filter(Boolean).map((s: string) => String(s).trim()).join(' ');
    lines.push({
      icon: 'i-lucide-stethoscope',
      label: 'Infirmier :',
      name: capitalizeWords(name) || '—',
    });
  }
  return lines;
}

onMounted(() => {
  showPersonalizedPatientWelcome.value = true;
  void refreshPatientAppointments();
  loadPatientCareCategories();
});

onActivated(() => {
  void refreshPatientAppointments({ silent: true });
});

watch(() => route.path, (newPath) => {
  if (newPath === '/patient') void refreshPatientAppointments({ silent: true });
});
</script>

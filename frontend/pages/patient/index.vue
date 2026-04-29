<template>
  <div class="min-h-screen bg-gray-50/70 pb-10 dark:bg-gray-950/60">
    <div class="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 md:py-10">
      <!-- En-tête SaaS -->
      <header class="mb-6 overflow-hidden rounded-3xl border border-primary-100/80 bg-white shadow-sm shadow-primary-950/5 dark:border-primary-900/40 dark:bg-gray-900/70 sm:mb-8">
        <div class="relative px-5 py-5 sm:px-6 sm:py-6">
          <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary-500 via-primary-400 to-primary-300" />
          <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div class="min-w-0">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-primary-600 dark:text-primary-300">
                Espace patient
              </p>
              <h1 class="mt-2 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
                Mes rendez-vous
              </h1>
              <p class="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                Retrouvez vos soins à venir, votre historique et les demandes groupées au même endroit.
              </p>
            </div>
            <NuxtLink
              to="/rendez-vous/nouveau"
              class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-primary-950/10 transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:bg-primary-500 dark:hover:bg-primary-600 dark:focus:ring-offset-gray-900 sm:w-auto"
            >
              <UIcon name="i-lucide-plus" class="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Nouveau rendez-vous</span>
            </NuxtLink>
          </div>
        </div>
      </header>

      <!-- Filtres : onglets + recherche -->
      <div
        v-if="!loading && !error && appointments.length > 0"
        class="mb-6 rounded-2xl border border-gray-200 bg-white/95 p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900/70 sm:p-4"
      >
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div
            class="inline-flex rounded-xl bg-gray-100 p-1 ring-1 ring-gray-200/80 dark:bg-gray-950/40 dark:ring-gray-800"
            role="tablist"
            aria-label="Filtrer les rendez-vous"
          >
            <button
              type="button"
              role="tab"
              :aria-selected="listTab === 'upcoming'"
              class="inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 sm:min-w-32"
              :class="
                listTab === 'upcoming'
                  ? 'bg-white text-primary-700 shadow-sm ring-1 ring-gray-200/80 dark:bg-gray-900 dark:text-primary-300 dark:ring-gray-700'
                  : 'text-gray-600 hover:text-gray-950 dark:text-gray-400 dark:hover:text-white'
              "
              @click="listTab = 'upcoming'"
            >
              <UIcon name="i-lucide-calendar-clock" class="h-4 w-4" />
              À venir
              <span class="rounded-full bg-primary-50 px-1.5 py-0.5 text-[11px] text-primary-700 dark:bg-primary-950/60 dark:text-primary-300">{{ upcomingAppointmentsCount }}</span>
            </button>
            <button
              type="button"
              role="tab"
              :aria-selected="listTab === 'past'"
              class="inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 sm:min-w-32"
              :class="
                listTab === 'past'
                  ? 'bg-white text-primary-700 shadow-sm ring-1 ring-gray-200/80 dark:bg-gray-900 dark:text-primary-300 dark:ring-gray-700'
                  : 'text-gray-600 hover:text-gray-950 dark:text-gray-400 dark:hover:text-white'
              "
              @click="listTab = 'past'"
            >
              <UIcon name="i-lucide-history" class="h-4 w-4" />
              Passés
              <span class="rounded-full bg-gray-50 px-1.5 py-0.5 text-[11px] text-gray-600 dark:bg-gray-800 dark:text-gray-300">{{ pastAppointmentsCount }}</span>
            </button>
          </div>
          <div class="relative min-w-0 flex-1 lg:max-w-md">
            <UInput
              v-model="searchQuery"
              placeholder="Rechercher date, adresse, statut, intervenant..."
              icon="i-lucide-search"
              size="lg"
              class="w-full"
              aria-label="Recherche dans la liste des rendez-vous"
            />
            <UButton
              v-if="searchQuery"
              type="button"
              color="neutral"
              variant="ghost"
              size="xs"
              icon="i-lucide-x"
              class="absolute right-1 top-1/2 -translate-y-1/2 rounded-md"
              aria-label="Effacer la recherche"
              @click="searchQuery = ''"
            />
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
          </div>
        </div>
      </div>

      <!-- Liste vide (aucun RDV du tout) -->
      <section
        v-else-if="appointments.length === 0"
        class="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900/70 sm:p-10"
      >
        <div
          class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 ring-1 ring-primary-100 dark:bg-primary-950/40 dark:text-primary-300 dark:ring-primary-900/60"
          aria-hidden="true"
        >
          <UIcon name="i-lucide-calendar-plus" class="h-8 w-8" />
        </div>
        <h2 class="text-lg font-semibold text-gray-950 dark:text-white sm:text-xl">
          Aucun rendez-vous
        </h2>
        <p class="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-500 dark:text-gray-400">
          Planifiez votre premier rendez-vous OneAndLab et suivez ensuite toutes les étapes depuis cet espace.
        </p>
        <NuxtLink
          to="/rendez-vous/nouveau"
          class="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:bg-primary-500 dark:hover:bg-primary-600 dark:focus:ring-offset-gray-900 transition-colors"
        >
          <UIcon name="i-lucide-plus" class="h-4 w-4 shrink-0" />
          <span>Créer un rendez-vous</span>
        </NuxtLink>
      </section>

      <!-- Liste filtrée vide -->
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
            Vous n’avez pas de rendez-vous à venir. Les rendez-vous terminés ou passés sont dans l’onglet « Passés ».
          </template>
          <template v-else>
            Aucun rendez-vous dans l’historique pour l’instant.
          </template>
        </p>
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

      <!-- Liste des rendez-vous -->
      <template v-else>
        <div class="grid grid-cols-1 gap-4 lg:grid-cols-2" role="list">
          <article
            v-for="row in displayRows"
            :key="row.kind === 'batch' ? row.key : row.appointment.id"
            class="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900/70 dark:hover:border-primary-900/60"
            role="listitem"
          >
            <NuxtLink
              :to="rowHref(row)"
              class="flex h-full flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
            >
              <template v-if="row.kind === 'batch'">
                <div class="border-b border-gray-100 bg-gradient-to-br from-primary-50/80 to-white p-4 dark:border-gray-800 dark:from-primary-950/25 dark:to-gray-900 sm:p-5">
                  <div class="flex items-start gap-3">
                    <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset" :class="typeIconRingClass(rowPrimaryAppointment(row))">
                      <UIcon :name="appointmentIcon(rowPrimaryAppointment(row))" class="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="rounded-full bg-primary-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary-800 dark:bg-primary-950/70 dark:text-primary-200">
                          Lot
                        </span>
                        <span class="rounded-full px-2 py-0.5 text-[11px] font-semibold" :class="statusBadgeClass(rowPrimaryAppointment(row)?.status)">
                          {{ rowStatusSummary(row) }}
                        </span>
                      </div>
                      <h2 class="mt-2 text-base font-semibold leading-tight text-gray-950 dark:text-white">
                        {{ batchTitle(row) }}
                      </h2>
                      <p v-if="patientLabel(rowPrimaryAppointment(row))" class="mt-1 truncate text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Pour : {{ patientLabel(rowPrimaryAppointment(row)) }}
                      </p>
                    </div>
                    <UIcon name="i-lucide-chevron-right" class="mt-1 h-5 w-5 shrink-0 text-gray-300 transition-colors group-hover:text-primary-500 dark:text-gray-600 dark:group-hover:text-primary-400" />
                  </div>
                  <p class="mt-4 flex items-start gap-2 text-sm leading-snug text-gray-600 dark:text-gray-300">
                    <UIcon name="i-lucide-map-pin" class="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                    <span class="line-clamp-2">{{ displayAddress(rowPrimaryAppointment(row)) }}</span>
                  </p>
                </div>
                <div class="space-y-3 p-4 sm:p-5">
                  <div
                    v-for="(apt, index) in row.appointments"
                    :key="apt.id"
                    class="relative rounded-xl border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-800/35"
                  >
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <p class="text-xs font-semibold text-gray-950 dark:text-white">
                          {{ index + 1 }}. {{ appointmentCardTitle(apt) }}
                        </p>
                        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {{ formatDateShort(apt.scheduled_at) }} · {{ getCreneauHoraireLabel(apt) }}
                        </p>
                      </div>
                      <span class="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold" :class="statusBadgeClass(apt.status)">
                        {{ getStatusLabel(apt.status) }}
                      </span>
                    </div>
                  </div>
                  <div v-if="rowCareTeamLines(row).length" class="flex flex-wrap gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                    <span
                      v-for="(line, idx) in rowCareTeamLines(row)"
                      :key="idx"
                      class="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs text-gray-600 ring-1 ring-gray-200 dark:bg-gray-900/80 dark:text-gray-300 dark:ring-gray-700"
                    >
                      <UIcon :name="line.icon" class="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden="true" />
                      <span class="truncate">{{ line.label }} {{ line.name }}</span>
                    </span>
                  </div>
                </div>
              </template>

              <template v-else>
                <div class="flex flex-1 flex-col p-4 sm:p-5">
                  <div class="flex items-start gap-3">
                    <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset" :class="typeIconRingClass(row.appointment)">
                      <UIcon :name="appointmentIcon(row.appointment)" class="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div class="min-w-0 flex-1">
                      <p v-if="patientLabel(row.appointment)" class="truncate text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Pour : {{ patientLabel(row.appointment) }}
                      </p>
                      <h2 class="mt-1 text-base font-semibold leading-tight text-gray-950 transition-colors group-hover:text-primary-600 dark:text-white dark:group-hover:text-primary-300">
                        {{ appointmentCardTitle(row.appointment) }}
                      </h2>
                      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {{ appointmentTypeLabel(row.appointment) }}
                      </p>
                    </div>
                    <span class="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold" :class="statusBadgeClass(row.appointment.status)">
                      {{ getStatusLabel(row.appointment.status) }}
                    </span>
                  </div>

                  <div class="mt-4 grid gap-2 rounded-2xl bg-gray-50/80 p-3 text-sm dark:bg-gray-800/40">
                    <p class="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                      <UIcon name="i-lucide-calendar-days" class="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                      <span class="font-medium">{{ formatDateShort(row.appointment.scheduled_at) }}</span>
                      <span class="text-gray-400">·</span>
                      <span class="text-gray-600 dark:text-gray-400">{{ getCreneauHoraireLabel(row.appointment) }}</span>
                    </p>
                    <p class="flex items-start gap-2 text-gray-600 dark:text-gray-300">
                      <UIcon name="i-lucide-map-pin" class="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                      <span class="line-clamp-2">{{ displayAddress(row.appointment) }}</span>
                    </p>
                  </div>

                  <div v-if="careTeamLines(row.appointment).length" class="mt-4 flex flex-wrap gap-2">
                    <span
                      v-for="(line, idx) in careTeamLines(row.appointment)"
                      :key="idx"
                      class="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-primary-50 px-2.5 py-1 text-xs text-primary-700 ring-1 ring-primary-100 dark:bg-primary-950/35 dark:text-primary-300 dark:ring-primary-900/60"
                    >
                      <UIcon :name="line.icon" class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span class="truncate">{{ line.label }} {{ line.name }}</span>
                    </span>
                  </div>

                  <div class="mt-auto flex items-center justify-between pt-5 text-sm font-semibold text-primary-600 dark:text-primary-400">
                    <span>Voir le détail</span>
                    <UIcon name="i-lucide-arrow-right" class="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </div>
                </div>
              </template>
            </NuxtLink>
          </article>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { groupAppointmentsByBatch } from '~/utils/appointment-batch';

definePageMeta({
  layout: 'patient',
  middleware: ['auth', 'role'],
  role: 'patient',
});

const route = useRoute();
const { appointments, loading, error, fetchAppointments } = useAppointments();

/** Charge assez de RDV pour filtrage + recherche côté client */
const PATIENT_LIST_LIMIT = 150;

const listTab = ref<'upcoming' | 'past'>('upcoming');
const searchQuery = ref('');

const TERMINAL_STATUSES = new Set(['completed', 'canceled', 'cancelled', 'refused', 'expired']);

function parisYmd(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
}

function appointmentParisYmd(iso: string | undefined | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
}

/** À venir : date (Paris) ≥ aujourd’hui et statut non terminal */
function isUpcomingAppointment(apt: any): boolean {
  const st = String(apt?.status ?? '');
  if (TERMINAL_STATUSES.has(st)) return false;
  const today = parisYmd(new Date());
  const day = appointmentParisYmd(apt?.scheduled_at);
  if (!day) return true;
  return day >= today;
}

const tabFilteredAppointments = computed(() => {
  const list = appointments.value || [];
  if (listTab.value === 'upcoming') return list.filter(isUpcomingAppointment);
  return list.filter((a: any) => !isUpcomingAppointment(a));
});

function appointmentSearchHaystack(apt: any): string {
  const parts: string[] = [];
  parts.push(patientLabel(apt));
  parts.push(displayAddress(apt));
  parts.push(typeDeSoinLabel(apt));
  parts.push(apt?.type === 'blood_test' ? 'prise de sang prélèvement' : 'soins infirmiers');
  parts.push(getStatusLabel(apt?.status));
  parts.push(formatDateShort(apt?.scheduled_at || ''));
  careTeamLines(apt).forEach((l) => {
    parts.push(l.label, l.name);
  });
  return stripDiacritics(parts.filter(Boolean).join(' ').toLowerCase());
}

function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const filteredAppointments = computed(() => {
  let list = tabFilteredAppointments.value;
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return list;
  const qn = stripDiacritics(q);
  return list.filter((apt: any) => appointmentSearchHaystack(apt).includes(qn));
});

/** Lots multi-soins : une carte par lot (comme liste infirmier) */
const displayRows = computed(() => groupAppointmentsByBatch(filteredAppointments.value));

const upcomingAppointmentsCount = computed(() => (appointments.value || []).filter(isUpcomingAppointment).length);
const pastAppointmentsCount = computed(() => (appointments.value || []).filter((a: any) => !isUpcomingAppointment(a)).length);

function appointmentTypeLabel(apt: any): string {
  return apt?.type === 'blood_test' ? 'Prise de sang' : 'Soins infirmiers';
}

function appointmentIcon(apt: any): string {
  return apt?.type === 'blood_test' ? 'i-lucide-droplet' : 'i-lucide-stethoscope';
}

function rowAppointments(row: any): any[] {
  return row?.kind === 'batch' ? row.appointments || [] : row?.appointment ? [row.appointment] : [];
}

function rowPrimaryAppointment(row: any): any {
  return row?.kind === 'batch' ? row.appointments?.[0] : row?.appointment;
}

function rowHref(row: any): string {
  const apt = rowPrimaryAppointment(row);
  return `/patient/appointments/${apt?.id}`;
}

function batchTitle(row: any): string {
  const count = rowAppointments(row).length;
  return `${count} ${count > 1 ? 'soins coordonnés' : 'soin coordonné'}`;
}

function appointmentCardTitle(apt: any): string {
  return typeDeSoinLabel(apt) || appointmentTypeLabel(apt);
}

function rowCareTeamLines(row: any): { icon: string; label: string; name: string }[] {
  const seen = new Set<string>();
  const lines: { icon: string; label: string; name: string }[] = [];
  for (const apt of rowAppointments(row)) {
    for (const line of careTeamLines(apt)) {
      const key = `${line.label}:${line.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      lines.push(line);
    }
  }
  return lines;
}

function rowStatusSummary(row: any): string {
  const statuses = rowAppointments(row).map((apt) => getStatusLabel(apt?.status)).filter(Boolean);
  const unique = [...new Set(statuses)];
  if (unique.length === 0) return 'Statut à confirmer';
  if (unique.length === 1) return unique[0];
  return `${unique.length} statuts`;
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

function typeIconRingClass(apt: any): string {
  if (apt?.type === 'blood_test') {
    return 'bg-red-50 text-red-600 ring-red-200/80 dark:bg-red-950/40 dark:text-red-400 dark:ring-red-900/50';
  }
  return 'bg-sky-50 text-sky-600 ring-sky-200/80 dark:bg-sky-950/40 dark:text-sky-400 dark:ring-sky-900/50';
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
    if (avail.type === 'all_day') return 'Toute la journée';
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

function statusBadgeClass(status: string) {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
    confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
    planned: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
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
    planned: 'Planifié',
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

function refreshPatientAppointments() {
  fetchAppointments({ page: 1, limit: PATIENT_LIST_LIMIT });
}

onMounted(() => {
  refreshPatientAppointments();
});

onActivated(() => {
  refreshPatientAppointments();
});

watch(() => route.path, (newPath) => {
  if (newPath === '/patient') refreshPatientAppointments();
});
</script>

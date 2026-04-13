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

      <!-- Filtres : onglets + recherche -->
      <div
        v-if="!loading && !error && appointments.length > 0"
        class="mb-5 space-y-3"
      >
        <div
          class="inline-flex w-full max-w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-100/80 dark:bg-gray-900/80 p-1"
          role="tablist"
          aria-label="Filtrer les rendez-vous"
        >
          <button
            type="button"
            role="tab"
            :aria-selected="listTab === 'upcoming'"
            class="flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            :class="
              listTab === 'upcoming'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            "
            @click="listTab = 'upcoming'"
          >
            À venir
          </button>
          <button
            type="button"
            role="tab"
            :aria-selected="listTab === 'past'"
            class="flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            :class="
              listTab === 'past'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            "
            @click="listTab = 'past'"
          >
            Passés
          </button>
        </div>
        <div class="relative">
          <UInput
            v-model="searchQuery"
            placeholder="Rechercher (date, adresse, type, statut, intervenant…)"
            icon="i-lucide-search"
            size="md"
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

      <!-- Liste vide (aucun RDV du tout) -->
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

      <!-- Liste filtrée vide -->
      <section
        v-else-if="displayRows.length === 0"
        class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-6 text-center sm:p-8"
      >
        <UIcon name="i-lucide-search-x" class="mx-auto mb-3 h-10 w-10 text-gray-400" aria-hidden="true" />
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">
          {{ listTab === 'upcoming' ? 'Aucun rendez-vous à venir' : 'Aucun rendez-vous passé' }}
        </h2>
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
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
      </section>

      <!-- Liste des rendez-vous (cartes compactes, alignées liste pro) -->
      <template v-else>
        <p
          v-if="searchQuery.trim()"
          class="mb-3 text-xs text-gray-500 dark:text-gray-400"
        >
          {{ filteredAppointments.length }} rendez-vous
          <span v-if="displayRows.length !== filteredAppointments.length" class="text-gray-400 dark:text-gray-500">
            ({{ displayRows.length }} {{ displayRows.length > 1 ? 'demandes' : 'demande' }})
          </span>
        </p>
        <div class="grid grid-cols-1 gap-3" role="list">
          <!-- Lot multi-soins : une carte, plusieurs lignes -->
          <article
            v-for="row in displayRows"
            :key="row.kind === 'batch' ? row.key : row.appointment.id"
            class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200/90 dark:border-gray-800 shadow-sm hover:shadow-md hover:border-primary-200/60 dark:hover:border-primary-900/40 transition-all duration-200 flex flex-col overflow-hidden"
            role="listitem"
          >
            <NuxtLink
              v-if="row.kind === 'batch'"
              :to="`/patient/appointments/${row.appointments[0].id}`"
              class="flex flex-col flex-1 min-h-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 rounded-xl"
            >
              <div class="p-3.5 sm:p-4 flex-1 flex flex-col min-w-0 gap-2">
                <div class="flex items-start gap-2.5 min-w-0">
                  <div
                    class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ring-1 ring-inset"
                    :class="typeIconRingClass(row.appointments[0])"
                  >
                    <UIcon
                      :name="row.appointments[0].type === 'blood_test' ? 'i-lucide-droplet' : 'i-lucide-stethoscope'"
                      class="w-5 h-5"
                    />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p v-if="patientLabel(row.appointments[0])" class="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 truncate">
                      Pour : {{ patientLabel(row.appointments[0]) }}
                    </p>
                    <h2 class="text-sm font-semibold text-gray-900 dark:text-white truncate leading-tight">
                      Plusieurs soins (même demande)
                    </h2>
                    <p class="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {{ row.appointments[0].type === 'blood_test' ? 'Prise de sang' : 'Soins infirmiers' }}
                    </p>
                  </div>
                </div>
                <p class="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 leading-snug flex items-start gap-1.5 min-w-0">
                  <UIcon name="i-lucide-map-pin" class="w-3.5 h-3.5 shrink-0 text-gray-400 mt-0.5" aria-hidden="true" />
                  <span>{{ displayAddress(row.appointments[0]) }}</span>
                </p>
                <div class="space-y-2.5 pt-1">
                  <div
                    v-for="apt in row.appointments"
                    :key="apt.id"
                    class="flex flex-col gap-0.5"
                  >
                    <div class="flex items-start justify-between gap-2">
                      <span class="text-xs font-medium text-gray-800 dark:text-gray-100">{{ typeDeSoinLabel(apt) || '—' }}</span>
                      <span
                        class="inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium shrink-0"
                        :class="statusBadgeClass(apt.status)"
                      >
                        {{ getStatusLabel(apt.status) }}
                      </span>
                    </div>
                    <div class="text-[11px] text-gray-600 dark:text-gray-400">
                      <span class="font-medium capitalize">{{ formatDateShort(apt.scheduled_at) }}</span>
                      <span class="text-gray-400 dark:text-gray-500"> · </span>
                      <span>{{ getCreneauHoraireLabel(apt) }}</span>
                    </div>
                  </div>
                </div>
                <div v-if="careTeamLines(row.appointments[0]).length" class="flex flex-col gap-0.5 pt-0.5 border-t border-gray-100 dark:border-gray-800/80">
                  <p
                    v-for="(line, idx) in careTeamLines(row.appointments[0])"
                    :key="idx"
                    class="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 truncate"
                  >
                    <UIcon :name="line.icon" class="w-3 h-3 shrink-0 opacity-80" aria-hidden="true" />
                    <span class="truncate">{{ line.label }} {{ line.name }}</span>
                  </p>
                </div>
              </div>
              <div class="px-3.5 sm:px-4 pb-3.5 pt-0 mt-auto border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between text-xs font-medium text-primary-600 dark:text-primary-400">
                <span>Détail</span>
                <UIcon name="i-lucide-chevron-right" class="w-4 h-4 text-gray-400" aria-hidden="true" />
              </div>
            </NuxtLink>

            <!-- RDV seul -->
            <NuxtLink
              v-else
              :to="`/patient/appointments/${row.appointment.id}`"
              class="flex flex-col flex-1 min-h-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 rounded-xl"
            >
              <div class="p-3.5 sm:p-4 flex-1 flex flex-col min-w-0 gap-2">
                <div class="flex items-start gap-2.5 min-w-0">
                  <div
                    class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ring-1 ring-inset"
                    :class="typeIconRingClass(row.appointment)"
                  >
                    <UIcon
                      :name="row.appointment.type === 'blood_test' ? 'i-lucide-droplet' : 'i-lucide-stethoscope'"
                      class="w-5 h-5"
                    />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p v-if="patientLabel(row.appointment)" class="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 truncate">
                      Pour : {{ patientLabel(row.appointment) }}
                    </p>
                    <h2 class="text-sm font-semibold text-gray-900 dark:text-white truncate leading-tight">
                      {{ typeDeSoinLabel(row.appointment) || (row.appointment.type === 'blood_test' ? 'Prise de sang' : 'Soins infirmiers') }}
                    </h2>
                    <p class="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {{ row.appointment.type === 'blood_test' ? 'Prise de sang' : 'Soins infirmiers' }}
                    </p>
                  </div>
                  <span
                    class="inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium shrink-0"
                    :class="statusBadgeClass(row.appointment.status)"
                  >
                    {{ getStatusLabel(row.appointment.status) }}
                  </span>
                </div>

                <p class="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 leading-snug flex items-start gap-1.5 min-w-0">
                  <UIcon name="i-lucide-map-pin" class="w-3.5 h-3.5 shrink-0 text-gray-400 mt-0.5" aria-hidden="true" />
                  <span>{{ displayAddress(row.appointment) }}</span>
                </p>

                <div class="text-xs text-gray-700 dark:text-gray-200 leading-snug">
                  <span class="font-medium capitalize">{{ formatDateShort(row.appointment.scheduled_at) }}</span>
                  <span class="text-gray-400 dark:text-gray-500"> · </span>
                  <span class="text-gray-600 dark:text-gray-400">{{ getCreneauHoraireLabel(row.appointment) }}</span>
                </div>

                <div v-if="careTeamLines(row.appointment).length" class="flex flex-col gap-0.5 pt-0.5 border-t border-gray-100 dark:border-gray-800/80">
                  <p
                    v-for="(line, idx) in careTeamLines(row.appointment)"
                    :key="idx"
                    class="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 truncate"
                  >
                    <UIcon :name="line.icon" class="w-3 h-3 shrink-0 opacity-80" aria-hidden="true" />
                    <span class="truncate">{{ line.label }} {{ line.name }}</span>
                  </p>
                </div>
              </div>
              <div class="px-3.5 sm:px-4 pb-3.5 pt-0 mt-auto border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between text-xs font-medium text-primary-600 dark:text-primary-400">
                <span>Détail</span>
                <UIcon name="i-lucide-chevron-right" class="w-4 h-4 text-gray-400" aria-hidden="true" />
              </div>
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

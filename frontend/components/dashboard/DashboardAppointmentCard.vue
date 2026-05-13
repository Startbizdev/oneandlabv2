<template>
  <div
    class="group flex h-full flex-col gap-0 overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all duration-200 hover:border-primary-500/30 hover:shadow-md dark:border-gray-800 dark:bg-gray-950"
    :class="{ 'cursor-pointer': !!onAction }"
    @click="onAction ? onAction(appointment) : undefined"
  >
    <div class="flex min-h-0 min-w-0 flex-1 flex-col px-4 py-2.5 sm:px-5 sm:py-3">
      <!-- Nom + statut -->
      <div class="mb-2 flex items-start justify-between gap-2 pr-1">
        <div class="flex min-w-0 items-center gap-2.5">
          <div
            class="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-gray-200/80 bg-white dark:border-gray-700 dark:bg-gray-950"
            :class="
              appointment.type === 'blood_test'
                ? 'text-red-600 dark:text-red-400'
                : 'text-sky-600 dark:text-sky-400'
            "
          >
            <CareCategoryVisual
              :image-src="headerCareBadge.imageSrc"
              :icon-name="headerCareBadge.iconName"
              icon-class="h-3.5 w-3.5 shrink-0"
              img-class="h-5 w-5 object-contain"
            />
          </div>
          <div class="min-w-0">
            <h3 class="truncate text-sm font-semibold leading-snug text-gray-900 dark:text-white">
              {{ displayPatientName(appointment) }}
            </h3>
            <p v-if="displayPhone(appointment)" class="mt-0.5 flex items-center gap-1 truncate text-[11px] text-gray-500 dark:text-gray-400">
              <UIcon name="i-lucide-phone" class="h-3 w-3 shrink-0 opacity-70" aria-hidden="true" />
              {{ displayPhone(appointment) }}
            </p>
          </div>
        </div>
        <div class="flex shrink-0 flex-wrap items-start justify-end gap-1.5">
          <PatientUrgencyBadge :appointment="appointment" />
          <UBadge
            :color="getStatusColor(appointment.status)"
            variant="subtle"
            size="sm"
            class="shrink-0 px-2 py-0.5 text-[11px] font-semibold leading-tight tracking-tight"
            :label="getStatusLabel(appointment.status)"
          />
        </div>
      </div>

      <!-- Date / créneau : bandeau pleine largeur -->
      <header class="-mx-4 border-b border-gray-200/90 px-4 pb-2 dark:border-gray-800 sm:-mx-5 sm:px-5">
        <p class="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px] leading-snug text-gray-900 dark:text-gray-100">
          <span class="inline-flex shrink-0 items-center gap-1 font-semibold tabular-nums leading-none">
            <UIcon
              name="i-solar:calendar-linear"
              class="h-[15px] w-[15px] shrink-0 text-gray-500 dark:text-gray-400"
              aria-hidden="true"
            />
            <span class="capitalize">{{ formatDateLabel(appointment) }}</span>
          </span>
          <span v-if="getCreneauHoraireLabel(appointment)" class="shrink-0 text-gray-300 dark:text-gray-600" aria-hidden="true">·</span>
          <span
            v-if="getCreneauHoraireLabel(appointment)"
            class="inline-flex min-w-0 items-center gap-1 font-medium tabular-nums leading-none text-gray-600 dark:text-gray-400"
          >
            <UIcon name="i-solar:clock-circle-linear" class="h-[15px] w-[15px] shrink-0 text-gray-500 dark:text-gray-400" aria-hidden="true" />
            <span class="min-w-0">{{ getCreneauHoraireLabel(appointment) }}</span>
          </span>
        </p>
      </header>

      <!-- Prestations (aligné liste patient : une ligne + vignette par analyse / soin) -->
      <ul class="min-w-0 space-y-px pb-1 pt-2" role="list">
        <li
          v-for="(line, idx) in catalogLines"
          :key="`${line.category_id ?? 'noid'}-${idx}-${line.label}`"
          class="flex min-w-0 items-center gap-2 py-0.5 first:pt-0 last:pb-0"
        >
          <div class="flex h-7 w-7 shrink-0 items-center justify-center self-center" aria-hidden="true">
            <CareCategoryVisual
              :image-src="catalogLineBadge(line).imageSrc"
              :icon-name="catalogLineBadge(line).iconName"
              img-class="h-6 w-6 rounded object-contain"
              icon-class="h-3.5 w-3.5 shrink-0 text-gray-600 dark:text-gray-400"
            />
          </div>
          <p class="min-w-0 flex-1 text-[13px] font-medium leading-snug text-gray-800 dark:text-gray-200 line-clamp-2">
            {{ line.label }}
          </p>
        </li>
      </ul>

      <div class="space-y-1.5 pb-1 text-xs">
        <div v-if="appointment.type === 'blood_test' && getBloodTestTypeLabel(appointment.form_data)" class="flex items-start gap-2">
          <UIcon name="i-lucide-pipette" class="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-500 dark:text-gray-400" aria-hidden="true" />
          <span class="leading-snug text-gray-700 dark:text-gray-300">{{ getBloodTestTypeLabel(appointment.form_data) }}</span>
        </div>
      </div>
    </div>

    <!-- Action -->
    <div class="flex justify-center border-t border-gray-100 px-4 py-2.5 dark:border-gray-800 sm:px-5">
      <slot name="action" :appointment="appointment" :base-path="basePath">
        <UButton
          v-if="onAction"
          color="primary"
          size="xs"
          icon="i-lucide-eye"
          @click.stop="onAction(appointment)"
        >
          Voir détails
        </UButton>
        <UButton
          v-else
          variant="outline"
          size="xs"
          icon="i-lucide-chevron-right"
          :to="`${basePath}/appointments/${appointment.id}`"
          trailing
        >
          Voir
        </UButton>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { formatBloodTestSeriesDurationDays } from '~/utils/duration-display';
import {
  buildCategoryAccentMapForList,
  careListBadgeForCatalogItem,
  resolveCareCategoryImageSrc,
  resolveCareIconFromCategory,
  type CareCategoryRowMinimal,
} from '~/utils/care-icons';
import { appointmentPatientDisplayName } from '~/utils/appointment-patient-display';
import { formatAvailabilityDisplayFr } from '~/utils/appointment-datetime-fr';
import {
  patientRdvCatalogDisplayLines,
  type PatientRdvCatalogLine,
} from '~/utils/patient-rdv-list-display';

const config = useRuntimeConfig();

const props = withDefaults(
  defineProps<{
    appointment: any;
    basePath: string;
    /** Si fourni, le clic sur la carte appelle cette fonction (ex: ouvrir modal pour RDV pending) */
    onAction?: (apt: any) => void;
    /** Formatter pour la date (ex: heure seule pour "aujourd'hui", date complète pour "en attente") */
    formatDateLabel: (apt: any) => string;
    /** Masquer les données sensibles (patient, tél, adresse) tant que RDV pending */
    maskSensitive?: boolean;
    /** Catalogue `/categories` — icônes / images officielles par id (optionnel). */
    categories?: CareCategoryRowMinimal[];
  }>(),
  { maskSensitive: false, categories: () => [] },
);

const categoryAccentMap = computed(() => buildCategoryAccentMapForList(props.categories ?? []));

const catalogLines = computed(() => patientRdvCatalogDisplayLines(props.appointment));

function catalogLineBadge(line: PatientRdvCatalogLine) {
  return careListBadgeForCatalogItem(
    props.appointment?.type,
    { category_id: line.category_id, category_image_url: line.category_image_url },
    props.categories ?? [],
    categoryAccentMap.value,
    config.public.apiBase,
  );
}

const headerCareBadge = computed(() => {
  const lines = catalogLines.value;
  if (lines.length > 0) return catalogLineBadge(lines[0]);
  const t = props.appointment?.type === 'blood_test' ? 'blood_test' : 'nursing';
  return {
    iconName: resolveCareIconFromCategory({ type: t, icon: props.appointment?.category_icon ?? null }),
    iconColor: '',
    tileBg: '',
    imageSrc: resolveCareCategoryImageSrc(props.appointment?.category_image_url ?? null, config.public.apiBase),
  };
});

function getStatusColor(status: string): 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral' {
  const colors: Record<string, 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral'> = {
    pending: 'warning',
    confirmed: 'info',
    planned: 'info',
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
    planned: 'Planifié',
    inProgress: 'En cours',
    completed: 'Terminé',
    canceled: 'Annulé',
    cancelled: 'Annulé',
    refused: 'Refusé',
    expired: 'Expiré',
  };
  return labels[status] || status;
}

function maskString(val: string, visibleStart = 1, visibleEnd = 0): string {
  if (!val || typeof val !== 'string') return '••••••';
  const s = val.trim();
  if (s.length <= visibleStart + visibleEnd) return '••••••';
  const start = s.slice(0, visibleStart);
  const end = visibleEnd > 0 ? s.slice(-visibleEnd) : '';
  const mid = '•'.repeat(Math.min(6, s.length - visibleStart - visibleEnd));
  return start + mid + end;
}

function maskPhone(phone: string): string {
  if (!phone || typeof phone !== 'string') return '••••••••••';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '••••••••••';
  return digits.slice(0, 2) + '••••••' + digits.slice(-2);
}

function displayPatientName(apt: any): string {
  if (!apt) return '—';
  const full = appointmentPatientDisplayName(apt);
  if (!full) return '—';
  if (props.maskSensitive) {
    const parts = full.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '••••••';
    if (parts.length === 1) return maskString(parts[0], 1, 0);
    return `${maskString(parts[0], 1, 0)} ${maskString(parts[parts.length - 1], 1, 0)}`.trim() || '••••••';
  }
  return full;
}

function displayPhone(apt: any): string {
  if (!apt?.form_data?.phone) return '';
  return props.maskSensitive ? maskPhone(apt.form_data.phone) : apt.form_data.phone;
}

function getDurationLabel(v: string, customDays?: number | null): string {
  if (v === 'custom' && customDays != null) return `${customDays} jours`;
  if (v === 'custom') return 'Durée personnalisée';
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
  if (fd.blood_test_type === 'single') return 'Une seule fois';
  if (fd.blood_test_type === 'multiple') {
    const days = formatBloodTestSeriesDurationDays(fd.duration_days, fd.custom_days);
    return days ? `Série sur ${days}` : 'Plusieurs prélèvements';
  }
  return '';
}

/** Créneau affiché sur la carte (créneau demandé ou heure du RDV). */
function getCreneauHoraireLabel(appointment: any): string {
  return formatAvailabilityDisplayFr(appointment.form_data?.availability, appointment.scheduled_at);
}
</script>

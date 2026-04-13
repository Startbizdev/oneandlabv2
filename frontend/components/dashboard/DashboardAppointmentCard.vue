<template>
  <div
    class="group rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-200 overflow-hidden flex flex-col"
    :class="{ 'cursor-pointer': !!onAction }"
    @click="onAction ? onAction(appointment) : undefined"
  >
    <div class="p-3.5 sm:p-4 flex-1 flex flex-col min-w-0">
      <!-- Header: avatar + nom + statut -->
      <div class="flex items-start justify-between gap-2 mb-3">
        <div class="flex items-center gap-2.5 min-w-0">
          <div
            class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ring-1 ring-inset"
            :class="appointment.type === 'blood_test'
              ? 'bg-red-50 text-red-600 ring-red-200/80 dark:bg-red-950/40 dark:text-red-400 dark:ring-red-900/50'
              : 'bg-sky-50 text-sky-600 ring-sky-200/80 dark:bg-sky-950/40 dark:text-sky-400 dark:ring-sky-900/50'"
          >
            <UIcon :name="careCategoryIconName(appointment)" class="w-4 h-4" />
          </div>
          <div class="min-w-0">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {{ displayPatientName(appointment) }}
            </h3>
            <p v-if="displayPhone(appointment)" class="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
              <UIcon name="i-lucide-phone" class="w-3 h-3 flex-shrink-0" />
              {{ displayPhone(appointment) }}
            </p>
          </div>
        </div>
        <UBadge
          :color="getStatusColor(appointment.status)"
          variant="subtle"
          size="xs"
          class="rounded-full px-2 py-0.5 font-medium whitespace-nowrap flex-shrink-0"
          :label="getStatusLabel(appointment.status)"
        />
      </div>

      <!-- Corps compact -->
      <div class="space-y-2 text-xs">
        <!-- Intervention + catégorie -->
        <div class="flex items-start gap-2">
          <UIcon :name="careCategoryIconName(appointment)" class="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
          <div class="min-w-0 flex-1">
            <span class="font-medium text-gray-900 dark:text-white">
              {{ appointment.type === 'blood_test' ? 'Prise de sang' : 'Soins infirmiers' }}
            </span>
            <span v-if="appointment.category_name" class="text-gray-500"> • {{ appointment.category_name }}</span>
          </div>
        </div>

        <!-- Prélèvement (blood_test) -->
        <div v-if="appointment.type === 'blood_test' && getBloodTestTypeLabel(appointment.form_data)" class="flex items-start gap-2">
          <UIcon name="i-lucide-pipette" class="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
          <span class="text-gray-700 dark:text-gray-300">{{ getBloodTestTypeLabel(appointment.form_data) }}</span>
        </div>

        <!-- Date & créneau (pas d'heure, uniquement créneau ou toute la journée) -->
        <div class="flex items-start gap-2">
          <UIcon name="i-lucide-calendar-clock" class="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
          <div class="min-w-0">
            <span class="font-medium text-gray-900 dark:text-white capitalize">{{ formatDateLabel(appointment) }}</span>
            <span v-if="getCreneauHoraireLabel(appointment)" class="text-gray-500"> — {{ getCreneauHoraireLabel(appointment) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Action centrée, mini -->
    <div class="px-3.5 sm:px-4 pb-3.5 sm:pb-4 pt-0 flex justify-center">
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
import { formatBloodTestSeriesDurationDays } from '~/utils/duration-display';
import { resolveCareIconFromCategory } from '~/utils/care-icons';

function careCategoryIconName(apt: any): string {
  const t = apt?.type === 'blood_test' ? 'blood_test' : 'nursing';
  return resolveCareIconFromCategory({ type: t, icon: apt?.category_icon ?? null });
}
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
  }>(),
  { maskSensitive: false }
);

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
  if (!apt?.form_data) return '—';
  if (props.maskSensitive) {
    const fn = maskString(apt.form_data.first_name || '', 1, 0);
    const ln = maskString(apt.form_data.last_name || '', 1, 0);
    return `${fn} ${ln}`.trim() || '••••••';
  }
  return [apt.form_data.first_name, apt.form_data.last_name].filter(Boolean).join(' ').trim() || '—';
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
      if (!Number.isNaN(start) && !Number.isNaN(end)) return `${start}h00 - ${end}h00`;
    }
  } catch {
    // ignore
  }
  return '';
}

/** Créneau horaire uniquement (Toute la journée ou 9h-11h), pas d'heure précise */
function getCreneauHoraireLabel(appointment: any): string {
  const availability = appointment.form_data?.availability;
  const formatted = formatAvailability(availability);
  if (formatted) return formatted;
  return ''; // Pas de fallback sur l'heure : on a des créneaux, pas des heures
}
</script>

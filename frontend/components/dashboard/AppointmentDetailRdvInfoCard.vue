<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-4">
        <div class="min-w-0">
          <h2 class="text-lg font-normal flex items-center gap-2 flex-wrap">
            <UIcon name="i-lucide-calendar" class="w-5 h-5 shrink-0" />
            <span>Informations du rendez-vous</span>
            <UBadge
              v-if="batchSize > 1"
              color="neutral"
              variant="subtle"
              size="xs"
              class="font-medium"
            >
              {{ appt.category_name || `Soin ${batchIndex + 1}/${batchSize}` }}
            </UBadge>
          </h2>
        </div>
        <div class="flex items-center gap-2 flex-wrap shrink-0">
          <UBadge
            :color="getStatusColor(appt.status)"
            variant="subtle"
            size="md"
            :label="getStatusLabel(appt.status)"
          />
          <UBadge
            :color="appt.type === 'blood_test' ? 'error' : 'info'"
            variant="subtle"
            size="md"
            :leading-icon="appt.type === 'blood_test' ? 'i-lucide-syringe' : 'i-lucide-stethoscope'"
            :label="getTypeLabel(appt.type)"
          />
        </div>
      </div>
    </template>
    <div class="space-y-4">
      <UAlert
        v-if="appt.status === 'canceled'"
        color="neutral"
        variant="subtle"
        icon="i-lucide-calendar-x"
        title="Rendez-vous annulé"
        description="Ce rendez-vous n’est plus disponible. Les détails du soin et les coordonnées du patient ne sont plus affichés."
        class="rounded-xl"
      />
      <template v-if="appt.status !== 'canceled'">
        <div class="flex items-start gap-3">
          <UIcon name="i-lucide-calendar" class="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
          <div class="flex-1 min-w-0">
            <p class="text-xs text-gray-500 dark:text-gray-400">Date souhaitée</p>
            <p class="text-sm font-medium text-gray-900 dark:text-white">
              {{ formatDateOnly(appt.scheduled_at) }}
            </p>
          </div>
        </div>
        <div v-if="appt.address" class="flex items-start gap-3">
          <UIcon name="i-lucide-map-pin" class="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
          <div class="flex-1 min-w-0">
            <p class="text-xs text-gray-500 dark:text-gray-400">Adresse complète</p>
            <p class="text-sm font-medium text-gray-900 dark:text-white">
              {{ typeof appt.address === 'object' && appt.address?.label ? appt.address.label : appt.address }}
            </p>
            <p v-if="addressComplement" class="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Complément : {{ addressComplement }}
            </p>
            <a
              href="#"
              class="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 underline mt-1 inline-flex items-center gap-1"
              @click.prevent="openInGoogleMaps"
            >
              <UIcon name="i-lucide-external-link" class="w-3 h-3" />
              Voir dans la map
            </a>
          </div>
        </div>
        <div v-if="appt.category_name" class="flex items-start gap-3">
          <UIcon name="i-lucide-stethoscope" class="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
          <div class="flex-1 min-w-0">
            <p class="text-xs text-gray-500 dark:text-gray-400">{{ bloodTestItems.length > 1 ? 'Acte principal' : 'Type de soin' }}</p>
            <p class="text-sm font-medium text-gray-900 dark:text-white">{{ appt.category_name }}</p>
          </div>
        </div>
        <div v-if="bloodTestItems.length > 1" class="flex items-start gap-3">
          <UIcon name="i-lucide-list-checks" class="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
          <div class="flex-1 min-w-0">
            <p class="text-xs text-gray-500 dark:text-gray-400">Actes de prise de sang</p>
            <div class="mt-2 flex flex-wrap gap-1.5">
              <UBadge
                v-for="item in bloodTestItems"
                :key="item.id || item.category_id || item.label"
                color="error"
                variant="subtle"
                size="sm"
                class="max-w-full"
              >
                <span class="truncate">{{ item.label || item.category_name || 'Acte' }}</span>
              </UBadge>
            </div>
          </div>
        </div>
        <div v-if="appt.form_data?.blood_test_type" class="flex items-start gap-3">
          <UIcon name="i-lucide-droplet" class="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
          <div class="flex-1 min-w-0">
            <p class="text-xs text-gray-500 dark:text-gray-400">Type de prélèvement</p>
            <p class="text-sm font-medium text-gray-900 dark:text-white">{{ getBloodTestTypeLabel(appt.form_data) }}</p>
          </div>
        </div>
        <div v-if="appt.form_data?.duration_days" class="flex items-start gap-3">
          <UIcon name="i-lucide-calendar-days" class="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
          <div class="flex-1 min-w-0">
            <p class="text-xs text-gray-500 dark:text-gray-400">{{ appt.type === 'nursing' ? 'Prise en charge' : 'Durée' }}</p>
            <p class="text-sm font-medium text-gray-900 dark:text-white">{{
              appt.type === 'nursing'
                ? getNursingDurationLabel(appt.form_data.duration_days, appt.form_data.custom_days)
                : formatBloodTestSeriesDurationDays(appt.form_data.duration_days, appt.form_data.custom_days)
            }}</p>
          </div>
        </div>
        <div v-if="appt.form_data?.frequency" class="flex items-start gap-3">
          <UIcon name="i-lucide-repeat" class="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
          <div class="flex-1 min-w-0">
            <p class="text-xs text-gray-500 dark:text-gray-400">Fréquence</p>
            <p class="text-sm font-medium text-gray-900 dark:text-white">{{ getFrequencyLabel(appt.form_data.frequency) }}</p>
          </div>
        </div>
        <template v-for="(val, key) in (appt.form_data?.care_options || {})" :key="`care-${key}`">
          <div v-if="val != null && val !== ''" class="flex items-start gap-3">
            <UIcon name="i-lucide-list-checks" class="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
            <div class="flex-1 min-w-0">
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ getCareOptionLabel(key) }}</p>
              <p class="text-sm font-medium text-gray-900 dark:text-white">{{ getCareOptionValueLabel(key, val) }}</p>
            </div>
          </div>
        </template>
        <div v-if="appt.form_data?.availability" class="flex items-start gap-3">
          <UIcon name="i-lucide-clock" class="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
          <div class="flex-1 min-w-0">
            <p class="text-xs text-gray-500 dark:text-gray-400">Disponibilités horaires</p>
            <p class="text-sm font-medium text-gray-900 dark:text-white">{{ formatAvailability(appt.form_data.availability) }}</p>
          </div>
        </div>
        <div v-if="appt.notes" class="flex items-start gap-3">
          <UIcon name="i-lucide-file-text" class="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
          <div class="flex-1 min-w-0">
            <p class="text-xs text-gray-500 dark:text-gray-400">Notes du patient</p>
            <p class="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{{ appt.notes }}</p>
          </div>
        </div>
        <div v-if="appt.created_at" class="flex items-start gap-3">
          <UIcon name="i-lucide-calendar-plus" class="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
          <div class="flex-1 min-w-0">
            <p class="text-xs text-gray-500 dark:text-gray-400">Créé le</p>
            <p class="text-sm font-medium text-gray-900 dark:text-white">{{ formatDate(appt.created_at) }}</p>
          </div>
        </div>
        <div v-if="isAdmin && appt.updated_at" class="flex items-start gap-3">
          <UIcon name="i-lucide-pencil" class="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
          <div class="flex-1 min-w-0">
            <p class="text-xs text-gray-500 dark:text-gray-400">Modifié le</p>
            <p class="text-sm font-medium text-gray-900 dark:text-white">{{ formatDate(appt.updated_at) }}</p>
          </div>
        </div>
      </template>
      <template v-else>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{ getTypeLabel(appt.type) }}
          <span v-if="appt.scheduled_at"> · prévu le {{ formatDateOnly(appt.scheduled_at) }}</span>
        </p>
        <template v-if="appt.canceled_by || appt.cancellation_reason">
          <div v-if="appt.cancellation_reason" class="flex items-start gap-3 mt-4">
            <UIcon name="i-lucide-tag" class="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
            <div class="flex-1 min-w-0">
              <p class="text-xs text-gray-500 dark:text-gray-400">Motif d'annulation</p>
              <p class="text-sm font-medium text-gray-900 dark:text-white">{{ getCancellationReasonLabel(appt.cancellation_reason) }}</p>
            </div>
          </div>
          <div v-if="appt.cancellation_comment" class="flex items-start gap-3">
            <UIcon name="i-lucide-message-square" class="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
            <div class="flex-1 min-w-0">
              <p class="text-xs text-gray-500 dark:text-gray-400">Commentaire</p>
              <p class="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{{ appt.cancellation_comment }}</p>
            </div>
          </div>
          <div v-if="showCancellationPhoto && appt.cancellation_photo_document_id" class="flex items-start gap-3">
            <UIcon name="i-lucide-camera" class="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
            <div class="flex-1 min-w-0">
              <p class="text-xs text-gray-500 dark:text-gray-400">Photo (preuve)</p>
              <a
                :href="cancellationPhotoDownloadUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="text-sm text-primary-600 dark:text-primary-400 hover:underline"
              >
                Voir la photo
              </a>
            </div>
          </div>
        </template>
      </template>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { CANCELLATION_REASONS } from '~/config/cancellation-reasons';
import { getNursingDurationLabel } from '~/constants/nursing-duration';
import { formatBloodTestSeriesDurationDays } from '~/utils/duration-display';

const props = defineProps<{
  appt: any;
  categoriesForDetail: Array<{
    id: string;
    options?: Array<{ option_key: string; label: string; options?: { value: string; label: string }[] }>;
  }>;
  isAdmin: boolean;
  showCancellationPhoto: boolean;
  batchIndex: number;
  batchSize: number;
}>();

const config = useRuntimeConfig();

const addressComplement = computed(() => {
  const a = props.appt;
  if (!a) return '';
  const fromForm = a.form_data?.address_complement;
  if (fromForm && String(fromForm).trim()) return String(fromForm).trim();
  if (typeof a.address === 'object' && a.address?.complement && String(a.address.complement).trim()) {
    return String(a.address.complement).trim();
  }
  return '';
});

const cancellationPhotoDownloadUrl = computed(() => {
  const id = props.appt?.cancellation_photo_document_id;
  if (!id) return '';
  const apiBase = config.public?.apiBase || '';
  return `${apiBase}/medical-documents/${id}/download`;
});

const bloodTestItems = computed(() => {
  const items = props.appt?.blood_test_items;
  return Array.isArray(items) ? items : [];
});

const PARIS_TZ = 'Europe/Paris';

function formatDate(d: string) {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleDateString('fr-FR', { timeZone: PARIS_TZ, day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return d;
  }
}

function formatDateOnly(d: string) {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleDateString('fr-FR', { timeZone: PARIS_TZ, day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return d;
  }
}

function getCancellationReasonLabel(code: string) {
  return CANCELLATION_REASONS[code] || code;
}

function getCareOptionLabel(optionKey: string): string {
  const catId = props.appt?.category_id ?? (props.appt?.form_data as any)?.category_id;
  if (!catId) return optionKey.replace(/_/g, ' ');
  const cat = props.categoriesForDetail.find((c) => String(c.id) === String(catId));
  const opt = cat?.options?.find((o) => o.option_key === optionKey);
  return opt?.label ?? optionKey.replace(/_/g, ' ');
}

function getCareOptionValueLabel(optionKey: string, value: string | number): string {
  const catId = props.appt?.category_id ?? (props.appt?.form_data as any)?.category_id;
  if (!catId) return String(value);
  const cat = props.categoriesForDetail.find((c) => String(c.id) === String(catId));
  const opt = cat?.options?.find((o) => o.option_key === optionKey);
  if (opt?.options && Array.isArray(opt.options)) {
    const found = opt.options.find((o) => String(o.value) === String(value));
    return found?.label ?? String(value);
  }
  return String(value);
}

function getStatusColor(status: string): 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral' {
  const map: Record<string, 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral'> = {
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
  return map[status] || 'neutral';
}

function getStatusLabel(s: string) {
  const map: Record<string, string> = {
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
  return map[s] || s;
}

function getTypeLabel(t: string) {
  return t === 'blood_test' ? 'Prise de sang' : 'Soins infirmiers';
}

function getBloodTestTypeLabel(fd: any) {
  if (!fd?.blood_test_type) return '';
  if (fd.blood_test_type === 'single') return 'Une seule prise de sang';
  if (fd.blood_test_type === 'multiple') {
    const label = formatBloodTestSeriesDurationDays(fd.duration_days, fd.custom_days);
    return label ? `Plusieurs prélèvements sur ${label}` : 'Plusieurs prélèvements sur plusieurs jours';
  }
  return '';
}

function getFrequencyLabel(v: string) {
  const map: Record<string, string> = {
    once_daily: '1 fois par jour',
    twice_daily: '2 fois par jour',
    thrice_daily: '3 fois par jour',
    twice_weekly: '2 fois par semaine',
    thrice_weekly: '3 fois par semaine',
    to_define: 'A voir avec le professionnel',
    daily: '1 fois par jour',
    every_other_day: '1 jour sur 2',
  };
  return map[v] || v;
}

function formatAvailability(av: string) {
  try {
    const a = typeof av === 'string' ? JSON.parse(av) : av;
    if (a?.type === 'all_day') return 'Toute la journée';
    if (a?.type === 'custom' && a?.range) return `${a.range[0]}h - ${a.range[1]}h`;
  } catch {}
  return av;
}

function openInGoogleMaps() {
  const addr = props.appt?.address;
  if (!addr) return;
  if (typeof addr === 'object' && addr.lat && addr.lng) {
    window.open(`https://www.google.com/maps?q=${addr.lat},${addr.lng}`, '_blank');
  } else {
    const text = typeof addr === 'object' && addr.label ? addr.label : addr;
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text)}`, '_blank');
  }
}
</script>

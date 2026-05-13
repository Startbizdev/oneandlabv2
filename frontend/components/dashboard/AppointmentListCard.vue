<template>
  <div
    class="group relative flex h-full flex-col gap-0 overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:border-primary-500/30 hover:shadow-md dark:border-gray-800 dark:bg-gray-950"
  >
    <!-- RENDER: BATCH (LOT MULTI-SOINS) -->
    <template v-if="row.kind === 'batch' && !isBloodOnlyBatch && !isNursingOnlyBatch">
      <component
        :is="batchPrimaryHref ? RouterLink : 'button'"
        v-bind="batchPrimaryHref ? { to: batchPrimaryHref } : { type: 'button' }"
        :class="[
          'relative z-0 flex shrink-0 flex-col text-left focus:outline-none',
          nurseCardBodyClass,
          batchPrimaryHref ? 'cursor-pointer' : '',
        ]"
        @click="!batchPrimaryHref && emit('cardClick', batchCardClickAppointment)"
      >
        <!-- Nom patient + adresse -->
        <div class="pr-8">
          <p class="text-[15px] font-semibold leading-snug text-gray-900 dark:text-white">
            {{ displayPatientName(row.appointments[0]) }}
          </p>
          <p
            v-if="displayAddress(row.appointments[0])"
            class="mt-1 text-[11px] font-medium leading-snug text-gray-500 dark:text-gray-400 whitespace-normal break-words"
          >
            {{ displayAddress(row.appointments[0]) }}
          </p>
        </div>

        <!-- Un bloc par RDV du lot -->
        <div class="space-y-2">
          <div v-for="apt in sortedBatchAppointments" :key="apt.id" class="flex flex-col gap-2">
            <header class="-mx-4 border-b border-gray-200/90 px-4 pb-2 dark:border-gray-800 sm:-mx-5 sm:px-5">
              <div class="flex min-w-0 items-center justify-between gap-2">
                <p class="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px] leading-snug text-gray-900 dark:text-gray-100">
                  <span class="inline-flex shrink-0 items-center gap-1 font-semibold tabular-nums leading-none">
                    <UIcon
                      name="i-solar:calendar-linear"
                      class="h-[15px] w-[15px] shrink-0 text-gray-500 dark:text-gray-400"
                      aria-hidden="true"
                    />
                    <span>{{ formatDateCompact(apt.scheduled_at) }}</span>
                  </span>
                  <span class="shrink-0 text-gray-300 dark:text-gray-600" aria-hidden="true">·</span>
                  <span class="inline-flex min-w-0 items-center gap-1 font-medium tabular-nums leading-none text-gray-600 dark:text-gray-400">
                    <UIcon
                      name="i-solar:clock-circle-linear"
                      class="h-[15px] w-[15px] shrink-0 text-gray-500 dark:text-gray-400"
                      aria-hidden="true"
                    />
                    <span class="min-w-0">{{ getCreneauHoraireLabel(apt) }}</span>
                  </span>
                </p>
                <div class="flex shrink-0 flex-wrap items-start justify-end gap-1.5">
                  <PatientUrgencyBadge :appointment="apt" />
                  <UBadge
                    :color="getStatusColor(apt.status)"
                    variant="subtle"
                    size="sm"
                    class="shrink-0 px-2 py-0.5 text-[11px] font-semibold leading-tight tracking-tight"
                    :label="getStatusLabel(apt.status)"
                  />
                </div>
              </div>
            </header>

            <ul class="min-w-0 space-y-px" role="list">
              <li
                v-for="(line, idx) in catalogLinesForAppointment(apt)"
                :key="`${line.category_id ?? 'noid'}-${idx}-${line.label}`"
                class="flex min-w-0 items-center gap-2 py-0.5 first:pt-0 last:pb-0"
              >
                <div class="flex h-7 w-7 shrink-0 items-center justify-center self-center" aria-hidden="true">
                  <CareCategoryVisual
                    :image-src="catalogLineBadge(apt?.type, line).imageSrc"
                    :icon-name="catalogLineBadge(apt?.type, line).iconName"
                    img-class="h-6 w-6 rounded object-contain"
                    icon-class="h-3.5 w-3.5 shrink-0 text-gray-600 dark:text-gray-400"
                  />
                </div>
                <p class="min-w-0 flex-1 text-[13px] font-medium leading-snug text-gray-800 dark:text-gray-200 line-clamp-2">
                  {{ line.label }}
                </p>
              </li>
            </ul>
          </div>
        </div>
      </component>

      <!-- Footer Batch : deux boutons séparés (pas split grille collée) -->
      <div v-if="batchOfferFooter" class="mt-auto shrink-0 border-t border-gray-100 px-4 py-2.5 dark:border-gray-800 sm:px-5">
        <div class="flex flex-col gap-2 sm:flex-row sm:gap-3">
          <UButton
            color="error"
            variant="soft"
            size="sm"
            class="min-h-9 flex-1 justify-center"
            :loading="offerLoadingRefuse"
            label="Refuser"
            @click.stop="emit('refuseBatch')"
          />
          <UButton
            color="primary"
            size="sm"
            class="min-h-9 flex-1 justify-center"
            :loading="offerLoadingAccept"
            label="Accepter"
            @click.stop="emit('acceptBatch')"
          />
        </div>
      </div>
    </template>

    <!-- RENDER: SINGLE CARD -->
    <template v-else>
      <component
        :is="singleCardHref ? RouterLink : 'button'"
        v-bind="singleCardHref ? { to: singleCardHref } : { type: 'button' }"
        :class="[
          'relative z-0 flex shrink-0 flex-col text-left focus:outline-none',
          nurseCardBodyClass,
          singleCardHref ? 'cursor-pointer' : '',
        ]"
        @click="!singleCardHref && emit('cardClick', singleDisplayAppointment)"
      >
        <div class="pr-8">
          <p class="text-[15px] font-semibold leading-snug text-gray-900 dark:text-white">
            {{ displayPatientName(singleDisplayAppointment) }}
          </p>
          <p
            v-if="displayAddress(singleDisplayAppointment)"
            class="mt-1 text-[11px] font-medium leading-snug text-gray-500 dark:text-gray-400 whitespace-normal break-words"
          >
            {{ displayAddress(singleDisplayAppointment) }}
          </p>
        </div>

        <header class="-mx-4 border-b border-gray-200/90 px-4 pb-2 dark:border-gray-800 sm:-mx-5 sm:px-5">
          <div class="flex min-w-0 items-center justify-between gap-2">
            <p class="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px] leading-snug text-gray-900 dark:text-gray-100">
              <span class="inline-flex shrink-0 items-center gap-1 font-semibold tabular-nums leading-none">
                <UIcon
                  name="i-solar:calendar-linear"
                  class="h-[15px] w-[15px] shrink-0 text-gray-500 dark:text-gray-400"
                  aria-hidden="true"
                />
                <span>{{ formatDateCompact(singleDisplayAppointment.scheduled_at) }}</span>
              </span>
              <span class="shrink-0 text-gray-300 dark:text-gray-600" aria-hidden="true">·</span>
              <span class="inline-flex min-w-0 items-center gap-1 font-medium tabular-nums leading-none text-gray-600 dark:text-gray-400">
                <UIcon
                  name="i-solar:clock-circle-linear"
                  class="h-[15px] w-[15px] shrink-0 text-gray-500 dark:text-gray-400"
                  aria-hidden="true"
                />
                <span class="min-w-0">{{ getCreneauHoraireLabel(singleDisplayAppointment) }}</span>
              </span>
            </p>
            <div class="flex shrink-0 flex-wrap items-start justify-end gap-1.5">
              <PatientUrgencyBadge :appointment="singleDisplayAppointment" />
              <UBadge
                :color="getStatusColor(singleDisplayAppointment.status)"
                variant="subtle"
                size="sm"
                class="shrink-0 px-2 py-0.5 text-[11px] font-semibold leading-tight tracking-tight"
                :label="getStatusLabel(singleDisplayAppointment.status)"
              />
            </div>
          </div>
        </header>

        <ul class="min-w-0 space-y-px" role="list">
          <li
            v-for="(line, idx) in catalogLinesForAppointment(singleDisplayAppointment)"
            :key="`${line.category_id ?? 'noid'}-${idx}-${line.label}`"
            class="flex min-w-0 items-center gap-2 py-0.5 first:pt-0 last:pb-0"
          >
            <div class="flex h-7 w-7 shrink-0 items-center justify-center self-center" aria-hidden="true">
              <CareCategoryVisual
                :image-src="catalogLineBadge(singleDisplayAppointment?.type, line).imageSrc"
                :icon-name="catalogLineBadge(singleDisplayAppointment?.type, line).iconName"
                img-class="h-6 w-6 rounded object-contain"
                icon-class="h-3.5 w-3.5 shrink-0 text-gray-600 dark:text-gray-400"
              />
            </div>
            <p class="min-w-0 flex-1 text-[13px] font-medium leading-snug text-gray-800 dark:text-gray-200 line-clamp-2">
              {{ line.label }}
            </p>
          </li>
        </ul>

        <!-- Status En cours -->
        <div
          v-if="singleDisplayAppointment.status === 'inProgress' && singleDisplayAppointment.started_at"
          class="inline-flex max-w-full items-center gap-1.5 rounded-md bg-primary-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary-800 dark:bg-primary-950/30 dark:text-primary-200"
        >
          <span class="relative flex h-1.5 w-1.5 shrink-0">
            <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-400 opacity-75" />
            <span class="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary-500" />
          </span>
          Démarré à {{ formatTime(singleDisplayAppointment.started_at) }}
        </div>
      </component>

      <!-- Footer lot offre infirmier : carte fusionnée multisoins (même branche « single » que blood/nursing merged) -->
      <div
        v-if="batchOfferFooter && isNursingOnlyBatch"
        class="mt-auto shrink-0 border-t border-gray-100 px-4 py-2.5 dark:border-gray-800 sm:px-5"
      >
        <div class="flex flex-col gap-2 sm:flex-row sm:gap-3">
          <UButton
            color="error"
            variant="soft"
            size="sm"
            class="min-h-9 flex-1 justify-center"
            :loading="offerLoadingRefuse"
            label="Refuser"
            @click.stop="emit('refuseBatch')"
          />
          <UButton
            color="primary"
            size="sm"
            class="min-h-9 flex-1 justify-center"
            :loading="offerLoadingAccept"
            label="Accepter"
            @click.stop="emit('acceptBatch')"
          />
        </div>
      </div>

      <!-- Footer Single -->
      <div v-if="singleOfferFooter" class="mt-auto shrink-0 border-t border-gray-100 px-4 py-2.5 dark:border-gray-800 sm:px-5">
        <div class="flex flex-col gap-2 sm:flex-row sm:gap-3">
          <UButton
            color="error"
            variant="soft"
            size="sm"
            class="min-h-9 flex-1 justify-center"
            :loading="offerLoadingRefuse"
            label="Refuser"
            @click.stop="emit('refuseOffer')"
          />
          <UButton
            color="primary"
            size="sm"
            class="min-h-9 flex-1 justify-center"
            :loading="offerLoadingAccept"
            label="Accepter"
            @click.stop="emit('acceptOffer')"
          />
        </div>
      </div>

      <!-- Actions optionnelles (ex. admin) : pile sur mobile, 50 / 50 en ligne depuis sm -->
      <div
        v-if="hasCardActionsSlot"
        class="flex shrink-0 w-full flex-col gap-2 border-t border-gray-100 bg-gray-50/30 px-4 py-2.5 dark:border-gray-800 dark:bg-transparent sm:flex-row sm:px-5 sm:[&>*]:min-h-9 sm:[&>*]:flex-1"
      >
        <slot name="cardActions" :appointment="singleDisplayAppointment" :base-path="basePath" />
      </div>
    </template>

    <!-- Chevron indicatif (coin supérieur droit au survol) -->
    <UIcon
      name="i-lucide-chevron-right"
      class="pointer-events-none absolute right-4 top-3 h-5 w-5 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 sm:right-5 sm:top-3 dark:text-gray-700"
      aria-hidden="true"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue';
import { RouterLink } from 'vue-router';
import { formatAvailabilityDisplayFr } from '~/utils/appointment-datetime-fr';
import {
  type AppointmentListRow,
  isBloodTestOnlyBatchRow,
  isNursingOnlyBatchRow,
  mergeBloodBatchAppointmentsForListDisplay,
  mergeNursingBatchAppointmentsForListDisplay,
} from '~/utils/appointment-batch';
import {
  buildCategoryAccentMapForList,
  careListBadgeForCatalogItem,
  type CareCategoryRowMinimal,
} from '~/utils/care-icons';
import {
  patientRdvCatalogDisplayLines,
  type PatientRdvCatalogLine,
} from '~/utils/patient-rdv-list-display';

const props = withDefaults(
  defineProps<{
    row: AppointmentListRow;
    basePath: string;
    nurseCardBodyClass: string;
    resolveCardHref: (appointment: any) => string | null;
    displayPatientName: (appointment: any) => string;
    displayAddress: (appointment: any) => string;
    batchOfferFooter?: boolean;
    singleOfferFooter?: boolean;
    offerLoadingAccept: boolean;
    offerLoadingRefuse: boolean;
    /** `/categories` — mêmes icônes / couleurs que `/rendez-vous/nouveau` et liste patient */
    categories?: CareCategoryRowMinimal[];
  }>(),
  {
    batchOfferFooter: false,
    singleOfferFooter: false,
    categories: () => [],
  },
);

const categoryAccentMap = computed(() => buildCategoryAccentMapForList(props.categories ?? []));

const config = useRuntimeConfig();

const emit = defineEmits<{
  cardClick: [appointment: any];
  acceptBatch: [];
  refuseBatch: [];
  acceptOffer: [];
  refuseOffer: [];
}>();

const slots = useSlots();
const hasCardActionsSlot = computed(() => !!slots.cardActions);

const isBloodOnlyBatch = computed(
  () => props.row.kind === 'batch' && isBloodTestOnlyBatchRow(props.row),
);

const isNursingOnlyBatch = computed(
  () => props.row.kind === 'batch' && isNursingOnlyBatchRow(props.row),
);

/** RDV affiché dans la branche « carte simple » (y compris lot 100 % prise de sang fusionné ou lot 100 % soins fusionné). */
const singleDisplayAppointment = computed(() => {
  if (props.row.kind === 'single') return props.row.appointment;
  if (isBloodOnlyBatch.value) {
    return mergeBloodBatchAppointmentsForListDisplay(props.row.appointments);
  }
  if (isNursingOnlyBatch.value) {
    return mergeNursingBatchAppointmentsForListDisplay(props.row.appointments);
  }
  return props.row.appointments[0];
});

/** Lien fiche (carte simple). `RouterLink` ref — pas la chaîne `'NuxtLink'` sur `<component :is>` (résolution fragile avec auto-import). */
const singleCardHref = computed(() => {
  if (props.row.kind === 'single') return props.resolveCardHref(props.row.appointment);
  if (isBloodOnlyBatch.value || isNursingOnlyBatch.value) return props.resolveCardHref(singleDisplayAppointment.value);
  return null;
});

/** RDV du lot triés (affichage + lien détail cohérent avec la fiche `/appointments/:id`). */
const sortedBatchAppointments = computed(() => {
  if (props.row.kind !== 'batch') return [];
  return [...props.row.appointments].sort(
    (a, b) =>
      new Date(a.scheduled_at || a.created_at || 0).getTime() -
      new Date(b.scheduled_at || b.created_at || 0).getTime(),
  );
});

/**
 * `resolveCardHref` peut être null pour un RDV du lot (ex. offre en attente hors segment « Mes demandes »)
 * alors qu’un autre du même lot a bien une URL — on prend le premier lien non null.
 */
const batchPrimaryHref = computed(() => {
  if (props.row.kind !== 'batch' || sortedBatchAppointments.value.length === 0) return null;
  for (const apt of sortedBatchAppointments.value) {
    const href = props.resolveCardHref(apt);
    if (href) return href;
  }
  return null;
});

/** Cible pour `@cardClick` quand aucun lien (modal / navigation programmatique). */
const batchCardClickAppointment = computed(() => {
  if (props.row.kind !== 'batch' || sortedBatchAppointments.value.length === 0) {
    return props.row.kind === 'batch' ? props.row.appointments[0] : undefined;
  }
  const list = sortedBatchAppointments.value;
  for (const apt of list) {
    if (props.resolveCardHref(apt)) return apt;
  }
  return list[0];
});

function getStatusColor(status: string): any {
  const colors: Record<string, string> = {
    pending: 'warning', confirmed: 'info', planned: 'info',
    inProgress: 'primary', completed: 'success', canceled: 'error',
    cancelled: 'error', refused: 'error', expired: 'neutral',
  };
  return colors[status] || 'neutral';
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: 'Attente', confirmed: 'Confirmé', planned: 'Prévu',
    inProgress: 'En cours', completed: 'Terminé', canceled: 'Annulé',
    cancelled: 'Annulé', refused: 'Refusé', expired: 'Expiré',
  };
  return labels[status] || status;
}

function formatDateCompact(date: string | undefined) {
  if (!date) return '';
  try {
    const d = new Date(date);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
    const s = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  } catch {
    return '';
  }
}

function catalogLinesForAppointment(apt: any): PatientRdvCatalogLine[] {
  return patientRdvCatalogDisplayLines(apt);
}

function catalogLineBadge(
  appointmentType: string | null | undefined,
  line: PatientRdvCatalogLine,
): ReturnType<typeof careListBadgeForCatalogItem> {
  return careListBadgeForCatalogItem(
    appointmentType,
    { category_id: line.category_id, category_image_url: line.category_image_url },
    props.categories ?? [],
    categoryAccentMap.value,
    config.public.apiBase,
  );
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function getCreneauHoraireLabel(appointment: any): string {
  return formatAvailabilityDisplayFr(appointment.form_data?.availability, appointment.scheduled_at) || 'Non précisé';
}
</script>
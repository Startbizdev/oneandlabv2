<template>
  <div class="min-w-0 flex-1 text-left">
    <button
      type="button"
      class="group w-full rounded-md py-0.5 text-left outline-none transition-colors hover:bg-gray-100/80 focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:hover:bg-gray-800/50 dark:focus-visible:ring-offset-gray-950"
      :aria-haspopup="true"
      :aria-expanded="modalOpen"
      aria-controls="selected-services-cart-modal"
      @click="modalOpen = true"
    >
      <p class="text-[11px] font-semibold leading-tight text-gray-900 dark:text-white sm:text-xs">
        {{ headline }}
      </p>
      <p
        class="mt-px flex items-center gap-1 text-[10px] font-medium leading-tight text-emerald-700/95 dark:text-emerald-400/95 sm:text-[11px]"
      >
        <span class="min-w-0">{{ detailActionLabel }}</span>
        <UIcon
          name="i-lucide-chevron-right"
          class="h-3 w-3 shrink-0 opacity-70 transition-transform group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5"
          aria-hidden="true"
        />
      </p>
      <span class="sr-only">Ouvrir le détail du panier et retirer un soin</span>
    </button>

    <ClientOnly>
      <UModal
        v-model:open="modalOpen"
        :content="careAutreDetailPopoverModalContentProps"
        :ui="{
          content:
            'max-w-[min(100vw-1.5rem,26rem)] w-full overflow-hidden rounded-xl border border-gray-200/90 bg-white p-0 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.18)] ring-0 sm:max-w-md dark:border-gray-800 dark:bg-gray-950 dark:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.45)]',
        }"
      >
        <template #content="{ close }">
          <div
            id="selected-services-cart-modal"
            class="flex max-h-[min(88dvh,36rem)] flex-col overflow-hidden"
            role="dialog"
            aria-labelledby="selected-services-cart-title"
          >
            <header
              class="flex shrink-0 items-start justify-between gap-2 border-b border-gray-100 px-4 py-3 dark:border-gray-800/90"
            >
              <div class="min-w-0">
                <h2
                  id="selected-services-cart-title"
                  class="text-[15px] font-semibold leading-tight tracking-tight text-gray-900 dark:text-gray-50"
                >
                  {{ modalTitle }}
                </h2>
                <p class="mt-0.5 text-[11px] leading-snug text-gray-500 dark:text-gray-400">
                  Vérifiez les options avant de continuer.
                </p>
              </div>
              <button
                type="button"
                class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/50 dark:hover:bg-gray-800/80 dark:hover:text-gray-200"
                aria-label="Fermer"
                @click="close"
              >
                <UIcon name="i-lucide-x" class="h-4 w-4" />
              </button>
            </header>

            <ul class="min-h-0 flex-1 list-none divide-y divide-gray-100 overflow-y-auto overscroll-contain dark:divide-gray-800/90" role="list">
              <li v-for="svc in selectedServices" :key="svc.id" class="list-none px-4 py-2.5 sm:px-4 sm:py-2.5">
                <div class="flex items-start gap-2.5">
                  <div
                    class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-gray-100 bg-gray-50/80 dark:border-gray-800 dark:bg-gray-900/50"
                  >
                    <CareCategoryVisual
                      :image-src="imageSrcFor(svc)"
                      :icon-name="svc.icon || 'i-lucide-stethoscope'"
                      img-class="block max-h-full max-w-full object-contain"
                      icon-class="max-h-[90%] max-w-[90%] shrink-0 text-gray-600 dark:text-gray-400"
                    />
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                      <p
                        class="min-w-0 flex-1 text-[13px] font-semibold leading-tight tracking-tight text-gray-900 dark:text-gray-50"
                      >
                        {{ svc.name }}
                      </p>
                      <button
                        type="button"
                        class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                        :aria-label="`Retirer ${svc.name} du panier`"
                        @click="confirmRemove(svc)"
                      >
                        <UIcon name="i-lucide-trash-2" class="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                    <dl
                      v-if="detailLinesFor(svc).length"
                      class="mt-1.5 space-y-0.5 border-l border-gray-200/90 pl-2.5 text-[10.5px] leading-tight dark:border-gray-700 sm:text-[11px] sm:leading-snug"
                    >
                      <div
                        v-for="(ln, i) in detailLinesFor(svc)"
                        :key="i"
                        class="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-2"
                      >
                        <dt class="shrink-0 text-gray-400 dark:text-gray-500">{{ ln.label }}</dt>
                        <dd class="min-w-0 font-medium text-gray-700 dark:text-gray-300">{{ ln.value }}</dd>
                      </div>
                    </dl>
                    <p v-else class="mt-1 text-[11px] leading-tight text-gray-400 dark:text-gray-500">Aucune option renseignée.</p>
                  </div>
                </div>
              </li>
            </ul>

            <footer
              class="shrink-0 border-t border-gray-100 px-4 py-2 dark:border-gray-800/90"
              style="padding-bottom: max(0.5rem, env(safe-area-inset-bottom, 0px))"
            >
              <UButton type="button" color="primary" size="md" block class="justify-center font-semibold" @click="close">
                Fermer
              </UButton>
            </footer>
          </div>
        </template>
      </UModal>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { formatCareSelectValueWithAutreDetail, isCareAutreDetailKey } from '~/utils/care-category-autre-detail';
import { resolveCareCategoryImageSrc } from '~/utils/care-icons';
import { isBloodTestAppointment, isNursingAppointment } from '~/utils/appointment-type-rules';
import type { SelectedServiceInput } from '~/utils/dashboard-unified-rdv';
import type { BookingServiceFormSlice } from '~/utils/booking-service-form-slice';
import { getNursingDurationLabel, NURSING_FREQUENCY_OPTIONS, showNursingFrequency } from '~/constants/nursing-duration';
import { careAutreDetailPopoverModalContentProps } from '~/utils/care-autre-detail-popover-modal-guard';

export type CartSummaryCategory = {
  id: string;
  name: string;
  type: string;
  icon?: string | null;
  image_url?: string | null;
  options?: Array<{
    option_key: string;
    label: string;
    field_type: string;
    options?: { value: string; label: string }[];
    is_required?: boolean;
    sort_order?: number;
  }>;
};

const props = defineProps<{
  headline: string;
  selectedServices: SelectedServiceInput[];
  categories: CartSummaryCategory[];
  formDataByService?: Record<string, BookingServiceFormSlice | undefined> | null;
}>();

const emit = defineEmits<{
  removeService: [serviceId: string];
}>();

const modalOpen = ref(false);
const config = useRuntimeConfig();

const modalTitle = computed(() => {
  const n = props.selectedServices.length;
  return n <= 1 ? 'Votre soin' : `Vos ${n} soins`;
});

const detailActionLabel = computed(() => {
  const n = props.selectedServices.length;
  if (n <= 0) return 'Aucun soin';
  return n === 1 ? 'Voir le détail du soin' : 'Détails des soins';
});

function imageSrcFor(svc: SelectedServiceInput): string | null {
  return resolveCareCategoryImageSrc(svc.category_image_url ?? null, config.public.apiBase);
}

function categoryFor(svc: SelectedServiceInput): CartSummaryCategory | undefined {
  const id = svc.category_id;
  if (id == null) return undefined;
  return props.categories.find((c) => String(c.id) === String(id));
}

function sliceFor(svc: SelectedServiceInput): BookingServiceFormSlice | undefined {
  return props.formDataByService?.[svc.id];
}

const multipleDaysLabels: Record<string, string> = {
  '2': '2 jours',
  '3': '3 jours',
  '5': '5 jours',
  '7': '7 jours',
  '10': '10 jours',
  '15': '15 jours',
  custom: 'Durée personnalisée',
};

function frequencyLabel(v: string | undefined): string {
  if (!v) return '';
  const o = NURSING_FREQUENCY_OPTIONS.find((x) => x.value === v);
  return o?.label ?? v;
}

function genderLabel(v: string | undefined): string {
  if (v === 'female') return 'Infirmière';
  if (v === 'male') return 'Infirmier';
  return 'Indifférent';
}

function formatCareOptionRows(
  svc: SelectedServiceInput,
  cat: CartSummaryCategory | undefined,
  co: Record<string, string | number> | undefined,
): { label: string; value: string }[] {
  if (!cat?.options?.length || !co) return [];
  const rows: { label: string; value: string }[] = [];
  for (const opt of [...cat.options].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))) {
    if (isCareAutreDetailKey(opt.option_key)) continue;
    const raw = co[opt.option_key];
    if (raw === '' || raw === undefined || raw === null) continue;
    if (opt.field_type === 'select') {
      const choice = opt.options?.find((o) => String(o.value) === String(raw));
      const baseLabel = choice?.label ?? String(raw);
      const display = formatCareSelectValueWithAutreDetail(baseLabel, opt.option_key, raw, co as Record<string, unknown>);
      rows.push({ label: opt.label, value: display });
    } else {
      rows.push({ label: opt.label, value: String(raw) });
    }
  }
  return rows;
}

function detailLinesFor(svc: SelectedServiceInput): { label: string; value: string }[] {
  const slice = sliceFor(svc);
  const cat = categoryFor(svc);
  const rows: { label: string; value: string }[] = [];

  if (!slice) {
    return formatCareOptionRows(svc, cat, undefined);
  }

  if (isBloodTestAppointment(svc.type)) {
    if (slice.blood_test_type === 'single') {
      rows.push({ label: 'Prélèvement', value: 'Une seule fois' });
    } else if (slice.blood_test_type === 'multiple') {
      rows.push({ label: 'Prélèvement', value: 'Sur plusieurs jours' });
      if (slice.duration_days === 'custom' && slice.custom_days != null && slice.custom_days > 0) {
        rows.push({ label: 'Durée', value: `${slice.custom_days} jours` });
      } else if (slice.duration_days && slice.duration_days !== 'custom') {
        rows.push({ label: 'Durée', value: multipleDaysLabels[slice.duration_days] ?? slice.duration_days + ' jours' });
      }
    }
  }

  if (isNursingAppointment(svc.type)) {
    const dur = getNursingDurationLabel(slice.duration_days, slice.custom_days ?? null);
    if (dur) rows.push({ label: 'Prise en charge', value: dur });
    if (showNursingFrequency(slice.duration_days)) {
      const fq = frequencyLabel(slice.frequency);
      if (fq) rows.push({ label: 'Fréquence', value: fq });
    }
    rows.push({ label: 'Préférence', value: genderLabel(slice.preferred_nurse_gender) });
  }

  rows.push(...formatCareOptionRows(svc, cat, slice.care_options));
  return rows;
}

function confirmRemove(svc: SelectedServiceInput): void {
  const willBeEmpty = props.selectedServices.length <= 1;
  emit('removeService', svc.id);
  if (willBeEmpty) modalOpen.value = false;
}
</script>

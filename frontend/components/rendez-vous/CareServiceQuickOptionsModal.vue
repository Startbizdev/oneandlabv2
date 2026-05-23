<template>
  <ClientOnly>
    <Teleport to="body">
      <UModal
        v-model:open="openProxy"
        :content="careAutreDetailPopoverModalContentProps"
        :ui="{ content: 'max-w-[min(100vw-1.25rem,20rem)] w-full rounded-xl p-0 shadow-lg sm:max-w-[22rem]' }"
      >
        <template #content="{ close }">
          <div
            class="relative flex max-h-[min(92dvh,32rem)] flex-col overflow-hidden rounded-xl bg-default ring-1 ring-default"
            role="dialog"
            aria-labelledby="care-quick-opt-title"
          >
            <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3 pt-3 sm:px-4 sm:pb-3 sm:pt-3.5">
              <!-- Visuel + titre + fermer sur une même ligne → pas de marge vide en haut -->
              <div class="mb-2.5 flex items-start gap-2.5">
                <div
                  class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200/90 bg-white p-0.5 dark:border-gray-700 dark:bg-gray-950"
                >
                  <CareCategoryVisual
                    v-if="category"
                    :emoji="headerEmoji"
                    :image-src="headerImageSrc"
                    :icon-name="headerIconName"
                    img-class="block max-h-full max-w-full min-h-0 min-w-0 object-contain"
                    :icon-class="headerIconVisualClass"
                  />
                </div>
                <div class="min-w-0 flex-1 self-center">
                  <h2 id="care-quick-opt-title" class="text-sm font-semibold leading-tight text-highlighted">
                    {{ category?.name || 'Soin' }}
                  </h2>
                  <p class="mt-0.5 text-[11px] leading-snug text-muted">
                    Paramétrez votre soin
                  </p>
                </div>
                <button
                  type="button"
                  class="-mr-1 -mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-elevated hover:text-default focus:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:-mr-0.5"
                  aria-label="Fermer"
                  @click="close"
                >
                  <UIcon name="i-lucide-x" class="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div class="space-y-2.5">
                <UAlert
                  v-if="localError"
                  color="error"
                  variant="soft"
                  icon="i-lucide-alert-circle"
                  :title="localError"
                  class="text-xs"
                  :ui="{ title: 'text-xs font-medium' }"
                />

                <template v-for="opt in sortedCategoryOptions" :key="`${category?.id}-${opt.option_key}`">
                  <template v-if="opt.field_type === 'select'">
                    <UFormField :label="opt.label" :required="!!opt.is_required" size="sm">
                      <USelect
                        v-model="draft.care_options![opt.option_key]"
                        :items="(opt.options || []).map((o) => ({ label: o.label, value: o.value }))"
                        value-key="value"
                        placeholder="Choisir une option"
                        size="md"
                        class="w-full"
                      />
                    </UFormField>
                    <UFormField
                      v-if="categorySelectHasAutreOption(opt) && isAutreSelectValue(draft.care_options![opt.option_key])"
                      label="Précisez"
                      :required="true"
                      size="sm"
                    >
                      <CareAutreDetailInput
                        v-model="draft.care_options![careAutreDetailKey(opt.option_key)]"
                        :category-name="category?.name"
                        :category-type="category?.type"
                        placeholder="Tapez ou choisissez une suggestion"
                        size="md"
                      />
                    </UFormField>
                  </template>
                  <UFormField v-else-if="opt.field_type === 'text'" :label="opt.label" :required="!!opt.is_required" size="sm">
                    <CareAutreDetailInput
                      v-model="draft.care_options![opt.option_key]"
                      :category-name="category?.name"
                      :category-type="category?.type"
                      placeholder="Tapez ou choisissez une suggestion"
                      size="md"
                    />
                  </UFormField>
                  <UFormField v-else-if="opt.field_type === 'number'" :label="opt.label" :required="!!opt.is_required" size="sm">
                    <UInput v-model.number="draft.care_options![opt.option_key]" type="number" placeholder="" size="md" class="w-full" />
                  </UFormField>
                </template>

                <template v-if="showBloodSchedulingFields">
                  <UFormField label="Type de prélèvement" required size="sm">
                    <USelect
                      v-model="draft.blood_test_type"
                      :items="bloodTestTypeOptions"
                      value-key="value"
                      placeholder="Choisir une option"
                      size="md"
                      class="w-full"
                    />
                  </UFormField>
                  <template v-if="draft.blood_test_type === 'multiple'">
                    <UFormField label="Nombre de jours" required size="sm">
                      <div class="space-y-2">
                        <USelect
                          v-model="draft.duration_days"
                          :items="multipleDaysOptions"
                          value-key="value"
                          placeholder="Choisir une option"
                          size="md"
                          class="w-full"
                        />
                        <UInput
                          v-if="draft.duration_days === 'custom'"
                          v-model.number="draft.custom_days"
                          type="number"
                          placeholder="Jours"
                          min="1"
                          size="md"
                          class="w-full"
                        />
                      </div>
                    </UFormField>
                  </template>
                </template>

                <template v-if="showNursingCommonFields">
                  <UFormField label="Prise en charge" required size="sm">
                    <div class="space-y-2">
                      <USelect
                        v-model="draft.duration_days"
                        :items="durationOptions"
                        value-key="value"
                        placeholder="Choisir une option"
                        size="md"
                        class="w-full"
                      />
                      <UInput
                        v-if="draft.duration_days === 'custom'"
                        v-model.number="draft.custom_days"
                        type="number"
                        placeholder="Jours"
                        size="md"
                        class="w-full"
                        min="1"
                      />
                    </div>
                  </UFormField>
                  <UFormField
                    v-if="showNursingFrequency(draft.duration_days)"
                    label="Fréquence"
                    required
                    size="sm"
                  >
                    <USelect
                      v-model="draft.frequency"
                      :items="frequencyOptions"
                      value-key="value"
                      placeholder="Choisir une option"
                      size="md"
                      class="w-full"
                    />
                  </UFormField>
                </template>
              </div>
            </div>

            <!-- Pied fixe : CTA toujours visible -->
            <div
              class="shrink-0 border-t border-default bg-default px-4 py-3 sm:px-4"
              style="padding-bottom: max(0.75rem, env(safe-area-inset-bottom, 0px))"
            >
              <UButton type="button" block size="lg" class="w-full justify-center font-semibold" @click="confirm(close)">
                Valider et ajouter
              </UButton>
            </div>
          </div>
        </template>
      </UModal>
    </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { NURSING_DURATION_OPTIONS, NURSING_FREQUENCY_OPTIONS, showNursingFrequency } from '~/constants/nursing-duration';
import {
  isBloodTestAppointment,
  isNursingAppointment,
} from '~/utils/appointment-type-rules';
import { careCategoryEmojiForCategory, isCareCategoryEmoji } from '@oneandlab/shared-utils';
import { resolveCareCategoryImageSrc, resolveCareIconFromCategory, defaultColorClassForCategory } from '~/utils/care-icons';
import {
  careAutreDetailKey,
  categorySelectHasAutreOption,
  isAutreSelectValue,
  stripOrphanAutreDetailKeys,
} from '~/utils/care-category-autre-detail';
import { careAutreDetailPopoverModalContentProps } from '~/utils/care-autre-detail-popover-modal-guard';
import type { SelectedServiceInput } from '~/utils/dashboard-unified-rdv';
import type { BookingServiceFormSlice } from '~/utils/booking-service-form-slice';

export type QuickModalCategoryRow = {
  id: string;
  name: string;
  type: string;
  icon?: string | null;
  image_url?: string | null;
};

type CategoryOpt = {
  option_key: string;
  label: string;
  field_type: string;
  options?: { value: string; label: string }[];
  is_required?: boolean;
  sort_order?: number;
};

const props = defineProps<{
  modelValue: boolean;
  category: QuickModalCategoryRow | null;
  categories?: Array<{ id: string; options?: CategoryOpt[] }>;
  /** Premier prélèvement / premier soin infirmier : affiche aussi type prélèvement ou prise en charge commune. */
  onlyCategoryOptions: boolean;
  /** ligne panier après validation du modal */
  buildServiceLine: (cat: QuickModalCategoryRow) => SelectedServiceInput;
}>();

const emit = defineEmits<{
  'update:modelValue': [boolean];
  confirm: [payload: { service: SelectedServiceInput; slice: BookingServiceFormSlice }];
}>();

const config = useRuntimeConfig();

const openProxy = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
});

const localError = ref('');

watch(
  () => props.modelValue,
  (o) => {
    if (!o) localError.value = '';
  },
);

const headerEmoji = computed(() => {
  const c = props.category;
  if (!c) return '';
  return careCategoryEmojiForCategory({ name: c.name, icon: c.icon, type: c.type });
});

const headerImageSrc = computed(() => {
  const c = props.category;
  if (!c || isCareCategoryEmoji(c.icon)) return null;
  return resolveCareCategoryImageSrc(c.image_url ?? null, config.public.apiBase as string);
});

const headerIconName = computed(() => {
  const c = props.category;
  if (!c) return 'i-lucide-heart-pulse';
  return resolveCareIconFromCategory({ icon: c.icon, type: c.type });
});

const headerIconVisualClass = computed(() => {
  const c = props.category;
  const accent = c ? defaultColorClassForCategory(c.type) : 'text-gray-600 dark:text-gray-400';
  return `max-h-[92%] max-w-[92%] shrink-0 ${accent}`;
});

const sortedCategoryOptions = computed((): CategoryOpt[] => {
  const cid = props.category?.id;
  if (cid == null) return [];
  const cat = props.categories?.find((entry) => String(entry.id) === String(cid));
  const opts = cat?.options ?? [];
  return [...opts].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
});

const draft = reactive<{
  care_options: Record<string, string | number>;
  blood_test_type: string;
  duration_days: string;
  custom_days: number | null;
  frequency: string;
}>({
  care_options: {},
  blood_test_type: 'single',
  duration_days: '1',
  custom_days: null,
  frequency: '',
});

function seedCareOptionKeys(): void {
  const next: Record<string, string | number> = {};
  for (const o of sortedCategoryOptions.value) {
    next[o.option_key] = draft.care_options[o.option_key] ?? (o.field_type === 'number' ? 0 : '');
    if (o.field_type === 'select' && categorySelectHasAutreOption(o)) {
      const dk = careAutreDetailKey(o.option_key);
      next[dk] = draft.care_options[dk] ?? '';
    }
  }
  draft.care_options = next;
}

watch(
  () => [props.modelValue, props.category?.id] as const,
  () => {
    if (!props.modelValue || !props.category) return;
    localError.value = '';
    draft.blood_test_type = 'single';
    draft.duration_days = '1';
    draft.custom_days = null;
    draft.frequency = '';
    draft.care_options = {};
    seedCareOptionKeys();
  },
);

watch(sortedCategoryOptions, seedCareOptionKeys, { flush: 'post' });

watch(
  () => draft.care_options,
  (co) => {
    for (const o of sortedCategoryOptions.value) {
      if (o.field_type !== 'select' || !categorySelectHasAutreOption(o)) continue;
      if (!isAutreSelectValue(co[o.option_key])) {
        const dk = careAutreDetailKey(o.option_key);
        if (co[dk] !== undefined && co[dk] !== '') draft.care_options[dk] = '';
      }
    }
  },
  { deep: true },
);

const showBloodSchedulingFields = computed(
  () => props.category != null && isBloodTestAppointment(props.category.type) && !props.onlyCategoryOptions,
);

const showNursingCommonFields = computed(
  () => props.category != null && isNursingAppointment(props.category.type) && !props.onlyCategoryOptions,
);

const bloodTestTypeOptions = [
  { label: 'Une seule fois', value: 'single' },
  { label: 'Plusieurs jours', value: 'multiple' },
];

const multipleDaysOptions = [
  { label: '2 jours', value: '2' },
  { label: '3 jours', value: '3' },
  { label: '5 jours', value: '5' },
  { label: '7 jours', value: '7' },
  { label: '10 jours', value: '10' },
  { label: '15 jours', value: '15' },
  { label: 'Personnalisé', value: 'custom' },
];

const frequencyOptions = NURSING_FREQUENCY_OPTIONS;
const durationOptions = NURSING_DURATION_OPTIONS;

function validate(): string | null {
  const cat = props.category;
  if (!cat) return 'Soin invalide';

  for (const o of sortedCategoryOptions.value) {
    if (!o.is_required) continue;
    const v = draft.care_options[o.option_key];
    if (v === '' || v === undefined || v === null) {
      return `« ${o.label} » obligatoire`;
    }
  }

  for (const o of sortedCategoryOptions.value) {
    if (o.field_type !== 'select' || !categorySelectHasAutreOption(o)) continue;
    const v = draft.care_options[o.option_key];
    if (!isAutreSelectValue(v)) continue;
    const dk = careAutreDetailKey(o.option_key);
    const d = draft.care_options[dk];
    if (d === '' || d === undefined || d === null || String(d).trim() === '') {
      return `« ${o.label} » : précisez votre choix (Autre)`;
    }
  }

  if (showBloodSchedulingFields.value) {
    if (!draft.blood_test_type) return 'Type de prélèvement obligatoire';
    if (draft.blood_test_type === 'multiple') {
      if (!draft.duration_days) return 'Nombre de jours obligatoire';
      if (draft.duration_days === 'custom' && (!draft.custom_days || draft.custom_days < 1)) {
        return 'Nombre de jours invalide';
      }
    }
  }

  if (showNursingCommonFields.value) {
    if (!draft.duration_days) return 'Prise en charge obligatoire';
    if (draft.duration_days !== '1' && draft.duration_days !== 'to_define' && !draft.frequency) {
      return 'Fréquence obligatoire';
    }
  }

  return null;
}

function confirm(close: () => void): void {
  const err = validate();
  if (err) {
    localError.value = err;
    return;
  }
  if (!props.category) return;

  const service = props.buildServiceLine(props.category);
  const coPayload = { ...draft.care_options };
  stripOrphanAutreDetailKeys(coPayload);
  const slice: BookingServiceFormSlice = {
    care_options: coPayload,
  };

  if (showBloodSchedulingFields.value) {
    slice.blood_test_type = draft.blood_test_type;
    if (draft.blood_test_type === 'multiple') {
      slice.duration_days = draft.duration_days;
      slice.custom_days = draft.duration_days === 'custom' ? draft.custom_days : null;
    } else {
      slice.duration_days = undefined;
      slice.custom_days = null;
    }
  }

  if (showNursingCommonFields.value) {
    slice.duration_days = draft.duration_days;
    slice.custom_days = draft.duration_days === 'custom' ? draft.custom_days : null;
    slice.frequency = showNursingFrequency(draft.duration_days) ? draft.frequency : '';
  }

  emit('confirm', { service, slice });
  close();
}
</script>

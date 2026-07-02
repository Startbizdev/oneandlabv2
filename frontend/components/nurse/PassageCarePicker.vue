<template>
  <div class="space-y-3">
    <div v-if="!modelValue.length" class="text-sm text-muted">
      Aucun soin ajouté. Choisissez un soin ci-dessous.
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="item in modelValue"
        :key="item.category_id"
        class="flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2"
      >
        <span class="text-sm font-medium">{{ displayLabel(item) }}</span>
        <UButton
          icon="i-lucide-x"
          size="xs"
          variant="ghost"
          color="neutral"
          aria-label="Retirer le soin"
          @click="removeItem(item.category_id)"
        />
      </div>
    </div>

    <UButton variant="outline" icon="i-lucide-plus" block @click="pickerOpen = true">
      Ajouter un soin
    </UButton>

    <UModal v-model:open="pickerOpen" :ui="{ content: 'max-w-lg w-full' }">
      <template #content>
        <div class="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold">Choisir un soin</h3>
            <UButton icon="i-lucide-x" variant="ghost" color="neutral" @click="pickerOpen = false" />
          </div>
          <div class="space-y-2">
            <button
              v-for="cat in categories"
              :key="cat.id"
              type="button"
              class="flex w-full items-center gap-3 rounded-lg border border-default px-3 py-3 text-left transition hover:bg-elevated disabled:opacity-50"
              :disabled="isTaken(cat.id)"
              @click="pickCategory(cat)"
            >
              <span class="text-xl">{{ categoryEmoji(cat) }}</span>
              <span class="font-medium">{{ cat.name }}</span>
            </button>
          </div>
        </div>
      </template>
    </UModal>

    <CareServiceQuickOptionsModal
      v-model="optionsOpen"
      :category="optionsCategory"
      :categories="categories"
      :only-category-options="true"
      :build-service-line="buildServiceLine"
      @confirm="onOptionsConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import type { NursePassageNursingItem } from '@oneandlab/shared-types';
import type { SelectedServiceInput } from '@oneandlab/shared-utils';
import { isCareCategoryWithoutBookingOptions } from '@oneandlab/shared-utils';
import type { BookingServiceFormSlice } from '~/utils/booking-service-form-slice';
import { buildPassageNursingItemLabel } from '~/utils/passage-nursing-item-label';
import { careCategoryEmojiForCategory } from '@oneandlab/shared-utils';
import CareServiceQuickOptionsModal from '~/components/rendez-vous/CareServiceQuickOptionsModal.vue';
import type { QuickModalCategoryRow } from '~/components/rendez-vous/CareServiceQuickOptionsModal.vue';
import { apiFetch } from '~/utils/api';

type CareCategoryRow = QuickModalCategoryRow & { id: string; name: string; type: string };

const props = defineProps<{
  modelValue: NursePassageNursingItem[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: NursePassageNursingItem[]];
}>();

const categories = ref<CareCategoryRow[]>([]);
const pickerOpen = ref(false);
const optionsOpen = ref(false);
const optionsCategory = ref<CareCategoryRow | null>(null);

const takenIds = computed(() => new Set(props.modelValue.map((i) => i.category_id)));

function isTaken(id: string) {
  return takenIds.value.has(id);
}

function categoryEmoji(cat: CareCategoryRow) {
  return careCategoryEmojiForCategory({ name: cat.name, icon: cat.icon, type: cat.type }) || '💉';
}

function displayLabel(item: NursePassageNursingItem) {
  const cat = categories.value.find((c) => String(c.id) === String(item.category_id));
  return item.label || buildPassageNursingItemLabel(cat, item.care_options);
}

function buildServiceLine(cat: QuickModalCategoryRow): SelectedServiceInput {
  return {
    id: cat.id,
    type: cat.type,
    name: cat.name,
    category_id: cat.id,
  };
}

async function ensureCategoryReady(cat: CareCategoryRow): Promise<CareCategoryRow> {
  if ((cat.options?.length ?? 0) > 0) return cat;
  const res = await apiFetch<NonNullable<CareCategoryRow['options']>>(
    `/categories?category_options_for=${encodeURIComponent(cat.id)}`,
  );
  const options = res?.data ?? [];
  const patched = { ...cat, options };
  categories.value = categories.value.map((c) => (c.id === cat.id ? patched : c));
  return patched;
}

async function pickCategory(cat: CareCategoryRow) {
  if (isTaken(cat.id)) return;
  const ready = await ensureCategoryReady(cat);
  const optionCount = ready.options?.length ?? 0;
  if (isCareCategoryWithoutBookingOptions(ready) || optionCount === 0) {
    addItem({ category_id: ready.id, label: ready.name });
    pickerOpen.value = false;
    return;
  }
  optionsCategory.value = ready;
  optionsOpen.value = true;
}

function onOptionsConfirm(payload: { service: SelectedServiceInput; slice: BookingServiceFormSlice }) {
  const cat = optionsCategory.value;
  if (!cat) return;
  const careOptions = payload.slice.care_options ?? {};
  addItem({
    category_id: cat.id,
    label: buildPassageNursingItemLabel(cat, careOptions),
    ...(Object.keys(careOptions).length ? { care_options: careOptions } : {}),
  });
  optionsOpen.value = false;
  optionsCategory.value = null;
  pickerOpen.value = false;
}

function addItem(item: NursePassageNursingItem) {
  if (takenIds.value.has(item.category_id)) return;
  emit('update:modelValue', [...props.modelValue, item]);
}

function removeItem(categoryId: string) {
  emit(
    'update:modelValue',
    props.modelValue.filter((i) => i.category_id !== categoryId),
  );
}

onMounted(async () => {
  const res = await apiFetch<CareCategoryRow[]>('/categories?type=nursing&scope=picker');
  categories.value = (res?.data ?? []) as CareCategoryRow[];
});
</script>

<template>
  <UInputMenu
    :model-value="stringValue"
    class="care-autre-detail-input w-full min-w-0 max-w-full"
    :items="menuItems"
    :placeholder="placeholder"
    :size="size"
    create-item="always"
    v-model:search-term="searchDraft"
    :reset-search-term-on-blur="false"
    :open-on-focus="true"
    ignore-filter
    :ui="{
      root: 'relative !flex w-full min-w-0 max-w-full items-center',
      base: 'w-full min-w-0 max-w-full flex-1',
      item: 'gap-1.5',
      itemLabel: 'min-w-0 !whitespace-normal text-left text-sm',
    }"
    :content="{
      class:
        'care-autre-detail-popover max-h-[min(55vh,320px)] min-w-[min(100vw-2rem,18rem)] max-w-[min(100vw-2rem,26rem)] z-[200000]',
      side: 'bottom',
      sideOffset: 8,
      collisionPadding: 16,
      position: 'popper',
    }"
    @update:model-value="onModelUpdate"
    @create="onCreate"
    @blur="onMenuBlur"
  >
    <template #create-item-label="{ item }">
      <span class="text-sm text-muted">Utiliser</span>
      <span class="ml-1 text-sm font-medium text-highlighted">« {{ item }} »</span>
    </template>
    <template #item-label="{ item: row }">
      <span class="care-autre-sugg-label min-w-0 text-sm leading-snug whitespace-normal break-words">
        <template v-for="(seg, si) in segmentsForLabel(asRowLabel(row))" :key="si">
          <strong
            v-if="seg.bold"
            class="font-semibold text-primary-600 dark:text-primary-400"
          >{{ seg.text }}</strong>
          <span v-else>{{ seg.text }}</span>
        </template>
      </span>
    </template>
    <template #empty="{ searchTerm: q }">
      <span v-if="q" class="text-xs text-muted">Aucune suggestion — validez avec « Utiliser » ci-dessous.</span>
      <span v-else class="text-xs text-muted">Tapez pour filtrer…</span>
    </template>
  </UInputMenu>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { accentInsensitiveHighlightSegments } from '~/utils/accent-insensitive-highlight';
import { careAutreDetailSuggestionsForCategory } from '~/utils/care-autre-detail-suggestions';

const props = withDefaults(
  defineProps<{
    modelValue: string | number | null | undefined;
    categoryName?: string | null;
    categoryType?: string | null;
    placeholder?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
  }>(),
  {
    placeholder: 'Tapez ou choisissez une suggestion',
    size: 'md',
  },
);

const emit = defineEmits<{
  'update:modelValue': [string];
}>();

const stringValue = computed(() => String(props.modelValue ?? ''));

const suggestions = computed(() =>
  careAutreDetailSuggestionsForCategory(props.categoryName, props.categoryType),
);

/**
 * Filtre accent-insensible + scoring comme avant (meilleures suggestions en premier).
 * `ignore-filter` sur UInputMenu pour appliquer notre logique sur la liste passée en `items`.
 */
const menuItems = computed(() => {
  const pool = suggestions.value;
  const q = searchDraft.value.trim();
  if (!q) return pool.slice(0, 18);

  function rank(s: string): number {
    const S = s
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase();
    const Q = q
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase();
    if (!Q) return 0;
    if (S.startsWith(Q)) return 0;
    const i = S.indexOf(Q);
    if (i >= 0) return 10 + i;
    const words = S.split(/[\s,;/]+/).filter(Boolean);
    for (let w = 0; w < words.length; w++) {
      if (words[w]!.startsWith(Q)) return 50 + w;
    }
    return 1000;
  }

  return [...pool]
    .map((s) => ({ s, r: rank(s) }))
    .filter((x) => x.r < 1000)
    .sort((a, b) => a.r - b.r || a.s.localeCompare(b.s, 'fr', { sensitivity: 'base' }))
    .slice(0, 18)
    .map((x) => x.s);
});

const searchDraft = ref('');

watch(
  () => props.modelValue,
  (v) => {
    searchDraft.value = String(v ?? '');
  },
  { immediate: true },
);

function onModelUpdate(v: unknown) {
  emit('update:modelValue', String(v ?? ''));
}

function onCreate(item: string) {
  emit('update:modelValue', String(item ?? ''));
}

function onMenuBlur() {
  const t = searchDraft.value.trim();
  if (t !== stringValue.value.trim()) {
    emit('update:modelValue', t);
  }
}

function asRowLabel(row: unknown): string {
  if (row == null) return '';
  if (typeof row === 'string') return row;
  if (typeof row === 'object' && 'label' in row && row.label != null) return String((row as { label: unknown }).label);
  return String(row);
}

function segmentsForLabel(label: string) {
  return accentInsensitiveHighlightSegments(label, searchDraft.value);
}
</script>

<style scoped>
/* Largeur : le thème UInputMenu utilise inline-flex sur root → sans ça le champ ne s’étire pas dans UFormField. */
.care-autre-detail-input :deep(input) {
  width: 100%;
  min-width: 0;
  font-size: 16px;
}
.care-autre-detail-input :deep([class*='itemLabel']) .care-autre-sugg-label,
.care-autre-detail-input :deep(.truncate) .care-autre-sugg-label {
  white-space: normal;
  font-size: inherit;
  line-height: 1.45;
}
@media (min-width: 640px) {
  .care-autre-detail-input :deep(input) {
    font-size: inherit;
  }
}
</style>
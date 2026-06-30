<template>
  <div v-if="serviceRows.length > 0" class="space-y-4">
    <p class="text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 dark:text-gray-400">
      {{ title }}
    </p>
    <!-- narrowPanel : panneau latéral étroit — 1 colonne (les breakpoints sm: du viewport forcent 2 cols dans un sheet étroit). -->
    <ul
      :class="[
        'grid gap-3',
        narrowPanel ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2',
      ]"
    >
      <li
        v-for="row in serviceRows"
        :key="row.id"
        class="min-w-0 rounded-lg border border-gray-200/90 bg-white px-3 py-3 dark:border-gray-700/90 dark:bg-gray-900/40"
      >
        <div class="flex items-start gap-3">
          <span
            class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-800"
          >
            <span
              v-if="row.emoji"
              class="care-category-emoji select-none text-[1.25rem] leading-none"
              role="img"
              :aria-label="row.name"
            >{{ row.emoji }}</span>
            <CareCategoryVisual
              v-else
              :emoji="null"
              :image-src="row.imageSrc"
              :icon-name="row.iconName"
              icon-class="h-4 w-4 text-gray-600 dark:text-gray-400"
              img-class="h-4 w-4 object-contain"
            />
          </span>
          <div class="min-w-0 flex-1">
            <span class="text-sm font-medium leading-snug text-gray-900 dark:text-white break-words">{{
              row.name
            }}</span>
            <p
              v-if="row.description"
              class="mt-1 text-xs leading-relaxed text-gray-600 dark:text-gray-400 break-words"
            >
              {{ row.description }}
            </p>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { careCategoryEmojiForCategory } from '@oneandlab/shared-utils';
import { resolveCareIconFromCategory } from '~/utils/care-icons';

interface Spec {
  id: string;
  name: string;
  description?: string;
  type?: string;
  icon?: string | null;
  image_url?: string | null;
}

interface Props {
  specializations?: Spec[];
  title?: string;
  /** @deprecated conservé pour compat ; le rendu est unifié (fiche publique + panneau). */
  icon?: string;
  /** Panneau latéral / slideover : une colonne, texte qui wrap (pas de grille serrée). */
  narrowPanel?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Soins proposés',
  icon: 'i-lucide-stethoscope',
  narrowPanel: false,
});

type ServiceRow = Spec & {
  emoji: string;
  imageSrc: string | null;
  iconName: string;
};

function specType(spec: Spec): 'blood_test' | 'nursing' {
  return spec.type === 'blood_test' ? 'blood_test' : 'nursing';
}

const serviceRows = computed((): ServiceRow[] =>
  (props.specializations ?? []).map((spec) => {
    const type = specType(spec);
    const emoji = careCategoryEmojiForCategory({
      name: spec.name,
      icon: spec.icon ?? null,
      type,
    });
    return {
      ...spec,
      emoji,
      imageSrc: null,
      iconName: resolveCareIconFromCategory({ icon: spec.icon ?? null, type }),
    };
  }),
);
</script>

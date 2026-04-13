<template>
  <div v-if="specializations && specializations.length > 0" class="space-y-4">
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
        v-for="spec in specializations"
        :key="spec.id"
        class="min-w-0 rounded-lg border border-gray-200/90 bg-white px-3 py-3 dark:border-gray-700/90 dark:bg-gray-900/40"
      >
        <div class="flex items-start gap-3">
          <span
            class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-800"
          >
            <UIcon :name="specIcon(spec)" class="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </span>
          <div class="min-w-0 flex-1">
            <span class="text-sm font-medium leading-snug text-gray-900 dark:text-white break-words">{{
              spec.name
            }}</span>
            <p
              v-if="spec.description"
              class="mt-1 text-xs leading-relaxed text-gray-600 dark:text-gray-400 break-words"
            >
              {{ spec.description }}
            </p>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
interface Spec {
  id: string;
  name: string;
  description?: string;
  type?: string;
  /** Icône Nuxt UI (ex: i-lucide-stethoscope) ou nom Lucide (ex: stethoscope) */
  icon?: string | null;
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

/** Convertit l’icône stockée en admin (care_categories.icon) en nom UIcon. */
function specIcon(spec: Spec): string {
  const raw = spec?.icon;
  if (!raw || typeof raw !== 'string') return 'i-lucide-check-circle';
  const s = raw.trim();
  if (!s) return 'i-lucide-check-circle';
  if (s.startsWith('i-')) return s;
  if (s.startsWith('medical-icon:')) return 'i-medical-icon-' + s.slice('medical-icon:'.length);
  if (s.startsWith('healthicons:')) return 'i-healthicons-' + s.slice('healthicons:'.length);
  if (s.startsWith('covid:')) return 'i-covid-' + s.slice('covid:'.length);
  const name = s.replace(/^lucide:/, '').replace(/\s+/g, '-').toLowerCase();
  return name ? `i-lucide-${name}` : 'i-lucide-check-circle';
}
</script>

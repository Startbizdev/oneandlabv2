<template>
  <div v-if="specializations && specializations.length > 0" class="space-y-4">
    <!-- En-tête de section (seul accent bleu) -->
    <div class="flex items-center gap-3">
      <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex-shrink-0">
        <UIcon :name="icon" class="w-5 h-5 text-primary-600 dark:text-primary-400" />
      </div>
      <h2 class="text-xl font-normal text-gray-900 dark:text-white">{{ title }}</h2>
    </div>

    <!-- Liste compacte : 2 colonnes mobile, 3 colonnes PC -->
    <ul class="grid grid-cols-2 lg:grid-cols-3 gap-2">
      <li
        v-for="spec in specializations"
        :key="spec.id"
        class="flex items-center gap-3 py-2.5 px-3 rounded-lg border border-gray-200 dark:border-gray-700/80 bg-gray-50/50 dark:bg-gray-800/30 hover:bg-gray-100/80 dark:hover:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600 transition-colors duration-150"
      >
        <span class="flex items-center justify-center w-8 h-8 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex-shrink-0 text-gray-600 dark:text-gray-400">
          <UIcon :name="specIcon(spec)" class="w-4 h-4" />
        </span>
        <div class="flex-1 min-w-0">
          <span class="text-sm font-medium text-gray-900 dark:text-white">{{ spec.name }}</span>
          <p v-if="spec.description" class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">
            {{ spec.description }}
          </p>
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
  icon?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Soins proposés',
  icon: 'i-lucide-stethoscope',
});

/** Convertit l’icône stockée en admin (care_categories.icon) en nom UIcon. */
function specIcon(spec: Spec): string {
  const raw = spec?.icon
  if (!raw || typeof raw !== 'string') return 'i-lucide-check-circle'
  const s = raw.trim()
  if (!s) return 'i-lucide-check-circle'
  if (s.startsWith('i-')) return s
  if (s.startsWith('medical-icon:')) return 'i-medical-icon-' + s.slice('medical-icon:'.length)
  if (s.startsWith('healthicons:')) return 'i-healthicons-' + s.slice('healthicons:'.length)
  if (s.startsWith('covid:')) return 'i-covid-' + s.slice('covid:'.length)
  const name = s.replace(/^lucide:/, '').replace(/\s+/g, '-').toLowerCase()
  return name ? `i-lucide-${name}` : 'i-lucide-check-circle'
}
</script>


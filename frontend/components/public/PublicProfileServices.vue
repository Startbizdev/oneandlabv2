<template>
  <div v-if="specializations && specializations.length > 0" class="space-y-6">
    <!-- En-tête de section -->
    <div class="flex items-center gap-3 mb-6">
      <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex-shrink-0">
        <UIcon name="i-lucide-stethoscope" class="w-5 h-5 text-primary-600 dark:text-primary-400" />
      </div>
      <h2 class="text-xl font-bold text-gray-900 dark:text-white">Soins proposés</h2>
    </div>

    <!-- Liste des soins -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div
        v-for="spec in specializations"
        :key="spec.id"
        class="flex items-start gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-primary-50/50 dark:hover:bg-primary-900/20 hover:shadow-sm transition-all duration-200 group"
      >
        <!-- Icône -->
        <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex-shrink-0 group-hover:bg-primary-200 dark:group-hover:bg-primary-800/50 group-hover:scale-105 transition-all duration-200">
          <UIcon name="i-lucide-check-circle" class="w-5 h-5" />
        </div>
        
        <!-- Contenu -->
        <div class="flex-1 min-w-0">
          <h3 class="text-base font-semibold text-gray-900 dark:text-white mb-1.5 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-200">
            {{ spec.name }}
          </h3>
          <p v-if="spec.description" class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2">
            {{ spec.description }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  specializations?: Array<{
    id: string;
    name: string;
    description?: string;
    type: string;
  }>;
}

const props = defineProps<Props>();

// #region agent log - HYP B: Check component received data
if (typeof window !== 'undefined') {
  watch(() => props.specializations, (newVal) => {
    fetch('http://127.0.0.1:7242/ingest/3f73482a-700a-4695-9b7b-1e0833b5cd08', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'B',
        location: 'PublicProfileServices.vue:props',
        message: 'Component received specializations',
        data: {
          hasSpecializations: !!newVal,
          isArray: Array.isArray(newVal),
          length: newVal?.length || 0,
          value: newVal,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }, { immediate: true });
}
// #endregion
</script>


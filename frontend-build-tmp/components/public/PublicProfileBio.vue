<template>
  <div v-if="biography" class="space-y-6">
    <div class="flex items-center gap-3">
      <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30">
        <UIcon name="i-lucide-user-circle" class="w-5 h-5 text-primary-600 dark:text-primary-400" />
      </div>
      <h2 class="text-xl font-normal text-gray-900 dark:text-white tracking-tight">{{ aboutTitle || 'À propos' }}</h2>
    </div>

    <p class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
      {{ biography }}
    </p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  biography?: string | null;
  /** Titre de section : "À propos de l'infirmier(e) à domicile Marie Dupont" ou "À propos du laboratoire Labo XYZ" */
  aboutTitle?: string | null;
}>();
</script>

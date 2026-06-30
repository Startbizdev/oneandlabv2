<template>
  <div class="relative min-w-0 w-full">
    <UIcon
      name="i-lucide-search"
      class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500"
      aria-hidden="true"
    />
    <input
      v-model="searchQuery"
      type="search"
      enterkeyhint="search"
      autocomplete="off"
      placeholder="Rechercher un rendez-vous"
      class="h-9 w-full rounded-lg border border-gray-200/90 bg-white py-2 pl-9 pr-9 text-sm text-gray-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none ring-0 transition-[border-color,box-shadow,background-color] placeholder:text-gray-400 focus:border-gray-300 focus:bg-white focus:shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-gray-600 dark:focus:bg-gray-900"
      aria-label="Recherche dans la liste des rendez-vous"
    >
    <button
      v-if="searchQuery"
      type="button"
      class="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-200"
      aria-label="Effacer la recherche"
      @click="searchQuery = ''"
    >
      <UIcon name="i-lucide-x" class="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  </div>
</template>

<script setup lang="ts">
const { searchQuery } = usePatientRdvListSearch();
</script>

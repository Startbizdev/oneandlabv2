<template>
  <AppPageShell class="space-y-4">
    <template #pageHeader>
      <AppPageHeader
        :edge-bleed="false"
        title="Mes patients"
        description="Patients, documents et échanges — recherchez depuis la barre ci-dessous."
      >
        <template #actions>
          <UButton color="primary" icon="i-lucide-plus" to="/profile?newPatient=1">
            Ajouter un patient
          </UButton>
        </template>
      </AppPageHeader>
    </template>

    <div class="space-y-4 sm:space-y-5">
      <div
        class="rounded-xl border border-gray-200/80 bg-white/90 px-3 py-2.5 shadow-sm dark:border-gray-800 dark:bg-gray-900/50 sm:px-3.5 sm:py-3"
      >
        <UInput
          v-model="searchQuery"
          placeholder="Patient, document, échange…"
          icon="i-lucide-search"
          size="md"
          class="w-full min-w-0"
          :ui="{ rounded: 'rounded-lg' }"
          clearable
        />
      </div>

      <div v-if="loading" class="flex flex-col items-center justify-center py-20">
        <UIcon name="i-lucide-loader-2" class="mb-4 h-10 w-10 animate-spin text-primary-500" />
        <p class="text-[15px] font-medium text-gray-500 dark:text-gray-400">Chargement…</p>
      </div>

      <UEmpty
        v-else-if="items.length === 0"
        icon="i-lucide-users"
        :title="searchQuery.trim() ? 'Aucun résultat' : 'Votre liste de patients est vide'"
        :description="
          searchQuery.trim()
            ? 'Essayez un autre nom, un type de document ou un mot-clé.'
            : 'Ajoutez votre premier patient pour gérer ses rendez-vous, documents et échanges.'
        "
        class="py-12"
      >
        <template #actions>
          <UButton to="/profile?newPatient=1" color="primary" icon="i-lucide-plus">
            Ajouter un patient
          </UButton>
        </template>
      </UEmpty>

      <div
        v-else
        class="rounded-xl border border-gray-200/80 bg-white px-2 shadow-sm dark:border-gray-800 dark:bg-gray-900/50 sm:px-3"
      >
        <p class="px-2 pb-1 pt-3 text-xs font-medium text-gray-500 dark:text-gray-400">
          {{ listHeader }}
        </p>
        <StaffPatientHubList :items="items" @select="onSelect" />
      </div>
    </div>
  </AppPageShell>
</template>

<script setup lang="ts">
import type { StaffHubSearchItem } from '@oneandlab/shared-types';
import { staffHubItemHref, staffHubListHeader } from '~/utils/staff-patient-hub-nav';

const props = defineProps<{
  basePath: '/nurse' | '/pro';
  pageTitle: string;
}>();

useHead({ title: props.pageTitle });

const { searchQuery, items, loading, reload } = useStaffPatientHubSearch();

const listHeader = computed(() => staffHubListHeader(searchQuery.value, items.value.length));

function onSelect(item: StaffHubSearchItem) {
  navigateTo(staffHubItemHref(item, props.basePath));
}
</script>

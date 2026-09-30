<template>
  <AppPageShell class="space-y-4">
    <template #pageHeader>
      <AppPageHeader
        :edge-bleed="false"
        title="Mes patients"
        description="Patients que vous avez créés ou que votre laboratoire vous a assignés."
      >
        <template #actions>
          <UButton color="neutral" variant="outline" icon="i-lucide-user-plus" to="/profile?newPatient=1">
            Ajouter un patient
          </UButton>
          <UButton color="primary" icon="i-lucide-calendar-plus" to="/preleveur/appointments/new" data-testid="preleveur-new-rdv">
            Nouveau RDV
          </UButton>
        </template>
      </AppPageHeader>
    </template>

    <div class="space-y-4 sm:space-y-5">
      <div class="rounded-xl border border-gray-200/80 dark:border-gray-800 bg-white/90 dark:bg-gray-900/50 px-3 py-2.5 sm:px-3.5 sm:py-3 shadow-sm">
        <UInput
          v-model="searchQuery"
          placeholder="Nom, email, téléphone…"
          icon="i-lucide-search"
          size="md"
          class="w-full min-w-0"
          aria-label="Rechercher un patient"
          clearable
        />
      </div>

      <div v-if="loading" class="flex flex-col items-center justify-center py-20">
        <UIcon name="i-lucide-loader-2" class="w-10 h-10 animate-spin text-primary-500 mb-4" />
        <p class="text-[15px] text-gray-500 dark:text-gray-400 font-medium">Chargement de la liste...</p>
      </div>

      <UAlert v-else-if="loadError" color="error" variant="soft" title="Impossible de charger vos patients">
        <template #actions><UButton color="neutral" variant="outline" @click="fetchPatients">Réessayer</UButton></template>
      </UAlert>
      <UEmpty
        v-else-if="patients.length === 0"
        icon="i-lucide-users"
        title="Aucun patient"
        description="Ajoutez un patient ou demandez à votre laboratoire de vous en assigner."
        class="py-12"
        data-testid="preleveur-patients-empty"
      >
        <template #actions>
          <UButton to="/profile?newPatient=1" color="primary" icon="i-lucide-user-plus">Ajouter un patient</UButton>
        </template>
      </UEmpty>

      <PatientListCompactGrid
        v-else
        :patients="patients"
        base-path="/preleveur"
        :current-user-id="user?.id ?? null"
        data-testid="preleveur-patients-list"
      />
    </div>
  </AppPageShell>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'preleveur',
});

useHead({ title: 'Mes patients – Préleveur' });

const { user } = useAuth();
const { searchQuery, patients, loading, loadError, fetchPatients } = usePaginatedPatientsDashboard();
</script>

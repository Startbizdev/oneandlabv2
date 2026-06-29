<template>
  <UCard v-if="visible" class="overflow-hidden">
    <template #header>
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-user-cog" class="w-5 h-5 text-primary" />
          <span class="font-semibold text-gray-900 dark:text-white">Assignation</span>
        </div>
        <UBadge v-if="!optionsLoading" color="neutral" variant="subtle" size="sm">
          {{ assignment.optionsCountLabel }}
        </UBadge>
      </div>
    </template>

    <div class="space-y-5">
      <UAlert
        v-if="batchCount > 1"
        color="primary"
        variant="subtle"
        icon="i-lucide-layers"
        title="Lot multi-prélèvements"
        :description="`Cette assignation peut s’appliquer à ${batchCount} rendez-vous liés.`"
      />

      <!-- Prise de sang -->
      <template v-if="appointment?.type === 'blood_test'">
        <div
          v-if="summary.lab"
          class="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-4 py-3 text-sm"
        >
          <p class="font-medium text-gray-900 dark:text-white">Actuellement</p>
          <p class="mt-1 text-gray-600 dark:text-gray-300">
            <span class="font-medium">Labo :</span> {{ summary.lab }}
          </p>
          <p class="text-gray-600 dark:text-gray-300">
            <span class="font-medium">Préleveur :</span> {{ summary.preleveur ?? 'Non assigné' }}
          </p>
        </div>

        <div class="space-y-4">
          <div class="flex items-start gap-3">
            <div
              class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary"
            >
              1
            </div>
            <div class="min-w-0 flex-1 space-y-2">
              <label class="text-sm font-medium text-gray-800 dark:text-gray-200">
                Laboratoire ou sous-compte
              </label>
              <USelectMenu
                v-model="labModel"
                :items="assignment.labSelectItems.value"
                value-key="value"
                placeholder="Rechercher un laboratoire…"
                size="md"
                class="w-full min-w-0"
                :loading="optionsLoading"
                :search-input="{ placeholder: 'Nom, email…' }"
                :filter-fields="['label', 'description', 'group']"
              >
                <template #item="{ item }">
                  <div class="flex flex-col py-0.5">
                    <span class="font-medium">{{ item.label }}</span>
                    <span v-if="item.group" class="text-xs text-gray-500">{{ item.group }}</span>
                    <span v-if="item.description" class="text-xs text-gray-400">{{ item.description }}</span>
                  </div>
                </template>
                <template #empty>
                  <UEmpty
                    icon="i-lucide-building-2"
                    title="Aucun laboratoire"
                    description="Aucun labo actif ne correspond à votre recherche."
                    variant="naked"
                    size="sm"
                  />
                </template>
              </USelectMenu>
            </div>
          </div>

          <div class="flex items-start gap-3">
            <div
              class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary"
            >
              2
            </div>
            <div class="min-w-0 flex-1 space-y-2">
              <label class="text-sm font-medium text-gray-800 dark:text-gray-200">
                Préleveur <span class="font-normal text-gray-500">(optionnel)</span>
              </label>
              <USelectMenu
                v-model="preleveurModel"
                :items="assignment.preleveurSelectItems.value"
                value-key="value"
                :placeholder="labModel ? 'Choisir un préleveur ou laisser vide' : 'Sélectionnez d’abord un laboratoire'"
                size="md"
                class="w-full min-w-0"
                :loading="optionsLoading"
                :disabled="!labModel"
                :search-input="{ placeholder: 'Rechercher…' }"
                :filter-fields="['label', 'description']"
              >
                <template #empty>
                  <UEmpty
                    icon="i-lucide-user-check"
                    title="Aucun préleveur"
                    description="Aucun préleveur rattaché à ce laboratoire."
                    variant="naked"
                    size="sm"
                  />
                </template>
              </USelectMenu>
            </div>
          </div>
        </div>
      </template>

      <!-- Soins infirmiers -->
      <template v-else-if="appointment?.type === 'nursing'">
        <div
          v-if="summary.nurse"
          class="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-4 py-3 text-sm"
        >
          <p class="font-medium text-gray-900 dark:text-white">Actuellement</p>
          <p class="mt-1 text-gray-600 dark:text-gray-300">
            <span class="font-medium">Infirmier :</span> {{ summary.nurse }}
          </p>
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium text-gray-800 dark:text-gray-200">Infirmier</label>
          <USelectMenu
            v-model="nurseModel"
            :items="assignment.nurseSelectItems.value"
            value-key="value"
            placeholder="Rechercher un infirmier…"
            size="md"
            class="w-full min-w-0"
            :loading="optionsLoading"
            :search-input="{ placeholder: 'Nom, email…' }"
            :filter-fields="['label', 'description']"
          >
            <template #item="{ item }">
              <div class="flex flex-col py-0.5">
                <span class="font-medium">{{ item.label }}</span>
                <span v-if="item.description" class="text-xs text-gray-400">{{ item.description }}</span>
              </div>
            </template>
            <template #empty>
              <UEmpty
                icon="i-lucide-stethoscope"
                title="Aucun infirmier"
                description="Aucun infirmier actif ne correspond à votre recherche."
                variant="naked"
                size="sm"
              />
            </template>
          </USelectMenu>
        </div>
      </template>

      <UButton
        type="button"
        color="primary"
        variant="solid"
        size="md"
        leading-icon="i-lucide-check"
        :loading="reassigning"
        :disabled="!canApply"
        block
        :on-click="onApply"
      >
        Enregistrer l’assignation
      </UButton>

      <p v-if="!canApply && appointment && !optionsLoading" class="text-center text-xs text-gray-500">
        Modifiez la sélection pour enregistrer.
      </p>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { ADMIN_PRELEVEUR_NONE, useAdminAssignment } from '~/composables/useAdminAssignment';

const props = defineProps<{
  appointment: any;
  loadAppointment: () => Promise<void>;
  batchCount?: number;
}>();

const assignment = useAdminAssignment();

const optionsLoading = computed(() => assignment.optionsLoading.value);
const reassigning = computed(() => assignment.reassigning.value);

const visible = computed(() => {
  const a = props.appointment;
  return (
    a &&
    (a.type === 'blood_test' || a.type === 'nursing') &&
    ['pending', 'confirmed', 'inProgress'].includes(String(a.status))
  );
});

const batchCount = computed(() => {
  const fromApt = Number(props.appointment?.creation_batch_size ?? 0);
  if (fromApt > 1) return fromApt;
  return props.batchCount ?? 1;
});

const summary = computed(() => assignment.currentSummary(props.appointment));

const labModel = computed({
  get: () => assignment.selectedLabId.value,
  set: (v: string) => {
    assignment.selectedLabId.value = v ?? '';
  },
});

const nurseModel = computed({
  get: () => assignment.selectedNurseId.value,
  set: (v: string) => {
    assignment.selectedNurseId.value = v ?? '';
  },
});

const preleveurModel = computed({
  get: () => assignment.selectedPreleveurId.value,
  set: (v: string) => {
    assignment.selectedPreleveurId.value =
      v && v !== ADMIN_PRELEVEUR_NONE ? v : ADMIN_PRELEVEUR_NONE;
  },
});

const canApply = computed(() => {
  const a = props.appointment;
  if (!a || optionsLoading.value) return false;
  if (a.type === 'blood_test' && !assignment.selectedLabId.value) return false;
  if (a.type === 'nursing' && !assignment.selectedNurseId.value) return false;
  return assignment.hasChange(a);
});

onMounted(() => {
  void assignment.fetchOptions().then(() => {
    assignment.syncFromAppointment(props.appointment);
  });
});

watch(
  () => props.appointment,
  (app) => {
    if (app) assignment.syncFromAppointment(app);
  },
  { deep: true },
);

async function onApply() {
  if (!props.appointment?.id) return;
  await assignment.apply(props.appointment, props.loadAppointment);
}
</script>

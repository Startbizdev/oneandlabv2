<template>
  <div class="space-y-3">
    <TitleDashboard title="Mes rendez-vous" compact>
      <template #description>
        <span class="text-sm text-gray-500 dark:text-gray-400">
          Gérez vos rendez-vous.
        </span>
      </template>
      <template #actions>
        <UButton
          to="/nurse/appointments/new"
          color="primary"
          icon="i-lucide-plus"
        >
          Créer un RDV
        </UButton>
      </template>
    </TitleDashboard>

    <!-- Quota offre Découverte : une ligne compacte -->
    <div
      v-if="showDiscoveryQuota"
      class="rounded-lg border border-amber-200/90 dark:border-amber-800/80 bg-gradient-to-r from-amber-50/90 to-white/95 dark:from-amber-950/30 dark:to-gray-900/80 shadow-sm"
    >
      <div class="flex flex-wrap items-center gap-2 p-2 sm:p-2.5 sm:gap-3">
        <div
          class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-100 dark:bg-amber-900/55 text-amber-700 dark:text-amber-300"
          aria-hidden="true"
        >
          <UIcon name="i-lucide-gauge" class="w-3.5 h-3.5" />
        </div>
        <div class="min-w-0 flex-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span class="text-xs font-semibold text-gray-900 dark:text-white">Offre Découverte</span>
          <UBadge
            v-if="discoveryQuotaFull"
            color="warning"
            variant="subtle"
            size="xs"
            class="rounded font-medium"
          >
            Quota atteint
          </UBadge>
          <span v-else class="text-[10px] font-medium uppercase tracking-wide text-amber-700/90 dark:text-amber-400/90">
            Ce mois-ci
          </span>
          <div
            class="h-1 min-w-[4rem] flex-1 max-w-[140px] overflow-hidden rounded-full bg-amber-100/90 dark:bg-amber-950/50"
            role="progressbar"
            :aria-valuenow="discoveryUsed"
            :aria-valuemax="discoveryMax"
            aria-label="Rendez-vous utilisés sur le quota mensuel"
          >
            <div
              class="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600 dark:from-amber-500 dark:to-amber-400 transition-[width] duration-300 ease-out"
              :style="{ width: `${discoveryQuotaPercent}%` }"
            />
          </div>
          <span class="shrink-0 text-[11px] font-semibold tabular-nums text-amber-950 dark:text-amber-100">
            {{ discoveryUsed }}/{{ discoveryMax }}
          </span>
        </div>
        <UButton
          to="/nurse/abonnement"
          color="primary"
          size="xs"
          class="shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold"
          title="Compteur remis le 1er du mois. L’offre Pro supprime la limite."
        >
          Passer en Pro
        </UButton>
      </div>
    </div>

    <AppointmentListPage
      ref="listRef"
      base-path="/nurse"
      hide-header
      title="Mes rendez-vous"
      subtitle="Gérez vos rendez-vous"
      nurse-locked-segment="tous"
      :status-filter-api="'pending,confirmed,inProgress,planned,completed,canceled,refused'"
      @card-click="(a) => openAppointmentModal(a.id)"
    />

  <!-- Modal RDV déjà accepté par un confrère -->
  <ClientOnly>
    <Teleport to="body">
      <UModal v-model:open="showAlreadyAcceptedModal" :ui="{ content: 'max-w-md w-full' }">
        <template #content>
          <UCard class="w-full border-0">
            <div class="p-4 text-center space-y-4">
              <p class="text-lg text-gray-700 dark:text-gray-300">
                Ce RDV a déjà été accepté par un confrère 😢 D'autres arrivent !
              </p>
              <UButton color="primary" block :on-click="closeAlreadyAcceptedModal">
                Voir mes rendez-vous
              </UButton>
            </div>
          </UCard>
        </template>
      </UModal>
    </Teleport>
  </ClientOnly>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'nurse',
});

import { apiFetch } from '~/utils/api';

const route = useRoute();

const { openAppointmentModalById: openAppointmentModal } = useAppointmentModal();
const listRef = ref<{ fetchAppointments: () => void; loading?: boolean } | null>(null);

const planLimits = ref<{ plan_slug?: string; max_appointments_per_month?: number | null; appointments_count_this_month?: number } | null>(null);
const showAlreadyAcceptedModal = ref(false);

const showDiscoveryQuota = computed(() => {
  const p = planLimits.value;
  return !!(p && p.plan_slug === 'discovery' && p.max_appointments_per_month != null);
});

const discoveryMax = computed(() => Math.max(0, Number(planLimits.value?.max_appointments_per_month ?? 0)));
const discoveryUsed = computed(() => Math.max(0, Number(planLimits.value?.appointments_count_this_month ?? 0)));
const discoveryQuotaPercent = computed(() => {
  const m = discoveryMax.value;
  if (m <= 0) return 0;
  return Math.min(100, Math.round((discoveryUsed.value / m) * 1000) / 10);
});
const discoveryQuotaFull = computed(() => discoveryMax.value > 0 && discoveryUsed.value >= discoveryMax.value);

function closeAlreadyAcceptedModal() {
  showAlreadyAcceptedModal.value = false;
  navigateTo('/nurse/appointments');
}

watch(
  () => route.query.alreadyAccepted,
  (val) => {
    if (val === '1' || val === 'true') showAlreadyAcceptedModal.value = true;
  },
  { immediate: true },
);

const refreshPlanLimits = async () => {
  try {
    const res = await apiFetch('/plan-limits', { method: 'GET' });
    if (res?.success && res?.data) planLimits.value = res.data;
  } catch {
    planLimits.value = null;
  }
};

onMounted(() => {
  refreshPlanLimits();
});

// Rafraîchir le compteur quand un RDV est accepté/refusé dans la modal (layout)
const listRefreshTrigger = useState<number>('appointments.listRefreshTrigger', () => 0);
watch(listRefreshTrigger, () => {
  refreshPlanLimits();
});
</script>

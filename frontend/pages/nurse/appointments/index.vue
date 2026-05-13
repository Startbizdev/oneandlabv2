<template>
  <AppPageShell class="space-y-3">
    <template #pageHeader>
    <AppPageHeader :edge-bleed="false" title="Mes rendez-vous" compact>
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
    </AppPageHeader>
  </template>

    <!-- Quota offre Découverte — une ligne compacte, style carte RDV -->
    <section
      v-if="showDiscoveryQuota"
      class="mb-5 shrink-0 overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.02)] dark:border-gray-800 dark:bg-gray-950"
    >
      <div class="flex flex-wrap items-center gap-x-2 gap-y-2 p-3 sm:gap-x-3 sm:gap-y-2 sm:px-4 sm:py-2.5">
        <div class="flex min-w-0 shrink-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span class="text-xs font-semibold text-gray-900 dark:text-white">Offre Découverte</span>
          <UBadge
            v-if="discoveryQuotaFull"
            color="warning"
            variant="subtle"
            size="xs"
            class="font-black uppercase tracking-tighter"
          >
            Quota atteint
          </UBadge>
          <span
            v-else
            class="text-[10px] font-bold uppercase tracking-widest text-primary-600/90 dark:text-primary-400/90"
          >
            Ce mois-ci
          </span>
        </div>

        <div
          class="flex min-h-5 min-w-0 flex-1 basis-[10rem] items-center gap-2 rounded-lg bg-gray-50/80 px-2.5 py-1.5 ring-1 ring-inset ring-gray-100 dark:bg-white/[0.03] dark:ring-white/[0.08]"
          title="Compteur remis le 1er du mois. L’offre Pro supprime la limite."
        >
          <div
            class="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-200/90 dark:bg-gray-800/90"
            role="progressbar"
            :aria-valuenow="discoveryUsed"
            :aria-valuemax="discoveryMax"
            aria-label="Rendez-vous utilisés sur le quota mensuel"
          >
            <div
              class="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-600 transition-[width] duration-300 ease-out dark:from-primary-400 dark:to-primary-500"
              :style="{ width: `${discoveryQuotaPercent}%` }"
            />
          </div>
          <span class="shrink-0 text-[11px] font-bold tabular-nums text-gray-900 dark:text-gray-100">
            {{ discoveryUsed }}/{{ discoveryMax }}
          </span>
        </div>

        <UButton
          to="/nurse/abonnement"
          color="primary"
          variant="outline"
          size="xs"
          icon="i-lucide-sparkles"
          class="w-full shrink-0 justify-center sm:w-auto sm:rounded-lg sm:px-3 sm:py-1.5 sm:text-[11px] sm:font-semibold"
          title="Compteur remis le 1er du mois. L’offre PRO supprime la limite."
        >
          Passer en PRO
        </UButton>
      </div>
    </section>

    <AppointmentListPage
      ref="listRef"
      base-path="/nurse"
      hide-header
      title="Mes rendez-vous"
      subtitle="Gérez vos rendez-vous"
      nurse-locked-segment="tous"
      nurse-compact-cards
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
  </AppPageShell>
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

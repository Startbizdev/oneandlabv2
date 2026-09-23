<template>
  <AppPageShell class="space-y-6">
    <template #pageHeader>
      <AppPageHeader :edge-bleed="false" :title="title" :description="description">
        <template #actions>
          <slot name="headerActions" />
          <UButton
            v-if="showNewButton"
            color="primary"
            icon="i-lucide-plus"
            :to="`${roleBase}/new`"
          >
            Nouvelle commande
          </UButton>
        </template>
      </AppPageHeader>
    </template>

    <div
      v-if="statsCards.length"
      class="grid gap-3 sm:grid-cols-2"
      :class="statsCards.length >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'"
    >
      <div
        v-for="card in statsCards"
        :key="card.key"
        class="rounded-xl border border-gray-200/90 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-gray-800 dark:bg-gray-950"
      >
        <p class="text-xs font-medium text-muted">{{ card.label }}</p>
        <p class="mt-1 text-2xl font-semibold tabular-nums">{{ loading ? '—' : card.value }}</p>
      </div>
    </div>

    <div class="flex flex-wrap gap-2">
      <UButton
        v-for="tab in segmentTabs"
        :key="tab.value"
        size="sm"
        :variant="segment === tab.value ? 'solid' : 'outline'"
        :color="segment === tab.value ? 'primary' : 'neutral'"
        @click="selectSegment(tab.value)"
      >
        {{ tab.label }}
        <UBadge v-if="tab.count" color="neutral" variant="subtle" size="xs" class="ml-1.5">
          {{ tab.count }}
        </UBadge>
      </UButton>
    </div>

    <div
      class="flex flex-col gap-2.5 rounded-xl border border-gray-200/90 bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-gray-800 dark:bg-gray-950 sm:flex-row sm:items-center"
    >
      <UInput
        v-model="searchQuery"
        placeholder="Rechercher…"
        icon="i-lucide-search"
        size="sm"
        clearable
        class="min-w-0 flex-1"
      />
      <UButton variant="ghost" size="sm" icon="i-lucide-refresh-cw" :loading="loading" @click="load" />
    </div>

    <div class="overflow-hidden rounded-xl border border-gray-200/90 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-gray-800 dark:bg-gray-950">
      <div v-if="loading" class="flex justify-center py-16">
        <UIcon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-primary" />
      </div>
      <UEmpty
        v-else-if="filteredOrders.length === 0"
        icon="i-lucide-pill"
        :title="segmentEmptyTitle"
        :description="segmentEmptyDescription"
        class="py-16"
      />
      <ul v-else class="divide-y divide-gray-100 dark:divide-gray-800">
        <li v-for="order in filteredOrders" :key="order.id">
          <NuxtLink
            :to="`${roleBase}/${order.id}`"
            class="flex flex-col gap-2 p-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="min-w-0">
              <p class="font-medium text-highlighted">
                {{ order.relative_display_name || order.patient_display_name || 'Patient' }}
              </p>
              <p class="text-sm text-muted">{{ order.pharmacy_display_name || 'Pharmacie' }}</p>
              <p v-if="orderedByLabel(order)" class="text-sm text-primary">
                {{ orderedByLabel(order) }}
              </p>
              <div class="flex flex-wrap items-center gap-2">
                <UBadge :color="statusColor(order.status)" variant="subtle" size="sm">
                  {{ statusLabel(order.status) }}
                </UBadge>
                <span class="text-xs text-muted">{{ fulfillmentLabel(order.fulfillment_mode) }}</span>
              </div>
              <p class="mt-1 text-sm text-muted">{{ formatDate(order.created_at) }}</p>
              <p v-if="order.desired_fulfillment_date" class="text-sm text-muted">
                Date souhaitée : {{ formatDesiredDate(order.desired_fulfillment_date) }}
              </p>
            </div>
            <UIcon name="i-lucide-chevron-right" class="h-5 w-5 shrink-0 text-muted" />
          </NuxtLink>
        </li>
      </ul>
    </div>
  </AppPageShell>
</template>

<script setup lang="ts">
import type { PharmacyOrder, PharmacyOrderStatus } from '@oneandlab/shared-types';
import { PHARMACY_FULFILLMENT_LABELS, PHARMACY_ORDER_STATUS_LABELS } from '@oneandlab/shared-constants';
import {
  countPharmacyOrdersBySegment,
  filterPharmacyOrdersBySegment,
  type PharmacyOrderListSegment,
} from '@oneandlab/shared-utils';
import { parseAppointmentDateFrance } from '@oneandlab/shared-utils';

const props = withDefaults(
  defineProps<{
    roleBase: string;
    scope: 'sent' | 'received' | 'patient' | 'all';
    title: string;
    description?: string;
    showNewButton?: boolean;
    statsVariant?: 'auto' | 'sent' | 'received' | 'admin' | 'none';
    emptyTitle?: string;
    emptyDescription?: string;
  }>(),
  {
    showNewButton: false,
    statsVariant: 'auto',
    emptyTitle: 'Aucune commande',
    emptyDescription: 'Vos commandes apparaîtront ici.',
  },
);

const toast = useAppToast();
const { fetchOrders, fetchSentStats, fetchReceivedStats, fetchAdminStats } = usePharmacyModule();

const loading = ref(true);
const orders = ref<PharmacyOrder[]>([]);
const searchQuery = ref('');
const segment = ref<PharmacyOrderListSegment>('active');
const statsCards = ref<{ key: string; label: string; value: number }[]>([]);

const segmentCounts = computed(() => countPharmacyOrdersBySegment(orders.value));

const segmentTabs = computed(() => [
  { value: 'active' as const, label: 'En cours', count: segmentCounts.value.active },
  { value: 'history' as const, label: 'Historique', count: segmentCounts.value.history },
]);

function selectSegment(value: PharmacyOrderListSegment): void {
  segment.value = value;
}

const segmentEmptyTitle = computed(() =>
  segment.value === 'active' ? 'Aucune commande en cours' : 'Aucune commande dans l’historique',
);

const segmentEmptyDescription = computed(() =>
  segment.value === 'active'
    ? props.emptyDescription
    : 'Les commandes terminées, refusées ou annulées apparaîtront ici.',
);

const filteredOrders = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  const scoped = filterPharmacyOrdersBySegment(orders.value, segment.value);
  if (!q) return scoped;
  return scoped.filter((o) =>
    [
      o.id,
      o.status,
      o.patient_display_name,
      o.relative_display_name,
      o.pharmacy_display_name,
      statusLabel(o.status),
      fulfillmentLabel(o.fulfillment_mode),
    ].join(' ').toLowerCase().includes(q),
  );
});

function statusLabel(status: PharmacyOrderStatus): string {
  return PHARMACY_ORDER_STATUS_LABELS[status] ?? status;
}

function fulfillmentLabel(mode: string): string {
  return PHARMACY_FULFILLMENT_LABELS[mode as keyof typeof PHARMACY_FULFILLMENT_LABELS] ?? mode;
}

function orderedByLabel(order: PharmacyOrder): string | null {
  if (props.scope !== 'patient') return null;
  const name = order.requester_display_name?.trim();
  if (!name || order.requester_id === order.patient_id) return null;
  if (order.requester_role === 'nurse') return `Commandé par votre infirmier · ${name}`;
  if (order.requester_role === 'pro') return `Commandé par votre professionnel · ${name}`;
  return `Commandé par ${name}`;
}

function statusColor(status: PharmacyOrderStatus): 'warning' | 'success' | 'info' | 'error' | 'neutral' {
  const map: Record<PharmacyOrderStatus, 'warning' | 'success' | 'info' | 'error' | 'neutral'> = {
    en_attente: 'warning',
    acceptee: 'success',
    en_cours: 'info',
    terminee: 'success',
    refusee: 'error',
    complement_demande: 'warning',
    annulee: 'neutral',
  };
  return map[status] ?? 'neutral';
}

function formatDate(value: string): string {
  const parsed = parseAppointmentDateFrance(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString('fr-FR', {
    timeZone: 'Europe/Paris',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDesiredDate(value: string): string {
  return new Date(`${value}T12:00:00`).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function resolvedStatsVariant(): 'sent' | 'received' | 'admin' | 'none' {
  if (props.statsVariant === 'none') return 'none';
  if (props.statsVariant !== 'auto') return props.statsVariant;
  if (props.scope === 'all') return 'admin';
  if (props.scope === 'sent') return 'sent';
  if (props.scope === 'received') return 'received';
  return 'none';
}

async function load() {
  loading.value = true;
  try {
    orders.value = await fetchOrders(props.scope);
    const variant = resolvedStatsVariant();
    if (variant === 'sent') {
      const s = await fetchSentStats();
      statsCards.value = [
        { key: 'sent', label: 'Envoyées', value: s.sent },
        { key: 'done', label: 'Terminées', value: s.completed },
      ];
    } else if (variant === 'received') {
      const s = await fetchReceivedStats();
      statsCards.value = [
        { key: 'recv', label: 'Reçues', value: s.received },
        { key: 'acc', label: 'Acceptées', value: s.accepted },
        { key: 'rate', label: 'Taux acceptation (%)', value: s.acceptance_rate },
      ];
    } else if (variant === 'admin') {
      const s = await fetchAdminStats();
      const byStatus = s.by_status ?? {};
      statsCards.value = [
        { key: 'total', label: 'Total (30 j.)', value: s.total },
        { key: 'pending', label: 'En attente', value: byStatus.en_attente ?? 0 },
        { key: 'active', label: 'En cours', value: (byStatus.acceptee ?? 0) + (byStatus.en_cours ?? 0) },
        { key: 'done', label: 'Terminées', value: byStatus.terminee ?? 0 },
      ];
    } else {
      statsCards.value = [];
    }
  } catch (e: unknown) {
    toast.add({
      title: 'Erreur',
      description: e instanceof Error ? e.message : 'Chargement impossible',
      color: 'error',
    });
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void load();
});
</script>

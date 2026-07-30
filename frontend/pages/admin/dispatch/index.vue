<template>
  <AppPageShell max-width="7xl" class="space-y-6">
    <template #pageHeader>
      <AppPageHeader
        :edge-bleed="false"
        title="Attribution des rendez-vous"
        description="Qui a créé le RDV, comment il a été proposé aux professionnels, et qui l’a accepté."
      >
        <template #actions>
          <UButton
            variant="ghost"
            size="sm"
            icon="i-lucide-refresh-cw"
            :loading="loading"
            aria-label="Actualiser"
            @click="reload"
          />
        </template>
      </AppPageHeader>
    </template>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-circle"
      :title="error"
    />

    <!-- KPIs -->
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div
        v-for="kpi in kpiCards"
        :key="kpi.key"
        class="rounded-xl border border-gray-200/90 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-gray-800 dark:bg-gray-950"
      >
        <div class="flex items-start justify-between gap-2">
          <p class="text-xs font-medium text-muted">{{ kpi.label }}</p>
          <UIcon :name="kpi.icon" class="size-4 shrink-0 text-muted" />
        </div>
        <p class="mt-1 text-2xl font-semibold tabular-nums text-gray-900 dark:text-white">
          {{ loading && !dashboardData ? '—' : kpi.value }}
        </p>
        <p v-if="kpi.hint" class="mt-1 text-xs text-muted">{{ kpi.hint }}</p>
      </div>
    </div>

    <!-- Filtres -->
    <div
      class="flex flex-col gap-2.5 rounded-xl border border-gray-200/90 bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-gray-800 dark:bg-gray-950 sm:flex-row sm:flex-wrap sm:items-center"
    >
      <UInput
        v-model="filters.search"
        placeholder="Patient, créateur, identifiant…"
        class="min-w-0 flex-1"
        icon="i-lucide-search"
        size="sm"
        clearable
        :ui="{ rounded: 'rounded-lg' }"
      />
      <div class="flex w-full shrink-0 flex-wrap gap-2 sm:w-auto sm:justify-end">
        <USelect
          v-model="filters.type"
          :items="typeOptions"
          value-key="value"
          placeholder="Type de soin"
          size="sm"
          class="min-w-[9.5rem] flex-1 sm:flex-none sm:min-w-[10.5rem]"
        />
        <USelect
          v-model="filters.status"
          :items="statusOptions"
          value-key="value"
          placeholder="Statut"
          size="sm"
          class="min-w-[9.5rem] flex-1 sm:flex-none sm:min-w-[10.5rem]"
        />
        <USelect
          v-model="filters.dispatch_mode"
          :items="dispatchModeOptions"
          value-key="value"
          placeholder="Mode d’envoi"
          size="sm"
          class="min-w-[9.5rem] flex-1 sm:flex-none sm:min-w-[11rem]"
        />
        <UInput
          v-model="filters.date_from"
          type="date"
          size="sm"
          class="min-w-[9.5rem] flex-1 sm:flex-none sm:w-36"
          aria-label="Date de début"
        />
        <UInput
          v-model="filters.date_to"
          type="date"
          size="sm"
          class="min-w-[9.5rem] flex-1 sm:flex-none sm:w-36"
          aria-label="Date de fin"
        />
        <UButton variant="outline" size="sm" class="w-full sm:w-auto" @click="clearFilters">
          Réinitialiser
        </UButton>
      </div>
    </div>

    <!-- Chargement -->
    <div v-if="loading && !tableRows.length" class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <div
        v-for="i in 6"
        :key="i"
        class="h-52 animate-pulse rounded-xl border border-gray-200/90 bg-white dark:border-gray-800 dark:bg-gray-950"
      />
    </div>

    <!-- Vide -->
    <div
      v-else-if="!loading && tableRows.length === 0"
      class="rounded-xl border border-gray-200/90 bg-white px-6 py-14 dark:border-gray-800 dark:bg-gray-950"
    >
      <UEmpty
        icon="i-lucide-radio-tower"
        title="Aucun rendez-vous trouvé"
        description="Aucun rendez-vous ne correspond à vos filtres. Élargissez la période ou réinitialisez la recherche."
        variant="naked"
        :actions="[{ label: 'Réinitialiser les filtres', variant: 'outline', onClick: clearFilters }]"
      />
    </div>

    <!-- Cartes RDV -->
    <template v-else>
      <p class="text-sm text-muted">
        {{ pagination.total }} rendez-vous
        <span v-if="pagination.total_pages > 1">
          · page {{ pagination.page }} / {{ pagination.total_pages }}
        </span>
      </p>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article
          v-for="row in tableRows"
          :key="row.id"
          class="flex flex-col rounded-xl border border-gray-200/90 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-gray-800 dark:bg-gray-950"
        >
          <div class="flex flex-1 flex-col gap-4 p-5">
            <div class="flex flex-wrap items-center gap-2">
              <UBadge
                :color="row.type === 'blood_test' ? 'error' : 'info'"
                variant="soft"
                size="sm"
              >
                {{ typeLabel(row.type) }}
              </UBadge>
              <UBadge :color="statusColor(row.status)" variant="subtle" size="sm">
                {{ statusLabel(row.status) }}
              </UBadge>
              <UBadge v-if="row.has_redispatch" color="warning" variant="soft" size="sm">
                Relancé
              </UBadge>
            </div>

            <div>
              <h2 class="text-base font-semibold text-gray-900 dark:text-white">
                {{ row.patient_display_name || 'Patient inconnu' }}
              </h2>
              <p class="mt-1 text-sm text-gray-700 dark:text-gray-300">
                {{ formatDateOnly(row.scheduled_at) }}
                <span v-if="row.creneau"> · {{ row.creneau }}</span>
              </p>
            </div>

            <dl class="space-y-2.5 text-sm">
              <div class="flex gap-2">
                <dt class="w-28 shrink-0 text-muted">Créé par</dt>
                <dd class="min-w-0 text-gray-800 dark:text-gray-200">
                  <span class="block truncate">{{ row.created_by_display_name || '—' }}</span>
                  <span class="text-xs text-muted">{{ roleLabel(row.created_by_role) }}</span>
                </dd>
              </div>
              <div class="flex gap-2">
                <dt class="w-28 shrink-0 text-muted">Envoi</dt>
                <dd class="text-gray-800 dark:text-gray-200">
                  {{ dispatchModeLabel(row.dispatch_mode) }}
                </dd>
              </div>
              <div v-if="row.preferred_lab_brand_name" class="flex gap-2">
                <dt class="w-28 shrink-0 text-muted">Marque</dt>
                <dd class="text-gray-800 dark:text-gray-200">{{ row.preferred_lab_brand_name }}</dd>
              </div>
              <div class="flex gap-2">
                <dt class="w-28 shrink-0 text-muted">Propositions</dt>
                <dd class="text-gray-800 dark:text-gray-200">
                  {{ row.pending_offers_count }} en cours
                  <span v-if="row.last_event_at" class="block text-xs text-muted">
                    Dernière activité {{ formatDateShort(row.last_event_at) }}
                  </span>
                </dd>
              </div>
              <div class="flex gap-2">
                <dt class="w-28 shrink-0 text-muted">Assigné</dt>
                <dd class="min-w-0 truncate text-gray-800 dark:text-gray-200">
                  {{ assignedSummary(row) }}
                </dd>
              </div>
            </dl>
          </div>

          <div class="border-t border-gray-100 p-4 dark:border-gray-800">
            <UButton
              block
              size="sm"
              variant="soft"
              icon="i-lucide-scan-search"
              @click="openDetail(row.id)"
            >
              Voir l’historique complet
            </UButton>
          </div>
        </article>
      </div>

      <div
        v-if="pagination.total_pages > 1"
        class="flex flex-col gap-3 rounded-xl border border-gray-200/90 bg-white p-4 dark:border-gray-800 dark:bg-gray-950 sm:flex-row sm:items-center sm:justify-between"
      >
        <p class="text-sm text-muted">
          Page {{ pagination.page }} sur {{ pagination.total_pages }}
        </p>
        <div class="flex gap-2">
          <UButton
            size="sm"
            variant="outline"
            :disabled="pagination.page <= 1 || loading"
            @click="goPage(pagination.page - 1)"
          >
            Précédent
          </UButton>
          <UButton
            size="sm"
            variant="outline"
            :disabled="pagination.page >= pagination.total_pages || loading"
            @click="goPage(pagination.page + 1)"
          >
            Suivant
          </UButton>
        </div>
      </div>
    </template>

    <!-- Détail -->
    <USlideover
      v-model:open="detailOpen"
      :title="detailTitle"
      description="Parcours complet : création, envois, propositions et acceptation."
      :ui="{ width: 'max-w-2xl', body: 'space-y-4 overflow-y-auto' }"
      @update:open="onDetailOpenChange"
    >
      <template #body>
        <div v-if="detailLoading" class="py-12 text-center text-muted">Chargement…</div>
        <UAlert
          v-else-if="detailError"
          color="error"
          variant="subtle"
          :title="detailError"
        />
        <template v-else-if="detailData">
          <UAlert
            v-if="detailData.history_incomplete"
            color="warning"
            variant="subtle"
            icon="i-lucide-info"
            :title="detailData.history_incomplete_message || 'Historique partiel'"
          />
          <div class="flex flex-wrap gap-2">
            <UButton
              color="primary"
              size="sm"
              icon="i-lucide-external-link"
              :to="`/admin/appointments/${detailData.identity.appointment_id}`"
            >
              Ouvrir le rendez-vous
            </UButton>
            <UButton
              v-if="detailData.identity.creator?.id"
              variant="outline"
              size="sm"
              :to="`/admin/users?user_id=${detailData.identity.creator.id}`"
            >
              Voir le créateur
            </UButton>
          </div>
          <AdminDispatchActorsCard :identity="detailData.identity" />
          <AdminDispatchOffersPanel
            :active-offers="detailData.active_offers"
            :dispatch-waves="detailData.dispatch_waves"
            :share-tokens="detailData.share_tokens"
          />
          <AdminDispatchTimeline :items="detailData.timeline" />
        </template>
      </template>
    </USlideover>
  </AppPageShell>
</template>

<script setup lang="ts">
import type { AdminDispatchListRow } from '@oneandlab/shared-types'
import type { AdminDispatchFilters } from '~/composables/useAdminDispatch'

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: ['super_admin'],
})

useHead({ title: 'Attribution des rendez-vous – Admin Cary' })

const {
  dashboardData,
  detailData,
  loading,
  detailLoading,
  error,
  detailError,
  fetchDashboard,
  fetchDetail,
  clearDetail,
} = useAdminDispatch()

const detailOpen = ref(false)
const selectedId = ref<string | null>(null)
const currentPage = ref(1)

const filters = reactive({
  type: 'all',
  status: 'all',
  dispatch_mode: 'all',
  date_from: '',
  date_to: '',
  search: '',
})

const typeOptions = [
  { label: 'Tous les types', value: 'all' },
  { label: 'Soins infirmiers', value: 'nursing' },
  { label: 'Prélèvement', value: 'blood_test' },
]

const statusOptions = [
  { label: 'Tous les statuts', value: 'all' },
  { label: 'En attente', value: 'pending' },
  { label: 'Confirmé', value: 'confirmed' },
  { label: 'Planifié', value: 'planned' },
  { label: 'En cours', value: 'inProgress' },
  { label: 'Terminé', value: 'completed' },
  { label: 'Annulé', value: 'canceled' },
]

const dispatchModeOptions = [
  { label: 'Tous les modes d’envoi', value: 'all' },
  { label: 'Zone géographique', value: 'zone' },
  { label: 'Invitation SMS', value: 'external_invite' },
  { label: 'Assignation directe', value: 'direct_assign' },
  { label: 'Manuel (admin)', value: 'manual' },
  { label: 'Marque patient', value: 'patient_brand_choice' },
]

const tableRows = computed(() => dashboardData.value?.rows ?? [])
const pagination = computed(
  () => dashboardData.value?.pagination ?? { page: 1, limit: 25, total: 0, total_pages: 0 },
)

const kpiCards = computed(() => {
  const kpis = dashboardData.value?.kpis
  return [
    {
      key: 'pending',
      label: 'En attente d’attribution',
      value: kpis?.pending_dispatch ?? 0,
      icon: 'i-lucide-clock-3',
      hint: 'RDV sans professionnel encore assigné',
    },
    {
      key: 'redispatch',
      label: 'Relances (24 h)',
      value: kpis?.redispatch_24h ?? 0,
      icon: 'i-lucide-rotate-ccw',
      hint: 'Nouvelle diffusion aux professionnels',
    },
    {
      key: 'invites',
      label: 'Invitations SMS (7 j)',
      value: kpis?.external_invites_7d ?? 0,
      icon: 'i-lucide-smartphone',
      hint: 'Envois hors plateforme',
    },
    {
      key: 'median',
      label: 'Délai médian d’acceptation',
      value:
        kpis?.median_accept_minutes != null ? `${kpis.median_accept_minutes} min` : '—',
      icon: 'i-lucide-timer',
      hint: 'Temps moyen avant acceptation',
    },
  ]
})

const detailTitle = computed(() => {
  if (!detailData.value) return 'Historique d’attribution'
  const name = detailData.value.identity.patient?.display_name
  return name ? `Historique — ${name}` : 'Historique d’attribution'
})

function buildFetchFilters(): AdminDispatchFilters {
  const out: AdminDispatchFilters = { page: currentPage.value, limit: 25 }
  if (filters.type && filters.type !== 'all') out.type = filters.type
  if (filters.status && filters.status !== 'all') out.status = filters.status
  if (filters.dispatch_mode && filters.dispatch_mode !== 'all') {
    out.dispatch_mode = filters.dispatch_mode
  }
  if (filters.date_from) out.date_from = filters.date_from
  if (filters.date_to) out.date_to = filters.date_to
  if (filters.search?.trim()) out.search = filters.search.trim()
  return out
}

async function reload() {
  await fetchDashboard(buildFetchFilters())
}

function clearFilters() {
  filters.type = 'all'
  filters.status = 'all'
  filters.dispatch_mode = 'all'
  filters.date_from = ''
  filters.date_to = ''
  filters.search = ''
  currentPage.value = 1
  reload()
}

function goPage(p: number) {
  currentPage.value = p
  reload()
}

async function openDetail(id: string) {
  selectedId.value = id
  detailOpen.value = true
  await fetchDetail(id)
}

function onDetailOpenChange(open: boolean) {
  if (!open) {
    selectedId.value = null
    clearDetail()
  }
}

function formatDateOnly(date: string | null): string {
  if (!date) return 'Date non définie'
  return new Date(date).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateShort(date: string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function typeLabel(type: string): string {
  if (type === 'blood_test') return 'Prélèvement'
  if (type === 'nursing') return 'Soins infirmiers'
  return type
}

function roleLabel(role: string | null | undefined): string {
  const map: Record<string, string> = {
    pro: 'Professionnel',
    nurse: 'Infirmier',
    lab: 'Laboratoire',
    subaccount: 'Sous-compte labo',
    preleveur: 'Préleveur',
    patient: 'Patient',
    super_admin: 'Administrateur',
  }
  return role ? (map[role] ?? role) : '—'
}

function dispatchModeLabel(mode: string | null | undefined): string {
  if (!mode) return 'Non renseigné'
  const map: Record<string, string> = {
    zone: 'Zone géographique',
    external_invite: 'Invitation SMS',
    direct_assign: 'Assignation directe',
    manual: 'Manuel (admin)',
    patient_brand_choice: 'Marque patient (sans dispatch)',
  }
  return map[mode] ?? mode
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'En attente',
    confirmed: 'Confirmé',
    planned: 'Planifié',
    inProgress: 'En cours',
    completed: 'Terminé',
    canceled: 'Annulé',
    expired: 'Expiré',
    refused: 'Refusé',
  }
  return map[status] ?? status
}

function statusColor(status: string): 'error' | 'primary' | 'success' | 'info' | 'warning' | 'neutral' {
  const map: Record<string, 'error' | 'primary' | 'success' | 'info' | 'warning' | 'neutral'> = {
    pending: 'warning',
    confirmed: 'success',
    planned: 'info',
    inProgress: 'primary',
    completed: 'neutral',
    canceled: 'error',
  }
  return map[status] ?? 'neutral'
}

function assignedSummary(row: AdminDispatchListRow): string {
  if (row.assigned_nurse_display_name) return `Infirmier · ${row.assigned_nurse_display_name}`
  if (row.assigned_to_display_name) return `Préleveur · ${row.assigned_to_display_name}`
  if (row.assigned_lab_display_name) return `Laboratoire · ${row.assigned_lab_display_name}`
  if (row.assigned_pro_display_name) return `Professionnel · ${row.assigned_pro_display_name}`
  return 'Personne encore assignée'
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null
watch(
  () => [
    filters.type,
    filters.status,
    filters.dispatch_mode,
    filters.date_from,
    filters.date_to,
    filters.search,
  ],
  () => {
    currentPage.value = 1
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => reload(), 300)
  },
)

onMounted(() => reload())
</script>

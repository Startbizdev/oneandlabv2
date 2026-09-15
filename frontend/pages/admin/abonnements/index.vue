<template>
  <AppPageShell max-width="7xl" class="space-y-6">
    <template #pageHeader>
      <AppPageHeader
        :edge-bleed="false"
        title="Abonnements"
        description="Suivi des formules infirmiers et laboratoires : essais, actifs, retards et annulations."
      >
        <template #actions>
          <UButton
            variant="ghost"
            size="sm"
            icon="i-lucide-refresh-cw"
            :loading="loading"
            aria-label="Actualiser"
            @click="loadSubscriptions"
          />
        </template>
      </AppPageHeader>
    </template>

    <!-- KPIs -->
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <button
        v-for="kpi in kpiCards"
        :key="kpi.key"
        type="button"
        :disabled="loading || loadError"
        :aria-pressed="statusFilter === (kpi.key === 'total' ? 'all' : kpi.key)"
        class="rounded-xl border border-gray-200/90 bg-white p-4 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-primary-500 focus-visible:outline-2 focus-visible:outline-primary-600 dark:border-gray-800 dark:bg-gray-950"
        @click="statusFilter = kpi.key === 'total' ? 'all' : kpi.key"
      >
        <div class="flex items-start justify-between gap-2">
          <p class="text-xs font-medium text-muted">{{ kpi.label }}</p>
          <UIcon :name="kpi.icon" class="size-4 shrink-0 text-muted" />
        </div>
        <p class="mt-1 text-2xl font-semibold tabular-nums text-gray-900 dark:text-white">
          {{ loading || loadError ? '—' : kpi.value }}
        </p>
        <p v-if="kpi.hint" class="mt-1 text-xs text-muted">{{ kpi.hint }}</p>
      </button>
    </div>

    <!-- Répartition -->
    <div v-if="!loading && !loadError" class="grid gap-3 sm:grid-cols-2">
      <div
        class="rounded-xl border border-gray-200/90 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-gray-800 dark:bg-gray-950"
      >
        <p class="text-xs font-medium text-muted">Par profil</p>
        <div class="mt-3 flex flex-wrap gap-2">
          <UBadge color="info" variant="soft" size="md">
            Infirmiers · {{ stats.nurses }}
          </UBadge>
          <UBadge color="primary" variant="soft" size="md">
            Laboratoires · {{ stats.labs }}
          </UBadge>
        </div>
      </div>
      <div
        class="rounded-xl border border-gray-200/90 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-gray-800 dark:bg-gray-950"
      >
        <p class="text-xs font-medium text-muted">Par offre</p>
        <div class="mt-3 flex flex-wrap gap-2">
          <UBadge
            v-for="plan in planBreakdown"
            :key="plan.slug"
            variant="subtle"
            size="md"
          >
            {{ plan.label }} · {{ plan.count }}
          </UBadge>
          <span v-if="planBreakdown.length === 0" class="text-sm text-muted">Aucune offre</span>
        </div>
      </div>
    </div>

    <!-- Filtres -->
    <div
      class="flex flex-col gap-2.5 rounded-xl border border-gray-200/90 bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-gray-800 dark:bg-gray-950 sm:flex-row sm:flex-wrap sm:items-center"
    >
      <UInput
        v-model="searchQuery"
        placeholder="Rechercher par email ou offre…"
        aria-label="Rechercher un abonnement"
        class="min-w-0 flex-1"
        icon="i-lucide-search"
        size="sm"
        clearable
        :ui="{ base: 'rounded-lg' }"
      />
      <div class="flex w-full shrink-0 flex-wrap gap-2 sm:w-auto sm:justify-end">
        <USelect
          v-model="roleFilter"
          :items="roleOptions"
          value-key="value"
          placeholder="Profil"
          aria-label="Profil de l’abonné"
          size="sm"
          class="min-w-[9.5rem] flex-1 sm:flex-none sm:min-w-[10.5rem]"
        />
        <USelect
          v-model="statusFilter"
          :items="statusOptions"
          value-key="value"
          placeholder="Statut"
          aria-label="Statut de l’abonnement"
          size="sm"
          class="min-w-[9.5rem] flex-1 sm:flex-none sm:min-w-[10.5rem]"
        />
        <UButton
          variant="outline"
          size="sm"
          class="w-full sm:w-auto"
          @click="resetFilters"
        >
          Réinitialiser
        </UButton>
      </div>
    </div>

    <!-- Chargement -->
    <div v-if="loading" class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <div
        v-for="i in 6"
        :key="i"
        class="h-56 animate-pulse rounded-xl border border-gray-200/90 bg-white dark:border-gray-800 dark:bg-gray-950"
      />
    </div>

    <div v-else-if="loadError" role="alert" class="rounded-xl border border-default bg-default p-5 space-y-3">
      <h2 class="font-semibold">Abonnements indisponibles</h2>
      <p class="text-sm text-muted">Impossible de charger les abonnements. Réessayez pour retrouver les offres et les paiements à suivre.</p>
      <UButton color="neutral" variant="outline" @click="loadSubscriptions">Réessayer</UButton>
    </div>

    <!-- Vide -->
    <div
      v-else-if="filteredSubscriptions.length === 0"
      class="rounded-xl border border-gray-200/90 bg-white px-6 py-14 dark:border-gray-800 dark:bg-gray-950"
    >
      <UEmpty
        icon="i-lucide-credit-card"
        title="Aucun abonnement"
        description="Aucun abonnement ne correspond à vos critères. Modifiez les filtres ou la recherche."
        variant="naked"
        :actions="[{ label: 'Réinitialiser les filtres', variant: 'outline', onClick: resetFilters }]"
      />
    </div>

    <!-- Cartes -->
    <template v-else>
      <p class="text-sm text-muted">
        {{ filteredSubscriptions.length }} abonnement{{ filteredSubscriptions.length > 1 ? 's' : '' }}
      </p>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article
          v-for="sub in filteredSubscriptions"
          :key="sub.id"
          class="flex flex-col rounded-xl border border-gray-200/90 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-gray-800 dark:bg-gray-950"
        >
          <div class="flex flex-1 flex-col gap-4 p-5">
            <div class="flex flex-wrap items-center gap-2">
              <UBadge :color="roleColor(sub.role)" variant="soft" size="sm">
                {{ roleLabel(sub.role) }}
              </UBadge>
              <UBadge :color="statusColor(sub.effective_status ?? sub.status)" variant="subtle" size="sm">
                {{ statusLabel(sub.effective_status ?? sub.status) }}
              </UBadge>
              <UBadge v-if="sub.needs_resync" color="warning" variant="soft" size="sm">
                Boutique à synchroniser
              </UBadge>
            </div>

            <div>
              <h2 class="truncate text-base font-semibold text-gray-900 dark:text-white">
                {{ sub.email || 'Email inconnu' }}
              </h2>
              <p class="mt-1 text-sm text-gray-700 dark:text-gray-300">
                {{ planLabel(sub.plan_slug) }}
              </p>
            </div>

            <dl class="space-y-2.5 text-sm">
              <div class="flex gap-2">
                <dt class="w-32 shrink-0 text-muted">Paiement</dt>
                <dd class="text-gray-800 dark:text-gray-200">{{ billingSourceLabel(sub.billing_source) }}</dd>
              </div>
              <div class="flex gap-2">
                <dt class="w-32 shrink-0 text-muted">Fin d’essai</dt>
                <dd class="text-gray-800 dark:text-gray-200">{{ formatTrialEnd(sub) }}</dd>
              </div>
              <div class="flex gap-2">
                <dt class="w-32 shrink-0 text-muted">Fin de période</dt>
                <dd class="text-gray-800 dark:text-gray-200">{{ formatDate(sub.current_period_end) }}</dd>
              </div>
              <div class="flex gap-2">
                <dt class="w-32 shrink-0 text-muted">Dernière MAJ</dt>
                <dd class="text-gray-800 dark:text-gray-200">{{ formatDate(sub.updated_at) }}</dd>
              </div>
            </dl>
          </div>
        </article>
      </div>
    </template>
  </AppPageShell>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: ['auth', 'role'], role: ['super_admin'] })

useHead({ title: 'Abonnements – Admin Cary' })

type SubscriptionRow = {
  id: string
  user_id: string
  email: string
  role: string
  plan_slug: string | null
  status: string
  effective_status?: string
  is_trialing?: boolean
  needs_resync?: boolean
  billing_source?: string
  trial_ends_at: string | null
  current_period_end: string | null
  updated_at: string | null
}

const loading = ref(true)
const loadError = ref(false)
const subscriptions = ref<SubscriptionRow[]>([])
const roleFilter = ref('all')
const statusFilter = ref('all')
const searchQuery = ref('')

const roleOptions = [
  { label: 'Tous les profils', value: 'all' },
  { label: 'Infirmier', value: 'nurse' },
  { label: 'Laboratoire', value: 'lab' },
]

const statusOptions = [
  { label: 'Tous les statuts', value: 'all' },
  { label: 'Actif', value: 'active' },
  { label: 'Essai gratuit', value: 'trialing' },
  { label: 'Paiement en retard', value: 'past_due' },
  { label: 'Annulé', value: 'canceled' },
  { label: 'Incomplet', value: 'incomplete' },
  { label: 'À traiter', value: 'attention' },
  { label: 'Impayé', value: 'unpaid' },
  { label: 'En pause', value: 'paused' },
  { label: 'Souscription expirée', value: 'incomplete_expired' },
]

const PLAN_LABELS: Record<string, string> = {
  nurse_pro: 'Infirmier Pro',
  lab_starter: 'Labo Starter',
  lab_pro: 'Labo Pro',
}

function roleLabel(role: string) {
  const labels: Record<string, string> = { nurse: 'Infirmier', lab: 'Laboratoire' }
  return labels[role] || role
}

function roleColor(role: string) {
  if (role === 'nurse') return 'info'
  if (role === 'lab') return 'primary'
  return 'neutral'
}

function planLabel(plan: string | null) {
  if (!plan) return 'Offre non renseignée'
  return PLAN_LABELS[plan] || plan
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    active: 'Actif',
    trialing: 'Essai gratuit',
    canceled: 'Annulé',
    past_due: 'Paiement en retard',
    incomplete: 'Incomplet',
    unpaid: 'Impayé',
    paused: 'En pause',
    incomplete_expired: 'Souscription expirée',
  }
  return labels[status] || status
}

function statusColor(status: string) {
  if (status === 'active') return 'success'
  if (status === 'trialing') return 'info'
  if (status === 'canceled') return 'neutral'
  if (status === 'past_due' || status === 'unpaid') return 'warning'
  return 'warning'
}

function billingSourceLabel(source?: string) {
  const labels: Record<string, string> = {
    stripe: 'Stripe (web)',
    apple: 'Apple App Store',
    google: 'Google Play',
  }
  return labels[source ?? ''] || source || '—'
}

function formatTrialEnd(sub: SubscriptionRow) {
  if (sub.is_trialing && sub.trial_ends_at) {
    return formatDate(sub.trial_ends_at)
  }
  if (sub.trial_ends_at) {
    return `Terminé le ${formatDate(sub.trial_ends_at)}`
  }
  return '—'
}

function effectiveStatus(row: SubscriptionRow) {
  return row.effective_status ?? row.status
}

function needsAttention(row: SubscriptionRow) {
  return row.needs_resync || ['past_due', 'unpaid', 'incomplete'].includes(effectiveStatus(row))
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const stats = computed(() => {
  const rows = subscriptions.value
  return {
    total: rows.length,
    active: rows.filter((r) => effectiveStatus(r) === 'active').length,
    trialing: rows.filter((r) => effectiveStatus(r) === 'trialing').length,
    pastDue: rows.filter((r) => effectiveStatus(r) === 'past_due' || effectiveStatus(r) === 'unpaid').length,
    canceled: rows.filter((r) => effectiveStatus(r) === 'canceled').length,
    needsResync: rows.filter((r) => r.needs_resync).length,
    attention: rows.filter(needsAttention).length,
    nurses: rows.filter((r) => r.role === 'nurse').length,
    labs: rows.filter((r) => r.role === 'lab').length,
  }
})

const kpiCards = computed(() => [
  {
    key: 'total',
    label: 'Total',
    value: stats.value.total,
    icon: 'i-lucide-credit-card',
    hint: 'Tous statuts confondus',
  },
  {
    key: 'active',
    label: 'Actifs',
    value: stats.value.active,
    icon: 'i-lucide-badge-check',
    hint: 'Abonnements payants en cours',
  },
  {
    key: 'trialing',
    label: 'En essai',
    value: stats.value.trialing,
    icon: 'i-lucide-hourglass',
    hint: stats.value.needsResync > 0
      ? `Essai gratuit · ${stats.value.needsResync} boutique(s) à synchroniser`
      : 'Période d’essai gratuite',
  },
  {
    key: 'attention',
    label: 'À traiter',
    value: stats.value.attention,
    icon: 'i-lucide-triangle-alert',
    hint: 'Paiements à régulariser ou boutique à synchroniser',
  },
])

const planBreakdown = computed(() => {
  const counts = new Map<string, number>()
  for (const row of subscriptions.value) {
    const slug = row.plan_slug || 'inconnu'
    counts.set(slug, (counts.get(slug) || 0) + 1)
  }
  return [...counts.entries()]
    .map(([slug, count]) => ({
      slug,
      count,
      label: PLAN_LABELS[slug] || slug,
    }))
    .sort((a, b) => b.count - a.count)
})

const filteredSubscriptions = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return subscriptions.value.filter((row) => {
    if (roleFilter.value !== 'all' && row.role !== roleFilter.value) return false
    if (statusFilter.value === 'attention' && !needsAttention(row)) return false
    if (!['all', 'attention'].includes(statusFilter.value) && effectiveStatus(row) !== statusFilter.value) return false
    if (!q) return true
    const haystack = [
      row.email,
      row.plan_slug,
      planLabel(row.plan_slug),
      statusLabel(effectiveStatus(row)),
      roleLabel(row.role),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(q)
  })
})

function resetFilters() {
  roleFilter.value = 'all'
  statusFilter.value = 'all'
  searchQuery.value = ''
}

async function loadSubscriptions() {
  if (loading.value && subscriptions.value.length) return
  loading.value = true
  loadError.value = false
  try {
    const res = await apiFetch('/admin/subscriptions', { method: 'GET' })
    if (!res?.success || !Array.isArray(res.data)) throw new Error('Chargement impossible')
    subscriptions.value = res.data as SubscriptionRow[]
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

onMounted(loadSubscriptions)
</script>

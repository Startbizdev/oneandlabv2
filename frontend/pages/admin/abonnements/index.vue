<template>
  <div class="space-y-6">
    <TitleDashboard title="Abonnements" description="Liste des abonnements infirmiers et laboratoires." />

    <div class="flex flex-col sm:flex-row sm:items-center gap-4">
      <USelect
        v-model="roleFilter"
        :items="roleOptions"
        placeholder="Rôle"
        class="w-full sm:w-40"
      />
      <USelect
        v-model="statusFilter"
        :items="statusOptions"
        placeholder="Statut"
        class="w-full sm:w-40"
      />
      <UButton variant="outline" @click="loadSubscriptions" :loading="loading">
        Actualiser
      </UButton>
    </div>

    <div class="rounded-xl border border-default/50 bg-default shadow-sm overflow-hidden">
      <UTable :data="subscriptions" :columns="columns" :loading="loading">
        <template #email-data="{ row }">
          <span class="text-sm">{{ row.email || '—' }}</span>
        </template>
        <template #role-data="{ row }">
          <UBadge variant="subtle" size="sm">{{ roleLabel(row.role) }}</UBadge>
        </template>
        <template #plan_slug-data="{ row }">
          <span class="text-sm">{{ planLabel(row.plan_slug) }}</span>
        </template>
        <template #status-data="{ row }">
          <UBadge :color="statusColor(row.status)" variant="subtle" size="sm">
            {{ statusLabel(row.status) }}
          </UBadge>
        </template>
        <template #trial_ends_at-data="{ row }">
          <span class="text-sm text-muted">{{ formatDate(row.trial_ends_at) }}</span>
        </template>
        <template #current_period_end-data="{ row }">
          <span class="text-sm text-muted">{{ formatDate(row.current_period_end) }}</span>
        </template>
        <template #empty>
          <div class="py-12">
            <UEmpty
              icon="i-lucide-credit-card"
              title="Aucun abonnement"
              description="Aucun abonnement ne correspond aux filtres."
              variant="naked"
            />
          </div>
        </template>
      </UTable>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: ['auth', 'role'], role: ['super_admin'] })

const loading = ref(true)
const subscriptions = ref<any[]>([])
const roleFilter = ref('')
const statusFilter = ref('')

const roleOptions = [
  { label: 'Tous les rôles', value: '' },
  { label: 'Infirmier', value: 'nurse' },
  { label: 'Laboratoire', value: 'lab' },
]

const statusOptions = [
  { label: 'Tous les statuts', value: '' },
  { label: 'Actif', value: 'active' },
  { label: 'En essai', value: 'trialing' },
  { label: 'Annulé', value: 'canceled' },
  { label: 'En attente', value: 'past_due' },
]

const columns = [
  { id: 'email', accessorKey: 'email', header: 'Email' },
  { id: 'role', accessorKey: 'role', header: 'Rôle' },
  { id: 'plan_slug', accessorKey: 'plan_slug', header: 'Offre' },
  { id: 'status', accessorKey: 'status', header: 'Statut' },
  { id: 'trial_ends_at', accessorKey: 'trial_ends_at', header: 'Fin essai' },
  { id: 'current_period_end', accessorKey: 'current_period_end', header: 'Prochaine facturation' },
]

function roleLabel(role: string) {
  const labels: Record<string, string> = { nurse: 'Infirmier', lab: 'Laboratoire' }
  return labels[role] || role
}

function planLabel(plan: string | null) {
  if (!plan) return '—'
  const labels: Record<string, string> = {
    nurse_pro: 'Pro (29 €/mois)',
    lab_starter: 'Starter (49 €/mois)',
    lab_pro: 'Pro (129 €/mois)',
  }
  return labels[plan] || plan
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    active: 'Actif',
    trialing: 'En essai',
    canceled: 'Annulé',
    past_due: 'En attente',
    incomplete: 'Incomplet',
  }
  return labels[status] || status
}

function statusColor(status: string) {
  if (status === 'active' || status === 'trialing') return 'green'
  if (status === 'canceled') return 'gray'
  return 'amber'
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

async function loadSubscriptions() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (roleFilter.value) params.set('role', roleFilter.value)
    if (statusFilter.value) params.set('status', statusFilter.value)
    const res = await apiFetch(`/admin/subscriptions?${params.toString()}`, { method: 'GET' })
    if (res?.success) subscriptions.value = res.data ?? []
    else subscriptions.value = []
  } catch {
    subscriptions.value = []
  } finally {
    loading.value = false
  }
}

watch([roleFilter, statusFilter], () => {
  loadSubscriptions()
})

onMounted(loadSubscriptions)
</script>

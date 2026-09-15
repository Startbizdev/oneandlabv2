<template>
  <AppPageShell>
    <template #pageHeader>
      <AppPageHeader
        :edge-bleed="false"
        title="Mon abonnement"
        description="Un espace gratuit pour démarrer. Pro pour accompagner le développement de votre activité."
      />
    </template>

    <!-- Onglets : index 0 = Offres, 1 = Mon abonnement -->
    <div class="flex flex-wrap gap-2 mb-6" role="group" aria-label="Rubrique abonnement">
      <UButton
        v-for="(tab, index) in tabs"
        :key="tab.value"
        :variant="activeTabIndex === index ? 'solid' : 'ghost'"
        :color="activeTabIndex === index ? 'primary' : 'neutral'"
        size="md"
        :aria-pressed="activeTabIndex === index"
        :on-click="() => { activeTabIndex = index }"
      >
        <UIcon :name="tab.icon" class="w-4 h-4 mr-2" />
        {{ tab.label }}
      </UButton>
    </div>

    <!-- Tab Offres : cartes tarifs -->
    <UAlert v-if="loadError" color="error" variant="soft" title="Impossible de vérifier votre abonnement">
      <template #actions><UButton color="neutral" variant="outline" :loading="loading" @click="loadSubscription">Réessayer</UButton></template>
    </UAlert>
    <div v-show="activeTabIndex === 0" class="space-y-6">
      <NursePlanCards :busy="loadingCheckout" :disabled="loading || loadError" free-to="/nurse" free-label="Accéder à mon espace" :pro-label="hasCurrentSubscription ? 'Gérer mon abonnement' : 'Choisir Pro'" @choose-pro="hasCurrentSubscription ? activeTabIndex = 1 : startCheckout()" />
      <p class="text-sm text-gray-500">
        Annulation possible à tout moment. Gérez votre abonnement dans l'onglet « Mon abonnement ».
      </p>
    </div>

    <!-- Tab Mon abonnement : infos + gestion / annulation -->
    <div v-show="activeTabIndex === 1" class="space-y-6">
      <div v-if="loading" class="flex justify-center py-12">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary-500" />
      </div>

      <UCard v-else-if="!subscription && !loadError" class="max-w-xl">
        <template #header>
          <h2 class="text-xl font-normal text-gray-900 dark:text-white">Aucun abonnement actif</h2>
        </template>
        <p class="text-gray-600 dark:text-gray-400 mb-6">
          Vous n'avez pas encore d'abonnement actif. Passez à l'offre Pro dans l'onglet « Offres » pour débloquer tous les avantages (rayon 100 km, rendez-vous illimités, avis, statistiques).
        </p>
        <UButton variant="outline" size="lg" :on-click="() => { activeTabIndex = 0 }">
          Voir les offres
        </UButton>
      </UCard>

      <UCard v-else-if="subscription" class="max-w-xl">
        <template #header>
          <h2 class="text-xl font-normal text-gray-900 dark:text-white">Votre abonnement</h2>
        </template>
        <dl class="space-y-4">
          <div>
            <dt class="text-sm text-gray-500 dark:text-gray-400">Offre</dt>
            <dd class="text-gray-900 dark:text-white">{{ planLabel }}</dd>
          </div>
          <div>
            <dt class="text-sm text-gray-500 dark:text-gray-400">Statut</dt>
            <dd>
              <UBadge :color="statusColor" variant="subtle">{{ statusLabel }}</UBadge>
            </dd>
          </div>
          <div v-if="subscription.trial_ends_at">
            <dt class="text-sm text-gray-500 dark:text-gray-400">Fin de l'essai gratuit</dt>
            <dd class="text-gray-900 dark:text-white">{{ formatDate(subscription.trial_ends_at) }}</dd>
          </div>
          <div v-if="subscription.current_period_end">
            <dt class="text-sm text-gray-500 dark:text-gray-400">Fin de la période en cours</dt>
            <dd class="text-gray-900 dark:text-white">{{ formatDate(subscription.current_period_end) }}</dd>
          </div>
        </dl>
        <p class="text-sm text-gray-500 mt-4">
          {{ storeName ? `Votre abonnement est facturé par ${storeName}. Retrouvez sa gestion et son annulation dans votre compte ${storeName}.` : 'Depuis le portail de gestion vous pouvez mettre à jour votre moyen de paiement, consulter vos factures ou annuler votre abonnement à tout moment.' }}
        </p>
        <template #footer>
          <div class="flex flex-wrap gap-3">
            <UButton
              color="primary"
              :loading="loadingPortal"
              @click="openPortal"
            >
              <UIcon name="i-lucide-external-link" class="w-4 h-4 mr-2" />
              {{ storeName ? `Gérer sur ${storeName}` : 'Gérer ou annuler mon abonnement' }}
            </UButton>
          </div>
        </template>
      </UCard>
    </div>
  </AppPageShell>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: ['auth', 'role'], role: 'nurse' })

const { user } = useAuth()
const toast = useAppToast()
const loading = ref(true)
const loadError = ref(false)
const loadingPortal = ref(false)
const loadingCheckout = ref(false)
const activeTabIndex = ref(0) // 0 = Offres, 1 = Mon abonnement

const tabs = [
  { value: 'offres', label: 'Offres', icon: 'i-lucide-credit-card' },
  { value: 'mon-abonnement', label: 'Mon abonnement', icon: 'i-lucide-settings' },
]

const subscription = ref<{
  id: string
  plan_slug: string | null
  status: string
  trial_ends_at: string | null
  current_period_end: string | null
  billing_source?: string | null
} | null>(null)

const hasCurrentSubscription = computed(() => !!subscription.value && ['active', 'trialing', 'past_due', 'unpaid', 'incomplete', 'paused'].includes(subscription.value.status))
const storeName = computed(() => subscription.value?.billing_source === 'apple' ? 'App Store' : subscription.value?.billing_source === 'google' ? 'Google Play' : null)

const planLabel = computed(() => {
  if (!subscription.value?.plan_slug) return '—'
  const labels: Record<string, string> = {
    nurse_pro: 'Pro',
  }
  return labels[subscription.value.plan_slug] || subscription.value.plan_slug
})

const statusLabel = computed(() => {
  if (!subscription.value?.status) return '—'
  const labels: Record<string, string> = {
    active: 'Actif',
    trialing: 'En essai gratuit',
    past_due: 'Paiement en attente',
    canceled: 'Annulé',
    incomplete: 'Incomplet',
    incomplete_expired: 'Souscription expirée',
    unpaid: 'Paiement à régulariser',
    paused: 'En pause',
  }
  return labels[subscription.value.status] || subscription.value.status
})

const statusColor = computed(() => {
  const s = subscription.value?.status
  if (s === 'active' || s === 'trialing') return 'success'
  if (s === 'canceled') return 'neutral'
  return 'warning'
})

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

async function loadSubscription() {
  loading.value = true
  loadError.value = false
  try {
    const res = await apiFetch('/stripe/subscription', { method: 'GET' })
    if (!res?.success) throw new Error('Chargement impossible')
    subscription.value = res.data ?? null
    if (subscription.value?.id) activeTabIndex.value = 1
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

async function openPortal() {
  if (loadingPortal.value) return
  if (subscription.value?.billing_source === 'apple') {
    window.location.href = 'https://apps.apple.com/account/subscriptions'
    return
  }
  if (subscription.value?.billing_source === 'google') {
    window.location.href = 'https://play.google.com/store/account/subscriptions'
    return
  }
  loadingPortal.value = true
  try {
    const base = typeof window !== 'undefined' ? window.location.origin : ''
    const res = await apiFetch('/stripe/create-portal-session', {
      method: 'POST',
      body: { return_url: `${base}/nurse/abonnement` },
    })
    if (res?.success && res?.url) {
      window.location.href = res.url
    } else {
      const msg = (res as any)?.error || 'Aucun abonnement Stripe associé à ce compte'
      toast.add({ title: 'Erreur', description: msg, color: 'red' })
    }
  } catch (e: any) {
    toast.add({ title: 'Erreur', description: e?.message || 'Une erreur est survenue', color: 'red' })
  } finally {
    loadingPortal.value = false
  }
}

async function startCheckout() {
  if (loadingCheckout.value || loading.value || loadError.value) return
  if (hasCurrentSubscription.value) { activeTabIndex.value = 1; return }
  loadingCheckout.value = true
  try {
    const base = typeof window !== 'undefined' ? window.location.origin : ''
    const res = await apiFetch('/stripe/create-checkout-session', {
      method: 'POST',
      body: {
        plan_slug: 'nurse_pro',
        success_url: `${base}/nurse/abonnement?success=1`,
        cancel_url: `${base}/nurse/abonnement`,
      },
    })
    if (res?.success && res?.url) {
      window.location.href = res.url
    } else {
      const msg = (res as any)?.error || 'Erreur lors de la création de la session'
      toast.add({ title: 'Erreur', description: msg, color: 'red' })
    }
  } catch (e: any) {
    toast.add({ title: 'Erreur', description: e?.message || 'Une erreur est survenue', color: 'red' })
  } finally {
    loadingCheckout.value = false
  }
}

onMounted(loadSubscription)

const route = useRoute()
watch(() => route.query.success, () => {
  if (route.query.success) {
    loadSubscription()
    activeTabIndex.value = 1
  }
}, { immediate: true })
</script>

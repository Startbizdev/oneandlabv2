<template>
  <div>
    <TitleDashboard title="Mon abonnement" description="Consultez les offres et gérez votre abonnement OneAndLab" />

    <!-- Onglets : index 0 = Offres, 1 = Mon abonnement -->
    <div class="flex gap-2 mb-6">
      <UButton
        v-for="(tab, index) in tabs"
        :key="tab.value"
        :variant="activeTabIndex === index ? 'solid' : 'ghost'"
        :color="activeTabIndex === index ? 'primary' : 'gray'"
        size="md"
        @click="activeTabIndex = index"
      >
        <UIcon :name="tab.icon" class="w-4 h-4 mr-2" />
        {{ tab.label }}
      </UButton>
    </div>

    <!-- Tab Offres : cartes tarifs -->
    <div v-show="activeTabIndex === 0" class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
        <!-- Starter -->
        <UCard class="flex flex-col h-full overflow-visible">
          <template #header>
            <h2 class="text-xl font-normal text-gray-900 dark:text-white">Starter</h2>
            <p class="text-3xl font-normal text-gray-900 dark:text-white mt-2">49 €<span class="text-base text-gray-500">/mois</span></p>
            <p class="text-sm text-gray-500 mt-1">30 jours d'essai gratuit</p>
            <div class="mt-4">
              <UButton
                block
                size="lg"
                variant="outline"
                :loading="loadingStarter"
                @click="startCheckout('lab_starter')"
              >
                Commencer l'essai
              </UButton>
            </div>
          </template>
          <ul class="space-y-3 text-gray-600 dark:text-gray-400 flex-1 min-h-0">
            <li class="flex items-start gap-2">
              <UIcon name="i-lucide-check" class="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
              <span>Jusqu'à 2 préleveurs.</span>
            </li>
            <li class="flex items-start gap-2">
              <UIcon name="i-lucide-check" class="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
              <span>Gestion des rendez-vous et assignation.</span>
            </li>
            <li class="flex items-start gap-2">
              <UIcon name="i-lucide-check" class="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
              <span>Calendrier commun.</span>
            </li>
            <li class="flex items-start gap-2">
              <UIcon name="i-lucide-check" class="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
              <span>Statistiques basiques.</span>
            </li>
          </ul>
        </UCard>

        <!-- Pro -->
        <UCard class="relative flex flex-col h-full border-2 border-primary-500">
          <div class="absolute top-3 right-3 z-10">
            <UBadge color="primary" size="sm">Recommandé</UBadge>
          </div>
          <template #header>
            <h2 class="text-xl font-normal text-gray-900 dark:text-white">Pro</h2>
            <p class="text-3xl font-normal text-gray-900 dark:text-white mt-2">129 €<span class="text-base text-gray-500">/mois</span></p>
            <p class="text-sm text-gray-500 mt-1">30 jours d'essai gratuit</p>
            <div class="mt-4">
              <UButton
                block
                size="lg"
                color="primary"
                :loading="loadingPro"
                @click="startCheckout('lab_pro')"
              >
                Commencer l'essai gratuit
              </UButton>
            </div>
          </template>
          <ul class="space-y-3 text-gray-600 dark:text-gray-400 flex-1">
            <li class="flex items-start gap-2">
              <UIcon name="i-lucide-check" class="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
              <span>Préleveurs illimités.</span>
            </li>
            <li class="flex items-start gap-2">
              <UIcon name="i-lucide-check" class="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
              <span>Sous-comptes (sous-labos) illimités.</span>
            </li>
            <li class="flex items-start gap-2">
              <UIcon name="i-lucide-check" class="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
              <span>Rendez-vous et calendrier.</span>
            </li>
            <li class="flex items-start gap-2">
              <UIcon name="i-lucide-check" class="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
              <span>Statistiques complètes.</span>
            </li>
            <li class="flex items-start gap-2">
              <UIcon name="i-lucide-check" class="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
              <span>Avis et fiche laboratoire.</span>
            </li>
          </ul>
        </UCard>
      </div>
      <p class="text-sm text-gray-500">
        Annulation possible à tout moment. Gérez votre abonnement dans l'onglet « Mon abonnement ».
      </p>
    </div>

    <!-- Tab Mon abonnement : infos + gestion / annulation -->
    <div v-show="activeTabIndex === 1" class="space-y-6">
      <div v-if="loading" class="flex justify-center py-12">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary-500" />
      </div>

      <UCard v-else-if="!subscription" class="max-w-xl">
        <template #header>
          <h2 class="text-xl font-normal text-gray-900 dark:text-white">Aucun abonnement actif</h2>
        </template>
        <p class="text-gray-600 dark:text-gray-400 mb-6">
          Vous n'avez pas encore d'abonnement actif. Choisissez l'offre Starter ou Pro dans l'onglet « Offres » pour gérer vos préleveurs et sous-comptes.
        </p>
        <UButton variant="outline" size="lg" @click="activeTabIndex = 0">
          Voir les offres
        </UButton>
      </UCard>

      <UCard v-else class="max-w-xl">
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
            <dt class="text-sm text-gray-500 dark:text-gray-400">Prochaine facturation</dt>
            <dd class="text-gray-900 dark:text-white">{{ formatDate(subscription.current_period_end) }}</dd>
          </div>
        </dl>
        <p class="text-sm text-gray-500 mt-4">
          Depuis le portail de gestion vous pouvez mettre à jour votre moyen de paiement, consulter vos factures ou annuler votre abonnement à tout moment.
        </p>
        <template #footer>
          <div class="flex flex-wrap gap-3">
            <UButton
              color="primary"
              :loading="loadingPortal"
              @click="openPortal"
            >
              <UIcon name="i-lucide-external-link" class="w-4 h-4 mr-2" />
              Gérer ou annuler mon abonnement
            </UButton>
          </div>
        </template>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: ['auth'] })

const { user } = useAuth()
const toast = useAppToast()
const loading = ref(true)
const loadingPortal = ref(false)
const loadingStarter = ref(false)
const loadingPro = ref(false)
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
} | null>(null)

const planLabel = computed(() => {
  if (!subscription.value?.plan_slug) return '—'
  const labels: Record<string, string> = {
    lab_starter: 'Starter (49 €/mois)',
    lab_pro: 'Pro (129 €/mois)',
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
  }
  return labels[subscription.value.status] || subscription.value.status
})

const statusColor = computed(() => {
  const s = subscription.value?.status
  if (s === 'active' || s === 'trialing') return 'green'
  if (s === 'canceled') return 'gray'
  return 'amber'
})

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

async function loadSubscription() {
  loading.value = true
  try {
    const res = await apiFetch('/stripe/subscription', { method: 'GET' })
    if (res?.success) subscription.value = res.data ?? null
    if (subscription.value?.id) activeTabIndex.value = 1
  } catch {
    subscription.value = null
  } finally {
    loading.value = false
  }
}

async function openPortal() {
  loadingPortal.value = true
  try {
    const base = typeof window !== 'undefined' ? window.location.origin : ''
    const res = await apiFetch('/stripe/create-portal-session', {
      method: 'POST',
      body: { return_url: `${base}/lab/abonnement` },
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

async function startCheckout(planSlug: 'lab_starter' | 'lab_pro') {
  if (planSlug === 'lab_starter') loadingStarter.value = true
  else loadingPro.value = true
  try {
    const base = typeof window !== 'undefined' ? window.location.origin : ''
    const res = await apiFetch('/stripe/create-checkout-session', {
      method: 'POST',
      body: {
        plan_slug: planSlug,
        success_url: `${base}/lab/abonnement?success=1`,
        cancel_url: `${base}/lab/abonnement`,
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
    if (planSlug === 'lab_starter') loadingStarter.value = false
    else loadingPro.value = false
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

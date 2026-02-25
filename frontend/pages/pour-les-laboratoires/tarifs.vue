<template>
  <div>
    <!-- Header de couleur + phrase marketing -->
    <section class="relative py-12 sm:py-16 md:py-20 overflow-hidden bg-primary-600 dark:bg-primary-700">
      <div class="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl text-center">
        <h1 class="text-3xl sm:text-4xl md:text-5xl font-semibold text-white mb-4">
          Nos tarifs
        </h1>
        <p class="text-lg sm:text-xl text-primary-100 max-w-2xl mx-auto">
          Une offre pour chaque taille de laboratoire. Démarrez avec Starter, évoluez vers Pro pour des préleveurs et sous-comptes illimités — 30 jours d'essai, sans engagement.
        </p>
      </div>
    </section>

    <section class="relative py-12 sm:py-16 md:py-20 overflow-hidden bg-gray-50 dark:bg-gray-950">
      <div class="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
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
                <span>Vous pouvez ajouter jusqu'à 2 préleveurs à votre équipe.</span>
              </li>
              <li class="flex items-start gap-2">
                <UIcon name="i-lucide-check" class="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
                <span>Vous gérez les rendez-vous et leur assignation.</span>
              </li>
              <li class="flex items-start gap-2">
                <UIcon name="i-lucide-check" class="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
                <span>Vous avez accès au calendrier commun.</span>
              </li>
              <li class="flex items-start gap-2">
                <UIcon name="i-lucide-check" class="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
                <span>Vous consultez des statistiques basiques.</span>
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
                  <span>Vous pouvez ajouter un nombre illimité de préleveurs.</span>
                </li>
                <li class="flex items-start gap-2">
                  <UIcon name="i-lucide-check" class="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
                  <span>Vous pouvez créer un nombre illimité de sous-comptes (sous-labos).</span>
                </li>
                <li class="flex items-start gap-2">
                  <UIcon name="i-lucide-check" class="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
                  <span>Vous gérez les rendez-vous et le calendrier.</span>
                </li>
                <li class="flex items-start gap-2">
                  <UIcon name="i-lucide-check" class="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
                  <span>Vous consultez des statistiques complètes.</span>
                </li>
                <li class="flex items-start gap-2">
                  <UIcon name="i-lucide-check" class="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
                  <span>Vous gérez les avis et la fiche laboratoire.</span>
                </li>
              </ul>
          </UCard>
        </div>

        <p class="text-center text-sm text-gray-500 mt-8">
          Annulation possible à tout moment. Gestion de l'abonnement depuis votre espace.
        </p>

        <LandingFaq
          title="Questions fréquentes"
          subtitle="Tout ce qu'il faut savoir sur nos offres laboratoires."
          :items="faqItemsLab"
          background-class="bg-transparent mt-16 mb-8"
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

useHead({
  title: 'Tarifs laboratoires | OneAndLab',
  meta: [
    { name: 'description', content: 'Tarifs et offres pour les laboratoires : Starter 49 €/mois, Pro 129 €/mois avec 30 jours d\'essai.' },
  ],
})

const { isAuthenticated, user } = useAuth()
const toast = useAppToast()
const loadingStarter = ref(false)
const loadingPro = ref(false)

const faqItemsLab = [
  {
    question: "Comment fonctionne l'essai gratuit de 30 jours ?",
    answer: "Vous souscrivez à l'offre de votre choix sans engagement. Pendant 30 jours vous avez accès à toutes les fonctionnalités du plan. Si vous annulez avant la fin, vous n'êtes pas facturé.",
  },
  {
    question: "Puis-je annuler ou changer de pack à tout moment ?",
    answer: "Oui. Vous pouvez annuler votre abonnement ou passer d'un pack à l'autre depuis votre espace abonnement. Aucun engagement.",
  },
  {
    question: "Quelle est la différence entre Starter et Pro ?",
    answer: "Starter permet jusqu'à 2 préleveurs et convient aux petits labos. Pro offre des préleveurs et sous-comptes illimités, des statistiques complètes et la gestion des avis.",
  },
  {
    question: "Comment est facturé l'abonnement ?",
    answer: "L'abonnement est facturé mensuellement par carte bancaire via notre partenaire sécurisé Stripe. La facturation débute à l'issue des 30 jours d'essai si vous n'avez pas annulé.",
  },
]

async function startCheckout(planSlug: 'lab_starter' | 'lab_pro') {
  if (!isAuthenticated.value || !user.value) {
    await navigateTo(`/login?redirect=${encodeURIComponent('/pour-les-laboratoires/tarifs')}`)
    return
  }
  if (user.value?.role !== 'lab') {
    await navigateTo(`/login?redirect=${encodeURIComponent('/pour-les-laboratoires/tarifs')}`)
    return
  }
  if (planSlug === 'lab_starter') loadingStarter.value = true
  else loadingPro.value = true
  try {
    const base = typeof window !== 'undefined' ? window.location.origin : ''
    const res = await apiFetch('/stripe/create-checkout-session', {
      method: 'POST',
      body: {
        plan_slug: planSlug,
        success_url: `${base}/lab/abonnement?success=1`,
        cancel_url: `${base}/pour-les-laboratoires/tarifs`,
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
</script>

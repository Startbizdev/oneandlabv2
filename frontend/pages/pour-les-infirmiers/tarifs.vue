<template>
  <div>
    <!-- Header de couleur + phrase marketing -->
    <section class="relative py-12 sm:py-16 md:py-20 overflow-hidden bg-primary-600 dark:bg-primary-700">
      <div class="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl text-center">
        <h1 class="text-3xl sm:text-4xl md:text-5xl font-semibold text-white mb-4">
          Nos tarifs
        </h1>
        <p class="text-lg sm:text-xl text-primary-100 max-w-2xl mx-auto">
          Une offre pour chaque étape de votre activité. Démarrez gratuitement, passez en Pro quand vous êtes prêt — 30 jours d'essai, sans engagement.
        </p>
      </div>
    </section>

    <section class="relative py-12 sm:py-16 md:py-20 overflow-hidden bg-gray-50 dark:bg-gray-950">
      <div class="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <!-- Découverte (gratuit) -->
          <UCard class="flex flex-col h-full overflow-visible">
            <template #header>
              <h2 class="text-xl font-normal text-gray-900 dark:text-white">Découverte</h2>
              <p class="text-3xl font-normal text-gray-900 dark:text-white mt-2">0 €<span class="text-base text-gray-500">/mois</span></p>
              <p class="text-sm text-gray-500 mt-1">Gratuit pour découvrir la plateforme</p>
              <div class="mt-4">
                <UButton to="/nurse/register" block size="lg" variant="outline">
                  S'inscrire gratuitement
                </UButton>
              </div>
            </template>
            <ul class="space-y-3 text-gray-600 dark:text-gray-400 flex-1 min-h-0">
              <li class="flex items-start gap-2">
                <UIcon name="i-lucide-check" class="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
                <span>Votre rayon d'intervention peut aller jusqu'à 20 km.</span>
              </li>
              <li class="flex items-start gap-2">
                <UIcon name="i-lucide-check" class="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
                <span>Votre fiche professionnelle est visible par les patients.</span>
              </li>
              <li class="flex items-start gap-2">
                <UIcon name="i-lucide-check" class="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
                <span>10 rendez-vous par mois maximum (compteur remis à zéro le 1er de chaque mois).</span>
              </li>
              <li class="flex items-start gap-2">
                <UIcon name="i-lucide-check" class="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
                <span>Vous pouvez proposer jusqu'à 3 types de soins.</span>
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
                <p class="text-3xl font-normal text-gray-900 dark:text-white mt-2">29 €<span class="text-base text-gray-500">/mois</span></p>
                <p class="text-sm text-gray-500 mt-1">30 jours d'essai gratuit</p>
                <div class="mt-4">
                  <UButton
                    block
                    size="lg"
                    color="primary"
                    :loading="loadingCheckout"
                    @click="startCheckout"
                  >
                    Commencer l'essai gratuit
                  </UButton>
                </div>
              </template>
              <ul class="space-y-3 text-gray-600 dark:text-gray-400 flex-1">
                <li class="flex items-start gap-2">
                  <UIcon name="i-lucide-check" class="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
                  <span>Votre rayon d'intervention peut aller jusqu'à 100 km.</span>
                </li>
                <li class="flex items-start gap-2">
                  <UIcon name="i-lucide-check" class="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
                  <span>Vous recevez un nombre illimité de rendez-vous.</span>
                </li>
                <li class="flex items-start gap-2">
                  <UIcon name="i-lucide-check" class="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
                  <span>Vous pouvez proposer tous les types de soins.</span>
                </li>
                <li class="flex items-start gap-2">
                  <UIcon name="i-lucide-check" class="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
                  <span>Vous consultez les avis patients et pouvez y répondre.</span>
                </li>
                <li class="flex items-start gap-2">
                  <UIcon name="i-lucide-check" class="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
                  <span>Vous avez accès au tableau de bord et aux statistiques.</span>
                </li>
              </ul>
          </UCard>
        </div>

        <p class="text-center text-sm text-gray-500 mt-8">
          Annulation possible à tout moment. Gestion de l'abonnement depuis votre espace.
        </p>

        <LandingFaq
          title="Questions fréquentes"
          subtitle="Tout ce qu'il faut savoir sur nos offres infirmiers."
          :items="faqItemsInfirmiers"
          background-class="bg-transparent mt-16 mb-8"
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

useHead({
  title: 'Tarifs infirmiers | OneAndLab',
  meta: [
    { name: 'description', content: 'Tarifs et offres pour les infirmiers : Découverte gratuit, Pro 29 €/mois avec 30 jours d\'essai.' },
  ],
})

const { isAuthenticated, user } = useAuth()
const toast = useAppToast()
const loadingCheckout = ref(false)

const faqItemsInfirmiers = [
  {
    question: "Comment fonctionne l'essai gratuit de 30 jours ?",
    answer: "Vous souscrivez à l'offre Pro sans engagement. Pendant 30 jours vous avez accès à toutes les fonctionnalités. Si vous annulez avant la fin, vous n'êtes pas facturé.",
  },
  {
    question: "Puis-je annuler ou changer d'offre à tout moment ?",
    answer: "Oui. Vous pouvez annuler votre abonnement ou revenir à l'offre Découverte depuis votre espace abonnement. Aucun engagement.",
  },
  {
    question: "Comment est facturé mon abonnement ?",
    answer: "L'abonnement Pro est facturé mensuellement par carte bancaire via notre partenaire sécurisé Stripe. La facturation débute à l'issue des 30 jours d'essai si vous n'avez pas annulé.",
  },
  {
    question: "Que se passe-t-il à la fin de l'essai gratuit ?",
    answer: "À l'issue des 30 jours, votre abonnement Pro est renouvelé automatiquement au tarif en vigueur. Vous pouvez désactiver le renouvellement à tout moment depuis votre espace.",
  },
]

async function startCheckout() {
  if (!isAuthenticated.value || !user.value) {
    await navigateTo(`/login?redirect=${encodeURIComponent('/pour-les-infirmiers/tarifs')}`)
    return
  }
  if (user.value?.role !== 'nurse') {
    await navigateTo(`/login?redirect=${encodeURIComponent('/pour-les-infirmiers/tarifs')}`)
    return
  }
  loadingCheckout.value = true
  try {
    const base = typeof window !== 'undefined' ? window.location.origin : ''
    const res = await apiFetch('/stripe/create-checkout-session', {
      method: 'POST',
      body: {
        plan_slug: 'nurse_pro',
        success_url: `${base}/nurse/abonnement?success=1`,
        cancel_url: `${base}/pour-les-infirmiers/tarifs`,
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
</script>

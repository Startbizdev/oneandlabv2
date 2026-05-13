<template>
  <LandingMaquetteMarketingBackdrop>
    <LandingMaquetteSubHero
      eyebrow="Infirmiers · abonnement"
      :title-lines="['Tarifs', 'pour votre activité']"
      highlight="30 jours d’essai sans engagement sur l’offre Pro"
      description="Démarrez gratuitement avec l’offre Découverte, puis passez à Pro lorsque vous souhaitez élargir rayon et volume de rendez-vous. Annulation possible à tout moment depuis votre espace."
      image-src="/undraw/nurse.svg"
      image-alt="Infirmier à domicile"
      :primary-cta="{ label: 'S’inscrire gratuitement', to: '/nurse/register', icon: 'i-lucide-user-plus' }"
      :secondary-cta="{ label: 'Retour page infirmiers', to: '/pour-les-infirmiers' }"
    />

    <section class="border-t border-[#E8E8F0]/80 bg-[#F7F7FB] py-[72px] dark:border-gray-800 dark:bg-gray-900/75 lg:py-[100px]">
      <div class="mx-auto max-w-[1200px] px-6 lg:px-12">
        <div class="grid max-w-4xl grid-cols-1 gap-8 md:mx-auto md:grid-cols-2">
          <UCard class="flex h-full flex-col overflow-visible">
            <template #header>
              <h2 class="text-xl font-semibold text-[#0A0A0F] dark:text-white">Découverte</h2>
              <p class="mt-2 text-3xl font-semibold text-[#0A0A0F] dark:text-white">
                0 €<span class="text-base font-normal text-[#9090A8] dark:text-gray-400">/mois</span>
              </p>
              <p class="mt-1 text-sm text-[#3D3D52] dark:text-gray-400">Gratuit pour découvrir la plateforme</p>
              <div class="mt-4">
                <UButton to="/nurse/register" block size="lg" variant="outline">S’inscrire gratuitement</UButton>
              </div>
            </template>
            <ul class="min-h-0 flex-1 space-y-3 text-[#3D3D52] dark:text-gray-300">
              <li v-for="(line, i) in planDecouverte" :key="i" class="flex items-start gap-2">
                <UIcon name="i-lucide-check" class="mt-0.5 h-5 w-5 shrink-0 text-primary-500" />
                <span>{{ line }}</span>
              </li>
            </ul>
          </UCard>

          <UCard class="relative flex h-full flex-col border-2 border-primary-500 shadow-[0_8px_32px_-12px_rgb(47_128_237/0.25)]">
            <div class="absolute right-3 top-3 z-10">
              <UBadge color="primary" size="sm">Recommandé</UBadge>
            </div>
            <template #header>
              <h2 class="text-xl font-semibold text-[#0A0A0F] dark:text-white">Pro</h2>
              <p class="mt-2 text-3xl font-semibold text-[#0A0A0F] dark:text-white">
                29 €<span class="text-base font-normal text-[#9090A8] dark:text-gray-400">/mois</span>
              </p>
              <p class="mt-1 text-sm text-[#3D3D52] dark:text-gray-400">30 jours d’essai gratuit</p>
              <div class="mt-4">
                <UButton block size="lg" color="primary" :loading="loadingCheckout" @click="startCheckout">
                  Commencer l’essai gratuit
                </UButton>
              </div>
            </template>
            <ul class="flex-1 space-y-3 text-[#3D3D52] dark:text-gray-300">
              <li v-for="(line, i) in planPro" :key="i" class="flex items-start gap-2">
                <UIcon name="i-lucide-check" class="mt-0.5 h-5 w-5 shrink-0 text-primary-500" />
                <span>{{ line }}</span>
              </li>
            </ul>
          </UCard>
        </div>

        <p class="mt-10 text-center text-sm text-[#9090A8] dark:text-gray-500">
          Annulation possible à tout moment. Gestion de l’abonnement depuis votre espace.
        </p>
      </div>
    </section>

    <LandingMaquetteFaq
      anchor-id="faq"
      section-class="bg-white dark:bg-gray-950"
      :items="faqItemsInfirmiers"
    />
  </LandingMaquetteMarketingBackdrop>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' });

useHead({
  title: 'Tarifs infirmiers | OneAndLab',
  meta: [{ name: 'description', content: "Tarifs pour les infirmiers : Découverte gratuit, Pro 29 €/mois avec 30 jours d'essai." }],
});

const { isAuthenticated, user } = useAuth();
const toast = useAppToast();
const loadingCheckout = ref(false);

const planDecouverte = [
  "Votre rayon d'intervention peut aller jusqu'à 20 km.",
  'Votre fiche professionnelle est visible par les patients.',
  '10 rendez-vous par mois maximum (compteur remis à zéro le 1er de chaque mois).',
  'Vous pouvez proposer tous les types de soins.',
];

const planPro = [
  "Votre rayon d'intervention peut aller jusqu'à 100 km.",
  'Vous recevez un nombre illimité de rendez-vous.',
  'Vous pouvez proposer tous les types de soins.',
  'Vous consultez les avis patients et pouvez y répondre.',
  'Vous avez accès au tableau de bord et aux statistiques.',
];

const faqItemsInfirmiers = [
  {
    question: "Comment fonctionne l'essai gratuit de 30 jours ?",
    answer:
      "Vous souscrivez à l'offre Pro sans engagement. Pendant 30 jours vous avez accès à toutes les fonctionnalités. Si vous annulez avant la fin, vous n'êtes pas facturé.",
  },
  {
    question: "Puis-je annuler ou changer d'offre à tout moment ?",
    answer:
      "Oui. Vous pouvez annuler votre abonnement ou revenir à l'offre Découverte depuis votre espace abonnement. Aucun engagement.",
  },
  {
    question: "Comment est facturé mon abonnement ?",
    answer:
      "L'abonnement Pro est facturé mensuellement par carte bancaire via notre partenaire sécurisé Stripe. La facturation débute à l'issue des 30 jours d'essai si vous n'avez pas annulé.",
  },
  {
    question: "Que se passe-t-il à la fin de l'essai gratuit ?",
    answer:
      "À l'issue des 30 jours, votre abonnement Pro est renouvelé automatiquement au tarif en vigueur. Vous pouvez désactiver le renouvellement à tout moment depuis votre espace.",
  },
];

async function startCheckout() {
  if (!isAuthenticated.value || !user.value) {
    await navigateTo(`/login?redirect=${encodeURIComponent('/pour-les-infirmiers/tarifs')}`);
    return;
  }
  if (user.value?.role !== 'nurse') {
    await navigateTo(`/login?redirect=${encodeURIComponent('/pour-les-infirmiers/tarifs')}`);
    return;
  }
  loadingCheckout.value = true;
  try {
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    const res = await apiFetch('/stripe/create-checkout-session', {
      method: 'POST',
      body: {
        plan_slug: 'nurse_pro',
        success_url: `${base}/nurse/abonnement?success=1`,
        cancel_url: `${base}/pour-les-infirmiers/tarifs`,
      },
    });
    if (res?.success && res?.url) {
      window.location.href = res.url;
    } else {
      const msg = (res as any)?.error || 'Erreur lors de la création de la session';
      toast.add({ title: 'Erreur', description: msg, color: 'red' });
    }
  } catch (e: any) {
    toast.add({ title: 'Erreur', description: e?.message || 'Une erreur est survenue', color: 'red' });
  } finally {
    loadingCheckout.value = false;
  }
}
</script>

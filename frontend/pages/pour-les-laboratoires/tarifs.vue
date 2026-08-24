<template>
  <div>
    <LandingMaquetteHero
      eyebrow="Laboratoires · abonnement"
      :title-lines="['Deux offres,', 'un essai de']"
      highlight="30 jours"
      description="Starter : jusqu’à 2 préleveurs. Pro : équipe illimitée, chiffres complets, gestion des avis. Sans engagement."
      image-src="https://images.unsplash.com/photo-1579154341184-22069e4614d2?w=900&h=1200&q=80&auto=format&fit=crop"
      image-alt="Laboratoire d’analyses médicales"
      image-object-class="object-[center_40%]"
      hide-quote
      hide-stats
      :primary-cta="{ label: 'Inscrire mon laboratoire', to: '/lab/register', icon: 'i-lucide-building-2' }"
      :secondary-cta="{ label: 'Retour à la page laboratoires', to: '/pour-les-laboratoires' }"
    />
    <LandingMaquetteMarketingBackdrop>
      <section class="border-t border-[#E8E8F0]/80 bg-[#F7F7FB] py-[72px] dark:border-gray-800 dark:bg-gray-900/75 lg:py-[100px]">
        <div class="mx-auto max-w-[1200px] px-6 lg:px-12">
          <div class="grid max-w-4xl grid-cols-1 gap-8 md:mx-auto md:grid-cols-2">
            <UCard class="flex h-full flex-col overflow-visible">
              <template #header>
                <h2 class="text-xl font-semibold text-[#0A0A0F] dark:text-white">Starter</h2>
                <p class="mt-2 text-3xl font-semibold text-[#0A0A0F] dark:text-white">
                  49 €<span class="text-base font-normal text-[#9090A8] dark:text-gray-400">/mois</span>
                </p>
                <p class="mt-1 text-sm text-[#3D3D52] dark:text-gray-400">30 jours d’essai gratuit</p>
                <div class="mt-4">
                  <UButton block size="lg" variant="outline" :loading="loadingStarter" @click="() => startCheckout('lab_starter')">
                    Commencer l’essai
                  </UButton>
                </div>
              </template>
              <ul class="min-h-0 flex-1 space-y-3 text-[#3D3D52] dark:text-gray-300">
                <li v-for="(line, i) in starterLines" :key="i" class="flex items-start gap-2">
                  <UIcon name="i-lucide-check" class="mt-0.5 h-5 w-5 shrink-0 text-primary-500" />
                  <span>{{ line }}</span>
                </li>
              </ul>
            </UCard>

            <UCard class="relative flex h-full flex-col border-2 border-primary-500 shadow-[0_8px_32px_-12px_rgb(28_199_181/0.25)]">
              <div class="absolute right-3 top-3 z-10">
                <UBadge color="primary" size="sm">Recommandé</UBadge>
              </div>
              <template #header>
                <h2 class="text-xl font-semibold text-[#0A0A0F] dark:text-white">Pro</h2>
                <p class="mt-2 text-3xl font-semibold text-[#0A0A0F] dark:text-white">
                  129 €<span class="text-base font-normal text-[#9090A8] dark:text-gray-400">/mois</span>
                </p>
                <p class="mt-1 text-sm text-[#3D3D52] dark:text-gray-400">30 jours d’essai gratuit</p>
                <div class="mt-4">
                  <UButton block size="lg" color="primary" :loading="loadingPro" @click="() => startCheckout('lab_pro')">
                    Commencer l’essai gratuit
                  </UButton>
                </div>
              </template>
              <ul class="flex-1 space-y-3 text-[#3D3D52] dark:text-gray-300">
                <li v-for="(line, i) in proLines" :key="i" class="flex items-start gap-2">
                  <UIcon name="i-lucide-check" class="mt-0.5 h-5 w-5 shrink-0 text-primary-500" />
                  <span>{{ line }}</span>
                </li>
              </ul>
            </UCard>
          </div>

          <p class="mt-10 text-center text-sm text-[#9090A8] dark:text-gray-500">
            Vous annulez quand vous voulez, depuis votre espace.
          </p>
        </div>
      </section>

      <LandingMaquetteFaq anchor-id="faq" section-class="bg-white dark:bg-gray-950" :items="faqItemsLab" />
    </LandingMaquetteMarketingBackdrop>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' });

useHead({
  title: 'Tarifs laboratoires | Cary',
  meta: [{ name: 'description', content: "Tarifs pour les laboratoires : Starter 49 €/mois, Pro 129 €/mois avec 30 jours d'essai." }],
});

const { isAuthenticated, user } = useAuth();
const toast = useAppToast();
const loadingStarter = ref(false);
const loadingPro = ref(false);

const starterLines = [
  'Jusqu’à 2 préleveurs.',
  'Rendez-vous et assignation.',
  'Calendrier partagé.',
  'Chiffres essentiels.',
];

const proLines = [
  'Préleveurs illimités.',
  'Autant de sous-comptes que besoin.',
  'Calendrier et rendez-vous.',
  'Chiffres complets.',
  'Avis et fiche laboratoire.',
];

const faqItemsLab = [
  {
    question: 'Comment marche l’essai de 30 jours ?',
    answer:
      'Vous prenez l’offre de votre choix. Pendant 30 jours, tout est ouvert. Si vous annulez avant la fin, vous n’êtes pas facturé.',
  },
  {
    question: 'Puis-je changer d’offre ?',
    answer:
      'Oui. Annuler ou passer d’un pack à l’autre, depuis votre espace. Sans engagement.',
  },
  {
    question: 'Starter ou Pro ?',
    answer:
      'Starter convient à une petite équipe (2 préleveurs). Pro : équipe illimitée, sous-comptes, chiffres complets, avis.',
  },
  {
    question: 'Comment suis-je facturé ?',
    answer:
      'Chaque mois, par carte, via Stripe. La facture commence après les 30 jours si vous n’avez pas annulé.',
  },
];

async function startCheckout(planSlug: 'lab_starter' | 'lab_pro') {
  if (!isAuthenticated.value || !user.value) {
    await navigateTo(`/login?redirect=${encodeURIComponent('/pour-les-laboratoires/tarifs')}`);
    return;
  }
  if (user.value?.role !== 'lab') {
    await navigateTo(`/login?redirect=${encodeURIComponent('/pour-les-laboratoires/tarifs')}`);
    return;
  }
  if (planSlug === 'lab_starter') loadingStarter.value = true;
  else loadingPro.value = true;
  try {
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    const res = await apiFetch('/stripe/create-checkout-session', {
      method: 'POST',
      body: {
        plan_slug: planSlug,
        success_url: `${base}/lab/abonnement?success=1`,
        cancel_url: `${base}/pour-les-laboratoires/tarifs`,
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
    if (planSlug === 'lab_starter') loadingStarter.value = false;
    else loadingPro.value = false;
  }
}
</script>

<template>
  <div>
    <LandingMaquetteHero
      eyebrow="Laboratoires · abonnement"
      :title-lines="['Tarifs', 'pour votre structure']"
      highlight="30 jours d’essai gratuit sur chaque offre · sans engagement"
      description="Starter pour les petites équipes jusqu’à 2 préleveurs, Pro pour préleveurs et sous-comptes illimités avec statistiques étendues et gestion des avis."
      image-src="https://images.unsplash.com/photo-1579154341184-22069e4614d2?w=900&h=1200&q=80&auto=format&fit=crop"
      image-alt="Laboratoire d’analyses médicales"
      image-object-class="object-[center_40%]"
      hide-quote
      hide-stats
      :primary-cta="{ label: 'Inscrire mon laboratoire', to: '/lab/register', icon: 'i-lucide-building-2' }"
      :secondary-cta="{ label: 'Retour page laboratoires', to: '/pour-les-laboratoires' }"
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
            Annulation possible à tout moment. Gestion de l’abonnement depuis votre espace.
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
  "Vous pouvez ajouter jusqu'à 2 préleveurs à votre équipe.",
  'Vous gérez les rendez-vous et leur assignation.',
  'Vous avez accès au calendrier commun.',
  'Vous consultez des statistiques basiques.',
];

const proLines = [
  'Vous pouvez ajouter un nombre illimité de préleveurs.',
  'Vous pouvez créer un nombre illimité de sous-comptes (sous-labos).',
  'Vous gérez les rendez-vous et le calendrier.',
  'Vous consultez des statistiques complètes.',
  'Vous gérez les avis et la fiche laboratoire.',
];

const faqItemsLab = [
  {
    question: "Comment fonctionne l'essai gratuit de 30 jours ?",
    answer:
      "Vous souscrivez à l'offre de votre choix sans engagement. Pendant 30 jours vous avez accès à toutes les fonctionnalités du plan. Si vous annulez avant la fin, vous n'êtes pas facturé.",
  },
  {
    question: "Puis-je annuler ou changer de pack à tout moment ?",
    answer:
      "Oui. Vous pouvez annuler votre abonnement ou passer d'un pack à l'autre depuis votre espace abonnement. Aucun engagement.",
  },
  {
    question: 'Quelle est la différence entre Starter et Pro ?',
    answer:
      "Starter permet jusqu'à 2 préleveurs et convient aux petits labos. Pro offre des préleveurs et sous-comptes illimités, des statistiques complètes et la gestion des avis.",
  },
  {
    question: "Comment est facturé l'abonnement ?",
    answer:
      "L'abonnement est facturé mensuellement par carte bancaire via notre partenaire sécurisé Stripe. La facturation débute à l'issue des 30 jours d'essai si vous n'avez pas annulé.",
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

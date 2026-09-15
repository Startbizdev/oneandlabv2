<template>
  <div>
    <LandingMaquetteHero compact
      eyebrow="Laboratoires · abonnement"
      :title-lines="['Une offre adaptée', 'à votre']"
      highlight="équipe"
      description="Démarrez gratuitement. Starter pour une petite équipe, Pro pour coordonner plusieurs équipes et sites."
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
          <LabPlanCards class="mx-auto" :free-to="user?.role === 'lab' ? '/lab' : '/lab/register'" :free-label="user?.role === 'lab' ? 'Accéder à mon espace' : 'Démarrer gratuitement'" :busy-plan="loadingStarter ? 'lab_starter' : loadingPro ? 'lab_pro' : null" @choose="startCheckout" />

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
import { apiFetch } from '~/utils/api';
definePageMeta({ layout: 'default' });

useLandingSeo({"title": "Tarifs laboratoires : gratuit, Starter et Pro | Cary", "description": "Démarrez gratuitement avec Cary. Starter à 49 €/mois pour une petite équipe, Pro à 129 €/mois pour plusieurs équipes et sous-comptes.", "path": "/pour-les-laboratoires/tarifs"});

const { isAuthenticated, user } = useAuth();
const toast = useAppToast();
const loadingStarter = ref(false);
const loadingPro = ref(false);

const faqItemsLab = [
  {
    question: 'Existe-t-il une offre gratuite ?',
    answer: 'Oui, vous pouvez ouvrir votre espace laboratoire gratuitement. L’ajout de préleveurs nécessite Starter ou Pro ; les sous-comptes sont inclus dans Pro.',
  },
  {
    question: 'Comment marche l’essai de 30 jours ?',
    answer:
      'Un premier abonnement éligible bénéficie de 30 jours pour essayer les fonctionnalités de l’offre choisie. Le tarif mensuel s’applique ensuite. Si vous annulez avant la fin de l’essai, vous n’êtes pas facturé.',
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
      'Chaque mois, par carte, via Stripe. Le premier prélèvement intervient à la fin de votre essai éligible, ou dès la souscription si vous avez déjà utilisé un essai.',
  },
];

async function startCheckout(planSlug: 'lab_starter' | 'lab_pro') {
  if (loadingStarter.value || loadingPro.value) return;
  if (!isAuthenticated.value || !user.value) {
    await navigateTo(`/login?redirect=${encodeURIComponent('/pour-les-laboratoires/tarifs')}`);
    return;
  }
  if (user.value?.role !== 'lab') {
    toast.add({ title: 'Offre réservée aux laboratoires', description: 'Utilisez le compte principal de votre laboratoire pour gérer son offre.', color: 'info' });
    return;
  }
  if (planSlug === 'lab_starter') loadingStarter.value = true;
  else loadingPro.value = true;
  try {
    const subscription = await apiFetch('/stripe/subscription', { method: 'GET' });
    if (!subscription?.success) throw new Error('Impossible de vérifier votre abonnement. Réessayez.');
    if (['active', 'trialing', 'past_due', 'unpaid', 'incomplete', 'paused'].includes(subscription.data?.status)) {
      await navigateTo('/lab/abonnement');
      return;
    }
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

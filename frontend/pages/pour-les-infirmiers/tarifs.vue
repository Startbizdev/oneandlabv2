<template>
  <div>
    <LandingMaquetteHero compact
      eyebrow="Infirmiers · abonnement"
      :title-lines="['Des tarifs clairs,', 'sans']"
      highlight="engagement"
      description="Commencez gratuitement. Avec Pro, élargissez votre rayon et recevez plus de rendez-vous. Sans engagement."
      image-src="https://images.unsplash.com/photo-1631815589968-fdb09a223b1e?w=900&h=1200&q=80&auto=format&fit=crop"
      image-alt="Infirmière en activité professionnelle"
      image-object-class="object-[center_25%]"
      hide-quote
      hide-stats
      :primary-cta="{ label: 'Créer mon compte gratuit', to: '/nurse/register', icon: 'i-lucide-user-plus' }"
      :secondary-cta="{ label: 'Retour à la page infirmiers', to: '/pour-les-infirmiers' }"
    />
    <LandingMaquetteMarketingBackdrop>
      <section class="border-t border-[#E8E8F0]/80 bg-[#F7F7FB] py-[72px] dark:border-gray-800 dark:bg-gray-900/75 lg:py-[100px]">
        <div class="mx-auto max-w-[1200px] px-6 lg:px-12">
          <NursePlanCards class="mx-auto" :busy="loadingCheckout" :free-to="isAuthenticated && user?.role === 'nurse' ? '/nurse' : '/nurse/register'" :free-label="isAuthenticated && user?.role === 'nurse' ? 'Accéder à mon espace' : 'Créer mon compte gratuit'" @choose-pro="startCheckout" />

          <p class="mt-10 text-center text-sm text-[#9090A8] dark:text-gray-500">
            Vous annulez quand vous voulez, depuis votre espace.
          </p>
        </div>
      </section>

      <LandingMaquetteFaq
        anchor-id="faq"
        section-class="bg-white dark:bg-gray-950"
        :items="faqItemsInfirmiers"
      />
    </LandingMaquetteMarketingBackdrop>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' });

useLandingSeo({"title": "Tarifs infirmiers : gratuit et Pro | Cary", "description": "Découvrez le pack gratuit Cary et l’offre Pro à 29 €/mois : demandes de soins, secteur d’intervention et suivi d’activité.", "path": "/pour-les-infirmiers/tarifs"});

const { isAuthenticated, user } = useAuth();
const toast = useAppToast();
const loadingCheckout = ref(false);

const faqItemsInfirmiers = [
  {
    question: 'Comment marche l’essai de 30 jours ?',
    answer:
      'Lors d’un premier abonnement éligible, vous découvrez Pro pendant 30 jours. Les dates et le montant à venir sont indiqués avant confirmation du paiement. Un essai déjà utilisé ne se renouvelle pas.',
  },
  {
    question: 'Puis-je changer d’offre ?',
    answer:
      'Vous pouvez annuler Pro depuis votre espace et retrouver le pack Découverte à la fin de la période déjà souscrite. Votre compte reste accessible.',
  },
  {
    question: 'Comment suis-je facturé ?',
    answer:
      'Sur le site, le paiement mensuel est géré par Stripe. Le premier paiement intervient à la fin d’un essai éligible, ou dès la souscription si vous avez déjà utilisé votre essai. Dans l’application, retrouvez les conditions indiquées par l’App Store ou Google Play avant de confirmer.',
  },
  {
    question: 'Et après les 30 jours ?',
    answer:
      'Pro continue au tarif en vigueur, sauf si vous avez annulé.',
  },
];

async function startCheckout() {
  if (loadingCheckout.value) return;
  if (!isAuthenticated.value || !user.value) {
    await navigateTo(`/login?redirect=${encodeURIComponent('/pour-les-infirmiers/tarifs')}`);
    return;
  }
  if (user.value?.role !== 'nurse') {
    toast.add({ title: 'Offre réservée aux infirmiers', description: 'Utilisez votre compte infirmier pour souscrire à Pro.', color: 'info' });
    return;
  }
  loadingCheckout.value = true;
  try {
    const subscription = await apiFetch('/stripe/subscription', { method: 'GET' });
    if (!subscription?.success) throw new Error('Impossible de vérifier votre abonnement. Réessayez.');
    if (['active', 'trialing', 'past_due', 'unpaid', 'incomplete', 'paused'].includes(subscription.data?.status)) {
      await navigateTo('/nurse/abonnement');
      return;
    }
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

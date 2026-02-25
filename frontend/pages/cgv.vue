<template>
  <div class="min-h-screen bg-[#fafafa]">
    <div class="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <NuxtLink
        to="/"
        class="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-8"
      >
        <UIcon name="i-lucide-arrow-left" class="w-4 h-4" />
        Retour à l'accueil
      </NuxtLink>

      <header class="mb-10">
        <h1 class="text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight">
          Conditions générales de vente
        </h1>
        <p class="mt-2 text-sm text-gray-500">
          Abonnements professionnels OneAndLab — Dernière mise à jour : février 2025
        </p>
      </header>

      <div class="space-y-10 text-[15px] text-gray-600 leading-relaxed">
        <section class="border-b border-gray-200 pb-10">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">
            1. Objet et champ d’application
          </h2>
          <p>
            Les présentes Conditions Générales de Vente (CGV) s’appliquent aux abonnements souscrits sur la plateforme OneAndLab (le « Site »), exploité par <strong class="text-gray-700">ZENFACT</strong> (SAS, 230 B avenue Corot, 13014 Marseille), pour les offres destinées aux <strong class="text-gray-700">infirmiers libéraux</strong> et aux <strong class="text-gray-700">laboratoires d’analyses</strong>. Elles régissent l’accès aux services et fonctionnalités liés à chaque formule d’abonnement (Découverte, Pro pour les infirmiers ; Starter, Pro pour les laboratoires). En souscrivant à un abonnement payant, le professionnel accepte sans réserve les présentes CGV.
          </p>
        </section>

        <section class="border-b border-gray-200 pb-10">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">
            2. Offres et tarifs
          </h2>
          <p class="mb-4">
            Les tarifs sont indiqués en euros TTC. OneAndLab se réserve le droit de modifier les prix en appliquant les tarifs en vigueur au moment du renouvellement ; les abonnés en cours sont informés dans les conditions prévues par la loi.
          </p>
          <h3 class="text-base font-medium text-gray-900 mt-6 mb-2">
            Infirmiers
          </h3>
          <ul class="list-disc pl-5 space-y-1 mb-4">
            <li><strong class="text-gray-700">Découverte :</strong> 0 €/mois — offre gratuite (rayon 20 km, 3 types de soins, 10 rendez-vous/mois).</li>
            <li><strong class="text-gray-700">Pro :</strong> 29 €/mois — rayon 100 km, types de soins et rendez-vous illimités. Essai gratuit de 30 jours.</li>
          </ul>
          <h3 class="text-base font-medium text-gray-900 mt-4 mb-2">
            Laboratoires
          </h3>
          <ul class="list-disc pl-5 space-y-1">
            <li><strong class="text-gray-700">Sans abonnement payant :</strong> accès limité (0 préleveur / 0 sous-compte).</li>
            <li><strong class="text-gray-700">Starter :</strong> 49 €/mois — jusqu’à 2 préleveurs. Essai gratuit de 30 jours.</li>
            <li><strong class="text-gray-700">Pro :</strong> 129 €/mois — préleveurs et sous-comptes illimités. Essai gratuit de 30 jours.</li>
          </ul>
        </section>

        <section class="border-b border-gray-200 pb-10">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">
            3. Formation du contrat et acceptation
          </h2>
          <p>
            Le contrat d’abonnement est formé lorsque le professionnel, préalablement inscrit sur le Site, choisit une offre payante et valide le processus de souscription (y compris la saisie des informations de paiement). La validation constitue une acceptation expresse des présentes CGV et des tarifs affichés. Un accusé de réception ou une confirmation par email peut être adressé ; en tout état de cause, l’activation des fonctionnalités de l’offre souscrite vaut prise d’effet du contrat.
          </p>
        </section>

        <section class="border-b border-gray-200 pb-10">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">
            4. Durée, renouvellement et essai gratuit
          </h2>
          <p class="mb-3">
            L’abonnement est souscrit pour une durée d’un mois, renouvelée tacitement par période mensuelle, sauf résiliation par l’abonné ou par OneAndLab dans les conditions des présentes CGV.
          </p>
          <p class="mb-3">
            Lorsqu’un <strong class="text-gray-700">essai gratuit de 30 jours</strong> est proposé, aucune somme n’est débitée pendant cette période. À l’issue des 30 jours, l’abonnement est renouvelé automatiquement au tarif en vigueur et le paiement est prélevé, sauf résiliation avant la fin de l’essai. L’abonné peut annuler l’abonnement ou désactiver le renouvellement automatique à tout moment depuis son espace personnel ou via le portail client de paiement (Stripe).
          </p>
        </section>

        <section class="border-b border-gray-200 pb-10">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">
            5. Paiement
          </h2>
          <p class="mb-3">
            Les paiements sont traités par notre partenaire sécurisé <strong class="text-gray-700">Stripe</strong> (cartes bancaires, moyens de paiement proposés sur la page de souscription). Les montants sont prélevés au début de chaque période d’abonnement. En cas d’échec de paiement, OneAndLab peut suspendre l’accès aux services après mise en demeure restée infructueuse. Les factures sont disponibles dans l’espace abonné et/ou envoyées par email. Les frais bancaires éventuels restent à la charge du client.
          </p>
        </section>

        <section class="border-b border-gray-200 pb-10">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">
            6. Droit de rétractation
          </h2>
          <p>
            Conformément à l’article L.221-18 du Code de la consommation, lorsqu’il s’agit d’un consommateur, un droit de rétractation de 14 jours à compter de la souscription peut s’appliquer. Si l’abonné exerce ce droit dans ce délai et n’a pas demandé le début de l’exécution de services payants pendant l’essai, aucun montant ne sera réclamé. Pour les professionnels agissant dans le cadre de leur activité, le droit de rétractation peut être exclu ou aménagé selon les dispositions applicables. En tout cas, la résiliation et l’arrêt du renouvellement restent possibles à tout moment après le premier prélèvement, sans engagement de durée.
          </p>
        </section>

        <section class="border-b border-gray-200 pb-10">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">
            7. Résiliation et remboursement
          </h2>
          <p class="mb-3">
            L’abonné peut résilier son abonnement à tout moment ; la résiliation prend effet à l’échéance de la période en cours. Aucun remboursement partiel ou prorata temporis n’est accordé pour la période déjà facturée, sauf disposition légale impérative ou décision exceptionnelle de OneAndLab. En cas de résiliation par OneAndLab pour manquement du client (non-paiement, violation des conditions d’utilisation), l’accès peut être interrompu sans remboursement.
          </p>
        </section>

        <section class="border-b border-gray-200 pb-10">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">
            8. Obligations du professionnel
          </h2>
          <p>
            Le professionnel s’engage à fournir des informations exactes, à respecter la réglementation de sa profession et les règles d’utilisation du Site. Il est seul responsable des actes réalisés dans le cadre de son activité (prélèvements, soins) ; OneAndLab agit comme intermédiaire de mise en relation et de gestion des rendez-vous, sans se substituer au professionnel de santé dans l’exercice de son art.
          </p>
        </section>

        <section class="border-b border-gray-200 pb-10">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">
            9. Données personnelles
          </h2>
          <p>
            Les données personnelles collectées dans le cadre de la souscription et de l’utilisation des services sont traitées conformément à notre
            <NuxtLink to="/politique-confidentialite" class="text-primary-600 hover:underline font-medium">
              politique de confidentialité
            </NuxtLink>
            et au RGPD. Les données de paiement sont gérées par Stripe selon sa propre politique de confidentialité.
          </p>
        </section>

        <section class="border-b border-gray-200 pb-10">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">
            10. Droit applicable et litiges
          </h2>
          <p>
            Les présentes CGV sont soumises au droit français. En cas de litige, et après tentative de résolution amiable, les tribunaux compétents seront ceux du siège de la société (Marseille), sauf règles impératives contraires (consommateur domicilié en France).
          </p>
        </section>

        <section>
          <h2 class="text-lg font-semibold text-gray-900 mb-4">
            11. Contact
          </h2>
          <p>
            Pour toute question relative aux abonnements ou aux présentes CGV : <a href="mailto:contact@oneandlab.fr" class="text-primary-600 hover:underline">contact@oneandlab.fr</a>, ou par courrier à ZENFACT, 230 B avenue Corot, 13014 Marseille. Pour la gestion du paiement et de l’abonnement (facturation, changement de carte, annulation), vous pouvez également utiliser le lien « Gérer mon abonnement » dans votre espace ou le portail client Stripe fourni lors de la souscription.
          </p>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

useHead({
  title: 'Conditions générales de vente — OneAndLab',
  meta: [
    { name: 'description', content: 'CGV des abonnements professionnels OneAndLab : infirmiers et laboratoires, tarifs, paiement Stripe, résiliation.' },
  ],
})
</script>

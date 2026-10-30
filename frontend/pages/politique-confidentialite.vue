<template>
  <div class="min-h-screen bg-[#fafafa]">
    <div class="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <NuxtLink
        v-if="!embedded"
        to="/"
        class="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-8"
      >
        <UIcon name="i-lucide-arrow-left" class="w-4 h-4" />
        Retour à l'accueil
      </NuxtLink>

      <header class="mb-10">
        <h1 class="text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight">
          Politique de confidentialité
        </h1>
        <p class="mt-2 text-sm text-gray-500">
          Dernière mise à jour : octobre 2026
        </p>
      </header>

      <div class="space-y-10 text-[15px] text-gray-600 leading-relaxed">
        <section class="border-b border-gray-200 pb-10">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">
            1. Responsable du traitement
          </h2>
          <p>
            Le responsable du traitement des données personnelles est <strong class="text-gray-700">ZENFACT</strong> (SAS), exploitant la plateforme Cary, dont le siège est situé au 230 B avenue Corot, 13014 Marseille. Pour toute question relative à la protection des données : <a href="mailto:contact@cary.bio" class="text-primary-600 hover:underline">contact@cary.bio</a>.
          </p>
        </section>

        <section class="border-b border-gray-200 pb-10">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">
            2. Données collectées
          </h2>
          <p class="mb-3">
            Nous collectons les données strictement nécessaires à la fourniture de nos services de santé à domicile et à la mise en relation patients / professionnels :
          </p>
          <ul class="list-disc pl-5 space-y-2">
            <li><strong class="text-gray-700">Identification :</strong> nom, prénom, email, téléphone, adresse postale.</li>
            <li><strong class="text-gray-700">Compte :</strong> identifiants de connexion, historique des actions sur la plateforme.</li>
            <li><strong class="text-gray-700">Santé / activité :</strong> rendez-vous, types de soins ou d’analyses, documents médicaux transmis dans le cadre des prestations, avis laissés.</li>
            <li><strong class="text-gray-700">Professionnels :</strong> numéro RPPS, agréments, zone d’intervention, tarifs et créneaux.</li>
          </ul>
          <p class="mt-4">
            Les données à caractère de santé sont traitées dans le respect du secret médical et des exigences applicables aux données de santé (HDS, référentiels sectoriels).
          </p>
        </section>

        <section class="border-b border-gray-200 pb-10">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">
            3. Finalités et bases légales
          </h2>
          <p class="mb-3">
            Les données sont utilisées pour :
          </p>
          <ul class="list-disc pl-5 space-y-2">
            <li>la création et la gestion du compte utilisateur (exécution du contrat) ;</li>
            <li>la prise de rendez-vous, la coordination des interventions et le suivi des soins (exécution du contrat) ;</li>
            <li>la facturation et la gestion des abonnements professionnels (exécution du contrat, obligation légale) ;</li>
            <li>l’envoi de rappels et notifications utiles au service (intérêt légitime) ;</li>
            <li>l’assistant Cary, à votre demande (exécution du contrat ; consentement pour la lecture automatique de vos résultats) ;</li>
            <li>l’amélioration du Site et des services (intérêt légitime, sous réserve de vos choix) ;</li>
            <li>le respect des obligations légales et réglementaires (obligation légale).</li>
          </ul>
        </section>

        <section class="border-b border-gray-200 pb-10">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">
            4. Destinataires et conservation
          </h2>
          <p class="mb-3">
            Les données sont accessibles aux équipes habilitées de Cary et, dans le cadre strict des prestations, aux professionnels de santé concernés (laboratoire, infirmier assigné). Les sous-traitants (hébergement, paiement, envoi d’e-mails et de SMS, assistant d’intelligence artificielle) sont choisis pour leur conformité (HDS, RGPD) et liés par des engagements de confidentialité et de sécurité.
          </p>
          <p>
            La durée de conservation est limitée au temps nécessaire aux finalités précitées et aux obligations légales (comptabilité, contentieux, santé). Les données de santé et les éléments nécessaires à la continuité des soins peuvent être conservés selon les durées prévues par la réglementation en vigueur.
          </p>
        </section>

        <section class="border-b border-gray-200 pb-10">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">
            5. Assistant Cary (intelligence artificielle)
          </h2>
          <p class="mb-3">
            L’assistant de l’application mobile repose sur un modèle d’intelligence artificielle fourni par <strong class="text-gray-700">xAI</strong> (États-Unis). Il n’est utilisé qu’à votre demande, quand vous lui posez une question.
          </p>
          <ul class="list-disc pl-5 space-y-2">
            <li><strong class="text-gray-700">Données transmises :</strong> votre question et les seules informations utiles à la réponse (rendez-vous, tournée, synthèse d’un dossier pour un professionnel habilité), les documents que vous joignez vous-même à la conversation et, si vous l’avez autorisé, votre dernier compte rendu d’analyses.</li>
            <li><strong class="text-gray-700">Pseudonymisation :</strong> avant chaque envoi, les noms sont remplacés par des alias ; téléphone, e-mail, adresse, position, numéro de sécurité sociale, IBAN et numéros de dossier sont masqués ; la date de naissance est remplacée par l’âge.</li>
            <li><strong class="text-gray-700">Aucune conservation chez le fournisseur :</strong> xAI ne conserve ni les questions ni les réponses.</li>
            <li><strong class="text-gray-700">Lecture automatique de vos résultats :</strong> uniquement avec votre accord exprès, demandé dans l’application et retirable à tout moment dans Réglages, rubrique « Assistant Cary ». Sans cet accord, l’assistant ne voit que la date et le type de vos analyses.</li>
            <li><strong class="text-gray-700">Conservation chez Cary :</strong> les conversations sont chiffrées, supprimables à tout moment depuis l’historique, et supprimées automatiquement un an après le dernier message.</li>
            <li><strong class="text-gray-700">Aucune décision automatisée :</strong> l’assistant ne prend aucune décision vous concernant ; les situations d’urgence sont détectées par des règles fixes, sans intelligence artificielle, et renvoient vers le 15, le 112 ou le 3114.</li>
          </ul>
          <p class="mt-4">
            Bases légales : exécution du service que vous demandez ; votre consentement pour la lecture automatique de vos résultats et pour les documents que vous choisissez de joindre.
          </p>
        </section>

        <section class="border-b border-gray-200 pb-10">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">
            6. Sécurité
          </h2>
          <p>
            Nous mettons en œuvre des mesures techniques et organisationnelles appropriées (accès restreint, chiffrement, hébergement certifié HDS, audits) pour protéger vos données contre l’accès non autorisé, la perte ou l’altération. Les traitements sont réalisés sur des infrastructures conformes à l’hébergement des données de santé.
          </p>
        </section>

        <section class="border-b border-gray-200 pb-10">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">
            7. Vos droits (RGPD)
          </h2>
          <p class="mb-3">
            Vous disposez des droits suivants :
          </p>
          <ul class="list-disc pl-5 space-y-2">
            <li><strong class="text-gray-700">Droit d’accès</strong> et de copie de vos données.</li>
            <li><strong class="text-gray-700">Droit de rectification</strong> des données inexactes ou incomplètes.</li>
            <li><strong class="text-gray-700">Droit à l’effacement</strong> dans les limites prévues par la loi (conservation légale, motif légitime).</li>
            <li><strong class="text-gray-700">Droit à la limitation du traitement</strong> dans certains cas.</li>
            <li><strong class="text-gray-700">Droit à la portabilité</strong> des données que vous avez fournies, dans un format structuré.</li>
            <li><strong class="text-gray-700">Droit d’opposition</strong> au traitement fondé sur l’intérêt légitime (notamment prospection).</li>
            <li><strong class="text-gray-700">Droit de retirer votre consentement</strong> lorsque le traitement est fondé sur le consentement.</li>
          </ul>
          <p class="mt-4">
            Pour exercer ces droits : <a href="mailto:contact@cary.bio" class="text-primary-600 hover:underline">contact@cary.bio</a>. Vous pouvez également introduire une réclamation auprès de la CNIL (cnil.fr). Nous nous engageons à répondre dans un délai de 30 jours.
          </p>
        </section>

        <section class="border-b border-gray-200 pb-10">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">
            8. Cookies
          </h2>
          <p>
            Le Site utilise des cookies et technologies similaires pour le fonctionnement du service, la sécurité, l’analyse d’audience et l’amélioration de l’expérience utilisateur. Vous pouvez configurer vos préférences dans les paramètres de votre navigateur. Le refus de certains cookies peut limiter certaines fonctionnalités.
          </p>
        </section>

        <section>
          <h2 class="text-lg font-semibold text-gray-900 mb-4">
            9. Modifications
          </h2>
          <p>
            Cette politique peut être mise à jour pour refléter des changements de services ou de réglementation. La date de dernière mise à jour est indiquée en tête de document. Nous vous invitons à la consulter régulièrement.
          </p>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const embedded = useEmbeddedView()

const siteOrigin = String(useRuntimeConfig().public.siteUrl || 'https://cary.bio').replace(/\/$/, '')
const pageTitle = 'Politique de confidentialité — Cary'
const pageDescription = 'Politique de confidentialité et protection des données personnelles (RGPD) sur Cary.'

useHead({
  title: pageTitle,
  meta: [
    { name: 'description', content: pageDescription },
    { property: 'og:title', content: pageTitle },
    { property: 'og:description', content: pageDescription },
    { property: 'og:url', content: `${siteOrigin}/politique-confidentialite` },
  ],
  link: [{ rel: 'canonical', href: `${siteOrigin}/politique-confidentialite` }],
})
</script>

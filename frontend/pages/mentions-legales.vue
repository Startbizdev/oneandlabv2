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
          Mentions légales
        </h1>
        <p class="mt-2 text-sm text-gray-500">
          Dernière mise à jour : février 2025
        </p>
      </header>

      <div class="space-y-10 text-[15px] text-gray-600 leading-relaxed">
        <!-- 1. Éditeur -->
        <section class="border-b border-gray-200 pb-10">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">
            1. Éditeur du site
          </h2>
          <p class="mb-2">
            <strong class="text-gray-900">OneAndLab</strong> est exploité par :
          </p>
          <ul class="list-none space-y-1 text-gray-600">
            <li><strong class="text-gray-700">Dénomination :</strong> ZENFACT</li>
            <li><strong class="text-gray-700">Forme juridique :</strong> Société par Actions Simplifiée (SAS)</li>
            <li><strong class="text-gray-700">Siège social :</strong> 230 B avenue Corot, 13014 Marseille</li>
            <li><strong class="text-gray-700">SIREN :</strong> 927 659 508</li>
            <li><strong class="text-gray-700">SIRET :</strong> 927 659 508 00018</li>
            <li><strong class="text-gray-700">N° TVA intracommunautaire :</strong> FR36 927 659 508</li>
            <li><strong class="text-gray-700">Date de création :</strong> 11 avril 2024</li>
            <li><strong class="text-gray-700">Activité (NAF) :</strong> 82.11Z – Services administratifs combinés de bureau</li>
          </ul>
          <p class="mt-4">
            Exploitation de la plateforme OneAndLab (mise en relation patients / professionnels de santé / laboratoires), hébergement et traitement de données de santé conformes HDS, médiation et coordination dans le secteur de la santé.
          </p>
        </section>

        <!-- 2. Objet du site -->
        <section class="border-b border-gray-200 pb-10">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">
            2. Objet du site
          </h2>
          <p>
            Le site OneAndLab (« le Site ») est une plateforme en ligne destinée à mettre en relation des patients et des professionnels de santé (laboratoires partenaires, infirmiers) pour la réalisation de prélèvements sanguins et de soins infirmiers à domicile. Notre mission est de simplifier l'accès à des services de santé de qualité tout en offrant une expérience utilisateur optimisée.
          </p>
        </section>

        <!-- 3. Hébergeur -->
        <section class="border-b border-gray-200 pb-10">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">
            3. Hébergeur
          </h2>
          <ul class="list-none space-y-1">
            <li><strong class="text-gray-700">Nom :</strong> Microsoft Azure</li>
            <li><strong class="text-gray-700">Adresse :</strong> One Microsoft Way, Redmond, WA 98052, États-Unis</li>
            <li><strong class="text-gray-700">Contact :</strong> support.azure.com</li>
          </ul>
          <p class="mt-4 p-3 rounded-lg bg-gray-100 border border-gray-200 text-sm">
            L'hébergeur respecte les normes de sécurité en vigueur et détient la certification <strong>Hébergement de Données de Santé (HDS)</strong> pour l'hébergement de données médicales sensibles.
          </p>
        </section>

        <!-- 4. Propriété intellectuelle -->
        <section class="border-b border-gray-200 pb-10">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">
            4. Propriété intellectuelle
          </h2>
          <p>
            L'ensemble des contenus du Site (textes, images, logos, graphismes, vidéos, icônes, etc.) sont la propriété exclusive de OneAndLab ou de ses partenaires. Toute reproduction, représentation, modification ou exploitation, partielle ou totale, sans autorisation écrite préalable est interdite. Toute infraction est passible de poursuites judiciaires.
          </p>
        </section>

        <!-- 5. Inscription des professionnels -->
        <section class="border-b border-gray-200 pb-10">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">
            5. Inscription des professionnels
          </h2>
          <p class="mb-3">
            Les laboratoires et infirmiers souhaitant proposer leurs services via OneAndLab doivent créer un compte professionnel et fournir les documents requis pour valider leur inscription (agrément, autorisations, informations administratives). Ils s'engagent à respecter les normes professionnelles, déontologiques et les règles de confidentialité des données des patients.
          </p>
        </section>

        <!-- 6. Protection des données -->
        <section class="border-b border-gray-200 pb-10">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">
            6. Protection des données personnelles
          </h2>
          <p>
            OneAndLab, en tant que responsable du traitement, s'engage à garantir la confidentialité et la sécurité des données personnelles collectées via le Site. Pour en savoir plus, consultez notre
            <NuxtLink to="/politique-confidentialite" class="text-primary-600 hover:underline font-medium">
              politique de confidentialité
            </NuxtLink>.
          </p>
        </section>

        <!-- 7. Responsabilités -->
        <section class="border-b border-gray-200 pb-10">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">
            7. Responsabilités
          </h2>
          <p class="mb-3">
            OneAndLab s'efforce de fournir des informations exactes et à jour. La société ne saurait toutefois être tenue responsable :
          </p>
          <ul class="list-disc pl-5 space-y-2">
            <li>des relations contractuelles ou litiges entre patients et professionnels ;</li>
            <li>des dommages résultant de l'accès ou de l'utilisation du Site ;</li>
            <li>des erreurs ou omissions dans les contenus.</li>
          </ul>
        </section>

        <!-- 8. Cookies -->
        <section class="border-b border-gray-200 pb-10">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">
            8. Cookies et outils de suivi
          </h2>
          <p>
            Le Site utilise des cookies et outils similaires pour améliorer l'expérience utilisateur, analyser le trafic et proposer des contenus adaptés. Vous pouvez gérer vos préférences dans les paramètres de votre navigateur.
          </p>
        </section>

        <!-- 9. Contact -->
        <section>
          <h2 class="text-lg font-semibold text-gray-900 mb-4">
            9. Contact
          </h2>
          <p class="mb-4">
            Pour toute question, demande ou réclamation :
          </p>
          <div class="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
            <p><strong class="text-gray-700">Service commercial</strong></p>
            <p>Horaires : Lun–Ven 9h–18h, Sam 9h–12h</p>
            <p>Adresse : 230 B avenue Corot, 13014 Marseille</p>
            <p>Téléphone : 04 91 23 45 67</p>
            <p>Email : <a href="mailto:contact@oneandlab.fr" class="text-primary-600 hover:underline">contact@oneandlab.fr</a></p>
            <p class="pt-3 border-t border-gray-100 mt-3"><strong class="text-gray-700">Délégué à la Protection des Données (DPO)</strong></p>
            <p>Email : <a href="mailto:dpo@oneandlab.fr" class="text-primary-600 hover:underline">dpo@oneandlab.fr</a></p>
            <p class="text-sm text-gray-500">Réclamations RGPD : délai de réponse 30 jours. Juridiction : tribunaux de Marseille.</p>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

useHead({
  title: 'Mentions légales — OneAndLab',
  meta: [
    { name: 'description', content: 'Mentions légales du site OneAndLab : éditeur, hébergeur, protection des données, contact.' },
  ],
})
</script>

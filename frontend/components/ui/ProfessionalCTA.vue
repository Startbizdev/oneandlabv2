<template>
  <section class="relative w-full">
    <!-- En-tête -->
    <div 
      v-if="title || subtitle"
      class="w-full py-12 sm:py-16 md:py-20"
      :class="backgroundClass"
    >
      <div class="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
        <div class="text-center">
          <h2 
            v-if="title"
            class="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4 sm:mb-5"
          >
            {{ title }}
          </h2>
          <p 
            v-if="subtitle"
            class="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed"
          >
            {{ subtitle }}
          </p>
        </div>
      </div>
    </div>

    <!-- Sections pour chaque type de professionnel -->
    <div class="w-full">
      <!-- Section Infirmiers -->
      <div class="w-full bg-white border-t border-b border-gray-100">
        <div class="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl py-16 sm:py-20 md:py-24">
          <div class="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <!-- Contenu gauche -->
            <div>
              <div class="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-2xl mb-6">
                <UIcon name="i-lucide-stethoscope" class="w-8 h-8 text-primary-600" />
              </div>
              <h3 class="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Infirmiers Libéraux
              </h3>
              <p class="text-lg text-gray-600 mb-8 leading-relaxed">
                Rejoignez un réseau en croissance et multipliez vos rendez-vous sans complexité. 
                <strong class="text-gray-900">Sans engagement.</strong>
              </p>

              <!-- Avantages -->
              <div class="space-y-4 mb-8">
                <div 
                  v-for="(feature, index) in nurseFeatures"
                  :key="index"
                  class="flex items-start gap-4"
                >
                  <div class="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center mt-0.5">
                    <UIcon :name="feature.icon" class="w-4 h-4 text-primary-600" />
                  </div>
                  <div>
                    <h4 class="font-bold text-gray-900 mb-1">
                      {{ feature.title }}
                    </h4>
                    <p class="text-sm text-gray-600 leading-relaxed">
                      {{ feature.description }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- CTA -->
              <div class="flex flex-col sm:flex-row gap-3">
                <UButton
                  :to="nurseSignupLink"
                  color="primary"
                  size="xl"
                  icon="i-lucide-arrow-right"
                  class="font-semibold"
                >
                  Rejoindre le réseau
                </UButton>
                <UButton
                  v-if="nurseLearnMoreLink"
                  :to="nurseLearnMoreLink"
                  color="primary"
                  variant="outline"
                  size="xl"
                  class="font-semibold"
                >
                  En savoir plus
                </UButton>
              </div>
            </div>

            <!-- Visuel droit -->
            <div class="hidden lg:block">
              <div class="rounded-2xl p-8 h-full flex items-center justify-center">
                <img 
                  src="/undraw/nurse.svg" 
                  alt="Infirmiers libéraux" 
                  class="w-full h-auto max-w-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Section Laboratoires -->
      <div class="w-full bg-gray-50">
        <div class="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl py-16 sm:py-20 md:py-24">
          <div class="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <!-- Visuel gauche -->
            <div class="hidden lg:block order-2 lg:order-1">
              <div class="rounded-2xl p-8 h-full flex items-center justify-center">
                <img 
                  src="/undraw/labo.svg" 
                  alt="Laboratoires" 
                  class="w-full h-auto max-w-lg"
                />
              </div>
            </div>

            <!-- Contenu droit -->
            <div class="order-1 lg:order-2">
              <div class="inline-flex items-center justify-center w-16 h-16 bg-success-100 rounded-2xl mb-6">
                <UIcon name="i-lucide-flask-conical" class="w-8 h-8 text-success-600" />
              </div>
              <h3 class="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Laboratoires
              </h3>
              <p class="text-lg text-gray-600 mb-8 leading-relaxed">
                Optimisez vos prélèvements à domicile et gérez vos équipes depuis une seule plateforme. 
                <strong class="text-gray-900">Conformité HDS garantie.</strong>
              </p>

              <!-- Avantages -->
              <div class="space-y-4 mb-8">
                <div 
                  v-for="(feature, index) in labFeatures"
                  :key="index"
                  class="flex items-start gap-4"
                >
                  <div class="flex-shrink-0 w-6 h-6 rounded-full bg-success-100 flex items-center justify-center mt-0.5">
                    <UIcon :name="feature.icon" class="w-4 h-4 text-success-600" />
                  </div>
                  <div>
                    <h4 class="font-bold text-gray-900 mb-1">
                      {{ feature.title }}
                    </h4>
                    <p class="text-sm text-gray-600 leading-relaxed">
                      {{ feature.description }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- CTA -->
              <div class="flex flex-col sm:flex-row gap-3">
                <UButton
                  :to="labSignupLink"
                  color="success"
                  size="xl"
                  icon="i-lucide-arrow-right"
                  class="font-semibold"
                >
                  Rejoindre le réseau
                </UButton>
                <UButton
                  v-if="labLearnMoreLink"
                  :to="labLearnMoreLink"
                  color="success"
                  variant="outline"
                  size="xl"
                  class="font-semibold"
                >
                  En savoir plus
                </UButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Section Professionnels de Santé -->
      <div class="w-full bg-white border-t border-b border-gray-100">
        <div class="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl py-16 sm:py-20 md:py-24">
          <div class="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <!-- Contenu gauche -->
            <div>
              <div class="inline-flex items-center justify-center w-16 h-16 bg-warning-100 rounded-2xl mb-6">
                <UIcon name="i-lucide-user-check" class="w-8 h-8 text-warning-600" />
              </div>
              <h3 class="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Professionnels de Santé
              </h3>
              <p class="text-lg text-gray-600 mb-8 leading-relaxed">
                Simplifiez la gestion de vos patients et organisez leurs soins à domicile. 
                <strong class="text-gray-900">Gain de temps garanti.</strong>
              </p>

              <!-- Avantages -->
              <div class="space-y-4 mb-8">
                <div 
                  v-for="(feature, index) in proFeatures"
                  :key="index"
                  class="flex items-start gap-4"
                >
                  <div class="flex-shrink-0 w-6 h-6 rounded-full bg-warning-100 flex items-center justify-center mt-0.5">
                    <UIcon :name="feature.icon" class="w-4 h-4 text-warning-600" />
                  </div>
                  <div>
                    <h4 class="font-bold text-gray-900 mb-1">
                      {{ feature.title }}
                    </h4>
                    <p class="text-sm text-gray-600 leading-relaxed">
                      {{ feature.description }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- CTA -->
              <div class="flex flex-col sm:flex-row gap-3">
                <UButton
                  :to="proSignupLink"
                  color="warning"
                  size="xl"
                  icon="i-lucide-arrow-right"
                  class="font-semibold"
                >
                  Rejoindre le réseau
                </UButton>
                <UButton
                  v-if="proLearnMoreLink"
                  :to="proLearnMoreLink"
                  color="warning"
                  variant="outline"
                  size="xl"
                  class="font-semibold"
                >
                  En savoir plus
                </UButton>
              </div>
            </div>

            <!-- Visuel droit -->
            <div class="hidden lg:block">
              <div class="rounded-2xl p-8 h-full flex items-center justify-center">
                <img 
                  src="/undraw/pro.svg" 
                  alt="Professionnels de santé" 
                  class="w-full h-auto max-w-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Slot pour contenu personnalisé -->
    <div v-if="$slots.default" class="w-full py-12 sm:py-16">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
interface Props {
  title?: string;
  subtitle?: string;
  nurseSignupLink?: string;
  nurseLearnMoreLink?: string;
  labSignupLink?: string;
  labLearnMoreLink?: string;
  proSignupLink?: string;
  proLearnMoreLink?: string;
  backgroundClass?: string;
}

withDefaults(defineProps<Props>(), {
  title: 'Rejoignez notre réseau de professionnels',
  subtitle: 'Développez votre activité médicale avec une plateforme simple, sécurisée et performante',
  nurseSignupLink: '/nurse/register',
  nurseLearnMoreLink: '/nurse',
  labSignupLink: '/lab/register',
  labLearnMoreLink: '/lab',
  proSignupLink: '/pro/register',
  proLearnMoreLink: '/pro',
  backgroundClass: 'bg-white',
});

// Avantages commerciaux percutants pour les infirmiers
const nurseFeatures = [
  {
    icon: 'i-lucide-trending-up',
    title: 'Augmentez vos revenus',
    description: 'Recevez des rendez-vous réguliers dans votre secteur. Multipliez votre volume d\'interventions sans effort commercial.',
  },
  {
    icon: 'i-lucide-clock',
    title: '100% flexible',
    description: 'Acceptez ou refusez les missions selon vos disponibilités. Vous gardez le contrôle total de votre planning.',
  },
  {
    icon: 'i-lucide-map-pin',
    title: 'Interventions géolocalisées',
    description: 'Recevez uniquement les demandes dans votre secteur. Optimisez vos déplacements et votre temps de trajet.',
  },
];

// Avantages commerciaux percutants pour les laboratoires
const labFeatures = [
  {
    icon: 'i-lucide-bar-chart-3',
    title: 'Augmentez votre volume',
    description: 'Développez votre activité de prélèvements à domicile et étendez votre zone de couverture géographique.',
  },
  {
    icon: 'i-lucide-users',
    title: 'Gestion d\'équipe optimisée',
    description: 'Centralisez la gestion de vos préleveurs et secrétaires. Assignez les missions en quelques clics.',
  },
  {
    icon: 'i-lucide-shield-check',
    title: 'Conformité HDS garantie',
    description: 'Plateforme certifiée avec chiffrement des données. Conformité totale pour votre tranquillité d\'esprit.',
  },
];

// Avantages commerciaux percutants pour les professionnels de santé
const proFeatures = [
  {
    icon: 'i-lucide-zap',
    title: 'Gain de temps garanti',
    description: 'Créez des rendez-vous en 5 minutes au lieu de 30. Accédez aux documents médicaux en un clic.',
  },
  {
    icon: 'i-lucide-heart-handshake',
    title: 'Suivi patient simplifié',
    description: 'Organisez les soins à domicile de vos patients et consultez leur historique médical complet.',
  },
  {
    icon: 'i-lucide-shield-check',
    title: 'Sécurité maximale',
    description: 'Plateforme certifiée HDS et RGPD. Vos données et celles de vos patients sont 100% sécurisées.',
  },
];
</script>

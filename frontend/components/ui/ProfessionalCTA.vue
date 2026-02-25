<template>
  <section class="relative w-full" :class="backgroundClass">
    <!-- En-tête -->
    <div
      v-if="title || subtitle"
      class="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl pt-12 sm:pt-16 md:pt-20 pb-8 sm:pb-10"
    >
      <div class="text-center">
        <h2
          v-if="title"
          class="text-3xl sm:text-4xl md:text-5xl font-normal text-gray-900 dark:text-white mb-4 sm:mb-5"
        >
          {{ title }}
        </h2>
        <p
          v-if="subtitle"
          class="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed"
        >
          {{ subtitle }}
        </p>
      </div>
    </div>

    <!-- Cartes professionnels : design moderne, photos Unsplash, responsive -->
    <div class="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl pb-16 sm:pb-20 md:pb-24 space-y-16 sm:space-y-20 md:space-y-24">
      <!-- 1. Infirmiers libéraux -->
      <article
        class="overflow-hidden rounded-2xl sm:rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg hover:shadow-xl transition-all duration-300"
      >
        <div class="grid md:grid-cols-2 gap-0 min-h-0">
          <!-- Image : visible sur tous les écrans, ordre 2 sur mobile -->
          <div class="relative aspect-[4/3] md:aspect-auto md:min-h-[320px] order-2 md:order-1">
            <img
              :src="nurseImage"
              alt="Infirmière à domicile - Rejoignez le réseau OneAndLab"
              class="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div class="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/40 to-transparent" aria-hidden="true" />
            <div class="absolute bottom-4 left-4 right-4 md:left-4 md:right-auto md:bottom-6 md:max-w-[200px]">
              <span class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-white/95 dark:bg-gray-900/95 text-gray-900 dark:text-white shadow-sm">
                <UIcon name="i-lucide-heart-pulse" class="w-4 h-4 text-primary-500" />
                Infirmiers libéraux
              </span>
            </div>
          </div>
          <!-- Contenu -->
          <div class="p-6 sm:p-8 md:p-10 flex flex-col justify-center order-1 md:order-2">
            <h3 class="text-2xl sm:text-3xl font-normal text-gray-900 dark:text-white mb-3">
              Rejoignez un réseau en croissance
            </h3>
            <p class="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
              Multipliez vos rendez-vous sans complexité. Sans engagement.
            </p>
            <ul class="space-y-4 mb-8">
              <li
                v-for="(f, i) in nurseFeatures"
                :key="i"
                class="flex items-start gap-3 group"
              >
                <span class="flex-shrink-0 w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-600 dark:text-primary-400 transition-transform group-hover:scale-105">
                  <UIcon :name="f.icon" class="w-5 h-5" />
                </span>
                <div>
                  <h4 class="font-medium text-gray-900 dark:text-white">{{ f.title }}</h4>
                  <p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{{ f.description }}</p>
                </div>
              </li>
            </ul>
            <div class="flex flex-col sm:flex-row gap-3">
              <UButton
                :to="nurseSignupLink"
                color="primary"
                size="xl"
                icon="i-lucide-arrow-right"
                class="font-medium min-w-[200px]"
              >
                Rejoindre le réseau
              </UButton>
              <UButton
                v-if="nurseLearnMoreLink"
                :to="nurseLearnMoreLink"
                variant="outline"
                color="neutral"
                size="xl"
                class="font-medium"
              >
                En savoir plus
              </UButton>
            </div>
          </div>
        </div>
      </article>

      <!-- 2. Laboratoires -->
      <article
        class="overflow-hidden rounded-2xl sm:rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg hover:shadow-xl transition-all duration-300"
      >
        <div class="grid md:grid-cols-2 gap-0 min-h-0">
          <!-- Contenu (gauche sur desktop) -->
          <div class="p-6 sm:p-8 md:p-10 flex flex-col justify-center order-1">
            <h3 class="text-2xl sm:text-3xl font-normal text-gray-900 dark:text-white mb-3">
              Optimisez vos prélèvements à domicile
            </h3>
            <p class="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
              Gérez vos équipes depuis une seule plateforme. Conformité HDS garantie.
            </p>
            <ul class="space-y-4 mb-8">
              <li
                v-for="(f, i) in labFeatures"
                :key="i"
                class="flex items-start gap-3 group"
              >
                <span class="flex-shrink-0 w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-600 dark:text-primary-400 transition-transform group-hover:scale-105">
                  <UIcon :name="f.icon" class="w-5 h-5" />
                </span>
                <div>
                  <h4 class="font-medium text-gray-900 dark:text-white">{{ f.title }}</h4>
                  <p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{{ f.description }}</p>
                </div>
              </li>
            </ul>
            <div class="flex flex-col sm:flex-row gap-3">
              <UButton
                :to="labSignupLink"
                color="primary"
                size="xl"
                icon="i-lucide-arrow-right"
                class="font-medium min-w-[200px]"
              >
                Inscrire mon laboratoire
              </UButton>
              <UButton
                v-if="labLearnMoreLink"
                :to="labLearnMoreLink"
                variant="outline"
                color="neutral"
                size="xl"
                class="font-medium"
              >
                En savoir plus
              </UButton>
            </div>
          </div>
          <!-- Image -->
          <div class="relative aspect-[4/3] md:aspect-auto md:min-h-[320px] order-2">
            <img
              :src="labImage"
              alt="Laboratoire - Prélèvements à domicile OneAndLab"
              class="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div class="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-l from-black/40 to-transparent" aria-hidden="true" />
            <div class="absolute bottom-4 left-4 right-4 md:right-4 md:left-auto md:bottom-6 md:max-w-[200px]">
              <span class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-white/95 dark:bg-gray-900/95 text-gray-900 dark:text-white shadow-sm">
                <UIcon name="i-lucide-flask-conical" class="w-4 h-4 text-primary-500" />
                Laboratoires
              </span>
            </div>
          </div>
        </div>
      </article>

      <!-- 3. Professionnels de santé -->
      <article
        class="overflow-hidden rounded-2xl sm:rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg hover:shadow-xl transition-all duration-300"
      >
        <div class="grid md:grid-cols-2 gap-0 min-h-0">
          <!-- Image -->
          <div class="relative aspect-[4/3] md:aspect-auto md:min-h-[320px] order-2 md:order-1">
            <img
              :src="proImage"
              alt="Professionnel de santé - Orientez vos patients OneAndLab"
              class="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div class="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/40 to-transparent" aria-hidden="true" />
            <div class="absolute bottom-4 left-4 right-4 md:left-4 md:right-auto md:bottom-6 md:max-w-[220px]">
              <span class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-white/95 dark:bg-gray-900/95 text-gray-900 dark:text-white shadow-sm">
                <UIcon name="i-lucide-stethoscope" class="w-4 h-4 text-primary-500" />
                Professionnels de santé
              </span>
            </div>
          </div>
          <!-- Contenu -->
          <div class="p-6 sm:p-8 md:p-10 flex flex-col justify-center order-1 md:order-2">
            <h3 class="text-2xl sm:text-3xl font-normal text-gray-900 dark:text-white mb-3">
              Simplifiez la gestion de vos patients
            </h3>
            <p class="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
              Organisez leurs soins à domicile. Gain de temps garanti.
            </p>
            <ul class="space-y-4 mb-8">
              <li
                v-for="(f, i) in proFeatures"
                :key="i"
                class="flex items-start gap-3 group"
              >
                <span class="flex-shrink-0 w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-600 dark:text-primary-400 transition-transform group-hover:scale-105">
                  <UIcon :name="f.icon" class="w-5 h-5" />
                </span>
                <div>
                  <h4 class="font-medium text-gray-900 dark:text-white">{{ f.title }}</h4>
                  <p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{{ f.description }}</p>
                </div>
              </li>
            </ul>
            <div class="flex flex-col sm:flex-row gap-3">
              <UButton
                :to="proSignupLink"
                color="primary"
                size="xl"
                icon="i-lucide-arrow-right"
                class="font-medium min-w-[200px]"
              >
                Rejoindre en tant que pro
              </UButton>
              <UButton
                v-if="proLearnMoreLink"
                :to="proLearnMoreLink"
                variant="outline"
                color="neutral"
                size="xl"
                class="font-medium"
              >
                En savoir plus
              </UButton>
            </div>
          </div>
        </div>
      </article>
    </div>

    <div v-if="$slots.default" class="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
interface Props {
  title?: string
  subtitle?: string
  nurseSignupLink?: string
  nurseLearnMoreLink?: string
  labSignupLink?: string
  labLearnMoreLink?: string
  proSignupLink?: string
  proLearnMoreLink?: string
  backgroundClass?: string
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
  backgroundClass: 'bg-gray-50 dark:bg-gray-950',
})

// Photos Unsplash (identité visuelle alignée avec les landings)
const nurseImage = 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800&q=80'
const labImage = 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=800&q=80'
const proImage = 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80'

const nurseFeatures = [
  { icon: 'i-lucide-trending-up', title: 'Augmentez vos revenus', description: 'Recevez des rendez-vous réguliers dans votre secteur. Multipliez votre volume d\'interventions sans effort commercial.' },
  { icon: 'i-lucide-clock', title: '100% flexible', description: 'Acceptez ou refusez les missions selon vos disponibilités. Vous gardez le contrôle total de votre planning.' },
  { icon: 'i-lucide-map-pin', title: 'Interventions géolocalisées', description: 'Recevez uniquement les demandes dans votre secteur. Optimisez vos déplacements et votre temps de trajet.' },
]

const labFeatures = [
  { icon: 'i-lucide-bar-chart-3', title: 'Augmentez votre volume', description: 'Développez votre activité de prélèvements à domicile et étendez votre zone de couverture géographique.' },
  { icon: 'i-lucide-users', title: 'Gestion d\'équipe optimisée', description: 'Centralisez la gestion de vos préleveurs et secrétaires. Assignez les missions en quelques clics.' },
  { icon: 'i-lucide-shield-check', title: 'Conformité HDS garantie', description: 'Plateforme certifiée avec chiffrement des données. Conformité totale pour votre tranquillité d\'esprit.' },
]

const proFeatures = [
  { icon: 'i-lucide-zap', title: 'Gain de temps garanti', description: 'Créez des rendez-vous en 5 minutes au lieu de 30. Accédez aux documents médicaux en un clic.' },
  { icon: 'i-lucide-heart-handshake', title: 'Suivi patient simplifié', description: 'Organisez les soins à domicile de vos patients et consultez leur historique médical complet.' },
  { icon: 'i-lucide-shield-check', title: 'Sécurité maximale', description: 'Plateforme certifiée HDS et RGPD. Vos données et celles de vos patients sont 100% sécurisées.' },
]
</script>

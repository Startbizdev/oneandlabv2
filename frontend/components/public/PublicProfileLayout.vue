<template>
  <!-- État de chargement -->
  <div v-if="loading" class="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
    <div class="text-center space-y-4">
      <div class="relative">
        <UIcon name="i-lucide-loader-2" class="w-12 h-12 animate-spin text-primary-500 mx-auto" />
        <div class="absolute inset-0 w-12 h-12 border-4 border-primary-100 dark:border-primary-900 rounded-full animate-pulse mx-auto" />
      </div>
      <p class="text-sm font-medium text-gray-600 dark:text-gray-400 animate-pulse">
        Chargement du profil...
      </p>
    </div>
  </div>

  <!-- État d'erreur : empty state marketing (infirmiers / laboratoires) -->
  <div v-else-if="error" class="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-primary-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-primary-950/20 px-4 py-12">
    <div class="max-w-lg w-full text-center">
      <UEmpty
        :icon="type === 'nurse' ? 'i-lucide-stethoscope' : 'i-lucide-building-2'"
        :title="type === 'nurse' ? 'Ce profil n\'est pas disponible' : 'Ce laboratoire n\'est pas disponible'"
        :description="type === 'nurse'
          ? 'Ce professionnel n\'a pas activé sa fiche ou le lien a changé. Découvrez les infirmiers à domicile près de chez vous et réservez en quelques clics.'
          : 'Ce laboratoire n\'a pas activé sa fiche ou le lien a changé. Découvrez les laboratoires de prélèvement à domicile près de chez vous.'"
        variant="naked"
        size="lg"
        :actions="[
          {
            label: type === 'nurse' ? 'Voir les autres infirmiers' : 'Voir les autres laboratoires',
            icon: type === 'nurse' ? 'i-lucide-users' : 'i-lucide-building-2',
            to: type === 'nurse' ? '/infirmiers' : '/laboratoires',
            color: 'primary',
            size: 'lg',
          },
          {
            label: 'Retour à l\'accueil',
            variant: 'outline',
            to: '/',
            size: 'lg',
          },
        ]"
      />
    </div>
  </div>

  <!-- Contenu principal (design partagé infirmier / lab) -->
  <div v-else-if="profile" class="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
    <PublicProfileHeader
      :profile="{ ...profile, reviews: profile.reviews }"
      :is-accepting="isAccepting"
      :share-url="shareUrl"
      :share-profile-name="profile.name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Profil'"
      :share-profile-type="type"
      :share-address="address ?? undefined"
    />

    <!-- Mobile : CTA + disponibilité juste sous le hero -->
    <div class="lg:hidden max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
      <div class="space-y-3">
        <UButton
          :to="bookingUrl"
          color="primary"
          size="xl"
          block
          :disabled="!isAccepting"
          class="font-medium justify-center text-base py-4"
        >
          <UIcon name="i-lucide-calendar-plus" class="h-5 w-5 mr-2" />
          Prendre rendez-vous
        </UButton>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <!-- Colonne principale : Bio, Services, Avis, FAQ (FAQ sous Avis) -->
        <div class="lg:col-span-2 space-y-6 lg:space-y-8">
          <!-- À propos : biographie + expérience et diplômes (infirmier) -->
          <UCard
            v-if="aboutSectionHasContent(profile)"
            class="shadow-sm hover:shadow-md transition-shadow duration-300 border-0 ring-1 ring-gray-200 dark:ring-gray-800"
            :ui="{ body: { padding: 'p-6 lg:p-8' } }"
          >
            <PublicProfileBio :biography="profile.biography" :about-title="aboutTitle(profile)" />
          </UCard>

          <!-- Mobile : Expérience + Diplômes juste sous À propos (infirmier) -->
          <UCard
            v-if="type === 'nurse' && (profile.years_experience || (profile.qualifications?.length > 0))"
            class="lg:hidden shadow-sm border-0 ring-1 ring-gray-200 dark:ring-gray-800"
            :ui="{ body: { padding: 'p-5 sm:p-6' } }"
          >
            <div class="space-y-4">
              <div v-if="profile.years_experience">
                <div class="flex items-center gap-2 mb-2">
                  <UIcon name="i-lucide-briefcase" class="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />
                  <p class="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Expérience</p>
                </div>
                <ul class="space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
                  <li class="flex items-start gap-2">
                    <span class="text-primary-500 dark:text-primary-400 mt-0.5 shrink-0">·</span>
                    <span>{{ yearsExperienceLabel(profile.years_experience) }}</span>
                  </li>
                </ul>
              </div>
              <div v-if="profile.qualifications?.length" :class="profile.years_experience ? 'pt-3 border-t border-gray-200 dark:border-gray-700' : ''">
                <div class="flex items-center gap-2 mb-2">
                  <UIcon name="i-lucide-graduation-cap" class="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />
                  <p class="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Diplômes et formations</p>
                </div>
                <ul class="space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
                  <li v-for="q in profile.qualifications" :key="q.code" class="flex items-start gap-2">
                    <span class="text-primary-500 dark:text-primary-400 mt-0.5 shrink-0">·</span>
                    <span>{{ q.label }}</span>
                  </li>
                </ul>
              </div>
            </div>
          </UCard>

          <!-- Infirmier : site + réseaux (expérience et diplômes sont dans le header) -->
          <UCard
            v-if="type === 'nurse' && nurseExtraHasContent(profile)"
            class="shadow-sm hover:shadow-md transition-shadow duration-300 border-0 ring-1 ring-gray-200 dark:ring-gray-800"
            :ui="{ body: { padding: 'p-6 lg:p-8' } }"
          >
            <div class="space-y-5">
              <h3 class="text-xl font-normal text-gray-900 dark:text-white flex items-center gap-2">
                <UIcon name="i-lucide-link" class="w-5 h-5 text-primary-500" />
                Liens utiles
              </h3>
              <div v-if="profile.website_url" class="flex items-center gap-2">
                <UIcon name="i-lucide-globe" class="w-5 h-5 text-gray-500 dark:text-gray-400 shrink-0" />
                <a :href="profile.website_url" target="_blank" rel="noopener noreferrer" class="text-primary-600 dark:text-primary-400 hover:underline">
                  Visiter le site
                </a>
              </div>
              <div v-if="socialLinksCount(profile.social_links) > 0" class="flex flex-wrap items-center gap-3">
                <a
                  v-if="profile.social_links?.facebook"
                  :href="profile.social_links.facebook"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  aria-label="Facebook"
                >
                  <UIcon name="i-simple-icons-facebook" class="w-5 h-5" />
                </a>
                <a
                  v-if="profile.social_links?.linkedin"
                  :href="profile.social_links.linkedin"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  aria-label="LinkedIn"
                >
                  <UIcon name="i-simple-icons-linkedin" class="w-5 h-5" />
                </a>
                <a
                  v-if="profile.social_links?.instagram"
                  :href="profile.social_links.instagram"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  aria-label="Instagram"
                >
                  <UIcon name="i-simple-icons-instagram" class="w-5 h-5" />
                </a>
              </div>
            </div>
          </UCard>

          <!-- Mobile : site web & réseaux (sidebar masquée sur mobile) -->
          <div
            v-if="type === 'lab' && labExtraHasContent(profile)"
            class="lg:hidden w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden"
          >
            <div class="px-3 py-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/50">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Site web & réseaux
              </p>
            </div>
            <div class="divide-y divide-gray-100 dark:divide-gray-800">
              <div v-if="hasWebsiteUrl(profile)" class="px-3 pt-3 pb-0">
                <a
                  :href="normalizeUrl(profile.website_url)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex items-center justify-center gap-2 w-full min-w-0 py-3 rounded-xl bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-800/50 transition-colors active:scale-[0.98] box-border"
                >
                  <UIcon name="i-lucide-globe" class="h-5 w-5 shrink-0" />
                  <span class="text-sm font-medium truncate">Visiter le site web</span>
                </a>
              </div>
              <div
                v-if="socialLinksCount(profile.social_links) > 0"
                class="grid grid-cols-3 gap-2 px-3 py-3 w-full"
              >
                <a
                  v-if="profile.social_links?.facebook"
                  :href="profile.social_links.facebook"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex flex-col items-center justify-center gap-2 min-w-0 w-full rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-[#1877f2] hover:text-white dark:hover:bg-[#1877f2] dark:hover:text-white transition-colors py-3 px-2"
                  aria-label="Facebook"
                >
                  <UIcon name="i-simple-icons-facebook" class="h-6 w-6 shrink-0" />
                  <span class="text-xs font-medium truncate w-full text-center">Facebook</span>
                </a>
                <a
                  v-if="profile.social_links?.instagram"
                  :href="profile.social_links.instagram"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex flex-col items-center justify-center gap-2 min-w-0 w-full rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gradient-to-br hover:from-[#f58529] hover:via-[#dd2a7b] hover:to-[#8134af] hover:text-white dark:hover:from-[#f58529] dark:hover:via-[#dd2a7b] dark:hover:to-[#8134af] dark:hover:text-white transition-colors py-3 px-2"
                  aria-label="Instagram"
                >
                  <UIcon name="i-simple-icons-instagram" class="h-6 w-6 shrink-0" />
                  <span class="text-xs font-medium truncate w-full text-center">Instagram</span>
                </a>
                <a
                  v-if="profile.social_links?.linkedin"
                  :href="profile.social_links.linkedin"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex flex-col items-center justify-center gap-2 min-w-0 w-full rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-[#0a66c2] hover:text-white dark:hover:bg-[#0a66c2] dark:hover:text-white transition-colors py-3 px-2"
                  aria-label="LinkedIn"
                >
                  <UIcon name="i-simple-icons-linkedin" class="h-6 w-6 shrink-0" />
                  <span class="text-xs font-medium truncate w-full text-center">LinkedIn</span>
                </a>
              </div>
            </div>
          </div>

          <UCard
            v-if="servicesToShow.length > 0"
            class="shadow-sm hover:shadow-md transition-shadow duration-300 border-0 ring-1 ring-gray-200 dark:ring-gray-800"
            :ui="{ body: { padding: 'p-6 lg:p-8' } }"
          >
            <PublicProfileServices
              :specializations="servicesToShow"
              :title="type === 'nurse' ? 'Soins proposés' : 'Services proposés'"
              :icon="type === 'nurse' ? 'i-lucide-stethoscope' : 'i-lucide-flask-conical'"
            />
          </UCard>

          <UCard
            class="shadow-sm hover:shadow-md transition-shadow duration-300 border-0 ring-1 ring-gray-200 dark:ring-gray-800"
            :ui="{ body: { padding: 'p-6 lg:p-8' } }"
          >
            <PublicProfileReviews
              :reviews="profile.reviews"
              :reviewee-id="profile.id"
              :reviewee-type="type === 'nurse' ? 'nurse' : 'subaccount'"
              @submitted="$emit('review-submitted')"
            />
          </UCard>

          <!-- FAQ : section sous Avis (pas dans la sidebar) -->
          <UCard
            v-if="faqItems && faqItems.length > 0"
            class="shadow-sm hover:shadow-md transition-shadow duration-300 border-0 ring-1 ring-gray-200 dark:ring-gray-800"
            :ui="{ body: { padding: 'p-6 lg:p-8' } }"
          >
            <PublicProfileFAQ :faq="faqItems" />
          </UCard>
        </div>

        <!-- Sidebar : CTA, Stats, Adresse + carte -->
        <div class="lg:col-span-1">
          <div class="sticky top-20 sm:top-24 space-y-6 z-40">
            <!-- CTA + Disponibilité : masqué sur mobile (affiché sous le hero) -->
            <div class="hidden lg:block space-y-3">
              <UButton
                :to="bookingUrl"
                color="primary"
                size="xl"
                block
                :disabled="!isAccepting"
                class="font-medium justify-center text-base py-4"
              >
                <UIcon name="i-lucide-calendar-plus" class="h-5 w-5 mr-2" />
                Prendre rendez-vous
              </UButton>
              <!-- Lab : horaires juste en dessous -->
              <OpeningHoursWeek
                v-if="type === 'lab' && openingHoursRows(profile?.opening_hours).length > 0"
                :opening-hours="profile?.opening_hours"
              />
              <!-- Lab : site web & réseaux (sous les horaires, même style compact) -->
              <div
                v-if="type === 'lab' && labExtraHasContent(profile)"
                class="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden"
              >
                <div class="px-2.5 py-1.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/50">
                  <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Site web & réseaux
                  </p>
                </div>
                <div class="divide-y divide-gray-100 dark:divide-gray-800">
                  <div v-if="hasWebsiteUrl(profile)" class="px-2.5 pt-2.5 pb-0">
                    <a
                      :href="normalizeUrl(profile.website_url)"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="flex items-center justify-center gap-2 w-full min-w-0 py-2.5 rounded-lg bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-800/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 box-border"
                    >
                      <UIcon name="i-lucide-globe" class="h-4 w-4 shrink-0" />
                      <span class="text-sm font-medium truncate">Visiter le site web</span>
                    </a>
                  </div>
                  <div
                    v-if="socialLinksCount(profile.social_links) > 0"
                    class="grid grid-cols-3 gap-1.5 px-2.5 py-2.5 w-full"
                  >
                    <a
                      v-if="profile.social_links?.facebook"
                      :href="profile.social_links.facebook"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="flex flex-col items-center justify-center gap-1 min-w-0 w-full rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-[#1877f2] hover:text-white dark:hover:bg-[#1877f2] dark:hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 py-2 px-1"
                      aria-label="Facebook"
                    >
                      <UIcon name="i-simple-icons-facebook" class="h-5 w-5 shrink-0" />
                      <span class="text-[10px] font-medium truncate w-full text-center leading-tight">Facebook</span>
                    </a>
                    <a
                      v-if="profile.social_links?.instagram"
                      :href="profile.social_links.instagram"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="flex flex-col items-center justify-center gap-1 min-w-0 w-full rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gradient-to-br hover:from-[#f58529] hover:via-[#dd2a7b] hover:to-[#8134af] hover:text-white dark:hover:from-[#f58529] dark:hover:via-[#dd2a7b] dark:hover:to-[#8134af] dark:hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 py-2 px-1"
                      aria-label="Instagram"
                    >
                      <UIcon name="i-simple-icons-instagram" class="h-5 w-5 shrink-0" />
                      <span class="text-[10px] font-medium truncate w-full text-center leading-tight">Instagram</span>
                    </a>
                    <a
                      v-if="profile.social_links?.linkedin"
                      :href="profile.social_links.linkedin"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="flex flex-col items-center justify-center gap-1 min-w-0 w-full rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-[#0a66c2] hover:text-white dark:hover:bg-[#0a66c2] dark:hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 py-2 px-1"
                      aria-label="LinkedIn"
                    >
                      <UIcon name="i-simple-icons-linkedin" class="h-5 w-5 shrink-0" />
                      <span class="text-[10px] font-medium truncate w-full text-center leading-tight">LinkedIn</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <!-- Carte Expérience + Diplômes (infirmier, sidebar ; masquée sur mobile, affichée sous À propos) -->
            <UCard
              v-if="type === 'nurse' && (profile.years_experience || (profile.qualifications?.length > 0))"
              class="hidden lg:block shadow-sm border-0 ring-1 ring-gray-200 dark:ring-gray-800"
              :ui="{ body: { padding: 'p-5 sm:p-6' } }"
            >
              <div class="space-y-4">
                <div v-if="profile.years_experience">
                  <div class="flex items-center gap-2 mb-2">
                    <UIcon name="i-lucide-briefcase" class="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />
                    <p class="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Expérience</p>
                  </div>
                  <ul class="space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
                    <li class="flex items-start gap-2">
                      <span class="text-primary-500 dark:text-primary-400 mt-0.5 shrink-0">·</span>
                      <span>{{ yearsExperienceLabel(profile.years_experience) }}</span>
                    </li>
                  </ul>
                </div>
                <div v-if="profile.qualifications?.length" :class="profile.years_experience ? 'pt-3 border-t border-gray-200 dark:border-gray-700' : ''">
                  <div class="flex items-center gap-2 mb-2">
                    <UIcon name="i-lucide-graduation-cap" class="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />
                    <p class="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Diplômes et formations</p>
                  </div>
                  <ul class="space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
                    <li v-for="q in profile.qualifications" :key="q.code" class="flex items-start gap-2">
                      <span class="text-primary-500 dark:text-primary-400 mt-0.5 shrink-0">·</span>
                      <span>{{ q.label }}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </UCard>

            <!-- Statistiques avis -->
            <UCard
              v-if="profile.reviews?.stats && profile.reviews.stats.total_reviews > 0"
              class="shadow-sm border-0 ring-1 ring-gray-200 dark:ring-gray-800"
              :ui="{ body: { padding: 'p-6' } }"
            >
              <div class="space-y-4">
                <h3 class="text-xl font-normal text-gray-900 dark:text-white flex items-center gap-2">
                  <UIcon name="i-lucide-star" class="w-5 h-5 text-yellow-500" />
                  Note moyenne
                </h3>
                <div class="flex items-baseline gap-4 pb-4 border-b border-gray-200 dark:border-gray-800">
                  <div class="text-4xl font-normal text-gray-900 dark:text-white">
                    {{ profile.reviews.stats.average_rating.toFixed(1) }}
                  </div>
                  <div class="flex-1">
                    <div class="flex items-center gap-1 mb-2">
                      <UIcon
                        v-for="i in 5"
                        :key="i"
                        :name="i <= Math.round(profile.reviews.stats.average_rating) ? 'i-heroicons-star-solid' : 'i-heroicons-star'"
                        :class="[
                          'w-5 h-5 transition-colors',
                          i <= Math.round(profile.reviews.stats.average_rating)
                            ? 'text-yellow-400'
                            : 'text-gray-300 dark:text-gray-700',
                        ]"
                      />
                    </div>
                    <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Basé sur {{ profile.reviews.stats.total_reviews }}
                      {{ profile.reviews.stats.total_reviews > 1 ? 'avis' : 'avis' }}
                    </p>
                  </div>
                </div>
              </div>
            </UCard>

            <!-- Adresse / Zone d'intervention : même design que Horaires (compact, homogène) -->
            <div class="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
              <div class="px-2.5 py-1.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/50">
                <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {{ type === 'nurse' ? "Zone d'intervention" : 'Adresse' }}
                </p>
              </div>
              <!-- Carte -->
              <div v-if="mapQuery" class="rounded-none overflow-hidden bg-gray-100 dark:bg-gray-800 h-[200px] w-full border-b border-gray-100 dark:border-gray-800">
                <ClientOnly v-if="mapCenter && radiusKm != null && radiusKm > 0">
                  <PublicProfileMapCircle
                    :lat="mapCenter.lat"
                    :lng="mapCenter.lng"
                    :radius-km="radiusKm"
                  />
                  <template #fallback>
                    <div class="w-full h-[200px] flex items-center justify-center">
                      <UIcon name="i-lucide-map-pin" class="w-10 h-10 text-gray-400" />
                    </div>
                  </template>
                </ClientOnly>
                <ClientOnly v-else>
                  <iframe
                    :src="mapIframeSrc"
                    class="w-full h-[200px] border-0 block"
                    loading="lazy"
                    referrerpolicy="no-referrer-when-downgrade"
                    title="Carte"
                  />
                  <template #fallback>
                    <div class="w-full h-[200px] flex items-center justify-center">
                      <UIcon name="i-lucide-map-pin" class="w-10 h-10 text-gray-400" />
                    </div>
                  </template>
                </ClientOnly>
              </div>
              <ul class="divide-y divide-gray-100 dark:divide-gray-800">
                <li class="flex items-start justify-between gap-2 px-2.5 py-1.5">
                  <span class="w-16 shrink-0 text-xs font-medium text-gray-700 dark:text-gray-300">Adresse</span>
                  <span v-if="address" class="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-line text-right leading-relaxed">
                    {{ address }}
                  </span>
                  <span v-else class="text-xs text-gray-400 dark:text-gray-500">Non renseignée</span>
                </li>
                <li v-if="(type === 'nurse' || type === 'lab') && radiusKm != null && radiusKm > 0" class="flex items-center justify-between gap-2 px-2.5 py-1.5">
                  <span class="w-16 shrink-0 text-xs font-medium text-gray-700 dark:text-gray-300">{{ type === 'nurse' ? 'Rayon' : 'Rayon' }}</span>
                  <span class="text-xs tabular-nums text-primary-600 dark:text-primary-400 font-medium">
                    {{ Math.round(radiusKm) }} km
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface FaqItem {
  question: string
  answer: string
}

defineEmits<{ 'review-submitted': [] }>()

const props = defineProps<{
  loading: boolean
  error: string | null
  profile: any
  faqItems: FaqItem[]
  /** Adresse affichée (pour infirmier : arrondissement + ville uniquement) */
  address?: string | null
  /** Centre carte (infirmier : zone de couverture) */
  mapCenter?: { lat: number; lng: number } | null
  /** Rayon en km (infirmier) pour afficher "Rayon d'intervention" */
  radiusKm?: number | null
  type: 'nurse' | 'lab'
}>()

const type = toRef(() => props.type)

const route = useRoute()
const config = useRuntimeConfig()
const shareUrl = computed(() => {
  const base = (config.public as { siteUrl?: string }).siteUrl || ''
  if (base) return `${base.replace(/\/$/, '')}${route.fullPath}`
  if (typeof window !== 'undefined') return window.location.href
  return ''
})

const isAccepting = computed(() => {
  if (!props.profile) return true
  return props.profile.is_accepting_appointments !== false
})

const displayNameForAcceptance = computed(() => {
  const p = props.profile
  if (!p) return 'Profil'
  if (props.type === 'nurse') {
    return `${(p.first_name || '').trim()} ${(p.last_name || '').trim()}`.trim() || p.name || 'Profil'
  }
  return (p.company_name || p.name || '').trim() || `${(p.first_name || '').trim()} ${(p.last_name || '').trim()}`.trim() || 'Profil'
})

const acceptanceLabel = computed(() => {
  const name = displayNameForAcceptance.value
  return isAccepting.value ? `${name} accepte les rendez-vous` : `${name} n'accepte pas les rendez-vous`
})

const bookingUrl = computed(() => {
  if (!props.profile?.id) return '/rendez-vous/nouveau'
  const params = new URLSearchParams({
    provider_id: props.profile.id,
    provider_type: props.type,
  })
  return `/rendez-vous/nouveau?${params.toString()}`
})

const DAY_LABELS: Record<string, string> = {
  monday: 'Lundi',
  tuesday: 'Mardi',
  wednesday: 'Mercredi',
  thursday: 'Jeudi',
  friday: 'Vendredi',
  saturday: 'Samedi',
  sunday: 'Dimanche',
}

const YEARS_LABELS: Record<string, string> = {
  '1': '1 an d\'expérience',
  '3': '3 ans d\'expérience',
  '5': '5 ans d\'expérience',
  '10': '10 ans d\'expérience',
  '10_plus': 'Plus de 10 ans d\'expérience',
}

function yearsExperienceLabel(value: string): string {
  return YEARS_LABELS[value] || value
}

function socialLinksCount(links: Record<string, string> | null | undefined): number {
  if (!links || typeof links !== 'object') return 0
  return [links.facebook, links.linkedin, links.instagram].filter(Boolean).length
}

function aboutSectionHasContent(profile: any): boolean {
  return !!profile?.biography
}

function aboutTitle(profile: any): string {
  const name = profile?.name || ''
  if (props.type === 'nurse') return name ? `À propos de l'infirmier(e) à domicile ${name}` : "À propos de l'infirmier(e) à domicile"
  return name ? `À propos du laboratoire ${name}` : 'À propos du laboratoire'
}

function hasWebsiteUrl(profile: any): boolean {
  const url = profile?.website_url
  return typeof url === 'string' && url.trim() !== ''
}

function normalizeUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') return '#'
  const u = url.trim()
  if (!u) return '#'
  return u.startsWith('http') ? u : `https://${u}`
}

function nurseExtraHasContent(profile: any): boolean {
  return hasWebsiteUrl(profile) || socialLinksCount(profile?.social_links) > 0
}

function labExtraHasContent(profile: any): boolean {
  return hasWebsiteUrl(profile) || socialLinksCount(profile?.social_links) > 0
}

function openingHoursRows(hours: Record<string, { start?: string; end?: string }> | null | undefined): { day: string; label: string; start: string; end: string }[] {
  if (!hours || typeof hours !== 'object') return []
  const order = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  return order.map((day) => ({
    day,
    label: DAY_LABELS[day] || day,
    start: hours[day]?.start || '',
    end: hours[day]?.end || '',
  }))
}

const servicesToShow = computed(() => {
  const p = props.profile
  if (!p) return []
  if (props.type === 'nurse' && p.specializations?.length) {
    return p.specializations
  }
  if (props.type === 'lab' && p.services?.length) {
    return p.services.map((s: any) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      type: 'blood_test',
      icon: s.icon ?? null,
    }))
  }
  return []
})

const mapQuery = computed(() => {
  if (props.mapCenter && typeof props.mapCenter.lat === 'number' && typeof props.mapCenter.lng === 'number') {
    return `${props.mapCenter.lat},${props.mapCenter.lng}`
  }
  const a = props.address?.trim()
  return a || null
})

const mapIframeSrc = computed(() => {
  const q = mapQuery.value
  if (!q) return ''
  const zoom = 9
  return `https://www.google.com/maps?q=${encodeURIComponent(q)}&z=${zoom}&output=embed`
})
</script>

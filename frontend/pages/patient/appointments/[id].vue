<template>
  <div class="bg-gray-50/50 dark:bg-gray-950/50 pb-10">
    <div class="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <NuxtLink
        to="/patient"
        class="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 mb-6"
      >
        <UIcon name="i-lucide-arrow-left" class="w-4 h-4" />
        Retour à ma liste
      </NuxtLink>

      <div v-if="loading" class="flex flex-col items-center justify-center py-24">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-gray-400 mb-4" />
        <p class="text-sm text-gray-500">Chargement du rendez-vous...</p>
      </div>

      <div v-else-if="error" class="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-4">
        <p class="text-sm font-medium text-red-800 dark:text-red-200">{{ error }}</p>
      </div>

      <template v-else-if="appointment">
        <header class="mb-6 overflow-hidden rounded-3xl border border-primary-100/80 bg-white shadow-sm shadow-primary-950/5 dark:border-primary-900/40 dark:bg-gray-900/70">
          <div class="relative px-5 py-5 sm:px-6 sm:py-6">
            <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary-500 via-primary-400 to-primary-300" />
            <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div class="min-w-0 space-y-4">
                <div class="flex items-start gap-4">
                  <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-700 ring-1 ring-primary-100 dark:bg-primary-950/50 dark:text-primary-300 dark:ring-primary-900/60">
                    <UIcon :name="appointmentSummary.icon" class="h-6 w-6" />
                  </div>
                  <div class="min-w-0">
                    <p class="text-xs font-semibold uppercase tracking-[0.18em] text-primary-600 dark:text-primary-300">
                      OneAndLab
                    </p>
                    <h1 class="mt-1 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
                      {{ appointmentSummary.title }}
                    </h1>
                    <p class="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                      {{ appointmentSummary.typeText }}
                      <template v-if="appointmentSummary.nextLabel">
                        · Prochain créneau : {{ appointmentSummary.nextLabel }}
                      </template>
                    </p>
                  </div>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  <span class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold" :class="statusBadgeClass(appointment.status)">
                    {{ getStatusLabel(appointment.status) }}
                  </span>
                  <span class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold" :class="typeBadgeClass(appointment.type)">
                    <UIcon :name="appointmentIcon(appointment.type)" class="h-3.5 w-3.5" />
                    {{ appointmentSummary.typeText }}
                  </span>
                  <span v-if="isMultiBatch" class="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700 ring-1 ring-primary-100 dark:bg-primary-950/40 dark:text-primary-300 dark:ring-primary-900/60">
                    <UIcon name="i-lucide-layers" class="h-3.5 w-3.5" />
                    {{ batchAppointmentsSorted.length }} créneaux
                  </span>
                </div>
              </div>
              <div class="grid gap-3 rounded-2xl bg-gray-50/80 p-4 text-sm dark:bg-gray-800/50 lg:w-80">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Adresse</p>
                  <p class="mt-1 font-medium leading-snug text-gray-950 dark:text-white">
                    {{ appointmentSummary.addressText || 'Adresse à confirmer' }}
                  </p>
                  <p v-if="appointmentSummary.complement" class="mt-1 text-gray-500 dark:text-gray-400">
                    Complément : {{ appointmentSummary.complement }}
                  </p>
                </div>
                <div class="flex flex-wrap gap-2">
                  <UButton
                    v-if="resultatsDocuments.length > 0"
                    color="primary"
                    variant="soft"
                    size="sm"
                    icon="i-lucide-file-check"
                    to="#resultats"
                  >
                    Résultats
                  </UButton>
                  <UButton
                    v-if="anyCompletedWithoutReview"
                    color="primary"
                    size="sm"
                    icon="i-lucide-star"
                    @click="scrollToAvisSection"
                  >
                    Laisser un avis
                  </UButton>
                  <UButton
                    v-if="['pending', 'confirmed', 'planned'].includes(appointment.status)"
                    color="error"
                    variant="outline"
                    size="sm"
                    icon="i-lucide-x"
                    @click="showCancelModal = true"
                  >
                    Annuler
                  </UButton>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section
          v-if="appointment && isCanceledAppointment(appointment.status)"
          class="mb-6 rounded-xl border border-amber-200/90 dark:border-amber-900/50 bg-amber-50/90 dark:bg-amber-950/25 px-5 py-4 space-y-3 shadow-sm"
        >
          <div class="flex items-center gap-2 text-amber-900 dark:text-amber-100">
            <UIcon name="i-lucide-info" class="w-5 h-5 shrink-0" />
            <h2 class="text-sm font-semibold">Détail de l’annulation</h2>
          </div>
          <p v-if="cancellationReasonLabel" class="text-sm text-gray-800 dark:text-gray-200">
            <span class="font-medium text-gray-900 dark:text-gray-100">Motif :</span>
            {{ cancellationReasonLabel }}
          </p>
          <p
            v-if="appointment.cancellation_comment"
            class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed"
          >
            {{ appointment.cancellation_comment }}
          </p>
          <div v-if="cancellationPhotoObjectUrl" class="pt-1">
            <button
              type="button"
              class="group block text-left rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              @click="cancellationZoomOpen = true"
            >
              <img
                :src="cancellationPhotoObjectUrl"
                alt="Pièce jointe — annulation"
                class="max-h-52 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm group-hover:opacity-95 transition-opacity"
              />
            </button>
          </div>
        </section>

        <ClientOnly>
          <Teleport to="body">
            <div
              v-if="cancellationZoomOpen && cancellationPhotoObjectUrl"
              class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
              role="dialog"
              aria-modal="true"
              aria-label="Photo d’annulation"
              @click.self="cancellationZoomOpen = false"
            >
              <button
                type="button"
                class="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20 transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                aria-label="Fermer la photo"
                @click="cancellationZoomOpen = false"
              >
                <UIcon name="i-lucide-x" class="h-5 w-5" />
              </button>
              <img
                :src="cancellationPhotoObjectUrl"
                alt="Photo d’annulation — plein écran"
                class="max-h-[90vh] w-auto max-w-full object-contain rounded-lg shadow-xl"
                @click.stop
              />
            </div>
          </Teleport>
        </ClientOnly>

        <div class="space-y-8">
          <!-- RDV terminé : rappel + accès rapide à l’avis -->
          <section
            v-if="showCompletedHero"
            class="rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50/95 via-white to-emerald-50/40 dark:from-emerald-950/30 dark:via-gray-900/60 dark:to-emerald-950/20 overflow-hidden shadow-sm"
          >
            <div class="px-4 py-4 sm:px-5 sm:py-5">
              <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                <div class="flex items-start gap-3 min-w-0">
                  <div
                    class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200/70 dark:ring-emerald-800/50"
                    aria-hidden="true"
                  >
                    <UIcon name="i-lucide-circle-check" class="w-6 h-6" />
                  </div>
                  <div class="min-w-0">
                    <p class="text-[15px] font-semibold text-gray-900 dark:text-white leading-snug">
                      {{ completedHeroSentence }}
                    </p>
                    <p class="mt-1 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      <template v-if="anyCompletedWithReview && !anyCompletedWithoutReview">
                        Merci d’avoir partagé votre expérience — chaque avis compte pour la communauté.
                      </template>
                      <template v-else-if="anyCompletedWithoutReview">
                        Un retour rapide sur la qualité des soins aide les autres patients et les professionnels.
                      </template>
                      <template v-else>
                        {{
                          isMultiBatch
                            ? 'Un ou plusieurs soins sont clôturés. Les détails figurent ci-dessous.'
                            : appointment?.type === 'blood_test'
                              ? 'Ce rendez-vous est clôturé. Aucun avis n’est disponible sans laboratoire associé.'
                              : 'Ce rendez-vous est clôturé. Aucun avis n’est disponible (intervenant non renseigné).'
                        }}
                      </template>
                    </p>
                  </div>
                </div>
                <div class="flex flex-col sm:flex-row gap-2 shrink-0 w-full sm:w-auto">
                  <UButton
                    v-if="anyCompletedWithoutReview"
                    color="primary"
                    size="md"
                    icon="i-lucide-star"
                    class="justify-center"
                    @click="scrollToAvisSection"
                  >
                    Laisser un avis
                  </UButton>
                  <UButton
                    v-else-if="anyCompletedWithReview"
                    variant="outline"
                    color="neutral"
                    size="md"
                    icon="i-lucide-message-circle"
                    class="justify-center"
                    @click="scrollToAvisSection"
                  >
                    Voir {{ isMultiBatch ? 'mes avis' : 'mon avis' }}
                  </UButton>
                </div>
              </div>
            </div>
          </section>

          <!-- Parcours du lot : compact, sans répéter les informations communes -->
          <section
            v-if="isMultiBatch"
            class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/60"
          >
            <div class="border-b border-gray-100 px-5 py-4 dark:border-gray-800 sm:px-6">
              <div class="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.16em] text-primary-600 dark:text-primary-300">
                    Parcours
                  </p>
                  <h2 class="mt-1 text-lg font-semibold text-gray-950 dark:text-white">
                    Vos créneaux, dans l’ordre
                  </h2>
                </div>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ batchAppointmentsSorted.length }} soins regroupés dans la même demande
                </p>
              </div>
            </div>
            <div class="divide-y divide-gray-100 dark:divide-gray-800">
              <article
                v-for="item in batchTimelineItems"
                :key="item.id"
                class="grid gap-4 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:px-6"
              >
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary-50 text-xs font-semibold text-primary-700 ring-1 ring-primary-100 dark:bg-primary-950/50 dark:text-primary-300 dark:ring-primary-900/60">
                      {{ item.index + 1 }}
                    </span>
                    <h3 class="text-sm font-semibold text-gray-950 dark:text-white">
                      {{ item.title }}
                    </h3>
                    <span class="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold" :class="statusBadgeClass(item.status)">
                      {{ getStatusLabel(item.status) }}
                    </span>
                  </div>
                  <div class="mt-3 grid gap-2 text-sm text-gray-600 dark:text-gray-300 sm:grid-cols-2">
                    <p class="flex items-center gap-2">
                      <UIcon name="i-lucide-calendar-days" class="h-4 w-4 text-gray-400" />
                      {{ item.meta }}
                    </p>
                    <p v-if="item.duration" class="flex items-center gap-2">
                      <UIcon name="i-lucide-clock-3" class="h-4 w-4 text-gray-400" />
                      {{ item.duration }}
                    </p>
                    <p v-if="!appointmentSummary.addressSame && item.address" class="flex items-start gap-2 sm:col-span-2">
                      <UIcon name="i-lucide-map-pin" class="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                      <span>{{ item.address }}</span>
                    </p>
                    <p v-if="item.addressComplement" class="flex items-start gap-2 sm:col-span-2">
                      <UIcon name="i-lucide-info" class="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                      <span>Complément : {{ item.addressComplement }}</span>
                    </p>
                  </div>
                  <div
                    v-if="item.bannerPhase && item.bannerPhase !== 'hidden'"
                    class="mt-3 overflow-hidden rounded-xl border px-3 py-3 shadow-sm"
                    :class="preleveurBannerClassFor(item.bannerPhase)"
                    role="status"
                    aria-live="polite"
                  >
                    <div class="flex items-start gap-3">
                      <div class="relative shrink-0">
                        <span class="absolute inset-0 rounded-full opacity-40 motion-safe:animate-ping" :class="item.bannerPhase === 'arrive' ? 'bg-emerald-400' : 'bg-sky-400'" />
                        <UserAvatar
                          :src="profileImageUrl(item.appt?.assigned_to_profile_image_url ?? null) ?? undefined"
                          :initial="(item.appt?.assigned_to_display_name || item.appt?.assigned_to_name || 'P').charAt(0).toUpperCase()"
                          alt="Préleveur"
                          size="md"
                          class="relative ring-2 ring-white dark:ring-gray-900"
                        />
                        <span class="absolute -bottom-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-white shadow-sm ring-2 ring-white dark:ring-gray-900" :class="item.bannerPhase === 'arrive' ? 'bg-emerald-500' : 'bg-sky-500'">
                          <UIcon :name="item.bannerPhase === 'arrive' ? 'i-lucide-map-pin-check' : 'i-lucide-navigation'" class="h-3 w-3" />
                        </span>
                      </div>
                      <div class="min-w-0">
                        <p class="text-sm font-semibold leading-snug">
                          {{ preleveurBannerTextFor(item.appt, item.bannerPhase) }}
                        </p>
                        <p class="mt-0.5 text-xs opacity-80">
                          {{ preleveurBannerSubtitleFor(item.appt, item.bannerPhase) }}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </section>

          <!-- Équipe consolidée : un professionnel n’apparaît qu’une fois par lot -->
          <section
            v-if="hasCareTeamGroups"
            class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/60"
          >
            <div class="border-b border-gray-100 px-5 py-4 dark:border-gray-800 sm:px-6">
              <p class="text-xs font-semibold uppercase tracking-[0.16em] text-primary-600 dark:text-primary-300">
                Équipe
              </p>
              <h2 class="mt-1 text-lg font-semibold text-gray-950 dark:text-white">
                Qui s’occupe de vous
              </h2>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Les intervenants sont regroupés pour éviter les doublons sur les rendez-vous multiples.
              </p>
            </div>
            <div class="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
              <article
                v-for="group in careTeamGroups"
                :key="group.key"
                class="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm transition-colors hover:border-primary-200 dark:border-gray-800 dark:bg-gray-900/70 dark:hover:border-primary-900/60"
              >
                <div class="p-4">
                  <div class="flex items-start gap-4">
                    <UserAvatar
                      v-if="group.kind !== 'pending'"
                      :src="profileImageUrl(group.imageUrl ?? null) ?? undefined"
                      :initial="group.initial"
                      :alt="group.name"
                      size="lg"
                      class="ring-2 ring-white dark:ring-gray-900"
                    />
                    <div
                      v-else
                      class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:ring-gray-700"
                    >
                      <UIcon name="i-lucide-user-search" class="h-6 w-6" />
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="flex flex-wrap items-center gap-2">
                        <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                          {{ group.label }}
                        </p>
                        <span class="rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-semibold text-primary-700 ring-1 ring-primary-100 dark:bg-primary-950/45 dark:text-primary-300 dark:ring-primary-900/60">
                          {{ group.appointmentIds.length > 1 ? `${group.appointmentIds.length} soins` : '1 soin' }}
                        </span>
                      </div>
                      <p class="mt-1 truncate text-base font-semibold text-gray-950 dark:text-white">
                        {{ group.name }}
                      </p>
                      <p v-if="group.address" class="mt-2 flex items-start gap-2 text-sm leading-snug text-gray-600 dark:text-gray-300">
                        <UIcon name="i-lucide-map-pin" class="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                        <span>{{ group.address }}</span>
                      </p>
                      <p v-if="group.kind === 'pending'" class="mt-2 text-sm leading-snug text-gray-600 dark:text-gray-300">
                        Vous serez notifié dès qu’un professionnel aura accepté ou été attribué à votre demande.
                      </p>
                      <div v-if="isMultiBatch" class="mt-3 flex flex-wrap gap-1.5">
                        <span
                          v-for="label in group.appointmentLabels"
                          :key="group.key + label"
                          class="rounded-full bg-gray-50 px-2 py-1 text-xs text-gray-600 ring-1 ring-gray-200 dark:bg-gray-800/80 dark:text-gray-300 dark:ring-gray-700"
                        >
                          {{ label }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  v-if="group.phone || group.publicSlug"
                  class="flex items-center gap-1 border-t border-gray-100 bg-gray-50/70 px-2 py-2 dark:border-gray-800 dark:bg-gray-950/20"
                >
                  <button
                    v-if="group.phone"
                    type="button"
                    class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-white hover:text-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-gray-300 dark:hover:bg-gray-900 dark:hover:text-primary-300"
                    @click="openTel(group.phone)"
                  >
                    <UIcon name="i-lucide-phone" class="h-4 w-4" />
                    Appeler
                  </button>
                  <button
                    v-if="group.phone && group.kind !== 'pending'"
                    type="button"
                    class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-white hover:text-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-gray-300 dark:hover:bg-gray-900 dark:hover:text-primary-300"
                    @click="openSmsToProfessional(group.phone, professionalContactKindForGroup(group), group.appointmentRef)"
                  >
                    <UIcon name="i-lucide-message-circle" class="h-4 w-4" />
                    Message
                  </button>
                  <button
                    v-if="group.publicSlug && group.kind === 'lab'"
                    type="button"
                    class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-primary-700 transition-colors hover:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-primary-300 dark:hover:bg-primary-950/35"
                    @click="sheetProfileAppt = group.appointmentRef; showLabProfileSheet = true"
                  >
                    <UIcon name="i-lucide-id-card" class="h-4 w-4" />
                    Profil
                  </button>
                  <button
                    v-if="group.publicSlug && group.kind === 'nurse'"
                    type="button"
                    class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-primary-700 transition-colors hover:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-primary-300 dark:hover:bg-primary-950/35"
                    @click="sheetProfileAppt = group.appointmentRef; showNurseProfileSheet = true"
                  >
                    <UIcon name="i-lucide-id-card" class="h-4 w-4" />
                    Profil
                  </button>
                </div>
              </article>
            </div>
          </section>

          <!-- Bloc principal : infos RDV (une section par soin si lot multisoins) -->
          <section
            v-for="(appt, apIdx) in (isMultiBatch ? [] : batchAppointmentsSorted)"
            :key="appt.id"
            class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 overflow-hidden"
          >
            <div class="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 class="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <template v-if="isMultiBatch">
                  Rendez-vous — {{ appt.category_name || appt.form_data?.category_name || `Soin ${apIdx + 1}` }}
                </template>
                <template v-else>
                  Rendez-vous
                </template>
              </h2>
            </div>
            <!-- Prise de sang : préleveur en route (30 min avant) puis arrivé jusqu'à clôture -->
            <div
              v-if="preleveurBannerPhaseById[appt.id] && preleveurBannerPhaseById[appt.id] !== 'hidden'"
              class="mx-5 mt-4 overflow-hidden rounded-xl border px-4 py-3 shadow-sm"
              :class="preleveurBannerClassFor(preleveurBannerPhaseById[appt.id])"
              role="status"
              aria-live="polite"
            >
              <div class="flex items-start gap-3">
                <div class="relative shrink-0" aria-hidden="true">
                  <span class="absolute inset-0 rounded-full opacity-40 motion-safe:animate-ping" :class="preleveurBannerPhaseById[appt.id] === 'arrive' ? 'bg-emerald-400' : 'bg-sky-400'" />
                  <UserAvatar
                    :src="profileImageUrl(appt?.assigned_to_profile_image_url ?? null) ?? undefined"
                    :initial="(appt.assigned_to_display_name || appt.assigned_to_name || 'P').charAt(0).toUpperCase()"
                    alt="Préleveur"
                    size="lg"
                    class="relative ring-2 ring-white dark:ring-gray-900"
                  />
                  <span class="absolute -bottom-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-white shadow-sm ring-2 ring-white dark:ring-gray-900" :class="preleveurBannerPhaseById[appt.id] === 'arrive' ? 'bg-emerald-500' : 'bg-sky-500'">
                    <UIcon :name="preleveurBannerPhaseById[appt.id] === 'arrive' ? 'i-lucide-map-pin-check' : 'i-lucide-navigation'" class="h-3 w-3" />
                  </span>
                </div>
                <div class="min-w-0 pt-0.5">
                  <p class="text-sm font-semibold leading-snug">
                    {{ preleveurBannerTextFor(appt, preleveurBannerPhaseById[appt.id]) }}
                  </p>
                  <p class="mt-0.5 text-xs opacity-80">
                    {{ preleveurBannerSubtitleFor(appt, preleveurBannerPhaseById[appt.id]) }}
                  </p>
                </div>
              </div>
            </div>
            <dl class="divide-y divide-gray-100 dark:divide-gray-800">
              <div class="flex justify-between gap-4 px-5 py-3.5">
                <dt class="text-sm text-gray-500 dark:text-gray-400">Statut</dt>
                <dd class="text-sm font-medium text-gray-900 dark:text-white text-right">
                  <span
                    class="inline-flex rounded px-1.5 py-0.5 text-xs font-medium"
                    :class="statusBadgeClass(appt.status)"
                  >
                    {{ getStatusLabel(appt.status) }}
                  </span>
                </dd>
              </div>
              <div class="flex justify-between gap-4 px-5 py-3.5">
                <dt class="text-sm text-gray-500 dark:text-gray-400">Date</dt>
                <dd class="text-sm font-medium text-gray-900 dark:text-white text-right">
                  {{ formatDate(appt.scheduled_at) }}
                </dd>
              </div>
              <div class="flex justify-between gap-4 px-5 py-3.5">
                <dt class="text-sm text-gray-500 dark:text-gray-400">Type</dt>
                <dd class="text-sm font-medium text-gray-900 dark:text-white text-right">
                  {{ appt.type === 'blood_test' ? 'Prise de sang' : 'Soins infirmiers' }}
                </dd>
              </div>
              <div v-if="appt.duration_minutes" class="flex justify-between gap-4 px-5 py-3.5">
                <dt class="text-sm text-gray-500 dark:text-gray-400">Durée</dt>
                <dd class="text-sm font-medium text-gray-900 dark:text-white text-right">
                  {{ appt.duration_minutes }} min
                </dd>
              </div>
              <div v-if="appt.category_name || appt.form_data?.category_name" class="flex justify-between gap-4 px-5 py-3.5">
                <dt class="text-sm text-gray-500 dark:text-gray-400">{{ bloodTestItemsFor(appt).length > 1 ? 'Acte principal' : 'Type de soins' }}</dt>
                <dd class="text-sm font-medium text-gray-900 dark:text-white text-right">
                  {{ appt.category_name || appt.form_data?.category_name }}
                </dd>
              </div>
              <div v-if="bloodTestItemsFor(appt).length > 1" class="px-5 py-3.5">
                <dt class="text-sm text-gray-500 dark:text-gray-400 mb-2">Actes de prise de sang</dt>
                <dd class="flex flex-wrap gap-1.5">
                  <span
                    v-for="item in bloodTestItemsFor(appt)"
                    :key="item.id || item.category_id || item.label"
                    class="inline-flex max-w-full rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 ring-1 ring-red-100 dark:bg-red-950/30 dark:text-red-300 dark:ring-red-900/40"
                  >
                    <span class="truncate">{{ item.label || item.category_name || 'Acte' }}</span>
                  </span>
                </dd>
              </div>
              <div v-if="appt.form_data?.availability" class="flex justify-between gap-4 px-5 py-3.5">
                <dt class="text-sm text-gray-500 dark:text-gray-400">Disponibilités</dt>
                <dd class="text-sm font-medium text-gray-900 dark:text-white text-right">
                  {{ formatAvailability(appt.form_data.availability) }}
                </dd>
              </div>
              <div class="px-5 py-3.5">
                <dt class="text-sm text-gray-500 dark:text-gray-400 mb-1">Adresse</dt>
                <dd class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ displayAddressFor(appt) }}
                </dd>
                <dd v-if="addressComplementFor(appt)" class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Complément : {{ addressComplementFor(appt) }}
                </dd>
              </div>
            </dl>
          </section>

          <!-- Section Qui s'occupe de vous : par soin si lot multisoins -->
          <template v-for="appt in []" :key="'who-' + appt.id">
          <section
            v-if="showWhoSectionFor(appt)"
            class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 overflow-hidden"
          >
            <div class="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 class="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <template v-if="isMultiBatch">
                  Qui s’occupe de vous — {{ appt.category_name || appt.form_data?.category_name || 'Soin' }}
                </template>
                <template v-else>
                  Qui s'occupe de vous
                </template>
              </h2>
            </div>
            <!-- Empty state : RDV en attente, aucun pro assigné -->
            <div
              v-if="isAssignmentPendingFor(appt)"
              class="flex flex-col items-center justify-center text-center px-5 py-12"
            >
              <div class="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <UIcon name="i-lucide-user-search" class="w-6 h-6 text-gray-400 dark:text-gray-500" />
              </div>
              <p class="text-sm font-medium text-gray-900 dark:text-white mb-1">
                Recherche en cours
              </p>
              <p class="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                Nous recherchons actuellement un professionnel disponible pour votre rendez-vous. Vous serez notifié dès qu’un laboratoire ou un infirmier aura accepté votre demande.
              </p>
            </div>
            <div v-else class="divide-y divide-gray-100 dark:divide-gray-800">
              <!-- Laboratoire (toujours "Laboratoire", pas sous-compte) : logo, nom, adresse, tél -->
              <div
                v-if="appt.type === 'blood_test' && (appt.assigned_lab_id || appt.assigned_lab_display_name)"
                class="px-5 py-4"
              >
                <div class="flex items-start gap-4">
                  <div class="flex-shrink-0">
                    <UserAvatar
                      :src="profileImageUrl(appt?.assigned_lab_profile_image_url ?? null) ?? undefined"
                      :initial="(appt.assigned_lab_display_name || 'L').charAt(0).toUpperCase()"
                      alt="Laboratoire"
                      size="lg"
                    />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-0.5">
                      Laboratoire
                    </p>
                    <p class="text-sm font-semibold text-gray-900 dark:text-white">
                      {{ appt.assigned_lab_display_name || 'Laboratoire' }}
                    </p>
                    <dl class="mt-3 space-y-2">
                      <div v-if="appt.assigned_lab_address" class="flex items-start gap-2">
                        <UIcon name="i-lucide-map-pin" class="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                        <dd class="text-sm text-gray-700 dark:text-gray-300">{{ appt.assigned_lab_address }}</dd>
                      </div>
                      <div v-if="appt.assigned_lab_phone" class="mt-1">
                        <div class="flex flex-col gap-2 w-full sm:flex-row sm:flex-wrap sm:items-stretch">
                          <UButton
                            color="success"
                            variant="soft"
                            size="sm"
                            icon="i-lucide-phone"
                            class="justify-center w-full sm:w-auto sm:min-w-[7.5rem]"
                            @click="openTel(appt.assigned_lab_phone as string)"
                          >
                            Appeler
                          </UButton>
                          <UButton
                            color="neutral"
                            variant="soft"
                            size="sm"
                            icon="i-lucide-message-square"
                            class="justify-center w-full sm:w-auto sm:min-w-[7.5rem]"
                            @click="openSmsToProfessional(appt.assigned_lab_phone as string, 'lab', appt)"
                          >
                            Message
                          </UButton>
                        </div>
                      </div>
                      <div v-if="appt.assigned_lab_public_slug" class="mt-3">
                        <UButton
                          variant="outline"
                          color="primary"
                          size="sm"
                          icon="i-lucide-user"
                          @click="sheetProfileAppt = appt; showLabProfileSheet = true"
                        >
                          Voir le profil
                        </UButton>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>

              <!-- Labo connu, préleveur pas encore désigné -->
              <div
                v-if="showBloodTestPreleveurPendingMessageFor(appt)"
                class="px-5 py-4 bg-gray-50/80 dark:bg-gray-800/30"
              >
                <div class="flex items-start gap-3">
                  <UIcon name="i-lucide-user-clock" class="w-5 h-5 shrink-0 text-gray-400 mt-0.5" />
                  <div class="min-w-0">
                    <p class="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-0.5">
                      Préleveur
                    </p>
                    <p class="text-sm text-gray-700 dark:text-gray-300 leading-snug">
                      Un préleveur vous sera désigné par votre laboratoire. Vous serez notifié dès qu’il sera attribué à votre rendez-vous.
                    </p>
                  </div>
                </div>
              </div>

              <!-- Préleveur : photo, nom, tél (pas d'adresse ni email) -->
              <div
                v-if="appt.type === 'blood_test' && (appt.assigned_to || appt.assigned_to_display_name)"
                class="px-5 py-4"
              >
                <div class="flex items-start gap-4">
                  <div class="flex-shrink-0">
                    <UserAvatar
                      :src="profileImageUrl(appt?.assigned_to_profile_image_url ?? null) ?? undefined"
                      :initial="(appt.assigned_to_display_name || appt.assigned_to_name || 'P').charAt(0).toUpperCase()"
                      alt="Préleveur"
                      size="lg"
                    />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-0.5">
                      Préleveur
                    </p>
                    <p class="text-sm font-semibold text-gray-900 dark:text-white">
                      {{ appt.assigned_to_display_name || appt.assigned_to_name || 'Assigné' }}
                    </p>
                    <div v-if="appt.assigned_to_phone" class="mt-3">
                      <div class="flex flex-col gap-2 w-full sm:flex-row sm:flex-wrap sm:items-stretch">
                        <UButton
                          color="success"
                          variant="soft"
                          size="sm"
                          icon="i-lucide-phone"
                          class="justify-center w-full sm:w-auto sm:min-w-[7.5rem]"
                          @click="openTel(appt.assigned_to_phone as string)"
                        >
                          Appeler
                        </UButton>
                        <UButton
                          color="neutral"
                          variant="soft"
                          size="sm"
                          icon="i-lucide-message-square"
                          class="justify-center w-full sm:w-auto sm:min-w-[7.5rem]"
                          @click="openSmsToProfessional(appt.assigned_to_phone as string, 'preleveur', appt)"
                        >
                          Message
                        </UButton>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Soins infirmiers : infirmier -->
              <div
                v-if="appt.type === 'nursing' && (appt.assigned_nurse_id || appt.assigned_nurse_display_name)"
                class="px-5 py-4"
              >
                <div class="flex items-start gap-4">
                  <div class="flex-shrink-0">
                    <UserAvatar
                      :src="profileImageUrl(appt?.assigned_nurse_profile_image_url ?? null) ?? undefined"
                      :initial="(appt.assigned_nurse_display_name || 'I').charAt(0).toUpperCase()"
                      alt="Infirmier"
                      size="lg"
                    />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-0.5">
                      Infirmier
                    </p>
                    <p class="text-sm font-semibold text-gray-900 dark:text-white">
                      {{ appt.assigned_nurse_display_name || appt.assigned_to_name || 'Assigné' }}
                    </p>
                    <div v-if="appt.assigned_nurse_phone" class="mt-3">
                      <div class="flex flex-col gap-2 w-full sm:flex-row sm:flex-wrap sm:items-stretch">
                        <UButton
                          color="success"
                          variant="soft"
                          size="sm"
                          icon="i-lucide-phone"
                          class="justify-center w-full sm:w-auto sm:min-w-[7.5rem]"
                          @click="openTel(appt.assigned_nurse_phone as string)"
                        >
                          Appeler
                        </UButton>
                        <UButton
                          color="neutral"
                          variant="soft"
                          size="sm"
                          icon="i-lucide-message-square"
                          class="justify-center w-full sm:w-auto sm:min-w-[7.5rem]"
                          @click="openSmsToProfessional(appt.assigned_nurse_phone as string, 'nurse', appt)"
                        >
                          Message
                        </UButton>
                      </div>
                    </div>
                    <div v-if="appt.assigned_nurse_public_slug" class="mt-3">
                      <UButton
                        variant="outline"
                        color="primary"
                        size="sm"
                        icon="i-lucide-user"
                        @click="sheetProfileAppt = appt; showNurseProfileSheet = true"
                      >
                        Voir le profil
                      </UButton>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
          </template>

          <!-- RDV pour un proche : mineur + vos coordonnées titulaire -->
          <section
            v-if="appointment.relative && (showRelativeMinorInfoPatient || showBookingContactOnPatientPage)"
            class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 overflow-hidden"
          >
            <div class="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 class="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Rendez-vous pour un proche
              </h2>
            </div>
            <div class="px-5 py-4 space-y-4">
              <div
                v-if="showRelativeMinorInfoPatient"
                class="rounded-lg border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/20 px-3 py-2.5"
                role="status"
              >
                <p class="text-sm text-amber-950 dark:text-amber-100 leading-snug">
                  <span class="font-medium">Personne mineure</span><template v-if="appointment.relative.age_years != null && appointment.relative.age_years !== undefined">
                    ({{ appointment.relative.age_years }} an{{ appointment.relative.age_years === 1 ? '' : 's' }})
                  </template>
                  — ce rendez-vous vous a été réservé en tant que titulaire du compte ; vos coordonnées ci-dessous sont celles utilisées pour la prise en charge et les échanges avec les professionnels.
                </p>
              </div>
              <div v-if="showBookingContactOnPatientPage" class="space-y-3">
                <div>
                  <p class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Votre contact (titulaire du compte)</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Coordonnées du compte ayant effectué la réservation</p>
                </div>
                <dl class="space-y-3">
                  <div v-if="bookingContactFullNamePatient" class="flex justify-between gap-4">
                    <dt class="text-sm text-gray-500 dark:text-gray-400">Nom</dt>
                    <dd class="text-sm font-medium text-gray-900 dark:text-white text-right">{{ bookingContactFullNamePatient }}</dd>
                  </div>
                  <div v-if="appointment.booking_contact?.phone" class="flex justify-between gap-4">
                    <dt class="text-sm text-gray-500 dark:text-gray-400">Téléphone</dt>
                    <dd class="text-sm font-medium text-right">
                      <a
                        :href="`tel:${String(appointment.booking_contact.phone).replace(/\s/g, '')}`"
                        class="text-primary-600 hover:underline dark:text-primary-400"
                      >
                        {{ appointment.booking_contact.phone }}
                      </a>
                    </dd>
                  </div>
                  <div v-if="bookingContactEmailPatient.text" class="flex justify-between gap-4">
                    <dt class="text-sm text-gray-500 dark:text-gray-400 shrink-0">Email</dt>
                    <dd class="text-sm font-medium text-right min-w-0">
                      <a
                        v-if="bookingContactEmailPatient.href"
                        :href="bookingContactEmailPatient.href"
                        class="text-primary-600 hover:underline dark:text-primary-400 break-all"
                      >
                        {{ bookingContactEmailPatient.text }}
                      </a>
                      <span v-else class="text-gray-900 dark:text-white break-words">{{ bookingContactEmailPatient.text }}</span>
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </section>

          <!-- Détails patient (form_data) -->
          <section
            v-if="hasFormData"
            class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 overflow-hidden"
          >
            <div class="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 class="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Informations du patient
              </h2>
            </div>
            <dl class="divide-y divide-gray-100 dark:divide-gray-800">
              <div v-if="appointment.form_data?.first_name" class="flex justify-between gap-4 px-5 py-3.5">
                <dt class="text-sm text-gray-500 dark:text-gray-400">Prénom</dt>
                <dd class="text-sm font-medium text-gray-900 dark:text-white text-right">{{ appointment.form_data.first_name }}</dd>
              </div>
              <div v-if="appointment.form_data?.last_name" class="flex justify-between gap-4 px-5 py-3.5">
                <dt class="text-sm text-gray-500 dark:text-gray-400">Nom</dt>
                <dd class="text-sm font-medium text-gray-900 dark:text-white text-right">{{ appointment.form_data.last_name }}</dd>
              </div>
              <div v-if="appointment.form_data?.phone" class="flex justify-between gap-4 px-5 py-3.5">
                <dt class="text-sm text-gray-500 dark:text-gray-400">Téléphone</dt>
                <dd class="text-sm font-medium text-right">
                  <a :href="`tel:${(appointment.form_data.phone as string).replace(/\s/g, '')}`" class="text-primary-600 hover:underline dark:text-primary-400">
                    {{ appointment.form_data.phone }}
                  </a>
                </dd>
              </div>
              <div v-if="appointment.form_data?.email" class="flex justify-between gap-4 px-5 py-3.5">
                <dt class="text-sm text-gray-500 dark:text-gray-400 shrink-0">Email</dt>
                <dd class="text-sm font-medium text-right min-w-0">
                  <a
                    v-if="formDataEmailDisplay.href"
                    :href="formDataEmailDisplay.href"
                    class="text-primary-600 hover:underline dark:text-primary-400 break-all"
                  >
                    {{ formDataEmailDisplay.text }}
                  </a>
                  <span v-else class="text-gray-900 dark:text-white break-words">{{ formDataEmailDisplay.text }}</span>
                </dd>
              </div>
              <div v-if="appointment.form_data?.birth_date" class="flex justify-between gap-4 px-5 py-3.5">
                <dt class="text-sm text-gray-500 dark:text-gray-400">Date de naissance</dt>
                <dd class="text-sm font-medium text-gray-900 dark:text-white text-right">{{ formatDateOnly(appointment.form_data.birth_date) }}</dd>
              </div>
              <div v-if="appointment.form_data?.gender" class="flex justify-between gap-4 px-5 py-3.5">
                <dt class="text-sm text-gray-500 dark:text-gray-400">Genre</dt>
                <dd class="text-sm font-medium text-gray-900 dark:text-white text-right">{{ getGenderLabel(appointment.form_data.gender) }}</dd>
              </div>
              <div v-if="appointment.form_data?.duration_days" class="flex justify-between gap-4 px-5 py-3.5">
                <dt class="text-sm text-gray-500 dark:text-gray-400">{{ appointment.type === 'nursing' ? 'Prise en charge' : 'Durée' }}</dt>
                <dd class="text-sm font-medium text-gray-900 dark:text-white text-right">{{
                  appointment.type === 'nursing'
                    ? getNursingDurationLabel(appointment.form_data.duration_days, appointment.form_data.custom_days)
                    : formatBloodTestSeriesDurationDays(appointment.form_data.duration_days, appointment.form_data.custom_days)
                }}</dd>
              </div>
              <div v-if="appointment.form_data?.frequency" class="flex justify-between gap-4 px-5 py-3.5">
                <dt class="text-sm text-gray-500 dark:text-gray-400">Fréquence</dt>
                <dd class="text-sm font-medium text-gray-900 dark:text-white text-right">{{ getFrequencyLabel(appointment.form_data.frequency) }}</dd>
              </div>
              <template v-for="(val, key) in (appointment.form_data?.care_options || {})" :key="`care-${key}`">
                <div v-if="val != null && val !== ''" class="flex justify-between gap-4 px-5 py-3.5">
                  <dt class="text-sm text-gray-500 dark:text-gray-400">{{ getCareOptionLabel(key) }}</dt>
                  <dd class="text-sm font-medium text-gray-900 dark:text-white text-right">{{ getCareOptionValueLabel(key, val) }}</dd>
                </div>
              </template>
              <div v-if="appointment.form_data?.notes" class="px-5 py-3.5">
                <dt class="text-sm text-gray-500 dark:text-gray-400 mb-1">Notes</dt>
                <dd class="text-sm font-medium text-gray-900 dark:text-white whitespace-pre-wrap">{{ appointment.form_data.notes }}</dd>
              </div>
            </dl>
          </section>

          <!-- Résultats (prioritaire, affiché avant Documents médicaux) — ancre #resultats (notif « résultats disponibles ») -->
          <section
            id="resultats"
            v-if="resultatsDocuments.length > 0"
            class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 overflow-hidden scroll-mt-24"
          >
            <div class="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 class="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <UIcon name="i-lucide-file-check" class="w-4 h-4 text-emerald-500" />
                Résultats
              </h2>
            </div>
            <div class="px-5 py-4">
              <p class="text-sm text-emerald-700 dark:text-emerald-300 mb-4">
                Vos résultats d'analyses sont disponibles. Vous pouvez les télécharger ci-dessous.
              </p>
              <ul class="space-y-2">
                <li
                  v-for="doc in resultatsDocuments"
                  :key="doc.id"
                  class="flex items-center justify-between gap-4 rounded-lg border border-gray-100 dark:border-gray-800 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                      <UIcon name="i-lucide-file-check" class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div class="min-w-0">
                      <p class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ doc.file_name }}</p>
                      <p v-if="doc._batchRdvLabel" class="text-xs text-amber-700 dark:text-amber-300/90">{{ doc._batchRdvLabel }}</p>
                      <p class="text-xs text-gray-500">{{ formatFileSize(doc.file_size) }} · {{ formatDateShort(doc.created_at) }}</p>
                    </div>
                  </div>
                  <UButton
                    variant="ghost"
                    size="xs"
                    icon="i-lucide-download"
                    :loading="downloadingDoc === doc.id"
                    @click="downloadDocument(doc.id)"
                  />
                </li>
              </ul>
            </div>
          </section>

          <!-- Documents médicaux -->
          <section class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 overflow-hidden">
            <div class="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 class="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Documents médicaux
              </h2>
            </div>
            <div class="px-5 py-4">
              <div v-if="loadingDocuments" class="flex items-center gap-2 text-sm text-gray-500">
                <UIcon name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
                Chargement...
              </div>
              <div v-else-if="otherDocuments.length === 0" class="text-sm text-gray-500 dark:text-gray-400">
                Aucun document associé à ce rendez-vous
              </div>
              <ul v-else class="space-y-2">
                <li
                  v-for="doc in otherDocuments"
                  :key="doc.id"
                  class="flex items-center justify-between gap-4 rounded-lg border border-gray-100 dark:border-gray-800 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                      <UIcon name="i-lucide-file" class="w-4 h-4 text-gray-500" />
                    </div>
                    <div class="min-w-0">
                      <p class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ doc.file_name }}</p>
                      <p v-if="doc._batchRdvLabel" class="text-xs text-gray-500 dark:text-gray-400">{{ doc._batchRdvLabel }}</p>
                      <p class="text-xs text-gray-500">{{ formatFileSize(doc.file_size) }} · {{ formatDateShort(doc.created_at) }}</p>
                    </div>
                  </div>
                  <UButton
                    variant="ghost"
                    size="xs"
                    icon="i-lucide-download"
                    :loading="downloadingDoc === doc.id"
                    @click="downloadDocument(doc.id)"
                  />
                </li>
              </ul>
            </div>
          </section>

          <!-- Annulation (style linear / notion) -->
          <section
            v-if="['pending', 'confirmed', 'planned'].includes(appointment.status)"
            class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 overflow-hidden"
          >
            <div class="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 class="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Actions
              </h2>
            </div>
            <div class="px-5 py-4">
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                <template v-if="appointment.status === 'pending'">
                  Votre rendez-vous est en attente de confirmation. Vous serez notifié dès qu'un professionnel l'aura accepté.
                </template>
                <template v-else-if="appointment.status === 'planned'">
                  Votre rendez-vous est planifié.
                </template>
                <template v-else>
                  Votre rendez-vous est confirmé. Vous recevrez un rappel avant l'heure prévue.
                </template>
              </p>
              <div class="flex items-center gap-3">
                <UButton
                  color="error"
                  variant="outline"
                  size="md"
                  icon="i-lucide-x"
                  @click="showCancelModal = true"
                >
                  Annuler le rendez-vous
                </UButton>
              </div>
            </div>
          </section>

          <!-- Avis (terminés) — un bloc par soin clôturé — ancre #avis -->
          <section
            v-if="completedAppointmentsForAvis.length > 0"
            id="section-avis"
            class="scroll-mt-24 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 overflow-hidden"
          >
            <div class="px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/80">
              <h2 class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <UIcon name="i-lucide-star" class="w-4 h-4 text-amber-500" />
                {{ isMultiBatch ? 'Vos avis' : 'Votre avis' }}
              </h2>
              <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {{ anyCompletedWithReview && !anyCompletedWithoutReview ? 'Récapitulatif de vos retours.' : 'Évaluez chaque intervention : chaque détail compte pour nous.' }}
              </p>
            </div>

            <div class="divide-y divide-gray-100 dark:divide-gray-800">
              <div
                v-for="appt in completedAppointmentsForAvis"
                :key="'avis-' + appt.id"
                class="p-5 space-y-5"
              >
                <p v-if="isMultiBatch" class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ appt.category_name || appt.form_data?.category_name || 'Soin' }}
                  <span class="text-gray-500 font-normal"> · {{ formatDateShort(appt.scheduled_at) }}</span>
                </p>

                <!-- Cible de l’avis -->
                <div
                  v-if="canLeaveReviewFor(appt) || reviewHasReviewed[String(appt.id)]"
                  class="rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/40 p-4"
                >
                  <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                    À qui s’adresse cet avis
                  </p>
                  <div class="flex items-center gap-3">
                    <UserAvatar
                      v-if="reviewTargetKindFor(appt) === 'nurse'"
                      :src="profileImageUrl(appt?.assigned_nurse_profile_image_url ?? null) ?? undefined"
                      :initial="(appt.assigned_nurse_display_name || 'I').charAt(0).toUpperCase()"
                      :alt="reviewTargetNameFor(appt)"
                      size="lg"
                    />
                    <UserAvatar
                      v-else
                      :src="profileImageUrl(appt?.assigned_to_profile_image_url ?? null) ?? undefined"
                      :initial="(appt.assigned_to_display_name || appt.assigned_to_name || 'P').charAt(0).toUpperCase()"
                      :alt="reviewTargetNameFor(appt)"
                      size="lg"
                    />
                    <div class="min-w-0 flex-1">
                      <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {{ reviewTargetNameFor(appt) }}
                      </p>
                      <span
                        class="inline-flex mt-1 items-center rounded-md px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-950/50 dark:text-primary-200"
                      >
                        {{ reviewTargetRoleLabelFor(appt) }}
                      </span>
                    </div>
                  </div>
                </div>

                <template v-if="canLeaveReviewFor(appt) && !reviewHasReviewed[String(appt.id)] && reviewForms[String(appt.id)]">
                  <UForm
                    :state="reviewForms[String(appt.id)]"
                    class="space-y-5"
                    @submit.prevent="submitReviewForAppt(appt)"
                  >
                    <div class="rounded-xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/15 p-4">
                      <UFormField label="Note globale" :name="`rating-${appt.id}`" required>
                        <div class="flex flex-wrap items-center gap-2 pt-1">
                          <button
                            v-for="star in 5"
                            :key="star"
                            type="button"
                            :aria-label="`Noter ${star} sur 5`"
                            class="p-1.5 rounded-xl hover:bg-white/80 dark:hover:bg-gray-800/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                            @click="ensureReviewForm(String(appt.id)); reviewForms[String(appt.id)].rating = star"
                          >
                            <UIcon
                              :name="star <= (reviewForms[String(appt.id)]?.rating ?? 5) ? 'i-heroicons-star-solid' : 'i-heroicons-star'"
                              class="w-8 h-8 sm:w-9 sm:h-9 transition-colors"
                              :class="
                                star <= (reviewForms[String(appt.id)]?.rating ?? 5)
                                  ? 'text-amber-400'
                                  : 'text-gray-300 dark:text-gray-600'
                              "
                            />
                          </button>
                          <span class="text-sm font-medium text-gray-700 dark:text-gray-300 tabular-nums ml-1">
                            {{ reviewForms[String(appt.id)]?.rating ?? 5 }}/5
                          </span>
                        </div>
                      </UFormField>
                    </div>
                    <UFormField label="Commentaire (optionnel)" :name="`comment-${appt.id}`" description="Précisez l’accueil, la ponctualité ou la qualité des soins.">
                      <UTextarea
                        :model-value="reviewForms[String(appt.id)]?.comment ?? ''"
                        rows="4"
                        autoresize
                        placeholder="Ex. : professionnel à l’écoute, soin effectué avec douceur…"
                        class="w-full"
                        @update:model-value="
                          (v: string) => {
                            ensureReviewForm(String(appt.id));
                            reviewForms[String(appt.id)].comment = v;
                          }
                        "
                      />
                    </UFormField>
                    <UButton type="submit" color="primary" size="lg" block :loading="submittingReview" icon="i-lucide-send">
                      Publier mon avis
                    </UButton>
                  </UForm>
                </template>

                <div
                  v-else-if="reviewHasReviewed[String(appt.id)]"
                  class="rounded-xl border border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 flex gap-3 items-start"
                >
                  <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                    <UIcon name="i-lucide-heart" class="w-5 h-5" />
                  </div>
                  <div class="min-w-0">
                    <p class="text-sm font-semibold text-emerald-900 dark:text-emerald-100">Merci pour votre avis</p>
                    <p class="text-sm text-emerald-800/90 dark:text-emerald-200/90 mt-0.5">
                      Votre retour a bien été enregistré et aide la communauté à choisir des professionnels de confiance.
                    </p>
                  </div>
                </div>

                <p v-else class="text-sm text-gray-500 dark:text-gray-400">
                  <template v-if="appt.type === 'blood_test'">
                    L’avis n’est pas disponible : aucun laboratoire n’est associé à ce rendez-vous.
                  </template>
                  <template v-else>
                    L’avis en ligne n’est pas disponible pour ce créneau (aucun intervenant identifié).
                  </template>
                </p>
              </div>
            </div>
          </section>
        </div>

        <!-- Modal annulation -->
        <AlertModal
          v-model="showCancelModal"
          title="Confirmer l'annulation"
          message="Êtes-vous sûr de vouloir annuler ce rendez-vous ? Cette action est définitive."
          confirm-label="Oui, annuler"
          cancel-label="Retour"
          confirm-color="error"
          icon-type="error"
          :loading="canceling"
          @confirm="confirmCancelAppointment"
        >
          <template #content>
            <div v-if="appointment" class="mt-4 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-calendar" class="w-4 h-4 flex-shrink-0" />
                <span>{{ formatDate(appointment.scheduled_at) }}</span>
              </div>
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-map-pin" class="w-4 h-4 flex-shrink-0" />
                <span>{{ displayAddress }}</span>
              </div>
            </div>
          </template>
        </AlertModal>

        <ProviderPublicProfileSlideover
          v-model:open="showLabProfileSheet"
          provider-type="lab"
          :slug="(sheetProfileAppt || appointment)?.assigned_lab_public_slug ?? null"
        />
        <ProviderPublicProfileSlideover
          v-model:open="showNurseProfileSheet"
          provider-type="nurse"
          :slug="(sheetProfileAppt || appointment)?.assigned_nurse_public_slug ?? null"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch, onUnmounted } from 'vue';
import { CANCELLATION_REASONS } from '~/config/cancellation-reasons';
import { getNursingDurationLabel } from '~/constants/nursing-duration';
import { formatBloodTestSeriesDurationDays } from '~/utils/duration-display';
import {
  extractEmailFromDisplayLine,
  formDataEmailDisplayForPatientView,
  isTechnicalPatientEmail,
  patientUiEmailLine,
} from '~/utils/patient-address-rdv';

definePageMeta({
  layout: 'patient',
  middleware: ['auth', 'role'],
  role: 'patient',
});

const route = useRoute();
const toast = useAppToast();
const { user } = useAuth();

const appointment = ref<any>(null);
/** Autres RDV du même lot (GET complets après batch_siblings) */
const batchSiblingsFull = ref<any[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
/** Avis déjà laissés par id de RDV (lots multi-soins) */
const reviewHasReviewed = ref<Record<string, boolean>>({});

const hasReviewed = computed(() => {
  const id = appointment.value?.id;
  if (!id) return false;
  return !!reviewHasReviewed.value[String(id)];
});
const submittingReview = ref(false);
const canceling = ref(false);
const showCancelModal = ref(false);
const showLabProfileSheet = ref(false);
const showNurseProfileSheet = ref(false);
const cancellationZoomOpen = ref(false);
const cancellationPhotoObjectUrl = ref<string | null>(null);
/** Profil ouvert depuis un soin du lot (slug) */
const sheetProfileAppt = ref<any>(null);

function isCanceledAppointment(status: string | undefined | null) {
  return ['canceled', 'cancelled'].includes(String(status || ''));
}

const cancellationReasonLabel = computed(() => {
  const k = appointment.value?.cancellation_reason;
  if (!k || typeof k !== 'string') return '';
  return CANCELLATION_REASONS[k] || k;
});

async function refreshCancellationPhotoBlob() {
  if (cancellationPhotoObjectUrl.value?.startsWith('blob:')) {
    URL.revokeObjectURL(cancellationPhotoObjectUrl.value);
  }
  cancellationPhotoObjectUrl.value = null;
  const docId = appointment.value?.cancellation_photo_document_id;
  if (!docId || !isCanceledAppointment(appointment.value?.status)) return;
  try {
    const config = useRuntimeConfig();
    const apiBase = config.public.apiBase || 'http://localhost:8888/api';
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : '';
    const response = await fetch(
      `${apiBase}/medical-documents/${encodeURIComponent(docId)}/download?id=${encodeURIComponent(docId)}`,
      { method: 'GET', headers: { Authorization: `Bearer ${token}` } },
    );
    if (!response.ok) return;
    const blob = await response.blob();
    cancellationPhotoObjectUrl.value = URL.createObjectURL(blob);
  } catch {
    // ignore
  }
}

watch(
  () => [appointment.value?.cancellation_photo_document_id, appointment.value?.status] as const,
  () => {
    void refreshCancellationPhotoBlob();
  },
  { immediate: true },
);

onUnmounted(() => {
  if (cancellationPhotoObjectUrl.value?.startsWith('blob:')) {
    URL.revokeObjectURL(cancellationPhotoObjectUrl.value);
  }
});
const medicalDocuments = ref<any[]>([]);
const downloadingDoc = ref<string | null>(null);
const loadingDocuments = ref(false);
const categoriesForDetail = ref<Array<{ id: string; options?: Array<{ option_key: string; label: string; options?: { value: string; label: string }[] }> }>>([]);

/** Rafraîchit les bandeaux « préleveur en route / arrivé » sans recharger toute la page */
const preleveurBannerNow = ref(Date.now());
let preleveurBannerInterval: ReturnType<typeof setInterval> | null = null;

const visibleMedicalDocuments = computed(() =>
  (medicalDocuments.value || []).filter((d: any) => d.document_type !== 'cancellation_photo'),
);
const resultatsDocuments = computed(() => visibleMedicalDocuments.value.filter((d: any) => d.document_type === 'resultats'));
const otherDocuments = computed(() => visibleMedicalDocuments.value.filter((d: any) => d.document_type !== 'resultats'));

const reviewForms = reactive<Record<string, { rating: number; comment: string }>>({});

/** Tous les RDV du lot, triés par date (page courante + fratries). */
const batchAppointmentsSorted = computed(() => {
  const current = appointment.value;
  if (!current) return [];
  const siblings = batchSiblingsFull.value;
  if (!siblings.length) return [current];
  const byId = new Map<string, any>();
  byId.set(String(current.id), current);
  for (const s of siblings) {
    if (s?.id) byId.set(String(s.id), s);
  }
  return [...byId.values()].sort((a, b) => {
    const ta = new Date(a.scheduled_at || a.created_at || 0).getTime();
    const tb = new Date(b.scheduled_at || b.created_at || 0).getTime();
    return ta - tb;
  });
});

type PreleveurBannerPhase = 'hidden' | 'en_route' | 'arrive';

function parisDatePartsFromMs(ms: number): { ymd: string; minutes: number } | null {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(ms));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const year = get('year');
  const month = get('month');
  const day = get('day');
  const hour = Number(get('hour'));
  const minute = Number(get('minute'));
  if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return { ymd: `${year}-${month}-${day}`, minutes: hour * 60 + minute };
}

function appointmentParisYmd(appt: any): string {
  const raw = String(appt?.scheduled_at || '').trim();
  const m = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m?.[1]) return m[1];
  if (!raw) return '';
  const parts = parisDatePartsFromMs(new Date(raw).getTime());
  return parts?.ymd ?? '';
}

function parseAvailabilityRangeForSlot(availability: unknown): [number, number] | null {
  try {
    const avail = typeof availability === 'string' ? JSON.parse(availability) : availability;
    if (avail?.type === 'custom' && Array.isArray(avail.range) && avail.range.length >= 2) {
      const start = Number(avail.range[0]);
      const end = Number(avail.range[1]);
      if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
        return [start * 60, end * 60];
      }
    }
  } catch {
    // ignore
  }
  return null;
}

function appointmentFallbackSlotMinutes(appt: any): [number, number] | null {
  const raw = String(appt?.scheduled_at || '').trim();
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  const parts = parisDatePartsFromMs(d.getTime());
  if (!parts) return null;
  const start = parts.minutes;
  const duration = Number(appt?.duration_minutes || 60);
  return [start, start + Math.max(30, duration)];
}

function appointmentSlotMinutes(appt: any): [number, number] | null {
  return parseAvailabilityRangeForSlot(appt?.form_data?.availability) ?? appointmentFallbackSlotMinutes(appt);
}

function formatSlotMinute(minute: number): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}

function preleveurSlotLabelFor(appt: any): string {
  const slot = appointmentSlotMinutes(appt);
  if (!slot) return appointmentTimeLabel(appt);
  return `${formatSlotMinute(slot[0])} - ${formatSlotMinute(slot[1])}`;
}

function computePreleveurPatientBannerPhase(appt: any, nowMs: number): PreleveurBannerPhase {
  if (!appt || appt.type !== 'blood_test') return 'hidden';
  if (['completed', 'canceled', 'cancelled', 'expired', 'refused'].includes(String(appt.status || ''))) return 'hidden';
  const name = (appt.assigned_to_display_name || appt.assigned_to_name || '').trim();
  if (!name) return 'hidden';
  const nowParis = parisDatePartsFromMs(nowMs);
  const appointmentYmd = appointmentParisYmd(appt);
  const slot = appointmentSlotMinutes(appt);
  if (!nowParis || !appointmentYmd || !slot) return 'hidden';
  if (nowParis.ymd !== appointmentYmd) return 'hidden';
  const enRouteStartsAt = Math.max(0, slot[0] - 30);
  if (nowParis.minutes < enRouteStartsAt) return 'hidden';
  if (nowParis.minutes < slot[0]) return 'en_route';
  return 'arrive';
}

const preleveurBannerPhaseById = computed(() => {
  const nowMs = preleveurBannerNow.value;
  const out: Record<string, PreleveurBannerPhase> = {};
  for (const appt of batchAppointmentsSorted.value) {
    if (appt?.id) out[String(appt.id)] = computePreleveurPatientBannerPhase(appt, nowMs);
  }
  return out;
});

function preleveurBannerClassFor(phase: PreleveurBannerPhase | undefined): string {
  if (phase === 'arrive') {
    return 'border-emerald-200/80 bg-gradient-to-r from-emerald-50 via-white to-emerald-50/60 text-emerald-950 dark:border-emerald-900/50 dark:from-emerald-950/35 dark:via-gray-900/80 dark:to-emerald-950/20 dark:text-emerald-100';
  }
  return 'border-sky-200/80 bg-gradient-to-r from-sky-50 via-white to-primary-50/50 text-sky-950 dark:border-sky-900/50 dark:from-sky-950/40 dark:via-gray-900/80 dark:to-primary-950/20 dark:text-sky-100';
}

function preleveurBannerTextFor(appt: any, phase: PreleveurBannerPhase | undefined) {
  if (phase === 'en_route') {
    const name = (appt?.assigned_to_display_name || appt?.assigned_to_name || '').trim();
    return name ? `${name} est en route vers votre domicile.` : 'Votre préleveur est en route vers votre domicile.';
  }
  if (phase === 'arrive') return 'Votre préleveur est arrivé sur le créneau prévu.';
  return '';
}

function preleveurBannerSubtitleFor(appt: any, phase: PreleveurBannerPhase | undefined): string {
  const slot = preleveurSlotLabelFor(appt);
  if (phase === 'en_route') return `Trajet lancé, arrivée prévue dans la fenêtre ${slot}.`;
  if (phase === 'arrive') return `Position confirmée, passage prévu dans la fenêtre ${slot}.`;
  return '';
}

const batchAppointmentIds = computed(() => batchAppointmentsSorted.value.map((a: any) => String(a.id)));

const isMultiBatch = computed(() => batchAppointmentsSorted.value.length > 1);

type ProfessionalContactKind = 'lab' | 'preleveur' | 'nurse';
type CareTeamKind = ProfessionalContactKind | 'pending';

type CareTeamGroup = {
  key: string;
  kind: CareTeamKind;
  label: string;
  name: string;
  roleLabel: string;
  phone?: string;
  address?: string;
  publicSlug?: string;
  imageUrl?: string | null;
  initial: string;
  appointmentIds: string[];
  appointmentLabels: string[];
  appointmentRef?: any;
};

function appointmentTypeLabel(type: string | undefined | null): string {
  return type === 'blood_test' ? 'Prise de sang' : 'Soins infirmiers';
}

function appointmentIcon(type: string | undefined | null): string {
  return type === 'blood_test' ? 'i-lucide-syringe' : 'i-lucide-stethoscope';
}

function appointmentItemTitle(appt: any, index: number): string {
  const base = appt?.category_name || appt?.form_data?.category_name || appointmentTypeLabel(appt?.type);
  return isMultiBatch.value ? `${appt?.type === 'blood_test' ? 'Prélèvement' : 'Soin'} ${index + 1} · ${base}` : base;
}

function appointmentShortDate(date: string | undefined | null): string {
  if (!date) return 'Date à confirmer';
  try {
    return new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return String(date);
  }
}

function appointmentTimeLabel(appt: any): string {
  const availability = formatAvailability(appt?.form_data?.availability);
  if (availability) return availability;
  if (!appt?.scheduled_at) return 'Horaire à confirmer';
  try {
    return new Date(appt.scheduled_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Horaire à confirmer';
  }
}

function appointmentFullDateTime(appt: any): string {
  const date = appt?.scheduled_at ? formatDate(appt.scheduled_at) : 'Date à confirmer';
  const time = appointmentTimeLabel(appt);
  return `${date}${time ? ` · ${time}` : ''}`;
}

function appointmentItemMeta(appt: any): string {
  const parts = [appointmentShortDate(appt?.scheduled_at), appointmentTimeLabel(appt)].filter(Boolean);
  return parts.join(' · ');
}

function appointmentDurationText(appt: any): string {
  if (appt?.duration_minutes) return `${appt.duration_minutes} min`;
  const fd = appt?.form_data || {};
  if (fd.duration_days) {
    return appt?.type === 'nursing'
      ? getNursingDurationLabel(fd.duration_days, fd.custom_days)
      : formatBloodTestSeriesDurationDays(fd.duration_days, fd.custom_days);
  }
  return '';
}

function sameStringSet(values: string[]): boolean {
  const normalized = values.map((v) => String(v || '').trim()).filter(Boolean);
  return normalized.length > 0 && new Set(normalized).size === 1;
}

const appointmentSummary = computed(() => {
  const list = batchAppointmentsSorted.value;
  const first = list[0] ?? appointment.value;
  const types = list.map((a: any) => appointmentTypeLabel(a?.type));
  const typeText = new Set(types).size === 1 ? types[0] : 'Rendez-vous mixtes';
  const addressText = displayAddressFor(first);
  const complement = addressComplementFor(first);
  const addressSame = sameStringSet(list.map((a: any) => displayAddressFor(a)));
  const nextActive = [...list]
    .filter((a: any) => !['completed', 'canceled', 'cancelled', 'expired', 'refused'].includes(String(a?.status || '')))
    .sort((a: any, b: any) => new Date(a.scheduled_at || 0).getTime() - new Date(b.scheduled_at || 0).getTime())[0];
  const next = nextActive || first;

  return {
    title: isMultiBatch.value ? `${list.length} rendez-vous dans cette demande` : 'Détail du rendez-vous',
    typeText,
    addressText,
    complement,
    addressSame,
    nextLabel: next ? appointmentFullDateTime(next) : '',
    status: first?.status,
    icon: appointmentIcon(first?.type),
  };
});

const batchTimelineItems = computed(() =>
  batchAppointmentsSorted.value.map((appt: any, index: number) => ({
    id: String(appt.id),
    appt,
    index,
    title: appointmentItemTitle(appt, index),
    meta: appointmentItemMeta(appt),
    duration: appointmentDurationText(appt),
    address: displayAddressFor(appt),
    addressComplement: addressComplementFor(appt),
    status: appt.status,
    bannerPhase: preleveurBannerPhaseById.value[String(appt.id)] ?? 'hidden',
  })),
);

const activePreleveurAlerts = computed(() =>
  batchTimelineItems.value.filter((item) => item.bannerPhase && item.bannerPhase !== 'hidden'),
);

function upsertCareTeamGroup(groups: Map<string, CareTeamGroup>, group: Omit<CareTeamGroup, 'appointmentIds' | 'appointmentLabels'>, appt: any, index: number) {
  const id = String(appt?.id ?? '');
  if (!id) return;
  const label = appointmentItemTitle(appt, index);
  const existing = groups.get(group.key);
  if (existing) {
    if (!existing.appointmentIds.includes(id)) existing.appointmentIds.push(id);
    if (!existing.appointmentLabels.includes(label)) existing.appointmentLabels.push(label);
    return;
  }
  groups.set(group.key, {
    ...group,
    appointmentIds: [id],
    appointmentLabels: [label],
  });
}

const careTeamGroups = computed<CareTeamGroup[]>(() => {
  const groups = new Map<string, CareTeamGroup>();
  batchAppointmentsSorted.value.forEach((appt: any, index: number) => {
    if (appt?.type === 'blood_test') {
      if (isAssignmentPendingFor(appt)) {
        upsertCareTeamGroup(groups, {
          key: 'pending-blood-test',
          kind: 'pending',
          label: 'Laboratoire / préleveur',
          roleLabel: 'Recherche en cours',
          name: 'Professionnel en cours d’attribution',
          initial: 'P',
          appointmentRef: appt,
        }, appt, index);
        return;
      }
      if (appt.assigned_lab_id || appt.assigned_lab_display_name) {
        const key = `lab:${appt.assigned_lab_id || appt.assigned_lab_display_name || 'unknown'}`;
        upsertCareTeamGroup(groups, {
          key,
          kind: 'lab',
          label: 'Laboratoire',
          roleLabel: 'Laboratoire',
          name: appt.assigned_lab_display_name || 'Laboratoire',
          phone: appt.assigned_lab_phone,
          address: appt.assigned_lab_address,
          publicSlug: appt.assigned_lab_public_slug,
          imageUrl: appt.assigned_lab_profile_image_url ?? null,
          initial: (appt.assigned_lab_display_name || 'L').charAt(0).toUpperCase(),
          appointmentRef: appt,
        }, appt, index);
      }
      if (appt.assigned_to || appt.assigned_to_display_name) {
        const key = `preleveur:${appt.assigned_to || appt.assigned_to_display_name || 'unknown'}`;
        upsertCareTeamGroup(groups, {
          key,
          kind: 'preleveur',
          label: 'Préleveur',
          roleLabel: 'Préleveur',
          name: appt.assigned_to_display_name || appt.assigned_to_name || 'Préleveur assigné',
          phone: appt.assigned_to_phone,
          imageUrl: appt.assigned_to_profile_image_url ?? null,
          initial: (appt.assigned_to_display_name || appt.assigned_to_name || 'P').charAt(0).toUpperCase(),
          appointmentRef: appt,
        }, appt, index);
      } else if (showBloodTestPreleveurPendingMessageFor(appt)) {
        const key = `pending-preleveur:${appt.assigned_lab_id || 'lab'}`;
        upsertCareTeamGroup(groups, {
          key,
          kind: 'pending',
          label: 'Préleveur',
          roleLabel: 'Préleveur à désigner',
          name: 'Préleveur en cours d’attribution',
          initial: 'P',
          appointmentRef: appt,
        }, appt, index);
      }
    }
    if (appt?.type === 'nursing') {
      if (appt.assigned_nurse_id || appt.assigned_nurse_display_name) {
        const key = `nurse:${appt.assigned_nurse_id || appt.assigned_nurse_display_name || 'unknown'}`;
        upsertCareTeamGroup(groups, {
          key,
          kind: 'nurse',
          label: 'Infirmier',
          roleLabel: 'Infirmier',
          name: appt.assigned_nurse_display_name || appt.assigned_to_name || 'Infirmier assigné',
          phone: appt.assigned_nurse_phone,
          publicSlug: appt.assigned_nurse_public_slug,
          imageUrl: appt.assigned_nurse_profile_image_url ?? null,
          initial: (appt.assigned_nurse_display_name || 'I').charAt(0).toUpperCase(),
          appointmentRef: appt,
        }, appt, index);
      } else if (isAssignmentPendingFor(appt)) {
        const key = 'pending-nurse';
        upsertCareTeamGroup(groups, {
          key,
          kind: 'pending',
          label: 'Infirmier',
          roleLabel: 'Recherche en cours',
          name: 'Professionnel en cours d’attribution',
          initial: 'I',
          appointmentRef: appt,
        }, appt, index);
      }
    }
  });
  return [...groups.values()];
});

const hasCareTeamGroups = computed(() => careTeamGroups.value.length > 0);

function professionalContactKindForGroup(group: CareTeamGroup): ProfessionalContactKind {
  if (group.kind === 'preleveur') return 'preleveur';
  if (group.kind === 'nurse') return 'nurse';
  return 'lab';
}

const completedAppointmentsForAvis = computed(() =>
  batchAppointmentsSorted.value.filter((a: any) => a.status === 'completed'),
);

function reviewTargetNameFor(a: any): string {
  if (!a) return '';
  if (a.type === 'nursing') {
    return a.assigned_nurse_display_name || a.assigned_to_name || 'Infirmier(e)';
  }
  return (
    a.assigned_lab_display_name ||
    a.assigned_to_display_name ||
    a.assigned_to_name ||
    'Laboratoire'
  );
}

function reviewTargetKindFor(a: any): 'nurse' | 'preleveur' | 'lab' {
  if (a?.type === 'nursing') return 'nurse';
  return 'lab';
}

function reviewTargetRoleLabelFor(a: any): string {
  if (!a) return '';
  return a.type === 'nursing' ? 'Soins infirmiers' : 'Laboratoire (prise de sang)';
}

function canLeaveReviewFor(a: any): boolean {
  if (!a || a.status !== 'completed') return false;
  if (a.type === 'nursing') return !!a.assigned_nurse_id;
  return !!a.assigned_lab_id;
}

/** Phrase d’accroche quand un soin est clôturé */
function completedBySentenceFor(a: any): string {
  if (!a || a.status !== 'completed') return '';
  if (a.type === 'nursing') {
    const n = a.assigned_nurse_display_name || a.assigned_to_name;
    return n ? `${n} a terminé ce rendez-vous.` : 'Ce rendez-vous est terminé.';
  }
  const prel = a.assigned_to_display_name || a.assigned_to_name;
  if (prel) return `${prel} a terminé ce rendez-vous.`;
  if (a.assigned_lab_display_name) {
    return `L’équipe du laboratoire a terminé ce rendez-vous (${a.assigned_lab_display_name}).`;
  }
  return 'Ce rendez-vous est terminé.';
}

const completedBySentence = computed(() => completedBySentenceFor(appointment.value));

const firstCompletedInBatch = computed(() => batchAppointmentsSorted.value.find((a: any) => a.status === 'completed'));

const completedHeroSentence = computed(() => {
  if (!isMultiBatch.value) return completedBySentence.value;
  const fc = firstCompletedInBatch.value;
  return fc ? completedBySentenceFor(fc) : '';
});

const showCompletedHero = computed(() => batchAppointmentsSorted.value.some((a: any) => a.status === 'completed'));

const anyCompletedWithoutReview = computed(() =>
  batchAppointmentsSorted.value.some(
    (a: any) =>
      a.status === 'completed' &&
      canLeaveReviewFor(a) &&
      !reviewHasReviewed.value[String(a.id)],
  ),
);

const anyCompletedWithReview = computed(() =>
  batchAppointmentsSorted.value.some(
    (a: any) => a.status === 'completed' && canLeaveReviewFor(a) && reviewHasReviewed.value[String(a.id)],
  ),
);

/** Avis réservé à l’infirmier (soins) ou au préleveur (prise de sang) — RDV principal (URL) */
const canLeaveReview = computed(() => canLeaveReviewFor(appointment.value));

const displayAddress = computed(() => displayAddressFor(appointment.value));

function displayAddressFor(a: any): string {
  const addr = a?.address;
  if (!addr) return '';
  if (typeof addr === 'object' && addr?.label) return addr.label;
  return String(addr);
}

/** Complément d'adresse (form_data ou address.complement) */
const addressComplement = computed(() => addressComplementFor(appointment.value));

function addressComplementFor(a: any): string {
  if (!a) return '';
  const fromForm = a.form_data?.address_complement;
  if (fromForm && String(fromForm).trim()) return String(fromForm).trim();
  if (typeof a.address === 'object' && a.address?.complement && String(a.address.complement).trim()) {
    return String(a.address.complement).trim();
  }
  return '';
}

function bloodTestItemsFor(a: any): any[] {
  return Array.isArray(a?.blood_test_items) ? a.blood_test_items : [];
}

function showWhoSectionFor(appt: any): boolean {
  return !!appt && (appt.type === 'blood_test' || appt.type === 'nursing');
}

function isAssignmentPendingFor(appt: any): boolean {
  if (!appt || appt.status !== 'pending') return false;
  if (appt.type === 'blood_test') {
    return !(appt.assigned_lab_id || appt.assigned_lab_display_name || appt.assigned_to || appt.assigned_to_display_name);
  }
  if (appt.type === 'nursing') {
    return !(appt.assigned_nurse_id || appt.assigned_nurse_display_name || appt.assigned_to_name);
  }
  return false;
}

function isAppointmentStatusTerminalForCareTeam(status: string | undefined | null): boolean {
  return ['canceled', 'cancelled', 'completed', 'refused', 'expired'].includes(String(status || ''));
}

/** Prise de sang : laboratoire affiché mais pas encore de préleveur (hors statuts terminaux). */
function showBloodTestPreleveurPendingMessageFor(appt: any): boolean {
  if (!appt || appt.type !== 'blood_test') return false;
  if (isAssignmentPendingFor(appt)) return false;
  if (isAppointmentStatusTerminalForCareTeam(appt.status)) return false;
  const hasLab = !!(appt.assigned_lab_id || appt.assigned_lab_display_name);
  const hasPrel = !!(appt.assigned_to || appt.assigned_to_display_name);
  return hasLab && !hasPrel;
}

const hasFormData = computed(() => {
  const fd = appointment.value?.form_data;
  return fd && Object.keys(fd).length > 0;
});

/** Affichage e-mail RDV : masque delegated-…@patients.internal.local et réutilise email_display du compte si c’est le même e-mail technique que le titulaire. */
const formDataEmailDisplay = computed(() =>
  formDataEmailDisplayForPatientView({
    formEmail: appointment.value?.form_data?.email,
    viewerUser: user.value,
  }),
);

const showRelativeMinorInfoPatient = computed(() => appointment.value?.relative?.is_minor === true);

const showBookingContactOnPatientPage = computed(() => {
  const a = appointment.value;
  const bc = a?.booking_contact;
  if (!a?.relative || !bc) return false;
  const name = `${bc.first_name ?? ''} ${bc.last_name ?? ''}`.trim();
  return !!(name || bc.phone || bc.email);
});

const bookingContactFullNamePatient = computed(() => {
  const bc = appointment.value?.booking_contact;
  if (!bc) return '';
  return [bc.first_name, bc.last_name].filter(Boolean).join(' ').trim();
});

const bookingContactEmailPatient = computed(() => {
  const bc = appointment.value?.booking_contact;
  if (!bc) return { text: '', href: null as string | null };
  const raw = (bc.email || '') as string;
  if (!String(raw).trim()) return { text: '', href: null };
  const display = bc.email_display as string | undefined;
  const text = patientUiEmailLine({ email: raw, email_display: display });
  if (isTechnicalPatientEmail(raw) && display) {
    const extracted = extractEmailFromDisplayLine(display);
    return { text, href: extracted ? `mailto:${extracted}` : null };
  }
  if (!isTechnicalPatientEmail(raw)) {
    return { text: raw, href: `mailto:${raw}` };
  }
  return { text, href: null };
});

const { profileImageUrl } = useProfileImageUrl();

function digitsOnlyPhone(phone: string): string {
  return String(phone).replace(/\s/g, '');
}

function openTel(phone: string) {
  window.location.href = `tel:${digitsOnlyPhone(phone)}`;
}

function openSmsToProfessional(phone: string, _kind: ProfessionalContactKind, aptOverride?: any) {
  const apt = aptOverride ?? appointment.value;
  if (!apt) return;
  const body = buildPatientSmsToProfessionalBody(apt);
  window.location.href = `sms:${digitsOnlyPhone(phone)}?body=${encodeURIComponent(body)}`;
}

function buildPatientSmsToProfessionalBody(apt: any): string {
  const first = apt.form_data?.first_name?.trim() || '';
  const last = apt.form_data?.last_name?.trim() || '';
  const name = [first, last].filter(Boolean).join(' ');
  const when = formatAppointmentWhenForSms(apt);
  let addr = '';
  const a = apt.address;
  if (typeof a === 'object' && a?.label) addr = String(a.label);
  else if (typeof a === 'string' && a) addr = a;
  const typeLabel =
    apt.type === 'blood_test'
      ? 'prise de sang'
      : apt.type === 'nursing'
        ? 'soins infirmiers'
        : 'rendez-vous';
  const lines: string[] = [
    'Bonjour,',
    '',
    `Je vous contacte au sujet de mon rendez-vous OneAndLab (${typeLabel}).`,
  ];
  if (when) lines.push(`Créneau : ${when}`);
  if (addr) lines.push(`Lieu : ${addr}`);
  lines.push('', name ? `Cordialement,\n${name}` : 'Cordialement');
  return lines.join('\n');
}

function statusBadgeClass(status: string) {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
    confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
    planned: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
    in_progress: 'bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-200',
    inProgress: 'bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-200',
    completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
    canceled: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
    expired: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    refused: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
  };
  return map[status] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
}

function typeBadgeClass(type: string) {
  return type === 'blood_test'
    ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200';
}

function scrollToResultatsIfHash() {
  if (route.hash !== '#resultats') return;
  nextTick(() => {
    requestAnimationFrame(() => {
      const el = document.getElementById('resultats');
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function scrollToAvisIfHash() {
  if (route.hash !== '#avis') return;
  nextTick(() => {
    requestAnimationFrame(() => {
      const el = document.getElementById('section-avis');
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function scrollToAvisSection() {
  nextTick(() => {
    requestAnimationFrame(() => {
      const el = document.getElementById('section-avis');
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      try {
        history.replaceState(null, '', `${route.path}#avis`);
      } catch {
        // ignore
      }
    });
  });
}

/** Rafraîchissement périodique : statut / assignation modifiés sans recharger la page. */
const APPOINTMENT_POLL_MS_ACTIVE = 6000;
const APPOINTMENT_POLL_MS_QUIET = 30_000;
let appointmentPollTimer: ReturnType<typeof setInterval> | null = null;
let silentAppointmentRefreshInFlight = false;

function currentAppointmentPollIntervalMs(): number {
  const list = batchAppointmentsSorted.value;
  if (!list.length) return APPOINTMENT_POLL_MS_QUIET;
  const terminal = new Set(['canceled', 'cancelled', 'completed', 'refused', 'expired']);
  const anyActive = list.some((a: any) => !terminal.has(String(a.status || '')));
  return anyActive ? APPOINTMENT_POLL_MS_ACTIVE : APPOINTMENT_POLL_MS_QUIET;
}

function stopAppointmentPolling() {
  if (appointmentPollTimer != null) {
    clearInterval(appointmentPollTimer);
    appointmentPollTimer = null;
  }
}

async function refreshAppointmentSilently() {
  if (silentAppointmentRefreshInFlight) return;
  silentAppointmentRefreshInFlight = true;
  try {
    await loadAppointment({ silent: true });
  } finally {
    silentAppointmentRefreshInFlight = false;
  }
}

function startAppointmentPolling() {
  stopAppointmentPolling();
  const ms = currentAppointmentPollIntervalMs();
  appointmentPollTimer = setInterval(() => {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
    if (canceling.value) return;
    void refreshAppointmentSilently();
  }, ms);
}

function onAppointmentDetailVisibility() {
  if (typeof document === 'undefined' || document.visibilityState !== 'visible') return;
  if (canceling.value) return;
  void refreshAppointmentSilently();
}

function onAppointmentDetailWindowFocus() {
  if (typeof document === 'undefined' || document.visibilityState !== 'visible') return;
  if (canceling.value) return;
  void refreshAppointmentSilently();
}

onMounted(async () => {
  await loadAppointment();
  scrollToResultatsIfHash();
  scrollToAvisIfHash();
  startAppointmentPolling();
  preleveurBannerInterval = setInterval(() => {
    preleveurBannerNow.value = Date.now();
  }, 15000);
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onAppointmentDetailVisibility);
    window.addEventListener('focus', onAppointmentDetailWindowFocus);
  }
});

onUnmounted(() => {
  stopAppointmentPolling();
  if (preleveurBannerInterval) {
    clearInterval(preleveurBannerInterval);
    preleveurBannerInterval = null;
  }
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', onAppointmentDetailVisibility);
    window.removeEventListener('focus', onAppointmentDetailWindowFocus);
  }
});

watch(
  () => batchAppointmentsSorted.value.map((a: any) => String(a?.status ?? '')).join(','),
  () => {
    if (typeof document === 'undefined') return;
    startAppointmentPolling();
  },
);

watch(
  () => route.params.id,
  async () => {
    batchSiblingsFull.value = [];
    await loadAppointment();
  },
);

watch(() => route.hash, () => {
  scrollToResultatsIfHash();
  scrollToAvisIfHash();
});

watch(
  () => [loading.value, loadingDocuments.value, resultatsDocuments.value.length, appointment.value?.status, route.hash] as const,
  () => {
    if (!loading.value && !loadingDocuments.value && route.hash === '#resultats') {
      scrollToResultatsIfHash();
    }
    if (!loading.value && route.hash === '#avis' && showCompletedHero.value) {
      scrollToAvisIfHash();
    }
  },
);


async function loadAppointment(opts?: { silent?: boolean }) {
  const silent = !!opts?.silent;
  if (!silent) {
    loading.value = true;
    error.value = null;
    batchSiblingsFull.value = [];
  }
  try {
    const response = await apiFetch(`/appointments/${route.params.id}`, { method: 'GET' });
    if (response.success && response.data) {
      if (silent) error.value = null;
      appointment.value = response.data;
      const appType = (response.data.type === 'nursing' || response.data.type === 'nurse') ? 'nursing' : 'blood_test';
      try {
        const catRes = await apiFetch(`/categories?type=${appType}`, { method: 'GET' });
        if (catRes.success && Array.isArray(catRes.data)) {
          categoriesForDetail.value = catRes.data as any[];
        } else {
          categoriesForDetail.value = [];
        }
      } catch {
        categoriesForDetail.value = [];
      }

      const sibs = response.data.batch_siblings;
      if (Array.isArray(sibs) && sibs.length > 0) {
        const full = await Promise.all(
          sibs.map(async (s: { id: string }) => {
            try {
              const r = await apiFetch(`/appointments/${encodeURIComponent(s.id)}`, { method: 'GET' });
              if (r.success && r.data) return r.data;
            } catch {
              /* ignore */
            }
            return null;
          }),
        );
        batchSiblingsFull.value = full.filter(Boolean) as any[];
      } else {
        batchSiblingsFull.value = [];
      }
      await loadMedicalDocuments({ silent });
      await checkReviewsForBatch();
    } else if (!silent) {
      error.value = response.error || 'Erreur lors du chargement du rendez-vous';
    }
  } catch {
    if (!silent) {
      error.value = 'Erreur lors du chargement du rendez-vous';
    }
  } finally {
    if (!silent) loading.value = false;
  }
}

function formatBatchRdvLabel(apt: any, index: number): string {
  const cat = apt?.category_name || 'Soin';
  const n = index + 1;
  return `Soin ${n} — ${cat}`;
}

async function loadMedicalDocuments(opts?: { silent?: boolean }) {
  const silent = !!opts?.silent;
  if (!appointment.value) return;
  const ids = batchAppointmentIds.value;
  if (!ids.length) return;
  if (!silent) loadingDocuments.value = true;
  try {
    const lists = await Promise.all(
      ids.map((id) =>
        apiFetch(`/medical-documents?appointment_id=${encodeURIComponent(id)}`, { method: 'GET' }).then((r) =>
          r.success && Array.isArray(r.data) ? r.data : [],
        ),
      ),
    );

    if (ids.length <= 1) {
      const merged: any[] = [];
      const seen = new Set<string>();
      for (const list of lists) {
        for (const doc of list) {
          const key = String((doc as any).id ?? '');
          if (key && !seen.has(key)) {
            seen.add(key);
            merged.push(doc);
          }
        }
      }
      merged.sort((a, b) => String(a.document_type || '').localeCompare(String(b.document_type || '')));
      medicalDocuments.value = merged;
      return;
    }

    const sortedApts = batchAppointmentsSorted.value;
    const aptById = (id: string) => sortedApts.find((x: any) => String(x.id) === id) || appointment.value;

    const merged: any[] = [];
    const seenNonOrdoType = new Set<string>();

    for (let i = 0; i < lists.length; i++) {
      const aptId = ids[i];
      const apt = aptById(aptId) || {};
      const ordoLabel = formatBatchRdvLabel(apt, i);

      for (const doc of lists[i]) {
        const dt = String((doc as any).document_type || '');
        if (dt === 'ordonnance') {
          merged.push({
            ...doc,
            _batchRdvLabel: ordoLabel,
            _batchOrd: i,
          });
        } else {
          if (seenNonOrdoType.has(dt)) continue;
          seenNonOrdoType.add(dt);
          merged.push(doc);
        }
      }
    }

    merged.sort((a, b) => {
      const ta = String(a.document_type || '');
      const tb = String(b.document_type || '');
      if (ta !== tb) return ta.localeCompare(tb);
      if (ta === 'ordonnance') return ((a as any)._batchOrd ?? 0) - ((b as any)._batchOrd ?? 0);
      return 0;
    });
    medicalDocuments.value = merged;
  } catch {
    medicalDocuments.value = [];
  } finally {
    if (!silent) loadingDocuments.value = false;
  }
}

function ensureReviewForm(apptId: string) {
  if (!reviewForms[apptId]) {
    reviewForms[apptId] = { rating: 5, comment: '' };
  }
}

async function checkReviewsForBatch() {
  reviewHasReviewed.value = {};
  const list = batchAppointmentsSorted.value;
  for (const appt of list) {
    if (appt.status !== 'completed' || !canLeaveReviewFor(appt)) continue;
    const id = String(appt.id);
    ensureReviewForm(id);
    try {
      const response = await apiFetch(`/reviews?appointment_id=${encodeURIComponent(id)}`, { method: 'GET' });
      reviewHasReviewed.value = {
        ...reviewHasReviewed.value,
        [id]: !!(response.success && response.data?.length > 0),
      };
    } catch {
      reviewHasReviewed.value = { ...reviewHasReviewed.value, [id]: false };
    }
  }
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
function formatDateShort(date: string) {
  return date ? new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
}
function formatDateOnly(date: string) {
  return new Date(date).toLocaleDateString('fr-FR');
}
function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 o';
  const k = 1024;
  const sizes = ['o', 'Ko', 'Mo', 'Go'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function getStatusLabel(status: string | undefined | null) {
  const labels: Record<string, string> = {
    pending: 'En attente',
    confirmed: 'Confirmé',
    planned: 'Planifié',
    in_progress: 'En cours',
    inProgress: 'En cours',
    completed: 'Terminé',
    cancelled: 'Annulé',
    canceled: 'Annulé',
    expired: 'Expiré',
    refused: 'Refusé',
  };
  return labels[status ?? ''] ?? status ?? 'Inconnu';
}

function getFrequencyLabel(frequency: string) {
  const labels: Record<string, string> = {
    once_daily: '1 fois par jour',
    twice_daily: '2 fois par jour',
    thrice_daily: '3 fois par jour',
    twice_weekly: '2 fois par semaine',
    thrice_weekly: '3 fois par semaine',
    to_define: 'A voir avec le professionnel',
    daily: '1 fois par jour',
    every_other_day: '1 jour sur 2',
  };
  return labels[frequency] ?? frequency;
}

function getGenderLabel(gender: string) {
  const labels: Record<string, string> = { male: 'Homme', female: 'Femme', other: 'Autre' };
  return labels[gender] ?? gender;
}

function getCareOptionLabel(optionKey: string): string {
  const catId = appointment.value?.category_id ?? appointment.value?.form_data?.category_id;
  if (!catId) return optionKey.replace(/_/g, ' ');
  const cat = categoriesForDetail.value.find((c) => String(c.id) === String(catId));
  const opt = cat?.options?.find((o) => o.option_key === optionKey);
  return opt?.label ?? optionKey.replace(/_/g, ' ');
}

function getCareOptionValueLabel(optionKey: string, value: string | number): string {
  const catId = appointment.value?.category_id ?? appointment.value?.form_data?.category_id;
  if (!catId) return String(value);
  const cat = categoriesForDetail.value.find((c) => String(c.id) === String(catId));
  const opt = cat?.options?.find((o) => o.option_key === optionKey);
  if (opt?.options && Array.isArray(opt.options)) {
    const found = opt.options.find((o) => String(o.value) === String(value));
    return found?.label ?? String(value);
  }
  return String(value);
}

function formatAvailability(availability: unknown) {
  try {
    const avail = typeof availability === 'string' ? JSON.parse(availability) : availability;
    if (avail?.type === 'all_day') return 'Toute la journée';
    if (avail?.type === 'custom' && avail?.range) return `${avail.range[0]}h – ${avail.range[1]}h`;
  } catch {
    // ignore
  }
  return typeof availability === 'string' ? availability : '';
}

async function submitReviewForAppt(appt: any) {
  const id = String(appt.id);
  ensureReviewForm(id);
  const form = reviewForms[id];
  if (appt.type === 'blood_test' && !appt.assigned_lab_id) {
    toast.add({
      title: 'Avis indisponible',
      description: 'Aucun laboratoire n’est associé à ce rendez-vous : l’avis ne peut pas être publié.',
      color: 'red',
    });
    return;
  }
  submittingReview.value = true;
  const response = await apiFetch('/reviews', {
    method: 'POST',
    body: {
      appointment_id: appt.id,
      reviewee_id: appt.type === 'nursing' ? appt.assigned_nurse_id : appt.assigned_lab_id,
      reviewee_type: appt.type === 'nursing' ? 'nurse' : 'lab',
      rating: form.rating,
      comment: form.comment,
    },
  });
  if (response.success) {
    reviewHasReviewed.value = { ...reviewHasReviewed.value, [id]: true };
    toast.add({ title: 'Avis envoyé', color: 'green' });
  } else {
    toast.add({ title: 'Erreur', description: response.error ?? 'Impossible d\'envoyer l\'avis', color: 'red' });
  }
  submittingReview.value = false;
}

async function confirmCancelAppointment() {
  canceling.value = true;
  const response = await apiFetch(`/appointments/${appointment.value.id}`, {
    method: 'PUT',
    body: { status: 'canceled', note: 'Annulé par le patient' },
  });
  if (response.success) {
    showCancelModal.value = false;
    toast.add({ title: 'Rendez-vous annulé', color: 'green' });
    await refreshAppointmentSilently();
  } else {
    toast.add({ title: 'Erreur', description: response.error ?? 'Impossible d\'annuler', color: 'red' });
  }
  canceling.value = false;
}

async function downloadDocument(docId: string) {
  downloadingDoc.value = docId;
  try {
    const doc = medicalDocuments.value.find((d: any) => d.id === docId);
    const config = useRuntimeConfig();
    const apiBase = config.public.apiBase || 'http://localhost:8888/api';
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : '';
    const response = await fetch(`${apiBase}/medical-documents/${docId}/download?id=${docId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error((err as any).error || 'Erreur téléchargement');
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const cd = response.headers.get('content-disposition');
    let name = doc?.file_name || 'document';
    if (cd) {
      const m = cd.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i);
      if (m?.[1]) name = m[1].replace(/['"]/g, '');
    }
    a.download = name;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    toast.add({ title: 'Téléchargement réussi', color: 'green' });
  } catch (e: any) {
    toast.add({ title: 'Erreur', description: e?.message ?? 'Impossible de télécharger', color: 'red' });
  } finally {
    downloadingDoc.value = null;
  }
}
</script>

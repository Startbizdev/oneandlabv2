<template>
  <div class="space-y-2 lg:space-y-3">
    <div v-if="!hideHeader" class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
      <div>
        <h1 class="text-xl sm:text-2xl lg:text-[28px] font-bold text-gray-900 dark:text-white tracking-tight leading-tight">
          {{ title }}
        </h1>
        <p v-if="subtitle" class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {{ subtitle }}
        </p>
      </div>

      <div v-if="$slots.headerActions" class="flex items-center gap-2">
        <slot name="headerActions" />
      </div>
    </div>

    <!-- Barre unique : onglets infirmier + recherche + période + filtres (tout le reste dans le sheet) -->
    <div
      class="rounded-xl border border-gray-200/80 dark:border-gray-800 bg-white/90 dark:bg-gray-900/50 p-2 sm:p-2.5 shadow-sm"
      :class="basePath === '/nurse' ? '' : 'space-y-2'"
    >
      <!-- Infirmier : recherche à gauche, une ligne ; scroll horizontal si besoin (pas de troncature des libellés) -->
      <div
        v-if="basePath === '/nurse'"
        class="flex flex-nowrap items-center gap-2 min-w-0 overflow-x-auto overscroll-x-contain scrollbar-thin pb-0.5 -mx-0.5 px-0.5 touch-pan-x"
      >
        <UInput
          v-model="searchQuery"
          placeholder="Nom, adresse, téléphone…"
          icon="i-lucide-search"
          size="sm"
          class="flex-1 min-w-[11rem] max-w-[min(100%,24rem)] lg:max-w-none"
          :ui="{ rounded: 'rounded-lg' }"
          clearable
        />
        <div
          v-if="nurseLockedSegment !== 'en_attente'"
          class="inline-flex shrink-0 rounded-lg border border-gray-100/90 dark:border-gray-800/80 bg-gray-50/60 dark:bg-gray-950/30 p-0.5 gap-0.5"
          role="tablist"
          aria-label="Type de rendez-vous"
        >
          <button
            v-for="t in nurseTabOptions"
            :key="t.value"
            type="button"
            role="tab"
            class="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md py-1.5 px-2 sm:px-2.5 text-[11px] font-semibold whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            :class="
              nurseListTab === t.value
                ? 'bg-white dark:bg-gray-900 text-primary-600 dark:text-primary-400 shadow-sm ring-1 ring-gray-200/80 dark:ring-gray-700'
                : 'text-gray-600 dark:text-gray-400 hover:bg-white/70 dark:hover:bg-gray-900/50'
            "
            :aria-selected="nurseListTab === t.value"
            :title="t.hint"
            @click="nurseListTab = t.value"
          >
            <UIcon :name="t.icon" class="w-3 h-3 shrink-0 opacity-90" />
            <span>{{ t.label }}</span>
          </button>
        </div>
        <div v-if="nurseLockedSegment == null" class="flex items-center gap-1 shrink-0">
          <UButton
            v-if="nurseListTab === 'soins' && nurseSegment !== 'en_attente'"
            type="button"
            variant="soft"
            color="primary"
            size="xs"
            icon="i-lucide-inbox"
            class="shrink-0 whitespace-nowrap"
            aria-label="Filtrer les demandes à accepter ou refuser"
            title="Afficher uniquement les soins où vous êtes proposé(e) — à accepter ou refuser."
            @click="nurseSegment = 'en_attente'"
          >
            À accepter
          </UButton>
          <UButton
            v-if="nurseListTab === 'soins' && nurseSegment === 'en_attente'"
            type="button"
            variant="outline"
            color="neutral"
            size="xs"
            icon="i-lucide-layout-list"
            class="shrink-0 whitespace-nowrap"
            aria-label="Afficher tous vos rendez-vous concernés"
            title="Revenir à la vue complète : tous les soins qui vous concernent (assignés, offres, créations)."
            @click="nurseSegment = 'tous'"
          >
            Tout afficher
          </UButton>
        </div>
        <div
          v-if="useDateFilter"
          class="flex items-center gap-1 shrink-0"
          role="tablist"
          aria-label="Période affichée"
        >
          <button
            v-for="tab in dateTabs"
            :key="tab.value"
            type="button"
            role="tab"
            class="shrink-0 whitespace-nowrap rounded-md px-2 sm:px-2.5 py-1 text-[11px] font-semibold transition-colors border"
            :class="
              dateFilter === tab.value
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40 text-primary-800 dark:text-primary-200'
                : 'border-gray-200/80 dark:border-gray-700 bg-gray-50/90 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            "
            :aria-selected="dateFilter === tab.value"
            @click="dateFilter = tab.value"
          >
            {{ tab.label }}
          </button>
        </div>
        <div class="flex items-center gap-1.5 shrink-0 ml-auto">
          <UButton
            v-if="nurseListTab === 'soins' && nurseLockedSegment == null"
            type="button"
            color="neutral"
            variant="soft"
            size="sm"
            class="shrink-0 whitespace-nowrap text-[11px] font-medium px-2 sm:px-2.5"
            :title="`${activeNurseSegmentShortLabel} — Ouvrir les filtres pour changer de vue`"
            @click="filtersSheetOpen = true"
          >
            {{ activeNurseSegmentShortLabel }}
          </UButton>
          <UButton
            type="button"
            color="neutral"
            variant="outline"
            size="sm"
            class="shrink-0 whitespace-nowrap px-2 sm:px-2.5"
            :aria-label="`Filtres${extraFiltersCount ? `, ${extraFiltersCount} actif(s)` : ''}`"
            @click="filtersSheetOpen = true"
          >
            <UIcon name="i-lucide-sliders-horizontal" class="w-4 h-4 sm:mr-0.5" />
            <span class="text-xs">Filtres</span>
            <UBadge
              v-if="extraFiltersCount > 0"
              :label="String(extraFiltersCount)"
              color="primary"
              variant="subtle"
              size="xs"
              class="ml-0.5 rounded-md min-w-[1.125rem] justify-center p-0"
            />
          </UButton>
        </div>
      </div>

      <!-- Autres rôles : recherche + période + filtres (inchangé) -->
      <div
        v-else
        class="flex flex-col gap-2 md:flex-row md:items-center md:gap-2 min-w-0"
      >
        <UInput
          v-model="searchQuery"
          placeholder="Nom, adresse, téléphone…"
          icon="i-lucide-search"
          size="sm"
          class="flex-1 min-w-0 md:min-w-[12rem]"
          :ui="{ rounded: 'rounded-lg' }"
          clearable
        />
        <div
          v-if="useDateFilter"
          class="flex items-center gap-1 overflow-x-auto pb-0.5 md:pb-0 -mx-0.5 px-0.5 scrollbar-thin md:shrink-0"
          role="tablist"
          aria-label="Période affichée"
        >
          <button
            v-for="tab in dateTabs"
            :key="tab.value"
            type="button"
            role="tab"
            class="shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold transition-colors border"
            :class="
              dateFilter === tab.value
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40 text-primary-800 dark:text-primary-200'
                : 'border-gray-200/80 dark:border-gray-700 bg-gray-50/90 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            "
            :aria-selected="dateFilter === tab.value"
            @click="dateFilter = tab.value"
          >
            {{ tab.label }}
          </button>
        </div>
        <div class="flex items-center gap-1.5 shrink-0 md:ml-auto">
          <UButton
            type="button"
            color="neutral"
            variant="outline"
            size="sm"
            class="shrink-0 px-2 sm:px-2.5"
            :aria-label="`Filtres${extraFiltersCount ? `, ${extraFiltersCount} actif(s)` : ''}`"
            @click="filtersSheetOpen = true"
          >
            <UIcon name="i-lucide-sliders-horizontal" class="w-4 h-4 sm:mr-0.5" />
            <span class="hidden sm:inline text-xs">Filtres</span>
            <UBadge
              v-if="extraFiltersCount > 0"
              :label="String(extraFiltersCount)"
              color="primary"
              variant="subtle"
              size="xs"
              class="ml-0.5 rounded-md min-w-[1.125rem] justify-center p-0"
            />
          </UButton>
        </div>
      </div>
    </div>

    <AppointmentListFiltersSheet
      v-model:open="filtersSheetOpen"
      v-model:date-filter="dateFilter"
      v-model:status-filter="statusFilter"
      v-model:date-range-start="dateRangeStart"
      v-model:date-range-end="dateRangeEnd"
      :use-date-filter="useDateFilter"
      :status-filter-options="statusFilterOptions"
      :show-nurse-filters="basePath === '/nurse' && nurseLockedSegment == null"
      v-model:nurse-tab="nurseListTab"
      v-model:nurse-segment="nurseSegment"
    />

    <div v-if="loading" class="flex flex-col items-center justify-center py-14">
      <UIcon
        name="i-lucide-loader-2"
        class="w-10 h-10 animate-spin text-primary-500 mb-4"
      />
      <p class="text-[15px] text-gray-500 dark:text-gray-400 font-medium">
        Chargement de vos rendez-vous...
      </p>
    </div>

    <UEmpty
      v-else-if="!loading && displayRows.length === 0"
      icon="i-lucide-calendar-x"
      :title="emptyStateTitle"
      :description="emptyStateDescription"
      class="py-12"
    />

    <div v-else class="space-y-4">
      <div
        class="grid items-stretch"
        :class="
          nurseCompactCards
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-2.5'
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3'
        "
      >
        <template v-for="row in displayRows" :key="row.kind === 'single' ? row.appointment.id : row.key">
          <!-- Lot multi-soins : une carte, plusieurs lignes -->
          <div
            v-if="row.kind === 'batch'"
            class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200/90 dark:border-gray-800 shadow-sm hover:shadow-md hover:border-primary-200/60 dark:hover:border-primary-900/40 transition-all duration-200 flex flex-col h-full overflow-hidden relative"
          >
            <NuxtLink
              v-if="batchPrimaryHref(row)"
              :to="batchPrimaryHref(row)!"
              :aria-label="`Voir le détail du lot — ${displayPatientName(row.appointments[0])}`"
              :class="['group relative flex flex-1 flex-col min-w-0 text-left rounded-t-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset', nurseCardBodyClass]"
            >
              <div class="flex items-start gap-2.5 min-w-0 pr-6">
                <div
                  class="rounded-xl flex items-center justify-center flex-shrink-0 ring-1 ring-inset"
                  :class="[typeIconRingClass(row.appointments[0]), nurseCompactCards ? 'w-8 h-8' : 'w-10 h-10']"
                >
                  <UIcon
                    :name="careCategoryIconName(row.appointments[0])"
                    :class="nurseCompactCards ? 'w-4 h-4' : 'w-5 h-5'"
                  />
                </div>
                <div class="min-w-0 flex-1">
                  <h3 class="text-sm font-semibold text-gray-900 dark:text-white truncate leading-tight group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {{ displayPatientName(row.appointments[0]) }}
                  </h3>
                  <p class="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    {{ batchSubtitle(row) }}
                  </p>
                </div>
              </div>
              <p v-if="displayAddress(row.appointments[0])" class="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 leading-snug flex items-start gap-1.5 min-w-0">
                <UIcon name="i-lucide-map-pin" class="w-3.5 h-3.5 shrink-0 text-gray-400 mt-0.5" />
                <span>{{ displayAddress(row.appointments[0]) }}</span>
              </p>
              <div class="space-y-2.5 pt-2">
                <div
                  v-for="apt in row.appointments"
                  :key="apt.id"
                  class="flex flex-col gap-0.5"
                >
                  <div class="flex items-start justify-between gap-2">
                    <span class="text-xs font-medium text-gray-800 dark:text-gray-100">{{ apt.category_name || '—' }}</span>
                    <UBadge
                      :color="getStatusColor(apt.status)"
                      variant="subtle"
                      size="xs"
                      class="shrink-0 rounded-md px-1.5 py-0.5 font-medium"
                      :label="getStatusLabel(apt.status)"
                    />
                  </div>
                  <div class="text-[11px] text-gray-600 dark:text-gray-400">
                    <span class="font-medium capitalize">{{ formatDateCompact(apt.scheduled_at) }}</span>
                    <span class="text-gray-400 dark:text-gray-500"> · </span>
                    <span>{{ getCreneauHoraireLabel(apt) }}</span>
                  </div>
                </div>
              </div>
              <UIcon
                name="i-lucide-chevron-right"
                class="pointer-events-none absolute right-3 top-4 w-4 h-4 text-gray-300 transition-colors group-hover:text-primary-500 dark:text-gray-600 dark:group-hover:text-primary-400"
                aria-hidden="true"
              />
            </NuxtLink>
            <button
              v-else
              type="button"
              :class="['group relative flex flex-1 flex-col min-w-0 text-left rounded-t-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset cursor-pointer', nurseCardBodyClass]"
              @click="emit('cardClick', row.appointments[0])"
            >
              <div class="flex items-start gap-2.5 min-w-0 pr-6">
                <div
                  class="rounded-xl flex items-center justify-center flex-shrink-0 ring-1 ring-inset"
                  :class="[typeIconRingClass(row.appointments[0]), nurseCompactCards ? 'w-8 h-8' : 'w-10 h-10']"
                >
                  <UIcon
                    :name="careCategoryIconName(row.appointments[0])"
                    :class="nurseCompactCards ? 'w-4 h-4' : 'w-5 h-5'"
                  />
                </div>
                <div class="min-w-0 flex-1 text-left">
                  <h3 class="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {{ displayPatientName(row.appointments[0]) }}
                  </h3>
                  <p class="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    {{ batchOpenLabel(row) }}
                  </p>
                </div>
              </div>
            </button>
            <div
              v-if="batchHasOfferActions(row)"
              class="border-t border-gray-100 dark:border-gray-800/80 px-2 py-2 space-y-2"
              @click.stop
            >
              <p class="text-[11px] font-medium text-gray-600 dark:text-gray-400">
                Lot multisoins — une seule réponse pour tous les soins
              </p>
              <label class="flex items-start gap-2 cursor-pointer text-[11px] text-gray-600 dark:text-gray-400 leading-snug">
                <USwitch
                  :model-value="acceptTermsForNurseOffer[batchOfferTermsKey(row)] ?? false"
                  class="shrink-0 mt-0.5"
                  @update:model-value="(v: boolean) => (acceptTermsForNurseOffer[batchOfferTermsKey(row)] = v)"
                />
                <span>En acceptant, je confirme la prise en charge et le respect du secret médical.</span>
              </label>
              <div class="flex flex-wrap gap-2">
                <UButton
                  color="error"
                  variant="outline"
                  size="xs"
                  :loading="isOfferProcessing(batchOfferTermsKey(row), 'refuse')"
                  @click="nurseRefuseOfferBatch(row)"
                >
                  Refuser
                </UButton>
                <UButton
                  color="primary"
                  size="xs"
                  :disabled="!acceptTermsForNurseOffer[batchOfferTermsKey(row)]"
                  :loading="isOfferProcessing(batchOfferTermsKey(row), 'accept')"
                  @click="nurseAcceptOfferBatch(row)"
                >
                  Accepter
                </UButton>
              </div>
            </div>
          </div>

          <!-- Carte simple -->
          <div
            v-else
            class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200/90 dark:border-gray-800 shadow-sm hover:shadow-md hover:border-primary-200/60 dark:hover:border-primary-900/40 transition-all duration-200 flex flex-col h-full overflow-hidden relative"
          >
            <NuxtLink
              v-if="resolvedCardHref(row.appointment)"
              :to="resolvedCardHref(row.appointment)!"
              :aria-label="`Voir le détail — ${displayPatientName(row.appointment)}`"
              :class="['group relative flex flex-1 flex-col min-w-0 text-left rounded-t-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset', nurseCardBodyClass]"
            >
              <div class="flex items-start gap-2.5 min-w-0 pr-6">
                <div
                  class="rounded-xl flex items-center justify-center flex-shrink-0 ring-1 ring-inset"
                  :class="[typeIconRingClass(row.appointment), nurseCompactCards ? 'w-8 h-8' : 'w-10 h-10']"
                >
                  <UIcon
                    :name="careCategoryIconName(row.appointment)"
                    :class="nurseCompactCards ? 'w-4 h-4' : 'w-5 h-5'"
                  />
                </div>
                <div class="min-w-0 flex-1">
                  <h3 class="text-sm font-semibold text-gray-900 dark:text-white truncate leading-tight group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {{ displayPatientName(row.appointment) }}
                  </h3>
                  <p v-if="appointmentCategorySummary(row.appointment)" class="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    {{ appointmentCategorySummary(row.appointment) }}
                  </p>
                </div>
                <UBadge
                  :color="getStatusColor(row.appointment.status)"
                  variant="subtle"
                  size="xs"
                  class="shrink-0 rounded-md px-1.5 py-0.5 font-medium"
                  :label="getStatusLabel(row.appointment.status)"
                />
              </div>

              <p v-if="displayAddress(row.appointment)" class="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 leading-snug flex items-start gap-1.5 min-w-0">
                <UIcon name="i-lucide-map-pin" class="w-3.5 h-3.5 shrink-0 text-gray-400 mt-0.5" />
                <span>{{ displayAddress(row.appointment) }}</span>
              </p>

              <div class="text-xs text-gray-700 dark:text-gray-200 leading-snug">
                <span class="font-medium capitalize">{{ formatDateCompact(row.appointment.scheduled_at) }}</span>
                <span class="text-gray-400 dark:text-gray-500"> · </span>
                <span class="text-gray-600 dark:text-gray-400">{{ getCreneauHoraireLabel(row.appointment) }}</span>
              </div>
              <p v-if="row.appointment.status === 'inProgress' && row.appointment.started_at" class="text-[11px] font-medium text-primary-600 dark:text-primary-400">
                Démarré {{ formatTime(row.appointment.started_at) }}
              </p>
              <UIcon
                name="i-lucide-chevron-right"
                class="pointer-events-none absolute right-3 top-4 w-4 h-4 text-gray-300 transition-colors group-hover:text-primary-500 dark:text-gray-600 dark:group-hover:text-primary-400"
                aria-hidden="true"
              />
            </NuxtLink>

            <button
              v-else
              type="button"
              :aria-label="`Ouvrir — ${displayPatientName(row.appointment)}`"
              :class="['group relative flex flex-1 flex-col min-w-0 text-left rounded-t-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset cursor-pointer', nurseCardBodyClass]"
              @click="emit('cardClick', row.appointment)"
            >
              <div class="flex items-start gap-2.5 min-w-0 pr-6">
                <div
                  class="rounded-xl flex items-center justify-center flex-shrink-0 ring-1 ring-inset"
                  :class="[typeIconRingClass(row.appointment), nurseCompactCards ? 'w-8 h-8' : 'w-10 h-10']"
                >
                  <UIcon
                    :name="careCategoryIconName(row.appointment)"
                    :class="nurseCompactCards ? 'w-4 h-4' : 'w-5 h-5'"
                  />
                </div>
                <div class="min-w-0 flex-1">
                  <h3 class="text-sm font-semibold text-gray-900 dark:text-white truncate leading-tight group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {{ displayPatientName(row.appointment) }}
                  </h3>
                  <p v-if="appointmentCategorySummary(row.appointment)" class="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    {{ appointmentCategorySummary(row.appointment) }}
                  </p>
                </div>
                <UBadge
                  :color="getStatusColor(row.appointment.status)"
                  variant="subtle"
                  size="xs"
                  class="shrink-0 rounded-md px-1.5 py-0.5 font-medium"
                  :label="getStatusLabel(row.appointment.status)"
                />
              </div>

              <p v-if="displayAddress(row.appointment)" class="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 leading-snug flex items-start gap-1.5 min-w-0">
                <UIcon name="i-lucide-map-pin" class="w-3.5 h-3.5 shrink-0 text-gray-400 mt-0.5" />
                <span>{{ displayAddress(row.appointment) }}</span>
              </p>

              <div class="text-xs text-gray-700 dark:text-gray-200 leading-snug">
                <span class="font-medium capitalize">{{ formatDateCompact(row.appointment.scheduled_at) }}</span>
                <span class="text-gray-400 dark:text-gray-500"> · </span>
                <span class="text-gray-600 dark:text-gray-400">{{ getCreneauHoraireLabel(row.appointment) }}</span>
              </div>
              <p v-if="row.appointment.status === 'inProgress' && row.appointment.started_at" class="text-[11px] font-medium text-primary-600 dark:text-primary-400">
                Démarré {{ formatTime(row.appointment.started_at) }}
              </p>
              <UIcon
                name="i-lucide-chevron-right"
                class="pointer-events-none absolute right-3 top-4 w-4 h-4 text-gray-300 transition-colors group-hover:text-primary-500 dark:text-gray-600 dark:group-hover:text-primary-400"
                aria-hidden="true"
              />
            </button>

            <div
              v-if="showNurseOfferCardActions(row.appointment)"
              class="border-t border-gray-100 dark:border-gray-800/80 px-2 py-2 space-y-2"
              @click.stop
            >
              <label class="flex items-start gap-2 cursor-pointer text-[11px] text-gray-600 dark:text-gray-400 leading-snug">
                <USwitch
                  :model-value="acceptTermsForNurseOffer[row.appointment.id] ?? false"
                  class="shrink-0 mt-0.5"
                  @update:model-value="(v: boolean) => (acceptTermsForNurseOffer[row.appointment.id] = v)"
                />
                <span>En acceptant, je confirme la prise en charge et le respect du secret médical.</span>
              </label>
              <div class="flex flex-wrap gap-2">
                <UButton
                  color="error"
                  variant="outline"
                  size="xs"
                  :loading="isOfferProcessing(row.appointment.id, 'refuse')"
                  @click="nurseRefuseOffer(row.appointment)"
                >
                  Refuser
                </UButton>
                <UButton
                  color="primary"
                  size="xs"
                  :disabled="!acceptTermsForNurseOffer[row.appointment.id]"
                  :loading="isOfferProcessing(row.appointment.id, 'accept')"
                  @click="nurseAcceptOffer(row.appointment)"
                >
                  Accepter
                </UButton>
              </div>
            </div>

            <div
              v-if="$slots.cardActions"
              class="flex flex-wrap items-center gap-1.5 border-t border-gray-100 dark:border-gray-800/80 px-2 py-1.5"
              @click.stop
            >
              <slot name="cardActions" :appointment="row.appointment" :base-path="basePath" />
            </div>
          </div>
        </template>
      </div>

      <div
        v-if="showPaginationBar"
        class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 mt-4 border-t border-gray-100 dark:border-gray-800"
      >
        <p class="text-[14px] text-gray-500 dark:text-gray-400">
          Affichage de <span class="font-semibold text-gray-900 dark:text-white">{{ startIndex }}-{{ endIndex }}</span> 
          sur <span class="font-semibold text-gray-900 dark:text-white">{{ totalItems }}</span>
        </p>
        <UPagination
          v-model:page="currentPage"
          :total="totalItems"
          :items-per-page="pageSize"
          :sibling-count="2"
          show-edges
          :ui="{ wrapper: 'gap-1', rounded: 'rounded-lg' }"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue';
import { apiFetch } from '~/utils/api';
import { getNursingDurationLabel } from '~/constants/nursing-duration';
import { formatBloodTestSeriesDurationDays } from '~/utils/duration-display';
import { appointmentListAddressLine } from '~/utils/address-display';
import { isPendingIncomingOffer } from '~/utils/appointment-offer';
import {
  NURSE_SEGMENT_OPTIONS,
  NURSE_TAB_OPTIONS,
  isValidNurseSegment,
  normalizeNurseSegment,
  type NurseListTab,
  type NurseSegment,
} from '~/constants/nurse-appointments-filters';
import { resolveCareIconFromCategory } from '~/utils/care-icons';
import {
  groupAppointmentsByBatch,
  groupAppointmentsForNurseMesDemandes,
  type AppointmentListRow,
} from '~/utils/appointment-batch';
import { isBloodTestAppointment } from '~/utils/appointment-type-rules';
import { useAppointmentModalQueue } from '~/composables/useAppointmentModalQueue';

const props = withDefaults(
  defineProps<{
    basePath: string
    title?: string
    subtitle?: string
    /** Masque l'en-tête (titre + actions) pour utiliser TitleDashboard sur la page parente. */
    hideHeader?: boolean
    /** Si true, utilise les filtres date (À venir / Passés) et fetch nurse-style. Sinon fetch tous et filtre côté client par search/status si besoin. */
    useDateFilter?: boolean
    /** Statuts à inclure dans l'API (ex: "confirmed,inProgress,completed,canceled,refused" pour nurse). Vide = tous. */
    statusFilterApi?: string
    /** Filtre optionnel : n'afficher que les RDV assignés à ce préleveur (lab). */
    assignedToPreleveurId?: string
    /** Filtre optionnel : n'afficher que les RDV assignés à ce sous-compte / lab (assigned_lab_id). */
    assignedToLabId?: string
    /** Filtre optionnel (admin) : n'afficher que les RDV de cet utilisateur (user_id). */
    userIdFilter?: string
    /**
     * Destination du clic sur la carte. Retourner `null` pour gérer le clic via @card-click (ex. modal offre entrante).
     * Par défaut : `${basePath}/appointments/:id`.
     */
    cardHref?: (appointment: any) => string | null
    /** Verrouille la vue infirmier (plus de filtres segment / sheet « vues »). `tous` = liste RDV ; `en_attente` = page « Mes demandes ». */
    nurseLockedSegment?: 'tous' | 'en_attente'
    /** Grille plus dense (mini-cartes) pour Mes demandes. */
    nurseCompactCards?: boolean
  }>(),
  {
    title: 'Mes rendez-vous',
    subtitle: 'Gérez vos rendez-vous',
    hideHeader: false,
    useDateFilter: true,
    statusFilterApi: '',
    assignedToPreleveurId: '',
    assignedToLabId: '',
    userIdFilter: '',
    cardHref: undefined,
    nurseLockedSegment: undefined,
    nurseCompactCards: false,
  }
);

const emit = defineEmits<{
  cardClick: [appointment: any]
}>();

function nurseSegmentEffective(): NurseSegment {
  return (props.nurseLockedSegment ?? nurseSegment.value) as NurseSegment;
}

function resolvedCardHref(appointment: any): string | null {
  if (props.cardHref) return props.cardHref(appointment);
  if (props.basePath === '/nurse') {
    const seg = nurseSegmentEffective();
    if (seg === 'en_attente' && isPendingIncomingOffer(appointment, user.value?.id)) {
      return `/nurse/appointments/${appointment.id}`;
    }
    if (isPendingIncomingOffer(appointment, user.value?.id)) {
      return null;
    }
  }
  return `${props.basePath}/appointments/${appointment.id}`;
}

function batchPrimaryHref(row: AppointmentListRow): string | null {
  if (row.kind !== 'batch' || !row.appointments.length) return null;
  return resolvedCardHref(row.appointments[0]);
}

function isBloodTestBatch(row: AppointmentListRow): boolean {
  return row.kind === 'batch' && row.appointments.every((apt) => isBloodTestAppointment(apt?.type));
}

function batchSubtitle(row: AppointmentListRow): string {
  return isBloodTestBatch(row) ? 'Plusieurs analyses (même demande)' : 'Plusieurs soins (même demande)';
}

function batchOpenLabel(row: AppointmentListRow): string {
  return isBloodTestBatch(row) ? 'Plusieurs analyses — ouvrir pour répondre' : 'Plusieurs soins — ouvrir pour répondre';
}

const toast = useAppToast();
const { user } = useAuth();
const route = useRoute();
const router = useRouter();
const { shareTokenForAccept } = useAppointmentModalQueue();

/** Filtres infirmier (liste + URL) — utilisés seulement si basePath === /nurse */
const nurseListTab = ref<NurseListTab>('soins');
const nurseSegment = ref<NurseSegment>('tous');
const nurseTabOptions = NURSE_TAB_OPTIONS;
const nurseSegmentOptions = NURSE_SEGMENT_OPTIONS;

const nurseCardBodyClass = computed(() =>
  props.nurseCompactCards ? 'gap-1.5 p-2.5 sm:p-3' : 'gap-2 p-3.5 sm:p-4',
);

/** Libellé court de la vue (chip + sheet) */
const activeNurseSegmentShortLabel = computed(() => {
  const o = nurseSegmentOptions.find((x) => x.value === nurseSegment.value);
  return o?.label ?? 'Vue';
});

function applyNurseNavFromRoute() {
  if (props.basePath !== '/nurse') return;
  // Page « Mes demandes » verrouillée sur en_attente : prioriser — sinon tab=demandes + shareToken
  // forçait nurse_tab=demandes (API = bilans sanguins / envoyes) et vidait la liste des soins infirmiers.
  if (props.nurseLockedSegment) {
    nurseListTab.value = 'soins';
    nurseSegment.value = props.nurseLockedSegment;
    return;
  }
  // Lien partagé (WhatsApp) sur liste sans segment verrouillé : onglet Bilans sanguins
  if (route.query.tab === 'demandes' && route.query.shareToken) {
    nurseListTab.value = 'demandes';
    return;
  }
  if (route.query.tab === 'demandes') {
    nurseListTab.value = 'demandes';
    return;
  }
  nurseListTab.value = 'soins';
  const s = route.query.segment;
  if (typeof s === 'string' && isValidNurseSegment(s)) {
    nurseSegment.value = normalizeNurseSegment(s);
  } else {
    nurseSegment.value = 'tous';
  }
}

function syncNurseQueryToUrl() {
  if (props.basePath !== '/nurse') return;
  if (props.nurseLockedSegment) {
    const q = { ...route.query } as Record<string, string | string[] | undefined>;
    delete q.segment;
    // Conserver tab=demandes + jeton partage (ouverture depuis lien WhatsApp)
    if (nurseListTab.value === 'demandes' && route.query.shareToken) {
      q.tab = 'demandes';
    }
    const a = JSON.stringify(route.query);
    const b = JSON.stringify(q);
    if (a !== b) void router.replace({ path: route.path, query: q });
    return;
  }
  const q = { ...route.query } as Record<string, string | string[] | undefined>;
  if (nurseListTab.value === 'demandes') {
    q.tab = 'demandes';
    delete q.segment;
  } else {
    delete q.tab;
    if (nurseSegment.value !== 'tous') q.segment = nurseSegment.value;
    else delete q.segment;
  }
  const a = JSON.stringify(route.query);
  const b = JSON.stringify(q);
  if (a !== b) void router.replace({ path: route.path, query: q });
}

watch(() => route.query, applyNurseNavFromRoute, { immediate: true });

const currentPage = ref(1);
/** Taille de page API : alignée sur le backend (défaut 20 si param absent) ; 24 pour limiter les allers-retours. */
const pageSize = ref(24);
const totalItems = ref(0);
/** Indique qu’il existe (probablement) une page suivante — renvoyé par l’API ou déduit. */
const serverHasMore = ref(false);
const totalPages = computed(() => Math.ceil(totalItems.value / pageSize.value));
/** Afficher la barre si plus d’une page, ou page suivante possible, ou déjà au-delà de la page 1. */
const showPaginationBar = computed(
  () => totalPages.value > 1 || serverHasMore.value || currentPage.value > 1,
);

const loading = ref(false);
/** Cases à cocher « prise en charge » pour accepter une offre depuis la liste infirmier. */
const acceptTermsForNurseOffer = reactive<Record<string, boolean>>({});
const displayRows = computed(() =>
  props.basePath === '/nurse' && props.nurseLockedSegment === 'en_attente'
    ? groupAppointmentsForNurseMesDemandes(filteredAndSorted.value)
    : groupAppointmentsByBatch(filteredAndSorted.value),
);
const dateFilter = ref('upcoming');
const searchQuery = ref('');
const filtersSheetOpen = ref(false);
const statusFilter = ref('all');
const dateRangeStart = ref<string | null>(null);
const dateRangeEnd = ref<string | null>(null);

/** Badge sur « Filtres » : statut ≠ tous et/ou plage de dates (+ vue infirmier). */
const extraFiltersCount = computed(() => {
  let n = 0;
  if (statusFilter.value && statusFilter.value !== 'all') n += 1;
  if (dateRangeStart.value || dateRangeEnd.value) n += 1;
  if (props.basePath === '/nurse' && !props.nurseLockedSegment) {
    if (nurseListTab.value === 'demandes') n += 1;
    else if (nurseSegment.value !== 'tous') n += 1;
  }
  return n;
});
/** Accepter/refuser depuis la carte : spinner uniquement sur le bouton cliqué (pas les deux). */
const processingOfferAction = reactive<Record<string, 'accept' | 'refuse'>>({});
const processingAppointments = computed(() => new Set(Object.keys(processingOfferAction)));

const dateTabs = [
  { label: 'À venir', value: 'upcoming' },
  { label: 'Passés', value: 'past' },
];

const statusFilterOptions = [
  { label: 'Tous les statuts', value: 'all' },
  { label: 'En attente', value: 'pending' },
  { label: 'Confirmé', value: 'confirmed' },
  { label: 'En cours', value: 'inProgress' },
  { label: 'Terminé', value: 'completed' },
  { label: 'Annulé', value: 'canceled' },
  { label: 'Refusé', value: 'refused' },
];

/** Liste brute après fetch + filtre date uniquement (sans tri ni filtre statut/recherche). */
const baseAppointments = ref<any[]>([]);

/** Liste filtrée par statut et recherche (et préleveur si lab), triée du plus récent au plus ancien (created_at puis scheduled_at). */
const filteredAndSorted = computed(() => {
  let list = [...baseAppointments.value];
  // Infirmier « Mes rendez-vous » (segment tous) : ne pas afficher les offres à accepter (déjà sur Mes demandes)
  if (
    props.basePath === '/nurse'
    && nurseListTab.value === 'soins'
    && nurseSegmentEffective() === 'tous'
  ) {
    const uid = user.value?.id;
    list = list.filter(
      (a: any) => !(a?.type === 'nursing' && isPendingIncomingOffer(a, uid)),
    );
  }
  // Lab : filtre préleveur / sous-compte appliqué côté API (filter_assigned_*) pour total + pages corrects.
  if (props.basePath !== '/lab') {
    if (props.assignedToPreleveurId) {
      list = list.filter((a: any) => a.assigned_to === props.assignedToPreleveurId);
    }
    if (props.assignedToLabId) {
      list = list.filter((a: any) => a.assigned_lab_id === props.assignedToLabId);
    }
  }
  if (statusFilter.value && statusFilter.value !== 'all') {
    list = list.filter((a: any) => a.status === statusFilter.value);
  }
  if (dateRangeStart.value) {
    const startDay = new Date(dateRangeStart.value);
    startDay.setHours(0, 0, 0, 0);
    const startTs = startDay.getTime();
    list = list.filter((a: any) => {
      const at = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0;
      return at >= startTs;
    });
  }
  if (dateRangeEnd.value) {
    const endDay = new Date(dateRangeEnd.value);
    endDay.setHours(23, 59, 59, 999);
    const endTs = endDay.getTime();
    list = list.filter((a: any) => {
      const at = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0;
      return at <= endTs;
    });
  }
  const q = (searchQuery.value || '').trim().toLowerCase();
  if (q) {
    list = list.filter((a: any) => {
      const firstName = (a.form_data?.first_name || '').toLowerCase();
      const lastName = (a.form_data?.last_name || '').toLowerCase();
      const phone = (a.form_data?.phone || '').replace(/\s/g, '');
      const address = typeof a.address === 'string' ? a.address.toLowerCase() : (a.address?.label || '').toLowerCase();
      const searchPhone = q.replace(/\s/g, '');
      return (
        firstName.includes(q) ||
        lastName.includes(q) ||
        `${firstName} ${lastName}`.trim().includes(q) ||
        `${lastName} ${firstName}`.trim().includes(q) ||
        phone.includes(searchPhone) ||
        address.includes(q)
      );
    });
  }
  list.sort((a: any, b: any) => {
    const dateA = new Date(a.created_at || a.scheduled_at || 0).getTime();
    const dateB = new Date(b.created_at || b.scheduled_at || 0).getTime();
    return dateB - dateA;
  });
  return list;
});

/** Indices d’affichage alignés sur la pagination serveur (nombre de RDV), pas sur le nombre de cartes (lots groupés). */
const startIndex = computed(() => {
  if (totalItems.value === 0) return 0;
  return (currentPage.value - 1) * pageSize.value + 1;
});

const endIndex = computed(() => {
  if (totalItems.value === 0) return 0;
  return Math.min(currentPage.value * pageSize.value, totalItems.value);
});

const emptyStateTitle = computed(() => {
  if (baseAppointments.value.length > 0 && filteredAndSorted.value.length === 0) {
    return 'Aucun résultat';
  }
  if (props.nurseLockedSegment === 'en_attente' && baseAppointments.value.length === 0) {
    return 'Aucune demande en attente';
  }
  const filterLabel = dateTabs.find((o) => o.value === dateFilter.value)?.label || '';
  return `Aucun rendez-vous ${filterLabel.toLowerCase()}`;
});

const emptyStateDescription = computed(() => {
  if (baseAppointments.value.length > 0 && filteredAndSorted.value.length === 0) {
    return 'Aucun rendez-vous ne correspond à la recherche ou au filtre de statut. Modifiez vos critères.';
  }
  if (props.nurseLockedSegment === 'en_attente' && baseAppointments.value.length === 0) {
    return 'Les nouvelles propositions de soins apparaîtront ici. La liste se met à jour automatiquement.';
  }
  switch (dateFilter.value) {
    case 'upcoming':
      return "Aucun rendez-vous à venir. Ils apparaîtront ici une fois créés ou acceptés.";
    case 'past':
      return "Aucun rendez-vous dans l'historique.";
    default:
      return 'Aucun rendez-vous trouvé.';
  }
});

function getStatusColor(status: string): 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral' {
  const colors: Record<string, 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral'> = {
    pending: 'warning',
    confirmed: 'info',
    planned: 'info',
    inProgress: 'primary',
    completed: 'success',
    canceled: 'error',
    cancelled: 'error',
    refused: 'error',
    expired: 'neutral',
  };
  return colors[status] || 'neutral';
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: 'En attente',
    confirmed: 'Confirmé',
    planned: 'Planifié',
    inProgress: 'En cours',
    completed: 'Terminé',
    canceled: 'Annulé',
    cancelled: 'Annulé',
    refused: 'Refusé',
    expired: 'Expiré',
  };
  return labels[status] || status;
}

function formatDateTime(date: string) {
  if (!date) return '-';
  try {
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return date;
  }
}

/** Date courte pour cartes compactes (liste RDV). */
function formatDateCompact(date: string | undefined) {
  if (!date) return '—';
  try {
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function careCategoryIconName(apt: any): string {
  const t = apt?.type === 'blood_test' ? 'blood_test' : 'nursing';
  return resolveCareIconFromCategory({
    type: t,
    icon: apt?.category_icon ?? null,
  });
}

function appointmentCategorySummary(apt: any): string {
  const items = Array.isArray(apt?.blood_test_items) ? apt.blood_test_items : [];
  if (apt?.type === 'blood_test' && items.length > 1) {
    return `${items.length} actes de prise de sang`;
  }
  return apt?.category_name || '';
}

function typeIconRingClass(apt: any): string {
  if (apt?.type === 'blood_test') {
    return 'bg-red-50 text-red-600 ring-red-200/80 dark:bg-red-950/40 dark:text-red-400 dark:ring-red-900/50';
  }
  return 'bg-sky-50 text-sky-600 ring-sky-200/80 dark:bg-sky-950/40 dark:text-sky-400 dark:ring-sky-900/50';
}

function getDurationLabel(v: string, customDays?: number | null): string {
  if (v === 'custom' && customDays != null) return `${customDays} jours`;
  if (v === 'custom') return 'Durée personnalisée';
  const labels: Record<string, string> = {
    '1': '1 jour',
    '7': '7 jours',
    '10': '10 jours',
    '15': '15 jours (ou jusqu\'à la cicatrisation)',
    '30': '30 jours',
    '60+': 'Longue durée (60 jours ou +)',
  };
  return labels[v] || v;
}

function getBloodTestTypeLabel(fd: any): string {
  if (!fd?.blood_test_type) return '';
  if (fd.blood_test_type === 'single') return 'Une seule fois';
  if (fd.blood_test_type === 'multiple') {
    const days = formatBloodTestSeriesDurationDays(fd.duration_days, fd.custom_days);
    return days ? `Série sur ${days}` : 'Plusieurs prélèvements';
  }
  return '';
}

function getFrequencyLabel(v: string) {
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
  return labels[v] || v;
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatAvailability(availability: string | object | null | undefined): string {
  if (availability == null) return '';
  try {
    let avail: any = availability;
    if (typeof availability === 'string') {
      const trimmed = availability.trim();
      if (!trimmed) return '';
      avail = JSON.parse(trimmed);
    }
    if (!avail || typeof avail !== 'object') return '';
    if (avail.type === 'all_day') {
      return 'Toute la journée';
    }
    if (avail.type === 'custom' && Array.isArray(avail.range) && avail.range.length >= 2) {
      const start = Math.floor(Number(avail.range[0]));
      const end = Math.floor(Number(avail.range[1]));
      if (Number.isNaN(start) || Number.isNaN(end)) return '';
      return `${start}h00 - ${end}h00`;
    }
  } catch {
    // ignore
  }
  return '';
}

function getCreneauHoraireLabel(appointment: any): string {
  const availability = appointment.form_data?.availability;
  const formatted = formatAvailability(availability);
  if (formatted) return formatted;
  if (appointment.scheduled_at) {
    try {
      const d = new Date(appointment.scheduled_at);
      return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      // ignore
    }
  }
  return 'Non précisé';
}

const fetchAppointments = async (silent = false) => {
  if (!silent) loading.value = true;
  try {
    const params: Record<string, string> = {
      page: String(currentPage.value),
      limit: String(pageSize.value),
    };
    if (props.statusFilterApi) {
      params.status = props.statusFilterApi;
    } else if (statusFilter.value && statusFilter.value !== 'all') {
      params.status = statusFilter.value;
    }
    if (props.userIdFilter) {
      params.user_id = props.userIdFilter;
    }
    if (props.useDateFilter) {
      const now = new Date();
      if (dateRangeStart.value) {
        params.date_from = new Date(dateRangeStart.value + 'T00:00:00').toISOString().slice(0, 19).replace('T', ' ');
      } else if (dateFilter.value === 'upcoming') {
        // Début du jour local : sinon les RDV « aujourd’hui » déjà passés disparaissent de « À venir »
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const pad = (n: number) => String(n).padStart(2, '0');
        params.date_from = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())} ${pad(start.getHours())}:${pad(start.getMinutes())}:${pad(start.getSeconds())}`;
      }
      if (dateRangeEnd.value) {
        params.date_to = new Date(dateRangeEnd.value + 'T23:59:59').toISOString().slice(0, 19).replace('T', ' ');
      } else if (dateFilter.value === 'past') {
        params.date_to = now.toISOString().slice(0, 19).replace('T', ' ');
      }
    }
    if (props.basePath === '/nurse') {
      params.nurse_tab = nurseListTab.value;
      const seg = props.nurseLockedSegment ?? nurseSegment.value;
      if (nurseListTab.value === 'soins' && seg !== 'tous') {
        params.nurse_segment = seg;
      }
    }
    if (props.basePath === '/lab') {
      const pre = (props.assignedToPreleveurId || '').trim();
      const slab = (props.assignedToLabId || '').trim();
      if (pre) params.filter_assigned_to = pre;
      if (slab) params.filter_assigned_lab_id = slab;
    }
    const queryString = new URLSearchParams(params).toString();
    const response = await apiFetch(`/appointments?${queryString}`, { method: 'GET' });

    if (response.success && response.data) {
      baseAppointments.value = response.data;
      const pag = response.pagination as
        | { total?: number; has_more?: boolean; limit?: number }
        | undefined;
      const len = response.data.length;
      let total = pag != null && Number.isFinite(Number(pag.total)) ? Number(pag.total) : 0;
      const hasMoreFlag = pag?.has_more === true;
      serverHasMore.value = hasMoreFlag;
      if (total === 0 && len > 0) {
        total = (currentPage.value - 1) * pageSize.value + len;
      }
      if (hasMoreFlag) {
        total = Math.max(total, currentPage.value * pageSize.value + 1);
      }
      totalItems.value = total;
    } else {
      toast.add({
        title: 'Erreur',
        description: response.error || 'Erreur lors du chargement des rendez-vous',
        color: 'red',
      });
      baseAppointments.value = [];
      totalItems.value = 0;
      serverHasMore.value = false;
    }
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error.message || 'Une erreur est survenue',
      color: 'red',
    });
    baseAppointments.value = [];
    totalItems.value = 0;
    serverHasMore.value = false;
  } finally {
    if (!silent) loading.value = false;
  }
};

/** Polling pour nurse, lab, subaccount : rafraîchir la liste en arrière-plan (ex. après acceptation dans la modal) */
const shouldPollList = computed(() =>
  ['/nurse', '/lab', '/subaccount'].some((p) => props.basePath.startsWith(p))
);
const { start: startListPolling } = usePolling(
  () => fetchAppointments(true),
  15000
);

/** Rafraîchir immédiatement quand la modal accepte/refuse (trigger du layout) */
const listRefreshTrigger = useState<number>('appointments.listRefreshTrigger', () => 0);
watch(listRefreshTrigger, () => {
  if (shouldPollList.value) fetchAppointments(true);
});

function showNurseOfferCardActions(apt: any): boolean {
  if (props.basePath !== '/nurse') return false;
  if (nurseSegmentEffective() !== 'en_attente') return false;
  if (apt?.type !== 'nursing') return false;
  return isPendingIncomingOffer(apt, user.value?.id);
}

function batchOfferTermsKey(row: Extract<AppointmentListRow, { kind: 'batch' }>): string {
  return row.key;
}

function batchHasOfferActions(row: AppointmentListRow): boolean {
  if (row.kind !== 'batch') return false;
  return row.appointments.some((a) => showNurseOfferCardActions(a));
}

/** Premier RDV du lot avec offre entrante (ex. ouverture modal). */
function primaryAppointmentForBatchOffer(row: Extract<AppointmentListRow, { kind: 'batch' }>): any {
  return row.appointments.find((a) => showNurseOfferCardActions(a)) ?? row.appointments[0];
}

/** Premier soin chronologiquement — pour ouvrir la fiche détail où le lot complet est déjà affiché (`batch_siblings`). */
function firstBatchAppointmentForDetail(row: Extract<AppointmentListRow, { kind: 'batch' }>): any {
  return [...row.appointments].sort(
    (a, b) =>
      new Date(a.scheduled_at || a.created_at || 0).getTime() -
      new Date(b.scheduled_at || b.created_at || 0).getTime(),
  )[0]!;
}

async function nurseAcceptOfferBatch(row: Extract<AppointmentListRow, { kind: 'batch' }>) {
  const termsKey = batchOfferTermsKey(row);
  const apts = row.appointments.filter((a) => showNurseOfferCardActions(a));
  if (apts.length === 0) return;
  /** Fiche `/nurse/appointments/:id` : GET charge le RDV + les frères de lot (`batch_siblings`) — même URL pour tout le lot. */
  const detailTarget = firstBatchAppointmentForDetail(row);

  if (!acceptTermsForNurseOffer[termsKey]) {
    toast.add({
      title: 'Conditions requises',
      description: 'Activez la prise en charge et la confidentialité du patient pour accepter.',
      color: 'warning',
    });
    return;
  }

  const sharedBid = row.appointments[0]?.creation_batch_id;
  const allSameBackendBatch =
    !!sharedBid && row.appointments.every((a) => a.creation_batch_id === sharedBid);

  if (allSameBackendBatch && row.appointments.length > 1) {
    await nurseAcceptOffer(detailTarget, { termsKey, isBatch: true });
    return;
  }

  processingOfferAction[termsKey] = 'accept';
  try {
    const shareTok =
      (typeof route.query.shareToken === 'string' && route.query.shareToken.trim() !== ''
        ? route.query.shareToken.trim()
        : '') ||
      shareTokenForAccept.value ||
      '';
    const aptsChrono = [...apts].sort(
      (a, b) =>
        new Date(a.scheduled_at || a.created_at || 0).getTime() -
        new Date(b.scheduled_at || b.created_at || 0).getTime(),
    );
    for (let i = 0; i < aptsChrono.length; i++) {
      const apt = aptsChrono[i]!;
      const body: Record<string, unknown> = { status: 'confirmed' };
      if (i === 0 && shareTok) body.share_token = shareTok;
      const res = await apiFetch(`/appointments/${apt.id}`, { method: 'PUT', body });
      if (!res.success) {
        toast.add({
          title: 'Erreur',
          description: (res as any).error || `Impossible d’accepter le rendez-vous ${i + 1}/${aptsChrono.length}.`,
          color: 'red',
        });
        return;
      }
    }
    if (shareTok) shareTokenForAccept.value = null;
    toast.add({
      title: 'Demandes acceptées',
      description: `${aptsChrono.length} soin(s) pris en charge — la fiche liste l’ensemble du lot.`,
      color: 'green',
    });
    listRefreshTrigger.value++;
    await navigateTo(`/nurse/appointments/${detailTarget.id}`);
    void fetchAppointments(true);
  } catch (err: any) {
    if (err?.code === 'PLAN_LIMIT' || (err?.message && /limite|offre Découverte/i.test(String(err.message)))) {
      toast.add({
        title: 'Limite atteinte',
        description: err?.message || 'Passez à l’offre Pro pour accepter sans limite.',
        color: 'warning',
      });
    } else {
      toast.add({ title: 'Erreur', description: err?.message || 'Impossible d’accepter', color: 'red' });
    }
  } finally {
    delete processingOfferAction[termsKey];
  }
}

async function nurseRefuseOfferBatch(row: Extract<AppointmentListRow, { kind: 'batch' }>) {
  const termsKey = batchOfferTermsKey(row);
  const apts = row.appointments.filter((a) => showNurseOfferCardActions(a));
  if (apts.length === 0) return;
  processingOfferAction[termsKey] = 'refuse';
  try {
    const results = await Promise.all(
      apts.map((apt) =>
        apiFetch(`/appointments/${apt.id}`, { method: 'PUT', body: { status: 'refused' } }),
      ),
    );
    const allSuccess = results.every((r: any) => r.success);
    if (!allSuccess) {
      toast.add({ title: 'Erreur', description: 'Impossible de refuser tout le lot.', color: 'red' });
      return;
    }
    const anyDeclined = results.some((r: any) => r.declined_offer);
    if (anyDeclined) {
      toast.add({
        title: 'Propositions retirées',
        description: 'Le lot reste en attente pour le patient.',
        color: 'neutral',
      });
    } else {
      toast.add({ title: 'Rendez-vous refusés', color: 'warning' });
    }
    listRefreshTrigger.value++;
    await fetchAppointments(true);
  } catch (err: any) {
    toast.add({ title: 'Erreur', description: err?.message || 'Impossible de refuser', color: 'red' });
  } finally {
    delete processingOfferAction[termsKey];
  }
}

async function nurseAcceptOffer(
  apt: any,
  opts?: { termsKey?: string; isBatch?: boolean },
) {
  const termsKey = opts?.termsKey ?? apt.id;
  if (!acceptTermsForNurseOffer[termsKey]) {
    toast.add({
      title: 'Conditions requises',
      description: 'Activez la prise en charge et la confidentialité du patient pour accepter.',
      color: 'warning',
    });
    return;
  }
  processingOfferAction[termsKey] = 'accept';
  try {
    const shareTok =
      (typeof route.query.shareToken === 'string' && route.query.shareToken.trim() !== ''
        ? route.query.shareToken.trim()
        : '') ||
      shareTokenForAccept.value ||
      '';
    const body: Record<string, unknown> = { status: 'confirmed' };
    if (shareTok) body.share_token = shareTok;
    const res = await apiFetch(`/appointments/${apt.id}`, { method: 'PUT', body });
    if (res.success) {
      if (shareTok) shareTokenForAccept.value = null;
      toast.add({
        title: opts?.isBatch ? 'Lot multisoins accepté' : 'Rendez-vous accepté',
        color: 'green',
      });
      listRefreshTrigger.value++;
      await navigateTo(`/nurse/appointments/${apt.id}`);
      void fetchAppointments(true);
    }
  } catch (err: any) {
    if (err?.code === 'PLAN_LIMIT' || (err?.message && /limite|offre Découverte/i.test(String(err.message)))) {
      toast.add({
        title: 'Limite atteinte',
        description: err?.message || 'Passez à l’offre Pro pour accepter sans limite.',
        color: 'warning',
      });
    } else {
      toast.add({ title: 'Erreur', description: err?.message || 'Impossible d’accepter', color: 'red' });
    }
  } finally {
    delete processingOfferAction[termsKey];
  }
}

async function nurseRefuseOffer(apt: any, opts?: { termsKey?: string }) {
  const termsKey = opts?.termsKey ?? apt.id;
  processingOfferAction[termsKey] = 'refuse';
  try {
    const res = await apiFetch(`/appointments/${apt.id}`, { method: 'PUT', body: { status: 'refused' } });
    if (res.success) {
      if (res.declined_offer) {
        toast.add({
          title: 'Proposition retirée',
          description: 'Le rendez-vous reste en attente pour le patient.',
          color: 'neutral',
        });
      } else {
        toast.add({ title: 'Rendez-vous refusé', color: 'warning' });
      }
      listRefreshTrigger.value++;
      await fetchAppointments(true);
    }
  } catch (err: any) {
    toast.add({ title: 'Erreur', description: err?.message || 'Impossible de refuser', color: 'red' });
  } finally {
    delete processingOfferAction[termsKey];
  }
}

watch([dateFilter, statusFilter, dateRangeStart, dateRangeEnd], () => {
  currentPage.value = 1;
  fetchAppointments();
});

watch([nurseListTab, nurseSegment], () => {
  if (props.basePath !== '/nurse') return;
  currentPage.value = 1;
  syncNurseQueryToUrl();
  fetchAppointments();
});

watch(currentPage, () => {
  fetchAppointments();
  if (typeof window !== 'undefined') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

function canStart(appointment: any) {
  const now = new Date();
  const scheduled = new Date(appointment.scheduled_at);
  const diffMinutes = (scheduled.getTime() - now.getTime()) / (1000 * 60);
  return diffMinutes <= 30 && appointment.status === 'confirmed';
}

/** Pour nurse, lab, subaccount : masquer les données sensibles pour les offres pending reçues (pas si le viewer est le créateur). */
function shouldMaskSensitive(apt: any): boolean {
  return shouldPollList.value && isPendingIncomingOffer(apt, user.value?.id);
}

function maskString(val: string, visibleStart = 1, visibleEnd = 0): string {
  if (!val || typeof val !== 'string') return '••••••';
  const s = val.trim();
  if (s.length <= visibleStart + visibleEnd) return '••••••';
  const start = s.slice(0, visibleStart);
  const end = visibleEnd > 0 ? s.slice(-visibleEnd) : '';
  const mid = '•'.repeat(Math.min(6, s.length - visibleStart - visibleEnd));
  return start + mid + end;
}

function maskEmail(email: string): string {
  if (!email || typeof email !== 'string') return '••••••@••••••';
  const at = email.indexOf('@');
  if (at <= 0) return '••••••@••••••';
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const localMasked = local.length > 2 ? local.slice(0, 2) + '•••' : '•••';
  const dot = domain.lastIndexOf('.');
  const domainMasked = dot > 0 ? '••••••' + domain.slice(dot) : '••••••';
  return localMasked + '@' + domainMasked;
}

function maskPhone(phone: string): string {
  if (!phone || typeof phone !== 'string') return '••••••••••';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '••••••••••';
  return digits.slice(0, 2) + '••••••' + digits.slice(-2);
}

function displayPatientName(apt: any): string {
  if (!apt?.form_data) return '—';
  if (shouldMaskSensitive(apt)) {
    const fn = maskString(apt.form_data.first_name || '', 1, 0);
    const ln = maskString(apt.form_data.last_name || '', 1, 0);
    return `${fn} ${ln}`.trim() || '••••••';
  }
  return [apt.form_data.first_name, apt.form_data.last_name].filter(Boolean).join(' ').trim() || '—';
}

function displayPhone(apt: any): string {
  if (!apt?.form_data?.phone) return '';
  return shouldMaskSensitive(apt) ? maskPhone(apt.form_data.phone) : apt.form_data.phone;
}

function displayAddress(apt: any): string {
  return appointmentListAddressLine(apt);
}

function displayNotes(apt: any): string {
  if (!apt?.notes) return '';
  return shouldMaskSensitive(apt) ? '' : apt.notes;
}

function isOfferProcessing(id: string, action: 'accept' | 'refuse'): boolean {
  return processingOfferAction[id] === action;
}

function isProcessing(id: string) {
  return processingOfferAction[id] !== undefined;
}

defineExpose({
  fetchAppointments,
  processingAppointments,
  canStart,
  isProcessing,
  loading,
});

watch(() => props.userIdFilter, () => {
  currentPage.value = 1;
  fetchAppointments();
});

/** Recherche = filtre client sur la page courante ; si on n’est pas en page 1, revenir à la page 1 (déclenche le fetch). */
watch(searchQuery, () => {
  if (currentPage.value !== 1) {
    currentPage.value = 1;
  }
});

onMounted(() => {
  fetchAppointments();
  if (shouldPollList.value) startListPolling();
});

onActivated(() => {
  fetchAppointments();
});
</script>
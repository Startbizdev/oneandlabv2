<template>
  <NuxtLayout :name="user?.role === 'patient' ? 'patient' : 'dashboard'">
    <div class="space-y-6">
    <TitleDashboard
      :title="profilePageTitle"
      :description="profilePageDescription"
    >
      <template #actions>
        <div class="flex items-center gap-2">
          <UButton
            v-if="(editingUserId || newPreleveurMode || newUserMode) && user?.role === 'super_admin'"
            variant="ghost"
            size="sm"
            to="/admin/users"
            icon="i-lucide-arrow-left"
          >
            Retour aux utilisateurs
          </UButton>
          <UButton
            v-else-if="(newPatientMode || (editingUserId && user?.role === 'pro'))"
            variant="ghost"
            size="sm"
            to="/pro/patients"
            icon="i-lucide-arrow-left"
          >
            Retour aux patients
          </UButton>
          <UButton
            v-else-if="editingUserId || newPreleveurMode"
            variant="ghost"
            size="sm"
            :to="role === 'subaccount' ? '/lab/subaccounts' : '/lab/preleveurs'"
            icon="i-lucide-arrow-left"
          >
            {{ role === 'subaccount' ? 'Retour aux sous-comptes' : 'Retour aux préleveurs' }}
          </UButton>
          <UButton
            v-if="publicProfileForm.public_slug && !newPreleveurMode && !newUserMode && !loading"
            :to="publicProfileUrl"
            target="_blank"
            variant="outline"
            size="sm"
            icon="i-lucide-external-link"
          >
            Voir mon profil public
          </UButton>
        </div>
      </template>
    </TitleDashboard>

      <ClientOnly>
        <template #fallback>
          <div class="flex flex-col items-center justify-center py-16 sm:py-24">
            <UIcon name="i-lucide-loader-2" class="w-10 h-10 animate-spin text-primary mb-4" />
            <p class="text-sm text-gray-500 dark:text-gray-400">Chargement de votre profil...</p>
          </div>
        </template>
        <div>
      <!-- Chargement -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-16 sm:py-24">
        <UIcon name="i-lucide-loader-2" class="w-10 h-10 animate-spin text-primary mb-4" />
        <p class="text-sm text-gray-500 dark:text-gray-400">Chargement de votre profil...</p>
      </div>

      <!-- Admin : création d'un utilisateur (même page profil réutilisable) -->
      <div v-else-if="newUserMode" class="max-w-2xl space-y-6">
        <UCard>
          <UForm id="admin-create-user-form" @submit.prevent="saveProfile()" class="space-y-6">
            <UFormField label="Rôle" required>
              <USelect
                v-model="adminCreateRole"
                :items="adminCreateRoleOptions"
                value-key="value"
                placeholder="Choisir un rôle"
                size="md"
                class="w-full"
              />
            </UFormField>
            <ProfilePersonalInfo
              ref="personalInfoRef"
              v-model="profileForm"
              :role="adminCreateRole"
              :no-actions="true"
              :email-readonly="false"
              @save="saveProfile()"
              @reset="() => {}"
            />
            <template v-if="adminCreateRole === 'subaccount' || adminCreateRole === 'preleveur'">
              <UFormField label="Laboratoire rattaché">
                <UInput
                  v-model="adminLabSearchQuery"
                  placeholder="Rechercher un laboratoire..."
                  size="md"
                  class="w-full"
                  autocomplete="off"
                />
                <div v-if="adminLabSearchQuery.length >= 1" class="mt-2 border border-default rounded-lg max-h-48 overflow-y-auto">
                  <button
                    v-for="lab in adminFilteredLabs"
                    :key="lab.id"
                    type="button"
                    class="w-full px-4 py-2 text-left hover:bg-muted/50 flex items-center justify-between"
                    @click="adminSelectLab(lab)"
                  >
                    <span>{{ lab.company_name || lab.email || lab.id }}</span>
                    <span v-if="adminLabId === lab.id" class="text-primary">✓</span>
                  </button>
                  <p v-if="adminFilteredLabs.length === 0" class="px-4 py-2 text-sm text-muted">Aucun laboratoire trouvé</p>
                </div>
                <p v-if="adminLabId && adminSelectedLabLabel" class="mt-1 text-sm text-muted">{{ adminSelectedLabLabel }}</p>
              </UFormField>
            </template>
            <template v-if="adminCreateRole === 'nurse'">
              <UFormField label="Adeli">
                <UInput v-model="adminAdeli" placeholder="139012345" size="md" class="w-full" />
              </UFormField>
            </template>
            <template v-if="adminCreateRole === 'nurse' || adminCreateRole === 'lab'">
              <UFormField label="Types de soins proposés">
                <UInput v-model="adminCareTypesSearch" placeholder="Rechercher un type de soin..." size="md" class="w-full mb-2" />
                <div class="border border-default rounded-lg divide-y divide-default max-h-48 overflow-y-auto">
                  <label
                    v-for="cat in adminFilteredCareCategories"
                    :key="cat.id"
                    class="flex items-center justify-between gap-3 px-4 py-2 hover:bg-muted/30 cursor-pointer"
                  >
                    <span class="text-sm">{{ cat.name }}</span>
                    <USwitch v-model="adminCarePreferencesMap[cat.id]" />
                  </label>
                </div>
              </UFormField>
            </template>
            <div class="flex justify-end gap-2 pt-4">
              <UButton variant="ghost" to="/admin/users">Annuler</UButton>
              <UButton type="submit" form="admin-create-user-form" color="primary" :loading="saving" :disabled="!adminCanSubmitCreate">
                Créer l'utilisateur
              </UButton>
            </div>
          </UForm>
        </UCard>
      </div>

      <!-- Pro : création d'un patient (POST /patients) — colonne gauche formulaire, droite documents + bouton -->
      <div v-else-if="newPatientMode" class="w-full space-y-6">
        <div class="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 lg:gap-8">
          <!-- Colonne gauche : formulaire (sans bouton) -->
          <UCard>
            <UForm id="pro-create-patient-form" :state="profileForm" @submit.prevent="saveProfile()" class="space-y-6">
              <ProfilePersonalInfo
                ref="personalInfoRef"
                v-model="profileForm"
                role="patient"
                :no-actions="true"
                :email-readonly="false"
                @save="saveProfile()"
                @reset="() => {}"
              />
              <div class="flex justify-end gap-2 pt-4">
                <UButton variant="ghost" to="/pro/patients">Annuler</UButton>
              </div>
            </UForm>
          </UCard>
          <!-- Colonne droite : documents médicaux (ajoutables à la création) + bouton en dessous -->
          <div class="space-y-6 lg:sticky lg:top-6 h-fit min-w-0 overflow-hidden">
            <ProfileDocuments
              :documents="documents"
              :is-loading="loadingDocuments"
              :uploading-type="uploadingDocument"
              :error="documentError"
              @upload="handleDocumentUpload"
              @download="(id, fileName) => downloadDocument(id, fileName)"
              @update:error="documentError = $event"
            />
            <div class="pt-2 flex flex-col gap-2">
              <UButton
                form="pro-create-patient-form"
                type="submit"
                size="xl"
                color="primary"
                icon="i-lucide-user-plus"
                :loading="saving"
                :disabled="!proCanSubmitCreatePatient"
                class="font-medium text-base py-4 w-full justify-center"
              >
                Créer le patient
              </UButton>
            </div>
          </div>
        </div>
      </div>

      <template v-else>
        <!-- Grille : 100 % pour pro (propre profil), sinon 65% gauche / 35% droite -->
        <div
          class="grid gap-6 lg:gap-8 grid-cols-1"
          :class="{ 'lg:grid-cols-[13fr_7fr]': !isProOwnProfile }"
        >
          <!-- Colonne principale (100 % pour pro, sinon gauche) -->
          <div class="space-y-6 lg:space-y-8 min-w-0">
            <ProfilePersonalInfo
              ref="personalInfoRef"
              v-model="profileForm"
              :role="role ?? ''"
              :no-actions="true"
              :email-readonly="!newPreleveurMode"
              @save="onSavePersonalInfo"
              @reset="resetForm"
            />

            <!-- Lab : rattacher le préleveur au lab ou à un sous-compte (création + édition) -->
            <UCard v-if="showPreleveurLabSelector" class="overflow-hidden">
              <template #header>
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-building-2" class="w-5 h-5 text-primary" />
                  <span class="font-semibold text-gray-900 dark:text-white">Rattachement</span>
                </div>
              </template>
              <UFormField label="Rattacher à">
                <USelectMenu
                  v-model="preleveurLabId"
                  :items="preleveurLabSelectItems"
                  value-key="value"
                  placeholder="Laboratoire (moi)"
                  size="md"
                  color="primary"
                  variant="soft"
                  class="w-full min-w-0"
                  :search-input="{ placeholder: 'Rechercher...' }"
                  :filter-fields="['label']"
                />
                <p class="text-xs text-muted mt-1">Le préleveur sera assigné à votre laboratoire ou à un de vos sous-comptes.</p>
              </UFormField>
            </UCard>

            <!-- Section Présentation (nurse, subaccount) : biographie + infirmier: expérience & diplômes -->
            <UCard v-if="hasPublicProfile" class="overflow-hidden">
              <template #header>
                <div class="flex items-start gap-3">
                  <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <UIcon name="i-lucide-file-text" class="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 class="text-lg font-normal">Présentation</h2>
                    <p class="text-sm text-muted mt-0.5">
                      Biographie pour votre fiche publique
                    </p>
                  </div>
                </div>
              </template>
              <UFormField label="Biographie" name="biography">
                <UTextarea
                  v-model="publicProfileForm.biography"
                  :rows="4"
                  :placeholder="isSubaccount ? 'Présentez votre laboratoire...' : 'Présentez-vous en quelques lignes...'"
                  :disabled="saving"
                  class="w-full"
                />
              </UFormField>
              <template v-if="isNurse">
                <UFormField label="Années d'expérience" name="years_experience" class="mt-4">
                  <USelect
                    v-model="publicProfileForm.years_experience"
                    :items="YEARS_EXPERIENCE_OPTIONS"
                    value-key="value"
                    placeholder="Sélectionnez"
                    :disabled="saving"
                    class="w-full min-w-[220px]"
                  />
                </UFormField>
                <UFormField label="Diplômes et formations" name="nurse_qualifications" class="mt-4">
                  <p class="text-xs text-muted mb-2">Sélectionnez les diplômes et formations que vous souhaitez afficher sur votre fiche publique.</p>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <label
                      v-for="q in NURSE_QUALIFICATIONS"
                      :key="q.code"
                      class="flex items-center gap-2 cursor-pointer"
                    >
                      <UCheckbox
                        :model-value="q.code === 'AUTRE' ? hasOtherQualificationChecked : (publicProfileForm.nurse_qualifications || []).includes(q.code)"
                        :disabled="saving"
                        @update:model-value="toggleNurseQualification(q.code, $event)"
                      />
                      <span class="text-sm">{{ q.label }}</span>
                    </label>
                  </div>
                  <!-- Autre formation : champs personnalisés avec bouton + -->
                  <div v-if="hasOtherQualificationChecked" class="mt-4 space-y-3 rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50/50 dark:bg-gray-800/30">
                    <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Autres formations (précisez)</p>
                    <div v-for="(_, idx) in otherFormationsList" :key="idx" class="flex gap-2">
                      <UInput
                        :model-value="otherFormationsList[idx]"
                        placeholder="Ex. Formation spécifique..."
                        :disabled="saving"
                        class="flex-1"
                        @update:model-value="setOtherFormation(idx, $event)"
                      />
                      <UButton
                        type="button"
                        color="neutral"
                        variant="ghost"
                        icon="i-lucide-trash-2"
                        :disabled="saving"
                        aria-label="Supprimer"
                        @click="removeOtherFormation(idx)"
                      />
                    </div>
                    <UButton
                      type="button"
                      variant="soft"
                      color="primary"
                      size="sm"
                      icon="i-lucide-plus"
                      :disabled="saving"
                      @click="addOtherFormation"
                    >
                      Ajouter une formation
                    </UButton>
                  </div>
                </UFormField>
              </template>
            </UCard>

            <!-- Lab / sous-compte : 4 champs (site + 3 réseaux), icônes colorées sans fond, placeholders courts -->
            <UCard v-if="(role === 'lab' || role === 'subaccount') && !newPreleveurMode" class="overflow-hidden">
              <template #header>
                <div class="flex items-start gap-3">
                  <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <UIcon name="i-lucide-globe" class="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 class="text-lg font-normal">Site web et réseaux</h2>
                    <p class="text-sm text-muted mt-0.5">
                      Affichés sur votre fiche publique
                    </p>
                  </div>
                </div>
              </template>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full min-w-0">
                <UFormField label="Site internet" name="website_url" class="w-full min-w-0">
                  <UInput
                    v-model="publicProfileForm.website_url"
                    type="url"
                    icon="i-lucide-globe"
                    placeholder="URL du site"
                    :disabled="saving"
                    class="w-full"
                  />
                </UFormField>
                <UFormField label="Facebook" name="social_facebook" class="w-full min-w-0">
                  <UInput
                    :model-value="publicProfileForm.social_links?.facebook"
                    icon="i-simple-icons-facebook"
                    placeholder="URL de la page"
                    :disabled="saving"
                    class="w-full"
                    @update:model-value="setSocialLink('facebook', $event)"
                  />
                </UFormField>
                <UFormField label="LinkedIn" name="social_linkedin" class="w-full min-w-0">
                  <UInput
                    :model-value="publicProfileForm.social_links?.linkedin"
                    icon="i-simple-icons-linkedin"
                    placeholder="URL du profil"
                    :disabled="saving"
                    class="w-full"
                    @update:model-value="setSocialLink('linkedin', $event)"
                  />
                </UFormField>
                <UFormField label="Instagram" name="social_instagram" class="w-full min-w-0">
                  <UInput
                    :model-value="publicProfileForm.social_links?.instagram"
                    icon="i-simple-icons-instagram"
                    placeholder="URL du profil"
                    :disabled="saving"
                    class="w-full"
                    @update:model-value="setSocialLink('instagram', $event)"
                  />
                </UFormField>
              </div>
            </UCard>

            <!-- Lab / sous-compte : Horaires d'ouverture (fiche publique) -->
            <UCard v-if="(role === 'lab' || role === 'subaccount') && !newPreleveurMode" class="overflow-hidden">
              <template #header>
                <div class="flex items-start gap-3">
                  <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <UIcon name="i-lucide-clock" class="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 class="text-lg font-normal">Horaires d'ouverture</h2>
                    <p class="text-sm text-muted mt-0.5">
                      Horaires affichés sur votre fiche publique
                    </p>
                  </div>
                </div>
              </template>
              <div class="space-y-3">
                <div
                  v-for="day in DAYS"
                  :key="day.key"
                  class="flex flex-wrap items-center gap-3"
                >
                  <span class="w-24 text-sm font-medium">{{ day.label }}</span>
                  <UInput
                    :model-value="publicProfileForm.opening_hours?.[day.key]?.start"
                    type="time"
                    placeholder="09:00"
                    class="w-28"
                    :disabled="saving"
                    @update:model-value="setOpeningHour(day.key, 'start', $event)"
                  />
                  <span class="text-gray-400">–</span>
                  <UInput
                    :model-value="publicProfileForm.opening_hours?.[day.key]?.end"
                    type="time"
                    placeholder="18:00"
                    class="w-28"
                    :disabled="saving"
                    @update:model-value="setOpeningHour(day.key, 'end', $event)"
                  />
                </div>
              </div>
            </UCard>

            <!-- Types de soins (nurse, lab, sous-compte) -->
            <UCard v-if="isNurse || isDisplayedProfileLab || isSubaccount" class="overflow-hidden">
          <template #header>
            <div class="flex items-start gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <UIcon name="i-lucide-heart-pulse" class="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 class="text-lg font-normal">Types de soins acceptés</h2>
                <p class="text-sm text-muted mt-0.5">
                  Activez ou désactivez les types de soins que vous acceptez
                </p>
              </div>
            </div>
          </template>

          <div v-if="loadingCategories" class="text-center py-12">
            <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto text-primary-500" />
            <p class="text-sm text-gray-500 mt-3">Chargement des catégories...</p>
          </div>

          <UEmpty
            v-else-if="categoryPreferences.length === 0"
            icon="i-lucide-alert-circle"
            title="Aucune catégorie disponible"
            description="Aucune catégorie de soins n'est actuellement disponible."
            variant="naked"
          />

          <div v-else>
            <p v-if="isNurseOnDiscovery && (categoryPreferences.filter((p: any) => p.is_enabled).length) >= (planLimits?.max_care_types ?? 3)" class="mb-3 text-sm text-amber-600 dark:text-amber-400">
              <UIcon name="i-lucide-info" class="w-4 h-4 inline-block align-middle mr-1.5 shrink-0" aria-hidden="true" />
              Offre Découverte : limite de {{ planLimits?.max_care_types ?? 3 }} types de soins. <NuxtLink to="/nurse/abonnement" class="underline font-medium">Passez en Pro</NuxtLink> pour en proposer davantage.
            </p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              v-for="pref in categoryPreferences"
              :key="pref.category_id"
              type="button"
              :disabled="updatingCategories.has(pref.category_id)"
              :class="[
                'group relative flex items-center gap-4 p-4 rounded-2xl border text-left transition-all duration-200',
                pref.is_enabled
                  ? 'bg-primary-50/50 dark:bg-primary-950/20 border-primary-200 dark:border-primary-800 shadow-sm'
                  : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              ]"
              @click="updateCategoryPreference(pref.category_id, !pref.is_enabled)"
            >
              <div
                :class="[
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors',
                  pref.is_enabled
                    ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                ]"
              >
                <UIcon
                  :name="careCategoryIconName(pref.icon)"
                  class="h-6 w-6"
                />
              </div>
              <div class="min-w-0 flex-1">
                <h3 class="font-normal text-gray-900 dark:text-white line-clamp-1">
                  {{ pref.name }}
                </h3>
                <p v-if="pref.description" class="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
                  {{ pref.description }}
                </p>
              </div>
              <USwitch
                :model-value="pref.is_enabled"
                @update:model-value="updateCategoryPreference(pref.category_id, $event)"
                @click.stop
                :loading="updatingCategories.has(pref.category_id)"
                :disabled="updatingCategories.has(pref.category_id)"
                size="md"
                class="flex-shrink-0"
              />
            </button>
            </div>
          </div>
            </UCard>

            <!-- Historique RDV (lab, subaccount, nurse, préleveur ; pas patient) -->
            <UCard v-if="hasAppointmentsSection" class="overflow-hidden">
              <template #header>
                <CardHeader
                  icon="i-lucide-calendar-days"
                  title="Historique des rendez-vous"
                  description="RDV assignés ou pris par ce profil"
                />
              </template>
              <div class="px-4 pb-4">
                <div v-if="loadingAppointments" class="flex justify-center py-6">
                  <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin text-primary" />
                </div>
                <div v-else-if="profileAppointments.length === 0" class="py-5 text-center text-sm text-muted">
                  Aucun rendez-vous
                </div>
                <ul v-else class="divide-y divide-default/40">
                  <li
                    v-for="apt in profileAppointments"
                    :key="apt.id"
                    class="group flex items-center gap-2 py-2.5 first:pt-0"
                  >
                    <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <UIcon
                        :name="apt.type === 'blood_test' ? 'i-lucide-droplets' : 'i-lucide-stethoscope'"
                        class="h-4 w-4 text-primary"
                      />
                    </div>
                    <NuxtLink
                      :to="`${appointmentDetailBasePath}/${apt.id}`"
                      class="min-w-0 flex-1 rounded-md outline-none ring-primary/50 focus-visible:ring-2"
                    >
                      <p class="text-sm font-medium text-foreground truncate group-hover:text-primary">
                        {{ apt.type === 'blood_test' ? 'Prise de sang' : apt.category_name || 'Soins' }}
                      </p>
                      <p class="text-xs text-muted truncate">
                        {{ formatAppointmentDateShort(apt.scheduled_at) }} · {{ getCreneauHoraireLabel(apt) }}
                      </p>
                    </NuxtLink>
                    <UBadge
                      v-if="apt.status"
                      :color="getAppointmentStatusColor(apt.status)"
                      variant="subtle"
                      size="xs"
                      class="shrink-0"
                    >
                      {{ getAppointmentStatusLabel(apt.status) }}
                    </UBadge>
                    <UButton
                      size="xs"
                      variant="ghost"
                      color="neutral"
                      icon="i-lucide-chevron-right"
                      :to="`${appointmentDetailBasePath}/${apt.id}`"
                      aria-label="Voir le rendez-vous"
                      class="shrink-0 -mr-1"
                    />
                  </li>
                </ul>
                <div v-if="profileAppointments.length > 0" class="pt-3 mt-1 border-t border-default/40">
                  <NuxtLink
                    :to="appointmentListPath"
                    class="flex items-center justify-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <UIcon name="i-lucide-list" class="h-4 w-4" />
                    Voir tous les rendez-vous
                  </NuxtLink>
                </div>
              </div>
            </UCard>

            <!-- Section Paramètres (en bas de la colonne gauche) -->
            <UCard v-if="hasSettingsCard" class="overflow-hidden">
              <template #header>
                <div class="flex items-start gap-2">
                  <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <UIcon name="i-lucide-settings" class="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h2 class="text-base font-medium text-gray-900 dark:text-white">Paramètres</h2>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Visibilité et rendez-vous
                    </p>
                  </div>
                </div>
              </template>
              <div class="space-y-4">
                <!-- Toggle Profil public -->
                <div class="rounded-lg border border-gray-200 dark:border-gray-700 p-3 transition-colors" :class="publicProfileForm.is_public_profile_enabled ? 'bg-primary-50/50 dark:bg-primary-900/10 border-primary-200 dark:border-primary-800' : 'bg-gray-50/50 dark:bg-gray-800/30'">
                  <div class="flex items-center justify-between gap-3">
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-2">
                        <span class="text-sm font-medium text-gray-900 dark:text-white">Profil public</span>
                        <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium" :class="publicProfileForm.is_public_profile_enabled ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-400'">{{ publicProfileForm.is_public_profile_enabled ? 'Activé' : 'Désactivé' }}</span>
                      </div>
                      <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{{ publicProfileForm.is_public_profile_enabled ? 'Fiche visible sur OneAndLab.' : "Fiche non visible." }}</p>
                    </div>
                    <USwitch :model-value="publicProfileForm.is_public_profile_enabled" class="shrink-0" :disabled="savingPublicProfile" @update:model-value="onPublicProfileToggle($event)" />
                  </div>
                </div>

                <!-- Toggle Je prends des rendez-vous -->
                <div v-if="isNurse || isSubaccount || (isDisplayedProfileLab && !newPreleveurMode)" class="rounded-lg border border-gray-200 dark:border-gray-700 p-3 transition-colors" :class="isAcceptingAppointments ? 'bg-primary-50/50 dark:bg-primary-900/10 border-primary-200 dark:border-primary-800' : 'bg-gray-50/50 dark:bg-gray-800/30'">
                  <div class="flex items-center justify-between gap-3">
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-2">
                        <span class="text-sm font-medium text-gray-900 dark:text-white">Je prends des rendez-vous</span>
                        <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium" :class="isAcceptingAppointments ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-400'">{{ isAcceptingAppointments ? 'Activé' : 'Désactivé' }}</span>
                      </div>
                      <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{{ isAcceptingAppointments ? 'Demandes de créneaux acceptées.' : "Pas de nouveaux RDV." }}</p>
                    </div>
                    <USwitch :model-value="isAcceptingAppointments" class="shrink-0" :disabled="savingAccepting" @update:model-value="onAcceptingToggle($event)" />
                  </div>
                </div>

                <!-- Toggle RDV le samedi (lab, subaccount) - même design que les autres -->
                <div v-if="(isDisplayedProfileLab || isSubaccount) && !newPreleveurMode" class="rounded-lg border border-gray-200 dark:border-gray-700 p-3 transition-colors" :class="acceptRdvSaturday ? 'bg-primary-50/50 dark:bg-primary-900/10 border-primary-200 dark:border-primary-800' : 'bg-gray-50/50 dark:bg-gray-800/30'">
                  <div class="flex items-center justify-between gap-3">
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-2">
                        <span class="text-sm font-medium text-gray-900 dark:text-white">RDV le samedi</span>
                        <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium" :class="acceptRdvSaturday ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-400'">{{ acceptRdvSaturday ? 'Activé' : 'Désactivé' }}</span>
                      </div>
                      <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Les patients pourront choisir un samedi depuis votre fiche ou les demandes envoyées à tous les labs.</p>
                    </div>
                    <USwitch v-model="acceptRdvSaturday" class="shrink-0" />
                  </div>
                </div>

                <!-- Toggle RDV le dimanche (lab, subaccount) - même design que les autres -->
                <div v-if="(isDisplayedProfileLab || isSubaccount) && !newPreleveurMode" class="rounded-lg border border-gray-200 dark:border-gray-700 p-3 transition-colors" :class="acceptRdvSunday ? 'bg-primary-50/50 dark:bg-primary-900/10 border-primary-200 dark:border-primary-800' : 'bg-gray-50/50 dark:bg-gray-800/30'">
                  <div class="flex items-center justify-between gap-3">
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-2">
                        <span class="text-sm font-medium text-gray-900 dark:text-white">RDV le dimanche</span>
                        <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium" :class="acceptRdvSunday ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-400'">{{ acceptRdvSunday ? 'Activé' : 'Désactivé' }}</span>
                      </div>
                      <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Les patients pourront choisir un dimanche depuis votre fiche ou les demandes envoyées à tous les labs.</p>
                    </div>
                    <USwitch v-model="acceptRdvSunday" class="shrink-0" />
                  </div>
                </div>

                <!-- Délai minimum (lab, subaccount) -->
                <div v-if="(isDisplayedProfileLab || isSubaccount) && !newPreleveurMode" class="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                  <p class="text-sm font-medium text-gray-900 dark:text-white">Délai minimum de réservation</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Date min. pour votre fiche et pour les demandes « à tous ».</p>
                  <div class="flex flex-wrap gap-1.5 mt-2">
                    <button
                      v-for="opt in MIN_LEAD_TIME_OPTIONS"
                      :key="opt.value"
                      type="button"
                      :class="['flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors', minBookingLeadTimeHours === opt.value ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 dark:border-primary-500' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600']"
                      @click="minBookingLeadTimeHours = opt.value"
                    >
                      <UIcon v-if="minBookingLeadTimeHours === opt.value" name="i-lucide-check" class="w-3.5 h-3.5 shrink-0" />
                      <span>{{ opt.label }}</span>
                    </button>
                  </div>
                </div>
              </div>
            </UCard>

            <!-- Pro (propre profil) : bouton Enregistrer en bas de la colonne unique -->
            <div v-if="isProOwnProfile" class="pt-4 w-full flex justify-end">
              <UButton
                size="xl"
                color="primary"
                icon="i-lucide-save"
                :loading="saving"
                class="font-medium text-base py-4 rounded-xl min-w-[200px]"
                @click="saveAll"
              >
                Enregistrer mon profil
              </UButton>
            </div>
          </div>

          <!-- Colonne droite (35%) : documents patient (pro ou patient), modération (admin), photo, carte, bouton Enregistrer (masquée pour pro propre) -->
          <div v-if="!isProOwnProfile" class="space-y-6 lg:space-y-6 lg:sticky lg:top-6 min-w-0 overflow-hidden flex flex-col">
            <!-- Patient (propre profil) : documents médicaux en colonne droite -->
            <ProfileDocuments
              v-if="isPatient && !editingUserId"
              :documents="documents"
              :is-loading="loadingDocuments"
              :uploading-type="uploadingDocument"
              :error="documentError"
              @upload="handleDocumentUpload"
              @download="(id, fileName) => downloadDocument(id, fileName)"
              @update:error="documentError = $event"
            />
            <!-- Pro édition patient : documents médicaux + bouton Enregistrer en dessous -->
            <template v-if="isProEditingPatient">
              <ProfileDocuments
                :documents="documents"
                :is-loading="loadingDocuments"
                :uploading-type="uploadingDocument"
                :error="documentError"
                @upload="handleDocumentUpload"
                @download="(id, fileName) => downloadDocument(id, fileName)"
                @update:error="documentError = $event"
              />
              <div class="pt-2 w-full flex-shrink-0">
                <UButton
                  size="xl"
                  color="primary"
                  icon="i-lucide-save"
                  :loading="saving"
                  class="w-full justify-center font-medium text-base py-4 rounded-xl"
                  @click="saveAll"
                >
                  Enregistrer
                </UButton>
              </div>
            </template>
            <template v-else>
            <!-- Admin : Modération (colonne de droite, boutons empilés) -->
            <UCard v-if="isAdmin && editingUserId" class="overflow-hidden">
              <template #header>
                <CardHeader
                  icon="i-lucide-shield"
                  title="Modération"
                  description="Statut et actions"
                />
              </template>
              <div class="space-y-4">
                <div class="flex items-center gap-2">
                  <span class="text-sm text-muted">Statut</span>
                  <UBadge
                    v-if="adminEditedUser?.banned_until && new Date(adminEditedUser.banned_until) > new Date('9999-12-30')"
                    color="error"
                    variant="soft"
                    size="sm"
                  >
                    Banni
                  </UBadge>
                  <UBadge
                    v-else-if="adminEditedUser && adminIsSuspended(adminEditedUser)"
                    color="warning"
                    variant="soft"
                    size="sm"
                  >
                    Suspendu
                  </UBadge>
                  <UBadge v-else color="success" variant="soft" size="sm">
                    Actif
                  </UBadge>
                </div>
                <p class="text-sm text-muted">
                  Incidents : {{ adminIncidents.length }}
                  <span v-if="adminEditedUser?.last_incident_at"> · Dernier : {{ formatDateShort(adminEditedUser.last_incident_at) }}</span>
                </p>
                <div v-if="adminIncidents.length > 0" class="space-y-2 max-h-40 overflow-y-auto rounded-lg border border-default/50 p-3 bg-muted/10">
                  <div
                    v-for="incident in adminIncidents"
                    :key="incident.id"
                    class="p-2 rounded-md border border-default/30 bg-default text-sm"
                  >
                    <div class="font-medium text-foreground">{{ adminGetIncidentLabel(incident.action) }}</div>
                    <div class="text-muted text-xs mt-0.5">{{ formatDateShort(incident.created_at) }}</div>
                    <div v-if="incident.details?.reason" class="text-muted text-xs mt-0.5">Raison : {{ incident.details.reason }}</div>
                  </div>
                </div>
                <div class="flex flex-col gap-2">
                  <template v-if="adminEditedUser?.banned_until && new Date(adminEditedUser.banned_until) > new Date()">
                    <UButton block variant="outline" color="primary" size="md" :loading="adminModerationLoading" @click="adminUnbanUser">
                      Débannir
                    </UButton>
                  </template>
                  <template v-else>
                    <UButton block variant="outline" color="warning" size="md" :loading="adminModerationLoading" @click="adminSuspendUser(7)">
                      Suspendre 7 jours
                    </UButton>
                    <UButton block variant="outline" color="error" size="md" :loading="adminModerationLoading" @click="adminBanUser">
                      Bannir
                    </UButton>
                  </template>
                  <UButton block variant="outline" color="error" size="md" :loading="adminModerationLoading" @click="adminDeleteUser">
                    Supprimer l'utilisateur
                  </UButton>
                </div>
              </div>
            </UCard>

            <!-- Photo (+ couverture pour nurse/subaccount ; préleveur : photo uniquement) -->
            <UCard v-if="hasProfilePhotoCard" class="overflow-hidden">
              <template #header>
                <CardHeader
                  icon="i-lucide-image"
                  :title="isPreleveur ? 'Photo de profil' : 'Photo de profil'"
                  :description="isPreleveur ? 'Votre photo pour votre compte' : 'Image de couverture pour votre fiche publique'"
                />
              </template>
              <ProfileImagesBlock
                v-model:profile-image="publicProfileForm.profile_image_url"
                v-model:cover-image="publicProfileForm.cover_image_url"
                :profile-label="isSubaccount ? 'Logo' : 'Photo de profil'"
                :profile-icon="isSubaccount ? 'i-lucide-building-2' : 'i-lucide-user'"
                :show-cover="!isPreleveur"
              />
            </UCard>

            <!-- Mini carte + Rayon (nurse, lab, subaccount) -->
            <UCard v-if="hasCoverageZone" class="overflow-hidden">
              <template #header>
                <CardHeader
                  icon="i-lucide-map-pin"
                  title="Zone de couverture"
                  description="Rayon d'intervention autour de votre adresse (en km)"
                />
              </template>
              <template v-if="!hasValidAddress">
                <UAlert
                  color="amber"
                  variant="soft"
                  icon="i-lucide-alert-circle"
                  title="Adresse requise"
                  description="Définissez votre adresse dans la colonne de gauche."
                  class="rounded-lg"
                />
              </template>
              <template v-else>
                <div class="space-y-4">
                  <ClientOnly>
                    <ProfileCoverageMapLive
                      v-if="profileForm.address?.lat != null && profileForm.address?.lng != null"
                      :lat="Number(profileForm.address.lat)"
                      :lng="Number(profileForm.address.lng)"
                      :radius-km="coverageRadius"
                      class="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 min-h-[180px]"
                    />
                    <div
                      v-else
                      class="w-full min-h-[180px] rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 flex items-center justify-center"
                    >
                      <p class="text-xs text-gray-500">Carte après adresse</p>
                    </div>
                    <template #fallback>
                      <div class="w-full min-h-[180px] rounded-lg bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center">
                        <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin text-primary" />
                      </div>
                    </template>
                  </ClientOnly>
                    <div>
                    <div class="flex items-center justify-between mb-1">
                      <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Rayon</span>
                      <span class="text-lg font-semibold tabular-nums text-primary">{{ coverageRadius }} km</span>
                    </div>
                    <USlider
                      :model-value="coverageRadius"
                      @update:model-value="(v: number) => (coverageRadius = Math.min(v, maxRadiusKm))"
                      :min="5"
                      :max="maxRadiusKm"
                      :step="5"
                      class="w-full"
                    />
                    <p v-if="isNurseOnDiscovery && maxRadiusKm <= 20" class="mt-2 text-sm text-amber-600 dark:text-amber-400">
                      <UIcon name="i-lucide-info" class="w-4 h-4 inline-block align-middle mr-1.5 shrink-0" aria-hidden="true" />
                      Offre Découverte : rayon limité à 20 km. <NuxtLink to="/nurse/abonnement" class="underline font-medium">Passez en Pro</NuxtLink> pour étendre jusqu'à 100 km.
                    </p>
                  </div>
                </div>
              </template>
            </UCard>

            <!-- Bouton Enregistrer mon profil (en bas de la colonne droite, pleine largeur) -->
            <div class="pt-2 w-full flex-shrink-0">
              <UButton
                size="xl"
                color="primary"
                icon="i-lucide-save"
                :loading="saving"
                class="w-full justify-center font-medium text-base py-4 rounded-xl"
                @click="saveAll"
              >
                Enregistrer mon profil
              </UButton>
            </div>
            </template>
          </div>
        </div>
      </template>

        </div>
      </ClientOnly>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { nextTick } from 'vue'
import { apiFetch } from '~/utils/api'

definePageMeta({
  layout: false,
  middleware: ['auth'],
})

useHead({ title: 'Mon profil' })

const route = useRoute()
const { user, fetchCurrentUser } = useAuth()
const toast = useAppToast()

// Lab édite le profil d'un préleveur : ?userId=xxx
const editingUserId = ref<string | null>(null)
const editedUserRole = ref<string | null>(null)
// Lab crée un préleveur : ?newPreleveur=1 → formulaire vierge, sauvegarde = POST /lab/preleveurs
const newPreleveurMode = ref(false)
const labSubaccountsForPreleveur = ref<any[]>([])
const preleveurLabId = ref('')
// Admin crée un utilisateur : ?newUser=1 → formulaire vierge, sauvegarde = POST /users
const newUserMode = ref(false)
// Pro crée un patient : ?newPatient=1 → formulaire vierge, sauvegarde = POST /patients
const newPatientMode = ref(false)
const adminCreateRole = ref('patient')
const effectiveUserId = computed(() => editingUserId.value || user.value?.id || '')
const effectiveRole = computed(() => {
  if (newPreleveurMode.value) return 'preleveur'
  if (newUserMode.value) return adminCreateRole.value
  if (newPatientMode.value) return 'patient'
  return (editingUserId.value ? editedUserRole.value : user.value?.role) ?? ''
})
const proCanSubmitCreatePatient = computed(() => {
  const f = profileForm.value
  return !!(f.email?.trim() && f.first_name?.trim() && f.last_name?.trim() && f.phone?.trim())
})
const profilePageTitle = computed(() => {
  if (newUserMode.value) return 'Créer un utilisateur'
  if (newPatientMode.value) return 'Créer un patient'
  if (newPreleveurMode.value) return 'Créer un préleveur'
  if (editingUserId.value && user.value?.role === 'super_admin') return 'Profil utilisateur'
  if (editingUserId.value && user.value?.role === 'pro') return 'Profil du patient'
  if (editingUserId.value && effectiveRole.value === 'subaccount') return 'Profil du sous-compte'
  if (editingUserId.value) return 'Profil du préleveur'
  return 'Mon profil'
})
const profilePageDescription = computed(() => {
  if (newUserMode.value) return 'Renseignez les informations du nouvel utilisateur selon le rôle.'
  if (newPatientMode.value) return 'Renseignez les informations du nouveau patient.'
  if (newPreleveurMode.value) return 'Renseignez les informations du nouveau préleveur.'
  if (editingUserId.value && user.value?.role === 'super_admin') return 'Consultez et modifiez les informations de cet utilisateur.'
  if (editingUserId.value && user.value?.role === 'pro') return 'Consultez et modifiez les informations de ce patient.'
  if (editingUserId.value && effectiveRole.value === 'subaccount') return 'Consultez et modifiez les informations de ce sous-compte.'
  if (editingUserId.value) return 'Consultez et modifiez les informations de ce préleveur'
  return 'Consultez et modifiez vos informations personnelles'
})

// Synchroniser la photo de profil avec l'avatar du header (layout dashboard)
const profileImageForHeader = useState<string | null>('profileImageForHeader', () => null)

const personalInfoRef = ref<InstanceType<typeof ProfilePersonalInfo> | null>(null)

// -- Helpers rôle (effective = rôle du profil affiché, ex. préleveur quand lab édite un préleveur) --
const role = computed(() => effectiveRole.value)
const isPatient = computed(() => role.value === 'patient')
const isNurse = computed(() => role.value === 'nurse')
const isLab = computed(() => user.value?.role === 'lab')
const isSubaccount = computed(() => role.value === 'subaccount')
const isAdmin = computed(() => user.value?.role === 'super_admin')
const isPreleveur = computed(() => role.value === 'preleveur')

// Admin création utilisateur
const adminCreateRoleOptions = [
  { label: 'Patient', value: 'patient' },
  { label: 'Professionnel', value: 'pro' },
  { label: 'Infirmier', value: 'nurse' },
  { label: 'Laboratoire', value: 'lab' },
  { label: 'Sous-compte', value: 'subaccount' },
  { label: 'Préleveur', value: 'preleveur' },
  { label: 'Super Admin', value: 'super_admin' },
]
const adminLabs = ref<any[]>([])
const adminLabSearchQuery = ref('')
const adminLabId = ref('')
const adminAdeli = ref('')
const adminCareCategories = ref<any[]>([])
const adminCarePreferencesMap = ref<Record<string, boolean>>({})
const adminCareTypesSearch = ref('')
const adminIsEntityRole = (r: string) => r === 'lab' || r === 'subaccount'
const adminIsLabLinkedRole = (r: string) => r === 'subaccount' || r === 'preleveur'
const adminFilteredLabs = computed(() => {
  const q = adminLabSearchQuery.value.toLowerCase().trim()
  if (!q) return adminLabs.value.slice(0, 20)
  return adminLabs.value.filter(
    (l) =>
      (l.company_name && l.company_name.toLowerCase().includes(q)) ||
      (l.email && l.email.toLowerCase().includes(q))
  ).slice(0, 20)
})
const adminSelectedLabLabel = computed(() => {
  if (!adminLabId.value) return ''
  const lab = adminLabs.value.find((l) => l.id === adminLabId.value)
  return lab ? (lab.company_name || lab.email || lab.id) : ''
})

const preleveurLabSelectItems = computed(() => {
  const items: { value: string; label: string }[] = []
  const myId = user.value?.id ?? ''
  if (!myId) return items
  items.push({ value: myId, label: 'Laboratoire (moi)' })
  for (const s of labSubaccountsForPreleveur.value) {
    const id = s?.id ?? s?.user_id ?? ''
    if (!id) continue
    const name = (s.company_name && String(s.company_name).trim()) || [s.first_name, s.last_name].filter(Boolean).join(' ').trim() || s.email || id
    items.push({ value: String(id), label: `Sous-compte : ${name}` })
  }
  return items
})

const showPreleveurLabSelector = computed(() => {
  return user.value?.role === 'lab' && ((newPreleveurMode.value || (editingUserId.value && role.value === 'preleveur')))
})
const adminFilteredCareCategories = computed(() => {
  const q = adminCareTypesSearch.value.toLowerCase().trim()
  if (!q) return adminCareCategories.value
  return adminCareCategories.value.filter(
    (c) => (c.name && c.name.toLowerCase().includes(q)) || (c.description && c.description.toLowerCase().includes(q))
  )
})
const adminCanSubmitCreate = computed(() => {
  if (!profileForm.value.email?.trim() || !adminCreateRole.value) return false
  if (adminIsEntityRole(adminCreateRole.value)) return !!profileForm.value.name?.trim()
  return !!profileForm.value.first_name?.trim() && !!profileForm.value.last_name?.trim()
})
function adminSelectLab(lab: any) {
  adminLabId.value = lab.id
}

// Admin modération (voir/éditer un utilisateur)
const adminEditedUser = ref<any>(null)
const adminIncidents = ref<any[]>([])
const adminModerationLoading = ref(false)
const formatDateShort = (date: string) => new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
const adminIsSuspended = (u: any) => u?.banned_until && new Date(u.banned_until) > new Date() && new Date(u.banned_until) < new Date('9999-12-31')
const adminGetIncidentLabel = (action: string) => {
  const labels: Record<string, string> = {
    incident: 'Incident enregistré',
    suspend_user: 'Utilisateur suspendu',
    ban_user: 'Utilisateur banni',
    unban_user: 'Utilisateur débanni',
  }
  return labels[action] || action
}
const adminSuspendUser = async (days: number) => {
  if (!editingUserId.value || !confirm(`Suspendre cet utilisateur pendant ${days} jours ?`)) return
  adminModerationLoading.value = true
  try {
    const res = await apiFetch(`/users/${editingUserId.value}/sanctions`, {
      method: 'PUT',
      body: { action: 'suspend', days, reason: 'Suspension administrative' },
    })
    if (res?.success) {
      toast.add({ title: 'Utilisateur suspendu', color: 'green' })
      await loadProfile()
      const incRes = await apiFetch(`/users/${editingUserId.value}/incidents`, { method: 'GET' })
      adminIncidents.value = incRes?.success && incRes?.data?.incidents ? incRes.data.incidents : []
    } else {
      toast.add({ title: 'Erreur', description: (res as any)?.error, color: 'red' })
    }
  } catch (e: any) {
    toast.add({ title: 'Erreur', description: e?.message, color: 'red' })
  } finally {
    adminModerationLoading.value = false
  }
}
const adminBanUser = async () => {
  if (!editingUserId.value || !confirm('Bannir définitivement cet utilisateur ?')) return
  adminModerationLoading.value = true
  try {
    const res = await apiFetch(`/users/${editingUserId.value}/sanctions`, {
      method: 'PUT',
      body: { action: 'ban', reason: 'Bannissement définitif' },
    })
    if (res?.success) {
      toast.add({ title: 'Utilisateur banni', color: 'green' })
      await loadProfile()
      const incRes = await apiFetch(`/users/${editingUserId.value}/incidents`, { method: 'GET' })
      adminIncidents.value = incRes?.success && incRes?.data?.incidents ? incRes.data.incidents : []
    } else {
      toast.add({ title: 'Erreur', description: (res as any)?.error, color: 'red' })
    }
  } catch (e: any) {
    toast.add({ title: 'Erreur', description: e?.message, color: 'red' })
  } finally {
    adminModerationLoading.value = false
  }
}
const adminUnbanUser = async () => {
  if (!editingUserId.value || !confirm('Débannir cet utilisateur ?')) return
  adminModerationLoading.value = true
  try {
    const res = await apiFetch(`/users/${editingUserId.value}/sanctions`, {
      method: 'PUT',
      body: { action: 'unban' },
    })
    if (res?.success) {
      toast.add({ title: 'Utilisateur débanni', color: 'green' })
      await loadProfile()
      const incRes = await apiFetch(`/users/${editingUserId.value}/incidents`, { method: 'GET' })
      adminIncidents.value = incRes?.success && incRes?.data?.incidents ? incRes.data.incidents : []
    } else {
      toast.add({ title: 'Erreur', description: (res as any)?.error, color: 'red' })
    }
  } catch (e: any) {
    toast.add({ title: 'Erreur', description: e?.message, color: 'red' })
  } finally {
    adminModerationLoading.value = false
  }
}
const adminDeleteUser = async () => {
  if (!editingUserId.value || !confirm('Supprimer définitivement cet utilisateur ? Cette action est irréversible.')) return
  adminModerationLoading.value = true
  try {
    const res = await apiFetch(`/users/${editingUserId.value}`, { method: 'DELETE' })
    if (res?.success) {
      toast.add({ title: 'Utilisateur supprimé', color: 'green' })
      await navigateTo('/admin/users')
    } else {
      toast.add({ title: 'Erreur', description: (res as any)?.error ?? 'Impossible de supprimer.', color: 'red' })
    }
  } catch (e: any) {
    toast.add({ title: 'Erreur', description: (e as Error)?.message ?? 'Erreur réseau', color: 'red' })
  } finally {
    adminModerationLoading.value = false
  }
}

const loadAdminCreateDependencies = async () => {
  try {
    const [labsRes, catsRes] = await Promise.all([
      apiFetch('/users?role=lab&limit=200', { method: 'GET' }),
      apiFetch('/categories?include_inactive=true', { method: 'GET' }),
    ])
    if (labsRes?.success && Array.isArray(labsRes.data)) adminLabs.value = labsRes.data
    if (catsRes?.success && Array.isArray(catsRes.data)) {
      adminCareCategories.value = catsRes.data
      adminCareCategories.value.forEach((c: any) => { adminCarePreferencesMap.value[c.id] = true })
    }
  } catch (_e) {}
}
/** Rôle du profil affiché (pour afficher les bonnes sections quand admin consulte un autre user) */
const isDisplayedProfileLab = computed(() => role.value === 'lab')
const hasCoverageZone = computed(
  () => isNurse.value || isSubaccount.value || (isDisplayedProfileLab.value && !newUserMode.value)
)
const hasPublicProfile = computed(() => isNurse.value || isSubaccount.value || isDisplayedProfileLab.value)
/** Section Paramètres (profil public + disponibilité) : nurse, subaccount, lab */
const hasSettingsCard = computed(
  () =>
    hasPublicProfile.value ||
    (isDisplayedProfileLab.value && !newUserMode.value)
)
/** Photo (préleveur) ; photo + couverture (nurse, subaccount, lab) */
const hasProfilePhotoCard = computed(
  () =>
    (hasPublicProfile.value || isPreleveur.value || isDisplayedProfileLab.value) && !newUserMode.value
)
/** Profil pro : propre compte (pas en édition d'un patient) → colonne 100 %, bouton en bas à droite */
const isProOwnProfile = computed(
  () => user.value?.role === 'pro' && !editingUserId.value && !newUserMode.value && !newPatientMode.value
)
/** Pro en édition d'un patient : documents à droite, bouton Enregistrer en dessous */
const isProEditingPatient = computed(
  () => user.value?.role === 'pro' && !!editingUserId.value && role.value === 'patient' && !newUserMode.value
)
/** Historique RDV : lab, subaccount, nurse, préleveur (pas patient ni pro : patient a sa liste /patient, pro réservé admin) */
const hasAppointmentsSection = computed(
  () =>
    (isDisplayedProfileLab.value || isSubaccount.value || isNurse.value || isPreleveur.value) && !newUserMode.value
)
const profileAppointments = ref<any[]>([])
const loadingAppointments = ref(false)
const appointmentDetailBasePath = computed(() => {
  if (isAdmin.value) return '/admin/appointments'
  if (role.value === 'patient') return '/patient/appointments'
  if (role.value === 'lab') return '/lab/appointments'
  if (role.value === 'subaccount') return '/subaccount/appointments'
  if (role.value === 'nurse') return '/nurse/appointments'
  if (role.value === 'preleveur') return '/preleveur/appointments'
  if (role.value === 'pro') return '/admin/appointments'
  return '/admin/appointments'
})
const appointmentListPath = computed(() => {
  const base = isAdmin.value ? '/admin/appointments' : role.value === 'patient' ? '/patient/appointments' : role.value === 'lab' ? '/lab/appointments' : role.value === 'subaccount' ? '/subaccount/appointments' : role.value === 'nurse' ? '/nurse/appointments' : role.value === 'preleveur' ? '/preleveur/appointments' : '/admin/appointments'
  if (isAdmin.value && editingUserId.value) return `${base}?user_id=${editingUserId.value}`
  return base
})
/** Date seule (comme AppointmentListPage) pour l’historique RDV */
function formatAppointmentDateOnly(dateStr: string) {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

/** Date courte pour la liste compacte (lun. 12 fév. 2026) */
function formatAppointmentDateShort(dateStr: string) {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

/** Créneau horaire : form_data.availability (Toute la journée / 10h00 - 12h00) ou heure scheduled_at — comme AppointmentListPage */
function getCreneauHoraireLabel(apt: { form_data?: { availability?: unknown }; scheduled_at?: string }): string {
  const availability = apt.form_data?.availability
  if (availability != null) {
    try {
      const avail = typeof availability === 'string' ? JSON.parse(availability) : availability
      if (avail?.type === 'all_day') return 'Toute la journée'
      if (avail?.type === 'custom' && Array.isArray(avail?.range) && avail.range.length >= 2) {
        const start = Math.floor(Number(avail.range[0]))
        const end = Math.floor(Number(avail.range[1]))
        if (!Number.isNaN(start) && !Number.isNaN(end)) return `${start}h00 - ${end}h00`
      }
    } catch {
      // ignore
    }
  }
  if (apt.scheduled_at) {
    try {
      return new Date(apt.scheduled_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    } catch {
      // ignore
    }
  }
  return 'Non précisé'
}
function getAppointmentStatusColor(status: string): 'error' | 'primary' | 'success' | 'info' | 'warning' | 'neutral' {
  const colors: Record<string, 'error' | 'primary' | 'success' | 'info' | 'warning' | 'neutral'> = {
    pending: 'warning',
    confirmed: 'info',
    inProgress: 'primary',
    completed: 'success',
    canceled: 'error',
    cancelled: 'error',
    refused: 'error',
    expired: 'neutral',
  }
  return colors[status] || 'neutral'
}
function getAppointmentStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: 'En attente',
    confirmed: 'Confirmé',
    inProgress: 'En cours',
    completed: 'Terminé',
    canceled: 'Annulé',
    cancelled: 'Annulé',
    refused: 'Refusé',
    expired: 'Expiré',
  }
  return labels[status] || status
}
const isAcceptingAppointments = ref(true)
/** Délai minimum en heures avant la date du RDV (lab/sub seulement). Valeurs : 0, 24, 48, 72. */
const minBookingLeadTimeHours = ref(48)
const MIN_LEAD_TIME_OPTIONS = [
  { value: 0, label: 'Aucun (même jour possible)' },
  { value: 24, label: '24 heures' },
  { value: 48, label: '48 heures' },
  { value: 72, label: '72 heures' },
]
const acceptRdvSaturday = ref(true)
const acceptRdvSunday = ref(true)

// -- État global --
const loading = ref(true)
const saving = ref(false)

// -- Formulaire profil --
const profileForm = ref({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  name: '',
  rpps: '',
  siret: '',
  adeli: '',
  emploi: null as string | null,
  birth_date: null as string | null,
  gender: null as string | null,
  address: null as any,
  address_complement: null as string | null,
})
const initialForm = ref({ ...profileForm.value })

// -- Zone de couverture --
const coverageZone = ref<any>(null)
const coverageRadius = ref(20)
const savingCoverage = ref(false)

// Limites d'abonnement (nurse: rayon + types de soins ; lab: préleveurs, sous-comptes)
const planLimits = ref<{ plan_slug?: string; max_radius_km?: number; max_care_types?: number | null; max_preleveurs?: number; max_subaccounts?: number } | null>(null)
const maxRadiusKm = computed(() => {
  if (!hasCoverageZone.value) return 100
  if (isNurse.value) return planLimits.value?.max_radius_km ?? 20
  return 100
})
const isNurseOnDiscovery = computed(() => isNurse.value && planLimits.value?.plan_slug === 'discovery')

// -- Profil public (nurse, subaccount) --
const publicProfileForm = ref({
  is_public_profile_enabled: false,
  public_slug: '',
  profile_image_url: '',
  cover_image_url: '',
  biography: '',
  website_url: '',
  opening_hours: null as Record<string, { start: string; end: string }> | null,
  social_links: null as { facebook?: string; linkedin?: string; instagram?: string } | null,
  years_experience: null as string | null,
  nurse_qualifications: [] as string[],
})
const YEARS_EXPERIENCE_OPTIONS = [
  { value: '1', label: '1 an' },
  { value: '3', label: '3 ans' },
  { value: '5', label: '5 ans' },
  { value: '10', label: '10 ans' },
  { value: '10_plus', label: 'Plus de 10 ans' },
]
const NURSE_QUALIFICATIONS = [
  { code: 'DEI', label: "Diplôme d'État d'Infirmier" },
  { code: 'DE_IADE', label: "Diplôme d'État d'Infirmier Anesthésiste (IADE)" },
  { code: 'DE_IBODE', label: "Diplôme d'État d'Infirmier de Bloc Opératoire (IBODE)" },
  { code: 'DE_PUERICULTURE', label: "Diplôme d'État de Puéricultrice / Puériculteur" },
  { code: 'DU_PLAIES', label: 'DU Plaies et cicatrisation' },
  { code: 'DIU_DOULEUR', label: 'DIU Prise en charge de la douleur' },
  { code: 'DIU_PALLIATIF', label: 'DIU Soins palliatifs et accompagnement' },
  { code: 'DU_DIU_CARDIO', label: 'DU / DIU Cardiologie' },
  { code: 'DU_PEDIATRIE', label: 'DU Pédiatrie' },
  { code: 'DU_DIABETO', label: 'DU Diabétologie' },
  { code: 'DU_PIED_DIABETIQUE', label: 'DU Pied diabétique' },
  { code: 'DU_PRELEVEMENTS', label: 'DU Prélèvements et analyses' },
  { code: 'DIU_PSYCHIATRIE', label: 'DIU Soins en psychiatrie' },
  { code: 'DU_GERIATRIE', label: 'DU Gériatrie' },
  { code: 'DU_URGENCES', label: 'DU Médecine d\'urgence' },
  { code: 'DU_REANIMATION', label: 'DU Réanimation et soins intensifs' },
  { code: 'DU_ADDICTO', label: 'DU / DIU Addictologie' },
  { code: 'DU_DIU_CANCERO', label: 'DU / DIU Cancérologie' },
  { code: 'DU_ETP', label: 'DU Éducation thérapeutique du patient' },
  { code: 'DU_NUTRITION', label: 'DU Nutrition clinique / Nutrition du sujet âgé' },
  { code: 'FORMATION_PRADO', label: 'Formation PRADO (suivi patients à domicile)' },
  { code: 'AUTRE', label: 'Autre formation' },
]
const otherFormationsList = ref<string[]>([])
const hasOtherQualificationChecked = computed(() => {
  const q = publicProfileForm.value.nurse_qualifications || []
  return q.includes('AUTRE') || otherFormationsList.value.some(Boolean)
})
function setSocialLink(platform: 'facebook' | 'linkedin' | 'instagram', value: string) {
  if (!publicProfileForm.value.social_links) publicProfileForm.value.social_links = { facebook: '', linkedin: '', instagram: '' }
  publicProfileForm.value.social_links[platform] = value
}
function setOpeningHour(dayKey: string, key: 'start' | 'end', value: string) {
  if (!publicProfileForm.value.opening_hours) publicProfileForm.value.opening_hours = Object.fromEntries(DAYS.map((d) => [d.key, { start: '', end: '' }]))
  if (!publicProfileForm.value.opening_hours[dayKey]) publicProfileForm.value.opening_hours[dayKey] = { start: '', end: '' }
  publicProfileForm.value.opening_hours[dayKey][key] = value
}
function toggleNurseQualification(code: string, checked: boolean) {
  const q = publicProfileForm.value.nurse_qualifications || []
  if (checked) {
    if (!q.includes(code)) publicProfileForm.value.nurse_qualifications = [...q, code]
    if (code === 'AUTRE' && otherFormationsList.value.length === 0) otherFormationsList.value = ['']
  } else {
    publicProfileForm.value.nurse_qualifications = q.filter((c) => c !== code && !String(c).startsWith('AUTRE:'))
    if (code === 'AUTRE') otherFormationsList.value = []
  }
}
function addOtherFormation() {
  otherFormationsList.value = [...otherFormationsList.value, '']
}
function removeOtherFormation(idx: number) {
  otherFormationsList.value = otherFormationsList.value.filter((_, i) => i !== idx)
}
function setOtherFormation(idx: number, value: string) {
  const list = [...otherFormationsList.value]
  if (idx >= list.length) return
  list[idx] = value
  otherFormationsList.value = list
}
const savingPublicProfile = ref(false)
const savingAccepting = ref(false)
const publicProfileSlugPrefix = computed(() =>
  (isSubaccount.value || (isDisplayedProfileLab.value && !newUserMode.value))
    ? 'oneandlab.fr/Laboratoire/'
    : 'oneandlab.fr/infirmier/'
)

async function onPublicProfileToggle(value: boolean) {
  publicProfileForm.value.is_public_profile_enabled = value
  if (value && (isDisplayedProfileLab.value || isSubaccount.value) && !publicProfileForm.value.public_slug) {
    generatePublicSlug()
  }
  await savePublicProfile()
}

async function onAcceptingToggle(value: boolean) {
  isAcceptingAppointments.value = value
  const targetId = effectiveUserId.value
  if (!targetId) return
  savingAccepting.value = true
  try {
    const response = await apiFetch(`/users/${targetId}`, {
      method: 'PUT',
      body: { is_accepting_appointments: value },
    })
    if (response.success) {
      toast.add({
        title: value ? 'Rendez-vous activés' : 'Rendez-vous désactivés',
        description: value ? 'Les patients peuvent à nouveau réserver des créneaux.' : 'Les demandes de rendez-vous sont suspendues.',
        color: 'green',
      })
      await fetchCurrentUser()
    } else {
      isAcceptingAppointments.value = !value
      toast.add({ title: 'Erreur', description: response.error || 'Impossible d\'enregistrer', color: 'red' })
    }
  } catch (err: any) {
    isAcceptingAppointments.value = !value
    toast.add({ title: 'Erreur', description: err.message || 'Une erreur est survenue', color: 'red' })
  } finally {
    savingAccepting.value = false
  }
}
const publicProfileUrl = computed(() => {
  const slug = publicProfileForm.value.public_slug
  if (!slug) return '#'
  return (isSubaccount.value || (isDisplayedProfileLab.value && !newUserMode.value)) ? `/Laboratoire/${slug}` : `/infirmier/${slug}`
})

const hasValidAddress = computed(() => {
  const addr = profileForm.value.address
  return addr && typeof addr === 'object' && addr.lat && addr.lng
})

// -- Catégories nurse --
const categoryPreferences = ref<any[]>([])
const loadingCategories = ref(false)
const updatingCategories = ref(new Set<string>())

// -- Horaires lab --
const DAYS = [
  { key: 'monday', label: 'Lundi' },
  { key: 'tuesday', label: 'Mardi' },
  { key: 'wednesday', label: 'Mercredi' },
  { key: 'thursday', label: 'Jeudi' },
  { key: 'friday', label: 'Vendredi' },
  { key: 'saturday', label: 'Samedi' },
  { key: 'sunday', label: 'Dimanche' },
]
// -- Documents patient --
const loadingDocuments = ref(false)
const documentError = ref<string | null>(null)
const documents = ref<Record<string, any>>({})
/** En création patient : fichiers sélectionnés avant d'avoir un user_id (uploadés après création) */
const pendingDocumentFiles = ref<Record<string, File>>({})
const documentFiles = ref<Record<string, File | null>>({
  carte_vitale: null,
  carte_mutuelle: null,
  autres_assurances: null,
})
const uploadingDocument = ref<string | null>(null)
const isResettingAfterUpload = ref<string | null>(null)

// ============================
// Chargement des données
// ============================

// Mettre à jour l'avatar du header avec la photo affichée sur cette page (nurse, subaccount, preleveur)
watch(
  () => (hasProfilePhotoCard.value ? publicProfileForm.value.profile_image_url : ''),
  (url) => {
    profileImageForHeader.value = url || null
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  profileImageForHeader.value = null
})

const loadPlanLimits = async () => {
  if (!hasCoverageZone.value && !isNurse.value) return
  try {
    const res = await apiFetch('/plan-limits', { method: 'GET' })
    if (res?.success && res?.data) planLimits.value = res.data
  } catch {
    planLimits.value = null
  }
}

watch(
  () => route.query.userId as string | undefined,
  (uid) => {
    newUserMode.value = false
    newPatientMode.value = false
    if ((user.value?.role === 'lab' || user.value?.role === 'super_admin' || user.value?.role === 'pro') && uid) {
      editingUserId.value = uid
      loadProfile().then(() => {
        if (hasAppointmentsSection.value) loadProfileAppointments()
      })
    } else {
      editingUserId.value = null
      editedUserRole.value = null
      newPreleveurMode.value = false
      loadProfile().then(() => {
        if (hasAppointmentsSection.value) loadProfileAppointments()
      })
    }
  },
  { immediate: false }
)

onMounted(async () => {
  const uid = route.query.userId as string | undefined
  const newPreleveur = route.query.newPreleveur === '1' || route.query.newPreleveur === 'true'
  const newUser = route.query.newUser === '1' || route.query.newUser === 'true'
  if (user.value?.role === 'super_admin' && newUser) {
    newUserMode.value = true
    newPreleveurMode.value = false
    editingUserId.value = null
    editedUserRole.value = null
    adminCreateRole.value = (route.query.role as string) || 'patient'
    profileForm.value = { first_name: '', last_name: '', email: '', phone: '', name: '', rpps: '', siret: '', adeli: '', emploi: null, birth_date: null, gender: null, address: null, address_complement: null }
    initialForm.value = { ...profileForm.value }
    publicProfileForm.value.profile_image_url = ''
    loading.value = false
    await loadAdminCreateDependencies()
  } else if (user.value?.role === 'lab' && newPreleveur) {
    newUserMode.value = false
    newPatientMode.value = false
    newPreleveurMode.value = true
    editingUserId.value = null
    editedUserRole.value = 'preleveur'
    preleveurLabId.value = user.value?.id ?? ''
    profileForm.value = { first_name: '', last_name: '', email: '', phone: '', name: '', rpps: '', siret: '', adeli: '', emploi: null, birth_date: null, gender: null, address: null, address_complement: null }
    initialForm.value = { ...profileForm.value }
    publicProfileForm.value.profile_image_url = ''
    loading.value = false
  } else if (user.value?.role === 'pro' && (route.query.newPatient === '1' || route.query.newPatient === 'true')) {
    newUserMode.value = false
    newPreleveurMode.value = false
    newPatientMode.value = true
    editingUserId.value = null
    editedUserRole.value = null
    documents.value = {}
    pendingDocumentFiles.value = {}
    profileForm.value = { first_name: '', last_name: '', email: '', phone: '', name: '', rpps: '', siret: '', adeli: '', emploi: null, birth_date: null, gender: null, address: null, address_complement: null }
    initialForm.value = { ...profileForm.value }
    publicProfileForm.value.profile_image_url = ''
    loading.value = false
  } else {
    newUserMode.value = false
    newPreleveurMode.value = false
    newPatientMode.value = false
    if ((user.value?.role === 'lab' || user.value?.role === 'super_admin' || user.value?.role === 'pro') && uid) {
      editingUserId.value = uid
    } else {
      editingUserId.value = null
      editedUserRole.value = null
    }
    await loadProfile()
  }

  if (hasCoverageZone.value || isNurse.value) await loadPlanLimits()
  if (user.value?.role === 'lab' && (newPreleveurMode.value || editingUserId.value)) {
    try {
      const subRes = await apiFetch('/lab/subaccounts', { method: 'GET' })
      labSubaccountsForPreleveur.value = Array.isArray(subRes?.data) ? subRes.data : []
    } catch {
      labSubaccountsForPreleveur.value = []
    }
  }
  const promises: Promise<void>[] = []
  if (hasCoverageZone.value && !newPreleveurMode.value && !newUserMode.value && (!editingUserId.value || isAdmin.value)) promises.push(loadCoverage())
  if (isNurse.value || (isDisplayedProfileLab.value && isAdmin.value && editingUserId.value) || ((isDisplayedProfileLab.value || isSubaccount.value) && !editingUserId.value)) promises.push(loadCategoryPreferences())
  if (isPatient.value && !newPatientMode.value) promises.push(loadDocuments())
  if (hasAppointmentsSection.value) promises.push(loadProfileAppointments())
  await Promise.all(promises)
})

const loadProfile = async () => {
  if (newPreleveurMode.value || newUserMode.value || newPatientMode.value) return
  loading.value = true
  try {
    let userData: any
    if (editingUserId.value && (user.value?.role === 'lab' || user.value?.role === 'super_admin' || user.value?.role === 'pro')) {
      const res = await apiFetch(`/users/${editingUserId.value}`, { method: 'GET' })
      userData = res?.success ? res.data : null
    } else {
      userData = await fetchCurrentUser()
    }
    if (!userData) return

    editedUserRole.value = userData.role ?? null
    if (user.value?.role === 'super_admin' && editingUserId.value) {
      adminEditedUser.value = userData
      try {
        const incRes = await apiFetch(`/users/${editingUserId.value}/incidents`, { method: 'GET' })
        adminIncidents.value = incRes?.success && incRes?.data?.incidents ? incRes.data.incidents : []
      } catch (_e) {
        adminIncidents.value = []
      }
    } else {
      adminEditedUser.value = null
      adminIncidents.value = []
    }

    profileForm.value = {
      first_name: userData.first_name || '',
      last_name: userData.last_name || '',
      email: userData.email || '',
      phone: userData.phone || '',
      name: userData.name || userData.company_name || '',
      rpps: userData.rpps || '',
      siret: userData.siret || '',
      adeli: userData.adeli || '',
      emploi: userData.emploi || null,
      birth_date: userData.birth_date || null,
      gender: userData.gender || null,
      address: userData.address || null,
      address_complement: userData.address?.complement || null,
    }
    initialForm.value = { ...profileForm.value }

    if (isNurse.value) {
      isAcceptingAppointments.value = userData.is_accepting_appointments !== false && userData.is_accepting_appointments !== 0
    }

    if (hasPublicProfile.value) {
      const defaultHours = Object.fromEntries(DAYS.map((d) => [d.key, { start: '', end: '' }]))
      publicProfileForm.value = {
        is_public_profile_enabled: !!userData.is_public_profile_enabled,
        public_slug: userData.public_slug || '',
        profile_image_url: userData.profile_image_url || '',
        cover_image_url: userData.cover_image_url || '',
        biography: userData.biography || '',
        website_url: userData.website_url || '',
        opening_hours: userData.opening_hours && typeof userData.opening_hours === 'object' ? { ...defaultHours, ...userData.opening_hours } : defaultHours,
        social_links: userData.social_links && typeof userData.social_links === 'object' ? { ...userData.social_links } : { facebook: '', linkedin: '', instagram: '' },
        years_experience: userData.years_experience || null,
        nurse_qualifications: Array.isArray(userData.nurse_qualifications) ? [...userData.nurse_qualifications] : [],
      }
      if (!publicProfileForm.value.public_slug) {
        generatePublicSlug()
      }
      const quals = publicProfileForm.value.nurse_qualifications || []
      otherFormationsList.value = quals
        .filter((s: string) => typeof s === 'string' && s.startsWith('AUTRE:'))
        .map((s: string) => s.slice(6))
      if (otherFormationsList.value.length > 0 && !quals.includes('AUTRE')) {
        publicProfileForm.value.nurse_qualifications = [...quals, 'AUTRE']
      }
    }
    if (userData.role === 'preleveur') {
      publicProfileForm.value.profile_image_url = userData.profile_image_url || ''
      publicProfileForm.value.cover_image_url = ''
      if (user.value?.role === 'lab') {
        preleveurLabId.value = userData.lab_id || user.value?.id || ''
      }
    }
    if (userData.role === 'lab' || userData.role === 'subaccount') {
      const defaultHours = Object.fromEntries(DAYS.map((d) => [d.key, { start: '', end: '' }]))
      publicProfileForm.value.profile_image_url = userData.profile_image_url || ''
      publicProfileForm.value.cover_image_url = userData.cover_image_url || ''
      publicProfileForm.value.is_public_profile_enabled = !!userData.is_public_profile_enabled
      publicProfileForm.value.public_slug = userData.public_slug || ''
      publicProfileForm.value.website_url = userData.website_url || ''
      publicProfileForm.value.opening_hours = userData.opening_hours && typeof userData.opening_hours === 'object' ? { ...defaultHours, ...userData.opening_hours } : defaultHours
      publicProfileForm.value.social_links = userData.social_links && typeof userData.social_links === 'object' ? { ...userData.social_links } : { facebook: '', linkedin: '', instagram: '' }
      isAcceptingAppointments.value = userData.is_accepting_appointments !== false && userData.is_accepting_appointments !== 0
      const hours = userData.min_booking_lead_time_hours
      minBookingLeadTimeHours.value = [0, 24, 48, 72].includes(Number(hours)) ? Number(hours) : 48
      acceptRdvSaturday.value = userData.accept_rdv_saturday !== false && userData.accept_rdv_saturday !== 0
      acceptRdvSunday.value = userData.accept_rdv_sunday !== false && userData.accept_rdv_sunday !== 0
    }
  } catch (err: any) {
    toast.add({ title: 'Erreur', description: err.message || 'Impossible de charger le profil', color: 'red' })
  } finally {
    loading.value = false
  }
}

// ============================
// Sauvegarde profil
// ============================

const saveProfile = async (fromSaveAll = false) => {
  if (!fromSaveAll) saving.value = true
  try {
    if (newUserMode.value) {
      const r = adminCreateRole.value
      if (!profileForm.value.email?.trim() || !r) {
        toast.add({ title: 'Champs requis', description: 'Email et rôle sont obligatoires.', color: 'red' })
        return
      }
      if (adminIsEntityRole(r) && !profileForm.value.name?.trim()) {
        toast.add({ title: 'Champs requis', description: 'Nom d\'entité requis pour lab/sous-compte.', color: 'red' })
        return
      }
      if (!adminIsEntityRole(r) && (!profileForm.value.first_name?.trim() || !profileForm.value.last_name?.trim())) {
        toast.add({ title: 'Champs requis', description: 'Prénom et nom sont obligatoires.', color: 'red' })
        return
      }
      const addressBody = profileForm.value.address && typeof profileForm.value.address === 'object' && profileForm.value.address.label?.trim()
        ? { label: profileForm.value.address.label.trim(), lat: profileForm.value.address.lat, lng: profileForm.value.address.lng }
        : null
      const body: any = {
        email: profileForm.value.email.trim(),
        first_name: adminIsEntityRole(r) ? '' : (profileForm.value.first_name ?? '').trim(),
        last_name: adminIsEntityRole(r) ? (profileForm.value.name ?? '').trim() : (profileForm.value.last_name ?? '').trim(),
        role: r,
        phone: profileForm.value.phone?.trim() || undefined,
      }
      if (adminIsEntityRole(r)) body.company_name = profileForm.value.name?.trim()
      if (adminIsLabLinkedRole(r) && adminLabId.value) body.lab_id = adminLabId.value
      const response = await apiFetch('/users', { method: 'POST', body })
      if (!response?.success) {
        toast.add({ title: 'Erreur', description: (response as any)?.error || 'Impossible de créer l\'utilisateur.', color: 'red' })
        return
      }
      const newId = (response as any)?.data?.id
      if (newId) {
        const updateBody: any = {}
        if (addressBody) updateBody.address = addressBody
        if (profileForm.value.gender?.trim()) updateBody.gender = profileForm.value.gender.trim()
        if (profileForm.value.birth_date?.trim()) updateBody.birth_date = profileForm.value.birth_date.trim()
        if (profileForm.value.rpps?.trim()) updateBody.rpps = profileForm.value.rpps.trim()
        if (adminAdeli.value?.trim()) updateBody.adeli = adminAdeli.value.trim()
        if (profileForm.value.siret?.trim()) updateBody.siret = profileForm.value.siret.trim()
        if (profileForm.value.name?.trim() && adminIsEntityRole(r)) updateBody.company_name = profileForm.value.name.trim()
        if (Object.keys(updateBody).length > 0) {
          await apiFetch(`/users/${newId}`, { method: 'PUT', body: updateBody })
        }
        if (r === 'lab' && Object.keys(adminCarePreferencesMap.value).length > 0) {
          const prefs = Object.entries(adminCarePreferencesMap.value).map(([category_id, is_enabled]) => ({ category_id, is_enabled }))
          await apiFetch(`/users/${newId}/lab-category-preferences`, { method: 'PUT', body: { preferences: prefs } })
        }
        if (r === 'nurse' && Object.keys(adminCarePreferencesMap.value).length > 0) {
          const prefs = Object.entries(adminCarePreferencesMap.value).map(([category_id, is_enabled]) => ({ category_id, is_enabled }))
          await apiFetch(`/users/${newId}/nurse-category-preferences`, { method: 'PUT', body: { preferences: prefs } })
        }
      }
      toast.add({ title: 'Utilisateur créé', color: 'green' })
      await navigateTo(newId ? `/profile?userId=${newId}` : '/admin/users')
      return
    }

    if (newPreleveurMode.value) {
      const { first_name, last_name, email, phone } = profileForm.value
      if (!email?.trim() || !first_name?.trim() || !last_name?.trim()) {
        toast.add({ title: 'Champs requis manquants (email, prénom, nom)', color: 'red' })
        return
      }
      const res = await apiFetch('/lab/preleveurs', {
        method: 'POST',
        body: {
          email: email.trim(),
          first_name: first_name.trim(),
          last_name: last_name.trim(),
          phone: phone?.trim() || null,
          lab_id: preleveurLabId.value?.trim() || user.value?.id || null,
        },
      })
      if (res?.success) {
        toast.add({ title: 'Préleveur créé', color: 'green' })
        await navigateTo('/lab/preleveurs')
      } else {
        toast.add({ title: 'Erreur', description: res?.error || 'Impossible de créer le préleveur', color: 'red' })
      }
      return
    }

    if (newPatientMode.value) {
      const { first_name, last_name, email, phone, address } = profileForm.value
      if (!email?.trim() || !first_name?.trim() || !last_name?.trim() || !phone?.trim()) {
        toast.add({ title: 'Champs requis', description: 'Email, prénom, nom et téléphone sont obligatoires.', color: 'red' })
        return
      }
      const addressBody = address && typeof address === 'object' && address.label?.trim()
        ? { label: address.label.trim(), lat: address.lat, lng: address.lng }
        : null
      const res = await apiFetch('/patients', {
        method: 'POST',
        body: {
          email: email.trim(),
          first_name: first_name.trim(),
          last_name: last_name.trim(),
          phone: phone.trim(),
          birth_date: profileForm.value.birth_date?.trim() || null,
          gender: profileForm.value.gender?.trim() || null,
          address: addressBody,
        },
      })
      if (res?.success) {
        const newPatientId = (res as any).data?.id
        if (newPatientId && Object.keys(pendingDocumentFiles.value).length > 0) {
          for (const docType of Object.keys(pendingDocumentFiles.value)) {
            const file = pendingDocumentFiles.value[docType]
            if (!file) continue
            uploadingDocument.value = docType
            documentError.value = null
            try {
              const formData = new FormData()
              formData.append('file', file)
              formData.append('document_type', docType)
              formData.append('user_id', newPatientId)
              const uploadRes = await apiFetch('/patient-documents/upload', { method: 'POST', body: formData })
              if (!uploadRes?.success) throw new Error((uploadRes as any)?.error || "Erreur d'upload")
            } catch (err: any) {
              documentError.value = err.message || "Erreur lors de l'enregistrement du document"
              toast.add({ title: 'Document non enregistré', description: err.message || "Impossible d'enregistrer un document.", color: 'red' })
            } finally {
              uploadingDocument.value = null
            }
          }
          pendingDocumentFiles.value = {}
          documents.value = {}
        }
        toast.add({ title: 'Patient créé', color: 'green' })
        await navigateTo('/pro/patients')
      } else {
        toast.add({ title: 'Erreur', description: (res as any)?.error || 'Impossible de créer le patient', color: 'red' })
      }
      return
    }

    const targetId = effectiveUserId.value
    if (!targetId) return

    const body: any = {
      first_name: profileForm.value.first_name,
      last_name: profileForm.value.last_name,
      phone: profileForm.value.phone || null,
    }

    // Champs spécifiques par rôle
    if (isNurse.value) {
      body.rpps = profileForm.value.rpps
      body.is_accepting_appointments = isAcceptingAppointments.value
    }
    if (role.value === 'pro') {
      if (profileForm.value.adeli?.trim()) body.adeli = profileForm.value.adeli.trim()
      body.emploi = profileForm.value.emploi?.trim() || null
    }
    if (isPreleveur.value) {
      body.profile_image_url = publicProfileForm.value.profile_image_url || null
      if (user.value?.role === 'lab' && editingUserId.value && preleveurLabId.value) {
        body.lab_id = preleveurLabId.value
      }
    }
    if (role.value === 'lab' || role.value === 'subaccount') {
      body.company_name = profileForm.value.name?.trim() || null
      body.siret = profileForm.value.siret?.trim() || null
      // Régénérer le slug si le nom a changé (pour 301 propre depuis l’ancien slug)
      if (profileForm.value.name?.trim() !== initialForm.value.name?.trim()) {
        generatePublicSlug()
      }
      body.public_slug = publicProfileForm.value.public_slug || null
      body.profile_image_url = publicProfileForm.value.profile_image_url || null
      body.cover_image_url = publicProfileForm.value.cover_image_url || null
      body.is_public_profile_enabled = !!publicProfileForm.value.is_public_profile_enabled
      body.is_accepting_appointments = !!isAcceptingAppointments.value
      body.min_booking_lead_time_hours = minBookingLeadTimeHours.value
      body.accept_rdv_saturday = !!acceptRdvSaturday.value
      body.accept_rdv_sunday = !!acceptRdvSunday.value
      body.website_url = publicProfileForm.value.website_url || null
      body.opening_hours = publicProfileForm.value.opening_hours || null
      const sl = publicProfileForm.value.social_links
      body.social_links = sl && (sl.facebook || sl.linkedin || sl.instagram) ? sl : null
    }
    if (isPatient.value) {
      body.birth_date = profileForm.value.birth_date || null
      body.gender = profileForm.value.gender || null
    }

    // Adresse
    if (profileForm.value.address) {
      body.address = {
        ...profileForm.value.address,
        ...(isPatient.value && { complement: profileForm.value.address_complement || null }),
      }
    } else {
      body.address = null
    }

    const response = await apiFetch(`/users/${targetId}`, {
      method: 'PUT',
      body,
    })

    if (response.success) {
      toast.add({
        title: 'Profil mis à jour',
        description: editingUserId.value ? 'Les informations du préleveur ont été enregistrées.' : 'Vos informations ont été enregistrées avec succès.',
        color: 'green',
      })
      if (!editingUserId.value) await fetchCurrentUser()
      initialForm.value = { ...profileForm.value }
    } else {
      toast.add({ title: 'Erreur', description: response.error || 'Impossible de sauvegarder', color: 'red' })
    }
  } catch (err: any) {
    toast.add({ title: 'Erreur', description: err.message || 'Une erreur est survenue', color: 'red' })
  } finally {
    if (!fromSaveAll) saving.value = false
  }
}

function onSavePersonalInfo(formData: import('~/types/profile').ProfileForm) {
  Object.assign(profileForm.value, formData)
  saveProfile()
}

async function saveAll() {
  const data = personalInfoRef.value?.getFormData?.()
  if (data) Object.assign(profileForm.value, data)

  saving.value = true
  try {
    await saveProfile(true)
    if (hasCoverageZone.value) await saveCoverage(true)
    if (hasPublicProfile.value) await savePublicProfile(true)
    toast.add({ title: 'Enregistré', description: 'Toutes les modifications ont été enregistrées.', color: 'green' })
  } catch {
    // Erreurs déjà affichées par les sous-fonctions
  } finally {
    saving.value = false
  }
}

const resetForm = () => {
  profileForm.value = { ...initialForm.value }
}

// ============================
// Zone de couverture
// ============================

const loadCoverage = async () => {
  try {
    const coverageRole = role.value === 'subaccount' ? 'subaccount' : role.value
    const response = await apiFetch(`/coverage-zones?owner_id=${effectiveUserId.value}&role=${coverageRole}`, { method: 'GET' })
    if (response.success && response.data?.length > 0) {
      coverageZone.value = response.data[0]
      if (coverageZone.value.radius_km) {
        const r = Number(coverageZone.value.radius_km)
        coverageRadius.value = Math.min(r, maxRadiusKm.value)
      }
    } else {
      coverageZone.value = null
    }
  } catch {
    // Valeurs par défaut conservées
  }
}

const saveCoverage = async (fromSaveAll = false) => {
  if (!hasValidAddress.value) {
    toast.add({ title: 'Adresse requise', description: "Définissez d'abord votre adresse.", color: 'red' })
    return
  }
  if (!fromSaveAll) savingCoverage.value = true
  try {
    const coverageRole = role.value === 'subaccount' ? 'subaccount' : role.value
    const body: Record<string, unknown> = {
      center_lat: profileForm.value.address.lat,
      center_lng: profileForm.value.address.lng,
      radius_km: coverageRadius.value,
      role: coverageRole,
    }
    if (effectiveUserId.value && effectiveUserId.value !== user.value?.id) {
      body.owner_id = effectiveUserId.value
    }
    const response = await apiFetch('/coverage-zones', {
      method: coverageZone.value ? 'PUT' : 'POST',
      body,
    })
    if (response.success) {
      toast.add({ title: 'Rayon enregistré', description: `Zone de ${coverageRadius.value} km mise à jour.`, color: 'green' })
      await loadCoverage()
    } else {
      toast.add({ title: 'Limite de votre offre', description: response.error || "Impossible d'enregistrer", color: 'red' })
    }
  } catch (err: any) {
    toast.add({ title: 'Erreur', description: err.message || 'Une erreur est survenue', color: 'red' })
  } finally {
    if (!fromSaveAll) savingCoverage.value = false
  }
}

function generatePublicSlug() {
  const u = user.value
  const pf = profileForm.value
  if (isSubaccount.value || (isDisplayedProfileLab.value && !newUserMode.value)) {
    const name = (pf.name || u?.company_name || pf.first_name || u?.first_name || '').toString()
    publicProfileForm.value.public_slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim() || 'profil'
  } else {
    const first = (pf.first_name || u?.first_name || '').toString()
    const last = (pf.last_name || u?.last_name || '').toString()
    publicProfileForm.value.public_slug = `${first}-${last}`
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim() || 'profil'
  }
}

async function savePublicProfile(fromSaveAll = false) {
  if (!user.value?.id) return
  if (!fromSaveAll) savingPublicProfile.value = true
  try {
    const body: Record<string, unknown> = {
      is_public_profile_enabled: publicProfileForm.value.is_public_profile_enabled,
      public_slug: publicProfileForm.value.public_slug || null,
      profile_image_url: publicProfileForm.value.profile_image_url || null,
      cover_image_url: publicProfileForm.value.cover_image_url || null,
      biography: publicProfileForm.value.biography || null,
    }
    if (hasPublicProfile.value) {
      body.website_url = publicProfileForm.value.website_url || null
      body.opening_hours = publicProfileForm.value.opening_hours || null
      const sl = publicProfileForm.value.social_links
      body.social_links = sl && (sl.facebook || sl.linkedin || sl.instagram) ? sl : null
      body.years_experience = publicProfileForm.value.years_experience || null
      const baseCodes = (publicProfileForm.value.nurse_qualifications || []).filter((c: string) => c !== 'AUTRE' && !String(c).startsWith('AUTRE:'))
      const customLabels = otherFormationsList.value.filter(Boolean)
      const hasOtherChecked = publicProfileForm.value.nurse_qualifications?.includes('AUTRE') || customLabels.length > 0
      const builtQualifications = customLabels.length
        ? [...baseCodes, ...customLabels.map((l) => `AUTRE:${l}`)]
        : hasOtherChecked
          ? [...baseCodes, 'AUTRE']
          : baseCodes.length
            ? baseCodes
            : null
      body.nurse_qualifications = builtQualifications?.length ? builtQualifications : null
    }
    const targetId = effectiveUserId.value
    if (!targetId) return
    const response = await apiFetch(`/users/${targetId}`, {
      method: 'PUT',
      body,
    })
    if (response.success) {
      const enabled = publicProfileForm.value.is_public_profile_enabled
      toast.add({
        title: enabled ? 'Profil public activé' : 'Profil public désactivé',
        description: enabled ? 'Votre fiche est visible sur OneAndLab.' : 'Votre fiche n’est plus visible.',
        color: 'green',
      })
      if (!editingUserId.value) await fetchCurrentUser()
    } else {
      toast.add({ title: 'Erreur', description: response.error || 'Impossible d\'enregistrer', color: 'red' })
    }
  } catch (err: any) {
    toast.add({ title: 'Erreur', description: err.message || 'Une erreur est survenue', color: 'red' })
  } finally {
    if (!fromSaveAll) savingPublicProfile.value = false
  }
}

// ============================
// Catégories nurse
// ============================

/** Convertit l’icône stockée en admin (care_categories.icon) en nom UIcon */
function careCategoryIconName(icon: string | null | undefined): string {
  if (!icon || typeof icon !== 'string') return 'i-lucide-heart-pulse'
  const raw = icon.trim()
  if (!raw) return 'i-lucide-heart-pulse'
  if (raw.startsWith('i-')) return raw
  if (raw.startsWith('medical-icon:')) return 'i-medical-icon-' + raw.slice('medical-icon:'.length)
  if (raw.startsWith('healthicons:')) return 'i-healthicons-' + raw.slice('healthicons:'.length)
  if (raw.startsWith('covid:')) return 'i-covid-' + raw.slice('covid:'.length)
  const name = raw.replace(/^lucide:/, '').replace(/\s+/g, '-').toLowerCase()
  return name ? `i-lucide-${name}` : 'i-lucide-heart-pulse'
}

const loadCategoryPreferences = async () => {
  loadingCategories.value = true
  try {
    let url: string
    if (isAdmin.value && editingUserId.value) {
      if (isNurse.value) url = `/users/${editingUserId.value}/nurse-category-preferences`
      else if (isDisplayedProfileLab.value) url = `/users/${editingUserId.value}/lab-category-preferences`
      else { loadingCategories.value = false; return }
    } else if (isNurse.value) {
      url = '/nurse-category-preferences'
    } else if (isDisplayedProfileLab.value || isSubaccount.value) {
      url = '/lab-category-preferences'
    } else {
      loadingCategories.value = false
      return
    }
    const response = await apiFetch(url, { method: 'GET' })
    if (response.success && response.data) {
      categoryPreferences.value = response.data.map((pref: any) => ({
        ...pref,
        category_id: pref.category_id ?? pref.id,
        is_enabled: Boolean(pref.is_enabled),
      }))
    } else {
      categoryPreferences.value = []
    }
  } catch {
    categoryPreferences.value = []
  } finally {
    loadingCategories.value = false
  }
}

const updateCategoryPreference = async (categoryId: string, isEnabled: boolean) => {
  const preference = categoryPreferences.value.find(p => (p.category_id ?? p.id) === categoryId)
  if (!preference) return

  const oldValue = preference.is_enabled
  preference.is_enabled = isEnabled
  updatingCategories.value.add(categoryId)

  try {
    let response: any
    if (isAdmin.value && editingUserId.value) {
      const prefs = categoryPreferences.value.map((p: any) => ({
        category_id: p.category_id ?? p.id,
        is_enabled: !!p.is_enabled,
      }))
      const path = isNurse.value
        ? `/users/${editingUserId.value}/nurse-category-preferences`
        : `/users/${editingUserId.value}/lab-category-preferences`
      response = await apiFetch(path, { method: 'PUT', body: { preferences: prefs } })
    } else if (isDisplayedProfileLab.value || isSubaccount.value) {
      response = await apiFetch('/lab-category-preferences', {
        method: 'PUT',
        body: { category_id: categoryId, is_enabled: isEnabled },
      })
    } else {
      response = await apiFetch('/nurse-category-preferences', {
        method: 'PUT',
        body: { category_id: categoryId, is_enabled: isEnabled },
      })
    }
    if (response?.success) {
      toast.add({ title: 'Préférence mise à jour', description: `"${preference.name}" ${isEnabled ? 'activé' : 'désactivé'}.`, color: 'green' })
    } else {
      preference.is_enabled = oldValue
      toast.add({ title: 'Erreur', description: response?.error || 'Impossible de mettre à jour', color: 'red' })
    }
  } catch (err: any) {
    preference.is_enabled = oldValue
    toast.add({ title: 'Erreur', description: err.message || 'Une erreur est survenue', color: 'red' })
  } finally {
    updatingCategories.value.delete(categoryId)
  }
}

// ============================
// Historique RDV
// ============================

const loadProfileAppointments = async () => {
  loadingAppointments.value = true
  try {
    const url = isAdmin.value && editingUserId.value
      ? `/appointments?user_id=${editingUserId.value}&limit=20`
      : '/appointments?limit=20'
    const res = await apiFetch<{ success: boolean; data?: any[] }>(url, { method: 'GET' })
    if (res?.success && Array.isArray(res.data)) {
      profileAppointments.value = res.data
    } else {
      profileAppointments.value = []
    }
  } catch (_e) {
    profileAppointments.value = []
  } finally {
    loadingAppointments.value = false
  }
}

// ============================
// Documents patient
// ============================

const loadDocuments = async () => {
  loadingDocuments.value = true
  documentError.value = null
  try {
    const url =
      (isAdmin.value && editingUserId.value) || (isProEditingPatient.value && editingUserId.value)
        ? `/patient-documents?user_id=${editingUserId.value}`
        : '/patient-documents'
    const response = await apiFetch(url, { method: 'GET' })
    if (response.success) {
      documents.value = {}
      if (response.data && Array.isArray(response.data)) {
        response.data.forEach((doc: any) => {
          if (doc.document_type) documents.value[doc.document_type] = doc
        })
      }
    }
  } catch (err: any) {
    documentError.value = err.message || 'Erreur lors du chargement des documents'
  } finally {
    loadingDocuments.value = false
  }
}

function handleDocumentUpload(documentType: import('~/types/profile').DocumentType, file: File) {
  if (uploadingDocument.value === documentType) return
  nextTick(() => handleDocumentChange(documentType, file))
}

const handleDocumentChange = async (documentType: string, file: File | null) => {
  if (!file) return
  if (uploadingDocument.value === documentType) return

  // Création patient : stocker le fichier localement, upload après création
  if (newPatientMode.value) {
    pendingDocumentFiles.value[documentType] = file
    documents.value[documentType] = { file_name: file.name }
    documentError.value = null
    return
  }

  uploadingDocument.value = documentType
  documentError.value = null

  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('document_type', documentType)
    if ((isAdmin.value || isProEditingPatient.value) && editingUserId.value) {
      formData.append('user_id', editingUserId.value)
    }

    const result = await apiFetch('/patient-documents/upload', { method: 'POST', body: formData })

    if (result.success) {
      toast.add({ title: 'Document enregistré', description: 'Votre document a été enregistré avec succès.', color: 'green' })
      isResettingAfterUpload.value = documentType
      documentFiles.value[documentType] = null
      await new Promise(resolve => setTimeout(resolve, 500))
      await loadDocuments()
      setTimeout(() => { isResettingAfterUpload.value = null }, 100)
    } else {
      throw new Error(result.error || "Erreur lors de l'enregistrement")
    }
  } catch (err: any) {
    documentError.value = err.message || "Erreur lors de l'enregistrement du document"
    toast.add({ title: 'Erreur', description: err.message || "Impossible d'enregistrer le document", color: 'red' })
  } finally {
    uploadingDocument.value = null
    if (isResettingAfterUpload.value === documentType) {
      setTimeout(() => { isResettingAfterUpload.value = null }, 100)
    }
  }
}

async function downloadDocument(documentId: string, fileName?: string) {
  try {
    const apiBase = useRuntimeConfig().public.apiBase || 'http://localhost:8888/api'
    const token = localStorage.getItem('auth_token')
    const url = `${apiBase}/medical-documents/${documentId}/download?t=${Date.now()}`
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
      cache: 'no-store',
    })

    if (!response.ok) throw new Error('Erreur lors du téléchargement')

    const blob = await response.blob()
    const objectUrl = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = fileName && fileName.trim() ? fileName : `document-${documentId}.pdf`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(objectUrl)
    document.body.removeChild(a)

    toast.add({ title: 'Téléchargement', description: 'Le document est en cours de téléchargement.', color: 'green' })
  } catch (err: any) {
    toast.add({ title: 'Erreur', description: err.message || 'Impossible de télécharger le document', color: 'red' })
  }
}

</script>

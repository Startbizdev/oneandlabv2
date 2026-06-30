<template>
  <UForm :state="form" @submit.prevent="handleSubmit" class="space-y-6">
    <div class="space-y-6">
          <!-- Champs spécifiques par soin -->
          <UCard
            v-for="(svc, svcIdx) in wizardServiceCards"
      :id="`wizard-rdv-service-${svc.id}`"
      :key="svc.id"
      :class="[
        wizardUseServiceCard
          ? 'rounded-2xl border border-gray-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.06)]'
          : [
              'rounded-none border-0 bg-transparent shadow-none ring-0',
              svcIdx < wizardServiceCards.length - 1 ? 'border-b border-gray-100 pb-8 dark:border-gray-800' : '',
            ],
      ]"
      :ui="wizardUseServiceCard ? undefined : { body: 'p-0 sm:p-0', header: 'p-0 border-0 sm:px-0 px-4' }"
    >
      <template v-if="showWizardServiceHeaderInCard" #header>
        <div v-if="wizardUseServiceCard" class="flex items-center gap-3 sm:gap-4">
          <div
            class="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md border border-gray-200/90 bg-white p-0.5 dark:border-gray-700 dark:bg-gray-950 sm:h-12 sm:w-12"
          >
            <CareCategoryVisual
              :emoji="serviceHeaderEmoji(svc)"
              :image-src="serviceHeaderImageSrc(svc)"
              :icon-name="svc.icon || (isBloodTestAppointment(svc.type) ? 'i-lucide-droplet' : 'i-lucide-heart-pulse')"
              img-class="block max-h-full max-w-full min-h-0 min-w-0 object-contain"
              icon-class="max-h-[92%] max-w-[92%] shrink-0 text-gray-600 dark:text-gray-400"
            />
          </div>
          <div class="min-w-0">
            <h3 class="text-base font-semibold text-gray-900 dark:text-white truncate">
              {{
                hasGroupedBloodActs && isBloodTestAppointment(svc.type)
                  ? 'Prélèvement'
                  : hasGroupedNursingActs && isNursingAppointment(svc.type)
                    ? 'Soins infirmiers'
                    : svc.name
              }}
            </h3>
            <div
              v-if="hasGroupedBloodActs && isBloodTestAppointment(svc.type)"
              class="mt-1.5 flex flex-wrap gap-1.5"
            >
              <UBadge
                v-for="service in bloodServices"
                :key="service.id"
                color="error"
                variant="subtle"
                size="sm"
                class="max-w-full font-medium"
              >
                <span class="truncate">{{ service.name }}</span>
              </UBadge>
            </div>
            <div
              v-else-if="hasGroupedNursingActs && isNursingAppointment(svc.type)"
              class="mt-1.5 flex flex-wrap gap-1.5"
            >
              <UBadge
                v-for="service in nursingServices"
                :key="service.id"
                color="info"
                variant="subtle"
                size="sm"
                class="max-w-full font-medium"
              >
                <span class="truncate">{{ service.name }}</span>
              </UBadge>
            </div>
            <p
              v-else
              class="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400"
            >
              <UBadge
                :color="isBloodTestAppointment(svc.type) ? 'error' : 'info'"
                variant="subtle"
                size="sm"
                :leading-icon="isBloodTestAppointment(svc.type) ? 'i-lucide-syringe' : 'i-lucide-stethoscope'"
                :label="isBloodTestAppointment(svc.type) ? 'Prélèvement' : 'Soins infirmiers'"
              />
            </p>
          </div>
        </div>
        <div v-else class="min-w-0 space-y-2">
          <h3 class="text-base font-semibold text-gray-900 dark:text-white truncate">
            {{
              hasGroupedBloodActs && isBloodTestAppointment(svc.type)
                ? 'Prélèvement'
                : hasGroupedNursingActs && isNursingAppointment(svc.type)
                  ? 'Soins infirmiers'
                  : svc.name
            }}
          </h3>
          <div class="flex flex-wrap gap-2">
            <UBadge
              v-for="line in wizardDocumentBadgeLines(svc)"
              :key="line.id"
              color="neutral"
              variant="subtle"
              size="sm"
              class="inline-flex max-w-full items-center gap-2 border-0 font-semibold shadow-none ring-1 ring-black/5 py-1 pl-1.5 pr-2.5 dark:ring-white/10"
            >
              <CareCategoryVisual
                :emoji="line.emoji"
                :image-src="line.imageSrc"
                :icon-name="line.iconName"
                img-class="h-5 w-5 shrink-0 object-contain"
                icon-class="h-5 w-5 shrink-0 text-gray-600 dark:text-gray-400"
              />
              <span class="truncate text-gray-900 dark:text-gray-100">{{ line.name }}</span>
            </UBadge>
          </div>
        </div>
      </template>

      <!-- Date et créneaux par soin -->
      <div
        v-if="showWizardDatetimeBlocks"
        :class="['mb-4 space-y-5 md:space-y-6', wizardFlatSectionPad]"
      >
        <BookingWizardSegmentContext
          v-if="showPatientWizardSegmentContext"
          mode="slot-datetime"
          :selected-services="selectedServices"
          :slot-rows="renderedServices"
          :active-service-id="activeSlotServiceId ?? svc.id"
          :slot-index="wizardActiveSlotIndex"
          :form-data-by-service="formDataByService"
        />
        <UFormField
          :label="wizardDateFieldLabel"
          :name="`scheduled_at_${svc.id}`"
          required
          :ui="wizardUseServiceCard ? undefined : { label: 'sr-only' }"
        >
          <BookingDateCarousel
            v-if="!wizardUseServiceCard"
            v-model="formDataByService[svc.id].scheduled_at"
            :min-lead-time-hours="minLeadTimeHours ?? undefined"
            :accept-saturday="acceptSaturday !== false"
            :accept-sunday="acceptSunday !== false"
          />
          <DatePicker
            v-else
            v-model="formDataByService[svc.id].scheduled_at"
            placeholder="Sélectionner une date"
            :appointment-type="isBloodTestAppointment(svc.type) ? 'lab' : 'nurse'"
            :min-lead-time-hours="minLeadTimeHours ?? undefined"
            :accept-saturday="acceptSaturday !== false"
            :accept-sunday="acceptSunday !== false"
          />
        </UFormField>
        <div
          v-if="servicePremiumDayKind(svc.id)"
          class="relative mt-3 flex items-center gap-2 overflow-hidden rounded-lg border border-warning/25 bg-warning/10 p-2.5 text-warning sm:p-3 dark:border-warning/20"
        >
          <UIcon name="i-lucide-calendar-clock" class="size-4 shrink-0 opacity-90" aria-hidden="true" />
          <div class="min-w-0 flex-1">
            <div class="flex min-w-0 items-center justify-between gap-3">
              <p class="min-w-0 flex-1 text-xs font-semibold leading-snug text-amber-950 dark:text-amber-100">
                {{ servicePremiumDayAlertTitle(svc.id, svc.type) }}
              </p>
              <button
                type="button"
                class="inline-flex shrink-0 items-center gap-0.5 rounded-md border border-current bg-transparent px-2 py-1 text-[11px] font-semibold text-amber-950 transition-colors hover:bg-amber-950/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-900/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent dark:text-amber-100 dark:hover:bg-amber-100/[0.1] dark:focus-visible:ring-amber-100/45"
                :aria-expanded="isCompactWarningOpen(`premium-${svc.id}`)"
                @click="toggleCompactWarning(`premium-${svc.id}`)"
              >
                {{ isCompactWarningOpen(`premium-${svc.id}`) ? 'Réduire' : "Plus d'info" }}
                <UIcon
                  :name="isCompactWarningOpen(`premium-${svc.id}`) ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                  class="size-3 shrink-0 opacity-85"
                  aria-hidden="true"
                />
              </button>
            </div>
            <div
              v-show="isCompactWarningOpen(`premium-${svc.id}`)"
              class="mt-1.5 text-[11px] leading-snug text-gray-700 dark:text-gray-300"
            >
              {{ servicePremiumDayAlertDescription(svc.id) }}
            </div>
          </div>
        </div>
        <UFormField :label="'Disponibilités horaires'" :name="`availability_${svc.id}`" required>
          <BookingAvailabilityTabs
            v-model:availability-type="formDataByService[svc.id].availability_type"
            v-model:availability-range="formDataByService[svc.id].availabilityRange"
            v-model:urgent-hour="formDataByService[svc.id].urgentHour!"
            v-model:urgent-timing-mode="formDataByService[svc.id].urgentTimingMode!"
            v-model:urgent-minute="formDataByService[svc.id].urgentMinute!"
            :format-hour="formatHourFr"
            :max-hour="availabilityMaxHour(svc.type)"
            :range-slider-min-hour="availabilityRangeSliderMinForService(svc)"
            :show-urgent-tab="patientBookingUrgencyStripeFlag && isBloodTestAppointment(svc.type)"
            :urgency-fee-label="'14,99 € TTC'"
          />
        </UFormField>
      </div>

      <!-- Options soin (prise en charge, catalogue, lab) : mini-modal étape 1 — affichées seulement en mode formulaire complet. -->
      <template v-if="!hideBookingCareDetails && showWizardCareDetailBlocks">
      <!-- Sous-choix dynamiques par catégorie — multi-soins infirmiers : un bloc par acte -->
      <template v-if="hasGroupedNursingActs && isNursingAppointment(svc.type)">
        <div v-for="ns in nursingServices" :key="ns.id" class="space-y-4 mb-5 last:mb-0">
          <p class="text-sm font-semibold text-gray-800 dark:text-gray-100">{{ ns.name }}</p>
          <template v-if="getCategoryOptions(ns.category_id).length">
            <template v-for="opt in getCategoryOptions(ns.category_id)" :key="`${ns.id}-${opt.option_key}`">
              <UFormField v-if="opt.field_type === 'select'" :label="opt.label" :name="`care_${ns.id}_${opt.option_key}`" :required="!!opt.is_required">
                <USelect
                  v-model="formDataByService[ns.id].care_options![opt.option_key]"
                  :items="(opt.options || []).map(o => ({ label: o.label, value: o.value }))"
                  value-key="value"
                  placeholder="Choisissez une option"
                  size="xl"
                  class="w-full"
                  @update:model-value="(v: unknown) => clearAutreDetailUnlessSelected(formDataByService[ns.id].care_options!, opt.option_key, v)"
                />
              </UFormField>
              <UFormField
                v-if="opt.field_type === 'select' && categorySelectHasAutreOption(opt) && isAutreSelectValue(formDataByService[ns.id].care_options![opt.option_key])"
                label="Précisez"
                :name="`care_${ns.id}_${careAutreDetailKey(opt.option_key)}`"
                required
              >
                <CareAutreDetailInput
                  v-model="formDataByService[ns.id].care_options![careAutreDetailKey(opt.option_key)]"
                  :category-name="ns.name"
                  :category-type="ns.type"
                  placeholder="Tapez ou choisissez une suggestion"
                  size="xl"
                />
              </UFormField>
              <UFormField v-else-if="opt.field_type === 'text'" :label="opt.label" :name="`care_${ns.id}_${opt.option_key}`" :required="!!opt.is_required">
                <CareAutreDetailInput
                  v-model="formDataByService[ns.id].care_options![opt.option_key]"
                  :category-name="ns.name"
                  :category-type="ns.type"
                  placeholder="Tapez ou choisissez une suggestion"
                  size="xl"
                />
              </UFormField>
              <UFormField v-else-if="opt.field_type === 'number'" :label="opt.label" :name="`care_${ns.id}_${opt.option_key}`" :required="!!opt.is_required">
                <UInput v-model.number="formDataByService[ns.id].care_options![opt.option_key]" type="number" placeholder="" size="xl" class="w-full" />
              </UFormField>
            </template>
          </template>
        </div>
      </template>
      <div v-else-if="getCategoryOptions(svc.category_id).length" class="space-y-4 mb-4">
        <template v-for="opt in getCategoryOptions(svc.category_id)" :key="`${svc.id}-${opt.option_key}`">
          <UFormField v-if="opt.field_type === 'select'" :label="opt.label" :name="`care_${svc.id}_${opt.option_key}`" :required="!!opt.is_required">
            <USelect
              v-model="formDataByService[svc.id].care_options![opt.option_key]"
              :items="(opt.options || []).map(o => ({ label: o.label, value: o.value }))"
              value-key="value"
              placeholder="Choisissez une option"
              size="xl"
              class="w-full"
              @update:model-value="(v: unknown) => clearAutreDetailUnlessSelected(formDataByService[svc.id].care_options!, opt.option_key, v)"
            />
          </UFormField>
          <UFormField
            v-if="opt.field_type === 'select' && categorySelectHasAutreOption(opt) && isAutreSelectValue(formDataByService[svc.id].care_options![opt.option_key])"
            label="Précisez"
            :name="`care_${svc.id}_${careAutreDetailKey(opt.option_key)}`"
            required
          >
            <CareAutreDetailInput
              v-model="formDataByService[svc.id].care_options![careAutreDetailKey(opt.option_key)]"
              :category-name="svc.name"
              :category-type="svc.type"
              placeholder="Tapez ou choisissez une suggestion"
              size="xl"
            />
          </UFormField>
          <UFormField v-else-if="opt.field_type === 'text'" :label="opt.label" :name="`care_${svc.id}_${opt.option_key}`" :required="!!opt.is_required">
            <CareAutreDetailInput
              v-model="formDataByService[svc.id].care_options![opt.option_key]"
              :category-name="svc.name"
              :category-type="svc.type"
              placeholder="Tapez ou choisissez une suggestion"
              size="xl"
            />
          </UFormField>
          <UFormField v-else-if="opt.field_type === 'number'" :label="opt.label" :name="`care_${svc.id}_${opt.option_key}`" :required="!!opt.is_required">
            <UInput v-model.number="formDataByService[svc.id].care_options![opt.option_key]" type="number" placeholder="" size="xl" class="w-full" />
          </UFormField>
        </template>
      </div>

      <!-- Champs Lab -->
      <div v-if="isBloodTestAppointment(svc.type)" class="space-y-4">
        <UFormField label="Type de prélèvement" :name="`blood_test_type_${svc.id}`" required>
          <URadioGroup v-model="formDataByService[svc.id].blood_test_type" :items="bloodTestTypeOptions" size="xl" variant="list" />
        </UFormField>
        <UFormField v-if="formDataByService[svc.id].blood_test_type === 'multiple'" label="Nombre de jours" :name="`duration_days_${svc.id}`" required>
          <div class="space-y-3">
            <URadioGroup v-model="formDataByService[svc.id].duration_days" :items="multipleDaysOptions" size="xl" variant="list" />
            <UInput
              v-if="formDataByService[svc.id].duration_days === 'custom'"
              v-model.number="formDataByService[svc.id].custom_days"
              type="number"
              placeholder="Nombre de jours"
              min="1"
              size="xl"
              class="w-full"
            />
          </div>
        </UFormField>
      </div>

      <!-- Champs Nursing : lot fusionné (champs communs sur la 1ère entrée panier) -->
      <div v-else-if="hasGroupedNursingActs && isNursingAppointment(svc.type)" class="space-y-4">
        <UFormField label="Prise en charge" :name="`duration_days_${nursingCommonFormId}`" required>
          <div class="space-y-3">
            <USelect
              v-model="formDataByService[nursingCommonFormId].duration_days"
              :items="durationOptions"
              value-key="value"
              placeholder="Choisir la prise en charge"
              size="xl"
              class="w-full"
            />
            <UInput
              v-if="formDataByService[nursingCommonFormId].duration_days === 'custom'"
              v-model.number="formDataByService[nursingCommonFormId].custom_days"
              type="number"
              placeholder="Nombre de jours"
              size="xl"
              class="w-full"
              min="1"
            />
          </div>
        </UFormField>
        <UFormField
          v-if="showNursingFrequency(formDataByService[nursingCommonFormId].duration_days)"
          label="Fréquence des passages"
          :name="`frequency_${nursingCommonFormId}`"
          required
          :key="`freq-${nursingCommonFormId}`"
        >
          <USelect
            v-model="formDataByService[nursingCommonFormId].frequency"
            :items="frequencyOptions"
            value-key="value"
            placeholder="Choisir la fréquence"
            size="xl"
            class="w-full"
          />
        </UFormField>
        <UFormField
          v-if="!hidePreferredNurseGender"
          label="Préférence pour l'infirmier"
          :name="`preferred_nurse_gender_${nursingCommonFormId}`"
        >
          <PreferredNurseGenderButtons v-model="formDataByService[nursingCommonFormId].preferred_nurse_gender" />
        </UFormField>
      </div>

      <!-- Champs Nursing : un seul soin au panier -->
      <div v-else-if="isNursingAppointment(svc.type)" class="space-y-4">
        <UFormField label="Prise en charge" :name="`duration_days_${svc.id}`" required>
          <div class="space-y-3">
            <USelect v-model="formDataByService[svc.id].duration_days" :items="durationOptions" value-key="value" placeholder="Choisir la prise en charge" size="xl" class="w-full" />
            <UInput
              v-if="formDataByService[svc.id].duration_days === 'custom'"
              v-model.number="formDataByService[svc.id].custom_days"
              type="number"
              placeholder="Nombre de jours"
              size="xl"
              class="w-full"
              min="1"
            />
          </div>
        </UFormField>
        <UFormField v-if="showNursingFrequency(formDataByService[svc.id].duration_days)" label="Fréquence des passages" :name="`frequency_${svc.id}`" required :key="`freq-${svc.id}`">
          <USelect v-model="formDataByService[svc.id].frequency" :items="frequencyOptions" value-key="value" placeholder="Choisir la fréquence" size="xl" class="w-full" />
        </UFormField>
        <UFormField
          v-if="isNursingAppointment(svc.type) && !hidePreferredNurseGender"
          label="Préférence pour l'infirmier"
          :name="`preferred_nurse_gender_${svc.id}`"
        >
          <PreferredNurseGenderButtons v-model="formDataByService[svc.id].preferred_nurse_gender" />
        </UFormField>
      </div>
      </template>

      <!-- Préférence infirmier : mini-modal sans ce champ → lot infirmier (wizard date ou formulaire complet). -->
      <div
        v-if="showWizardDatetimeBlocks && hideBookingCareDetails && !hidePreferredNurseGender && isNursingAppointment(svc.type)"
        :class="['mb-4 mt-5 space-y-2 md:mt-6', wizardFlatSectionPad]"
      >
        <UFormField
          label="Préférence pour l'infirmier"
          :name="`preferred_nurse_gender_${notesFieldServiceId(svc)}`"
        >
          <PreferredNurseGenderButtons v-model="formDataByService[notesFieldServiceId(svc)].preferred_nurse_gender" />
        </UFormField>
      </div>

      <!-- Documents du soin — un seul bloc (lot nursing fusionné comme blood) -->
      <div v-if="showWizardDocumentsBlocks" :class="[wizardSectionNormalized === 'documents' ? 'mt-0' : 'mt-4', wizardFlatSectionPad]">
        <BookingWizardSegmentContext
          v-if="showPatientWizardSegmentContext && wizardSectionNormalized === 'documents'"
          mode="documents"
          :selected-services="selectedServices"
          :slot-rows="renderedServices"
          :active-service-id="activeDocumentsServiceId ?? svc.id"
          :slot-index="wizardActiveDocumentsIndex"
          :form-data-by-service="formDataByService"
        />
        <p
          v-if="wizardUseServiceCard && prescriptionDocTypesForServiceCard(svc).length > 0"
          class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2"
        >
          Documents du soin
        </p>
        <div class="flex flex-col gap-2.5">
          <div
            v-for="docType in prescriptionDocTypesForServiceCard(svc)"
            :key="`${docFilesServiceId(svc)}-${docType.key}`"
            class="relative"
          >
            <input
              :ref="(el) => {
                if (el) fileInputRefs[`${docFilesServiceId(svc)}_${docType.key}`] = el as HTMLInputElement;
              }"
              type="file"
              accept="image/*,.pdf"
              class="hidden"
              :aria-label="`Parcourir les fichiers pour ${docType.label}`"
              @change="handleFileSelectMulti($event, docFilesServiceId(svc), docType.key)"
            />
            <button
              type="button"
              :class="[
                'group relative flex w-full cursor-pointer items-start gap-3 rounded-xl border-2 border-dashed px-3 py-3 text-left transition-[border-color,box-shadow,background-color,transform] outline-none duration-150 sm:gap-3.5 sm:px-3.5 sm:py-3',
                'focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-950',
                hasServiceDocFromProfile(docFilesServiceId(svc), docType.key)
                  ? 'border-green-400 bg-green-50 shadow-sm dark:border-green-700 dark:bg-green-900/25'
                  : isDropZoneHot(`${docFilesServiceId(svc)}_${docType.key}`)
                    ? 'scale-[1.005] border-primary-500 bg-primary-50 shadow-md shadow-primary-500/10 ring-2 ring-primary-400/40 dark:border-primary-400 dark:bg-primary-950/35 dark:ring-primary-500/35'
                    : 'border-gray-300 bg-gray-50/40 hover:border-primary-400 hover:bg-primary-50/50 dark:border-gray-600 dark:bg-gray-900/40 dark:hover:border-primary-500 dark:hover:bg-primary-950/25',
              ]"
              :aria-label="`${docType.label} — ajouter un fichier`"
              @click="openFileInputMulti(docFilesServiceId(svc), docType.key)"
              @dragenter.prevent.stop="dropZoneEnter(`${docFilesServiceId(svc)}_${docType.key}`)"
              @dragleave.prevent.stop="dropZoneLeave(`${docFilesServiceId(svc)}_${docType.key}`)"
              @dragover.prevent.stop="onFileDragOver"
              @drop.prevent.stop="handleDropMulti($event, docFilesServiceId(svc), docType.key)"
            >
              <div class="pointer-events-none flex shrink-0 items-start pt-0.5">
                <div
                  class="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-200/90 dark:bg-gray-900 dark:ring-gray-700 sm:h-[42px] sm:w-[42px]"
                >
                  <UIcon
                    :name="docType.icon"
                    class="h-5 w-5 text-primary-600 dark:text-primary-400 sm:h-[22px] sm:w-[22px]"
                    aria-hidden="true"
                  />
                </div>
              </div>
              <div class="pointer-events-none min-w-0 flex-1 space-y-0.5 pt-0.5">
                <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span class="text-sm font-semibold leading-tight text-gray-900 dark:text-white">{{ docType.label }}</span>
                  <UBadge
                    v-if="docType.optional"
                    color="neutral"
                    variant="subtle"
                    size="xs"
                    class="font-medium"
                  >
                    Facultatif
                  </UBadge>
                </div>
                <p class="text-xs leading-snug text-gray-600 dark:text-gray-400">
                  Glissez-déposez votre fichier ici, ou cliquez pour parcourir
                </p>
                <p class="text-[11px] leading-snug text-gray-500 dark:text-gray-500">
                  {{ docType.hint }}
                </p>
                <p
                  v-if="getServiceFiles(docFilesServiceId(svc))[docType.key]"
                  class="truncate text-[11px] font-medium leading-snug text-gray-800 dark:text-gray-200"
                >
                  {{ getServiceFiles(docFilesServiceId(svc))[docType.key]!.name }}
                </p>
                <p
                  v-else-if="
                    !getServiceFiles(docFilesServiceId(svc))[docType.key] && profileDocuments[docType.key]?.file_name
                  "
                  class="truncate text-[11px] font-medium leading-snug text-green-700 dark:text-green-400"
                >
                  {{ profileDocuments[docType.key].file_name }}
                </p>
                <div
                  class="flex items-center gap-1.5 pt-1 text-[11px] font-semibold text-primary-600 dark:text-primary-400"
                >
                  <UIcon
                    v-if="hasServiceDocFromProfile(docFilesServiceId(svc), docType.key)"
                    name="i-lucide-circle-check"
                    class="h-3.5 w-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  <UIcon v-else name="i-lucide-upload-cloud" class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{{
                    hasServiceDocFromProfile(docFilesServiceId(svc), docType.key)
                      ? 'Fichier ajouté'
                      : 'Déposer un fichier'
                  }}</span>
                </div>
              </div>
            </button>
          </div>
        </div>
        <div
          v-if="prescriptionDocTypesForServiceCard(svc).length > 0 && !hasServiceDocFromProfile(docFilesServiceId(svc), 'ordonnance')"
          class="relative mt-3 flex items-center gap-2 overflow-hidden rounded-lg border border-warning/25 bg-warning/10 p-2.5 text-warning sm:p-3 dark:border-warning/20"
        >
          <UIcon name="i-lucide-file-warning" class="size-4 shrink-0 opacity-90" aria-hidden="true" />
          <div class="min-w-0 flex-1">
            <div class="flex min-w-0 items-center justify-between gap-3">
              <p class="min-w-0 flex-1 text-xs font-semibold leading-snug text-amber-950 dark:text-amber-100">
                {{ missingPrescriptionAlertTitle(svc.type) }}
              </p>
              <button
                type="button"
                class="inline-flex shrink-0 items-center gap-0.5 rounded-md border border-current bg-transparent px-2 py-1 text-[11px] font-semibold text-amber-950 transition-colors hover:bg-amber-950/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-900/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent dark:text-amber-100 dark:hover:bg-amber-100/[0.1] dark:focus-visible:ring-amber-100/45"
                :aria-expanded="isCompactWarningOpen(`rx-${docFilesServiceId(svc)}`)"
                @click="toggleCompactWarning(`rx-${docFilesServiceId(svc)}`)"
              >
                {{
                  isCompactWarningOpen(`rx-${docFilesServiceId(svc)}`) ? 'Réduire' : "Plus d'info"
                }}
                <UIcon
                  :name="
                    isCompactWarningOpen(`rx-${docFilesServiceId(svc)}`)
                      ? 'i-lucide-chevron-up'
                      : 'i-lucide-chevron-down'
                  "
                  class="size-3 shrink-0 opacity-85"
                  aria-hidden="true"
                />
              </button>
            </div>
            <div
              v-show="isCompactWarningOpen(`rx-${docFilesServiceId(svc)}`)"
              class="mt-1.5 text-[11px] leading-snug text-gray-700 dark:text-gray-300"
            >
              {{ missingPrescriptionAlertDescription(svc.type) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Message optionnel (unique pour le lot soins fusionné) -->
      <div v-if="showWizardDocumentsBlocks" :class="['mt-4', wizardFlatSectionPad]">
        <div class="flex items-center justify-between gap-3">
          <label class="text-xs font-medium leading-snug text-gray-700 dark:text-gray-300">Souhaitez-vous ajouter un message&nbsp;?</label>
          <USwitch v-model="formDataByService[notesFieldServiceId(svc)].showNotes" class="shrink-0" />
        </div>
        <UFormField v-if="formDataByService[notesFieldServiceId(svc)].showNotes" :name="`notes_${notesFieldServiceId(svc)}`" class="mt-3">
          <UTextarea v-model="formDataByService[notesFieldServiceId(svc)].notes" :rows="3" placeholder="Informations complémentaires..." size="xl" class="w-full" />
        </UFormField>
      </div>
    </UCard>
    </div>

    <!-- « Pour qui ? » et blocs parent (doit rester au-dessus des infos perso) -->
    <slot v-if="showWizardBeneficiarySlot" name="beforeFooter" />

    <!-- Informations personnelles : étape wizard finale = bloc plat (même titre que le H1 page) ; mode complet = encart type carte. -->
    <div
      v-if="showWizardPatientCard"
      :id="patientSectionId || undefined"
      :class="
        wizardSectionNormalized === 'personal'
          ? ['mt-2 sm:mt-3', wizardFlatSectionPad]
          : [
              'mt-8 overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] ring-1 ring-black/5 divide-y divide-gray-100 sm:mt-10',
              'dark:bg-gray-950 dark:ring-white/10 dark:divide-gray-800',
            ]
      "
    >
      <div
        v-if="wizardSectionNormalized !== 'personal'"
        class="flex items-center gap-3 px-4 py-4 sm:gap-4 sm:px-6"
      >
        <UIcon
          name="i-lucide-user"
          class="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400 sm:h-[18px] sm:w-[18px]"
          aria-hidden="true"
        />
        <h3 class="text-base font-semibold text-gray-900 dark:text-white">Informations personnelles</h3>
      </div>

      <div
        :class="
          wizardSectionNormalized === 'personal'
            ? 'flex flex-col gap-4 sm:gap-5'
            : ['space-y-4', 'p-4 sm:p-6']
        "
      >
        <slot name="patientToolbar" />
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UFormField label="Email" name="email" :required="!patientEmailOptional">
            <UInput
              v-model="form.email"
              type="email"
              placeholder="Entrez votre email"
              size="xl"
              class="w-full"
              :disabled="user?.id && !relative && !allowPatientEmailEdit"
              :ui="{ disabled: 'cursor-not-allowed opacity-60', base: user?.id && !relative && !allowPatientEmailEdit ? 'bg-gray-50 dark:bg-gray-900/50' : '' }"
            >
              <template #leading>
                <UIcon name="i-lucide-mail" class="size-5 text-gray-400 dark:text-gray-500" aria-hidden="true" />
              </template>
              <template v-if="user?.id && !relative && !allowPatientEmailEdit" #trailing>
                <UIcon name="i-lucide-lock" class="size-5 text-gray-400" aria-hidden="true" />
              </template>
            </UInput>
            <div
              v-if="patientEmailOptional"
              class="mt-1.5 flex min-h-7 w-full max-w-full items-center gap-1.5 rounded-md border border-amber-300/90 bg-amber-50 px-2 py-0.5 dark:border-amber-500/45 dark:bg-amber-950/55"
              role="note"
              :title="'Sans adresse e-mail patient, l’e-mail de votre compte professionnel est utilisé pour les envois liés à ce rendez-vous.'"
            >
              <UIcon
                name="i-lucide-info"
                class="size-3.5 shrink-0 text-amber-700 dark:text-amber-400"
                aria-hidden="true"
              />
              <span
                class="min-w-0 flex-1 truncate text-[11px] font-medium leading-tight text-amber-950 dark:text-amber-50"
              >
                Facultatif — sans saisie, e-mail du compte pro utilisé pour les envois.
              </span>
            </div>
          </UFormField>
          <UFormField label="Téléphone" name="phone" :required="!patientPhoneOptional">
            <UInput v-model="form.phone" type="tel" placeholder="Entrez votre numéro" size="xl" class="w-full">
              <template #leading>
                <UIcon name="i-lucide-phone" class="size-5 text-gray-400 dark:text-gray-500" aria-hidden="true" />
              </template>
            </UInput>
          </UFormField>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UFormField label="Nom" name="last_name" required>
            <UInput v-model="form.last_name" placeholder="Entrez votre nom" size="xl" class="w-full">
              <template #leading>
                <UIcon name="i-lucide-user" class="size-5 text-gray-400 dark:text-gray-500" aria-hidden="true" />
              </template>
            </UInput>
          </UFormField>
          <UFormField label="Prénom" name="first_name" required>
            <UInput v-model="form.first_name" placeholder="Entrez votre prénom" size="xl" class="w-full">
              <template #leading>
                <UIcon name="i-lucide-circle-user" class="size-5 text-gray-400 dark:text-gray-500" aria-hidden="true" />
              </template>
            </UInput>
          </UFormField>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UFormField label="Genre" name="gender" required>
            <USelect
              v-model="form.gender"
              :items="genderOptions"
              placeholder="Sélectionner votre genre"
              size="xl"
              class="w-full"
              leading-icon="i-lucide-venus-and-mars"
            />
          </UFormField>
          <UFormField label="Date de naissance" name="birth_date" required>
            <div class="flex space-x-2">
              <USelect v-model="birthDay" :items="dayOptions" placeholder="Jour" size="xl" class="flex-1" />
              <USelect v-model="birthMonth" :items="monthOptions" placeholder="Mois" size="xl" class="flex-1" />
              <USelect v-model="birthYear" :items="yearOptions" placeholder="Année" size="xl" class="flex-1" />
            </div>
          </UFormField>
        </div>
        <AddressSelector
          v-model="form.address"
          label="Adresse"
          name="address"
          required
          :show-complement="true"
          :complement-value="form.address_complement"
          @update:complement="form.address_complement = $event"
        />

        <!-- Documents personnels : même disposition que les pièces « ordonnance » (horizontal + badge Facultatif). -->
        <div class="mt-3 sm:mt-4">
          <div class="mb-2 flex items-center justify-between gap-2">
            <p class="text-xs font-medium text-gray-500 dark:text-gray-400">Documents personnels</p>
            <p v-if="loadingProfileDocuments" class="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
              <UIcon name="i-lucide-loader-2" class="h-3.5 w-3.5 shrink-0 animate-spin" />
              Chargement…
            </p>
          </div>
          <div class="flex flex-col gap-2.5">
            <div
              v-for="docType in personalDocTypes"
              :key="docType.key"
              class="relative"
            >
              <input
                :ref="(el) => { if (el) fileInputRefs[`personal_${docType.key}`] = el as HTMLInputElement }"
                type="file"
                accept="image/*,.pdf"
                class="hidden"
                :aria-label="`Parcourir les fichiers pour ${docType.label}`"
                @change="handleFileSelectPersonal($event, docType.key)"
              />
              <button
                type="button"
                :class="[
                  'group relative flex w-full cursor-pointer items-start gap-3 rounded-xl border-2 border-dashed px-3 py-3 text-left transition-[border-color,box-shadow,background-color,transform] outline-none duration-150 sm:gap-3.5 sm:px-3.5 sm:py-3',
                  'focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-950',
                  hasPersonalDocFromProfile(docType.key)
                    ? 'border-green-400 bg-green-50 shadow-sm dark:border-green-700 dark:bg-green-900/25'
                    : isDropZoneHot(`personal_${docType.key}`)
                      ? 'scale-[1.005] border-primary-500 bg-primary-50 shadow-md shadow-primary-500/10 ring-2 ring-primary-400/40 dark:border-primary-400 dark:bg-primary-950/35 dark:ring-primary-500/35'
                      : 'border-gray-300 bg-gray-50/40 hover:border-primary-400 hover:bg-primary-50/50 dark:border-gray-600 dark:bg-gray-900/40 dark:hover:border-primary-500 dark:hover:bg-primary-950/25',
                ]"
                :aria-label="`${docType.label} — ajouter un fichier`"
                @click="openFileInputPersonal(docType.key)"
                @dragenter.prevent.stop="dropZoneEnter(`personal_${docType.key}`)"
                @dragleave.prevent.stop="dropZoneLeave(`personal_${docType.key}`)"
                @dragover.prevent.stop="onFileDragOver"
                @drop.prevent.stop="handleDropPersonal($event, docType.key)"
              >
                <div class="pointer-events-none flex shrink-0 items-start pt-0.5">
                  <div
                    class="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-200/90 dark:bg-gray-900 dark:ring-gray-700 sm:h-[42px] sm:w-[42px]"
                  >
                    <UIcon
                      :name="docType.icon"
                      class="h-5 w-5 text-primary-600 dark:text-primary-400 sm:h-[22px] sm:w-[22px]"
                      aria-hidden="true"
                    />
                  </div>
                </div>
                <div class="pointer-events-none min-w-0 flex-1 space-y-0.5 pt-0.5">
                  <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span class="text-sm font-semibold leading-tight text-gray-900 dark:text-white">{{ docType.label }}</span>
                    <UBadge
                      v-if="docType.optional"
                      color="neutral"
                      variant="subtle"
                      size="xs"
                      class="font-medium"
                    >
                      Facultatif
                    </UBadge>
                  </div>
                  <p class="text-xs leading-snug text-gray-600 dark:text-gray-400">
                    Glissez-déposez votre fichier ici, ou cliquez pour parcourir
                  </p>
                  <p class="text-[11px] leading-snug text-gray-500 dark:text-gray-500">
                    {{ personalDocHints[docType.key] ?? 'PDF, JPG ou PNG — jusqu’à 25 Mo' }}
                  </p>
                  <p
                    v-if="form.personalFiles?.[docType.key]"
                    class="truncate text-[11px] font-medium leading-snug text-gray-800 dark:text-gray-200"
                  >
                    {{ form.personalFiles[docType.key]!.name }}
                  </p>
                  <p
                    v-else-if="profileDocuments[docType.key]?.file_name"
                    class="truncate text-[11px] font-medium leading-snug text-green-700 dark:text-green-400"
                  >
                    {{ profileDocuments[docType.key].file_name }}
                  </p>
                  <div
                    class="flex items-center gap-1.5 pt-1 text-[11px] font-semibold text-primary-600 dark:text-primary-400"
                  >
                    <UIcon
                      v-if="hasPersonalDocFromProfile(docType.key)"
                      name="i-lucide-circle-check"
                      class="h-3.5 w-3.5 shrink-0"
                      aria-hidden="true"
                    />
                    <UIcon v-else name="i-lucide-upload-cloud" class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{{ hasPersonalDocFromProfile(docType.key) ? 'Fichier ajouté' : 'Déposer un fichier' }}</span>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div :class="wizardFlatSectionPad">
      <slot name="footer" />
    </div>
  </UForm>
</template>

<script setup lang="ts">
import { reactive, ref, watch, onMounted, computed, nextTick } from 'vue';
import { apiFetch } from '~/utils/api';
import { MIN_BIRTH_YEAR } from '~/constants/birth-date';
import { NURSING_DURATION_OPTIONS, NURSING_FREQUENCY_OPTIONS, showNursingFrequency } from '~/constants/nursing-duration';
import {
  AVAILABILITY_MIN_SPAN_HOURS,
  AVAILABILITY_MAX_HOUR_BLOOD_TEST,
  AVAILABILITY_MAX_HOUR_NURSING,
} from '~/constants/availability-slot';
import { MAX_UPLOAD_BYTES } from '~/constants/upload-limits';
import { getBloodTestPremiumDayKind, type PremiumDayKind } from '~/utils/french-public-holidays';
import { isBloodTestAppointment, isNursingAppointment } from '~/utils/appointment-type-rules';
import { careCategoryEmojiForCategory, isCareCategoryEmoji } from '@oneandlab/shared-utils';
import { resolveCareCategoryImageSrc } from '~/utils/care-icons';
import {
  careAutreDetailKey,
  categorySelectHasAutreOption,
  isAutreSelectValue,
  stripOrphanAutreDetailKeys,
} from '~/utils/care-category-autre-detail';
import { buildBookingWizardSegmentIntro } from '~/utils/booking-wizard-segment';
import { servicesRequiringOwnSlots } from '~/utils/dashboard-unified-rdv';
import { availabilitySliderMinHourParis } from '~/utils/booking-paris-availability';
import { normalizeCategorySkipPrescriptionDocuments } from '~/utils/category-skip-prescription-documents';

const props = defineProps<{
  modelValue: any;
  selectedServices: Array<{
    id: string;
    type: string;
    name: string;
    category_id: string | null;
    skip_prescription_documents?: boolean;
    icon?: string;
    category_image_url?: string | null;
  }>;
  categories?: Array<{
    id: string;
    skip_prescription_documents?: boolean;
    options?: Array<{
      option_key: string;
      label: string;
      field_type: string;
      options?: { value: string; label: string }[];
      is_required?: boolean;
      sort_order?: number;
    }>;
  }>;
  relative?: any;
  hidePersonalInfo?: boolean;
  /**
   * Pro / infirmier / lab (wizard dashboard) : id du patient pour charger ses pièces (carte Vitale, mutuelle…)
   * via GET /patient-documents?user_id= — fusionnées au RDV comme AppointmentForm (copie medical_documents).
   */
  patientDocumentUserId?: string | null;
  /** Ancrage scroll (validation wizard) sur la carte infos patient. */
  patientSectionId?: string;
  /** Wizard dashboard : l’email saisi est celui du patient, pas verrouillé sur le compte connecté. */
  allowPatientEmailEdit?: boolean;
  /** Wizard dashboard : ne pas préremplir nom/adresse avec le profil du professionnel connecté. */
  skipLoggedInPatientPrefill?: boolean;
  /** Wizard pro / infirmier / lab / sous-compte / admin : champ email patient non obligatoire (nouveau patient). */
  patientEmailOptional?: boolean;
  /** Wizard admin : champ téléphone patient non obligatoire (nouveau patient). */
  patientPhoneOptional?: boolean;
  /** Espace infirmier : pas de choix patient (le RDV est pour un de ses patients, assigné à lui — pas de file d’attente pour les autres). */
  hidePreferredNurseGender?: boolean;
  minLeadTimeHours?: number | null;
  acceptSaturday?: boolean;
  acceptSunday?: boolean;
  /** Parcours `/rendez-vous/nouveau` : options métier déjà renseignées avant l’étape formulaire (mini-modal liste des soins). */
  hideBookingCareDetails?: boolean;
  /**
   * Wizard patient post-sélection : `all` = formulaire complet (dashboard, défaut).
   * Sinon une seule section à la fois (dates par lot, documents, infos perso).
   */
  bookingWizardSection?: 'all' | 'slot-datetime' | 'documents' | 'personal';
  /** Représentant du lot courant (id service) quand `bookingWizardSection === 'slot-datetime'`. */
  activeSlotServiceId?: string | null;
  /** Représentant du lot courant quand `bookingWizardSection === 'documents'` (une carte / une étape à la fois). */
  activeDocumentsServiceId?: string | null;
  /** Parcours `/rendez-vous/nouveau` : onglet Horaire VIP + paiement Stripe (blood only, pas wizards pro). */
  patientBookingUrgencyStripe?: boolean;
}>();

const config = useRuntimeConfig();

function serviceHeaderEmoji(svc: { type: string; name: string; icon?: string | null }) {
  return careCategoryEmojiForCategory({
    name: svc.name,
    icon: svc.icon ?? null,
    type: svc.type,
  });
}

function serviceHeaderImageSrc(svc: { category_image_url?: string | null; icon?: string | null }) {
  if (isCareCategoryEmoji(svc.icon)) return null;
  return resolveCareCategoryImageSrc(svc.category_image_url ?? null, config.public.apiBase);
}

const emit = defineEmits<{
  'update:modelValue': [value: any];
  submit: [value: any];
}>();

const { user } = useAuth();

const hasLabService = computed(() => props.selectedServices.some(s => isBloodTestAppointment(s.type)));
const isMultiServices = computed(() => props.selectedServices.length > 1);
const bloodServices = computed(() => props.selectedServices.filter(s => isBloodTestAppointment(s.type)));
/** Plusieurs prélèvements : une seule carte lab (même avec des soins infirmiers dans le panier). */
const hasGroupedBloodActs = computed(() => bloodServices.value.length > 1);
const nursingServices = computed(() => props.selectedServices.filter((s) => isNursingAppointment(s.type)));
const hasGroupedNursingActs = computed(() => nursingServices.value.length > 1);
/** Champs communs (durée, notes…) rattachés au 1er acte infirmier dans l’ordre du panier. */
const nursingCommonFormId = computed(() => nursingServices.value[0]?.id ?? '');
/** Même jeu et ordre que la validation wizard (soins infirmiers puis prélèvement). */
const renderedServices = computed(() => servicesRequiringOwnSlots(props.selectedServices));

const wizardSectionNormalized = computed(() => props.bookingWizardSection ?? 'all');

const patientBookingUrgencyStripeFlag = computed(() => props.patientBookingUrgencyStripe === true);

const wizardServiceCards = computed(() => {
  const list = renderedServices.value;
  const ws = wizardSectionNormalized.value;
  if (ws === 'personal') return [];
  if (ws === 'slot-datetime' && props.activeSlotServiceId) {
    const hit = list.find((s) => s.id === props.activeSlotServiceId);
    return hit ? [hit] : [];
  }
  if (ws === 'documents' && props.activeDocumentsServiceId) {
    const hit = list.find((s) => s.id === props.activeDocumentsServiceId);
    return hit ? [hit] : [];
  }
  return list;
});

const showWizardDatetimeBlocks = computed(
  () => wizardSectionNormalized.value === 'all' || wizardSectionNormalized.value === 'slot-datetime',
);
const showWizardCareDetailBlocks = computed(() => wizardSectionNormalized.value === 'all');
const showWizardDocumentsBlocks = computed(
  () => wizardSectionNormalized.value === 'all' || wizardSectionNormalized.value === 'documents',
);
const showWizardBeneficiarySlot = computed(
  () => wizardSectionNormalized.value === 'all' || wizardSectionNormalized.value === 'personal',
);
/** Formulaire dashboard : carte complète ; parcours patient wizard : carte plate. */
const wizardUseServiceCard = computed(() => wizardSectionNormalized.value === 'all');
/** En-tête bloc soin dans la carte (parcours patient : titre + pastilles dans RendezVousFormStep). */
const showWizardServiceHeaderInCard = computed(() => wizardUseServiceCard.value);
/** Padding horizontal mobile quand la carte « soin » est plate (parcours wizard patient). */
const wizardFlatSectionPad = computed(() => (wizardUseServiceCard.value ? '' : 'px-4 sm:px-0'));

/** Bandeau stepper + carte soin (parcours patient `/rendez-vous/nouveau`). */
const showPatientWizardSegmentContext = computed(
  () =>
    !wizardUseServiceCard.value &&
    (wizardSectionNormalized.value === 'slot-datetime' ||
      wizardSectionNormalized.value === 'documents'),
);

const wizardActiveSlotIndex = computed(() => {
  const id = props.activeSlotServiceId;
  if (!id) return 0;
  const i = renderedServices.value.findIndex((s) => s.id === id);
  return i >= 0 ? i : 0;
});

const wizardActiveDocumentsIndex = computed(() => {
  const id = props.activeDocumentsServiceId;
  if (!id) return 0;
  const i = renderedServices.value.findIndex((s) => s.id === id);
  return i >= 0 ? i : 0;
});

const wizardDateFieldLabel = computed(() => {
  if (wizardUseServiceCard.value) return 'Date souhaitée';
  const intro = buildBookingWizardSegmentIntro(
    props.selectedServices,
    props.activeSlotServiceId ?? null,
    String(config.public.apiBase ?? ''),
  );
  if (intro?.kind === 'blood') return 'Jour du prélèvement';
  if (intro?.kind === 'nursing') return 'Jour des soins à domicile';
  return 'Jour d’intervention';
});

const showWizardPatientCard = computed(() => {
  if (props.hidePersonalInfo) return false;
  const ws = wizardSectionNormalized.value;
  return ws === 'all' || ws === 'personal';
});

function wizardDocumentBadgeLines(svc: (typeof props.selectedServices)[number]) {
  if (hasGroupedBloodActs.value && isBloodTestAppointment(svc.type)) {
    return bloodServices.value.map((s) => ({
      id: s.id,
      name: s.name,
      emoji: serviceHeaderEmoji(s),
      imageSrc: serviceHeaderImageSrc(s),
      iconName: s.icon || 'i-lucide-droplet',
    }));
  }
  if (hasGroupedNursingActs.value && isNursingAppointment(svc.type)) {
    return nursingServices.value.map((s) => ({
      id: s.id,
      name: s.name,
      emoji: serviceHeaderEmoji(s),
      imageSrc: serviceHeaderImageSrc(s),
      iconName: s.icon || 'i-lucide-heart-pulse',
    }));
  }
  return [
    {
      id: svc.id,
      name: svc.name,
      emoji: serviceHeaderEmoji(svc),
      imageSrc: serviceHeaderImageSrc(svc),
      iconName: svc.icon || (isBloodTestAppointment(svc.type) ? 'i-lucide-droplet' : 'i-lucide-heart-pulse'),
    },
  ];
}

const form = reactive({
  last_name: '',
  first_name: '',
  birth_date: '',
  phone: '',
  email: '',
  address: null as any,
  address_complement: '',
  scheduled_at: '',
  availability: '',
  availability_type: 'all_day',
  files: {} as Record<string, File>,
  personalFiles: {} as Record<string, File>,
  gender: '',
});

/** Compteur par zone pour un surlignage drag & drop stable (évite les flickers dragleave). */
const dropZoneDepth = reactive<Record<string, number>>({});

function dropZoneEnter(key: string) {
  dropZoneDepth[key] = (dropZoneDepth[key] ?? 0) + 1;
}

function dropZoneLeave(key: string) {
  const next = (dropZoneDepth[key] ?? 1) - 1;
  if (next <= 0) delete dropZoneDepth[key];
  else dropZoneDepth[key] = next;
}

function dropZoneReset(key: string) {
  delete dropZoneDepth[key];
}

function isDropZoneHot(key: string): boolean {
  return (dropZoneDepth[key] ?? 0) > 0;
}

function onFileDragOver(e: DragEvent) {
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
}
const fileInputRefs = ref<Record<string, HTMLInputElement>>({});

/** Accordéons « Plus d'info » (alertes premium / ordonnance). */
const compactWarningOpen = ref<Record<string, boolean>>({});

function toggleCompactWarning(key: string) {
  compactWarningOpen.value = { ...compactWarningOpen.value, [key]: !compactWarningOpen.value[key] };
}

function isCompactWarningOpen(key: string): boolean {
  return !!compactWarningOpen.value[key];
}

type ServiceFormData = {
  blood_test_type?: string;
  duration_days?: string;
  custom_days?: number | null;
  frequency?: string;
  /** Soins infirmiers uniquement : préférence de genre pour le dispatch */
  preferred_nurse_gender?: 'any' | 'female' | 'male';
  care_options?: Record<string, string | number>;
  scheduled_at?: string;
  availability?: string;
  availability_type?: string;
  availabilityRange?: [number, number];
  /** Heure cible 6–19 (onglet Horaire VIP — patient prise de sang). */
  urgentHour?: number;
  /** Minutes 0|15|30|45 — onglet Horaire VIP, mode heure précise. */
  urgentMinute?: number;
  /** `asap` = le plus vite possible ; `scheduled` = heure précise. */
  urgentTimingMode?: 'asap' | 'scheduled';
  files?: Record<string, File>;
  notes?: string;
  showNotes?: boolean;
};
const formDataByService = reactive<Record<string, ServiceFormData>>({});

/** Évite boucle emit → modelValue → assign pendant la synchro depuis le parent (brouillon / restauration). */
const syncingFromParent = ref(false);

const birthDay = ref<number | null>(null);
const birthMonth = ref<number | null>(null);
const birthYear = ref<number | null>(null);

const currentYear = new Date().getFullYear();
const dayOptions = Array.from({ length: 31 }, (_, i) => ({ label: i + 1, value: i + 1 }));
const monthOptions = [
  { label: 'Janvier', value: 1 }, { label: 'Février', value: 2 }, { label: 'Mars', value: 3 },
  { label: 'Avril', value: 4 }, { label: 'Mai', value: 5 }, { label: 'Juin', value: 6 },
  { label: 'Juillet', value: 7 }, { label: 'Août', value: 8 }, { label: 'Septembre', value: 9 },
  { label: 'Octobre', value: 10 }, { label: 'Novembre', value: 11 }, { label: 'Décembre', value: 12 },
];
const yearOptions = Array.from({ length: currentYear - MIN_BIRTH_YEAR + 1 }, (_, i) => ({
  label: String(MIN_BIRTH_YEAR + i),
  value: MIN_BIRTH_YEAR + i,
})).reverse();

const genderOptions = [
  { label: 'Homme', value: 'male' },
  { label: 'Femme', value: 'female' },
  { label: 'Autre', value: 'other' },
];

function formatHourFr(h: number): string {
  const n = Math.floor(h);
  return `${n}h${Math.round((h - n) * 60).toString().padStart(2, '0')}`;
}

const AVAILABILITY_MIN = 6;

function availabilityMaxHour(serviceType: string): number {
  return isBloodTestAppointment(serviceType) ? AVAILABILITY_MAX_HOUR_BLOOD_TEST : AVAILABILITY_MAX_HOUR_NURSING;
}

function availabilityRangeSliderMinForService(svc: { id: string; type: string }): number {
  return availabilitySliderMinHourParis(
    formDataByService[svc.id]?.scheduled_at,
    availabilityMaxHour(svc.type),
    AVAILABILITY_MIN,
  );
}

const bloodTestTypeOptions = [
  { label: 'Une seule fois', value: 'single' },
  { label: 'Plusieurs prélèvements sur plusieurs jours', value: 'multiple' },
];

const multipleDaysOptions = [
  { label: '2 jours', value: '2' }, { label: '3 jours', value: '3' }, { label: '5 jours', value: '5' },
  { label: '7 jours', value: '7' }, { label: '10 jours', value: '10' }, { label: '15 jours', value: '15' },
  { label: 'Personnalisé', value: 'custom' },
];

const frequencyOptions = NURSING_FREQUENCY_OPTIONS;
const durationOptions = NURSING_DURATION_OPTIONS;

const personalDocTypes: Array<{ key: string; label: string; icon: string; optional?: boolean }> = [
  { key: 'carte_vitale', label: 'Carte Vitale', icon: 'i-lucide-credit-card', optional: true },
  { key: 'carte_mutuelle', label: 'Carte Mutuelle', icon: 'i-lucide-shield', optional: true },
];
const serviceDocTypes: Array<{
  key: string;
  label: string;
  icon: string;
  hint: string;
  optional?: boolean;
}> = [
  {
    key: 'ordonnance',
    label: 'Ordonnance',
    icon: 'i-lucide-file-text',
    hint: 'PDF, JPG ou PNG — jusqu’à 25 Mo',
  },
  {
    key: 'autres_assurances',
    label: 'Autre prescription',
    icon: 'i-lucide-file-stack',
    optional: true,
    hint: 'Document complémentaire (facultatif)',
  },
];

function categorySkipsPrescriptionFromCatalog(categoryId: string | null | undefined): boolean {
  if (categoryId == null || String(categoryId).trim() === '') return false;
  const c = props.categories?.find((x) => String(x.id) === String(categoryId));
  return normalizeCategorySkipPrescriptionDocuments(c?.skip_prescription_documents);
}

/** Ordonnance + autre prescription : masqués si l’option catalogue est activée pour ce soin. */
function prescriptionDocTypesForServiceCard(svc: { category_id: string | null; skip_prescription_documents?: unknown }) {
  if (normalizeCategorySkipPrescriptionDocuments(svc.skip_prescription_documents)) return [];
  if (categorySkipsPrescriptionFromCatalog(svc.category_id)) return [];
  return serviceDocTypes;
}

const personalDocHints: Record<string, string> = {
  carte_vitale: 'Recto recommandé — PDF, JPG ou PNG',
  carte_mutuelle: 'Carte ou attestation — PDF, JPG ou PNG',
};

const profileDocuments = ref<Record<string, any>>({});
const loadingProfileDocuments = ref(false);

function hasPersonalDocFromProfile(key: string) {
  return !!(form.personalFiles?.[key as keyof typeof form.personalFiles] || profileDocuments.value[key]?.file_name);
}

watch(() => props.selectedServices, (svcs) => {
  svcs?.forEach(s => {
    if (!formDataByService[s.id]) {
      const base: ServiceFormData = isBloodTestAppointment(s.type)
        ? { blood_test_type: 'single', urgentHour: 9, urgentMinute: 0, urgentTimingMode: 'scheduled' }
        : { duration_days: '1', preferred_nurse_gender: 'any' };
      formDataByService[s.id] = {
        ...base,
        care_options: {},
        scheduled_at: '',
        availability_type: 'all_day',
        availabilityRange: [9, 11],
        files: {},
        notes: '',
        showNotes: false,
      };
    } else {
      const cur = formDataByService[s.id];
      if (cur.care_options === undefined) cur.care_options = {};
      if (cur.notes === undefined) cur.notes = '';
      if (cur.showNotes === undefined) cur.showNotes = false;
      if (cur.scheduled_at === undefined) cur.scheduled_at = '';
      if (cur.availability_type === undefined) cur.availability_type = 'all_day';
      if (cur.availabilityRange === undefined) cur.availabilityRange = [9, 11];
      if (cur.files === undefined) cur.files = {};
      if (isBloodTestAppointment(s.type) && cur.urgentHour === undefined) cur.urgentHour = 9;
      if (isBloodTestAppointment(s.type) && cur.urgentMinute === undefined) cur.urgentMinute = 0;
      if (isBloodTestAppointment(s.type) && cur.urgentTimingMode === undefined) cur.urgentTimingMode = 'scheduled';
      if (isNursingAppointment(s.type) && cur.preferred_nurse_gender === undefined) cur.preferred_nurse_gender = 'any';
    }
  });
}, { immediate: true, deep: true });

// Enforcer l'écart minimum et les bornes max par type de soin (+ plancher jour même, heure de Paris)
watch(formDataByService, () => {
  props.selectedServices.forEach((s) => {
    const max = availabilityMaxHour(s.type);
    const range = formDataByService[s.id]?.availabilityRange;
    if (!range || !Array.isArray(range) || range.length !== 2) return;
    const smin = availabilitySliderMinHourParis(formDataByService[s.id]?.scheduled_at, max, AVAILABILITY_MIN);
    let lo = Math.max(smin, Math.min(max, range[0]));
    let hi = Math.max(smin, Math.min(max, range[1]));
    if (hi < lo) [lo, hi] = [hi, lo];
    if (hi - lo < AVAILABILITY_MIN_SPAN_HOURS) {
      hi = Math.min(max, lo + AVAILABILITY_MIN_SPAN_HOURS);
    }
    if (lo !== range[0] || hi !== range[1]) {
      formDataByService[s.id].availabilityRange = [lo, hi];
    }
  });
}, { deep: true });

watch([birthYear, birthMonth, birthDay], () => {
  if (birthYear.value && birthMonth.value && birthDay.value) {
    form.birth_date = `${birthYear.value}-${String(birthMonth.value).padStart(2, '0')}-${String(birthDay.value).padStart(2, '0')}`;
  } else {
    form.birth_date = '';
  }
});

watch(() => form.birth_date, (d) => {
  if (d) {
    const [y, m, day] = d.split('-');
    if (y && m && day) {
      birthYear.value = parseInt(y);
      birthMonth.value = parseInt(m);
      birthDay.value = parseInt(day);
    }
  }
}, { immediate: true });

const MODEL_VALUE_META_KEYS = new Set(['formDataByService', 'selectedServices', 'isMultiServices', 'form_data']);

watch(
  () => props.modelValue,
  (v) => {
    if (!v || typeof v !== 'object') return;
    syncingFromParent.value = true;
    try {
      for (const key of Object.keys(v)) {
        if (MODEL_VALUE_META_KEYS.has(key)) continue;
        if (key in form) {
          (form as Record<string, unknown>)[key] = (v as Record<string, unknown>)[key];
        }
      }
      if (v.personalFiles && typeof v.personalFiles === 'object') {
        form.personalFiles = { ...v.personalFiles };
      }
      if (v.birth_date) {
        const [y, m, d] = v.birth_date.split('-');
        if (y && m && d) {
          birthYear.value = parseInt(y);
          birthMonth.value = parseInt(m);
          birthDay.value = parseInt(d);
        }
      }
      if (v.formDataByService) {
        for (const svc of props.selectedServices) {
          const prev = v.formDataByService[svc.id];
          if (prev && formDataByService[svc.id]) {
            if (prev.notes !== undefined) formDataByService[svc.id].notes = prev.notes;
            if (prev.showNotes !== undefined) formDataByService[svc.id].showNotes = prev.showNotes;
            if (prev.care_options !== undefined) formDataByService[svc.id].care_options = { ...prev.care_options };
            if (prev.scheduled_at !== undefined) formDataByService[svc.id].scheduled_at = prev.scheduled_at;
            if (prev.availability_type !== undefined) formDataByService[svc.id].availability_type = prev.availability_type;
            if (prev.availabilityRange !== undefined) formDataByService[svc.id].availabilityRange = [...prev.availabilityRange];
            if (prev.urgentHour !== undefined) formDataByService[svc.id].urgentHour = prev.urgentHour;
            if (prev.urgentMinute !== undefined) formDataByService[svc.id].urgentMinute = prev.urgentMinute;
            if (prev.urgentTimingMode !== undefined) formDataByService[svc.id].urgentTimingMode = prev.urgentTimingMode;
            if (prev.files !== undefined) formDataByService[svc.id].files = { ...prev.files };
            if (prev.preferred_nurse_gender !== undefined) {
              formDataByService[svc.id].preferred_nurse_gender = prev.preferred_nurse_gender;
            }
            if (prev.availability !== undefined) formDataByService[svc.id].availability = prev.availability;
            if (prev.blood_test_type !== undefined) formDataByService[svc.id].blood_test_type = prev.blood_test_type;
            if (prev.duration_days !== undefined) formDataByService[svc.id].duration_days = prev.duration_days;
            if (prev.custom_days !== undefined) formDataByService[svc.id].custom_days = prev.custom_days;
            if (prev.frequency !== undefined) formDataByService[svc.id].frequency = prev.frequency;
            if (
              prev.availability &&
              typeof prev.availability === 'string' &&
              prev.availability.includes('"type"')
            ) {
              try {
                const av = JSON.parse(prev.availability) as { type?: string; asap?: boolean; hour?: number; minute?: number; mode?: string };
                const typ = String(av?.type ?? '').toLowerCase();
                if (typ === 'urgent') {
                  const asap = av.asap === true || String(av.mode ?? '') === 'asap';
                  formDataByService[svc.id].urgentTimingMode = asap ? 'asap' : 'scheduled';
                  if (!asap) {
                    if (typeof av.hour === 'number') formDataByService[svc.id].urgentHour = av.hour;
                    const m = Number(av.minute);
                    formDataByService[svc.id].urgentMinute = [0, 15, 30, 45].includes(m) ? m : 0;
                  }
                }
              } catch {
                /* ignore */
              }
            }
          }
        }
      }
    } finally {
      nextTick(() => {
        syncingFromParent.value = false;
      });
    }
  },
  { deep: true, immediate: true },
);

const loadProfileDocuments = async () => {
  if (!user.value?.id) return;

  let url: string | null = null;
  const rawPid = props.patientDocumentUserId;
  const patientId =
    rawPid != null && String(rawPid).trim() !== '' ? String(rawPid).trim() : '';

  if (props.relative?.id) {
    url = `/patient-documents?relative_id=${encodeURIComponent(String(props.relative.id))}`;
  } else if (patientId) {
    url = `/patient-documents?user_id=${encodeURIComponent(patientId)}`;
  } else if (user.value.role === 'patient') {
    url = '/patient-documents';
  } else {
    profileDocuments.value = {};
    return;
  }

  profileDocuments.value = {};
  loadingProfileDocuments.value = true;
  try {
    const res = await apiFetch(url, { method: 'GET' });
    if (res.success && Array.isArray(res.data)) {
      res.data.forEach((doc: any) => {
        if (doc.document_type) profileDocuments.value[doc.document_type] = doc;
      });
    }
  } catch {
    profileDocuments.value = {};
  } finally {
    loadingProfileDocuments.value = false;
  }
};

watch(
  () => [props.patientDocumentUserId, props.relative?.id, user.value?.id] as const,
  () => {
    void loadProfileDocuments();
  },
  { immediate: true },
);

const prefillForm = async () => {
  if (props.skipLoggedInPatientPrefill) {
    return;
  }
  if (user.value?.id && !props.relative) {
    try {
      const { fetchCurrentUser } = useAuth();
      const u = await fetchCurrentUser();
      if (u) {
        form.first_name = u.first_name || '';
        form.last_name = u.last_name || '';
        form.birth_date = u.birth_date || '';
        form.gender = u.gender || '';
        form.email = u.email || '';
        form.phone = u.phone || '';
        form.address = u.address || null;
        form.address_complement = u.address?.complement || '';
      }
    } catch {}
  } else if (props.relative) {
    form.first_name = props.relative.first_name || '';
    form.last_name = props.relative.last_name || '';
    form.birth_date = props.relative.birth_date || '';
    form.gender = props.relative.gender || '';
    form.email = props.relative.email || user.value?.email || '';
    form.phone = props.relative.phone || user.value?.phone || '';
    form.address = props.relative.address || null;
  }
};

function getCategoryOptions(categoryId: string | null | undefined) {
  if (categoryId == null || String(categoryId).trim() === '') return [];
  const cat = props.categories?.find((c) => String(c.id) === String(categoryId));
  const opts = cat?.options ?? [];
  return opts.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

function clearAutreDetailUnlessSelected(
  co: Record<string, string | number>,
  optionKey: string,
  value: unknown,
): void {
  if (isAutreSelectValue(value)) return;
  const dk = careAutreDetailKey(optionKey);
  if (co[dk] !== undefined && co[dk] !== '') co[dk] = '';
}

function unifiedFormCareAutreValidationError(): string | null {
  for (const svc of props.selectedServices) {
    const co = formDataByService[svc.id]?.care_options;
    if (!co) continue;
    for (const opt of getCategoryOptions(svc.category_id)) {
      if (opt.field_type !== 'select' || !categorySelectHasAutreOption(opt)) continue;
      if (!isAutreSelectValue(co[opt.option_key])) continue;
      const dk = careAutreDetailKey(opt.option_key);
      const d = co[dk];
      if (d === '' || d == null || String(d).trim() === '') {
        return `« ${opt.label} » : précisez votre choix (Autre) — ${svc.name}`;
      }
    }
  }
  return null;
}

function getServiceFiles(svcId: string): Record<string, File> {
  return formDataByService[svcId]?.files ?? {};
}

/** Fichier joint au RDV ou pièce déjà enregistrée sur le dossier patient (ordonnance, autre prescription…). */
function hasServiceDocFromProfile(svcId: string, docKey: string): boolean {
  return !!(getServiceFiles(svcId)[docKey] || profileDocuments.value[docKey]);
}

function servicePremiumDayKind(svcId: string): PremiumDayKind | null {
  return getBloodTestPremiumDayKind(formDataByService[svcId]?.scheduled_at);
}

function servicePremiumDayAlertTitle(svcId: string, serviceType: string): string {
  const k = servicePremiumDayKind(svcId);
  const homeLabel = isBloodTestAppointment(serviceType) ? 'Prélèvement' : 'Soins infirmiers';
  if (k === 'sunday') return `${homeLabel} un dimanche`;
  if (k === 'holiday') return `${homeLabel} un jour férié`;
  if (k === 'both') return `${homeLabel} un dimanche férié`;
  return '';
}

function servicePremiumDayAlertDescription(svcId: string): string {
  const k = servicePremiumDayKind(svcId);
  const suite =
    'Des frais de déplacement ou une majoration peuvent s’appliquer par rapport à un créneau ouvré classique. Le détail vous sera communiqué par le laboratoire ou le professionnel avant ou lors de l’intervention.';
  if (k === 'sunday') {
    return `Les interventions à domicile le dimanche sont souvent soumises à des conditions tarifaires spécifiques. ${suite}`;
  }
  if (k === 'holiday') {
    return `Les interventions à domicile un jour férié (férié légal en France métropolitaine) peuvent entraîner un supplément lié au déplacement. ${suite}`;
  }
  if (k === 'both') {
    return `Ce jour tombe un dimanche et un jour férié : des majorations ou frais complémentaires sont possibles. ${suite}`;
  }
  return '';
}

function missingPrescriptionAlertTitle(serviceType: string): string {
  return isBloodTestAppointment(serviceType)
    ? 'Prélèvement sans ordonnance médicale'
    : 'Soins sans prescription médicale';
}

function missingPrescriptionAlertDescription(serviceType: string): string {
  if (isBloodTestAppointment(serviceType)) {
    return (
      'Sans prescription médicale, les actes de biologie médicale ne sont en principe pas pris en charge par l’Assurance Maladie et ' +
      'restent intégralement à votre charge. Une participation de votre complémentaire santé n’est possible que dans le cadre ' +
      'des garanties prévues par votre contrat.'
    );
  }
  return (
    'Sans prescription médicale, les actes de soins infirmiers ne sont en principe pas pris en charge par l’Assurance Maladie et ' +
    'restent intégralement à votre charge. Une participation de votre complémentaire santé n’est possible que dans le cadre ' +
    'des garanties prévues par votre contrat.'
  );
}

const openFileInputMulti = (svcId: string, docType: string) => {
  fileInputRefs.value[`${svcId}_${docType}`]?.click();
};

const handleFileSelectMulti = (event: Event, svcId: string, docType: string) => {
  const target = event.target as HTMLInputElement;
  if (target.files?.[0]) {
    const file = target.files[0];
    if (file.size > MAX_UPLOAD_BYTES) {
      useAppToast().add({ title: 'Fichier trop volumineux', description: 'Max 25 Mo', color: 'error' });
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'].includes(file.type)) {
      useAppToast().add({ title: 'Format non accepté', description: 'JPG, PNG, PDF uniquement', color: 'error' });
      return;
    }
    if (!formDataByService[svcId].files) formDataByService[svcId].files = {};
    formDataByService[svcId].files![docType] = file;
    target.value = '';
  }
};

const handleDropMulti = (event: DragEvent, svcId: string, docType: string) => {
  dropZoneReset(`${svcId}_${docType}`);
  const file = event.dataTransfer?.files?.[0];
  if (file) {
    const input = document.createElement('input');
    input.type = 'file';
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    handleFileSelectMulti({ target: input } as any, svcId, docType);
  }
};

const openFileInputPersonal = (key: string) => {
  fileInputRefs.value[`personal_${key}`]?.click();
};

const handleFileSelectPersonal = (event: Event, docType: string) => {
  const target = event.target as HTMLInputElement;
  if (target.files?.[0]) {
    const file = target.files[0];
    if (file.size > MAX_UPLOAD_BYTES) {
      useAppToast().add({ title: 'Fichier trop volumineux', description: 'Max 25 Mo', color: 'error' });
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'].includes(file.type)) {
      useAppToast().add({ title: 'Format non accepté', description: 'JPG, PNG, PDF uniquement', color: 'error' });
      return;
    }
    if (!form.personalFiles) form.personalFiles = {};
    form.personalFiles[docType] = file;
    target.value = '';
  }
};

const handleDropPersonal = (event: DragEvent, docType: string) => {
  dropZoneReset(`personal_${docType}`);
  const file = event.dataTransfer?.files?.[0];
  if (file) {
    const input = document.createElement('input');
    input.type = 'file';
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    handleFileSelectPersonal({ target: input } as any, docType);
  }
};

onMounted(() => {
  prefillForm();
});

function buildAvailabilityForService(svcId: string): string {
  const data = formDataByService[svcId];
  if (!data) return '';
  if (data.availability_type === 'all_day') return JSON.stringify({ type: 'all_day' });
  if (data.availability_type === 'urgent') {
    const hour = typeof data.urgentHour === 'number' ? data.urgentHour : 9;
    const minute = typeof data.urgentMinute === 'number' ? data.urgentMinute : 0;
    const asap = data.urgentTimingMode === 'asap';
    if (asap) {
      return JSON.stringify({ type: 'urgent', asap: true });
    }
    return JSON.stringify({ type: 'urgent', asap: false, hour, minute });
  }
  const range = data.availabilityRange ?? [9, 11];
  return JSON.stringify({ type: 'custom', range });
}

/** Brouillon pour le parent (sessionStorage, retour login) : mêmes champs que la soumission, sans fusion pièces profil. */
function buildDraftModelValue() {
  const addressWithComplement = form.address ? { ...form.address, complement: form.address_complement || null } : null;
  const formDataByServiceDraft: Record<string, ServiceFormData & { availability?: string }> = {};
  for (const svc of props.selectedServices) {
    const data = formDataByService[svc.id];
    if (!data) continue;
    formDataByServiceDraft[svc.id] = {
      ...data,
      availability: buildAvailabilityForService(svc.id),
    };
  }
  return {
    last_name: form.last_name,
    first_name: form.first_name,
    birth_date: form.birth_date,
    phone: form.phone,
    email: form.email,
    address: addressWithComplement,
    address_complement: form.address_complement,
    gender: form.gender,
    personalFiles: { ...form.personalFiles },
    files: { ...form.files },
    scheduled_at: form.scheduled_at,
    availability: form.availability,
    availability_type: form.availability_type,
    formDataByService: formDataByServiceDraft,
    selectedServices: props.selectedServices,
    isMultiServices: isMultiServices.value,
  };
}

let draftEmitTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleEmitDraft() {
  if (syncingFromParent.value) return;
  if (props.selectedServices.length === 0) return;
  if (draftEmitTimer) clearTimeout(draftEmitTimer);
  draftEmitTimer = setTimeout(() => {
    draftEmitTimer = null;
    if (syncingFromParent.value) return;
    emit('update:modelValue', buildDraftModelValue());
  }, 250);
}

/** Appelé avant navigation (ex. /login) pour éviter un brouillon vide si le debounce n’a pas encore tiré. */
function flushDraftToParent() {
  if (draftEmitTimer) {
    clearTimeout(draftEmitTimer);
    draftEmitTimer = null;
  }
  if (syncingFromParent.value || props.selectedServices.length === 0) return;
  emit('update:modelValue', buildDraftModelValue());
}

watch(form, () => scheduleEmitDraft(), { deep: true });
watch(formDataByService, () => scheduleEmitDraft(), { deep: true });
watch(
  () => props.selectedServices,
  () => scheduleEmitDraft(),
  { deep: true },
);

/** Aligné sur AppointmentForm : en création infirmier, le dispatch suit le genre renseigné sur le compte. */
function resolvedPreferredNurseGenderFromNurseAccount(): 'any' | 'female' | 'male' {
  const g = (user.value as { gender?: string } | null)?.gender;
  if (g === 'male') return 'male';
  if (g === 'female') return 'female';
  return 'any';
}

function buildMergedFilesForService(svcId: string): { files: Record<string, File>; form_data_files: Record<string, any> } {
  const personalFiles = form.personalFiles ?? {};
  const svcFiles = formDataByService[svcId]?.files ?? {};
  const mergedFiles: Record<string, File> = {
    ...(personalFiles.carte_vitale ? { carte_vitale: personalFiles.carte_vitale } : {}),
    ...(personalFiles.carte_mutuelle ? { carte_mutuelle: personalFiles.carte_mutuelle } : {}),
    ...(svcFiles.ordonnance ? { ordonnance: svcFiles.ordonnance } : {}),
    ...(svcFiles.autres_assurances ? { autres_assurances: svcFiles.autres_assurances } : {}),
  };
  const filesData: Record<string, any> = {};
  const profileLinkKeys = ['carte_vitale', 'carte_mutuelle'] as const;
  profileLinkKeys.forEach((key) => {
    if (mergedFiles[key]) {
      filesData[key] = { field: key, name: mergedFiles[key].name, size: mergedFiles[key].size, type: mergedFiles[key].type, isNew: true };
    } else if (profileDocuments.value[key]) {
      filesData[key] = { field: key, name: profileDocuments.value[key].file_name, medical_document_id: profileDocuments.value[key].medical_document_id, isNew: false };
    }
  });
  (['ordonnance', 'autres_assurances'] as const).forEach((key) => {
    if (mergedFiles[key]) {
      filesData[key] = { field: key, name: mergedFiles[key].name, size: mergedFiles[key].size, type: mergedFiles[key].type, isNew: true };
    }
  });
  return { files: mergedFiles, form_data_files: filesData };
}

/** Documents du lot soins fusionné : un seul jeu de pièces sur le 1er acte (comme prise de sang fusionnée). */
function docFilesServiceId(svc: { id: string; type: string }) {
  if (hasGroupedNursingActs.value && isNursingAppointment(svc.type)) return nursingCommonFormId.value;
  return svc.id;
}

/** Notes / message : premier acte du panier quand plusieurs soins fusionnés sur une carte. */
function notesFieldServiceId(svc: { id: string; type: string }) {
  if (hasGroupedNursingActs.value && isNursingAppointment(svc.type)) return nursingCommonFormId.value;
  return svc.id;
}

/** Lot soins fusionnés + étape formulaire sans bloc soin modal : même préférence sur chaque ligne (sérialisation / cohérence). */
watch(
  [
    () => props.hideBookingCareDetails === true,
    () => nursingCommonFormId.value,
    () =>
      nursingCommonFormId.value
        ? formDataByService[nursingCommonFormId.value]?.preferred_nurse_gender
        : undefined,
    () => hasGroupedNursingActs.value,
  ],
  ([hideDetails, commonId, pref, grouped]) => {
    if (!hideDetails || !grouped || !commonId || pref === undefined || pref === null) return;
    for (const ns of nursingServices.value) {
      if (ns.id === commonId) continue;
      const slot = formDataByService[ns.id];
      if (slot && slot.preferred_nurse_gender !== pref) {
        slot.preferred_nurse_gender = pref as 'any' | 'female' | 'male';
      }
    }
  },
);

const handleSubmit = () => {
  const ws = props.bookingWizardSection ?? 'all';
  /** Sous-étapes créneaux / documents : pas de submit global. */
  if (ws === 'slot-datetime' || ws === 'documents') return;
  /**
   * Étape « infos perso » du wizard patient : ne pas réagir au submit HTML (Entrée dans un champ, etc.).
   * La confirmation passe par `commitPatientWizardSubmit()` depuis le pied de page.
   */
  if (ws === 'personal') return;
  commitBookingSubmit();
};

function commitBookingSubmit() {
  const autreErr = unifiedFormCareAutreValidationError();
  if (autreErr) {
    useAppToast().add({
      title: autreErr,
      color: 'error',
      icon: 'i-lucide-alert-circle',
    });
    return;
  }

  const addressWithComplement = form.address ? { ...form.address, complement: form.address_complement || null } : null;

  const formDataByServiceSerialized: Record<string, ServiceFormData & { availability?: string; form_data_files?: Record<string, any> }> = {};
  for (const svc of props.selectedServices) {
    const data = formDataByService[svc.id];
    let scheduledAt = data?.scheduled_at ?? '';
    if (scheduledAt && !scheduledAt.includes('T') && !scheduledAt.includes(' ')) {
      let h = (data?.availabilityRange ?? [9, 11])[0] ?? 9;
      let min = 0;
      if (data?.availability_type === 'all_day') {
        // Ancre calendrier minuit Paris : le backend accepte ce jour-là même si l'heure est « passée » (cf. Appointment::create).
        h = 0;
        min = 0;
      } else if (data?.availability_type === 'urgent') {
        if (data.urgentTimingMode === 'asap') {
          h = 6;
          min = 0;
        } else {
          h = typeof data.urgentHour === 'number' ? data.urgentHour : 9;
          const rawM = typeof data.urgentMinute === 'number' ? data.urgentMinute : 0;
          min = [0, 15, 30, 45].includes(rawM) ? rawM : 0;
        }
      }
      scheduledAt = `${scheduledAt} ${String(Math.floor(h)).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`;
    }
    const { files: mergedFiles, form_data_files: filesData } = buildMergedFilesForService(svc.id);
    const nursingPref =
      isNursingAppointment(svc.type)
        ? props.hidePreferredNurseGender
          ? resolvedPreferredNurseGenderFromNurseAccount()
          : (data?.preferred_nurse_gender ?? 'any')
        : data?.preferred_nurse_gender;
    const patientUrgentMeta =
      patientBookingUrgencyStripeFlag.value &&
      isBloodTestAppointment(svc.type) &&
      data?.availability_type === 'urgent'
        ? data.urgentTimingMode === 'asap'
          ? { enabled: true, asap: true }
          : {
              enabled: true,
              asap: false,
              hour: typeof data?.urgentHour === 'number' ? data.urgentHour : 9,
              minute: typeof data?.urgentMinute === 'number' ? data.urgentMinute : 0,
            }
        : undefined;
    const coSrc = data?.care_options;
    let careOptSerialized: Record<string, string | number> | undefined;
    if (coSrc && Object.keys(coSrc).length) {
      careOptSerialized = { ...coSrc };
      stripOrphanAutreDetailKeys(careOptSerialized);
    }
    formDataByServiceSerialized[svc.id] = {
      ...data,
      ...(patientUrgentMeta ? { patient_urgency: patientUrgentMeta } : {}),
      ...(isNursingAppointment(svc.type) ? { preferred_nurse_gender: nursingPref } : {}),
      availability: buildAvailabilityForService(svc.id),
      scheduled_at: scheduledAt,
      files: mergedFiles,
      form_data_files: filesData,
      care_options: careOptSerialized && Object.keys(careOptSerialized).length ? careOptSerialized : undefined,
    } as any;
  }

  const payload: any = {
    ...form,
    address: addressWithComplement,
    selectedServices: props.selectedServices,
    formDataByService: formDataByServiceSerialized,
    isMultiServices: isMultiServices.value,
  };

  const isPureMultiBlood =
    props.selectedServices.length > 1 &&
    props.selectedServices.every((s) => isBloodTestAppointment(s.type));

  if (isPureMultiBlood) {
    const firstSvc = bloodServices.value[0];
    const firstData = formDataByServiceSerialized[firstSvc.id];
    const bloodTestItems = bloodServices.value.map((svc, index) => ({
      category_id: svc.category_id,
      label: svc.name,
      care_options: formDataByServiceSerialized[svc.id]?.care_options ?? {},
      sort_order: index,
    }));
    payload.scheduled_at = firstData.scheduled_at;
    payload.files = firstData.files;
    payload.form_data = {
      ...form,
      address: addressWithComplement,
      scheduled_at: firstData.scheduled_at,
      availability: firstData.availability,
      files: firstData.form_data_files,
      notes: firstData.notes || undefined,
      blood_test_items: bloodTestItems,
      care_options: firstData.care_options && Object.keys(firstData.care_options).length ? firstData.care_options : undefined,
      ...(firstData.patient_urgency ? { patient_urgency: firstData.patient_urgency } : {}),
    };
    (payload as any).blood_test_items = bloodTestItems;
    emit('update:modelValue', payload);
    emit('submit', payload);
    return;
  }

  const isPureMultiNursing =
    props.selectedServices.length > 1 &&
    props.selectedServices.every((s) => isNursingAppointment(s.type));

  if (isPureMultiNursing) {
    const firstSvc = nursingServices.value[0];
    const firstData = formDataByServiceSerialized[firstSvc.id];
    const nursingItems = nursingServices.value.map((svc, index) => ({
      category_id: svc.category_id,
      label: svc.name,
      care_options: formDataByServiceSerialized[svc.id]?.care_options ?? {},
      sort_order: index,
    }));
    payload.scheduled_at = firstData.scheduled_at;
    payload.files = firstData.files;
    const fd: Record<string, unknown> = {
      ...form,
      address: addressWithComplement,
      scheduled_at: firstData.scheduled_at,
      availability: firstData.availability,
      files: firstData.form_data_files,
      notes: firstData.notes || undefined,
      duration_days: firstData.duration_days,
      frequency: firstData.frequency,
      custom_days: firstData.duration_days === 'custom' ? firstData.custom_days : undefined,
      preferred_nurse_gender: firstData.preferred_nurse_gender ?? 'any',
      nursing_items: nursingItems,
    };
    if (nursingItems.length > 1) {
      delete fd.care_options;
    } else if (firstData.care_options && Object.keys(firstData.care_options).length) {
      fd.care_options = firstData.care_options;
    }
    payload.form_data = fd;
    (payload as any).nursing_items = nursingItems;
    emit('update:modelValue', payload);
    emit('submit', payload);
    return;
  }

  if (isMultiServices.value) {
    emit('update:modelValue', payload);
    emit('submit', payload);
    return;
  }

  const firstSvc = props.selectedServices[0];
  const firstData = formDataByServiceSerialized[firstSvc.id];
  payload.scheduled_at = firstData.scheduled_at;
  payload.files = firstData.files;
  payload.form_data = {
    ...form,
    address: addressWithComplement,
    scheduled_at: firstData.scheduled_at,
    files: firstData.form_data_files,
    notes: firstData.notes || undefined,
    care_options: firstData.care_options && Object.keys(firstData.care_options).length ? firstData.care_options : undefined,
    ...(isBloodTestAppointment(firstSvc.type)
      ? {
          blood_test_type: firstData.blood_test_type,
          duration_days: firstData.blood_test_type === 'multiple' ? firstData.duration_days : undefined,
          custom_days: firstData.duration_days === 'custom' ? firstData.custom_days : undefined,
        }
      : {}),
    ...(firstData.patient_urgency ? { patient_urgency: firstData.patient_urgency } : {}),
    availability: firstData.availability,
  };

  emit('update:modelValue', payload);
  emit('submit', payload);
}

defineExpose({
  flushDraftToParent,
  /** Wizard patient : même charge utile que submit, appel explicite depuis le footer (évite Entrée / submit implicite). */
  commitPatientWizardSubmit: commitBookingSubmit,
});
</script>

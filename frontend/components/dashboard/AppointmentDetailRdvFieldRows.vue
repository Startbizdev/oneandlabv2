<template>
  <!-- Lot multi-soins : adresse commune une seule fois -->
  <template v-if="variant === 'address-only'">
    <div v-if="addressLine" :class="kvRow">
      <div :class="kvLabel">Adresse</div>
      <div class="min-w-0">
        <p class="text-sm font-medium text-gray-900 dark:text-white">
          {{ addressLine }}
        </p>
        <p v-if="addressComplement" class="text-sm text-muted mt-1">
          Complément : {{ addressComplement }}
        </p>
        <div v-if="addressLine && !hideMapActions" class="flex flex-wrap items-center gap-2 pt-1.5">
          <UButton
            type="button"
            size="xs"
            variant="outline"
            color="neutral"
            leading-icon="i-lucide-map"
            class="shrink-0"
            :on-click="openInGoogleMaps"
          >
            Carte
          </UButton>
          <UButton
            type="button"
            size="xs"
            variant="outline"
            color="neutral"
            leading-icon="i-lucide-navigation"
            class="shrink-0"
            :on-click="openInWaze"
          >
            Itinéraire Waze
          </UButton>
        </div>
      </div>
    </div>
  </template>

  <template v-else>
    <!-- Fiche lot patient : chaque acte infirmier avec ses options, puis champs communs au RDV -->
    <template v-if="isNursingDetailsGroupedLayout">
      <div :class="kvRow">
        <div :class="kvLabel">Date & heure</div>
        <div class="min-w-0 flex flex-wrap items-center gap-2">
          <p
            class="min-w-0 text-sm font-medium tabular-nums text-gray-900 dark:text-white"
            :class="
              isCanceled
                ? 'line-through decoration-neutral-400 text-muted opacity-[0.82] dark:decoration-neutral-500'
                : ''
            "
          >
            {{ scheduledDateWithAvailabilityLine }}
          </p>
          <PatientUrgencyBadge :appointment="appt" />
        </div>
      </div>

      <template v-for="(nItem, nIdx) in nursingItems" :key="`ndet-grp-${String(nItem?.id ?? '')}-${nIdx}`">
        <div>
          <div :class="kvRow">
            <div :class="kvLabel">{{ nursingItems.length > 1 ? `Soins prévus #${nIdx + 1}` : 'Soins prévus' }}</div>
            <div class="min-w-0 flex flex-wrap gap-1.5">
              <UBadge
                size="sm"
                variant="subtle"
                color="neutral"
                class="max-w-full inline-flex items-center gap-1.5 border-0 font-semibold shadow-none ring-1 ring-black/5 dark:ring-white/10 py-1 pl-1.5 pr-2.5"
              >
                <CareCategoryVisual
                  :image-src="nursingItemCategoryVisual(nItem).imageSrc"
                  :icon-name="nursingItemCategoryVisual(nItem).iconName"
                  img-class="h-4 w-4 shrink-0 object-contain"
                  icon-class="h-4 w-4 shrink-0 text-gray-600 dark:text-gray-400"
                />
                <span class="truncate text-gray-900 dark:text-gray-100">{{ nursingItemDisplayLabel(nItem) }}</span>
              </UBadge>
            </div>
          </div>
          <div
            v-if="shouldShowNursingItemTypeRow(nItem)"
            :class="kvRow"
          >
            <div :class="kvLabel">{{ getCareOptionLabelForCategory('type', nItem?.category_id) }}</div>
            <p class="min-w-0 text-sm font-medium text-gray-900 dark:text-white">{{
              nursingItemCareTypeOptionLabel(nItem)
            }}</p>
          </div>
          <div v-if="nursingItemMetaDurationLabel(nItem)" :class="kvRow">
            <div :class="kvLabel">Prise en charge</div>
            <p class="min-w-0 text-sm font-medium text-gray-900 dark:text-white">{{
              nursingItemMetaDurationLabel(nItem)
            }}</p>
          </div>
          <div v-if="nursingItemMetaFrequencyLabel(nItem)" :class="kvRow">
            <div :class="kvLabel">Fréquence</div>
            <p class="min-w-0 text-sm font-medium text-gray-900 dark:text-white">{{
              nursingItemMetaFrequencyLabel(nItem)
            }}</p>
          </div>
          <div v-if="appt.type === 'nursing' && nursingItems.length > 0 && rdvNursingCareTypeDurationLabel()" :class="kvRow">
            <div :class="kvLabel">Type de prise en charge</div>
            <p class="min-w-0 text-sm font-medium text-gray-900 dark:text-white">{{
              rdvNursingCareTypeDurationLabel()
            }}</p>
          </div>
          <div v-if="appt.type === 'nursing' && nursingItems.length > 0 && rdvNursingCareFrequencyLabel()" :class="kvRow">
            <div :class="kvLabel">Fréquence</div>
            <p class="min-w-0 text-sm font-medium text-gray-900 dark:text-white">{{
              rdvNursingCareFrequencyLabel()
            }}</p>
          </div>
          <template v-for="[key, val] in nursingItemCareOptionEntries(nItem)" :key="`ndet-${nIdx}-${key}`">
            <div v-if="shouldShowCareOptionValue(val)" :class="kvRow">
              <div :class="kvLabel">{{ getCareOptionLabelForCategory(key, nItem?.category_id) }}</div>
              <p class="min-w-0 text-sm font-medium text-gray-900 dark:text-white">{{
                getCareOptionValueLabelForCategory(key, val, nItem?.category_id, nursingItemCareOptionsRecord(nItem))
              }}</p>
            </div>
          </template>
        </div>
      </template>

      <div v-if="careOptionTypeValue != null && showRootFormCareOptionRows" :class="kvRow">
        <div :class="kvLabel">{{ getCareOptionLabel('type') }}</div>
        <p class="min-w-0 text-sm font-medium text-gray-900 dark:text-white">{{
          getCareOptionValueLabel('type', careOptionTypeValue)
        }}</p>
      </div>
      <div v-if="appt.form_data?.blood_test_type" :class="kvRow">
        <div :class="kvLabel">Type prélèvement</div>
        <p class="min-w-0 text-sm font-medium text-gray-900 dark:text-white">{{ getBloodTestTypeLabel(appt.form_data) }}</p>
      </div>
      <div v-if="showSeparateFooterDurationFrequency && appt.form_data?.duration_days" :class="kvRow">
        <div :class="kvLabel">Type de prise en charge</div>
        <p class="min-w-0 text-sm font-medium text-gray-900 dark:text-white">{{
          getNursingDurationLabel(String(appt.form_data.duration_days), coerceFormCustomDaysForNursing(appt.form_data.custom_days))
        }}</p>
      </div>
      <div v-if="showSeparateFooterDurationFrequency && appt.form_data?.frequency != null && appt.form_data?.frequency !== ''" :class="kvRow">
        <div :class="kvLabel">Fréquence</div>
        <p class="min-w-0 text-sm font-medium text-gray-900 dark:text-white">{{ getFrequencyLabel(String(appt.form_data.frequency)) }}</p>
      </div>
      <template v-for="[key, val] in careOptionsEntriesWithoutType" :key="`care-root-${key}`">
        <div v-if="val != null && val !== '' && showRootFormCareOptionRows" :class="kvRow">
          <div :class="kvLabel">{{ getCareOptionLabel(key) }}</div>
          <p class="min-w-0 text-sm font-medium text-gray-900 dark:text-white">{{ getCareOptionValueLabel(key, val) }}</p>
        </div>
      </template>
      <div v-if="appt.notes" :class="kvRow">
        <div :class="kvLabel">Notes</div>
        <p class="min-w-0 text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{{ appt.notes }}</p>
      </div>
    </template>

    <template v-else-if="isBloodDetailsGroupedLayout">
      <div :class="kvRow">
        <div :class="kvLabel">Date & heure</div>
        <div class="min-w-0 flex flex-wrap items-center gap-2">
          <p
            class="min-w-0 text-sm font-medium tabular-nums text-gray-900 dark:text-white"
            :class="
              isCanceled
                ? 'line-through decoration-neutral-400 text-muted opacity-[0.82] dark:decoration-neutral-500'
                : ''
            "
          >
            {{ scheduledDateWithAvailabilityLine }}
          </p>
          <PatientUrgencyBadge :appointment="appt" />
        </div>
      </div>

      <template v-for="(bItem, bIdx) in bloodTestItems" :key="`bdet-${String(bItem?.id ?? '')}-${bIdx}`">
        <div>
          <div :class="kvRow">
            <div :class="kvLabel">{{ bloodTestItems.length > 1 ? `Prestations #${bIdx + 1}` : 'Prestations' }}</div>
            <div class="min-w-0 flex flex-wrap gap-1.5">
              <UBadge
                size="sm"
                variant="subtle"
                color="error"
                class="max-w-full inline-flex items-center gap-1.5 border-0 font-semibold shadow-none ring-1 ring-black/5 dark:ring-white/10 py-1 pl-1.5 pr-2.5"
              >
                <CareCategoryVisual
                  :image-src="bloodItemCategoryVisual(bItem).imageSrc"
                  :icon-name="bloodItemCategoryVisual(bItem).iconName"
                  img-class="h-4 w-4 shrink-0 object-contain"
                  icon-class="h-4 w-4 shrink-0 text-gray-600 dark:text-gray-400"
                />
                <span class="truncate text-gray-900 dark:text-gray-100">{{ bloodItemDisplayLabel(bItem) }}</span>
              </UBadge>
            </div>
          </div>
          <div
            v-if="shouldShowBloodItemTypeRow(bItem)"
            :class="kvRow"
          >
            <div :class="kvLabel">{{ getCareOptionLabelForCategory('type', bItem?.category_id) }}</div>
            <p class="min-w-0 text-sm font-medium text-gray-900 dark:text-white">{{
              bloodItemCareTypeOptionLabel(bItem)
            }}</p>
          </div>
          <template v-for="[key, val] in bloodItemCareOptionEntries(bItem)" :key="`bdet-opt-${bIdx}-${key}`">
            <div v-if="shouldShowCareOptionValue(val)" :class="kvRow">
              <div :class="kvLabel">{{ getCareOptionLabelForCategory(key, bItem?.category_id) }}</div>
              <p class="min-w-0 text-sm font-medium text-gray-900 dark:text-white">{{
                getCareOptionValueLabelForCategory(key, val, bItem?.category_id, bloodItemCareOptionsRecord(bItem))
              }}</p>
            </div>
          </template>
        </div>
      </template>

      <div v-if="careOptionTypeValue != null && showRootFormCareOptionRows" :class="kvRow">
        <div :class="kvLabel">{{ getCareOptionLabel('type') }}</div>
        <p class="min-w-0 text-sm font-medium text-gray-900 dark:text-white">{{
          getCareOptionValueLabel('type', careOptionTypeValue)
        }}</p>
      </div>
      <div v-if="appt.form_data?.blood_test_type" :class="kvRow">
        <div :class="kvLabel">Type prélèvement</div>
        <p class="min-w-0 text-sm font-medium text-gray-900 dark:text-white">{{ getBloodTestTypeLabel(appt.form_data) }}</p>
      </div>
      <div v-if="appt.form_data?.duration_days" :class="kvRow">
        <div :class="kvLabel">Durée</div>
        <p class="min-w-0 text-sm font-medium text-gray-900 dark:text-white">{{
          formatBloodTestSeriesDurationDays(appt.form_data.duration_days, appt.form_data.custom_days)
        }}</p>
      </div>
      <template v-for="[key, val] in careOptionsRootEntriesForBloodTestDisplay" :key="`care-blood-root-${key}`">
        <div v-if="val != null && val !== '' && showRootFormCareOptionRows" :class="kvRow">
          <div :class="kvLabel">{{ getCareOptionLabel(key) }}</div>
          <p class="min-w-0 text-sm font-medium text-gray-900 dark:text-white">{{ getCareOptionValueLabel(key, val) }}</p>
        </div>
      </template>
      <div v-if="appt.notes" :class="kvRow">
        <div :class="kvLabel">Notes</div>
        <p class="min-w-0 text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{{ appt.notes }}</p>
      </div>
    </template>

    <template v-else>
    <div v-if="variant === 'default' && addressLine && !hideAddressBlock" :class="kvRow">
      <div :class="kvLabel">Adresse</div>
      <div class="min-w-0">
        <p class="text-sm font-medium text-gray-900 dark:text-white">
          {{ addressLine }}
        </p>
        <p v-if="addressComplement" class="text-sm text-muted mt-1">
          Complément : {{ addressComplement }}
        </p>
        <div v-if="addressLine && !hideMapActions" class="flex flex-wrap items-center gap-2 pt-1.5">
          <UButton
            type="button"
            size="xs"
            variant="outline"
            color="neutral"
            leading-icon="i-lucide-map"
            class="shrink-0"
            :on-click="openInGoogleMaps"
          >
            Carte
          </UButton>
          <UButton
            type="button"
            size="xs"
            variant="outline"
            color="neutral"
            leading-icon="i-lucide-navigation"
            class="shrink-0"
            :on-click="openInWaze"
          >
            Itinéraire Waze
          </UButton>
        </div>
      </div>
    </div>
    <div :class="kvRow">
      <div :class="kvLabel">Date & heure</div>
      <div class="min-w-0 flex flex-wrap items-center gap-2">
        <p
          class="min-w-0 text-sm font-medium tabular-nums text-gray-900 dark:text-white"
          :class="
            isCanceled
              ? 'line-through decoration-neutral-400 text-muted opacity-[0.82] dark:decoration-neutral-500'
              : ''
          "
        >
          {{ scheduledDateWithAvailabilityLine }}
        </p>
        <PatientUrgencyBadge :appointment="appt" />
      </div>
    </div>
    <div
      v-if="appt.type === 'blood_test' && bloodTestItems.length === 1"
      :class="kvRow"
    >
      <div :class="kvLabel">Prestations</div>
      <div class="min-w-0 flex flex-wrap gap-1.5">
        <UBadge
          v-for="(item, idx) in bloodTestItems"
          :key="`${item.id ?? item.category_id ?? 'prest'}-${idx}`"
          color="error"
          variant="subtle"
          size="sm"
          class="max-w-full inline-flex items-center gap-1.5 border-0 font-semibold shadow-none ring-1 ring-black/5 dark:ring-white/10 py-1 pl-1.5 pr-2.5"
        >
          <CareCategoryVisual
            :image-src="bloodItemCategoryVisual(item).imageSrc"
            :icon-name="bloodItemCategoryVisual(item).iconName"
            img-class="h-4 w-4 shrink-0 object-contain"
            icon-class="h-4 w-4 shrink-0 text-gray-600 dark:text-gray-400"
          />
          <span class="truncate text-gray-900 dark:text-gray-100">{{ bloodItemDisplayLabel(item) }}</span>
        </UBadge>
      </div>
    </div>
    <div
      v-else-if="appt.type === 'nursing' && nursingItems.length === 1"
      :class="kvRow"
    >
      <div :class="kvLabel">Soins prévus</div>
      <div class="min-w-0 flex flex-wrap gap-1.5">
        <UBadge
          v-for="(item, idx) in nursingItems"
          :key="`${item.id ?? item.category_id ?? 'soin'}-${idx}`"
          color="info"
          variant="subtle"
          size="sm"
          class="max-w-full"
        >
          <span class="truncate">{{ item.label || item.category_name || 'Soin' }}</span>
        </UBadge>
      </div>
    </div>
    <div
      v-else-if="appt.category_name && showAppointmentCategoryNameRow"
      :class="kvRow"
    >
      <div :class="kvLabel">Type de soin</div>
      <div class="min-w-0">
        <UBadge
          size="sm"
          variant="subtle"
          color="neutral"
          class="max-w-full inline-flex items-center gap-1.5 border-0 font-semibold shadow-none ring-1 ring-black/5 dark:ring-white/10 py-1 pl-1.5 pr-2.5"
        >
          <CareCategoryVisual
            :image-src="careCategoryDisplay.imageSrc"
            :icon-name="careCategoryDisplay.iconName"
            img-class="h-4 w-4 shrink-0 object-contain"
            icon-class="h-4 w-4 shrink-0 text-gray-600 dark:text-gray-400"
          />
          <span class="truncate text-gray-900 dark:text-gray-100">{{ appt.category_name }}</span>
        </UBadge>
      </div>
    </div>
    <div v-if="careOptionTypeValue != null && showRootFormCareOptionRows" :class="kvRow">
      <div :class="kvLabel">{{ getCareOptionLabel('type') }}</div>
      <p class="min-w-0 text-sm font-medium text-gray-900 dark:text-white">{{
        getCareOptionValueLabel('type', careOptionTypeValue)
      }}</p>
    </div>
    <div v-if="appt.form_data?.blood_test_type" :class="kvRow">
      <div :class="kvLabel">Type prélèvement</div>
      <p class="min-w-0 text-sm font-medium text-gray-900 dark:text-white">{{ getBloodTestTypeLabel(appt.form_data) }}</p>
    </div>
    <div v-if="showSeparateFooterDurationFrequency && appt.form_data?.duration_days" :class="kvRow">
      <div :class="kvLabel">{{ appt.type === 'nursing' ? 'Type de prise en charge' : 'Durée' }}</div>
      <p class="min-w-0 text-sm font-medium text-gray-900 dark:text-white">{{
        appt.type === 'nursing'
          ? getNursingDurationLabel(String(appt.form_data.duration_days), coerceFormCustomDaysForNursing(appt.form_data.custom_days))
          : formatBloodTestSeriesDurationDays(appt.form_data.duration_days, appt.form_data.custom_days)
      }}</p>
    </div>
    <div v-if="showSeparateFooterDurationFrequency && appt.form_data?.frequency != null && appt.form_data?.frequency !== ''" :class="kvRow">
      <div :class="kvLabel">Fréquence</div>
      <p class="min-w-0 text-sm font-medium text-gray-900 dark:text-white">{{ getFrequencyLabel(String(appt.form_data.frequency)) }}</p>
    </div>
    <template v-for="[key, val] in careOptionsRootEntriesForBloodTestDisplay" :key="`care-${key}`">
      <div v-if="val != null && val !== '' && showRootFormCareOptionRows" :class="kvRow">
        <div :class="kvLabel">{{ getCareOptionLabel(key) }}</div>
        <p class="min-w-0 text-sm font-medium text-gray-900 dark:text-white">{{ getCareOptionValueLabel(key, val) }}</p>
      </div>
    </template>
    <template v-for="(nItem, nIdx) in nursingItems" :key="`niopt-${nIdx}`">
      <!-- Multi-soins (carte RDV « default ») : le type vit souvent dans chaque ligne nursing_items, pas dans form_data.care_options à la racine. -->
      <template v-if="appt.type === 'nursing' && nursingItems.length > 1">
        <div>
          <div :class="kvRow">
            <div :class="kvLabel">Soins prévus #{{ nIdx + 1 }}</div>
            <div class="min-w-0 flex flex-wrap gap-1.5">
              <UBadge
                size="sm"
                variant="subtle"
                color="neutral"
                class="max-w-full inline-flex items-center gap-1.5 border-0 font-semibold shadow-none ring-1 ring-black/5 dark:ring-white/10 py-1 pl-1.5 pr-2.5"
              >
                <CareCategoryVisual
                  :image-src="nursingItemCategoryVisual(nItem).imageSrc"
                  :icon-name="nursingItemCategoryVisual(nItem).iconName"
                  img-class="h-4 w-4 shrink-0 object-contain"
                  icon-class="h-4 w-4 shrink-0 text-gray-600 dark:text-gray-400"
                />
                <span class="truncate text-gray-900 dark:text-gray-100">{{ nursingItemDisplayLabel(nItem) }}</span>
              </UBadge>
            </div>
          </div>
          <div
            v-if="shouldShowNursingItemTypeRow(nItem)"
            :class="kvRow"
          >
            <div :class="kvLabel">{{ getCareOptionLabelForCategory('type', nItem?.category_id) }}</div>
            <p class="min-w-0 text-sm font-medium text-gray-900 dark:text-white">{{
              nursingItemCareTypeOptionLabel(nItem)
            }}</p>
          </div>
          <div v-if="nursingItemMetaDurationLabel(nItem)" :class="kvRow">
            <div :class="kvLabel">Prise en charge</div>
            <p class="min-w-0 text-sm font-medium text-gray-900 dark:text-white">{{
              nursingItemMetaDurationLabel(nItem)
            }}</p>
          </div>
          <div v-if="nursingItemMetaFrequencyLabel(nItem)" :class="kvRow">
            <div :class="kvLabel">Fréquence</div>
            <p class="min-w-0 text-sm font-medium text-gray-900 dark:text-white">{{
              nursingItemMetaFrequencyLabel(nItem)
            }}</p>
          </div>
          <div v-if="appt.type === 'nursing' && nursingItems.length > 0 && rdvNursingCareTypeDurationLabel()" :class="kvRow">
            <div :class="kvLabel">Type de prise en charge</div>
            <p class="min-w-0 text-sm font-medium text-gray-900 dark:text-white">{{
              rdvNursingCareTypeDurationLabel()
            }}</p>
          </div>
          <div v-if="appt.type === 'nursing' && nursingItems.length > 0 && rdvNursingCareFrequencyLabel()" :class="kvRow">
            <div :class="kvLabel">Fréquence</div>
            <p class="min-w-0 text-sm font-medium text-gray-900 dark:text-white">{{
              rdvNursingCareFrequencyLabel()
            }}</p>
          </div>
          <template v-for="[key, val] in nursingItemCareOptionEntries(nItem)" :key="`ni-${nIdx}-${key}`">
            <div v-if="shouldShowCareOptionValue(val)" :class="kvRow">
              <div :class="kvLabel">{{ getCareOptionLabelForCategory(key, nItem?.category_id) }}</div>
              <p class="min-w-0 text-sm font-medium text-gray-900 dark:text-white">{{
                getCareOptionValueLabelForCategory(key, val, nItem?.category_id, nursingItemCareOptionsRecord(nItem))
              }}</p>
            </div>
          </template>
        </div>
      </template>
      <template v-else>
        <div
          v-if="appt.type === 'nursing' && shouldShowNursingItemTypeRow(nItem)"
          :class="kvRow"
        >
          <div :class="kvLabel">{{ getCareOptionLabelForCategory('type', nItem?.category_id) }}</div>
          <p class="min-w-0 text-sm font-medium text-gray-900 dark:text-white">{{
            nursingItemCareTypeOptionLabel(nItem)
          }}</p>
        </div>
        <div v-if="appt.type === 'nursing' && nursingItemMetaDurationLabel(nItem)" :class="kvRow">
          <div :class="kvLabel">Prise en charge</div>
          <p class="min-w-0 text-sm font-medium text-gray-900 dark:text-white">{{
            nursingItemMetaDurationLabel(nItem)
          }}</p>
        </div>
        <div v-if="appt.type === 'nursing' && nursingItemMetaFrequencyLabel(nItem)" :class="kvRow">
          <div :class="kvLabel">Fréquence</div>
          <p class="min-w-0 text-sm font-medium text-gray-900 dark:text-white">{{
            nursingItemMetaFrequencyLabel(nItem)
          }}</p>
        </div>
        <div v-if="appt.type === 'nursing' && rdvNursingCareTypeDurationLabel()" :class="kvRow">
          <div :class="kvLabel">Type de prise en charge</div>
          <p class="min-w-0 text-sm font-medium text-gray-900 dark:text-white">{{
            rdvNursingCareTypeDurationLabel()
          }}</p>
        </div>
        <div v-if="appt.type === 'nursing' && rdvNursingCareFrequencyLabel()" :class="kvRow">
          <div :class="kvLabel">Fréquence</div>
          <p class="min-w-0 text-sm font-medium text-gray-900 dark:text-white">{{
            rdvNursingCareFrequencyLabel()
          }}</p>
        </div>
        <template v-for="[key, val] in nursingItemCareOptionEntries(nItem)" :key="`ni-${nIdx}-${key}`">
          <div v-if="shouldShowCareOptionValue(val)" :class="kvRow">
            <div :class="kvLabel">{{ getCareOptionLabelForCategory(key, nItem?.category_id) }}</div>
            <p class="min-w-0 text-sm font-medium text-gray-900 dark:text-white">{{
              getCareOptionValueLabelForCategory(key, val, nItem?.category_id, nursingItemCareOptionsRecord(nItem))
            }}</p>
          </div>
        </template>
      </template>
    </template>
    <template v-for="(bItem, bIdx) in bloodTestItems" :key="`bdef-${String(bItem?.id ?? '')}-${bIdx}`">
      <template v-if="appt.type === 'blood_test' && bloodTestItems.length > 1">
        <div>
          <div :class="kvRow">
            <div :class="kvLabel">Prestations #{{ bIdx + 1 }}</div>
            <div class="min-w-0 flex flex-wrap gap-1.5">
              <UBadge
                size="sm"
                variant="subtle"
                color="error"
                class="max-w-full inline-flex items-center gap-1.5 border-0 font-semibold shadow-none ring-1 ring-black/5 dark:ring-white/10 py-1 pl-1.5 pr-2.5"
              >
                <CareCategoryVisual
                  :image-src="bloodItemCategoryVisual(bItem).imageSrc"
                  :icon-name="bloodItemCategoryVisual(bItem).iconName"
                  img-class="h-4 w-4 shrink-0 object-contain"
                  icon-class="h-4 w-4 shrink-0 text-gray-600 dark:text-gray-400"
                />
                <span class="truncate text-gray-900 dark:text-gray-100">{{ bloodItemDisplayLabel(bItem) }}</span>
              </UBadge>
            </div>
          </div>
          <div
            v-if="shouldShowBloodItemTypeRow(bItem)"
            :class="kvRow"
          >
            <div :class="kvLabel">{{ getCareOptionLabelForCategory('type', bItem?.category_id) }}</div>
            <p class="min-w-0 text-sm font-medium text-gray-900 dark:text-white">{{
              bloodItemCareTypeOptionLabel(bItem)
            }}</p>
          </div>
          <template v-for="[key, val] in bloodItemCareOptionEntries(bItem)" :key="`bdef-opt-${bIdx}-${key}`">
            <div v-if="shouldShowCareOptionValue(val)" :class="kvRow">
              <div :class="kvLabel">{{ getCareOptionLabelForCategory(key, bItem?.category_id) }}</div>
              <p class="min-w-0 text-sm font-medium text-gray-900 dark:text-white">{{
                getCareOptionValueLabelForCategory(key, val, bItem?.category_id, bloodItemCareOptionsRecord(bItem))
              }}</p>
            </div>
          </template>
        </div>
      </template>
      <template v-else-if="appt.type === 'blood_test'">
        <div
          v-if="shouldShowBloodItemTypeRow(bItem)"
          :class="kvRow"
        >
          <div :class="kvLabel">{{ getCareOptionLabelForCategory('type', bItem?.category_id) }}</div>
          <p class="min-w-0 text-sm font-medium text-gray-900 dark:text-white">{{
            bloodItemCareTypeOptionLabel(bItem)
          }}</p>
        </div>
        <template v-for="[key, val] in bloodItemCareOptionEntries(bItem)" :key="`bdef-si-${bIdx}-${key}`">
          <div v-if="shouldShowCareOptionValue(val)" :class="kvRow">
            <div :class="kvLabel">{{ getCareOptionLabelForCategory(key, bItem?.category_id) }}</div>
            <p class="min-w-0 text-sm font-medium text-gray-900 dark:text-white">{{
              getCareOptionValueLabelForCategory(key, val, bItem?.category_id, bloodItemCareOptionsRecord(bItem))
            }}</p>
          </div>
        </template>
      </template>
    </template>
    <div v-if="appt.notes" :class="kvRow">
      <div :class="kvLabel">Notes</div>
      <p class="min-w-0 text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{{ appt.notes }}</p>
    </div>
    </template>
  </template>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { getNursingDurationLabel } from '~/constants/nursing-duration';
import { formatBloodTestSeriesDurationDays } from '~/utils/duration-display';
import { appointmentDetailAddressLine } from '~/utils/address-display';
import { parseRawPatientAddress } from '~/utils/patient-address-rdv';
import { formatScheduledDateWithAvailabilityLineFr } from '~/utils/appointment-datetime-fr';
import {
  resolveCareCategoryImageSrc,
  resolveCareIconFromCategory,
} from '~/utils/care-icons';
import {
  formatCareSelectValueWithAutreDetail,
  isCareAutreDetailKey,
} from '~/utils/care-category-autre-detail';

const props = withDefaults(
  defineProps<{
    appt: any;
    categoriesForDetail: Array<{
      id: string;
      icon?: string | null;
      image_url?: string | null;
      type?: string;
      options?: Array<{ option_key: string; label: string; options?: { value: string; label: string }[] }>;
    }>;
    isAdmin: boolean;
    /** default = carte seule ; address-only = ligne adresse pour lot ; details-only = sans adresse (lot, après titre RDV #n). */
    variant?: 'default' | 'address-only' | 'details-only';
    /** Masquer Carte / Waze (ex. patient sur sa fiche RDV). */
    hideMapActions?: boolean;
    /** Masquer la ligne adresse (patient sur sa fiche). */
    hideAddressBlock?: boolean;
  }>(),
  {
    variant: 'default',
    hideMapActions: false,
    hideAddressBlock: false,
  },
);

const kvRow =
  'grid grid-cols-1 gap-x-4 gap-y-1 px-4 py-3 sm:px-6 sm:grid-cols-[minmax(9.5rem,11rem)_minmax(0,1fr)] sm:items-start sm:py-2.5';
const kvLabel = 'text-[11px] font-semibold uppercase tracking-wide text-muted shrink-0 pt-0.5';

const config = useRuntimeConfig();

const isCanceled = computed(() => {
  const s = String(props.appt?.status ?? '').toLowerCase();
  return s === 'canceled' || s === 'cancelled';
});

const addressLine = computed(() => appointmentDetailAddressLine(props.appt));
const addressParsed = computed(() => parseRawPatientAddress(props.appt?.address));
const scheduledDateWithAvailabilityLine = computed(() =>
  formatScheduledDateWithAvailabilityLineFr(props.appt?.scheduled_at, props.appt?.form_data?.availability),
);

const addressComplement = computed(() => {
  const a = props.appt;
  if (!a) return '';
  const fromForm = a.form_data?.address_complement;
  if (fromForm && String(fromForm).trim()) return String(fromForm).trim();
  const c = addressParsed.value?.complement;
  if (c && String(c).trim()) return String(c).trim();
  return '';
});

/**
 * Fiche RDV dans un lot (variant details-only) : `form_data.nursing_items` peut répéter
 * tous les actes du lot sur chaque ligne `appointments`; on n’affiche que ce qui correspond
 * à CE rendez-vous (lignes persistées ou même category_id).
 */
function filterNursingItemsForAppointmentDetail(appt: any, items: any[]): any[] {
  if (!appt || items.length <= 1) {
    return items;
  }
  const aptId = appt.id != null ? String(appt.id) : '';
  const persisted = items.filter((i: any) => {
    if (i?.id == null || String(i.id).trim() === '') return false;
    const rowApt = i.appointment_id != null ? String(i.appointment_id) : '';
    return aptId === '' || !rowApt || rowApt === aptId;
  });
  if (persisted.length > 0) {
    return persisted;
  }
  const cid = appt.category_id != null ? String(appt.category_id) : '';
  if (cid !== '') {
    const byCat = items.filter((i: any) => String(i?.category_id ?? '') === cid);
    if (byCat.length > 0) {
      return byCat;
    }
  }
  const name = String(appt.category_name ?? '').trim().toLowerCase();
  if (name) {
    const byLabel = items.filter((i: any) => {
      const lab = String(i?.label ?? i?.category_name ?? '').trim().toLowerCase();
      return lab === name;
    });
    if (byLabel.length > 0) {
      return byLabel;
    }
  }
  return items;
}

function filterBloodTestItemsForAppointmentDetail(appt: any, items: any[]): any[] {
  if (!appt || items.length <= 1) {
    return items;
  }
  const aptId = appt.id != null ? String(appt.id) : '';
  const persisted = items.filter((i: any) => {
    if (i?.id == null || String(i.id).trim() === '') return false;
    const rowApt = i.appointment_id != null ? String(i.appointment_id) : '';
    return aptId === '' || !rowApt || rowApt === aptId;
  });
  if (persisted.length > 0) {
    return persisted;
  }
  const cid = appt.category_id != null ? String(appt.category_id) : '';
  if (cid !== '') {
    const byCat = items.filter((i: any) => String(i?.category_id ?? '') === cid);
    if (byCat.length > 0) {
      return byCat;
    }
  }
  const name = String(appt.category_name ?? '').trim().toLowerCase();
  if (name) {
    const byLabel = items.filter((i: any) => {
      const lab = String(i?.label ?? i?.category_name ?? '').trim().toLowerCase();
      return lab === name;
    });
    if (byLabel.length > 0) {
      return byLabel;
    }
  }
  return items;
}

const nursingItems = computed(() => {
  const useOwnOnly = props.variant === 'details-only';
  const raw = useOwnOnly
    ? props.appt?.nursing_items
    : (props.appt?.nursing_items_display ?? props.appt?.nursing_items);
  let items = Array.isArray(raw) ? [...raw] : [];
  if (props.appt?.type !== 'nursing') {
    return items;
  }
  if (useOwnOnly) {
    items = filterNursingItemsForAppointmentDetail(props.appt, items);
    return items;
  }
  if (items.length > 1) {
    return items;
  }
  const hasDisplay =
    Array.isArray(props.appt?.nursing_items_display) && props.appt.nursing_items_display.length > 0;
  if (hasDisplay) {
    return items;
  }
  const sibs = props.appt?.batch_siblings;
  if (!Array.isArray(sibs) || sibs.length === 0) {
    return items;
  }
  const seen = new Set(
    items.map((i: any) => {
      const cid = i?.category_id != null ? String(i.category_id) : '';
      const lab = String(i?.label ?? i?.category_name ?? '').trim();
      return `${cid}|${lab}`;
    }),
  );
  for (const s of sibs) {
    const label = String(s?.category_name ?? '').trim();
    if (!label) continue;
    const key = `|${label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ label, category_name: label });
  }
  return items;
});

/** Évite « Type de soin » répété après préstations #n / lot détail analyse. */
const showAppointmentCategoryNameRow = computed(() => {
  if (props.variant === 'details-only' && props.appt?.type === 'nursing') return false;
  if (props.variant === 'details-only' && props.appt?.type === 'blood_test' && bloodTestItems.value.length > 0) {
    return false;
  }
  if (props.appt?.type === 'nursing' && nursingItems.value.length > 1) return false;
  if (props.appt?.type === 'blood_test' && bloodTestItems.value.length > 1) return false;
  return true;
});

/** Options « racine » du form_data : masquées si chaque acte porte ses propres care_options. */
const showRootFormCareOptionRows = computed(() => {
  if (props.appt?.type !== 'nursing') return true;
  if (nursingItems.value.length <= 1) return true;
  const root = props.appt?.form_data?.care_options;
  if (!root || typeof root !== 'object' || Array.isArray(root)) return false;
  return Object.keys(root as object).length > 0;
});

/** Pied « durée / fréquence » uniquement sans bloc acte affiché (voir rdv nursing dans la boucle). */
const showSeparateFooterDurationFrequency = computed(() => {
  if (props.appt?.type !== 'nursing') return true;
  return nursingItems.value.length === 0;
});

function coerceFormCustomDaysForNursing(custom: unknown): number | null {
  if (custom == null) return null;
  if (typeof custom === 'number' && !Number.isNaN(custom)) return custom;
  if (typeof custom === 'string' && custom.trim() !== '') {
    const n = Number(custom.trim());
    return Number.isNaN(n) ? null : n;
  }
  if (Array.isArray(custom) && custom.length > 0) {
    const n = Number(custom[0]);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

/** Choix du passage réservation au niveau du RDV (commun aux actes affichés d’un même rendez-vous). */
function rdvNursingCareTypeDurationLabel(): string {
  const fd = props.appt?.form_data;
  const dd = fd?.duration_days;
  if (dd == null || dd === '') return '';
  const custom = coerceFormCustomDaysForNursing(fd?.custom_days);
  return getNursingDurationLabel(String(dd), custom);
}

function rdvNursingCareFrequencyLabel(): string {
  const fd = props.appt?.form_data;
  const f = fd?.frequency;
  if (f === null || f === undefined || f === '') return '';
  return getFrequencyLabel(String(f));
}

/** Méta par acte (si jamais stockée dans le JSON ou provenance ancienne). Affichées à part pour ne pas parasiter les vraies clés métier. */
const PER_ACT_NURSING_META_KEYS = new Set(['_duration_days', '_frequency', '_custom_days']);

function asCareOptionsRecord(raw: unknown): Record<string, unknown> {
  if (raw == null) return {};
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) return {};
    try {
      const p = JSON.parse(s) as unknown;
      if (p && typeof p === 'object' && !Array.isArray(p)) {
        return p as Record<string, unknown>;
      }
    } catch {
      /* ignoré */
    }
    return {};
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>;
  return {};
}

function nursingItemParsedCareOptions(item: Record<string, unknown> | null | undefined): Record<string, unknown> {
  return asCareOptionsRecord(item?.care_options);
}

function shouldShowCareOptionValue(val: unknown): boolean {
  if (val == null) return false;
  if (typeof val === 'string') return val.trim() !== '';
  if (typeof val === 'boolean') return true;
  if (typeof val === 'number') return !Number.isNaN(val);
  return true;
}

function formatUnknownCareOptionValue(val: unknown): string {
  if (val == null) return '';
  if (typeof val === 'boolean') return val ? 'Oui' : 'Non';
  if (typeof val === 'number' && !Number.isNaN(val)) return String(val);
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) {
    const parts = val.map((x) => formatUnknownCareOptionValue(x)).filter((s) => s !== '');
    return parts.join(', ');
  }
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }
  return String(val);
}

/** Prise en charge / fréquence éventuellement stockées sur l’acte (suffixe _ évite collision avec une vraie option métier nommée autrement). */
function nursingItemMetaDurationLabel(item: Record<string, unknown> | null | undefined): string {
  const o = nursingItemParsedCareOptions(item);
  const d = o._duration_days;
  if (d == null || d === '') return '';
  let customNum: number | null = null;
  const cu = o._custom_days;
  if (cu != null) {
    if (typeof cu === 'number' && !Number.isNaN(cu)) customNum = cu;
    else if (typeof cu === 'string') {
      const n = Number(cu);
      customNum = Number.isNaN(n) ? null : n;
    } else if (Array.isArray(cu) && cu.length > 0) {
      const n = Number(cu[0]);
      customNum = Number.isNaN(n) ? null : n;
    }
  }
  return getNursingDurationLabel(String(d), customNum);
}

function nursingItemMetaFrequencyLabel(item: Record<string, unknown> | null | undefined): string {
  const o = nursingItemParsedCareOptions(item);
  const f = o._frequency;
  if (f == null || f === '') return '';
  return getFrequencyLabel(String(f));
}

function nursingItemCareOptionEntries(item: Record<string, unknown> | null | undefined): [string, unknown][] {
  const parsed = nursingItemParsedCareOptions(item);
  return Object.entries(parsed).filter(([k, val]) => {
    if (k === 'type' || PER_ACT_NURSING_META_KEYS.has(k) || isCareAutreDetailKey(k)) return false;
    return shouldShowCareOptionValue(val);
  });
}

function getCareOptionLabelForCategory(optionKey: string, categoryId: string | null | undefined): string {
  const catId = categoryId ?? props.appt?.category_id ?? (props.appt?.form_data as any)?.category_id;
  if (!catId) return optionKey.replace(/_/g, ' ');
  const cat = props.categoriesForDetail.find((c) => String(c.id) === String(catId));
  const opt = cat?.options?.find((o) => o.option_key === optionKey);
  return opt?.label ?? optionKey.replace(/_/g, ' ');
}

function getCareOptionValueLabelForCategory(
  optionKey: string,
  value: unknown,
  categoryId: string | null | undefined,
  careOptions?: Record<string, unknown> | null,
): string {
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';

  const catId = categoryId ?? props.appt?.category_id ?? (props.appt?.form_data as any)?.category_id;
  const cat = catId ? props.categoriesForDetail.find((c) => String(c.id) === String(catId)) : undefined;
  const opt = cat?.options?.find((o) => o.option_key === optionKey);
  const catalogLabel = (): string | undefined => {
    if (!opt?.options || !Array.isArray(opt.options)) return undefined;
    if (typeof value === 'number' || typeof value === 'string') {
      const found = opt.options.find((o) => String(o.value) === String(value));
      return found?.label;
    }
    return undefined;
  };

  const fromCat = catalogLabel();
  const base = fromCat ?? formatUnknownCareOptionValue(value);
  const bag = careOptions ?? asCareOptionsRecord(props.appt?.form_data?.care_options);
  return formatCareSelectValueWithAutreDetail(base, optionKey, value, bag);
}

function nursingItemCareOptionsRecord(item: Record<string, unknown> | null | undefined): Record<string, unknown> {
  return nursingItemParsedCareOptions(item);
}

function bloodItemCareOptionsRecord(item: Record<string, unknown> | null | undefined): Record<string, unknown> {
  return asCareOptionsRecord(item?.care_options);
}

const bloodTestItems = computed(() => {
  const useOwnOnly = props.variant === 'details-only';
  const raw = useOwnOnly
    ? props.appt?.blood_test_items
    : (props.appt?.blood_test_items_display ?? props.appt?.blood_test_items);
  let items = Array.isArray(raw) ? [...raw] : [];
  if (props.appt?.type !== 'blood_test') {
    return items;
  }
  if (useOwnOnly) {
    items = filterBloodTestItemsForAppointmentDetail(props.appt, items);
    return items;
  }
  if (items.length > 1) {
    return items;
  }
  const hasDisplay =
    Array.isArray(props.appt?.blood_test_items_display) && props.appt.blood_test_items_display.length > 0;
  if (hasDisplay) {
    return items;
  }
  const sibs = props.appt?.batch_siblings;
  if (!Array.isArray(sibs) || sibs.length === 0) {
    return items;
  }
  const seen = new Set(
    items.map((i: any) => {
      const cid = i?.category_id != null ? String(i.category_id) : '';
      const lab = String(i?.label ?? i?.category_name ?? '').trim();
      return `${cid}|${lab}`;
    }),
  );
  for (const s of sibs) {
    const label = String(s?.category_name ?? '').trim();
    if (!label) continue;
    const key = `|${label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ label, category_name: label });
  }
  return items;
});

const isNursingDetailsGroupedLayout = computed(
  () => props.variant === 'details-only' && props.appt?.type === 'nursing' && nursingItems.value.length > 0,
);

const isBloodDetailsGroupedLayout = computed(
  () => props.variant === 'details-only' && props.appt?.type === 'blood_test' && bloodTestItems.value.length > 0,
);

function nursingItemCareOptionTypeValue(item: Record<string, unknown> | null | undefined): string | number | null {
  const o = nursingItemParsedCareOptions(item);
  const v = o.type;
  if (v == null || v === '') return null;
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string' || typeof v === 'boolean' || typeof v === 'bigint') return v as string | number;
  return null;
}

/** Icône + image catalogue pour un acte `nursing_items` (aligné sur la ligne « Type de soin »). */
function nursingItemCategoryVisual(item: Record<string, unknown> | null | undefined): {
  imageSrc: string | null;
  iconName: string;
} {
  const catIdRaw = item?.category_id;
  const idStr = catIdRaw != null && String(catIdRaw).trim() !== '' ? String(catIdRaw) : '';
  const cats = props.categoriesForDetail ?? [];
  const row = idStr ? cats.find((c) => String(c.id) === idStr) : undefined;
  const iconName = resolveCareIconFromCategory({
    icon: row?.icon ?? null,
    type: 'nursing',
  });
  const itemImg = (item as { category_image_url?: string | null })?.category_image_url;
  const rawImg =
    row?.image_url != null && String(row.image_url).trim() !== ''
      ? String(row.image_url)
      : itemImg != null && String(itemImg).trim() !== ''
        ? String(itemImg)
        : null;
  const imageSrc = resolveCareCategoryImageSrc(rawImg, config.public.apiBase);
  return {
    iconName,
    imageSrc,
  };
}

/** Libellé badge pour une ligne d’acte infirmier (détail lot). */
function nursingItemDisplayLabel(item: Record<string, unknown>): string {
  return String(item?.label ?? item?.category_name ?? 'Soin').trim() || 'Soin';
}

/** Évite de répéter le type sous chaque ligne quand une seule entrée reflète déjà celui déjà affiché en racine (`form_data.care_options.type`). */
function shouldShowNursingItemTypeRow(item: Record<string, unknown> | null | undefined): boolean {
  const iv = nursingItemCareOptionTypeValue(item);
  if (iv == null) return false;
  if (nursingItems.value.length > 1) return true;
  const raw = props.appt?.form_data?.care_options;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return true;
  const rv = (raw as Record<string, unknown>).type;
  if (rv == null || rv === '') return true;
  return String(iv) !== String(rv);
}

function nursingItemCareTypeOptionLabel(item: Record<string, unknown> | null | undefined): string {
  const v = nursingItemCareOptionTypeValue(item);
  if (v == null) return '';
  const cidRaw = item?.category_id;
  const cid =
    cidRaw !== null && cidRaw !== undefined && String(cidRaw).trim() !== ''
      ? String(cidRaw)
      : undefined;
  return getCareOptionValueLabelForCategory('type', v as string | number, cid, nursingItemCareOptionsRecord(item));
}

function bloodItemCareOptionEntries(item: Record<string, unknown> | null | undefined): [string, unknown][] {
  const parsed = asCareOptionsRecord(item?.care_options);
  return Object.entries(parsed).filter(([k, val]) => {
    if (k === 'type' || isCareAutreDetailKey(k)) return false;
    return shouldShowCareOptionValue(val);
  });
}

function bloodItemCareOptionTypeValue(item: Record<string, unknown> | null | undefined): string | number | null {
  const parsed = asCareOptionsRecord(item?.care_options);
  const v = parsed.type;
  if (v == null || v === '') return null;
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string' || typeof v === 'boolean' || typeof v === 'bigint') return v as string | number;
  return null;
}

function bloodItemCareTypeOptionLabel(item: Record<string, unknown> | null | undefined): string {
  const v = bloodItemCareOptionTypeValue(item);
  if (v == null) return '';
  const cidRaw = item?.category_id;
  const cid =
    cidRaw !== null && cidRaw !== undefined && String(cidRaw).trim() !== ''
      ? String(cidRaw)
      : undefined;
  return getCareOptionValueLabelForCategory('type', v as string | number, cid, bloodItemCareOptionsRecord(item));
}

function shouldShowBloodItemTypeRow(item: Record<string, unknown> | null | undefined): boolean {
  const iv = bloodItemCareOptionTypeValue(item);
  if (iv == null) return false;
  if (bloodTestItems.value.length > 1) return true;
  const raw = props.appt?.form_data?.care_options;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return true;
  const rv = (raw as Record<string, unknown>).type;
  if (rv == null || rv === '') return true;
  return String(iv) !== String(rv);
}

function bloodItemCategoryVisual(item: Record<string, unknown> | null | undefined): {
  imageSrc: string | null;
  iconName: string;
} {
  const catIdRaw = item?.category_id;
  const idStr = catIdRaw != null && String(catIdRaw).trim() !== '' ? String(catIdRaw) : '';
  const cats = props.categoriesForDetail ?? [];
  const row = idStr ? cats.find((c) => String(c.id) === idStr) : undefined;
  const iconName = resolveCareIconFromCategory({
    icon: row?.icon ?? null,
    type: 'blood_test',
  });
  const itemImg = (item as { category_image_url?: string | null })?.category_image_url;
  const rawImg =
    row?.image_url != null && String(row.image_url).trim() !== ''
      ? String(row.image_url)
      : itemImg != null && String(itemImg).trim() !== ''
        ? String(itemImg)
        : null;
  const imageSrc = resolveCareCategoryImageSrc(rawImg, config.public.apiBase);
  return {
    iconName,
    imageSrc,
  };
}

function bloodItemDisplayLabel(item: Record<string, unknown> | null | undefined): string {
  return String(item?.label ?? item?.category_name ?? 'Prestation').trim() || 'Prestation';
}

const careCategoryDisplay = computed(() => {
  const a = props.appt;
  const typeStr = a?.type === 'blood_test' ? 'blood_test' : 'nursing';
  const catId = a?.category_id ?? a?.form_data?.category_id;
  const cats = props.categoriesForDetail ?? [];
  const idStr = catId != null && String(catId).trim() !== '' ? String(catId) : '';
  const row = idStr ? cats.find((c) => String(c.id) === idStr) : undefined;
  const iconName = resolveCareIconFromCategory({
    icon: row?.icon ?? null,
    type: typeStr,
  });
  const rawImg =
    row?.image_url != null && String(row.image_url).trim() !== ''
      ? String(row.image_url)
      : a?.category_image_url != null && String(a.category_image_url).trim() !== ''
        ? String(a.category_image_url)
        : null;
  const imageSrc = resolveCareCategoryImageSrc(rawImg, config.public.apiBase);
  return {
    iconName,
    imageSrc,
  };
});

const careOptionTypeValue = computed((): string | number | null => {
  const raw = props.appt?.form_data?.care_options;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const v = (raw as Record<string, unknown>).type;
  if (v == null || v === '') return null;
  return v as string | number;
});

const careOptionsEntriesWithoutType = computed(() => {
  const raw = props.appt?.form_data?.care_options;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [] as [string, unknown][];
  return Object.entries(raw as Record<string, unknown>).filter(
    ([k, val]) => k !== 'type' && !isCareAutreDetailKey(k) && val != null && val !== '',
  );
});

/** Évite le doublon label/valeur quand les mêmes clés existent en racine et sur `blood_test_items[].care_options`. */
const careOptionsRootEntriesForBloodTestDisplay = computed(() => {
  const base = careOptionsEntriesWithoutType.value;
  if (props.appt?.type !== 'blood_test') return base;
  const keysOnItems = new Set<string>();
  for (const bItem of bloodTestItems.value) {
    for (const [k] of bloodItemCareOptionEntries(bItem)) {
      keysOnItems.add(k);
    }
  }
  if (keysOnItems.size === 0) return base;
  return base.filter(([k]) => !keysOnItems.has(k));
});

function getCareOptionLabel(optionKey: string): string {
  const catId = props.appt?.category_id ?? (props.appt?.form_data as any)?.category_id;
  if (!catId) return optionKey.replace(/_/g, ' ');
  const cat = props.categoriesForDetail.find((c) => String(c.id) === String(catId));
  const opt = cat?.options?.find((o) => o.option_key === optionKey);
  return opt?.label ?? optionKey.replace(/_/g, ' ');
}

function getCareOptionValueLabel(
  optionKey: string,
  value: string | number,
  careOptions?: Record<string, unknown> | null,
): string {
  const bag = careOptions ?? asCareOptionsRecord(props.appt?.form_data?.care_options);
  const catId = props.appt?.category_id ?? (props.appt?.form_data as any)?.category_id;
  if (!catId) {
    const base = String(value);
    return formatCareSelectValueWithAutreDetail(base, optionKey, value, bag);
  }
  const cat = props.categoriesForDetail.find((c) => String(c.id) === String(catId));
  const opt = cat?.options?.find((o) => o.option_key === optionKey);
  let base: string;
  if (opt?.options && Array.isArray(opt.options)) {
    const found = opt.options.find((o) => String(o.value) === String(value));
    base = found?.label ?? String(value);
  } else {
    base = String(value);
  }
  return formatCareSelectValueWithAutreDetail(base, optionKey, value, bag);
}

function getBloodTestTypeLabel(fd: any) {
  if (!fd?.blood_test_type) return '';
  if (fd.blood_test_type === 'single') return 'Un seul prélèvement';
  if (fd.blood_test_type === 'multiple') {
    const label = formatBloodTestSeriesDurationDays(fd.duration_days, fd.custom_days);
    return label ? `Plusieurs prélèvements sur ${label}` : 'Plusieurs prélèvements sur plusieurs jours';
  }
  return '';
}

function getFrequencyLabel(v: string) {
  const map: Record<string, string> = {
    once_daily: '1 fois par jour',
    twice_daily: '2 fois par jour',
    thrice_daily: '3 fois par jour',
    twice_weekly: '2 fois par semaine',
    thrice_weekly: '3 fois par semaine',
    to_define: 'A voir avec le professionnel',
    daily: '1 fois par jour',
    every_other_day: '1 jour sur 2',
  };
  return map[v] || v;
}

function openInGoogleMaps() {
  const parsed = addressParsed.value;
  if (parsed?.lat != null && parsed?.lng != null) {
    window.open(`https://www.google.com/maps?q=${parsed.lat},${parsed.lng}`, '_blank');
    return;
  }
  const q = addressLine.value;
  if (q) window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`, '_blank');
}

function openInWaze() {
  const parsed = addressParsed.value;
  if (parsed?.lat != null && parsed?.lng != null) {
    window.open(`https://waze.com/ul?ll=${parsed.lat},${parsed.lng}&navigate=yes`, '_blank');
    return;
  }
  const q = addressLine.value;
  if (q) window.open(`https://waze.com/ul?q=${encodeURIComponent(q)}&navigate=yes`, '_blank');
}
</script>

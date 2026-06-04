<template>
  <div class="space-y-1">
    <!-- Fiche RDV : même grille libellé / valeur que le reste de la page -->
    <div v-if="embeddedInRdvAccordion && loading" class="divide-y divide-default">
      <div :class="docKvRow">
        <div :class="docKvLeadingWrap">
          <UIcon name="i-lucide-files" :class="docKvLeadingIcon" aria-hidden="true" />
          <div :class="docKvLabel">
            Documents
          </div>
        </div>
        <div class="flex items-center gap-2 min-w-0 text-sm text-muted">
          <UIcon
            name="i-lucide-loader-2"
            class="w-5 h-5 animate-spin text-primary-500 shrink-0"
          />
          <span>Chargement…</span>
        </div>
      </div>
    </div>

    <div
      v-else-if="embeddedInRdvAccordion && !showStandardSection && !showResultatsSection"
      class="divide-y divide-default"
    >
      <div :class="docKvRow">
        <div :class="docKvLeadingWrap">
          <UIcon name="i-lucide-folder-open" :class="docKvLeadingIcon" aria-hidden="true" />
          <div :class="docKvLabel">
            Documents
          </div>
        </div>
        <div class="flex min-w-0 items-center gap-2">
          <UIcon
            name="i-lucide-file-down"
            class="h-4 w-4 shrink-0 text-muted"
            aria-hidden="true"
          />
          <p class="text-sm text-muted">
            Aucun document disponible
          </p>
        </div>
      </div>
    </div>

    <div
      v-else-if="embeddedInRdvAccordion && (showStandardSection || showResultatsSection)"
      class="divide-y divide-default"
    >
      <template v-if="showStandardSection">
        <div
          v-for="doc in standardDocuments"
          :key="doc.id"
          :id="'rdv-doc-' + doc.id"
          :data-document-type="doc.document_type"
          :class="docKvRow"
        >
          <div :class="docKvLeadingWrap">
            <UIcon :name="getDocTypeIcon(doc.document_type)" :class="docKvLeadingIcon" aria-hidden="true" />
            <div :class="docKvLabel">
              {{ getDocumentTypeLabel(doc.document_type) }}
            </div>
          </div>
          <div class="min-w-0">
            <div class="flex w-full min-w-0 flex-row flex-nowrap items-center justify-between gap-2 sm:gap-3">
              <div class="min-w-0 flex-1 space-y-1 overflow-hidden">
                <div v-if="doc._batchRdvLabel" class="flex flex-wrap items-center gap-2">
                  <UBadge
                    color="neutral"
                    variant="subtle"
                    size="xs"
                    class="font-normal max-w-[min(100%,14rem)] truncate"
                  >
                    {{ doc._batchRdvLabel }}
                  </UBadge>
                </div>
                <p
                  v-if="doc.document_type === 'care_photo' && formatCarePhotoMeta(doc)"
                  class="text-xs text-muted"
                >
                  {{ formatCarePhotoMeta(doc) }}
                </p>
                <div
                  v-if="doc.source === 'patient_profile'"
                  class="flex items-center gap-2 text-sm flex-nowrap"
                >
                  <template v-if="docPatientProfileDownloadAvailable(doc)">
                    <UIcon
                      name="i-lucide-circle-check"
                      class="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                    />
                    <span class="text-gray-700 dark:text-gray-200">Télécharger</span>
                  </template>
                  <template v-else>
                    <UIcon
                      name="i-lucide-file-x"
                      class="w-4 h-4 shrink-0 text-gray-400 dark:text-gray-500"
                    />
                    <span class="text-muted">Pas disponible</span>
                  </template>
                </div>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  icon="i-lucide-download"
                  :loading="downloadingIds?.has?.(doc.id) ?? downloadingIds?.includes?.(doc.id)"
                  :loading-auto="false"
                  aria-label="Télécharger"
                  :on-click="() => $emit('download', doc)"
                />
                <UButton
                  v-if="doc.document_type === 'care_photo' && carePhotoAppointmentId"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  icon="i-lucide-message-circle"
                  aria-label="Échanges"
                  :on-click="() => openCareDiscussion(doc)"
                />
                <UButton
                  v-if="canReplace && doc.document_type !== 'care_photo'"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  icon="i-lucide-refresh-cw"
                  :loading="uploadingTypes?.has?.(doc.document_type) ?? uploadingTypes?.includes?.(doc.document_type)"
                  :loading-auto="false"
                  aria-label="Remplacer"
                  :on-click="() => triggerReplace(doc)"
                />
              </div>
            </div>
          </div>
        </div>

        <template v-if="showUploadArea && standardUploadTypesWithoutDoc.length">
          <div
            v-for="docType in standardUploadTypesWithoutDoc"
            :key="docType.value"
            :class="docKvRow"
          >
            <div :class="docKvLeadingWrap">
              <UIcon :name="docType.icon || getDocTypeIcon(docType.value)" :class="docKvLeadingIcon" aria-hidden="true" />
              <div :class="docKvLabel">
                {{ docType.label }}
              </div>
            </div>
            <div class="min-w-0">
              <div class="flex w-full min-w-0 flex-row flex-nowrap items-center justify-end gap-2 sm:justify-between sm:gap-3">
                <p
                  v-if="docType.hint"
                  class="mr-2 hidden min-w-0 flex-1 truncate text-sm text-muted sm:block"
                >
                  {{ docType.hint }}
                </p>
                <div
                  class="shrink-0 rounded-lg sm:ml-auto"
                  :class="
                    draggedOver === docType.value
                      ? 'ring-2 ring-primary-500 dark:ring-primary-400 ring-offset-2 ring-offset-gray-50 dark:ring-offset-gray-900'
                      : ''
                  "
                  @dragover.prevent="setDraggedOver(docType.value)"
                  @dragleave.prevent="setDraggedOver(null)"
                  @drop.prevent="handleDrop($event, docType.value)"
                >
                  <UButton
                    type="button"
                    color="neutral"
                    variant="outline"
                    size="sm"
                    class="min-w-[6rem] justify-center"
                    :loading="uploadingTypes?.has?.(docType.value) ?? uploadingTypes?.includes?.(docType.value)"
                    :loading-auto="false"
                    :on-click="() => triggerUpload(docType.value)"
                  >
                    Ajouter
                  </UButton>
                </div>
              </div>
            </div>
          </div>
        </template>

        <div
          v-if="embeddedInRdvAccordion && enableCarePhotoUpload && carePhotoAppointmentId && omitCarePhotosInList !== true"
          :class="docKvRow"
        >
          <div :class="docKvLeadingWrap">
            <UIcon name="i-lucide-camera" :class="docKvLeadingIcon" aria-hidden="true" />
            <div :class="docKvLabel">
              Photo de soin
            </div>
          </div>
          <div class="min-w-0">
            <div class="flex w-full min-w-0 flex-row flex-nowrap items-center justify-end gap-2 sm:justify-between sm:gap-3">
              <p class="mr-2 hidden min-w-0 flex-1 truncate text-sm text-muted sm:block">
                Partagée avec le professionnel — image ou PDF · max 25&nbsp;Mo
              </p>
              <input
                ref="carePhotoFileInputRef"
                type="file"
                accept="image/jpeg,image/png,image/jpg,image/heic,image/heif,image/webp,application/pdf"
                class="hidden"
                @change="onCarePhotoFileChange"
              >
              <UButton
                type="button"
                color="neutral"
                variant="outline"
                size="sm"
                class="min-w-[6rem] shrink-0 justify-center"
                icon="i-lucide-camera"
                :loading="carePhotoUploading"
                :loading-auto="false"
                :on-click="() => triggerCarePhotoPicker()"
              >
                Ajouter
              </UButton>
            </div>
          </div>
        </div>
      </template>

      <template v-if="showResultatsSection">
        <div
          v-for="doc in resultatsDocuments"
          :key="doc.id"
          :id="'rdv-doc-' + doc.id"
          :data-document-type="doc.document_type"
          :class="docKvRow"
        >
          <div :class="docKvLeadingWrap">
            <UIcon :name="getDocTypeIcon(doc.document_type)" :class="docKvLeadingIcon" aria-hidden="true" />
            <div :class="docKvLabel">
              {{ getDocumentTypeLabel(doc.document_type) }}
            </div>
          </div>
          <div class="min-w-0">
            <div class="flex w-full min-w-0 flex-row flex-nowrap items-center justify-between gap-2 sm:gap-3">
              <div class="min-w-0 flex-1 space-y-1 overflow-hidden">
                <div
                  v-if="doc.source === 'patient_profile'"
                  class="flex flex-nowrap items-center gap-2 text-sm"
                >
                  <template v-if="docPatientProfileDownloadAvailable(doc)">
                    <UIcon
                      name="i-lucide-circle-check"
                      class="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                    />
                    <span class="text-gray-700 dark:text-gray-200">Télécharger</span>
                  </template>
                  <template v-else>
                    <UIcon
                      name="i-lucide-file-x"
                      class="w-4 h-4 shrink-0 text-gray-400 dark:text-gray-500"
                    />
                    <span class="text-muted">Pas disponible</span>
                  </template>
                </div>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  icon="i-lucide-download"
                  :loading="downloadingIds?.has?.(doc.id) ?? downloadingIds?.includes?.(doc.id)"
                  :loading-auto="false"
                  aria-label="Télécharger"
                  :on-click="() => $emit('download', doc)"
                />
                <UButton
                  v-if="canReplace"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  icon="i-lucide-refresh-cw"
                  :loading="uploadingTypes?.has?.(doc.document_type) ?? uploadingTypes?.includes?.(doc.document_type)"
                  :loading-auto="false"
                  aria-label="Remplacer"
                  :on-click="() => triggerReplace(doc)"
                />
              </div>
            </div>
          </div>
        </div>

        <template v-if="showUploadArea && resultatsUploadTypesWithoutDoc.length">
          <div
            v-for="docType in resultatsUploadTypesWithoutDoc"
            :key="docType.value"
            :class="docKvRow"
          >
            <div :class="docKvLeadingWrap">
              <UIcon :name="docType.icon || getDocTypeIcon('resultats')" :class="docKvLeadingIcon" aria-hidden="true" />
              <div :class="docKvLabel">
                {{ docType.label }}
              </div>
            </div>
            <div class="min-w-0">
              <div class="flex w-full min-w-0 flex-row flex-nowrap items-center justify-end gap-2 sm:gap-3">
                <div
                  class="shrink-0 rounded-lg sm:ml-auto"
                  :class="
                    draggedOver === docType.value
                      ? 'ring-2 ring-primary-500 dark:ring-primary-400 ring-offset-2 ring-offset-gray-50 dark:ring-offset-gray-900'
                      : ''
                  "
                  @dragover.prevent="setDraggedOver(docType.value)"
                  @dragleave.prevent="setDraggedOver(null)"
                  @drop.prevent="handleDrop($event, docType.value)"
                >
                  <UButton
                    type="button"
                    color="neutral"
                    variant="outline"
                    size="sm"
                    class="min-w-[6rem] justify-center"
                    :loading="uploadingTypes?.has?.(docType.value) ?? uploadingTypes?.includes?.(docType.value)"
                    :loading-auto="false"
                    :on-click="() => triggerUpload(docType.value)"
                  >
                    Ajouter
                  </UButton>
                </div>
              </div>
            </div>
          </div>
        </template>
      </template>
    </div>

    <!-- Profil / hors fiche : bandeaux et cartes -->
    <div
      v-else-if="!embeddedInRdvAccordion && loading"
      class="flex items-center justify-center py-12"
    >
      <UIcon
        name="i-lucide-loader-2"
        class="w-6 h-6 animate-spin text-primary-500 shrink-0"
      />
    </div>

    <UEmpty
      v-else-if="!embeddedInRdvAccordion && !showStandardSection && !showResultatsSection"
      icon="i-lucide-file-x"
      title="Aucun document"
      :description="emptyDescription"
      variant="naked"
      class="py-8"
    />

    <div v-else-if="!embeddedInRdvAccordion && (showStandardSection || showResultatsSection)" class="space-y-6">
      <!-- Documents (les résultats d'analyse peuvent être fusionnés ici si mergeResultatsIntoDocumentsList) -->
      <div
        v-if="showStandardSection"
        class="rounded-lg border border-gray-200/80 dark:border-gray-700/80 overflow-hidden bg-white dark:bg-gray-900/50 divide-y divide-gray-100 dark:divide-gray-800/80"
      >
        <div
          class="flex items-center gap-2 px-4 py-2.5 bg-gray-50/80 dark:bg-gray-800/50 border-b border-gray-200/80 dark:border-gray-700/80"
        >
          <UIcon name="i-lucide-files" :class="docKvLeadingIcon" aria-hidden="true" />
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Documents
          </p>
        </div>
        <div
          v-for="doc in standardDocuments"
          :key="doc.id"
          :id="'rdv-doc-' + doc.id"
          :data-document-type="doc.document_type"
          class="flex items-center gap-4 px-4 py-3 hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors group"
        >
          <div :class="docCardLeadingWrap">
            <UIcon :name="getDocTypeIcon(doc.document_type)" :class="docCardLeadingIcon" aria-hidden="true" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <p class="text-sm font-medium text-gray-900 dark:text-white">
                {{ getDocumentTypeLabel(doc.document_type) }}
              </p>
              <UBadge
                v-if="doc._batchRdvLabel"
                color="neutral"
                variant="subtle"
                size="xs"
                class="font-normal max-w-[min(100%,14rem)] truncate"
              >
                {{ doc._batchRdvLabel }}
              </UBadge>
            </div>
            <p
              v-if="doc.document_type === 'care_photo' && formatCarePhotoMeta(doc)"
              class="text-xs text-muted mt-0.5"
            >
              {{ formatCarePhotoMeta(doc) }}
            </p>
            <div
              v-if="doc.source === 'patient_profile'"
              class="flex items-center gap-2 text-xs mt-0.5"
            >
              <template v-if="docPatientProfileDownloadAvailable(doc)">
                <UIcon
                  name="i-lucide-circle-check"
                  class="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                />
                <span class="text-gray-600 dark:text-gray-300">Télécharger</span>
              </template>
              <template v-else>
                <UIcon
                  name="i-lucide-file-x"
                  class="w-3.5 h-3.5 shrink-0 text-gray-400 dark:text-gray-500"
                />
                <span class="text-gray-500 dark:text-gray-400">Pas disponible</span>
              </template>
            </div>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <UButton
              color="neutral"
              variant="ghost"
              size="xs"
              icon="i-lucide-download"
              :loading="downloadingIds?.has?.(doc.id) ?? downloadingIds?.includes?.(doc.id)"
              :loading-auto="false"
              aria-label="Télécharger"
              :on-click="() => $emit('download', doc)"
            />
            <UButton
              v-if="doc.document_type === 'care_photo' && carePhotoAppointmentId"
              color="neutral"
              variant="ghost"
              size="xs"
              icon="i-lucide-message-circle"
              aria-label="Échanges"
              :on-click="() => openCareDiscussion(doc)"
            />
            <UButton
              v-if="canReplace && doc.document_type !== 'care_photo'"
              color="neutral"
              variant="ghost"
              size="xs"
              icon="i-lucide-refresh-cw"
              :loading="uploadingTypes?.has?.(doc.document_type) ?? uploadingTypes?.includes?.(doc.document_type)"
              :loading-auto="false"
              aria-label="Remplacer"
              :on-click="() => triggerReplace(doc)"
            />
          </div>
        </div>

        <template v-if="showUploadArea && standardUploadTypesWithoutDoc.length">
          <div
            v-for="docType in standardUploadTypesWithoutDoc"
            :key="docType.value"
            class="flex items-center gap-4 px-4 py-3 border-t border-dashed border-gray-200 dark:border-gray-700/60"
          >
            <div :class="docCardLeadingWrap">
              <UIcon :name="docType.icon" :class="docCardLeadingIcon" aria-hidden="true" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 dark:text-white">
                {{ docType.label }}
              </p>
            </div>
            <div
              class="shrink-0 rounded-lg"
              :class="
                draggedOver === docType.value
                  ? 'ring-2 ring-primary-500 dark:ring-primary-400 ring-offset-2 ring-offset-gray-50 dark:ring-offset-gray-900'
                  : ''
              "
              @dragover.prevent="setDraggedOver(docType.value)"
              @dragleave.prevent="setDraggedOver(null)"
              @drop.prevent="handleDrop($event, docType.value)"
            >
              <UButton
                type="button"
                color="neutral"
                variant="outline"
                size="sm"
                class="min-w-[6rem] justify-center"
                :loading="uploadingTypes?.has?.(docType.value) ?? uploadingTypes?.includes?.(docType.value)"
                :loading-auto="false"
                :on-click="() => triggerUpload(docType.value)"
              >
                Ajouter
              </UButton>
            </div>
          </div>
        </template>

        <div
          v-if="!embeddedInRdvAccordion && enableCarePhotoUpload && carePhotoAppointmentId && omitCarePhotosInList !== true"
          class="flex items-center gap-4 px-4 py-3 border-t border-dashed border-gray-200 dark:border-gray-700/60"
        >
          <div :class="docCardLeadingWrap">
            <UIcon :name="getDocTypeIcon('care_photo')" :class="docCardLeadingIcon" aria-hidden="true" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 dark:text-white">
              Photo de soin
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Partagée avec le professionnel — JPG, PNG · max 25&nbsp;Mo
            </p>
          </div>
          <input
            ref="carePhotoFileInputRef"
            type="file"
            accept="image/jpeg,image/png,image/jpg,image/heic,image/heif,image/webp,application/pdf"
            class="hidden"
            @change="onCarePhotoFileChange"
          >
          <UButton
            type="button"
            color="neutral"
            variant="outline"
            size="sm"
            class="min-w-[6rem] shrink-0 justify-center"
            icon="i-lucide-camera"
            :loading="carePhotoUploading"
            :loading-auto="false"
            :on-click="() => triggerCarePhotoPicker()"
          >
            Ajouter
          </UButton>
        </div>
      </div>

      <!-- Résultats d'analyses -->
      <div
        v-if="showResultatsSection"
        class="rounded-lg border-2 border-red-200 dark:border-red-900/60 overflow-hidden bg-red-50/40 dark:bg-red-950/30 shadow-sm"
      >
        <div
          class="px-4 py-2.5 bg-red-100/90 dark:bg-red-950/50 border-b border-red-200/90 dark:border-red-900/50 flex items-center gap-2"
        >
          <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-red-200/90 dark:bg-red-900/50 flex-shrink-0">
            <UIcon name="i-lucide-flask-conical" class="w-4 h-4 text-red-700 dark:text-red-300" />
          </div>
          <div>
            <p class="text-sm font-semibold text-red-900 dark:text-red-100">
              Résultats d'analyses
            </p>
            <p class="text-xs text-red-700/90 dark:text-red-300/90">
              Compte rendu laboratoire — PDF uniquement, max 25 Mo
            </p>
          </div>
        </div>
        <div class="divide-y divide-red-100/80 dark:divide-red-900/40">
          <div
            v-for="doc in resultatsDocuments"
            :key="doc.id"
            :id="'rdv-doc-' + doc.id"
            :data-document-type="doc.document_type"
            class="flex items-center gap-4 px-4 py-3 hover:bg-red-100/50 dark:hover:bg-red-950/40 transition-colors group"
          >
            <div :class="docCardLeadingWrap">
              <UIcon name="i-lucide-flask-conical" :class="docCardLeadingIcon" aria-hidden="true" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-red-950 dark:text-red-50">
                {{ getDocumentTypeLabel(doc.document_type) }}
              </p>
              <div
                v-if="doc.source === 'patient_profile'"
                class="flex items-center gap-2 text-xs mt-0.5"
              >
                <template v-if="docPatientProfileDownloadAvailable(doc)">
                  <UIcon
                    name="i-lucide-circle-check"
                    class="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                  />
                  <span class="text-red-900/90 dark:text-red-100/90">Télécharger</span>
                </template>
                <template v-else>
                  <UIcon
                    name="i-lucide-file-x"
                    class="w-3.5 h-3.5 shrink-0 text-red-800/50 dark:text-red-300/60"
                  />
                  <span class="text-red-800/80 dark:text-red-300/80">Pas disponible</span>
                </template>
              </div>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                icon="i-lucide-download"
                :loading="downloadingIds?.has?.(doc.id) ?? downloadingIds?.includes?.(doc.id)"
                :loading-auto="false"
                aria-label="Télécharger"
                :on-click="() => $emit('download', doc)"
              />
              <UButton
                v-if="canReplace"
                color="neutral"
                variant="ghost"
                size="xs"
                icon="i-lucide-refresh-cw"
                :loading="uploadingTypes?.has?.(doc.document_type) ?? uploadingTypes?.includes?.(doc.document_type)"
                :loading-auto="false"
                aria-label="Remplacer"
                :on-click="() => triggerReplace(doc)"
              />
            </div>
          </div>

          <template v-if="showUploadArea && resultatsUploadTypesWithoutDoc.length">
            <div
              v-for="docType in resultatsUploadTypesWithoutDoc"
              :key="docType.value"
              class="flex items-center gap-4 px-4 py-3 border-t border-dashed border-red-200 dark:border-red-800/60"
            >
              <div :class="docCardLeadingWrap">
                <UIcon :name="docType.icon || 'i-lucide-flask-conical'" :class="docCardLeadingIcon" aria-hidden="true" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-red-950 dark:text-red-50">
                  {{ docType.label }}
                </p>
              </div>
              <div
                class="shrink-0 rounded-lg"
                :class="
                  draggedOver === docType.value
                    ? 'ring-2 ring-red-500 dark:ring-red-400 ring-offset-2 ring-offset-gray-50 dark:ring-offset-gray-900'
                    : ''
                "
                @dragover.prevent="setDraggedOver(docType.value)"
                @dragleave.prevent="setDraggedOver(null)"
                @drop.prevent="handleDrop($event, docType.value)"
              >
                <UButton
                  type="button"
                  color="error"
                  variant="outline"
                  size="sm"
                  class="min-w-[6rem] justify-center"
                  :loading="uploadingTypes?.has?.(docType.value) ?? uploadingTypes?.includes?.(docType.value)"
                  :loading-auto="false"
                  :on-click="() => triggerUpload(docType.value)"
                >
                  Ajouter
                </UButton>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Hidden file inputs for upload -->
    <template v-if="showUploadArea && uploadTypes?.length">
      <input
        v-for="docType in uploadTypes"
        :key="`input-${docType.value}`"
        :ref="el => setFileInputRef(docType.value, el)"
        type="file"
        :accept="docType.accept || 'image/*,.pdf'"
        class="hidden"
        @change="handleFileSelect($event, docType.value)"
      >
    </template>
    <!-- Input générique pour remplacer (types hors uploadTypes) -->
    <input
      ref="replaceInputRef"
      type="file"
      accept="image/*,.pdf"
      class="hidden"
      @change="handleReplaceFileSelect"
    >
    <CarePhotoDiscussionModal
      v-if="omitCarePhotosInList !== true"
      v-model:open="careDiscussionOpen"
      :appointment-id="carePhotoAppointmentId ?? undefined"
      :document-id="careDiscussionDocId ?? undefined"
      :viewer-user-id="documentsViewerId ?? undefined"
      @comment-posted="onCarePhotoCommentPosted"
      @file-uploaded="onCarePhotoCommentPosted"
    />
  </div>
</template>

<script setup lang="ts">
/** Fourni par `RdvDocumentsEmbeddedProvide` sur la fiche détail RDV : grille libellé / valeur comme le reste de la page. */
const embeddedInRdvAccordion = inject<boolean>('rdvAppointmentDocumentsEmbedded', false);

/** Fiche RDV : deux colonnes dès le mobile (libellé + actions sur une ligne), puis grille KV habituelle au ≥sm. */
const docKvRow =
  'grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] items-center gap-x-2 gap-y-0 px-4 py-3 sm:grid-cols-[minmax(9.5rem,11rem)_minmax(0,1fr)] sm:gap-x-4 sm:px-6 sm:py-2.5';
const docKvLabel =
  'min-w-0 truncate text-[11px] font-semibold uppercase tracking-wide text-muted shrink leading-none sm:self-center';
/** Icônes Lucide outline grises à gauche des libellés (fiche RDV). */
const docKvLeadingWrap =
  'flex min-w-0 max-w-[min(100%,11rem)] items-center gap-1.5 sm:max-w-none sm:gap-2 sm:self-center';
const docKvLeadingIcon = 'h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500';
/** Tuile neutre + icône grise (liste documents hors fiche RDV). */
const docCardLeadingWrap =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-gray-200/90 dark:ring-gray-700/70 bg-gray-50/90 dark:bg-gray-900/40';
const docCardLeadingIcon = 'h-4 w-4 text-gray-500 dark:text-gray-400';

const DOC_TYPE_LABELS: Record<string, string> = {
  carte_vitale: 'Carte Vitale',
  carte_mutuelle: 'Carte Mutuelle',
  ordonnance: 'Ordonnance',
  resultats: 'Résultats',
  autres_assurances: 'Autre prescription',
  care_photo: 'Photo de soin',
  other: 'Autre',
};

const DOC_TYPE_ICONS: Record<string, string> = {
  carte_vitale: 'i-lucide-credit-card',
  carte_mutuelle: 'i-lucide-shield',
  ordonnance: 'i-lucide-file-text',
  resultats: 'i-lucide-flask-conical',
  autres_assurances: 'i-lucide-file-text',
  care_photo: 'i-lucide-camera',
  other: 'i-lucide-file',
};

const props = withDefaults(
  defineProps<{
    documents: any[]
    loading?: boolean
    emptyDescription?: string
    showUploadArea?: boolean
    uploadTypes?: { value: string; label: string; icon: string; color?: string; accept?: string; hint?: string }[]
    canReplace?: boolean
    downloadingIds?: Set<string> | string[]
    uploadingTypes?: Set<string> | string[]
    /** false = masquer la section « Résultats d'analyses » (ex. infirmier ; lab / subaccount / admin la gardent) */
    showResultats?: boolean
    /**
     * Si true, les docs `resultats` apparaissent dans la liste « Documents » (téléchargement) au lieu d’être exclus.
     * À combiner avec showResultats=false pour l’infirmier sur prise de sang uniquement (voir page nurse).
     */
    mergeResultatsIntoDocumentsList?: boolean
    /** RDV : id pour échanges photos de soin / upload infirmier */
    carePhotoAppointmentId?: string | null
    /** Infirmier : afficher la ligne d’ajout (POST care-photos) */
    enableCarePhotoUpload?: boolean
    carePhotoUploading?: boolean
    /** Fiche RDV (pro/nurse) : photos de soins affichées dans une carte séparée, pas mélangées aux documents */
    omitCarePhotosInList?: boolean
  }>(),
  {
    loading: false,
    emptyDescription: "Aucun document médical n'a été déposé pour ce rendez-vous.",
    showUploadArea: false,
    uploadTypes: () => [],
    canReplace: false,
    downloadingIds: () => new Set<string>(),
    uploadingTypes: () => new Set<string>(),
    showResultats: true,
    mergeResultatsIntoDocumentsList: false,
    carePhotoAppointmentId: null,
    enableCarePhotoUpload: false,
    carePhotoUploading: false,
    omitCarePhotosInList: false,
  }
);

const emit = defineEmits<{
  download: [doc: any]
  replace: [doc: any]
  upload: [docType: string, file: File]
  carePhotoUpload: [file: File]
  carePhotoThreadUpdated: []
}>();

const { user } = useAuth();
const documentsViewerId = computed(() => (user.value?.id != null ? String(user.value.id) : null));

const draggedOver = ref<string | null>(null);
const fileInputRefs = ref<Record<string, HTMLInputElement>>({});
const replaceInputRef = ref<HTMLInputElement | null>(null);
const replacingDocType = ref<string | null>(null);

function setFileInputRef(docType: string, el: any) {
  if (el) fileInputRefs.value[docType] = el as HTMLInputElement;
}

function getDocumentTypeLabel(type: string) {
  return DOC_TYPE_LABELS[type] || type?.replace(/_/g, ' ') || 'Document';
}

function formatCarePhotoMeta(doc: any) {
  if (!doc?.created_at) return '';
  try {
    return new Date(doc.created_at).toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(doc.created_at);
  }
}

const careDiscussionOpen = ref(false);
const careDiscussionDocId = ref<string | null>(null);
const carePhotoFileInputRef = ref<HTMLInputElement | null>(null);

function openCareDiscussion(doc: any) {
  if (!doc?.id || !props.carePhotoAppointmentId) return;
  careDiscussionDocId.value = String(doc.id);
  careDiscussionOpen.value = true;
}

const carePhotoDocsForDeepLink = computed(() => {
  if (props.omitCarePhotosInList) return [];
  const aid = props.carePhotoAppointmentId ? String(props.carePhotoAppointmentId) : '';
  return (props.documents || []).filter(
    (d: any) =>
      d.document_type === 'care_photo' &&
      (!aid || String(d.appointment_id || '') === aid),
  );
});

useCareGalleryNotificationDeepLink({
  careDocs: carePhotoDocsForDeepLink,
  documentsLoading: computed(() => props.loading === true),
  openCareDiscussion,
});

function onCarePhotoCommentPosted() {
  emit('carePhotoThreadUpdated');
}

function triggerCarePhotoPicker() {
  carePhotoFileInputRef.value?.click();
}

function onCarePhotoFileChange(ev: Event) {
  const target = ev.target as HTMLInputElement;
  const file = target.files?.[0];
  target.value = '';
  if (file) emit('carePhotoUpload', file);
}

/** Documents issus du profil patient : indicateur visuel au lieu du libellé « Compte patient ». */
function docPatientProfileDownloadAvailable(doc: any) {
  if (!doc?.id) return false;
  if (doc.file_missing === true || doc.missing_file === true) return false;
  return true;
}

function getDocTypeIcon(type: string) {
  return DOC_TYPE_ICONS[type] || 'i-lucide-file';
}

function getDocsByType(docType: string) {
  return (props.documents || []).filter((d: any) => d.document_type === docType);
}

const standardUploadTypes = computed(() => (props.uploadTypes || []).filter((t) => t.value !== 'resultats'));
const resultatsUploadTypes = computed(() => (props.uploadTypes || []).filter((t) => t.value === 'resultats'));

const standardDocuments = computed(() =>
  (props.documents || []).filter((d: any) => {
    if (props.omitCarePhotosInList === true && d.document_type === 'care_photo') return false;
    if (d.document_type === 'resultats') return props.mergeResultatsIntoDocumentsList === true;
    return true;
  }),
);
const resultatsDocuments = computed(() => (props.documents || []).filter((d: any) => d.document_type === 'resultats'));

const standardUploadTypesWithoutDoc = computed(() => {
  if (!standardUploadTypes.value.length) return [];
  return standardUploadTypes.value.filter((t) => getDocsByType(t.value).length === 0);
});
const resultatsUploadTypesWithoutDoc = computed(() => {
  if (!resultatsUploadTypes.value.length) return [];
  return resultatsUploadTypes.value.filter((t) => getDocsByType(t.value).length === 0);
});

const showStandardSection = computed(
  () =>
    standardDocuments.value.length > 0 ||
    (props.showUploadArea && standardUploadTypes.value.length > 0) ||
    (props.enableCarePhotoUpload === true && props.omitCarePhotosInList !== true),
);
const showResultatsSection = computed(() => {
  if (props.showResultats === false) return false;
  return (
    resultatsDocuments.value.length > 0 || (props.showUploadArea && resultatsUploadTypes.value.length > 0)
  );
});

function setDraggedOver(v: string | null) {
  draggedOver.value = v;
}

function triggerUpload(docType: string, forceReplace = false) {
  const docs = getDocsByType(docType);
  if (docs.length > 0 && !forceReplace) return;
  fileInputRefs.value[docType]?.click();
}

function triggerReplace(doc: any) {
  const docType = doc.document_type;
  if (fileInputRefs.value[docType]) {
    fileInputRefs.value[docType].click();
  } else {
    replacingDocType.value = docType;
    replaceInputRef.value?.click();
  }
}

function handleReplaceFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  if (!target.files?.length || !replacingDocType.value) return;
  emit('upload', replacingDocType.value, target.files[0]);
  replacingDocType.value = null;
  target.value = '';
}

function handleFileSelect(event: Event, docType: string) {
  const target = event.target as HTMLInputElement;
  if (target.files?.length) {
    emit('upload', docType, target.files[0]);
    target.value = '';
  }
}

function handleDrop(event: DragEvent, docType: string) {
  draggedOver.value = null;
  const files = event.dataTransfer?.files;
  if (!files?.length) return;
  emit('upload', docType, files[0]);
}
</script>

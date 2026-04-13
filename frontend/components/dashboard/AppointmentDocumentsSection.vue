<template>
  <div class="space-y-1">
    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin text-primary-500" />
    </div>

    <!-- Empty state (y compris si seuls des résultats existent mais sont masqués pour ce rôle) -->
    <UEmpty
      v-else-if="!showStandardSection && !showResultatsSection"
      icon="i-lucide-file-x"
      title="Aucun document"
      :description="emptyDescription"
      variant="naked"
      class="py-8"
    />

    <div v-else-if="showStandardSection || showResultatsSection" class="space-y-6">
      <!-- Documents (les résultats d'analyse peuvent être fusionnés ici si mergeResultatsIntoDocumentsList) -->
      <div v-if="showStandardSection" class="rounded-lg border border-gray-200/80 dark:border-gray-700/80 overflow-hidden bg-white dark:bg-gray-900/50 divide-y divide-gray-100 dark:divide-gray-800/80">
        <div class="px-4 py-2.5 bg-gray-50/80 dark:bg-gray-800/50 border-b border-gray-200/80 dark:border-gray-700/80">
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Documents
          </p>
        </div>
        <div
          v-for="doc in standardDocuments"
          :key="doc.id"
          class="flex items-center gap-4 px-4 py-3 hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors group"
        >
          <div :class="['flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0', getDocTypeBgClass(getDocTypeColor(doc.document_type))]">
            <UIcon :name="getDocTypeIcon(doc.document_type)" :class="['w-4 h-4', getDocTypeIconClass(getDocTypeColor(doc.document_type))]" />
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
            <p v-if="doc.source === 'patient_profile'" class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Compte patient
            </p>
          </div>
          <div class="flex items-center gap-1.5">
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

        <template v-if="showUploadArea && standardUploadTypesWithoutDoc.length">
          <div
            v-for="docType in standardUploadTypesWithoutDoc"
            :key="docType.value"
            class="flex items-center gap-4 px-4 py-3 border-t border-dashed border-gray-200 dark:border-gray-700/60"
          >
            <div :class="['flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0', getDocTypeBgClass(docType.color || 'gray')]">
              <UIcon :name="docType.icon" :class="['w-4 h-4', getDocTypeIconClass(docType.color || 'gray')]" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-500 dark:text-gray-400">
                {{ docType.label }}
              </p>
              <p class="text-xs text-gray-400 dark:text-gray-500">
                {{ docType.hint || 'Glisser-déposer ou cliquer pour ajouter' }}
              </p>
            </div>
            <div
              :class="[
                'w-24 rounded-lg border-2 border-dashed transition-all cursor-pointer h-10 flex items-center justify-center flex-shrink-0',
                draggedOver === docType.value
                  ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500',
                (uploadingTypes?.has?.(docType.value) ?? uploadingTypes?.includes?.(docType.value)) ? 'opacity-50 pointer-events-none' : ''
              ]"
              @dragover.prevent="setDraggedOver(docType.value)"
              @dragleave.prevent="setDraggedOver(null)"
              @drop.prevent="handleDrop($event, docType.value)"
              @click="triggerUpload(docType.value)"
            >
              <UIcon
                v-if="uploadingTypes?.has?.(docType.value) ?? uploadingTypes?.includes?.(docType.value)"
                name="i-lucide-loader-2"
                class="w-4 h-4 animate-spin text-primary-500"
              />
              <UIcon v-else name="i-lucide-plus" class="w-4 h-4 text-gray-400" />
            </div>
          </div>
        </template>
        <p v-if="showUploadArea && standardUploadTypes.length" class="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-900/30 border-t border-gray-100 dark:border-gray-800/80">
          Formats : JPG, PNG, PDF • max 25 Mo
        </p>
      </div>

      <!-- Résultats d'analyses (section dédiée, mise en avant rouge) -->
      <div
        v-if="showResultatsSection"
        class="rounded-lg border-2 border-red-200 dark:border-red-900/60 overflow-hidden bg-red-50/40 dark:bg-red-950/30 shadow-sm"
      >
        <div class="px-4 py-2.5 bg-red-100/90 dark:bg-red-950/50 border-b border-red-200/90 dark:border-red-900/50 flex items-center gap-2">
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
            class="flex items-center gap-4 px-4 py-3 hover:bg-red-100/50 dark:hover:bg-red-950/40 transition-colors group"
          >
            <div class="flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0 bg-red-200/90 dark:bg-red-900/45">
              <UIcon name="i-lucide-flask-conical" class="w-4 h-4 text-red-700 dark:text-red-300" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-red-950 dark:text-red-50">
                {{ getDocumentTypeLabel(doc.document_type) }}
              </p>
              <p v-if="doc.source === 'patient_profile'" class="text-xs text-red-800/80 dark:text-red-300/80 mt-0.5">
                Compte patient
              </p>
            </div>
            <div class="flex items-center gap-1.5">
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
              <div class="flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0 bg-red-200/90 dark:bg-red-900/45">
                <UIcon :name="docType.icon || 'i-lucide-flask-conical'" class="w-4 h-4 text-red-700 dark:text-red-300" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-red-900 dark:text-red-100">
                  {{ docType.label }}
                </p>
                <p class="text-xs text-red-800/85 dark:text-red-300/80">
                  {{ docType.hint || 'Glisser-déposer ou cliquer pour ajouter' }}
                </p>
              </div>
              <div
                :class="[
                  'w-24 rounded-lg border-2 border-dashed transition-all cursor-pointer h-10 flex items-center justify-center flex-shrink-0',
                  draggedOver === docType.value
                    ? 'border-red-600 bg-red-100/80 dark:bg-red-900/40'
                    : 'border-red-300 dark:border-red-700 hover:border-red-500 dark:hover:border-red-500',
                  (uploadingTypes?.has?.(docType.value) ?? uploadingTypes?.includes?.(docType.value)) ? 'opacity-50 pointer-events-none' : ''
                ]"
                @dragover.prevent="setDraggedOver(docType.value)"
                @dragleave.prevent="setDraggedOver(null)"
                @drop.prevent="handleDrop($event, docType.value)"
                @click="triggerUpload(docType.value)"
              >
                <UIcon
                  v-if="uploadingTypes?.has?.(docType.value) ?? uploadingTypes?.includes?.(docType.value)"
                  name="i-lucide-loader-2"
                  class="w-4 h-4 animate-spin text-red-600"
                />
                <UIcon v-else name="i-lucide-plus" class="w-4 h-4 text-red-500" />
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <UEmpty
      v-else
      icon="i-lucide-file-x"
      title="Aucun document"
      :description="emptyDescription"
      variant="naked"
      class="py-8"
    />

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
  </div>
</template>

<script setup lang="ts">
const DOC_TYPE_LABELS: Record<string, string> = {
  carte_vitale: 'Carte Vitale',
  carte_mutuelle: 'Carte Mutuelle',
  ordonnance: 'Ordonnance',
  resultats: 'Résultats',
  autres_assurances: 'Autres assurances',
  other: 'Autre',
};

const DOC_TYPE_ICONS: Record<string, string> = {
  carte_vitale: 'i-lucide-credit-card',
  carte_mutuelle: 'i-lucide-shield',
  ordonnance: 'i-lucide-file-text',
  resultats: 'i-lucide-flask-conical',
  autres_assurances: 'i-lucide-briefcase',
  other: 'i-lucide-file',
};

const DOC_TYPE_COLORS: Record<string, string> = {
  carte_vitale: 'green',
  carte_mutuelle: 'blue',
  ordonnance: 'orange',
  resultats: 'red',
  autres_assurances: 'purple',
  other: 'gray',
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
  }
);

const emit = defineEmits<{
  download: [doc: any]
  replace: [doc: any]
  upload: [docType: string, file: File]
}>();

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

function getDocTypeIcon(type: string) {
  return DOC_TYPE_ICONS[type] || 'i-lucide-file';
}

function getDocTypeColor(type: string) {
  return DOC_TYPE_COLORS[type] || 'gray';
}

function getDocTypeBgClass(color: string) {
  const map: Record<string, string> = {
    green: 'bg-green-100 dark:bg-green-900/30',
    blue: 'bg-blue-100 dark:bg-blue-900/30',
    orange: 'bg-orange-100 dark:bg-orange-900/30',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30',
    red: 'bg-red-200/90 dark:bg-red-900/45',
    purple: 'bg-purple-100 dark:bg-purple-900/30',
    gray: 'bg-gray-100 dark:bg-gray-800/50',
  };
  return map[color] || map.gray;
}

function getDocTypeIconClass(color: string) {
  const map: Record<string, string> = {
    green: 'text-green-600 dark:text-green-400',
    blue: 'text-blue-600 dark:text-blue-400',
    orange: 'text-orange-600 dark:text-orange-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    red: 'text-red-700 dark:text-red-300',
    purple: 'text-purple-600 dark:text-purple-400',
    gray: 'text-gray-600 dark:text-gray-400',
  };
  return map[color] || map.gray;
}

function getDocsByType(docType: string) {
  return (props.documents || []).filter((d: any) => d.document_type === docType);
}

const standardUploadTypes = computed(() => (props.uploadTypes || []).filter((t) => t.value !== 'resultats'));
const resultatsUploadTypes = computed(() => (props.uploadTypes || []).filter((t) => t.value === 'resultats'));

const standardDocuments = computed(() =>
  (props.documents || []).filter((d: any) => {
    if (d.document_type === 'care_photo') return false;
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
    standardDocuments.value.length > 0 || (props.showUploadArea && standardUploadTypes.value.length > 0),
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

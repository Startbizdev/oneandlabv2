<template>
  <UCard
    class="hover:shadow-lg transition-all duration-200"
    :ui="{
      body: { padding: 'p-4' },
      ring: 'ring-1 ring-gray-200 dark:ring-gray-700',
      shadow: 'shadow-sm',
    }"
  >
    <div class="space-y-3">
      <div class="flex items-start justify-between gap-2">
        <div class="flex items-start gap-3 flex-1 min-w-0">
          <div
            :class="[
              'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
              iconColorClass,
            ]"
          >
            <UIcon :name="config.icon" class="w-5 h-5" :class="iconTextClass" />
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-medium text-base text-gray-900 dark:text-white truncate">
              {{ config.label }}
            </h3>
            <UBadge
              :color="config.required ? 'amber' : 'gray'"
              variant="subtle"
              size="xs"
              class="mt-1"
            >
              {{ config.required ? 'Obligatoire' : 'Optionnel' }}
            </UBadge>
          </div>
        </div>
        <UButton
          v-if="document"
          variant="ghost"
          size="xs"
          color="primary"
          icon="i-lucide-download"
          @click="handleDownload"
          class="shrink-0"
          aria-label="Télécharger le document"
        />
      </div>

      <div
        v-if="document"
        class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3"
      >
        <div class="flex items-start gap-2">
          <UIcon
            name="i-lucide-check-circle-2"
            class="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5"
          />
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-green-900 dark:text-green-100 truncate">
              {{ document.file_name }}
            </p>
            <p class="text-xs text-green-700 dark:text-green-300 mt-0.5">
              Mis à jour : {{ formatDate(document.updated_at) }}
            </p>
          </div>
        </div>
      </div>

      <UFileUpload
        :model-value="selectedFile"
        :accept="config.acceptedTypes.join(',')"
        :label="uploadLabel"
        :description="uploadDescription"
        :compact="true"
        @update:model-value="handleFileSelect"
      />

      <div
        v-if="isUploading"
        class="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400 py-2"
      >
        <UIcon
          name="i-lucide-loader-2"
          class="w-4 h-4 animate-spin text-primary"
        />
        <span>Enregistrement en cours...</span>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import type { DocumentConfig, PatientDocument } from '~/types/profile'

interface Props {
  config: DocumentConfig
  document: PatientDocument | undefined
  isUploading: boolean
}

interface Emits {
  (e: 'upload', file: File): void
  (e: 'download', data: { id: string; fileName: string }): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const selectedFile = ref<File | null>(null)

const uploadLabel = computed(() => {
  return props.document
    ? 'Remplacer le document'
    : 'Glisser-déposer ou cliquer'
})

const uploadDescription = computed(() => {
  const types = props.config.acceptedTypes
    .map((t) => t.replace('image/', '').replace('application/', '').toUpperCase())
    .join(', ')
  return `${types} (max ${props.config.maxSize}MB)`
})

const iconColorClass = computed(() => {
  const map: Record<string, string> = {
    blue: 'bg-blue-50 dark:bg-blue-900/20',
    purple: 'bg-purple-50 dark:bg-purple-900/20',
    gray: 'bg-gray-50 dark:bg-gray-800/50',
  }
  return map[props.config.iconColor] ?? 'bg-gray-50 dark:bg-gray-800/50'
})

const iconTextClass = computed(() => {
  const map: Record<string, string> = {
    blue: 'text-blue-600 dark:text-blue-400',
    purple: 'text-purple-600 dark:text-purple-400',
    gray: 'text-gray-600 dark:text-gray-400',
  }
  return map[props.config.iconColor] ?? 'text-gray-600 dark:text-gray-400'
})

function handleFileSelect(file: File | null) {
  if (!file || props.isUploading) return
  selectedFile.value = file
  emit('upload', file)
  setTimeout(() => {
    selectedFile.value = null
  }, 500)
}

function handleDownload() {
  if (!props.document) return
  emit('download', {
    id: props.document.medical_document_id,
    fileName: props.document.file_name,
  })
}

function formatDate(dateString: string): string {
  if (!dateString) return '-'
  try {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return dateString
  }
}
</script>

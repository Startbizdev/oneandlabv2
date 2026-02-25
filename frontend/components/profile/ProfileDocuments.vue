<template>
  <UCard class="overflow-hidden min-w-0">
    <template #header>
      <CardHeader
        icon="i-lucide-file-text"
        title="Documents médicaux"
        description="Déposez ou téléchargez vos documents de couverture santé."
      />
    </template>

    <LoadingState
      v-if="isLoading"
      message="Chargement des documents..."
      :compact="true"
    />

    <div v-else class="flex flex-col gap-3 min-w-0">
      <div
        v-for="config in documentConfigs"
        :key="config.type"
        class="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 p-3 min-w-0"
      >
        <input
          :ref="(el) => setFileInputRef(config.type, el)"
          type="file"
          :accept="config.acceptedTypes.join(',')"
          class="hidden"
          @change="(e) => onFileChange(config.type, e)"
        />

        <div class="flex items-center gap-2.5 min-w-0">
          <div
            :class="['flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', iconBgClass(config.iconColor)]"
          >
            <UIcon :name="config.icon" class="h-4 w-4" :class="iconTextClass(config.iconColor)" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="text-[13px] font-semibold text-gray-900 dark:text-white">
                {{ config.label }}
              </span>
              <UBadge
                v-if="config.required"
                color="amber"
                variant="subtle"
                size="xs"
                class="rounded-full"
              >
                Obligatoire
              </UBadge>
              <UBadge
                v-else
                color="neutral"
                variant="subtle"
                size="xs"
                class="rounded-full"
              >
                Optionnel
              </UBadge>
            </div>
            <p
              v-if="documents[config.type]"
              class="text-[12px] text-gray-600 dark:text-gray-400 truncate mt-0.5"
              :title="documents[config.type].file_name"
            >
              {{ documents[config.type].file_name }}
            </p>
            <p
              v-else
              class="text-[12px] text-gray-500 dark:text-gray-500 mt-0.5"
            >
              Aucun document déposé
            </p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2 mt-3">
          <template v-if="documents[config.type]">
            <UButton
              v-if="documents[config.type].medical_document_id"
              size="xs"
              variant="soft"
              color="primary"
              icon="i-lucide-download"
              :loading="uploadingType === config.type"
              aria-label="Télécharger"
              class="w-full justify-center"
              @click="emitDownload(config.type)"
            >
              Télécharger
            </UButton>
            <UButton
              size="xs"
              variant="outline"
              color="neutral"
              icon="i-lucide-refresh-cw"
              :loading="uploadingType === config.type"
              aria-label="Remplacer"
              class="w-full justify-center"
              @click="triggerFileInput(config.type)"
            >
              Remplacer
            </UButton>
          </template>
          <UButton
            v-else
            size="xs"
            color="primary"
            icon="i-lucide-upload"
            :loading="uploadingType === config.type"
            aria-label="Déposer"
            class="w-full justify-center col-span-2"
            @click="triggerFileInput(config.type)"
          >
            Déposer
          </UButton>
        </div>
      </div>
    </div>

    <UAlert
      v-if="error"
      color="red"
      variant="soft"
      :title="error"
      class="mt-4"
      :closable="true"
      @close="$emit('update:error', null)"
    />
  </UCard>
</template>

<script setup lang="ts">
import type { PatientDocument, DocumentType } from '~/types/profile'
import { DOCUMENT_CONFIGS } from '~/types/profile'

interface Props {
  documents: Record<string, PatientDocument>
  isLoading: boolean
  uploadingType: string | null
  error: string | null
}

interface Emits {
  (e: 'upload', type: DocumentType, file: File): void
  (e: 'download', id: string, fileName: string): void
  (e: 'update:error', value: string | null): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const documentConfigs = computed(() => Object.values(DOCUMENT_CONFIGS))

const fileInputRefs = ref<Record<string, HTMLInputElement | null>>({})

function iconBgClass(color: string): string {
  const map: Record<string, string> = {
    blue: 'bg-blue-50 dark:bg-blue-900/20',
    purple: 'bg-purple-50 dark:bg-purple-900/20',
    gray: 'bg-gray-100 dark:bg-gray-800/50',
  }
  return map[color] ?? 'bg-gray-100 dark:bg-gray-800/50'
}

function iconTextClass(color: string): string {
  const map: Record<string, string> = {
    blue: 'text-blue-600 dark:text-blue-400',
    purple: 'text-purple-600 dark:text-purple-400',
    gray: 'text-gray-600 dark:text-gray-400',
  }
  return map[color] ?? 'text-gray-600 dark:text-gray-400'
}

function setFileInputRef(type: string, el: unknown) {
  const input = Array.isArray(el) ? el[0] : el
  fileInputRefs.value[type] = input instanceof HTMLInputElement ? input : null
}

function triggerFileInput(type: string) {
  const input = fileInputRefs.value[type]
  if (input) input.click()
}

function onFileChange(type: DocumentType, e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    emit('upload', type, file)
    input.value = ''
  }
}

function emitDownload(type: string) {
  const doc = props.documents[type]
  if (!doc) return
  emit('download', doc.medical_document_id, doc.file_name)
}
</script>

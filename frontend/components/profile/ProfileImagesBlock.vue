<template>
  <div class="space-y-4">
    <!-- Photo de profil -->
    <div class="flex flex-col items-center">
      <button
        type="button"
        class="group relative rounded-full overflow-hidden w-28 h-28 sm:w-32 sm:h-32 border-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-shadow"
        @click="triggerProfileInput"
      >
        <img
          v-if="profileImage"
          :src="profileImage"
          :alt="profileLabel"
          class="w-full h-full object-cover"
        />
        <span v-else class="flex items-center justify-center w-full h-full text-gray-400">
          <UIcon :name="profileIcon" class="w-12 h-12 sm:w-14 sm:h-14" />
        </span>
        <span class="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-colors">
          <UIcon name="i-lucide-camera" class="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </span>
      </button>
      <p class="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">{{ profileLabel }}</p>
      <div class="flex gap-1.5 mt-1">
        <UButton variant="ghost" size="xs" icon="i-lucide-upload" @click="triggerProfileInput">
          {{ profileImage ? 'Changer' : 'Ajouter' }}
        </UButton>
        <UButton v-if="profileImage" variant="ghost" size="xs" color="red" icon="i-lucide-trash-2" @click="removeProfile" />
      </div>
    </div>

    <!-- Image de couverture (masquée pour préleveur : photo de profil uniquement) -->
    <div v-if="showCover">
      <p class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Image de couverture</p>
      <button
        type="button"
        class="w-full rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 aspect-[2/1] max-h-32 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-shadow"
        @click="triggerCoverInput"
      >
        <img
          v-if="coverImage"
          :src="coverImage"
          alt="Couverture"
          class="w-full h-full object-cover"
        />
        <span v-else class="text-gray-400">
          <UIcon name="i-lucide-image-plus" class="w-8 h-8" />
        </span>
      </button>
      <div class="flex gap-1.5 mt-1.5">
        <UButton variant="ghost" size="xs" icon="i-lucide-upload" @click="triggerCoverInput">
          {{ coverImage ? 'Changer' : 'Ajouter' }}
        </UButton>
        <UButton v-if="coverImage" variant="ghost" size="xs" color="red" icon="i-lucide-trash-2" @click="removeCover" />
      </div>
    </div>

    <input
      ref="profileInput"
      type="file"
      accept="image/jpeg,image/jpg,image/png,image/webp"
      class="hidden"
      @change="handleProfileSelect"
    />
    <input
      ref="coverInput"
      type="file"
      accept="image/jpeg,image/jpg,image/png,image/webp"
      class="hidden"
      @change="handleCoverSelect"
    />
  </div>
</template>

<script setup lang="ts">
interface Props {
  profileImage?: string | null
  coverImage?: string | null
  profileLabel?: string
  profileIcon?: string
  /** Afficher le bloc image de couverture (false pour préleveur : photo uniquement) */
  showCover?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  profileImage: null,
  coverImage: null,
  profileLabel: 'Photo de profil',
  profileIcon: 'i-lucide-user',
  showCover: true,
})

const emit = defineEmits<{
  'update:profileImage': [value: string | null]
  'update:coverImage': [value: string | null]
  'profileUpload': [file: File]
  'coverUpload': [file: File]
}>()

const profileInput = ref<HTMLInputElement | null>(null)
const coverInput = ref<HTMLInputElement | null>(null)
const toast = useAppToast()
const MAX_SIZE_MB = 5

const validateFile = (file: File): boolean => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!validTypes.includes(file.type)) {
    toast.add({ title: 'Format non supporté', description: 'JPG, PNG ou WEBP uniquement', color: 'red' })
    return false
  }
  if (file.size / (1024 * 1024) > MAX_SIZE_MB) {
    toast.add({ title: 'Fichier trop lourd', description: `Max ${MAX_SIZE_MB} Mo`, color: 'red' })
    return false
  }
  return true
}

const triggerProfileInput = () => profileInput.value?.click()
const triggerCoverInput = () => coverInput.value?.click()

const processProfile = (file: File) => {
  if (!validateFile(file)) return
  const reader = new FileReader()
  reader.onload = (e) => {
    emit('update:profileImage', (e.target?.result as string) ?? null)
    emit('profileUpload', file)
  }
  reader.readAsDataURL(file)
}

const processCover = (file: File) => {
  if (!validateFile(file)) return
  const reader = new FileReader()
  reader.onload = (e) => {
    emit('update:coverImage', (e.target?.result as string) ?? null)
    emit('coverUpload', file)
  }
  reader.readAsDataURL(file)
}

const handleProfileSelect = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) processProfile(file)
  ;(e.target as HTMLInputElement).value = ''
}

const handleCoverSelect = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) processCover(file)
  ;(e.target as HTMLInputElement).value = ''
}

const removeProfile = () => emit('update:profileImage', null)
const removeCover = () => emit('update:coverImage', null)
</script>

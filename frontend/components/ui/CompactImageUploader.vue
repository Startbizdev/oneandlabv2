<template>
  <div class="w-full">
    <div class="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
      <!-- Image de couverture -->
      <div 
        class="relative group cursor-pointer bg-gradient-to-br from-primary-500 to-primary-600 transition-all duration-200"
        :class="[
          coverImage ? 'h-36 sm:h-40 md:h-44' : 'h-28 sm:h-32 md:h-36'
        ]"
        @click="triggerCoverInput"
        @dragover.prevent="isDraggingCover = true"
        @dragleave.prevent="isDraggingCover = false"
        @drop.prevent="handleCoverDrop"
      >
        <img
          v-if="coverImage"
          :src="coverImage"
          alt="Image de couverture"
          class="w-full h-full object-cover"
        />
        
        <!-- Zone de drop vide -->
        <div 
          v-else
          class="absolute inset-0 flex flex-col items-center justify-center px-4 sm:px-6 text-center"
        >
          <UIcon 
            name="i-lucide-image" 
            class="w-8 h-8 sm:w-9 sm:h-9 text-white drop-shadow-lg mb-2.5 sm:mb-3"
          />
          <p class="text-xs sm:text-sm font-normal text-white drop-shadow-md leading-snug px-3">
            {{ isDraggingCover ? 'Déposez l\'image ici' : 'Cliquez pour ajouter une image de couverture' }}
          </p>
        </div>
        
        <!-- Overlay au hover -->
        <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <UButton
            icon="i-lucide-camera"
            color="white"
            variant="solid"
            size="sm"
            class="shadow-xl"
            @click.stop="triggerCoverInput"
          >
            {{ coverImage ? 'Modifier' : 'Ajouter' }}
          </UButton>
        </div>
        
        <!-- Bouton supprimer -->
        <UButton
          v-if="coverImage"
          icon="i-lucide-trash-2"
          color="red"
          variant="solid"
          size="sm"
          class="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-xl"
          @click.stop="removeCoverImage"
        />
      </div>

      <!-- Contenu principal -->
      <div class="relative px-4 sm:px-6 md:px-8 pb-5 sm:pb-6 md:pb-8">
        <!-- Photo de profil - Section centrée -->
        <div class="flex flex-col items-center -mt-14 sm:-mt-16 md:-mt-18 mb-5 sm:mb-6">
          <!-- Avatar -->
          <div class="relative mb-4 sm:mb-5">
            <div 
              class="relative group cursor-pointer"
              @click="triggerProfileInput"
            >
              <div class="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-white dark:border-gray-900 bg-gray-100 dark:bg-gray-800 shadow-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
                <img
                  v-if="profileImage"
                  :src="profileImage"
                  :alt="profileLabel"
                  class="w-full h-full object-cover"
                />
                <UIcon 
                  v-else
                  :name="profileIcon" 
                  class="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 text-gray-500 dark:text-gray-400"
                />
              </div>
              
              <!-- Overlay au hover -->
              <div class="absolute inset-0 bg-black/70 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                <UIcon name="i-lucide-camera" class="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              
              <!-- Badge de confirmation -->
              <div 
                v-if="profileImage"
                class="absolute -bottom-1 -right-1 sm:-bottom-1.5 sm:-right-1.5 w-7 h-7 sm:w-8 sm:h-8 bg-primary-500 rounded-full flex items-center justify-center border-[3px] border-white dark:border-gray-900 shadow-lg"
              >
                <UIcon name="i-lucide-check" class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              </div>
            </div>
          </div>
          
          <!-- Informations photo de profil -->
          <div class="w-full max-w-sm text-center space-y-3">
            <div class="flex items-center justify-center gap-2">
              <h3 class="text-base sm:text-lg font-normal text-gray-900 dark:text-gray-100">
                {{ profileLabel }}
              </h3>
              <UButton
                v-if="profileImage"
                icon="i-lucide-trash-2"
                color="red"
                variant="ghost"
                size="xs"
                class="flex-shrink-0"
                @click.stop="removeProfileImage"
              />
            </div>
            <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed px-3">
              Format carré recommandé (JPG, PNG, WEBP - max. 5MB)
            </p>
            <UButton
              variant="outline"
              size="sm"
              icon="i-lucide-upload"
              @click="triggerProfileInput"
            >
              {{ profileImage ? 'Modifier' : 'Ajouter une photo' }}
            </UButton>
          </div>
        </div>
        
        <!-- Séparateur -->
        <div class="border-t border-gray-200 dark:border-gray-800"></div>
        
        <!-- Informations image de couverture -->
        <div class="mt-5 sm:mt-6 pt-5 sm:pt-6">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-2">
                <h3 class="text-base sm:text-lg font-normal text-gray-900 dark:text-gray-100">
                  Image de couverture
                </h3>
                <UButton
                  v-if="coverImage"
                  icon="i-lucide-trash-2"
                  color="red"
                  variant="ghost"
                  size="xs"
                  class="flex-shrink-0"
                  @click.stop="removeCoverImage"
                />
              </div>
              <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Format paysage recommandé (JPG, PNG, WEBP - max. 5MB)
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Inputs cachés -->
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
  </div>
</template>

<script setup lang="ts">
interface Props {
  profileImage?: string | null;
  coverImage?: string | null;
  profileLabel?: string;
  profileIcon?: string;
}

const props = withDefaults(defineProps<Props>(), {
  profileImage: null,
  coverImage: null,
  profileLabel: 'Photo de profil',
  profileIcon: 'i-lucide-user',
});

const emit = defineEmits<{
  'update:profileImage': [value: string | null];
  'update:coverImage': [value: string | null];
  'profileUpload': [file: File];
  'coverUpload': [file: File];
}>();

const profileInput = ref<HTMLInputElement | null>(null);
const coverInput = ref<HTMLInputElement | null>(null);
const isDraggingCover = ref(false);
const toast = useAppToast();

const MAX_SIZE_MB = 5;

const triggerProfileInput = () => {
  profileInput.value?.click();
};

const triggerCoverInput = () => {
  coverInput.value?.click();
};

const validateFile = (file: File): boolean => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    toast.add({
      title: 'Format non supporté',
      description: 'Seuls les formats JPG, PNG ou WEBP sont acceptés',
      color: 'red',
    });
    return false;
  }

  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > MAX_SIZE_MB) {
    toast.add({
      title: 'Fichier trop volumineux',
      description: `La taille maximale est de ${MAX_SIZE_MB}MB`,
      color: 'red',
    });
    return false;
  }

  return true;
};

const processProfileFile = (file: File) => {
  if (!validateFile(file)) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const result = e.target?.result as string;
    emit('update:profileImage', result);
    emit('profileUpload', file);
    
    toast.add({
      title: `${props.profileLabel} chargée`,
      description: 'Vous pouvez maintenant enregistrer vos modifications',
      color: 'green',
    });
  };
  reader.readAsDataURL(file);
};

const processCoverFile = (file: File) => {
  if (!validateFile(file)) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const result = e.target?.result as string;
    emit('update:coverImage', result);
    emit('coverUpload', file);
    
    toast.add({
      title: 'Image de couverture chargée',
      description: 'Vous pouvez maintenant enregistrer vos modifications',
      color: 'green',
    });
  };
  reader.readAsDataURL(file);
};

const handleProfileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    processProfileFile(file);
  }
  if (target) {
    target.value = '';
  }
};

const handleCoverSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    processCoverFile(file);
  }
  if (target) {
    target.value = '';
  }
};

const removeProfileImage = () => {
  emit('update:profileImage', null);
  toast.add({
    title: `${props.profileLabel} supprimée`,
    color: 'gray',
  });
};

const removeCoverImage = () => {
  emit('update:coverImage', null);
  toast.add({
    title: 'Image de couverture supprimée',
    color: 'gray',
  });
};

const handleCoverDrop = (event: DragEvent) => {
  isDraggingCover.value = false;
  const file = event.dataTransfer?.files[0];
  if (file) {
    processCoverFile(file);
  }
};
</script>

<template>
  <div class="space-y-3">
    <!-- Champ de recherche d'adresse -->
    <UFormField 
      :label="label" 
      :name="name" 
      :required="required"
      :error="error"
    >
      <UPopover 
        v-model:open="isPopoverOpen" 
        :dismissible="true"
        :popper="{ placement: 'bottom-start', strategy: 'fixed' }"
      >
        <div class="relative" ref="inputContainerRef">
          <UInput
            :model-value="displayValue"
            :placeholder="placeholder"
            :loading="isSearching"
            :disabled="disabled || !!modelValue"
            :readonly="!!modelValue"
            @input="handleInput"
            @focus="handleFocus"
            size="xl"
            class="w-full"
          >
            <!-- Icône à gauche -->
            <template #leading>
              <UIcon name="i-heroicons-map-pin" class="w-5 h-5 text-gray-400" />
            </template>
            
            <!-- Icône de suppression à droite -->
            <template v-if="modelValue && showRemoveButton" #trailing>
              <button
                type="button"
                @click.stop="handleRemove"
                class="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1"
              >
                <UIcon name="i-heroicons-x-mark" class="w-5 h-5 text-gray-500 hover:text-gray-700" />
              </button>
            </template>
          </UInput>
        </div>

        <template #content>
          <div :style="{ width: popoverWidth + 'px' }" class="min-w-[300px]">
            <!-- Liste des suggestions -->
            <div v-if="addressOptions.length > 0" class="max-h-64 overflow-y-auto">
              <div
                v-for="(option, index) in addressOptions"
                :key="`${option.label}-${index}`"
                @click="handleSelect(option)"
                class="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
              >
                <div class="flex items-start gap-3">
                  <UIcon name="i-heroicons-map-pin" class="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div class="flex-1 min-w-0">
                    <p class="font-medium text-gray-900 break-words">{{ option.label }}</p>
                    <p v-if="option.postcode || option.city" class="text-sm text-gray-500 mt-0.5">
                      {{ [option.postcode, option.city].filter(Boolean).join(' ') }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Message : aucune adresse trouvée -->
            <div v-else-if="searchQuery.length >= 3" class="p-4">
              <p class="text-sm text-gray-500 text-center">
                Aucune adresse trouvée pour "{{ searchQuery }}"
              </p>
            </div>

            <!-- Message : minimum caractères -->
            <div v-else-if="searchQuery.length > 0 && searchQuery.length < 3" class="p-4">
              <p class="text-sm text-gray-500 text-center">
                Tapez au moins 3 caractères pour rechercher
              </p>
            </div>
          </div>
        </template>
      </UPopover>
    </UFormField>

    <!-- Complément d'adresse optionnel -->
    <UFormField 
      v-if="showComplement && modelValue"
      label="Complément d'adresse" 
      name="address_complement"
      :description="complementDescription"
    >
      <UInput 
        :model-value="complementValue"
        @update:model-value="handleComplementChange"
        placeholder="Ex: Appartement 3B, Bâtiment A, Étage 2 (optionnel)" 
        size="xl" 
        class="w-full" 
      />
    </UFormField>
  </div>
</template>

<script setup lang="ts">
import { apiFetch } from '~/utils/api'
import { nextTick, onMounted, onBeforeUnmount } from 'vue'

interface Address {
  label: string
  street?: string
  city?: string
  postcode?: string
  lat?: number
  lng?: number
}

interface Props {
  modelValue?: Address | null
  label?: string
  name?: string
  required?: boolean
  error?: string
  disabled?: boolean
  placeholder?: string
  showDetails?: boolean
  showRemoveButton?: boolean
  showComplement?: boolean
  complementValue?: string
  complementDescription?: string
}

const props = withDefaults(defineProps<Props>(), {
  label: 'Adresse',
  name: 'address',
  required: false,
  disabled: false,
  placeholder: 'Commencez à taper votre adresse...',
  showDetails: true,
  showRemoveButton: true,
  showComplement: false,
  complementDescription: 'Informations complémentaires pour faciliter l\'accès'
})

const emit = defineEmits<{
  'update:modelValue': [value: Address | null]
  'update:complement': [value: string]
}>()

const addressOptions = ref<Address[]>([])
const isSearching = ref(false)
const searchTimeout = ref<NodeJS.Timeout | null>(null)
const searchQuery = ref('')
const isPopoverOpen = ref(false)
const inputContainerRef = ref<HTMLElement | null>(null)
const popoverWidth = ref(0)

// Valeur affichée dans l'input
const displayValue = computed(() => {
  if (props.modelValue) {
    return props.modelValue.label
  }
  return searchQuery.value
})

// Synchroniser avec le modelValue
watch(() => props.modelValue, (newValue) => {
  if (!newValue) {
    searchQuery.value = ''
    addressOptions.value = []
    isPopoverOpen.value = false
  }
}, { immediate: true })

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const query = target.value
  
  // Si une adresse est déjà sélectionnée, ne pas rechercher
  if (props.modelValue) {
    return
  }
  
  searchQuery.value = query
  
  // Ouvrir le popover seulement si on a du texte à afficher
  if (query.length > 0) {
    updatePopoverWidth()
    isPopoverOpen.value = true
  } else {
    isPopoverOpen.value = false
  }
  
  performSearch(query)
}

const handleFocus = () => {
  // Ouvrir le popover seulement si on a du texte à afficher
  if (searchQuery.value.length > 0) {
    updatePopoverWidth()
    isPopoverOpen.value = true
  }
}

const updatePopoverWidth = () => {
  if (inputContainerRef.value) {
    popoverWidth.value = inputContainerRef.value.offsetWidth
  }
}

// Mettre à jour la largeur quand le popover s'ouvre
watch(isPopoverOpen, (isOpen) => {
  if (isOpen) {
    nextTick(() => {
      updatePopoverWidth()
    })
  }
})

// Mettre à jour la largeur lors du resize
onMounted(() => {
  window.addEventListener('resize', updatePopoverWidth)
  updatePopoverWidth()
})

onBeforeUnmount(() => {
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
  }
  window.removeEventListener('resize', updatePopoverWidth)
})

const performSearch = async (query: string) => {
  // Annuler la recherche précédente
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
  }

  // Attendre au moins 3 caractères
  if (query.length < 3) {
    addressOptions.value = []
    return
  }

  // Debounce de 300ms
  searchTimeout.value = setTimeout(async () => {
    // Vérifier que la requête n'est pas vide avant d'appeler l'API
    if (!query || query.trim().length < 3) {
      addressOptions.value = []
      isSearching.value = false
      return
    }
    
    isSearching.value = true
    
    try {
      const response = await apiFetch(`/ban/search?q=${encodeURIComponent(query.trim())}&limit=10`, {
        method: 'GET',
      })
      
      if (response?.success && response.data?.length > 0) {
        addressOptions.value = response.data.map((addr: any) => ({
          label: addr.label,
          street: addr.street,
          city: addr.city,
          postcode: addr.postcode,
          lat: addr.lat,
          lng: addr.lng,
        }))
        // Le popover reste ouvert si on a des résultats
      } else {
        addressOptions.value = []
        // Le popover reste ouvert pour afficher le message "aucune adresse trouvée"
      }
    } catch (error: any) {
      // Logger seulement les vraies erreurs (pas les erreurs réseau/backend non démarré)
      const errorMessage = error?.message || String(error)
      if (!errorMessage.toLowerCase().includes('backend non accessible')) {
        console.error('Erreur lors de la recherche d\'adresse:', errorMessage)
      }
      addressOptions.value = []
    } finally {
      isSearching.value = false
    }
  }, 300)
}

const handleSelect = (option: Address) => {
  emit('update:modelValue', option)
  searchQuery.value = option.label
  addressOptions.value = []
  isPopoverOpen.value = false
}

const handleRemove = () => {
  emit('update:modelValue', null)
  searchQuery.value = ''
  addressOptions.value = []
  isPopoverOpen.value = false
}

const handleComplementChange = (value: string) => {
  emit('update:complement', value)
}

</script>


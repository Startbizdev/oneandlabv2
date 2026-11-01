<template>
  <div class="space-y-3">
    <!-- Champ de recherche d'adresse -->
    <UFormField 
      :label="label" 
      :name="name" 
      :required="required"
      :error="error"
    >
      <!-- Liste sous le champ, sans popover : un popover reprenait le focus à l'ouverture et fermait
           le clavier des téléphones après la première lettre. -->
      <div class="relative">
        <UInput
          v-model="inputText"
          :placeholder="placeholder"
          :loading="isSearching"
          :disabled="disabled || !!modelValue"
          :readonly="!!modelValue"
          autocomplete="off"
          @focus="handleFocus"
          @blur="handleBlur"
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
              aria-label="Modifier l’adresse"
              @click.stop="handleRemove"
              class="min-w-11 min-h-11 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1"
            >
              <UIcon name="i-heroicons-x-mark" class="w-5 h-5 text-gray-500 hover:text-gray-700" />
            </button>
          </template>
        </UInput>

        <div
          v-if="isPopoverOpen"
          class="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
        >
          <!-- Liste des suggestions ; mousedown.prevent garde le focus (et le clavier) dans le champ -->
          <div v-if="addressOptions.length > 0" class="max-h-64 overflow-y-auto">
            <button
              type="button"
              v-for="(option, index) in addressOptions"
              :key="`${option.label}-${index}`"
              @mousedown.prevent
              @click="handleSelect(option)"
              class="w-full text-left px-4 py-3 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-primary-500 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
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
            </button>
          </div>

          <div v-else-if="isSearching" class="p-4">
            <p class="text-sm text-gray-500 text-center">Recherche…</p>
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
      </div>
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
import { onBeforeUnmount } from 'vue'

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
  placeholder: 'Rechercher une adresse',
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
// Numéro de la dernière recherche : une réponse plus ancienne arrivée en retard est ignorée.
let searchSeq = 0

// Texte du champ : l'adresse choisie (objet {label} ou string pour données migrées), sinon la saisie.
const inputText = computed({
  get: () => {
    if (props.modelValue) {
      if (typeof props.modelValue === 'string') return props.modelValue
      return props.modelValue.label ?? ''
    }
    return searchQuery.value
  },
  set: (value: string | number) => handleInput(String(value ?? '')),
})

// Synchroniser avec le modelValue
watch(() => props.modelValue, (newValue) => {
  if (!newValue) {
    searchQuery.value = ''
    addressOptions.value = []
    isPopoverOpen.value = false
  }
}, { immediate: true })

const handleInput = (query: string) => {
  // Si une adresse est déjà sélectionnée, ne pas rechercher
  if (props.modelValue) {
    return
  }

  searchQuery.value = query
  isPopoverOpen.value = query.length > 0
  performSearch(query)
}

const handleFocus = () => {
  if (searchQuery.value.length > 0 && !props.modelValue) {
    isPopoverOpen.value = true
  }
}

const handleBlur = () => {
  isPopoverOpen.value = false
}

onBeforeUnmount(() => {
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
  }
})

const performSearch = async (query: string) => {
  // Annuler la recherche précédente
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
  }

  // Attendre au moins 3 caractères
  if (query.length < 3) {
    searchSeq++
    isSearching.value = false
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
    const seq = ++searchSeq

    try {
      const response = await apiFetch(`/ban/search?q=${encodeURIComponent(query.trim())}&limit=10`, {
        method: 'GET',
      })
      if (seq !== searchSeq) return

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
      if (seq === searchSeq) addressOptions.value = []
    } finally {
      if (seq === searchSeq) isSearching.value = false
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

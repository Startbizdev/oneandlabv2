<template>
  <UForm :state="form" @submit="handleSubmit" class="space-y-6">
    <!-- Informations personnelles -->
    <UCard v-if="!hidePersonalInfo">
      <div class="space-y-4">
        <div>
          <h3 class="text-lg font-semibold mb-1">Informations personnelles</h3>
          <p class="text-sm text-gray-600 mb-3">Renseignez vos coordonnées pour que nous puissions vous contacter</p>
          <p v-if="!user?.id" class="text-xs text-gray-500 mb-3 flex items-center gap-1">
            Vous avez déjà un compte ? 
            <NuxtLink :to="`/login?returnTo=${encodeURIComponent('/rendez-vous/nouveau' + (route.query.type ? '?type=' + route.query.type : ''))}`" class="text-primary-600 hover:text-primary-700 underline font-medium inline-flex items-center gap-1">
              <UIcon name="i-lucide-log-in" class="w-3 h-3" />
              Connectez-vous
            </NuxtLink>
          </p>
        </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UFormField label="Nom" name="last_name" required>
          <UInput v-model="form.last_name" placeholder="Entrez votre nom" size="xl" class="w-full" />
        </UFormField>
        
        <UFormField label="Prénom" name="first_name" required>
          <UInput v-model="form.first_name" placeholder="Entrez votre prénom" size="xl" class="w-full" />
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
          />
        </UFormField>
        
        <UFormField label="Date de naissance" name="birth_date" required>
          <div class="flex space-x-2">
            <USelect 
              v-model="birthDay" 
              :items="dayOptions" 
              placeholder="Jour"
              size="xl" 
              class="flex-1" 
            />
            <USelect 
              v-model="birthMonth" 
              :items="monthOptions" 
              placeholder="Mois"
              size="xl" 
              class="flex-1" 
            />
            <USelect 
              v-model="birthYear" 
              :items="yearOptions" 
              placeholder="Année"
              size="xl" 
              class="flex-1" 
            />
          </div>
        </UFormField>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UFormField label="Email" name="email" required>
          <div class="relative">
            <UInput 
              v-model="form.email" 
              type="email" 
              placeholder="Entrez votre email" 
              size="xl" 
              class="w-full"
              :disabled="user?.id && !relative"
              :ui="{ 
                disabled: 'cursor-not-allowed opacity-60',
                base: user?.id && !relative ? 'bg-gray-50 dark:bg-gray-900/50' : ''
              }"
            />
            <UIcon 
              v-if="user?.id && !relative"
              name="i-lucide-lock" 
              class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
            />
          </div>
          <p v-if="user?.id && !relative" class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
            L'email ne peut pas être modifié pour les utilisateurs connectés.
          </p>
        </UFormField>
        
        <UFormField label="Téléphone" name="phone" required>
          <UInput v-model="form.phone" type="tel" placeholder="Entrez votre numéro de téléphone" size="xl" class="w-full" />
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
      </div>
    </UCard>
    
    <!-- Informations du rendez-vous -->
    <UCard>
      <div class="space-y-4">
        <div>
          <h3 class="text-lg font-semibold mb-1">Informations du rendez-vous</h3>
          <p class="text-sm text-gray-600 mb-3">Choisissez la date et les créneaux qui vous conviennent le mieux</p>
        </div>
      
      <UFormField label="Type d'analyse" name="category_id" required>
        <USelect
          v-model="form.category_id"
          :items="careCategories"
          placeholder="Sélectionner un type d'analyse"
          size="xl"
          class="w-full"
        />
      </UFormField>
      
      <UFormField label="Date souhaitée" name="scheduled_at" required>
        <DatePicker v-model="form.scheduled_at" placeholder="Sélectionner une date" appointment-type="lab" />
      </UFormField>
      
      <UFormField label="Type de prélèvement" name="blood_test_type" required>
        <URadioGroup
          v-model="form.blood_test_type"
          :items="bloodTestTypeOptions"
          size="xl"
          variant="list"
        />
      </UFormField>

      <UFormField
        v-if="form.blood_test_type === 'multiple'"
        label="Nombre de jours"
        name="duration_days"
        required
      >
        <div class="space-y-3">
          <URadioGroup
            v-model="form.duration_days"
            :items="multipleDaysOptions"
            size="xl"
            variant="list"
          />
          
          <div v-if="form.duration_days === 'custom'" class="mt-4">
            <UInput
              v-model.number="form.custom_days"
              type="number"
              placeholder="Nombre de jours"
              min="1"
              size="xl"
              class="w-full"
            />
          </div>
        </div>
      </UFormField>

      <UFormField
        label="Disponibilités horaires"
        name="availability"
        required
        description="L'heure de passage précise sera à définir avec le professionnel de santé"
      >
        <div class="space-y-4">
          <USelect
            v-model="form.availability_type"
            :items="availabilityTypeOptions"
            placeholder="Choisissez votre type de disponibilité"
            size="xl"
            class="w-full"
          />

          <!-- Slider pour les disponibilités personnalisées -->
          <div v-if="form.availability_type === 'custom'">
            <USlider
              v-model="availabilityRange"
              :min="8"
              :max="17"
              :step="1"
            />
            <div class="flex justify-between text-xs text-gray-500 mt-2">
              <span>8h</span>
              <span>17h</span>
            </div>
            <div class="text-xs text-gray-500 mt-4 font-medium text-center">
              Créneau sélectionné : {{ formatTime(availabilityRange[0]) }} - {{ formatTime(availabilityRange[1]) }}
              <span class="text-gray-400">({{ availabilityRange[1] - availabilityRange[0] }}h)</span>
            </div>
            <div v-if="availabilityRange[1] - availabilityRange[0] < 2" class="text-xs text-error-500 mt-2 text-center">
              ⚠️ L'écart minimum est de 2h
            </div>
          </div>

          <!-- Message pour disponibilité toute la journée -->
          <div v-if="form.availability_type === 'all_day'" class="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg border border-green-200">
            <UIcon name="i-heroicons-clock" class="w-4 h-4 text-green-600 shrink-0" />
            <p class="text-sm text-green-700">
              <span class="font-medium">Disponible toute la journée</span>
              <span class="text-green-600"> • Nous vous contacterons pour convenir d'un horaire</span>
            </p>
          </div>
        </div>
      </UFormField>
      </div>
    </UCard>
    
    <!-- Documents médicaux -->
    <UCard>
      <div class="space-y-4">
        <div>
          <h3 class="text-lg font-semibold mb-1">Documents médicaux</h3>
          <p class="text-sm text-gray-600 mb-3">Veuillez télécharger vos documents de couverture santé pour finaliser votre demande</p>
        </div>

        <!-- Formulaire d'upload par type -->
        <div class="space-y-4">
          <div class="flex items-center gap-2 mb-4">
            <UIcon name="i-lucide-upload" class="w-5 h-5 text-gray-500" />
            <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Ajouter des documents
            </h4>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <!-- Carte Vitale -->
            <div
              class="relative group"
              @dragover.prevent="handleDragOver('carte_vitale')"
              @dragleave.prevent="handleDragLeave('carte_vitale')"
              @drop.prevent="handleDrop($event, 'carte_vitale')"
            >
              <input
                ref="carteVitaleInput"
                type="file"
                accept="image/*,.pdf"
                class="hidden"
                @change="handleFileSelectForType($event, 'carte_vitale')"
              />
              
              <div
                :class="[
                  'relative p-4 rounded-lg border-2 border-dashed transition-all cursor-pointer',
                  draggedOver === 'carte_vitale'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-300 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-500',
                  uploadingTypes.has('carte_vitale') ? 'opacity-50 pointer-events-none' : ''
                ]"
                @click="triggerFileInput('carte_vitale')"
              >
                <div class="flex items-center gap-3">
                  <div class="flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0 bg-green-100 dark:bg-green-900/30">
                    <UIcon name="i-lucide-credit-card" class="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <p class="text-sm font-medium text-gray-900 dark:text-white">
                        Carte Vitale
                      </p>
                      <UBadge color="error" variant="soft" size="xs">
                        Obligatoire
                      </UBadge>
                    </div>
                    <p v-if="form.files.carte_vitale" class="text-xs text-primary-600 dark:text-primary-400 font-medium">
                      {{ form.files.carte_vitale.name }}
                    </p>
                    <p v-else-if="profileDocuments.carte_vitale" class="text-xs text-green-600 dark:text-green-400 font-medium">
                      ✓ {{ profileDocuments.carte_vitale.file_name }} (du profil)
                    </p>
                    <p v-else class="text-xs text-gray-500 dark:text-gray-400">
                      Glisser-déposer ou cliquer
                    </p>
                  </div>

                  <UIcon
                    v-if="uploadingTypes.has('carte_vitale')"
                    name="i-lucide-loader-2"
                    class="w-5 h-5 animate-spin text-primary-500"
                  />
                  <UIcon
                    v-else-if="form.files.carte_vitale || (profileDocuments.carte_vitale && !form.files.carte_vitale)"
                    name="i-lucide-check-circle"
                    class="w-5 h-5 text-green-500"
                  />
                  <UIcon
                    v-else
                    name="i-lucide-upload"
                    class="w-5 h-5 text-gray-400 group-hover:text-primary-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            <!-- Carte Mutuelle -->
            <div
              class="relative group"
              @dragover.prevent="handleDragOver('carte_mutuelle')"
              @dragleave.prevent="handleDragLeave('carte_mutuelle')"
              @drop.prevent="handleDrop($event, 'carte_mutuelle')"
            >
              <input
                ref="carteMutuelleInput"
                type="file"
                accept="image/*,.pdf"
                class="hidden"
                @change="handleFileSelectForType($event, 'carte_mutuelle')"
              />
              
              <div
                :class="[
                  'relative p-4 rounded-lg border-2 border-dashed transition-all cursor-pointer',
                  draggedOver === 'carte_mutuelle'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-300 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-500',
                  uploadingTypes.has('carte_mutuelle') ? 'opacity-50 pointer-events-none' : ''
                ]"
                @click="triggerFileInput('carte_mutuelle')"
              >
                <div class="flex items-center gap-3">
                  <div class="flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0 bg-blue-100 dark:bg-blue-900/30">
                    <UIcon name="i-lucide-shield" class="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <p class="text-sm font-medium text-gray-900 dark:text-white">
                        Carte Mutuelle
                      </p>
                      <UBadge color="error" variant="soft" size="xs">
                        Obligatoire
                      </UBadge>
                    </div>
                    <p v-if="form.files.carte_mutuelle" class="text-xs text-primary-600 dark:text-primary-400 font-medium">
                      {{ form.files.carte_mutuelle.name }}
                    </p>
                    <p v-else-if="profileDocuments.carte_mutuelle" class="text-xs text-green-600 dark:text-green-400 font-medium">
                      ✓ {{ profileDocuments.carte_mutuelle.file_name }} (du profil)
                    </p>
                    <p v-else class="text-xs text-gray-500 dark:text-gray-400">
                      Glisser-déposer ou cliquer
                    </p>
                  </div>

                  <UIcon
                    v-if="uploadingTypes.has('carte_mutuelle')"
                    name="i-lucide-loader-2"
                    class="w-5 h-5 animate-spin text-primary-500"
                  />
                  <UIcon
                    v-else-if="form.files.carte_mutuelle || (profileDocuments.carte_mutuelle && !form.files.carte_mutuelle)"
                    name="i-lucide-check-circle"
                    class="w-5 h-5 text-green-500"
                  />
                  <UIcon
                    v-else
                    name="i-lucide-upload"
                    class="w-5 h-5 text-gray-400 group-hover:text-primary-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            <!-- Ordonnance -->
            <div
              class="relative group"
              @dragover.prevent="handleDragOver('ordonnance')"
              @dragleave.prevent="handleDragLeave('ordonnance')"
              @drop.prevent="handleDrop($event, 'ordonnance')"
            >
              <input
                ref="ordonnanceInput"
                type="file"
                accept="image/*,.pdf"
                class="hidden"
                @change="handleFileSelectForType($event, 'ordonnance')"
              />
              
              <div
                :class="[
                  'relative p-4 rounded-lg border-2 border-dashed transition-all cursor-pointer',
                  draggedOver === 'ordonnance'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-300 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-500',
                  uploadingTypes.has('ordonnance') ? 'opacity-50 pointer-events-none' : ''
                ]"
                @click="triggerFileInput('ordonnance')"
              >
                <div class="flex items-center gap-3">
                  <div class="flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0 bg-orange-100 dark:bg-orange-900/30">
                    <UIcon name="i-lucide-file-text" class="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <p class="text-sm font-medium text-gray-900 dark:text-white">
                        Ordonnance
                      </p>
                      <UBadge color="error" variant="soft" size="xs">
                        Obligatoire
                      </UBadge>
                    </div>
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                      Glisser-déposer ou cliquer
                    </p>
                  </div>

                  <UIcon
                    v-if="uploadingTypes.has('ordonnance')"
                    name="i-lucide-loader-2"
                    class="w-5 h-5 animate-spin text-primary-500"
                  />
                  <UIcon
                    v-else-if="form.files.ordonnance"
                    name="i-lucide-check-circle"
                    class="w-5 h-5 text-green-500"
                  />
                  <UIcon
                    v-else
                    name="i-lucide-upload"
                    class="w-5 h-5 text-gray-400 group-hover:text-primary-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            <!-- Autres Assurances (optionnel) -->
            <div
              class="relative group"
              @dragover.prevent="handleDragOver('autres_assurances')"
              @dragleave.prevent="handleDragLeave('autres_assurances')"
              @drop.prevent="handleDrop($event, 'autres_assurances')"
            >
              <input
                ref="autresAssurancesInput"
                type="file"
                accept="image/*,.pdf"
                class="hidden"
                @change="handleFileSelectForType($event, 'autres_assurances')"
              />
              
              <div
                :class="[
                  'relative p-4 rounded-lg border-2 border-dashed transition-all cursor-pointer',
                  draggedOver === 'autres_assurances'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-300 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-500',
                  uploadingTypes.has('autres_assurances') ? 'opacity-50 pointer-events-none' : ''
                ]"
                @click="triggerFileInput('autres_assurances')"
              >
                <div class="flex items-center gap-3">
                  <div class="flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0 bg-purple-100 dark:bg-purple-900/30">
                    <UIcon name="i-lucide-briefcase" class="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 dark:text-white">
                      Autres assurances
                    </p>
                    <p v-if="form.files.autres_assurances" class="text-xs text-primary-600 dark:text-primary-400 font-medium">
                      {{ form.files.autres_assurances.name }}
                    </p>
                    <p v-else-if="profileDocuments.autres_assurances" class="text-xs text-green-600 dark:text-green-400 font-medium">
                      ✓ {{ profileDocuments.autres_assurances.file_name }} (du profil)
                    </p>
                    <p v-else class="text-xs text-gray-500 dark:text-gray-400">
                      Glisser-déposer ou cliquer
                    </p>
                  </div>

                  <UIcon
                    v-if="uploadingTypes.has('autres_assurances')"
                    name="i-lucide-loader-2"
                    class="w-5 h-5 animate-spin text-primary-500"
                  />
                  <UIcon
                    v-else-if="form.files.autres_assurances || (profileDocuments.autres_assurances && !form.files.autres_assurances)"
                    name="i-lucide-check-circle"
                    class="w-5 h-5 text-green-500"
                  />
                  <UIcon
                    v-else
                    name="i-lucide-upload"
                    class="w-5 h-5 text-gray-400 group-hover:text-primary-500 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <UIcon name="i-lucide-info" class="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <p class="text-xs text-blue-700 dark:text-blue-300">
              Formats acceptés : JPG, PNG, PDF • Taille maximale : 10 MB par fichier
            </p>
          </div>
        </div>
      </div>
    </UCard>
    
    <!-- Notes -->
    <UCard>
      <div class="space-y-4">
        <UFormField label="Notes" name="notes">
          <UTextarea v-model="form.notes" :rows="4" placeholder="Informations complémentaires..." size="xl" class="w-full" />
        </UFormField>
      </div>
    </UCard>
  </UForm>
</template>

<script setup lang="ts">
import { onMounted, nextTick } from 'vue';

const props = defineProps<{
  modelValue: any;
  relative?: any;
  hidePersonalInfo?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: any];
  'submit': [value: any];
  'cancel': [];
}>();

// Import de l'API et de l'auth
import { apiFetch } from '~/utils/api';
const { user } = useAuth();
const route = useRoute();

const form = reactive({
  last_name: '',
  first_name: '',
  birth_date: '',
  phone: '',
  email: '',
  address: null as any,
  address_complement: '',
  category_id: '',
  scheduled_at: '',
  availability: '',
  availability_type: 'custom', // Par défaut : disponibilités personnalisées
  blood_test_type: '', // 'single' ou 'multiple'
  duration_days: '', // Pour plusieurs jours : '2', '3', '5', '7', '10', '15', 'custom'
  custom_days: null as number | null, // Nombre de jours personnalisé
  consent: true, // Toujours true, validé dans le récap
  notes: '',
  files: {} as Record<string, File>,
  gender: '',
});

// Ref pour le slider de disponibilité (double poignée) - plage 8h à 17h, minimum 2h d'écart
const availabilityRange = ref([9, 11]);
const previousRange = ref([9, 11]);

// État pour le drag & drop
const draggedOver = ref<string | null>(null);
const uploadingTypes = ref(new Set<string>());

// Refs pour les inputs de fichiers
const carteVitaleInput = ref<HTMLInputElement | null>(null);
const carteMutuelleInput = ref<HTMLInputElement | null>(null);
const ordonnanceInput = ref<HTMLInputElement | null>(null);
const autresAssurancesInput = ref<HTMLInputElement | null>(null);

// Fonctions pour le drag & drop
const triggerFileInput = (docType: string) => {
  const inputMap: Record<string, any> = {
    carte_vitale: carteVitaleInput,
    carte_mutuelle: carteMutuelleInput,
    ordonnance: ordonnanceInput,
    autres_assurances: autresAssurancesInput,
  };
  inputMap[docType]?.value?.click();
};

const handleDragOver = (docType: string) => {
  draggedOver.value = docType;
};

const handleDragLeave = (docType: string) => {
  if (draggedOver.value === docType) {
    draggedOver.value = null;
  }
};

const handleDrop = async (event: DragEvent, docType: string) => {
  draggedOver.value = null;
  
  const files = event.dataTransfer?.files;
  if (!files || files.length === 0) return;
  
  const file = files[0];
  await handleFileSelect(file, docType);
};

const handleFileSelectForType = async (event: Event, docType: string) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    const file = target.files[0];
    await handleFileSelect(file, docType);
    target.value = ''; // Reset input
  }
};

const handleFileSelect = async (file: File, docType: string) => {
  // Vérifier la taille (10 MB max)
  if (file.size > 10 * 1024 * 1024) {
    const toast = useToast();
    toast.add({
      title: 'Fichier trop volumineux',
      description: 'Le fichier dépasse la limite de 10 MB autorisée.',
      color: 'error',
    });
    return;
  }

  // Vérifier le type de fichier
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    const toast = useToast();
    toast.add({
      title: 'Format non accepté',
      description: 'Formats acceptés : JPG, PNG, PDF uniquement.',
      color: 'error',
    });
    return;
  }

  // Assigner le fichier au formulaire
  form.files[docType] = file;
};

// Validation : garantir un écart minimum de 2h (seulement pour les disponibilités personnalisées)
watch(availabilityRange, (newVal) => {
  // Ne traiter que si le type de disponibilité est 'custom'
  if (form.availability_type !== 'custom') return;

  const [start, end] = newVal;
  const diff = end - start;

  // Si l'écart est inférieur à 2h, ajuster automatiquement
  if (diff < 2) {
    const [prevStart, prevEnd] = previousRange.value;

    // Déterminer quelle poignée a été déplacée
    if (Math.abs(end - prevEnd) > Math.abs(start - prevStart)) {
      // L'utilisateur a principalement déplacé la fin vers le début, ajuster le début
      availabilityRange.value = [Math.max(8, end - 2), end];
    } else {
      // L'utilisateur a principalement déplacé le début vers la fin, ajuster la fin
      availabilityRange.value = [start, Math.min(17, start + 2)];
    }
  }

  // Mettre à jour la valeur précédente
  previousRange.value = [...availabilityRange.value];

  // Mettre à jour la disponibilité en JSON
  updateAvailabilityData();
}, { deep: true });

// Watch pour le changement de type de disponibilité
watch(() => form.availability_type, (newType) => {
  updateAvailabilityData();
});

// Watch pour réinitialiser les champs liés
watch(() => form.blood_test_type, (newType) => {
  if (newType === 'single') {
    form.duration_days = '';
    form.custom_days = null;
  }
});

watch(() => form.duration_days, (newDuration) => {
  if (newDuration !== 'custom') {
    form.custom_days = null;
  }
});

// Fonction pour mettre à jour les données de disponibilité
const updateAvailabilityData = () => {
  if (form.availability_type === 'custom') {
    form.availability = JSON.stringify({
      type: 'custom',
      range: availabilityRange.value
    });
  } else if (form.availability_type === 'all_day') {
    form.availability = JSON.stringify({
      type: 'all_day'
    });
  }
};

// Formater l'heure pour l'affichage
const formatTime = (hour: number): string => {
  const h = Math.floor(hour);
  return `${h}h`;
};


// Dans le script setup, assure les refs avant le watch modelValue :
const birthDay = ref<number | null>(null);
const birthMonth = ref<number | null>(null);
const birthYear = ref<number | null>(null);

// Options
const currentYear = new Date().getFullYear();
const dayOptions = Array.from({length: 31}, (_, i) => ({ label: i + 1, value: i + 1 }));
const monthOptions = [
  { label: 'Janvier', value: 1 },
  { label: 'Février', value: 2 },
  { label: 'Mars', value: 3 },
  { label: 'Avril', value: 4 },
  { label: 'Mai', value: 5 },
  { label: 'Juin', value: 6 },
  { label: 'Juillet', value: 7 },
  { label: 'Août', value: 8 },
  { label: 'Septembre', value: 9 },
  { label: 'Octobre', value: 10 },
  { label: 'Novembre', value: 11 },
  { label: 'Décembre', value: 12 }
];
const yearOptions = Array.from({length: currentYear - 1950 + 1}, (_, i) => {
  const year = 1950 + i;
  return { label: year, value: year };
});

// Watch pour birth_date - des refs vers form.birth_date
watch([birthYear, birthMonth, birthDay], () => {
  if (birthYear.value && birthMonth.value && birthDay.value) {
    form.birth_date = `${birthYear.value}-${String(birthMonth.value).padStart(2, '0')}-${String(birthDay.value).padStart(2, '0')}`;
  } else {
    form.birth_date = '';
  }
});

// Watch pour form.birth_date - de form.birth_date vers les refs (pour pré-remplissage)
watch(() => form.birth_date, (newDate, oldDate) => {
  // #region agent log
  if (typeof window !== 'undefined') {
    fetch('http://127.0.0.1:7242/ingest/3f73482a-700a-4695-9b7b-1e0833b5cd08', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'BB',
        location: 'LabForm.vue:739',
        message: 'Watch form.birth_date triggered',
        data: {
          newDate,
          oldDate,
          birth_year: birthYear.value,
          birth_month: birthMonth.value,
          birth_day: birthDay.value,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }
  // #endregion
  
  if (newDate && newDate !== oldDate) {
    // Parser la date et remplir les refs
    const [year, month, day] = newDate.split('-');
    if (year && month && day) {
      const parsedYear = parseInt(year);
      const parsedMonth = parseInt(month);
      const parsedDay = parseInt(day);
      
      // #region agent log
      if (typeof window !== 'undefined') {
        fetch('http://127.0.0.1:7242/ingest/3f73482a-700a-4695-9b7b-1e0833b5cd08', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'CC',
            location: 'LabForm.vue:750',
            message: 'Parsing birth_date',
            data: {
              parsedYear,
              parsedMonth,
              parsedDay,
              current_birth_year: birthYear.value,
              current_birth_month: birthMonth.value,
              current_birth_day: birthDay.value,
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
      }
      // #endregion
      
      // Ne mettre à jour que si les valeurs sont différentes pour éviter les boucles
      if (birthYear.value !== parsedYear) birthYear.value = parsedYear;
      if (birthMonth.value !== parsedMonth) birthMonth.value = parsedMonth;
      if (birthDay.value !== parsedDay) birthDay.value = parsedDay;
    }
  } else if (!newDate && (birthYear.value || birthMonth.value || birthDay.value)) {
    // Réinitialiser si la date est supprimée
    birthYear.value = null;
    birthMonth.value = null;
    birthDay.value = null;
  }
}, { immediate: true });

// Watch modelValue corrigé :
watch(() => props.modelValue, (newVal) => {
  if (newVal && !isUpdating) {
    isUpdating = true;
    Object.assign(form, newVal);
    if (newVal.birth_date) {
      const [year, month, day] = newVal.birth_date.split('-');
      if (year && month && day) {
        birthYear.value = parseInt(year);
        birthMonth.value = parseInt(month);
        birthDay.value = parseInt(day);
      }
    }
    if (newVal.gender) {
      form.gender = newVal.gender;
    }
    isUpdating = false;
  }
}, { deep: true });

// Valeurs par défaut pour les catégories
const defaultCategories = [
  { label: 'Prise de sang standard', value: 1 },
  { label: 'Prise de sang à jeun', value: 2 },
  { label: 'Glycémie', value: 3 },
];

const careCategories = ref<Array<{ label: string; value: number }>>(defaultCategories);

const genderOptions = [
  { label: 'Homme', value: 'male' },
  { label: 'Femme', value: 'female' },
  { label: 'Autre', value: 'other' }
];

// Options pour le type de disponibilité
const availabilityTypeOptions = [
  { label: 'Je choisis mon créneau horaire', value: 'custom' },
  { label: 'Disponible toute la journée', value: 'all_day' }
];

// Options pour le type de prélèvement
const bloodTestTypeOptions = [
  { label: 'Une seule prise de sang', value: 'single' },
  { label: 'Plusieurs prélèvements sur plusieurs jours', value: 'multiple' }
];

// Options pour plusieurs jours
const multipleDaysOptions = [
  { label: '2 jours', value: '2' },
  { label: '3 jours', value: '3' },
  { label: '5 jours', value: '5' },
  { label: '7 jours', value: '7' },
  { label: '10 jours', value: '10' },
  { label: '15 jours', value: '15' },
  { label: 'Personnalisé', value: 'custom' }
];

// Documents du profil
const profileDocuments = ref<Record<string, any>>({})

// Charger les documents du profil
const loadProfileDocuments = async () => {
  if (!user.value?.id || props.relative) return
  
  console.log('🔍 [LabForm] Chargement des documents du profil pour user:', user.value?.id)
  
  try {
    const response = await apiFetch('/patient-documents', {
      method: 'GET',
    })
    
    console.log('📄 [LabForm] Réponse API documents:', response)
    
    if (response.success && response.data) {
      response.data.forEach((doc: any) => {
        profileDocuments.value[doc.document_type] = doc
        console.log('✅ [LabForm] Document chargé:', doc.document_type, '→', doc.file_name)
      })
      
      console.log('📦 [LabForm] Tous les documents du profil:', profileDocuments.value)
      
      // Marquer les documents du profil comme disponibles
      // (on ne peut pas pré-remplir directement les File inputs pour des raisons de sécurité)
      if (profileDocuments.value.carte_vitale) {
        form.files.carte_vitale = null // Sera rempli depuis le profil lors de la soumission
      }
      if (profileDocuments.value.carte_mutuelle) {
        form.files.carte_mutuelle = null // Sera rempli depuis le profil lors de la soumission
      }
      if (profileDocuments.value.autres_assurances) {
        form.files.autres_assurances = null // Sera rempli depuis le profil lors de la soumission
      }
    } else {
      console.log('⚠️ [LabForm] Aucun document ou réponse non réussie')
    }
  } catch (error) {
    console.error('❌ [LabForm] Erreur lors du chargement des documents du profil:', error)
  }
}

// Pré-remplir le formulaire avec les données du proche ou du patient
const prefillForm = async () => {
  // Si l'utilisateur est connecté, récupérer ses données complètes
  if (user.value?.id && !props.relative) {
    try {
      const { fetchCurrentUser } = useAuth();
      const userData = await fetchCurrentUser();
      
      if (userData) {
        form.first_name = userData.first_name || '';
        form.last_name = userData.last_name || '';
        // #region agent log
        if (typeof window !== 'undefined') {
          fetch('http://127.0.0.1:7242/ingest/3f73482a-700a-4695-9b7b-1e0833b5cd08', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: 'debug-session',
              runId: 'run1',
              hypothesisId: 'AA',
              location: 'LabForm.vue:863',
              message: 'Setting birth_date from userData',
              data: {
                birth_date: userData.birth_date,
                has_birth_date: !!userData.birth_date,
                birth_year: birthYear.value,
                birth_month: birthMonth.value,
                birth_day: birthDay.value,
              },
              timestamp: Date.now(),
            }),
          }).catch(() => {});
        }
        // #endregion
        form.birth_date = userData.birth_date || '';
        form.gender = userData.gender || '';
        form.email = userData.email || '';
        form.phone = userData.phone || '';
        form.address = userData.address || null;
        // Extraire le complément de l'objet address s'il existe
        form.address_complement = userData.address?.complement || userData.address_complement || '';
      }
      
      // Charger les documents du profil
      await loadProfileDocuments()
    } catch (error) {
      console.error('Erreur lors du chargement des données utilisateur:', error);
      // Fallback sur les données basiques
      form.first_name = user.value?.first_name || '';
      form.last_name = user.value?.last_name || '';
      form.birth_date = user.value?.birth_date || '';
      form.gender = user.value?.gender || '';
      form.email = user.value?.email || '';
      form.phone = user.value?.phone || '';
    }
  } else if (props.relative) {
    // Utiliser les données du proche
    form.first_name = props.relative.first_name || '';
    form.last_name = props.relative.last_name || '';
    form.birth_date = props.relative.birth_date || '';
    form.gender = props.relative.gender || '';

    // Utiliser les données du proche si disponibles, sinon celles du patient
    form.email = props.relative.email || user.value?.email || '';
    form.phone = props.relative.phone || user.value?.phone || '';
    form.address = props.relative.address || null;

    // Si le proche n'a pas d'adresse, utiliser celle du patient
    if (!form.address && user.value?.id) {
      try {
        const { fetchCurrentUser } = useAuth();
        const userData = await fetchCurrentUser();
        if (userData?.address) {
          form.address = userData.address;
        }
      } catch (error) {
        console.error('Erreur lors du chargement de l\'adresse du patient:', error);
      }
    }
  } else {
    // Utiliser les données basiques du patient (fallback)
    form.first_name = user.value?.first_name || '';
    form.last_name = user.value?.last_name || '';
    form.birth_date = user.value?.birth_date || '';
    form.gender = user.value?.gender || '';
    form.email = user.value?.email || '';
    form.phone = user.value?.phone || '';
  }
};

// Initialiser la disponibilité au montage
updateAvailabilityData();

// Charger les catégories au montage
onMounted(async () => {
  // Pré-remplir le formulaire
  prefillForm();

  try {
    const response = await apiFetch('/categories?type=blood_test', {
      method: 'GET',
    });
    if (response.success && response.data && response.data.length > 0) {
      const mappedCategories = response.data.map((cat: any) => ({
        label: cat.name,
        value: cat.id,
      }));
      careCategories.value = mappedCategories;
    }
  } catch (error) {
    // Les valeurs par défaut sont déjà définies
  }
});


const handleSubmit = () => {
  // Préparer les données de formulaire en nettoyant les champs selon le type
  // Inclure les documents du profil si aucun nouveau fichier n'a été uploadé
  const filesData: any = {}
  Object.keys(form.files).forEach(key => {
    if (form.files[key]) {
      // Nouveau fichier uploadé
      filesData[key] = {
        field: key,
        name: form.files[key].name,
        size: form.files[key].size,
        type: form.files[key].type,
        isNew: true,
      }
    } else if (profileDocuments.value[key]) {
      // Utiliser le document du profil
      filesData[key] = {
        field: key,
        name: profileDocuments.value[key].file_name,
        medical_document_id: profileDocuments.value[key].medical_document_id,
        isNew: false,
      }
    }
  })
  
  // Inclure le complément d'adresse dans l'objet address
  const addressWithComplement = form.address ? {
    ...form.address,
    complement: form.address_complement || null
  } : null;
  
  const cleanedFormData: any = {
    ...form,
    address: addressWithComplement,
    files: filesData,
  };
  
  // Pour les laboratoires : nettoyer selon le type de prélèvement
  if (form.blood_test_type === 'single') {
    // Une seule prise : ne pas inclure duration_days ni custom_days
    delete cleanedFormData.duration_days;
    delete cleanedFormData.custom_days;
  } else if (form.blood_test_type === 'multiple') {
    // Plusieurs jours : inclure duration_days et custom_days si personnalisé
    if (form.duration_days !== 'custom') {
      delete cleanedFormData.custom_days;
    }
  }
  
  const formData = {
    ...form,
    address: addressWithComplement,
    files: form.files, // Inclure les fichiers réels pour l'upload
    form_data: cleanedFormData,
  };
  emit('update:modelValue', formData);
  emit('submit', formData);
};

let isUpdating = false;

    // Émettre les changements en temps réel
watch(form, () => {
  if (!isUpdating) {
    isUpdating = true;
    
    // Préparer les données de formulaire en nettoyant les champs selon le type
    // Inclure les documents du profil si aucun nouveau fichier n'a été uploadé
    const filesData: any = {}
    Object.keys(form.files).forEach(key => {
      if (form.files[key]) {
        filesData[key] = {
          field: key,
          name: form.files[key].name,
          size: form.files[key].size,
          type: form.files[key].type,
          isNew: true,
        }
      } else if (profileDocuments.value[key]) {
        filesData[key] = {
          field: key,
          name: profileDocuments.value[key].file_name,
          medical_document_id: profileDocuments.value[key].medical_document_id,
          isNew: false,
        }
      }
    })
    
    const cleanedFormData: any = {
      ...form,
      files: filesData,
    };
    
    // Pour les laboratoires : nettoyer selon le type de prélèvement
    if (form.blood_test_type === 'single') {
      // Une seule prise : ne pas inclure duration_days ni custom_days
      delete cleanedFormData.duration_days;
      delete cleanedFormData.custom_days;
    } else if (form.blood_test_type === 'multiple') {
      // Plusieurs jours : inclure duration_days et custom_days si personnalisé
      if (form.duration_days !== 'custom') {
        delete cleanedFormData.custom_days;
      }
    }
    
    emit('update:modelValue', {
      ...form,
      form_data: cleanedFormData,
    });
    nextTick(() => {
      isUpdating = false;
    });
  }
}, { deep: true });
</script>


<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
        Profil public
      </h1>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
        Configurez votre profil public visible sur oneanadlab.fr/infirmier/[votre-slug]
      </p>
    </div>

    <div v-if="loading" class="text-center py-12">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto text-primary-500 mb-2" />
      <p class="text-gray-500 dark:text-gray-400">Chargement de votre profil...</p>
    </div>

    <UCard v-else>
      <template #header>
        <h2 class="text-xl font-semibold">Paramètres du profil</h2>
      </template>

      <div class="space-y-6">
        <!-- Activer le profil public -->
        <div>
          <label class="flex items-center gap-3 cursor-pointer">
            <USwitch v-model="form.is_public_profile_enabled" />
            <div>
              <div class="font-medium text-gray-900 dark:text-white">
                Activer le profil public
              </div>
              <div class="text-sm text-gray-500 dark:text-gray-400">
                Rendre votre profil visible publiquement
              </div>
            </div>
          </label>
        </div>

        <!-- Message d'aide -->
        <UAlert
          v-if="!form.is_public_profile_enabled"
          color="blue"
          variant="soft"
          icon="i-lucide-info"
          title="Activez le profil public"
          description="Activez le toggle ci-dessus pour configurer votre profil public et voir tous les champs."
          class="mt-4"
        />

        <div v-if="form.is_public_profile_enabled" class="space-y-6 pt-6 border-t border-gray-200 dark:border-gray-800">
          <!-- Slug (non modifiable) -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Votre URL publique
            </label>
            <div class="space-y-2">
              <div class="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                <UIcon name="i-lucide-link" class="w-5 h-5 text-gray-400" />
                <span class="text-sm text-gray-600 dark:text-gray-400">
                  oneanadlab.fr/infirmier/
                </span>
                <span class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ form.public_slug || '...' }}
                </span>
              </div>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                URL générée automatiquement depuis votre nom (non modifiable)
              </p>
              <div v-if="form.public_slug && form.is_public_profile_enabled">
                <UButton
                  :to="`/infirmier/${form.public_slug}`"
                  target="_blank"
                  variant="outline"
                  size="sm"
                  icon="i-lucide-external-link"
                >
                  Voir le profil public
                </UButton>
              </div>
            </div>
          </div>

          <!-- Photos et images -->
          <div class="w-full">
            <CompactImageUploader
              v-model:profileImage="form.profile_image_url"
              v-model:coverImage="form.cover_image_url"
              @profile-upload="handleProfileImageUpload"
              @cover-upload="handleCoverImageUpload"
            />
          </div>

          <!-- Biographie -->
          <div class="w-full">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Biographie
            </label>
            <UTextarea
              v-model="form.biography"
              :rows="6"
              placeholder="Présentez-vous en quelques lignes..."
              :disabled="saving"
              class="w-full"
            />
          </div>

          <!-- FAQ -->
          <div class="w-full">
            <div class="flex items-center justify-between mb-2">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Questions fréquentes (FAQ)
              </label>
              <UButton
                variant="ghost"
                size="xs"
                icon="i-lucide-wand-2"
                @click="generateDefaultFaq"
                :disabled="saving"
              >
                Charger FAQ par défaut
              </UButton>
            </div>
            <div class="space-y-3">
              <div
                v-for="(item, index) in faqItems"
                :key="index"
                class="p-4 border border-gray-200 dark:border-gray-800 rounded-lg space-y-3"
              >
                <UInput
                  v-model="item.question"
                  placeholder="Question"
                  :disabled="saving"
                  class="w-full"
                />
                <UTextarea
                  v-model="item.answer"
                  :rows="3"
                  placeholder="Réponse"
                  :disabled="saving"
                  class="w-full"
                />
                <UButton
                  color="red"
                  variant="ghost"
                  size="sm"
                  icon="i-lucide-trash-2"
                  @click="removeFaqItem(index)"
                  :disabled="saving"
                >
                  Supprimer
                </UButton>
              </div>
              <UButton
                variant="outline"
                size="sm"
                leading-icon="i-lucide-plus"
                @click="addFaqItem"
                :disabled="saving"
                block
              >
                Ajouter une question
              </UButton>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton
            variant="outline"
            @click="resetForm"
            :disabled="saving"
          >
            Annuler
          </UButton>
          <UButton
            color="primary"
            @click="saveProfile"
            :loading="saving"
            :disabled="!form.is_public_profile_enabled || !form.public_slug"
          >
            Enregistrer
          </UButton>
        </div>
      </template>
    </UCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'nurse',
});

import { apiFetch } from '~/utils/api';
import { useAuth } from '~/composables/useAuth';

const { user, fetchCurrentUser } = useAuth();
const toast = useToast();

const saving = ref(false);
const form = ref({
  is_public_profile_enabled: false,
  public_slug: '',
  profile_image_url: '',
  cover_image_url: '',
  biography: '',
  faq: [] as Array<{ question: string; answer: string }>,
});

const faqItems = ref<Array<{ question: string; answer: string }>>([]);
const loading = ref(true);

const loadProfile = async () => {
  loading.value = true;
  try {
    const userData = await fetchCurrentUser();
    console.log('📋 Données utilisateur chargées:', userData);
    
    if (userData) {
      form.value = {
        is_public_profile_enabled: userData.is_public_profile_enabled || false,
        public_slug: userData.public_slug || '',
        profile_image_url: userData.profile_image_url || '',
        cover_image_url: userData.cover_image_url || '',
        biography: userData.biography || '',
        faq: [],
      };
      
      console.log('✅ Formulaire initialisé:', form.value);
      
      // Charger la FAQ
      if (userData.faq) {
        const faq = typeof userData.faq === 'string' ? JSON.parse(userData.faq) : userData.faq;
        faqItems.value = Array.isArray(faq) ? faq : [];
      } else {
        faqItems.value = [];
      }
    } else {
      console.warn('⚠️ Aucune donnée utilisateur retournée');
    }
  } catch (error) {
    console.error('❌ Erreur lors du chargement du profil:', error);
    toast.add({
      title: 'Erreur',
      description: 'Impossible de charger votre profil',
      color: 'red',
    });
  } finally {
    loading.value = false;
  }
};

const generateSlug = () => {
  if (!user.value) return;
  
  const firstName = user.value.first_name || '';
  const lastName = user.value.last_name || '';
  
  // Créer le slug : prenom-nom
  const slug = `${firstName}-${lastName}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Retirer les accents
    .replace(/[^a-z0-9\s-]/g, '') // Retirer les caractères spéciaux
    .replace(/\s+/g, '-') // Remplacer les espaces par des tirets
    .replace(/-+/g, '-') // Éviter les doubles tirets
    .trim();
  
  form.value.public_slug = slug;
};

// Gestionnaires d'upload d'images
const handleProfileImageUpload = (file: File) => {
  console.log('Photo de profil uploadée:', file.name);
  // L'URL en base64 est déjà dans form.profile_image_url via v-model
  // TODO: Implémenter l'upload vers un serveur si nécessaire
};

const handleCoverImageUpload = (file: File) => {
  console.log('Image de couverture uploadée:', file.name);
  // L'URL en base64 est déjà dans form.cover_image_url via v-model
  // TODO: Implémenter l'upload vers un serveur si nécessaire
};

const generateDefaultFaq = () => {
  faqItems.value = [
    {
      question: 'Quels sont vos horaires d\'intervention ?',
      answer: 'Je suis disponible du lundi au vendredi de 8h à 18h, et le samedi de 9h à 13h.',
    },
    {
      question: 'Intervenez-vous à domicile ?',
      answer: 'Oui, je me déplace à votre domicile pour tous types de soins infirmiers.',
    },
    {
      question: 'Acceptez-vous les nouveaux patients ?',
      answer: 'Oui, j\'accepte de nouveaux patients. N\'hésitez pas à me contacter pour prendre rendez-vous.',
    },
    {
      question: 'Comment prendre rendez-vous ?',
      answer: 'Vous pouvez prendre rendez-vous directement sur cette plateforme ou me contacter par téléphone.',
    },
    {
      question: 'Quels types de soins proposez-vous ?',
      answer: 'Je propose une large gamme de soins infirmiers : pansements, injections, prises de sang, perfusions, et bien d\'autres.',
    },
  ];
  
  toast.add({
    title: 'FAQ générée',
    description: 'La FAQ par défaut a été chargée. Vous pouvez la personnaliser.',
    color: 'green',
  });
};

const addFaqItem = () => {
  faqItems.value.push({ question: '', answer: '' });
};

const removeFaqItem = (index: number) => {
  faqItems.value.splice(index, 1);
};

const resetForm = () => {
  loadProfile();
};

const saveProfile = async () => {
  if (!form.value.is_public_profile_enabled) {
    toast.add({
      title: 'Erreur',
      description: 'Vous devez activer le profil public',
      color: 'red',
    });
    return;
  }

  if (!form.value.public_slug) {
    toast.add({
      title: 'Erreur',
      description: 'Le slug est requis',
      color: 'red',
    });
    return;
  }

  // Valider le slug (lettres minuscules, chiffres et tirets uniquement)
  const slugRegex = /^[a-z0-9-]+$/;
  if (!slugRegex.test(form.value.public_slug)) {
    toast.add({
      title: 'Erreur',
      description: 'Le slug ne peut contenir que des lettres minuscules, chiffres et tirets',
      color: 'red',
    });
    return;
  }

  saving.value = true;

  try {
    const response = await apiFetch(`/users/${user.value?.id}`, {
      method: 'PUT',
      body: {
        ...form.value,
        faq: faqItems.value.filter(item => item.question && item.answer),
      },
    });

    if (response.success) {
      toast.add({
        title: 'Profil mis à jour',
        description: 'Votre profil public a été mis à jour avec succès',
        color: 'green',
      });
      await fetchCurrentUser();
    } else {
      toast.add({
        title: 'Erreur',
        description: response.error || 'Impossible de mettre à jour le profil',
        color: 'red',
      });
    }
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error.message || 'Une erreur est survenue',
      color: 'red',
    });
  } finally {
    saving.value = false;
  }
};

onMounted(async () => {
  await loadProfile();
  
  // Générer automatiquement le slug si vide
  if (!form.value.public_slug && user.value) {
    generateSlug();
  }
});
</script>


<template>
  <div class="min-h-screen bg-gray-50/50 dark:bg-gray-950/50">
    <div class="max-w-2xl mx-auto px-4 py-8 sm:px-6">
      <NuxtLink
        to="/patient"
        class="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 mb-6"
      >
        <UIcon name="i-lucide-arrow-left" class="w-4 h-4" />
        Retour à ma liste
      </NuxtLink>

      <div v-if="loading" class="flex flex-col items-center justify-center py-24">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-gray-400 mb-4" />
        <p class="text-sm text-gray-500">Chargement du rendez-vous...</p>
      </div>

      <div v-else-if="error" class="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-4">
        <p class="text-sm font-medium text-red-800 dark:text-red-200">{{ error }}</p>
      </div>

      <template v-else-if="appointment">
        <header class="mb-8">
          <h1 class="text-xl font-semibold text-gray-900 dark:text-white">
            Détails du rendez-vous
          </h1>
          <div class="mt-2 flex items-center gap-2">
            <span
              class="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium"
              :class="statusBadgeClass(appointment.status)"
            >
              {{ getStatusLabel(appointment.status) }}
            </span>
            <span
              class="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium"
              :class="typeBadgeClass(appointment.type)"
            >
              <UIcon
                :name="appointment.type === 'blood_test' ? 'i-lucide-syringe' : 'i-lucide-stethoscope'"
                class="w-3 h-3"
              />
              {{ appointment.type === 'blood_test' ? 'Prise de sang' : 'Soins infirmiers' }}
            </span>
          </div>
        </header>

        <div class="space-y-8">
          <!-- Bloc principal : infos RDV (style linear) -->
          <section class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 overflow-hidden">
            <div class="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 class="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Rendez-vous
              </h2>
            </div>
            <dl class="divide-y divide-gray-100 dark:divide-gray-800">
              <div class="flex justify-between gap-4 px-5 py-3.5">
                <dt class="text-sm text-gray-500 dark:text-gray-400">Date</dt>
                <dd class="text-sm font-medium text-gray-900 dark:text-white text-right">
                  {{ formatDate(appointment.scheduled_at) }}
                </dd>
              </div>
              <div class="flex justify-between gap-4 px-5 py-3.5">
                <dt class="text-sm text-gray-500 dark:text-gray-400">Type</dt>
                <dd class="text-sm font-medium text-gray-900 dark:text-white text-right">
                  {{ appointment.type === 'blood_test' ? 'Prise de sang' : 'Soins infirmiers' }}
                </dd>
              </div>
              <div v-if="appointment.duration_minutes" class="flex justify-between gap-4 px-5 py-3.5">
                <dt class="text-sm text-gray-500 dark:text-gray-400">Durée</dt>
                <dd class="text-sm font-medium text-gray-900 dark:text-white text-right">
                  {{ appointment.duration_minutes }} min
                </dd>
              </div>
              <div v-if="appointment.category_name || appointment.form_data?.category_name" class="flex justify-between gap-4 px-5 py-3.5">
                <dt class="text-sm text-gray-500 dark:text-gray-400">Type de soins</dt>
                <dd class="text-sm font-medium text-gray-900 dark:text-white text-right">
                  {{ appointment.category_name || appointment.form_data?.category_name }}
                </dd>
              </div>
              <div v-if="appointment.form_data?.availability" class="flex justify-between gap-4 px-5 py-3.5">
                <dt class="text-sm text-gray-500 dark:text-gray-400">Disponibilités</dt>
                <dd class="text-sm font-medium text-gray-900 dark:text-white text-right">
                  {{ formatAvailability(appointment.form_data.availability) }}
                </dd>
              </div>
              <div class="px-5 py-3.5">
                <dt class="text-sm text-gray-500 dark:text-gray-400 mb-1">Adresse</dt>
                <dd class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ displayAddress }}
                </dd>
                <dd v-if="addressComplement" class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Complément : {{ addressComplement }}
                </dd>
              </div>
            </dl>
          </section>

          <!-- Section Qui s'occupe de vous : empty state si en attente, sinon Lab + Préleveur / Infirmier -->
          <section
            v-if="showWhoSection"
            class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 overflow-hidden"
          >
            <div class="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 class="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Qui s'occupe de vous
              </h2>
            </div>
            <!-- Empty state : RDV en attente, aucun pro assigné -->
            <div
              v-if="isAssignmentPending"
              class="flex flex-col items-center justify-center text-center px-5 py-12"
            >
              <div class="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <UIcon name="i-lucide-user-search" class="w-6 h-6 text-gray-400 dark:text-gray-500" />
              </div>
              <p class="text-sm font-medium text-gray-900 dark:text-white mb-1">
                Recherche en cours
              </p>
              <p class="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                Nous recherchons actuellement un professionnel disponible pour votre rendez-vous. Vous serez notifié dès qu’un laboratoire ou un infirmier aura accepté votre demande.
              </p>
            </div>
            <div v-else class="divide-y divide-gray-100 dark:divide-gray-800">
              <!-- Laboratoire (toujours "Laboratoire", pas sous-compte) : logo, nom, adresse, tél -->
              <div
                v-if="appointment.type === 'blood_test' && (appointment.assigned_lab_id || appointment.assigned_lab_display_name)"
                class="px-5 py-4"
              >
                <div class="flex items-start gap-4">
                  <div class="flex-shrink-0">
                    <UserAvatar
                      :src="labImageUrl"
                      :initial="labInitial"
                      alt="Laboratoire"
                      size="lg"
                    />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-0.5">
                      Laboratoire
                    </p>
                    <p class="text-sm font-semibold text-gray-900 dark:text-white">
                      {{ appointment.assigned_lab_display_name || 'Laboratoire' }}
                    </p>
                    <dl class="mt-3 space-y-2">
                      <div v-if="appointment.assigned_lab_address" class="flex items-start gap-2">
                        <UIcon name="i-lucide-map-pin" class="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                        <dd class="text-sm text-gray-700 dark:text-gray-300">{{ appointment.assigned_lab_address }}</dd>
                      </div>
                      <div v-if="appointment.assigned_lab_phone" class="flex items-start gap-2">
                        <UIcon name="i-lucide-phone" class="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                        <dd class="text-sm">
                          <a :href="`tel:${(appointment.assigned_lab_phone as string).replace(/\s/g, '')}`" class="text-primary-600 hover:underline dark:text-primary-400">
                            {{ appointment.assigned_lab_phone }}
                          </a>
                        </dd>
                      </div>
                      <div v-if="labPublicProfileUrl" class="mt-3">
                        <a
                          :href="labPublicProfileUrl"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                        >
                          Voir le profil
                          <UIcon name="i-lucide-external-link" class="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>

              <!-- Préleveur : photo, nom, tél (pas d'adresse ni email) -->
              <div
                v-if="appointment.type === 'blood_test' && (appointment.assigned_to || appointment.assigned_to_display_name)"
                class="px-5 py-4"
              >
                <div class="flex items-start gap-4">
                  <div class="flex-shrink-0">
                    <UserAvatar
                      :src="preleveurImageUrl"
                      :initial="preleveurInitial"
                      alt="Préleveur"
                      size="lg"
                    />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-0.5">
                      Préleveur
                    </p>
                    <p class="text-sm font-semibold text-gray-900 dark:text-white">
                      {{ appointment.assigned_to_display_name || appointment.assigned_to_name || 'Assigné' }}
                    </p>
                    <div v-if="appointment.assigned_to_phone" class="mt-3 flex items-start gap-2">
                      <UIcon name="i-lucide-phone" class="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      <a :href="`tel:${(appointment.assigned_to_phone as string).replace(/\s/g, '')}`" class="text-sm text-primary-600 hover:underline dark:text-primary-400">
                        {{ appointment.assigned_to_phone }}
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Soins infirmiers : infirmier -->
              <div
                v-if="appointment.type === 'nursing' && (appointment.assigned_nurse_id || appointment.assigned_nurse_display_name)"
                class="px-5 py-3.5"
              >
                <p class="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-0.5">Infirmier</p>
                <p class="text-sm font-semibold text-gray-900 dark:text-white">
                  {{ appointment.assigned_nurse_display_name || appointment.assigned_to_name || 'Assigné' }}
                </p>
              </div>
            </div>
          </section>

          <!-- Détails patient (form_data) -->
          <section
            v-if="hasFormData"
            class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 overflow-hidden"
          >
            <div class="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 class="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Informations du patient
              </h2>
            </div>
            <dl class="divide-y divide-gray-100 dark:divide-gray-800">
              <div v-if="appointment.form_data?.first_name" class="flex justify-between gap-4 px-5 py-3.5">
                <dt class="text-sm text-gray-500 dark:text-gray-400">Prénom</dt>
                <dd class="text-sm font-medium text-gray-900 dark:text-white text-right">{{ appointment.form_data.first_name }}</dd>
              </div>
              <div v-if="appointment.form_data?.last_name" class="flex justify-between gap-4 px-5 py-3.5">
                <dt class="text-sm text-gray-500 dark:text-gray-400">Nom</dt>
                <dd class="text-sm font-medium text-gray-900 dark:text-white text-right">{{ appointment.form_data.last_name }}</dd>
              </div>
              <div v-if="appointment.form_data?.phone" class="flex justify-between gap-4 px-5 py-3.5">
                <dt class="text-sm text-gray-500 dark:text-gray-400">Téléphone</dt>
                <dd class="text-sm font-medium text-right">
                  <a :href="`tel:${(appointment.form_data.phone as string).replace(/\s/g, '')}`" class="text-primary-600 hover:underline dark:text-primary-400">
                    {{ appointment.form_data.phone }}
                  </a>
                </dd>
              </div>
              <div v-if="appointment.form_data?.email" class="flex justify-between gap-4 px-5 py-3.5">
                <dt class="text-sm text-gray-500 dark:text-gray-400">Email</dt>
                <dd class="text-sm font-medium text-right">
                  <a :href="`mailto:${appointment.form_data.email}`" class="text-primary-600 hover:underline dark:text-primary-400 break-all">
                    {{ appointment.form_data.email }}
                  </a>
                </dd>
              </div>
              <div v-if="appointment.form_data?.birth_date" class="flex justify-between gap-4 px-5 py-3.5">
                <dt class="text-sm text-gray-500 dark:text-gray-400">Date de naissance</dt>
                <dd class="text-sm font-medium text-gray-900 dark:text-white text-right">{{ formatDateOnly(appointment.form_data.birth_date) }}</dd>
              </div>
              <div v-if="appointment.form_data?.gender" class="flex justify-between gap-4 px-5 py-3.5">
                <dt class="text-sm text-gray-500 dark:text-gray-400">Genre</dt>
                <dd class="text-sm font-medium text-gray-900 dark:text-white text-right">{{ getGenderLabel(appointment.form_data.gender) }}</dd>
              </div>
              <div v-if="appointment.form_data?.duration_days" class="flex justify-between gap-4 px-5 py-3.5">
                <dt class="text-sm text-gray-500 dark:text-gray-400">Durée des soins</dt>
                <dd class="text-sm font-medium text-gray-900 dark:text-white text-right">{{ getDurationLabel(appointment.form_data.duration_days) }}</dd>
              </div>
              <div v-if="appointment.form_data?.frequency" class="flex justify-between gap-4 px-5 py-3.5">
                <dt class="text-sm text-gray-500 dark:text-gray-400">Fréquence</dt>
                <dd class="text-sm font-medium text-gray-900 dark:text-white text-right">{{ getFrequencyLabel(appointment.form_data.frequency) }}</dd>
              </div>
              <div v-if="appointment.form_data?.notes" class="px-5 py-3.5">
                <dt class="text-sm text-gray-500 dark:text-gray-400 mb-1">Notes</dt>
                <dd class="text-sm font-medium text-gray-900 dark:text-white whitespace-pre-wrap">{{ appointment.form_data.notes }}</dd>
              </div>
            </dl>
          </section>

          <!-- Documents médicaux -->
          <section class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 overflow-hidden">
            <div class="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 class="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Documents médicaux
              </h2>
            </div>
            <div class="px-5 py-4">
              <div v-if="loadingDocuments" class="flex items-center gap-2 text-sm text-gray-500">
                <UIcon name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
                Chargement...
              </div>
              <div v-else-if="medicalDocuments.length === 0" class="text-sm text-gray-500 dark:text-gray-400">
                Aucun document associé à ce rendez-vous
              </div>
              <ul v-else class="space-y-2">
                <li
                  v-for="doc in medicalDocuments"
                  :key="doc.id"
                  class="flex items-center justify-between gap-4 rounded-lg border border-gray-100 dark:border-gray-800 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                      <UIcon name="i-lucide-file" class="w-4 h-4 text-gray-500" />
                    </div>
                    <div class="min-w-0">
                      <p class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ doc.file_name }}</p>
                      <p class="text-xs text-gray-500">{{ formatFileSize(doc.file_size) }} · {{ formatDateShort(doc.created_at) }}</p>
                    </div>
                  </div>
                  <UButton
                    variant="ghost"
                    size="xs"
                    icon="i-lucide-download"
                    :loading="downloadingDoc === doc.id"
                    @click="downloadDocument(doc.id)"
                  />
                </li>
              </ul>
            </div>
          </section>

          <!-- Annulation (style linear / notion) -->
          <section
            v-if="appointment.status === 'pending' || appointment.status === 'confirmed'"
            class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 overflow-hidden"
          >
            <div class="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 class="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Actions
              </h2>
            </div>
            <div class="px-5 py-4">
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                <template v-if="appointment.status === 'pending'">
                  Votre rendez-vous est en attente de confirmation. Vous serez notifié dès qu'un professionnel l'aura accepté.
                </template>
                <template v-else>
                  Votre rendez-vous est confirmé. Vous recevrez un rappel avant l'heure prévue.
                </template>
              </p>
              <div class="flex items-center gap-3">
                <UButton
                  color="error"
                  variant="outline"
                  size="md"
                  icon="i-lucide-x"
                  @click="showCancelModal = true"
                >
                  Annuler le rendez-vous
                </UButton>
              </div>
            </div>
          </section>

          <!-- Avis (terminé) -->
          <section v-if="appointment.status === 'completed' && !hasReviewed" class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-5">
            <h2 class="text-sm font-medium text-gray-900 dark:text-white mb-4">Donnez votre avis</h2>
            <UForm :state="reviewForm" @submit="submitReview" class="space-y-4">
              <UFormField label="Note" name="rating" required>
                <div class="flex gap-1">
                  <button
                    v-for="star in 5"
                    :key="star"
                    type="button"
                    class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    @click="reviewForm.rating = star"
                  >
                    <UIcon
                      name="i-lucide-star"
                      class="w-6 h-6"
                      :class="star <= reviewForm.rating ? 'text-amber-500 fill-amber-500' : 'text-gray-300 dark:text-gray-600'"
                    />
                  </button>
                </div>
              </UFormField>
              <UFormField label="Commentaire" name="comment">
                <UTextarea v-model="reviewForm.comment" rows="3" placeholder="Partagez votre expérience..." />
              </UFormField>
              <UButton type="submit" color="primary" size="md" :loading="submittingReview">
                Envoyer l'avis
              </UButton>
            </UForm>
          </section>

          <section v-if="appointment.status === 'completed' && hasReviewed" class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-5">
            <p class="text-sm font-medium text-emerald-700 dark:text-emerald-300">Merci pour votre avis.</p>
          </section>
        </div>

        <!-- Modal annulation -->
        <AlertModal
          v-model="showCancelModal"
          title="Confirmer l'annulation"
          message="Êtes-vous sûr de vouloir annuler ce rendez-vous ? Cette action est définitive."
          confirm-label="Oui, annuler"
          cancel-label="Retour"
          confirm-color="error"
          icon-type="error"
          :loading="canceling"
          @confirm="confirmCancelAppointment"
        >
          <template #content>
            <div v-if="appointment" class="mt-4 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-calendar" class="w-4 h-4 flex-shrink-0" />
                <span>{{ formatDate(appointment.scheduled_at) }}</span>
              </div>
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-map-pin" class="w-4 h-4 flex-shrink-0" />
                <span>{{ displayAddress }}</span>
              </div>
            </div>
          </template>
        </AlertModal>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'patient',
  middleware: ['auth', 'role'],
  role: 'patient',
});

const route = useRoute();
const toast = useAppToast();

const appointment = ref<any>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const hasReviewed = ref(false);
const submittingReview = ref(false);
const canceling = ref(false);
const showCancelModal = ref(false);
const medicalDocuments = ref<any[]>([]);
const downloadingDoc = ref<string | null>(null);
const loadingDocuments = ref(false);

const reviewForm = reactive({ rating: 5, comment: '' });

const displayAddress = computed(() => {
  const a = appointment.value?.address;
  if (!a) return '';
  if (typeof a === 'object' && a?.label) return a.label;
  return String(a);
});

/** Complément d'adresse (form_data ou address.complement) */
const addressComplement = computed(() => {
  const a = appointment.value;
  if (!a) return '';
  const fromForm = a.form_data?.address_complement;
  if (fromForm && String(fromForm).trim()) return String(fromForm).trim();
  if (typeof a.address === 'object' && a.address?.complement && String(a.address.complement).trim()) {
    return String(a.address.complement).trim();
  }
  return '';
});

const hasFormData = computed(() => {
  const fd = appointment.value?.form_data;
  return fd && Object.keys(fd).length > 0;
});

/** Afficher la section "Qui s'occupe de vous" pour prise de sang ou soins infirmiers */
const showWhoSection = computed(() => {
  const a = appointment.value;
  return !!a && (a.type === 'blood_test' || a.type === 'nursing');
});

/** RDV en attente et aucun professionnel assigné → afficher l’empty state */
const isAssignmentPending = computed(() => {
  const a = appointment.value;
  if (!a || a.status !== 'pending') return false;
  if (a.type === 'blood_test') {
    return !(a.assigned_lab_id || a.assigned_lab_display_name || a.assigned_to || a.assigned_to_display_name);
  }
  if (a.type === 'nursing') {
    return !(a.assigned_nurse_id || a.assigned_nurse_display_name || a.assigned_to_name);
  }
  return false;
});

const { profileImageUrl } = useProfileImageUrl();

const labImageUrl = computed(() => {
  const url = appointment.value?.assigned_lab_profile_image_url;
  return profileImageUrl(url ?? null) ?? undefined;
});

const labInitial = computed(() => {
  const name = appointment.value?.assigned_lab_display_name || '';
  return name ? name.charAt(0).toUpperCase() : 'L';
});

/** Lien vers la fiche publique du labo (nouvelle fenêtre) */
const labPublicProfileUrl = computed(() => {
  const slug = appointment.value?.assigned_lab_public_slug;
  return slug && String(slug).trim() ? `/Laboratoire/${encodeURIComponent(String(slug).trim())}` : '';
});

const preleveurImageUrl = computed(() => {
  const url = appointment.value?.assigned_to_profile_image_url;
  return profileImageUrl(url ?? null) ?? undefined;
});

const preleveurInitial = computed(() => {
  const name = appointment.value?.assigned_to_display_name || appointment.value?.assigned_to_name || '';
  return name ? name.charAt(0).toUpperCase() : 'P';
});

function statusBadgeClass(status: string) {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
    confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
    in_progress: 'bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-200',
    inProgress: 'bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-200',
    completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
    canceled: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
    expired: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    refused: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
  };
  return map[status] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
}

function typeBadgeClass(type: string) {
  return type === 'blood_test'
    ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200';
}

onMounted(async () => {
  await loadAppointment();
  await checkReview();
});

watch(() => appointment.value?.id, async (id) => {
  if (id) await loadMedicalDocuments();
}, { immediate: true });

async function loadAppointment() {
  loading.value = true;
  error.value = null;
  const response = await apiFetch(`/appointments/${route.params.id}`, { method: 'GET' });
  if (response.success && response.data) {
    appointment.value = response.data;
    if (appointment.value?.id) await loadMedicalDocuments();
  } else {
    error.value = response.error || 'Erreur lors du chargement du rendez-vous';
  }
  loading.value = false;
}

async function loadMedicalDocuments() {
  if (!appointment.value) return;
  loadingDocuments.value = true;
  try {
    const response = await apiFetch(`/medical-documents?appointment_id=${appointment.value.id}`, { method: 'GET' });
    medicalDocuments.value = Array.isArray(response?.data) ? response.data : [];
  } catch {
    medicalDocuments.value = [];
  } finally {
    loadingDocuments.value = false;
  }
}

async function checkReview() {
  if (!appointment.value || appointment.value.status !== 'completed') return;
  const response = await apiFetch(`/reviews?appointment_id=${appointment.value.id}`, { method: 'GET' });
  if (response.success && response.data?.length > 0) hasReviewed.value = true;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
function formatDateShort(date: string) {
  return date ? new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
}
function formatDateOnly(date: string) {
  return new Date(date).toLocaleDateString('fr-FR');
}
function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 o';
  const k = 1024;
  const sizes = ['o', 'Ko', 'Mo', 'Go'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function getStatusLabel(status: string | undefined | null) {
  const labels: Record<string, string> = {
    pending: 'En attente',
    confirmed: 'Confirmé',
    in_progress: 'En cours',
    inProgress: 'En cours',
    completed: 'Terminé',
    cancelled: 'Annulé',
    canceled: 'Annulé',
    expired: 'Expiré',
    refused: 'Refusé',
  };
  return labels[status ?? ''] ?? status ?? 'Inconnu';
}

function getDurationLabel(duration: string) {
  const labels: Record<string, string> = {
    '1': '1 jour', '7': '7 jours', '10': '10 jours',
    '15': '15 jours (ou jusqu\'à cicatrisation)', '30': '30 jours', '60+': '60 jours ou +',
  };
  return labels[duration] ?? duration;
}

function getFrequencyLabel(frequency: string) {
  const labels: Record<string, string> = {
    daily: 'Chaque jour',
    every_other_day: '1 jour sur 2',
    twice_weekly: '2 fois par semaine',
    thrice_weekly: '3 fois par semaine',
  };
  return labels[frequency] ?? frequency;
}

function getGenderLabel(gender: string) {
  const labels: Record<string, string> = { male: 'Homme', female: 'Femme', other: 'Autre' };
  return labels[gender] ?? gender;
}

function formatAvailability(availability: unknown) {
  try {
    const avail = typeof availability === 'string' ? JSON.parse(availability) : availability;
    if (avail?.type === 'all_day') return 'Toute la journée';
    if (avail?.type === 'custom' && avail?.range) return `${avail.range[0]}h – ${avail.range[1]}h`;
  } catch {
    // ignore
  }
  return typeof availability === 'string' ? availability : '';
}

async function submitReview() {
  submittingReview.value = true;
  const response = await apiFetch('/reviews', {
    method: 'POST',
    body: {
      appointment_id: appointment.value.id,
      reviewee_id: appointment.value.assigned_to || appointment.value.assigned_nurse_id,
      reviewee_type: appointment.value.type === 'nursing' ? 'nurse' : 'subaccount',
      rating: reviewForm.rating,
      comment: reviewForm.comment,
    },
  });
  if (response.success) {
    hasReviewed.value = true;
    toast.add({ title: 'Avis envoyé', color: 'green' });
  } else {
    toast.add({ title: 'Erreur', description: response.error ?? 'Impossible d\'envoyer l\'avis', color: 'red' });
  }
  submittingReview.value = false;
}

async function confirmCancelAppointment() {
  canceling.value = true;
  const response = await apiFetch(`/appointments/${appointment.value.id}`, {
    method: 'PUT',
    body: { status: 'canceled', note: 'Annulé par le patient' },
  });
  if (response.success) {
    showCancelModal.value = false;
    toast.add({ title: 'Rendez-vous annulé', color: 'green' });
    await loadAppointment();
  } else {
    toast.add({ title: 'Erreur', description: response.error ?? 'Impossible d\'annuler', color: 'red' });
  }
  canceling.value = false;
}

async function downloadDocument(docId: string) {
  downloadingDoc.value = docId;
  try {
    const doc = medicalDocuments.value.find((d: any) => d.id === docId);
    const config = useRuntimeConfig();
    const apiBase = config.public.apiBase || 'http://localhost:8888/api';
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : '';
    const response = await fetch(`${apiBase}/medical-documents/${docId}/download?id=${docId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error((err as any).error || 'Erreur téléchargement');
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const cd = response.headers.get('content-disposition');
    let name = doc?.file_name || 'document';
    if (cd) {
      const m = cd.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i);
      if (m?.[1]) name = m[1].replace(/['"]/g, '');
    }
    a.download = name;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    toast.add({ title: 'Téléchargement réussi', color: 'green' });
  } catch (e: any) {
    toast.add({ title: 'Erreur', description: e?.message ?? 'Impossible de télécharger', color: 'red' });
  } finally {
    downloadingDoc.value = null;
  }
}
</script>

<template>
  <div class="space-y-6">
    <UButton
      :to="`${basePath}/appointments`"
      color="neutral"
      variant="ghost"
      size="md"
      leading-icon="i-lucide-arrow-left"
      class="mb-4"
    >
      Retour à la liste
    </UButton>

    <div v-if="loading" class="flex flex-col items-center justify-center py-16">
      <UIcon name="i-lucide-loader-2" class="w-10 h-10 animate-spin text-primary-500 mb-4" />
      <p class="text-gray-500 dark:text-gray-400">Chargement des détails...</p>
    </div>

    <UEmpty
      v-else-if="!appointment"
      icon="i-lucide-alert-circle"
      title="Rendez-vous introuvable"
      description="Le rendez-vous demandé n'existe pas ou vous n'avez pas les permissions pour y accéder."
      variant="outline"
    />

    <div v-else class="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div class="xl:col-span-2 space-y-6">
        <!-- Informations du rendez-vous -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between gap-4">
              <h2 class="text-lg font-semibold flex items-center gap-2">
                <UIcon name="i-lucide-calendar" class="w-5 h-5" />
                Informations du rendez-vous
              </h2>
              <div class="flex items-center gap-2 flex-wrap">
                <UBadge
                  :color="getStatusColor(appointment.status)"
                  variant="subtle"
                  size="md"
                  :label="getStatusLabel(appointment.status)"
                />
                <UBadge
                  :color="appointment.type === 'blood_test' ? 'info' : 'success'"
                  variant="subtle"
                  size="md"
                  :label="getTypeLabel(appointment.type)"
                />
              </div>
            </div>
          </template>
          <div class="space-y-4">
            <div class="flex items-start gap-3">
              <UIcon name="i-lucide-calendar" class="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
              <div class="flex-1 min-w-0">
                <p class="text-xs text-gray-500 dark:text-gray-400">Date souhaitée</p>
                <p class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ formatDateTime(appointment.scheduled_at) }}
                </p>
              </div>
            </div>
            <div v-if="appointment.address" class="flex items-start gap-3">
              <UIcon name="i-lucide-map-pin" class="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
              <div class="flex-1 min-w-0">
                <p class="text-xs text-gray-500 dark:text-gray-400">Adresse complète</p>
                <p class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ typeof appointment.address === 'object' && appointment.address?.label ? appointment.address.label : appointment.address }}
                </p>
                <a
                  href="#"
                  class="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 underline mt-1 inline-flex items-center gap-1"
                  @click.prevent="openInGoogleMaps"
                >
                  <UIcon name="i-lucide-external-link" class="w-3 h-3" />
                  Voir dans la map
                </a>
              </div>
            </div>
            <div v-if="appointment.category_name" class="flex items-start gap-3">
              <UIcon name="i-lucide-stethoscope" class="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
              <div class="flex-1 min-w-0">
                <p class="text-xs text-gray-500 dark:text-gray-400">Type de soin</p>
                <p class="text-sm font-medium text-gray-900 dark:text-white">{{ appointment.category_name }}</p>
              </div>
            </div>
            <div v-if="appointment.form_data?.blood_test_type" class="flex items-start gap-3">
              <UIcon name="i-lucide-droplet" class="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
              <div class="flex-1 min-w-0">
                <p class="text-xs text-gray-500 dark:text-gray-400">Type de prélèvement</p>
                <p class="text-sm font-medium text-gray-900 dark:text-white">{{ getBloodTestTypeLabel(appointment.form_data) }}</p>
              </div>
            </div>
            <div v-if="appointment.form_data?.duration_days" class="flex items-start gap-3">
              <UIcon name="i-lucide-calendar-days" class="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
              <div class="flex-1 min-w-0">
                <p class="text-xs text-gray-500 dark:text-gray-400">Durée</p>
                <p class="text-sm font-medium text-gray-900 dark:text-white">{{ getDurationLabel(appointment.form_data.duration_days) }}</p>
              </div>
            </div>
            <div v-if="appointment.form_data?.frequency" class="flex items-start gap-3">
              <UIcon name="i-lucide-repeat" class="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
              <div class="flex-1 min-w-0">
                <p class="text-xs text-gray-500 dark:text-gray-400">Fréquence</p>
                <p class="text-sm font-medium text-gray-900 dark:text-white">{{ getFrequencyLabel(appointment.form_data.frequency) }}</p>
              </div>
            </div>
            <div v-if="appointment.form_data?.availability" class="flex items-start gap-3">
              <UIcon name="i-lucide-clock" class="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
              <div class="flex-1 min-w-0">
                <p class="text-xs text-gray-500 dark:text-gray-400">Disponibilités horaires</p>
                <p class="text-sm font-medium text-gray-900 dark:text-white">{{ formatAvailability(appointment.form_data.availability) }}</p>
              </div>
            </div>
            <div v-if="appointment.notes" class="flex items-start gap-3">
              <UIcon name="i-lucide-file-text" class="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
              <div class="flex-1 min-w-0">
                <p class="text-xs text-gray-500 dark:text-gray-400">Notes du patient</p>
                <p class="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{{ appointment.notes }}</p>
              </div>
            </div>
          </div>
        </UCard>

        <!-- Documents médicaux (slot) -->
        <UCard v-if="$slots.documentsCard">
          <template #header>
            <h2 class="text-lg font-semibold flex items-center gap-2">
              <UIcon name="i-lucide-file-text" class="w-5 h-5" />
              Documents médicaux
            </h2>
          </template>
          <slot name="documentsCard" :appointment="appointment" :documents="documents" :documents-loading="documentsLoading" :load-documents="loadDocuments" />
        </UCard>

        <!-- Contenu extra colonne principale (ex: historique statuts admin) -->
        <slot v-if="$slots.mainExtra" name="mainExtra" :appointment="appointment" :load-appointment="loadAppointment" />
      </div>

      <!-- Sidebar -->
      <div class="xl:col-span-1 space-y-6">
        <UCard v-if="$slots.sidebarActions">
          <template #header>
            <h2 class="text-lg font-semibold flex items-center gap-2">
              <UIcon name="i-lucide-zap" class="w-5 h-5" />
              Actions
            </h2>
          </template>
          <slot name="sidebarActions" :appointment="appointment" :load-appointment="loadAppointment" />
        </UCard>

        <!-- Informations patient -->
        <UCard v-if="appointment.form_data || appointment.relative">
          <template #header>
            <h2 class="text-lg font-semibold flex items-center gap-2">
              <UIcon name="i-lucide-user" class="w-5 h-5" />
              {{ appointment.relative ? 'Informations proche' : 'Informations patient' }}
            </h2>
          </template>
          <div class="space-y-4">
            <div class="flex items-start gap-3">
              <UIcon name="i-lucide-user-circle" class="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
              <div class="flex-1 min-w-0">
                <p class="text-xs text-gray-500 dark:text-gray-400">Nom complet</p>
                <p class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ appointment.relative ? `${appointment.relative.first_name} ${appointment.relative.last_name}` : `${appointment.form_data?.first_name} ${appointment.form_data?.last_name}` }}
                </p>
                <p v-if="appointment.relative" class="text-xs text-gray-500 dark:text-gray-400 mt-1">Lien: {{ getRelationshipLabel(appointment.relative.relationship_type) }}</p>
              </div>
            </div>
            <div v-if="(appointment.relative && appointment.relative.phone) || appointment.form_data?.phone" class="flex items-start gap-3">
              <UIcon name="i-lucide-phone" class="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
              <div class="flex-1 min-w-0">
                <p class="text-xs text-gray-500 dark:text-gray-400">Téléphone</p>
                <p class="text-sm font-medium text-gray-900 dark:text-white">{{ appointment.relative?.phone || appointment.form_data?.phone }}</p>
              </div>
            </div>
            <div v-if="(appointment.relative && appointment.relative.email) || appointment.form_data?.email" class="flex items-start gap-3">
              <UIcon name="i-lucide-mail" class="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
              <div class="flex-1 min-w-0">
                <p class="text-xs text-gray-500 dark:text-gray-400">Email</p>
                <p class="text-sm font-medium text-gray-900 dark:text-white break-all">{{ appointment.relative?.email || appointment.form_data?.email }}</p>
              </div>
            </div>
            <div v-if="$slots.patientCardActions" class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
              <slot name="patientCardActions" :appointment="appointment" />
            </div>
          </div>
        </UCard>

        <!-- Métadonnées -->
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold flex items-center gap-2">
              <UIcon name="i-lucide-info" class="w-5 h-5" />
              Métadonnées
            </h2>
          </template>
          <div class="space-y-3">
            <div v-if="appointment.created_at" class="flex items-center justify-between">
              <span class="text-sm text-gray-500 dark:text-gray-400">Créé le</span>
              <span class="text-sm font-medium text-gray-900 dark:text-white">{{ formatDate(appointment.created_at) }}</span>
            </div>
            <div v-if="appointment.updated_at" class="flex items-center justify-between">
              <span class="text-sm text-gray-500 dark:text-gray-400">Modifié le</span>
              <span class="text-sm font-medium text-gray-900 dark:text-white">{{ formatDate(appointment.updated_at) }}</span>
            </div>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { apiFetch } from '~/utils/api';

const props = defineProps<{ basePath: string }>();
const route = useRoute();
const toast = useToast();

const appointment = ref<any>(null);
const loading = ref(true);
const documents = ref<any[]>([]);
const documentsLoading = ref(false);

const loadAppointment = async () => {
  loading.value = true;
  try {
    const response = await apiFetch(`/appointments/${route.params.id}`, { method: 'GET' });
    if (response.success && response.data) {
      appointment.value = response.data;
    } else {
      toast.add({ title: 'Erreur', description: response.error || 'Impossible de charger le rendez-vous', color: 'error' });
    }
  } catch (error: any) {
    toast.add({ title: 'Erreur', description: error.message || 'Une erreur est survenue', color: 'error' });
  } finally {
    loading.value = false;
  }
};

const loadDocuments = async () => {
  if (!route.params.id) return;
  documentsLoading.value = true;
  try {
    const response = await apiFetch(`/medical-documents?appointment_id=${route.params.id}`, { method: 'GET' });
    if (response.success && response.data) {
      documents.value = response.data;
    }
  } catch (error: any) {
    console.error('Erreur chargement documents:', error);
  } finally {
    documentsLoading.value = false;
  }
};

function openInGoogleMaps() {
  if (!appointment.value?.address) return;
  const addr = appointment.value.address;
  if (typeof addr === 'object' && addr.lat && addr.lng) {
    window.open(`https://www.google.com/maps?q=${addr.lat},${addr.lng}`, '_blank');
  } else {
    const text = typeof addr === 'object' && addr.label ? addr.label : addr;
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text)}`, '_blank');
  }
}

function getStatusColor(status: string): 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral' {
  const map: Record<string, 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral'> = {
    pending: 'warning', confirmed: 'info', inProgress: 'primary', completed: 'success', canceled: 'error', refused: 'error',
  };
  return map[status] || 'neutral';
}
function getStatusLabel(s: string) {
  const map: Record<string, string> = { pending: 'En attente', confirmed: 'Confirmé', inProgress: 'En cours', completed: 'Terminé', canceled: 'Annulé', refused: 'Refusé' };
  return map[s] || s;
}
function getTypeLabel(t: string) {
  return t === 'blood_test' ? 'Prise de sang' : 'Soins infirmiers';
}
function formatDateTime(d: string) {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return d;
  }
}
function formatDate(d: string) {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return d;
  }
}
function getDurationLabel(v: string) {
  const map: Record<string, string> = { '1': '1 jour', '7': '7 jours', '10': '10 jours', '15': '15 jours', '30': '30 jours', '60+': 'Longue durée' };
  return map[v] || v;
}
function getFrequencyLabel(v: string) {
  const map: Record<string, string> = { daily: 'Chaque jour', every_other_day: '1 jour sur 2', twice_weekly: '2 fois/sem.', thrice_weekly: '3 fois/sem.' };
  return map[v] || v;
}
function getBloodTestTypeLabel(fd: any) {
  if (!fd?.blood_test_type) return '';
  if (fd.blood_test_type === 'single') return 'Une seule prise de sang';
  if (fd.blood_test_type === 'multiple') {
    const label = fd.duration_days === 'custom' && fd.custom_days ? `${fd.custom_days} jours` : (fd.duration_days || '');
    return `Plusieurs prélèvements sur ${label}`;
  }
  return '';
}
function formatAvailability(av: string) {
  try {
    const a = typeof av === 'string' ? JSON.parse(av) : av;
    if (a?.type === 'all_day') return 'Toute la journée';
    if (a?.type === 'custom' && a?.range) return `${a.range[0]}h - ${a.range[1]}h`;
  } catch {}
  return av;
}
function getRelationshipLabel(r: string) {
  const map: Record<string, string> = { child: 'Enfant', parent: 'Parent', spouse: 'Conjoint(e)', sibling: 'Frère/Sœur', other: 'Autre' };
  return map[r] || r;
}

onMounted(async () => {
  await Promise.all([loadAppointment(), loadDocuments()]);
});

defineExpose({ loadAppointment, loadDocuments, appointment, documents, documentsLoading });
</script>

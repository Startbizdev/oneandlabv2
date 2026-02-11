<template>
  <div class="space-y-8">
    <TitleDashboard title="Paramètres" icon="i-lucide-settings">
      <template #actions>
        <UButton
          variant="ghost"
          size="sm"
          icon="i-lucide-refresh-cw"
          :loading="loadingAll"
          aria-label="Actualiser"
          @click="refreshAll"
        />
      </template>
    </TitleDashboard>

    <p class="text-sm text-muted">
      Gérez les informations de votre laboratoire, votre zone d'intervention et vos horaires.
    </p>

    <!-- Informations générales -->
    <UCard class="overflow-hidden">
      <template #header>
        <div class="flex items-start gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <UIcon name="i-lucide-building-2" class="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 class="text-lg font-semibold">Informations générales</h2>
            <p class="text-sm text-muted mt-0.5">
              Coordonnées et identification du laboratoire
            </p>
          </div>
        </div>
      </template>

      <UForm :state="settingsForm" @submit="saveSettings" class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <UFormField label="Nom du laboratoire" name="name">
            <UInput
              v-model="settingsForm.name"
              placeholder="Laboratoire Dupont"
              size="lg"
            />
          </UFormField>

          <UFormField label="Email" name="email">
            <UInput
              v-model="settingsForm.email"
              type="email"
              placeholder="contact@labo.fr"
              size="lg"
              readonly
              class="bg-muted/50"
            >
              <template #trailing>
                <UIcon name="i-lucide-lock" class="h-4 w-4 text-muted" />
              </template>
            </UInput>
            <template #hint>
              L'email ne peut pas être modifié.
            </template>
          </UFormField>

          <UFormField label="Téléphone" name="phone">
            <UInput
              v-model="settingsForm.phone"
              type="tel"
              placeholder="01 23 45 67 89"
              size="lg"
            />
          </UFormField>

          <UFormField label="SIRET" name="siret">
            <UInput
              v-model="settingsForm.siret"
              placeholder="123 456 789 00012"
              size="lg"
            />
          </UFormField>
        </div>

        <UFormField label="Adresse du laboratoire" name="address">
          <AddressSelector
            v-model="settingsForm.address"
            placeholder="Commencez à taper votre adresse..."
          />
        </UFormField>

        <div class="flex justify-end pt-2">
          <UButton type="submit" :loading="saving" icon="i-lucide-check">
            Enregistrer
          </UButton>
        </div>
      </UForm>
    </UCard>

    <!-- Zone de couverture -->
    <UCard class="overflow-hidden">
      <template #header>
        <div class="flex items-start gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <UIcon name="i-lucide-map-pin" class="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 class="text-lg font-semibold">Zone de couverture</h2>
            <p class="text-sm text-muted mt-0.5">
              Rayon d'intervention autour de votre adresse (en km)
            </p>
          </div>
        </div>
      </template>

      <div v-if="!hasValidAddress" class="rounded-xl border border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20 p-4">
        <div class="flex gap-3">
          <UIcon name="i-lucide-alert-circle" class="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-500 mt-0.5" />
          <div>
            <p class="font-medium text-amber-900 dark:text-amber-100">Adresse requise</p>
            <p class="text-sm text-amber-800/90 dark:text-amber-200/80 mt-1">
              Définissez d'abord l'adresse du laboratoire dans la section ci-dessus.
            </p>
          </div>
        </div>
      </div>

      <div v-else class="space-y-6">
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">Rayon</span>
            <span class="text-lg font-semibold tabular-nums text-primary">
              {{ coverageRadius }} km
            </span>
          </div>
          <USlider
            v-model="coverageRadius"
            :min="5"
            :max="100"
            :step="5"
            size="lg"
          />
          <div class="flex justify-between text-xs text-muted">
            <span>5 km</span>
            <span>100 km</span>
          </div>
        </div>
        <div class="flex justify-end pt-2">
          <UButton
            variant="outline"
            :loading="savingCoverage"
            icon="i-lucide-save"
            @click="saveCoverage"
          >
            Enregistrer le rayon
          </UButton>
        </div>
      </div>
    </UCard>

    <!-- Horaires de disponibilité -->
    <UCard class="overflow-hidden">
      <template #header>
        <div class="flex items-start justify-between gap-4">
          <div class="flex items-start gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <UIcon name="i-lucide-clock" class="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 class="text-lg font-semibold">Horaires de disponibilité</h2>
              <p class="text-sm text-muted mt-0.5">
                Créneaux proposés aux patients pour les prises de sang
              </p>
            </div>
          </div>
          <UButton
            size="sm"
            variant="outline"
            icon="i-lucide-pencil"
            @click="openAvailabilitySlideover"
          >
            Modifier
          </UButton>
        </div>
      </template>

      <div v-if="loadingAvailability" class="flex flex-col items-center py-12">
        <UIcon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-primary mb-3" />
        <p class="text-sm text-muted">Chargement des horaires…</p>
      </div>

      <div v-else-if="weeklyScheduleRows.length > 0" class="divide-y divide-default/50">
        <div
          v-for="row in weeklyScheduleRows"
          :key="row.day"
          class="flex items-center justify-between py-3 first:pt-0 last:pb-0"
        >
          <span class="font-medium">{{ row.label }}</span>
          <span class="text-muted tabular-nums">
            {{ row.start && row.end ? `${row.start} – ${row.end}` : 'Fermé' }}
          </span>
        </div>
      </div>

      <UEmpty
        v-else
        icon="i-lucide-clock"
        title="Aucun horaire défini"
        description="Définissez vos horaires pour que les patients puissent réserver des créneaux."
        :actions="[{ label: 'Définir les horaires', icon: 'i-lucide-plus', onClick: openAvailabilitySlideover }]"
        variant="naked"
      />
    </UCard>

    <!-- Slideover Horaires -->
    <USlideover
      v-model:open="showAvailabilitySlideover"
      title="Horaires de disponibilité"
      description="Indiquez les plages horaires pour chaque jour. Laissez vide pour un jour fermé."
      :ui="{ body: 'flex flex-col', footer: 'justify-end gap-2' }"
    >
      <template #body>
        <UForm @submit="saveAvailability" class="flex flex-col flex-1 min-h-0">
          <div class="space-y-4 flex-1 overflow-y-auto pr-1">
            <div
              v-for="day in DAYS"
              :key="day.key"
              class="rounded-lg border border-default/50 p-4 space-y-3"
            >
              <p class="font-medium text-sm">{{ day.label }}</p>
              <div class="grid grid-cols-2 gap-3">
                <UFormField label="Ouverture" :name="`${day.key}_start`">
                  <UInput
                    v-model="editingSchedule[day.key].start"
                    type="time"
                    placeholder="09:00"
                  />
                </UFormField>
                <UFormField label="Fermeture" :name="`${day.key}_end`">
                  <UInput
                    v-model="editingSchedule[day.key].end"
                    type="time"
                    placeholder="18:00"
                  />
                </UFormField>
              </div>
            </div>
          </div>
        </UForm>
      </template>
      <template #footer="{ close }">
        <UButton variant="ghost" @click="close()">Annuler</UButton>
        <UButton :loading="savingAvailability" @click="saveAvailability">
          Enregistrer
        </UButton>
      </template>
    </USlideover>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'lab',
});

useHead({
  title: 'Paramètres – Laboratoire',
});

import { apiFetch } from '~/utils/api';

const { user } = useAuth();
const toast = useToast();

const DAYS = [
  { key: 'monday', label: 'Lundi' },
  { key: 'tuesday', label: 'Mardi' },
  { key: 'wednesday', label: 'Mercredi' },
  { key: 'thursday', label: 'Jeudi' },
  { key: 'friday', label: 'Vendredi' },
  { key: 'saturday', label: 'Samedi' },
  { key: 'sunday', label: 'Dimanche' },
];

const defaultWeeklySchedule = () =>
  Object.fromEntries(
    DAYS.map((d) => [d.key, { start: '', end: '' }])
  );

const settingsForm = ref({
  name: '',
  email: '',
  phone: '',
  address: null as any,
  siret: '',
});

const coverageZone = ref<any>(null);
const availability = ref<any>(null);
const saving = ref(false);
const savingCoverage = ref(false);
const savingAvailability = ref(false);
const loadingAvailability = ref(false);
const loadingAll = ref(false);
const showAvailabilitySlideover = ref(false);
const coverageRadius = ref(20);

const editingSchedule = ref<Record<string, { start: string; end: string }>>(defaultWeeklySchedule());

const hasValidAddress = computed(() => {
  const addr = settingsForm.value.address;
  if (!addr) return false;
  return typeof addr === 'object' && addr.lat && addr.lng;
});

const weeklyScheduleRows = computed(() => {
  const schedule = availability.value?.weekly_schedule;
  if (!schedule || typeof schedule !== 'object') return [];
  return DAYS.map((d) => ({
    day: d.key,
    label: d.label,
    start: schedule[d.key]?.start || '',
    end: schedule[d.key]?.end || '',
  }));
});

const refreshAll = async () => {
  loadingAll.value = true;
  await Promise.all([loadSettings(), loadCoverage(), loadAvailability()]);
  loadingAll.value = false;
};

onMounted(() => {
  refreshAll();
});

const loadSettings = async () => {
  if (!user.value) return;
  try {
    const response = await apiFetch(`/users/${user.value.id}`, { method: 'GET' });
    if (response.success && response.data) {
      settingsForm.value = {
        name: response.data.name || '',
        email: response.data.email || '',
        phone: response.data.phone || '',
        address: response.data.address || null,
        siret: response.data.siret || '',
      };
    }
  } catch (e) {
    console.error('Erreur chargement paramètres:', e);
  }
};

const loadCoverage = async () => {
  try {
    const response = await apiFetch(
      `/coverage-zones?owner_id=${user.value?.id}&role=lab`,
      { method: 'GET' }
    );
    if (response.success && response.data?.length > 0) {
      coverageZone.value = response.data[0];
      if (coverageZone.value.radius_km) {
        coverageRadius.value = coverageZone.value.radius_km;
      }
    }
  } catch {
    // Valeurs par défaut conservées
  }
};

const loadAvailability = async () => {
  loadingAvailability.value = true;
  try {
    const response = await apiFetch(
      `/availability-settings?owner_id=${user.value?.id}&role=lab`,
      { method: 'GET' }
    );
    if (response.success && response.data) {
      availability.value = response.data;
      const ws = response.data.weekly_schedule || {};
      editingSchedule.value = { ...defaultWeeklySchedule() };
      DAYS.forEach((d) => {
        if (ws[d.key]) {
          editingSchedule.value[d.key] = {
            start: ws[d.key].start || '',
            end: ws[d.key].end || '',
          };
        }
      });
    } else {
      availability.value = null;
      editingSchedule.value = defaultWeeklySchedule();
    }
  } catch (e) {
    console.error('Erreur chargement horaires:', e);
    availability.value = null;
    editingSchedule.value = defaultWeeklySchedule();
  } finally {
    loadingAvailability.value = false;
  }
};

const openAvailabilitySlideover = () => {
  const ws = availability.value?.weekly_schedule || {};
  editingSchedule.value = { ...defaultWeeklySchedule() };
  DAYS.forEach((d) => {
    if (ws[d.key]) {
      editingSchedule.value[d.key] = {
        start: ws[d.key].start || '',
        end: ws[d.key].end || '',
      };
    }
  });
  showAvailabilitySlideover.value = true;
};

const saveSettings = async () => {
  saving.value = true;
  try {
    if (!user.value) return;
    const response = await apiFetch(`/users/${user.value.id}`, {
      method: 'PUT',
      body: {
        name: settingsForm.value.name,
        phone: settingsForm.value.phone,
        address: settingsForm.value.address,
        siret: settingsForm.value.siret,
      },
    });
    if (response.success) {
      toast.add({
        title: 'Paramètres enregistrés',
        description: 'Les informations ont été mises à jour.',
        color: 'green',
      });
      await loadSettings();
    } else {
      toast.add({
        title: 'Erreur',
        description: response.error || 'Impossible de sauvegarder',
        color: 'red',
      });
    }
  } catch (e: any) {
    toast.add({
      title: 'Erreur',
      description: e?.message || 'Une erreur est survenue',
      color: 'red',
    });
  } finally {
    saving.value = false;
  }
};

const saveCoverage = async () => {
  if (!hasValidAddress.value) {
    toast.add({
      title: 'Adresse requise',
      description: "Définissez d'abord l'adresse du laboratoire.",
      color: 'red',
    });
    return;
  }
  savingCoverage.value = true;
  try {
    const response = await apiFetch('/coverage-zones', {
      method: coverageZone.value ? 'PUT' : 'POST',
      body: {
        center_lat: settingsForm.value.address.lat,
        center_lng: settingsForm.value.address.lng,
        radius_km: coverageRadius.value,
        role: 'lab',
      },
    });
    if (response.success) {
      toast.add({
        title: 'Rayon enregistré',
        description: `Zone de ${coverageRadius.value} km mise à jour.`,
        color: 'green',
      });
      await loadCoverage();
    } else {
      toast.add({
        title: 'Erreur',
        description: response.error || "Impossible d'enregistrer",
        color: 'red',
      });
    }
  } catch (e: any) {
    toast.add({
      title: 'Erreur',
      description: e?.message || 'Une erreur est survenue',
      color: 'red',
    });
  } finally {
    savingCoverage.value = false;
  }
};

const saveAvailability = async () => {
  savingAvailability.value = true;
  try {
    const weeklySchedule: Record<string, { start: string; end: string }> = {};
    DAYS.forEach((d) => {
      const s = editingSchedule.value[d.key];
      if (s?.start && s?.end) {
        weeklySchedule[d.key] = { start: s.start, end: s.end };
      }
    });

    const response = await apiFetch('/availability-settings', {
      method: 'PUT',
      body: {
        owner_id: user.value?.id,
        role: 'lab',
        weekly_schedule: weeklySchedule,
      },
    });

    if (response.success) {
      toast.add({
        title: 'Horaires enregistrés',
        description: 'Les créneaux ont été mis à jour.',
        color: 'green',
      });
      showAvailabilitySlideover.value = false;
      await loadAvailability();
    } else {
      toast.add({
        title: 'Erreur',
        description: response.error || "Impossible d'enregistrer",
        color: 'red',
      });
    }
  } catch (e: any) {
    toast.add({
      title: 'Erreur',
      description: e?.message || 'Une erreur est survenue',
      color: 'red',
    });
  } finally {
    savingAvailability.value = false;
  }
};
</script>

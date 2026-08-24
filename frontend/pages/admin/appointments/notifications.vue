<template>
  <AppPageShell class="space-y-6">
    <template #pageHeader>
      <AppPageHeader
        title="Renvoi de notifications RDV"
        description="Renvoyez par email les notifications existantes (patient, pros zone, préleveur…) pour un ou plusieurs rendez-vous."
        :edge-bleed="false"
      />
    </template>

    <section class="rounded-xl border border-default/60 bg-default p-4 space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <UFormField label="Type de RDV">
          <USelect v-model="filters.type" :items="typeFilterOptions" value-key="value" class="w-full" />
        </UFormField>
        <UFormField label="Statut">
          <USelect v-model="filters.status" :items="statusFilterOptions" value-key="value" class="w-full" />
        </UFormField>
        <UFormField label="Recherche (UUID partiel)">
          <UInput v-model="filters.search" placeholder="ID rendez-vous…" class="w-full" />
        </UFormField>
        <div class="flex items-end gap-2">
          <UButton color="primary" :loading="listLoading" @click="loadAppointments(1)">Filtrer</UButton>
          <UButton variant="ghost" color="neutral" @click="resetFilters">Réinitialiser</UButton>
        </div>
      </div>
    </section>

    <section class="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div class="xl:col-span-2 space-y-3">
        <div class="flex items-center justify-between gap-3">
          <p class="text-sm text-muted">{{ selectedIds.length }} sélectionné(s) · {{ pagination.total }} RDV</p>
          <UButton size="sm" variant="outline" @click="toggleSelectAllPage">
            {{ allPageSelected ? 'Tout désélectionner (page)' : 'Tout sélectionner (page)' }}
          </UButton>
        </div>

        <div v-if="listLoading" class="py-12 flex justify-center">
          <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary" />
        </div>
        <UEmpty v-else-if="rows.length === 0" title="Aucun rendez-vous" description="Ajustez les filtres." />
        <div v-else class="space-y-2">
          <label
            v-for="row in rows"
            :key="row.id"
            class="flex items-start gap-3 rounded-lg border border-default/50 p-3 cursor-pointer hover:bg-muted/20"
          >
            <UCheckbox :model-value="selectedIds.includes(row.id)" @update:model-value="(v) => toggleRow(row.id, v)" />
            <div class="min-w-0 flex-1">
            <p class="text-sm font-medium truncate">{{ row.type === 'nursing' ? 'Soins infirmiers' : 'Prélèvement' }}{{ row.creneau ? ` · ${row.creneau}` : '' }}</p>
            <p class="text-xs text-muted font-mono truncate">{{ row.id }}</p>
            <p class="text-xs text-muted mt-0.5">{{ formatRowMeta(row) }}</p>
            </div>
            <UBadge variant="subtle" size="xs">{{ row.status }}</UBadge>
          </label>
        </div>

        <div v-if="pagination.pages > 1" class="flex items-center justify-between pt-2">
          <UButton size="sm" variant="outline" :disabled="pagination.page <= 1" @click="loadAppointments(pagination.page - 1)">
            Précédent
          </UButton>
          <span class="text-xs text-muted">Page {{ pagination.page }} / {{ pagination.pages }}</span>
          <UButton size="sm" variant="outline" :disabled="pagination.page >= pagination.pages" @click="loadAppointments(pagination.page + 1)">
            Suivant
          </UButton>
        </div>
      </div>

      <aside class="rounded-xl border border-default/60 bg-default p-4 space-y-4 h-fit sticky top-24">
        <h2 class="text-sm font-semibold">Action</h2>
        <UFormField label="Type d'email">
          <USelect v-model="notificationType" :items="notificationTypeOptions" value-key="value" class="w-full" />
        </UFormField>
        <UFormField
          v-if="notificationType === 'new_appointment_pro'"
          label="Destinataires pros (optionnel)"
          help="Laisser vide = offres zone + assignés"
        >
          <USelectMenu
            v-model="recipientProfileIds"
            :items="recipientSelectItems"
            value-key="value"
            multiple
            :loading="recipientsLoading"
            placeholder="Tous les destinataires métier"
            class="w-full"
            :filter-fields="['label']"
            :search-input="{ placeholder: 'Filtrer…' }"
          />
        </UFormField>
        <p class="text-xs text-muted">
          Aperçu : {{ selectedIds.length || 0 }} RDV
          <template v-if="notificationType === 'new_appointment_pro' && recipientProfileIds.length">
            × {{ recipientProfileIds.length }} destinataire(s)
          </template>
        </p>
        <UButton
          block
          color="primary"
          :loading="sending"
          :disabled="!selectedIds.length || !notificationType"
          @click="submitResend"
        >
          Renvoyer
        </UButton>
      </aside>
    </section>
  </AppPageShell>
</template>

<script setup lang="ts">
import { apiFetch } from '~/utils/api';
import { fetchAllUsers, sortUsersByLabel, userDisplayLabel } from '~/utils/fetch-all-users';

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'super_admin',
});

useHead({ title: 'Renvoi notifications RDV – Admin' });

const toast = useAppToast();
const route = useRoute();

const notificationTypeOptions = [
  { label: 'RDV créé (patient)', value: 'appointment_created' },
  { label: 'Confirmation (patient)', value: 'appointment_confirmation' },
  { label: 'Annulation (patient)', value: 'appointment_canceled_patient' },
  { label: 'Nouvelle demande (pro/infirmier/labo)', value: 'new_appointment_pro' },
  { label: 'Assignation préleveur', value: 'assigned_to_preleveur' },
  { label: 'Invitation avis', value: 'review_invitation' },
  { label: 'Résultats disponibles', value: 'results_ready' },
];

const typeFilterOptions = [
  { label: 'Tous', value: '' },
  { label: 'Soins infirmiers', value: 'nursing' },
  { label: 'Prélèvement', value: 'blood_test' },
];

const statusFilterOptions = [
  { label: 'Tous', value: '' },
  { label: 'En attente', value: 'pending' },
  { label: 'Confirmé', value: 'confirmed' },
  { label: 'Planifié', value: 'planned' },
  { label: 'En cours', value: 'inProgress' },
  { label: 'Terminé', value: 'completed' },
  { label: 'Annulé', value: 'canceled' },
];

const filters = reactive({ type: '', status: '', search: '' });
const rows = ref<any[]>([]);
const listLoading = ref(false);
const pagination = ref({ page: 1, pages: 1, total: 0, limit: 20 });
const selectedIds = ref<string[]>([]);
const notificationType = ref('appointment_created');
const recipientProfileIds = ref<string[]>([]);
const recipientsLoading = ref(false);
const recipientUsers = ref<any[]>([]);
const sending = ref(false);

const recipientSelectItems = computed(() =>
  sortUsersByLabel(recipientUsers.value).map((u) => ({
    value: String(u.id),
    label: `${userDisplayLabel(u)} (${u.role})`,
  })),
);

const allPageSelected = computed(
  () => rows.value.length > 0 && rows.value.every((r) => selectedIds.value.includes(String(r.id))),
);

function formatRowMeta(row: any): string {
  const parts = [];
  if (row.scheduled_at) parts.push(String(row.scheduled_at).slice(0, 16).replace('T', ' '));
  if (row.patient_display_name) parts.push(row.patient_display_name);
  return parts.join(' · ') || '—';
}

function toggleRow(id: string, checked: boolean) {
  const key = String(id);
  if (checked) {
    if (!selectedIds.value.includes(key)) selectedIds.value.push(key);
  } else {
    selectedIds.value = selectedIds.value.filter((x) => x !== key);
  }
}

function toggleSelectAllPage() {
  if (allPageSelected.value) {
    const pageIds = new Set(rows.value.map((r) => String(r.id)));
    selectedIds.value = selectedIds.value.filter((id) => !pageIds.has(id));
  } else {
    for (const r of rows.value) {
      const id = String(r.id);
      if (!selectedIds.value.includes(id)) selectedIds.value.push(id);
    }
  }
}

function resetFilters() {
  filters.type = '';
  filters.status = '';
  filters.search = '';
  loadAppointments(1);
}

async function loadAppointments(page = 1) {
  listLoading.value = true;
  try {
    const qs = new URLSearchParams({
      page: String(page),
      limit: String(pagination.value.limit),
      view: 'cards',
    });
    if (filters.type) qs.set('type', filters.type);
    if (filters.status) qs.set('status', filters.status);
    if (filters.search.trim()) qs.set('search', filters.search.trim());
    const res = await apiFetch(`/admin/dispatch?${qs.toString()}`, { method: 'GET' });
    if (res?.success) {
      rows.value = Array.isArray(res.data?.rows) ? res.data.rows : [];
      pagination.value = {
        page: Number(res.data?.pagination?.page ?? page),
        pages: Number(res.data?.pagination?.total_pages ?? res.data?.pagination?.pages ?? 1),
        total: Number(res.data?.pagination?.total ?? rows.value.length),
        limit: pagination.value.limit,
      };
    } else {
      rows.value = [];
    }
  } finally {
    listLoading.value = false;
  }
}

async function submitResend() {
  if (!selectedIds.value.length || !notificationType.value) return;
  if (!confirm(`Renvoyer « ${notificationTypeOptions.find((o) => o.value === notificationType.value)?.label} » pour ${selectedIds.value.length} RDV ?`)) {
    return;
  }
  sending.value = true;
  try {
    const body: Record<string, unknown> = {
      appointment_ids: selectedIds.value,
      notification_type: notificationType.value,
    };
    if (notificationType.value === 'new_appointment_pro' && recipientProfileIds.value.length) {
      body.recipient_profile_ids = recipientProfileIds.value;
    }
    const res = await apiFetch('/admin/appointments/notifications/resend', { method: 'POST', body });
    if (res?.success) {
      toast.add({
        title: 'Emails en file d\'envoi',
        description: `${res.data?.sent ?? 0} email(s) programmé(s)`,
        color: 'green',
      });
    } else {
      toast.add({ title: 'Erreur', description: (res as any)?.error, color: 'red' });
    }
  } catch (e: any) {
    toast.add({ title: 'Erreur', description: e?.message, color: 'red' });
  } finally {
    sending.value = false;
  }
}

onMounted(async () => {
  await loadAppointments(1);
  const preselect = String(route.query.appointment_id ?? '').trim();
  if (preselect && !selectedIds.value.includes(preselect)) {
    selectedIds.value = [preselect];
  }
  recipientsLoading.value = true;
  try {
    const [pros, nurses, labs] = await Promise.all([
      fetchAllUsers({ role: 'pro', status: 'active' }),
      fetchAllUsers({ role: 'nurse', status: 'active' }),
      fetchAllUsers({ role: 'lab', status: 'active' }),
    ]);
    recipientUsers.value = [...pros, ...nurses, ...labs];
  } finally {
    recipientsLoading.value = false;
  }
});
</script>

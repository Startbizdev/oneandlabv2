<template>
  <div class="space-y-6">
    <TitleDashboard
      title="Notifications"
      description="Envoyez des notifications dans les cloches des espaces (lab, patient, infirmier, super admin). Choisissez à qui envoyer pour du marketing ou des tests."
    >
      <template #actions>
        <UButton
          variant="outline"
          size="sm"
          icon="i-lucide-refresh-cw"
          :loading="loadingAudit"
          aria-label="Actualiser l'audit"
          @click="fetchSent"
        >
          Actualiser l'audit
        </UButton>
      </template>
    </TitleDashboard>

    <!-- Formulaire d'envoi -->
    <UCard class="rounded-xl border border-default/50 shadow-sm">
      <template #header>
        <h2 class="text-lg font-semibold flex items-center gap-2">
          <UIcon name="i-lucide-send" class="w-5 h-5 text-primary" />
          Envoyer une notification
        </h2>
      </template>
      <form class="space-y-5" @submit.prevent="sendNotification">
        <UFormField label="Titre" required>
          <UInput
            v-model="form.title"
            placeholder="Ex. Nouvelle offre de soins à domicile"
            size="md"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Message" required>
          <UTextarea
            v-model="form.message"
            placeholder="Contenu du message qui apparaîtra dans la cloche des destinataires..."
            :rows="4"
            size="md"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Envoyer à">
          <div class="space-y-3">
            <div class="flex flex-wrap gap-3">
              <label class="inline-flex items-center gap-2 cursor-pointer">
                <input v-model="form.targetType" type="radio" value="role" class="rounded border-default" />
                <span class="text-sm font-medium">Un rôle (espace)</span>
              </label>
              <label class="inline-flex items-center gap-2 cursor-pointer">
                <input v-model="form.targetType" type="radio" value="users" class="rounded border-default" />
                <span class="text-sm font-medium">Utilisateurs spécifiques</span>
              </label>
            </div>

            <div v-if="form.targetType === 'role'" class="mt-2">
              <USelect
                v-model="form.targetRole"
                :items="roleOptions"
                value-key="value"
                placeholder="Choisir un rôle (ex. Super administrateurs pour tester)"
                class="w-full max-w-md"
              />
              <p class="mt-1.5 text-sm text-muted">
                <strong>Test :</strong> choisir « Administrateurs » envoie uniquement aux admins pour vérifier que les cloches fonctionnent.
              </p>
            </div>

            <div v-else class="mt-2 space-y-2">
              <UButton
                type="button"
                variant="outline"
                size="sm"
                icon="i-lucide-users"
                @click="openUserPicker"
              >
                {{ selectedUserIds.length ? `${selectedUserIds.length} utilisateur(s) sélectionné(s)` : 'Sélectionner des utilisateurs' }}
              </UButton>
              <p class="text-sm text-muted">
                Ouvrez le sélecteur pour choisir les destinataires dans la liste des utilisateurs.
              </p>
            </div>
          </div>
        </UFormField>

        <div class="flex flex-wrap gap-2 pt-2">
          <UButton
            type="submit"
            color="primary"
            icon="i-lucide-bell"
            :loading="sending"
            :disabled="!canSend"
          >
            Envoyer la notification
          </UButton>
          <UButton type="button" variant="ghost" @click="resetForm">
            Réinitialiser
          </UButton>
        </div>
      </form>
    </UCard>

    <!-- Audit des envois -->
    <div class="rounded-xl border border-default/50 bg-default shadow-sm overflow-hidden">
      <div class="px-6 py-4 border-b border-default/50 flex items-center justify-between">
        <h2 class="text-lg font-semibold flex items-center gap-2">
          <UIcon name="i-lucide-history" class="w-5 h-5" />
          Audit des notifications envoyées
        </h2>
        <UButton variant="ghost" size="sm" icon="i-lucide-refresh-cw" :loading="loadingAudit" @click="fetchSent">
          Actualiser
        </UButton>
      </div>
      <div class="overflow-x-auto">
        <UTable
          v-if="sentList.length > 0"
          :data="sentList"
          :columns="auditColumns"
        >
          <template #created_at-cell="{ row }">
            <span class="text-sm text-muted">{{ formatDate((row.original ?? row).created_at) }}</span>
          </template>
          <template #title-cell="{ row }">
            <span class="font-medium text-sm">{{ (row.original ?? row).title }}</span>
          </template>
          <template #message-cell="{ row }">
            <span class="text-sm text-muted line-clamp-2">{{ (row.original ?? row).message }}</span>
          </template>
          <template #target_label-cell="{ row }">
            <UBadge variant="soft" size="sm" color="neutral">
              {{ (row.original ?? row).target_label }}
            </UBadge>
          </template>
          <template #recipient_count-cell="{ row }">
            <span class="tabular-nums font-medium">{{ (row.original ?? row).recipient_count }}</span>
          </template>
          <template #actions-cell="{ row }">
            <UButton
              size="xs"
              variant="ghost"
              color="error"
              icon="i-lucide-trash-2"
              :loading="deletingCampaignId === (row.original ?? row).campaign_id"
              aria-label="Supprimer cette notification"
              @click="confirmDeleteCampaign((row.original ?? row).campaign_id, (row.original ?? row).title)"
            >
              Supprimer
            </UButton>
          </template>
        </UTable>
        <div v-else class="flex flex-col items-center justify-center py-12 text-center">
          <UIcon name="i-lucide-bell-off" class="w-12 h-12 text-muted mb-3" />
          <p class="text-muted font-medium">Aucune notification envoyée</p>
          <p class="text-sm text-muted mt-1">Les envois marketing apparaîtront ici.</p>
        </div>
      </div>
    </div>

    <!-- Modal sélection utilisateurs -->
    <USlideover
      v-model:open="userPickerOpen"
      title="Sélectionner les destinataires"
      description="Choisissez les utilisateurs qui recevront la notification."
      :ui="{ width: 'max-w-xl', body: 'flex flex-col overflow-hidden', footer: 'justify-end gap-2' }"
    >
      <template #body>
        <div class="flex flex-col flex-1 min-h-0">
          <UInput
            v-model="userSearchQuery"
            placeholder="Rechercher par nom, email..."
            class="mb-3"
            size="md"
          />
          <div class="flex-1 overflow-y-auto border border-default rounded-lg">
            <div v-if="loadingUsers" class="p-6 text-center text-muted">Chargement...</div>
            <div v-else-if="filteredPickerUsers.length === 0" class="p-6 text-center text-muted">
              Aucun utilisateur trouvé.
            </div>
            <ul v-else class="divide-y divide-default">
              <li
                v-for="u in filteredPickerUsers"
                :key="u.id"
                class="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 cursor-pointer"
                @click="toggleUser(u.id)"
              >
                <input
                  type="checkbox"
                  :checked="selectedUserIds.includes(u.id)"
                  class="rounded border-default"
                  @click.stop
                  @change="toggleUser(u.id)"
                />
                <div class="min-w-0 flex-1">
                  <p class="font-medium truncate">{{ getUserDisplayName(u) }}</p>
                  <p class="text-sm text-muted truncate">{{ u.email || '—' }}</p>
                </div>
                <UBadge variant="soft" size="xs">{{ getRoleLabel(u.role) }}</UBadge>
              </li>
            </ul>
          </div>
          <p class="mt-2 text-sm text-muted">
            {{ selectedUserIds.length }} utilisateur(s) sélectionné(s)
          </p>
        </div>
      </template>
      <template #footer>
        <UButton variant="ghost" @click="userPickerOpen = false">
          Annuler
        </UButton>
        <UButton color="primary" @click="userPickerOpen = false">
          Valider
        </UButton>
      </template>
    </USlideover>
  </div>
</template>

<script setup lang="ts">
import { apiFetch } from '~/utils/api';

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: ['super_admin'],
});

const toast = useToast();

const form = reactive({
  title: '',
  message: '',
  targetType: 'role' as 'role' | 'users',
  targetRole: 'super_admin',
});

const roleOptions = [
  { label: 'Super administrateurs', value: 'super_admin' },
  { label: 'Laboratoires', value: 'lab' },
  { label: 'Sous-comptes lab', value: 'subaccount' },
  { label: 'Infirmiers', value: 'nurse' },
  { label: 'Patients', value: 'patient' },
  { label: 'Professionnels', value: 'pro' },
  { label: 'Préleveurs', value: 'preleveur' },
];

const sending = ref(false);
const sentList = ref<any[]>([]);
const loadingAudit = ref(false);
const deletingCampaignId = ref<string | null>(null);
const selectedUserIds = ref<string[]>([]);
const userPickerOpen = ref(false);
const pickerUsers = ref<any[]>([]);
const loadingUsers = ref(false);
const userSearchQuery = ref('');

const canSend = computed(() => {
  if (!form.title.trim() || !form.message.trim()) return false;
  if (form.targetType === 'role') return !!form.targetRole;
  return selectedUserIds.value.length > 0;
});

const auditColumns = [
  { id: 'created_at', accessorKey: 'created_at', header: 'Date' },
  { id: 'title', accessorKey: 'title', header: 'Titre' },
  { id: 'message', accessorKey: 'message', header: 'Message' },
  { id: 'target_label', accessorKey: 'target_label', header: 'Cible' },
  { id: 'recipient_count', accessorKey: 'recipient_count', header: 'Destinataires' },
  { id: 'actions', accessorKey: 'actions', header: '' },
];

const filteredPickerUsers = computed(() => {
  const q = userSearchQuery.value.trim().toLowerCase();
  if (!q) return pickerUsers.value;
  return pickerUsers.value.filter((u: any) => {
    const name = `${u.first_name || ''} ${u.last_name || ''} ${u.company_name || ''} ${u.email || ''}`.toLowerCase();
    return name.includes(q);
  });
});

function getUserDisplayName(u: any) {
  if (u.company_name) return u.company_name;
  const first = u.first_name || '';
  const last = u.last_name || '';
  return `${first} ${last}`.trim() || u.email || '—';
}

function getRoleLabel(role: string) {
  const labels: Record<string, string> = {
    super_admin: 'Super admin',
    lab: 'Lab',
    subaccount: 'Sous-compte',
    preleveur: 'Préleveur',
    nurse: 'Infirmier',
    pro: 'Pro',
    patient: 'Patient',
  };
  return labels[role] || role;
}

function formatDate(date: string) {
  return new Date(date).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toggleUser(id: string) {
  const idx = selectedUserIds.value.indexOf(id);
  if (idx === -1) selectedUserIds.value = [...selectedUserIds.value, id];
  else selectedUserIds.value = selectedUserIds.value.filter((x) => x !== id);
}

async function openUserPicker() {
  userPickerOpen.value = true;
  if (pickerUsers.value.length === 0) {
    loadingUsers.value = true;
    try {
      const res = await apiFetch('/users?limit=500', { method: 'GET' });
      if (res?.success && Array.isArray(res.data)) pickerUsers.value = res.data;
      else pickerUsers.value = [];
    } catch (_e) {
      pickerUsers.value = [];
    } finally {
      loadingUsers.value = false;
    }
  }
}

async function fetchSent() {
  loadingAudit.value = true;
  try {
    const res = await apiFetch('/admin/notifications/sent?limit=50', { method: 'GET' });
    if (res?.success && Array.isArray(res.data)) sentList.value = res.data;
    else sentList.value = [];
  } catch (_e) {
    sentList.value = [];
  } finally {
    loadingAudit.value = false;
  }
}

function confirmDeleteCampaign(campaignId: string, title: string) {
  if (!campaignId) return;
  if (!confirm(`Supprimer cette notification pour tous les destinataires ?\n\n« ${title || 'Sans titre' } »\n\nCette action est irréversible.`)) return;
  deleteCampaign(campaignId);
}

async function deleteCampaign(campaignId: string) {
  deletingCampaignId.value = campaignId;
  try {
    const res = await apiFetch(`/admin/notifications/${campaignId}`, { method: 'DELETE' });
    if (res?.success) {
      toast.add({
        title: 'Notification supprimée',
        description: res.deletedCount != null ? `${res.deletedCount} notification(s) retirée(s) pour les destinataires.` : undefined,
        color: 'green',
      });
      await fetchSent();
    } else {
      toast.add({ title: 'Erreur', description: res?.error || 'Suppression impossible', color: 'red' });
    }
  } catch (e: any) {
    toast.add({ title: 'Erreur', description: e?.message || 'Suppression impossible', color: 'red' });
  } finally {
    deletingCampaignId.value = null;
  }
}

async function sendNotification() {
  if (!canSend.value) return;
  sending.value = true;
  try {
    const body: any = {
      title: form.title.trim(),
      message: form.message.trim(),
      targetType: form.targetType,
    };
    if (form.targetType === 'role') body.targetRole = form.targetRole;
    else body.userIds = selectedUserIds.value;

    const res = await apiFetch('/admin/notifications/send', {
      method: 'POST',
      body,
    });
    if (res?.success) {
      toast.add({
        title: 'Notification envoyée',
        description: `${res.sentCount} destinataire(s) : ${res.targetLabel || ''}`,
        color: 'green',
      });
      resetForm();
      await fetchSent();
    } else {
      toast.add({ title: 'Erreur', description: res?.error || 'Envoi impossible', color: 'red' });
    }
  } catch (e: any) {
    toast.add({ title: 'Erreur', description: e?.message || 'Envoi impossible', color: 'red' });
  } finally {
    sending.value = false;
  }
}

function resetForm() {
  form.title = '';
  form.message = '';
  form.targetType = 'role';
  form.targetRole = 'admin';
  selectedUserIds.value = [];
}

onMounted(() => {
  fetchSent();
});
</script>

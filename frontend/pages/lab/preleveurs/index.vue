<template>
  <div class="space-y-6">
    <TitleDashboard
      title="Préleveurs"
      description="Gérez les préleveurs qui effectuent les prélèvements à domicile."
      icon="i-lucide-user-check"
    >
      <template #actions>
        <div class="flex items-center gap-2">
          <UButton
            variant="ghost"
            size="sm"
            icon="i-lucide-refresh-cw"
            :loading="loading"
            aria-label="Actualiser"
            @click="fetchPreleveurs"
          />
          <UButton color="primary" icon="i-lucide-plus" to="/profile?newPreleveur=1">
            Ajouter un préleveur
          </UButton>
        </div>
      </template>
    </TitleDashboard>

    <TeamMemberListPage
      :items="preleveurs"
      :loading="loading"
      search-placeholder="Rechercher par email, nom, prénom..."
      :search-fields="['email', 'first_name', 'last_name']"
      empty-title="Aucun préleveur"
      empty-description="Aucun résultat pour votre recherche ou ajoutez des préleveurs pour effectuer les prélèvements à domicile."
      empty-icon="i-lucide-user-check"
      :empty-actions="[{ label: 'Ajouter un préleveur', icon: 'i-lucide-plus', onClick: () => navigateTo('/profile?newPreleveur=1') }]"
    >
      <template #cardContent="{ item }">
        <TeamMemberCard
          :display-name="preleveurDisplayName(item)"
          :email="item.email"
          :phone="item.phone"
          :photo-src="preleveurPhotoSrc(item)"
          :extra-text="`${item.stats?.totalAppointments ?? 0} RDV · ${item.stats?.completedAppointments ?? 0} terminés`"
          :date-label="formatDateShort(safeDate(item.created_at))"
          icon="i-lucide-user-check"
        />
      </template>
      <template #cardActions="{ item }">
        <UButton size="xs" variant="soft" icon="i-lucide-user" :to="`/profile?userId=${item.id}`">
          Éditer
        </UButton>
        <UButton size="xs" variant="soft" color="primary" icon="i-lucide-calendar" :to="`/lab/appointments?assigned_to=${item.id}`">
          RDV
        </UButton>
        <UButton size="xs" variant="soft" color="red" icon="i-lucide-trash-2" @click="confirmDelete(item)">
          Supprimer
        </UButton>
      </template>
    </TeamMemberListPage>

    <!-- Modal confirmation suppression -->
    <UModal
      v-model:open="showDeleteModal"
      title="Confirmer la suppression"
      :description="`Êtes-vous sûr de vouloir supprimer le préleveur ${preleveurToDelete?.email || ''} ? Cette action est irréversible.`"
      :ui="{ content: 'max-w-md', footer: 'justify-end gap-2' }"
    >
      <template #footer="{ close }">
        <UButton variant="ghost" @click="close()">Annuler</UButton>
        <UButton color="red" :loading="deleting" @click="deletePreleveur">Supprimer</UButton>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'lab',
});

useHead({
  title: 'Préleveurs – Laboratoire',
});

import TeamMemberListPage from '~/components/dashboard/TeamMemberListPage.vue';
import TeamMemberCard from '~/components/dashboard/TeamMemberCard.vue';
import { apiFetch } from '~/utils/api';

const toast = useAppToast();
const { profileImageUrl } = useProfileImageUrl();

const preleveurs = ref<any[]>([]);
const loading = ref(true);
const deleting = ref(false);
const showDeleteModal = ref(false);
const preleveurToDelete = ref<any>(null);

/** URL affichable pour la photo (même logique que profil : data URL, http, ou chemin relatif) */
const preleveurPhotoSrc = (row: any) => profileImageUrl(row?.profile_image_url);

const preleveurDisplayName = (row: any) =>
  [String(row.first_name ?? '').trim(), String(row.last_name ?? '').trim()].filter(Boolean).join(' ') || row.email || '—';

const safeDate = (v: unknown): string => {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return new Date(v).toISOString();
  return '';
};

const formatDateShort = (date: string) => {
  if (!date) return '—';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const confirmDelete = (preleveur: any) => {
  preleveurToDelete.value = preleveur;
  showDeleteModal.value = true;
};

const deletePreleveur = async () => {
  if (!preleveurToDelete.value) return;
  deleting.value = true;
  try {
    await apiFetch(`/users/${preleveurToDelete.value.id}`, {
      method: 'DELETE',
    });
    toast.add({ title: 'Préleveur supprimé', color: 'green' });
    showDeleteModal.value = false;
    preleveurToDelete.value = null;
    await fetchPreleveurs();
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error?.data?.error || error?.message,
      color: 'red',
    });
  } finally {
    deleting.value = false;
  }
};

const fetchPreleveurs = async () => {
  loading.value = true;
  try {
    const response = await apiFetch('/lab/preleveurs', { method: 'GET' });
    if (response.success && response.data) {
      preleveurs.value = response.data;
    } else {
      preleveurs.value = [];
    }
  } catch (error) {
    console.error('Erreur chargement préleveurs:', error);
    preleveurs.value = [];
    toast.add({ title: 'Erreur de chargement', color: 'red' });
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchPreleveurs();
});
</script>

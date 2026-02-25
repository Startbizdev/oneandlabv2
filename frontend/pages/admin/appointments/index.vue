<template>
  <div class="space-y-6">
    <TitleDashboard title="Rendez-vous" description="Gérez tous les rendez-vous de la plateforme. Recherchez, filtrez et modifiez en un clic.">
      <template #actions>
        <UButton
          to="/admin/appointments/new"
          color="primary"
          icon="i-lucide-plus"
        >
          Nouveau rendez-vous
        </UButton>
        <UButton
          variant="outline"
          color="neutral"
          icon="i-lucide-refresh-cw"
          :loading="listRef?.loading"
          aria-label="Actualiser"
          @click="listRef?.fetchAppointments?.()"
        >
          Actualiser
        </UButton>
      </template>
    </TitleDashboard>

    <AppointmentListPage
      ref="listRef"
      base-path="/admin"
      :use-date-filter="false"
      hide-header
      :user-id-filter="(route.query.user_id as string) || ''"
    >
      <template #cardActions="{ appointment, basePath }">
        <UButton
          variant="soft"
          color="primary"
          size="xs"
          leading-icon="i-lucide-eye"
          :to="`${basePath}/appointments/${appointment.id}`"
          aria-label="Voir le détail"
        >
          Détails
        </UButton>
        <UButton
          variant="ghost"
          color="neutral"
          size="xs"
          leading-icon="i-lucide-pencil"
          :to="`${basePath}/appointments/${appointment.id}/edit`"
          aria-label="Éditer"
        >
          Éditer
        </UButton>
        <UButton
          variant="ghost"
          color="error"
          size="xs"
          leading-icon="i-lucide-trash-2"
          aria-label="Supprimer"
          @click="openDeleteModal(appointment)"
        >
          Supprimer
        </UButton>
      </template>
    </AppointmentListPage>

    <!-- Modal suppression -->
    <ClientOnly>
      <Teleport to="body">
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0"
          enter-to-class="opacity-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <div
            v-if="isDeleteModalOpen"
            class="fixed inset-0 z-[100] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
          >
            <div
              class="absolute inset-0 bg-black/50 backdrop-blur-sm"
              aria-hidden="true"
              @click="isDeleteModalOpen = false"
            />
            <div
              class="relative z-10 w-full max-w-md rounded-xl border border-default bg-default shadow-xl"
            >
              <div class="flex items-center justify-between border-b border-default px-5 py-4">
                <h2 id="delete-modal-title" class="text-lg font-normal text-foreground">
                  Supprimer le rendez-vous
                </h2>
                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-x"
                  size="sm"
                  aria-label="Fermer"
                  @click="isDeleteModalOpen = false"
                />
              </div>
              <p class="border-b border-default px-5 py-4 text-sm text-muted">
                Cette action est irréversible. Le rendez-vous et ses données associées seront définitivement supprimés.
              </p>
              <div class="flex justify-end gap-2 px-5 py-4">
                <UButton color="neutral" variant="ghost" @click="isDeleteModalOpen = false">
                  Annuler
                </UButton>
                <UButton color="error" variant="solid" :loading="isDeleting" @click="confirmDelete">
                  Supprimer
                </UButton>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: ['super_admin'],
});

import { apiFetch } from '~/utils/api';

const route = useRoute();
const toast = useAppToast();
const listRef = ref<{ fetchAppointments: () => void; loading?: boolean } | null>(null);
const isDeleteModalOpen = ref(false);
const selectedAppointment = ref<{ id: string } | null>(null);
const isDeleting = ref(false);

function openDeleteModal(appointment: { id: string }) {
  selectedAppointment.value = appointment;
  isDeleteModalOpen.value = true;
}

async function confirmDelete() {
  if (!selectedAppointment.value || !listRef.value) return;
  isDeleting.value = true;
  try {
    const response = await apiFetch(`/appointments/${selectedAppointment.value.id}`, {
      method: 'DELETE',
    });
    if (response?.success) {
      toast.add({
        title: 'Rendez-vous supprimé',
        description: 'Le rendez-vous a été supprimé avec succès.',
        color: 'green',
      });
      isDeleteModalOpen.value = false;
      selectedAppointment.value = null;
      await listRef.value.fetchAppointments();
    } else {
      toast.add({
        title: 'Erreur',
        description: (response as any)?.error || 'Impossible de supprimer le rendez-vous',
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
    isDeleting.value = false;
  }
}
</script>

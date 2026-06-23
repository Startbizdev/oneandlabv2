<template>
  <AppPageShell class="space-y-6">
    <template #pageHeader>
    <AppPageHeader :edge-bleed="false" 
      title="Rendez-vous du laboratoire"
      :description="assignedToSubtitle"
    >
      <template #actions>
        <UButton to="/lab/appointments/new" color="primary" icon="i-lucide-plus">
          Créer un RDV
        </UButton>
      </template>
    </AppPageHeader>
  </template>
    <!-- Tag pour supprimer le filtre RDV préleveur / sous-compte (avec nom) -->
    <div v-if="hasFilterByAssignee" class="flex flex-wrap items-center gap-2">
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        :class="filterByPreleveur ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'bg-default text-muted hover:bg-default/80'"
        @click="clearAssigneeFilter"
      >
        <UIcon :name="filterByPreleveur ? 'i-lucide-user-check' : 'i-lucide-user-cog'" class="w-4 h-4 shrink-0" />
        <span>{{ filterByPreleveur ? 'RDV préleveur' : 'RDV sous-compte' }}<template v-if="assigneeLabel"> : {{ assigneeLabel }}</template></span>
        <UIcon name="i-lucide-x" class="w-4 h-4 shrink-0 ml-0.5" />
      </button>
    </div>
    <AppointmentListPage
      base-path="/lab"
      hide-header
      title="Rendez-vous du laboratoire"
      :subtitle="assignedToSubtitle"
      :use-date-filter="false"
      :assigned-to-preleveur-id="(route.query.assigned_to as string) || ''"
      :assigned-to-lab-id="(route.query.assigned_lab_id as string) || ''"
      :card-href="(a) => (pendingIncoming(a) ? null : `/lab/appointments/${a.id}`)"
      @card-click="(a) => openAppointmentModal(a.id)"
    />

  <DashboardAppointmentListAccessModals list-path="/lab/appointments" />
  </AppPageShell>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'lab',
});

import { apiFetch } from '~/utils/api';
import { isPendingIncomingOffer } from '~/utils/appointment-offer';

const route = useRoute();
const { user } = useAuth();
const { openAppointmentModalById: openAppointmentModal } = useAppointmentModal();

function pendingIncoming(appointment: { status?: string; created_by?: string | null }) {
  return isPendingIncomingOffer(appointment, user.value?.id);
}

const filterByPreleveur = computed(() => !!(route.query.assigned_to as string)?.trim());
const filterBySubaccount = computed(() => !!(route.query.assigned_lab_id as string)?.trim());
const hasFilterByAssignee = computed(() => filterByPreleveur.value || filterBySubaccount.value);

const assigneeLabel = ref<string>('');

const assignedToSubtitle = computed(() => {
  if (route.query.assigned_to) return 'RDV assignés à ce préleveur — prises de sang uniquement.';
  if (route.query.assigned_lab_id) return 'RDV assignés à ce sous-compte — prises de sang uniquement.';
  return 'Prises de sang uniquement — laboratoire et sous-comptes.';
});

async function fetchAssigneeLabel() {
  const id = (route.query.assigned_to || route.query.assigned_lab_id) as string;
  if (!id?.trim()) {
    assigneeLabel.value = '';
    return;
  }
  try {
    const res = await apiFetch(`/users/${id}`, { method: 'GET' });
    if (res?.success && res?.data) {
      const u = res.data;
      if (route.query.assigned_to) {
        const name = [String(u.first_name ?? '').trim(), String(u.last_name ?? '').trim()].filter(Boolean).join(' ');
        assigneeLabel.value = name || u.email || '';
      } else {
        assigneeLabel.value = (u.company_name && String(u.company_name).trim()) || [String(u.first_name ?? '').trim(), String(u.last_name ?? '').trim()].filter(Boolean).join(' ') || u.email || '';
      }
    } else {
      assigneeLabel.value = '';
    }
  } catch {
    assigneeLabel.value = '';
  }
}

watch(
  () => [route.query.assigned_to, route.query.assigned_lab_id],
  () => { fetchAssigneeLabel(); },
  { immediate: true },
);

function clearAssigneeFilter() {
  navigateTo('/lab/appointments');
}

useHead({
  title: 'Rendez-vous – Laboratoire',
});
</script>

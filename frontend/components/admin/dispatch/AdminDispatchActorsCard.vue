<template>
  <div class="rounded-xl border border-default/50 bg-default p-4 shadow-sm">
    <h3 class="mb-3 text-sm font-medium text-default">Acteurs</h3>
    <dl class="grid gap-3 text-sm sm:grid-cols-2">
      <div v-if="identity.creator">
        <dt class="text-muted">Créé par</dt>
        <dd class="font-medium">
          {{ identity.creator.display_name || '—' }}
          <UBadge variant="soft" size="xs" class="ml-1">{{ roleLabel(identity.creator.role) }}</UBadge>
        </dd>
        <UButton
          v-if="identity.creator.id"
          variant="link"
          size="xs"
          class="px-0"
          :to="`/admin/users?user_id=${identity.creator.id}`"
        >
          Voir le profil
        </UButton>
      </div>
      <div v-if="identity.assigned_pro">
        <dt class="text-muted">Pro assigné</dt>
        <dd class="font-medium">{{ identity.assigned_pro.display_name || '—' }}</dd>
      </div>
      <div v-if="identity.assigned_nurse">
        <dt class="text-muted">Infirmier</dt>
        <dd class="font-medium">{{ identity.assigned_nurse.display_name || '—' }}</dd>
      </div>
      <div v-if="identity.assigned_lab">
        <dt class="text-muted">Laboratoire</dt>
        <dd class="font-medium">{{ identity.assigned_lab.display_name || '—' }}</dd>
      </div>
      <div v-if="identity.assigned_preleveur">
        <dt class="text-muted">Préleveur</dt>
        <dd class="font-medium">{{ identity.assigned_preleveur.display_name || '—' }}</dd>
      </div>
      <div v-if="identity.patient">
        <dt class="text-muted">Patient</dt>
        <dd class="font-medium">{{ identity.patient.display_name || '—' }}</dd>
      </div>
      <div>
        <dt class="text-muted">Horaire</dt>
        <dd>{{ formatDate(identity.scheduled_at) }}<span v-if="identity.creneau"> — {{ identity.creneau }}</span></dd>
      </div>
      <div v-if="identity.dispatch_mode">
        <dt class="text-muted">Mode dispatch</dt>
        <dd>{{ dispatchModeLabel(identity.dispatch_mode) }}</dd>
      </div>
    </dl>
  </div>
</template>

<script setup lang="ts">
import type { AdminDispatchDetail } from '@oneandlab/shared-types';

defineProps<{
  identity: AdminDispatchDetail['identity'];
}>();

function formatDate(d: string | null): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return d;
  }
}

function roleLabel(role: string | null | undefined): string {
  const map: Record<string, string> = {
    pro: 'Pro',
    nurse: 'Infirmier',
    lab: 'Labo',
    subaccount: 'Sous-lab',
    preleveur: 'Préleveur',
    patient: 'Patient',
    super_admin: 'Admin',
  };
  return role ? (map[role] ?? role) : '—';
}

function dispatchModeLabel(mode: string): string {
  const map: Record<string, string> = {
    zone: 'Zone géographique',
    external_invite: 'Invite SMS',
    direct_assign: 'Assignation directe',
    manual: 'Manuel (admin)',
  };
  return map[mode] ?? mode;
}
</script>

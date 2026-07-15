<template>
  <div class="rounded-xl border border-default/50 bg-default p-4 shadow-sm">
    <h3 class="mb-3 text-sm font-medium text-default">Timeline</h3>
    <div v-if="!items.length" class="text-sm text-muted">Aucun événement enregistré.</div>
    <ol v-else class="relative space-y-0 border-l border-default/60 pl-4">
      <li
        v-for="item in items"
        :key="`${item.source}-${item.id}`"
        class="relative pb-4 last:pb-0"
      >
        <span
          class="absolute -left-[1.3rem] flex h-5 w-5 items-center justify-center rounded-full bg-default ring-2 ring-default"
        >
          <UIcon :name="iconFor(item.event_type)" class="h-3 w-3 text-muted" />
        </span>
        <p class="text-sm font-medium leading-snug">{{ item.label }}</p>
        <p class="mt-0.5 text-xs text-muted">
          {{ formatDate(item.created_at) }}
          <span v-if="item.actor_display_name"> · {{ item.actor_display_name }}</span>
          <span v-if="item.actor_role"> ({{ roleLabel(item.actor_role) }})</span>
          <span v-if="item.target_display_name"> → {{ item.target_display_name }}</span>
        </p>
        <p v-if="item.metadata?.note" class="mt-1 text-xs text-muted italic">{{ item.metadata.note }}</p>
      </li>
    </ol>
  </div>
</template>

<script setup lang="ts">
import type { AdminDispatchTimelineItem } from '@oneandlab/shared-types';

defineProps<{
  items: AdminDispatchTimelineItem[];
}>();

function formatDate(d: string): string {
  try {
    return new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch {
    return d;
  }
}

function roleLabel(role: string): string {
  const map: Record<string, string> = {
    pro: 'Pro',
    nurse: 'Infirmier',
    lab: 'Labo',
    subaccount: 'Sous-lab',
    preleveur: 'Préleveur',
    patient: 'Patient',
    super_admin: 'Admin',
  };
  return map[role] ?? role;
}

function iconFor(type: string): string {
  if (type.includes('share') || type.includes('token')) return 'i-lucide-link';
  if (type.includes('redispatch') || type === 'redispatch') return 'i-lucide-rotate-ccw';
  if (type.includes('accept') || type === 'confirmed' || type.includes('status_confirmed')) return 'i-lucide-check';
  if (type.includes('decline')) return 'i-lucide-x';
  if (type.includes('dispatch') || type.includes('zone')) return 'i-lucide-radio-tower';
  if (type.includes('created') || type === 'create') return 'i-lucide-plus';
  if (type.includes('invite') || type.includes('external')) return 'i-lucide-smartphone';
  return 'i-lucide-circle-dot';
}
</script>

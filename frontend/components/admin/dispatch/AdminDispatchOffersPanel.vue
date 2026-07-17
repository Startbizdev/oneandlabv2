<template>
  <div class="rounded-xl border border-default/50 bg-default p-4 shadow-sm">
    <h3 class="mb-3 text-sm font-medium text-default">Propositions et envois</h3>

    <div v-if="activeOffers.length" class="mb-4">
      <p class="mb-2 text-xs font-medium text-muted uppercase tracking-wide">Propositions en cours ({{ activeOffers.length }})</p>
      <ul class="space-y-2">
        <li
          v-for="offer in activeOffers"
          :key="offer.profile_id"
          class="flex items-center justify-between gap-2 rounded-lg bg-muted/30 px-3 py-2 text-sm"
        >
          <span class="truncate font-medium">{{ offer.display_name || offer.profile_id }}</span>
          <span class="shrink-0 text-xs text-muted">{{ roleLabel(offer.role) }} · {{ formatDate(offer.offered_at) }}</span>
        </li>
      </ul>
    </div>
    <p v-else class="mb-4 text-sm text-muted">Aucune proposition en cours.</p>

    <div v-if="dispatchWaves.length">
      <p class="mb-2 text-xs font-medium text-muted uppercase tracking-wide">Vagues d’envoi</p>
      <ul class="space-y-3">
        <li
          v-for="(wave, idx) in dispatchWaves"
          :key="`${wave.created_at}-${idx}`"
          class="rounded-lg border border-default/40 px-3 py-2 text-sm"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="font-medium">{{ waveLabel(wave.event_type) }}</span>
            <span class="text-xs text-muted">{{ formatDate(wave.created_at) }}</span>
          </div>
          <p class="mt-1 text-xs text-muted">
            {{ wave.recipient_count }} destinataire(s)
            <span v-if="wave.actor?.display_name"> · par {{ wave.actor.display_name }}</span>
          </p>
          <ul v-if="wave.recipients.length" class="mt-2 max-h-24 overflow-y-auto text-xs text-muted">
            <li v-for="r in wave.recipients.slice(0, 8)" :key="r.profile_id || r.id">
              {{ r.display_name || r.profile_id || r.id }} ({{ roleLabel(r.role) }})
            </li>
            <li v-if="wave.recipients.length > 8" class="italic">+ {{ wave.recipients.length - 8 }} autres</li>
          </ul>
        </li>
      </ul>
    </div>

    <div v-if="shareTokens.length" class="mt-4">
      <p class="mb-2 text-xs font-medium text-muted uppercase tracking-wide">Liens de partage</p>
      <ul class="space-y-1 text-xs text-muted">
        <li v-for="tok in shareTokens" :key="tok.token_id">
          Créé {{ formatDate(tok.created_at) }}
          <span v-if="tok.expires_at"> · expire {{ formatDate(tok.expires_at) }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AdminDispatchDetail } from '@oneandlab/shared-types';

defineProps<{
  activeOffers: AdminDispatchDetail['active_offers'];
  dispatchWaves: AdminDispatchDetail['dispatch_waves'];
  shareTokens: AdminDispatchDetail['share_tokens'];
}>();

function formatDate(d: string | null): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch {
    return d;
  }
}

function roleLabel(role: string | null | undefined): string {
  const map: Record<string, string> = {
    nurse: 'Infirmier',
    lab: 'Laboratoire',
    subaccount: 'Sous-compte labo',
    preleveur: 'Préleveur',
  };
  return role ? (map[role] ?? role) : '—';
}

function waveLabel(type: string): string {
  const map: Record<string, string> = {
    zone_dispatch: 'Envoi zone géographique',
    redispatch: 'Nouvelle diffusion',
    nurse_share_redispatch_zone: 'Zone après partage',
  };
  return map[type] ?? type;
}
</script>

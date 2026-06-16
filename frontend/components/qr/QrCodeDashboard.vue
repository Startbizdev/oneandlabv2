<script setup lang="ts">
import { apiFetch } from '~/utils/api';

type FunnelStats = {
  scans: number;
  visits: number;
  conversions: number;
  conversion_rate: number;
};

type QrPayload = {
  qr: {
    id: string;
    token: string;
    scan_url: string;
    short_url: string;
    effective_tagline: string;
    marketing_tagline?: string | null;
    display_name?: string;
    profile_image_url?: string | null;
  };
  analytics: {
    days_7: FunnelStats;
    days_30: FunnelStats;
    all_time: FunnelStats;
  };
};

const loading = ref(true);
const saving = ref(false);
const error = ref('');
const payload = ref<QrPayload | null>(null);
const taglineDraft = ref('');
const posterUrl = ref<string | null>(null);

const config = useRuntimeConfig();
const apiBase = computed(() => {
  const base = (config.public as { apiBase?: string }).apiBase || '/api';
  return base.startsWith('http') ? base : `${window.location.origin}${base}`;
});

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const res = await apiFetch<{ success: boolean; data: QrPayload }>('/qr/me', { method: 'GET' });
    if (res.success && res.data) {
      payload.value = res.data;
      taglineDraft.value = res.data.qr.marketing_tagline ?? '';
      await refreshPoster();
    }
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Impossible de charger le QR code';
  } finally {
    loading.value = false;
  }
}

async function refreshPoster() {
  if (posterUrl.value) {
    URL.revokeObjectURL(posterUrl.value);
    posterUrl.value = null;
  }
  const res = await fetch(`${apiBase.value}/qr/me/png?format=a4`, {
    credentials: 'include',
  });
  if (!res.ok) return;
  const blob = await res.blob();
  posterUrl.value = URL.createObjectURL(blob);
}

async function saveTagline() {
  saving.value = true;
  try {
    await apiFetch('/qr/me', {
      method: 'PATCH',
      body: { marketing_tagline: taglineDraft.value.trim() || null },
    });
    await load();
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Enregistrement impossible';
  } finally {
    saving.value = false;
  }
}

function downloadUrl(raw: boolean, format = 'a4') {
  const q = raw ? '&raw=1' : '';
  return `${apiBase.value}/qr/me/png?format=${format}${q}`;
}

async function copyLink() {
  const link = payload.value?.qr.scan_url;
  if (!link) return;
  try {
    await navigator.clipboard.writeText(link);
  } catch {
    /* ignore */
  }
}

onMounted(() => {
  void load();
});

onBeforeUnmount(() => {
  if (posterUrl.value) URL.revokeObjectURL(posterUrl.value);
});
</script>

<template>
  <div v-if="loading" class="flex justify-center py-16">
    <UIcon name="i-lucide-loader-2" class="h-10 w-10 animate-spin text-primary" />
  </div>

  <UAlert v-else-if="error" color="error" :title="error" class="mb-6" />

  <div v-else-if="payload" class="grid gap-6 lg:grid-cols-2 lg:gap-8">
    <UCard class="overflow-hidden ring-1 ring-default/60">
      <template #header>
        <h2 class="flex items-center gap-2 text-lg font-normal">
          <UIcon name="i-lucide-qr-code" class="h-5 w-5 shrink-0 text-primary" />
          Votre affiche
        </h2>
      </template>

      <div class="flex flex-col items-center gap-4">
        <img
          v-if="posterUrl"
          :src="posterUrl"
          alt="Affiche QR Cary"
          class="mx-auto w-full max-w-lg rounded-xl bg-[#F4FAFA] object-contain shadow-sm ring-1 ring-default/40"
        />
        <p class="text-center text-sm text-muted">
          {{ payload.qr.short_url }}
        </p>
        <div class="flex w-full max-w-md flex-wrap justify-center gap-2">
          <UButton
            as="a"
            :href="downloadUrl(false, 'a4')"
            target="_blank"
            icon="i-lucide-download"
            color="primary"
          >
            Télécharger l'affiche
          </UButton>
          <UButton
            as="a"
            :href="downloadUrl(true)"
            target="_blank"
            variant="outline"
            icon="i-lucide-qr-code"
          >
            QR seul
          </UButton>
          <UButton variant="soft" icon="i-lucide-link" @click="copyLink">
            Copier le lien
          </UButton>
        </div>
      </div>
    </UCard>

    <div class="space-y-6">
      <UCard class="ring-1 ring-default/60">
        <template #header>
          <h2 class="text-lg font-normal">Votre message</h2>
        </template>
        <p class="mb-3 text-sm text-muted">
          Personnalisez l'accroche affichée sur votre poster.
        </p>
        <UTextarea
          v-model="taglineDraft"
          :rows="3"
          maxlength="120"
          placeholder="Ex. : Scannez pour réserver un rendez-vous avec moi"
        />
        <p class="mt-1 text-xs text-muted">{{ taglineDraft.length }}/120</p>
        <UButton class="mt-3" size="sm" :loading="saving" @click="saveTagline">
          Enregistrer le message
        </UButton>
      </UCard>

      <UCard class="ring-1 ring-default/60">
        <template #header>
          <h2 class="text-lg font-normal">Statistiques — 30 derniers jours</h2>
        </template>
        <div class="grid grid-cols-3 gap-3">
          <div
            v-for="(label, key) in { scans: 'Flashes', visits: 'Visites', conversions: 'RDV pris' }"
            :key="key"
            class="rounded-xl bg-muted/30 p-4 text-center ring-1 ring-default/40"
          >
            <p class="text-2xl font-semibold text-primary">
              {{ payload.analytics.days_30[key as keyof FunnelStats] }}
            </p>
            <p class="mt-1 text-xs text-muted">{{ label }}</p>
          </div>
        </div>
      </UCard>

      <UCard class="ring-1 ring-default/60">
        <template #header>
          <h2 class="text-lg font-normal">Tout le temps</h2>
        </template>
        <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt class="text-muted">Flashes</dt>
          <dd class="font-medium text-highlighted">{{ payload.analytics.all_time.scans }}</dd>
          <dt class="text-muted">Visites booking</dt>
          <dd class="font-medium text-highlighted">{{ payload.analytics.all_time.visits }}</dd>
          <dt class="text-muted">RDV pris</dt>
          <dd class="font-medium text-highlighted">{{ payload.analytics.all_time.conversions }}</dd>
          <dt class="text-muted">Taux conversion</dt>
          <dd class="font-medium text-highlighted">{{ payload.analytics.all_time.conversion_rate }}%</dd>
        </dl>
      </UCard>
    </div>
  </div>
</template>

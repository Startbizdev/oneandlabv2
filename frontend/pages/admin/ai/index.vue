<template>
  <AppPageShell class="space-y-6">
    <template #pageHeader>
      <AppPageHeader
        :edge-bleed="false"
        title="Cockpit IA Cary"
        description="Routing Grok par tâche, usage tokens, audits et disclaimer."
      />
    </template>

    <div v-if="loading" class="text-sm text-muted">Chargement…</div>
    <div v-else-if="error" class="text-sm text-red-600">{{ error }}</div>

    <template v-else>
      <UCard>
        <template #header>
          <h2 class="text-lg font-normal flex items-center gap-2">
            <UIcon name="i-lucide-gauge" class="w-5 h-5" />
            Usage (30 jours)
          </h2>
        </template>
        <div v-if="usage?.totals" class="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <div class="rounded-lg border border-default/50 p-4">
            <p class="text-xs text-muted">Appels LLM</p>
            <p class="text-2xl font-medium">{{ usage.totals.total_calls ?? 0 }}</p>
          </div>
          <div class="rounded-lg border border-default/50 p-4">
            <p class="text-xs text-muted">Tokens</p>
            <p class="text-2xl font-medium">{{ usage.totals.total_tokens ?? 0 }}</p>
          </div>
          <div class="rounded-lg border border-default/50 p-4">
            <p class="text-xs text-muted">Erreurs</p>
            <p class="text-2xl font-medium">{{ usage.totals.total_errors ?? 0 }}</p>
          </div>
          <div class="rounded-lg border border-default/50 p-4">
            <p class="text-xs text-muted">Latence p50</p>
            <p class="text-2xl font-medium">{{ formatMs(usage.latency?.p50) }}</p>
          </div>
          <div class="rounded-lg border border-default/50 p-4">
            <p class="text-xs text-muted">Latence p95</p>
            <p class="text-2xl font-medium">{{ formatMs(usage.latency?.p95) }}</p>
          </div>
          <div class="rounded-lg border border-default/50 p-4">
            <p class="text-xs text-muted">Satisfaction</p>
            <p class="text-2xl font-medium">{{ formatRating(usage.feedback?.avg_rating) }}</p>
          </div>
        </div>
        <div v-if="usage?.costs?.length" class="mt-4 overflow-x-auto">
          <table class="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr class="border-b border-default/50 text-muted">
                <th class="py-2 pr-4">Provider</th>
                <th class="py-2 pr-4">Tokens in</th>
                <th class="py-2 pr-4">Tokens out</th>
                <th class="py-2">Coût estimé (USD)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in usage.costs" :key="String(row.provider)" class="border-b border-default/30">
                <td class="py-2 pr-4 font-mono text-xs">{{ row.provider }}</td>
                <td class="py-2 pr-4">{{ row.tokens_in ?? 0 }}</td>
                <td class="py-2 pr-4">{{ row.tokens_out ?? 0 }}</td>
                <td class="py-2">{{ row.estimated_usd ?? '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h2 class="text-lg font-normal flex items-center gap-2">
              <UIcon name="i-lucide-route" class="w-5 h-5" />
              Routing par tâche
            </h2>
            <UButton
              size="sm"
              variant="outline"
              icon="i-lucide-download"
              :loading="exportingAudits"
              @click="exportAudits"
            >
              Export audits CSV
            </UButton>
          </div>
        </template>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr class="border-b border-default/50 text-muted">
                <th class="py-2 pr-4">Tâche</th>
                <th class="py-2 pr-4">Provider</th>
                <th class="py-2 pr-4">Modèle</th>
                <th class="py-2 pr-4">Actif</th>
                <th class="py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in routing" :key="row.task_type" class="border-b border-default/30">
                <td class="py-2 pr-4 font-mono text-xs">{{ row.task_type }}</td>
                <td class="py-2 pr-4">
                  <USelect
                    v-model="row.provider"
                    :items="providerOptions"
                    size="xs"
                    class="min-w-[120px]"
                  />
                </td>
                <td class="py-2 pr-4">
                  <UInput v-model="row.model" size="xs" class="min-w-[100px]" />
                </td>
                <td class="py-2 pr-4">
                  <UCheckbox v-model="row.enabled" />
                </td>
                <td class="py-2">
                  <UButton size="xs" variant="soft" @click="saveRouting(row)">Enregistrer</UButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="text-lg font-normal flex items-center gap-2">
            <UIcon name="i-lucide-shield-alert" class="w-5 h-5" />
            Disclaimer & température
          </h2>
        </template>
        <form class="space-y-4" @submit.prevent="saveSettings">
          <UFormField label="Disclaimer FR">
            <UTextarea v-model="settings.disclaimer_fr" :rows="3" class="w-full" />
          </UFormField>
          <UFormField label="Température">
            <UInput v-model.number="settings.temperature" type="number" step="0.1" min="0" max="1" class="max-w-[120px]" />
          </UFormField>
          <UButton type="submit" color="primary" :loading="savingSettings">Enregistrer</UButton>
        </form>
      </UCard>
    </template>
  </AppPageShell>
</template>

<script setup lang="ts">
import { apiFetch, apiFetchBlob } from '~/utils/api';

definePageMeta({ layout: 'dashboard', middleware: ['auth', 'role'], role: 'super_admin' });

const loading = ref(true);
const error = ref<string | null>(null);
const exportingAudits = ref(false);
const routing = ref<Array<Record<string, unknown>>>([]);
const usage = ref<{
  totals?: Record<string, number>;
  by_task?: unknown[];
  latency?: { p50?: number | null; p95?: number | null; count?: number };
  feedback?: { avg_rating?: number | null; count?: number };
  costs?: Array<Record<string, unknown>>;
} | null>(null);
const settings = reactive({ disclaimer_fr: '', temperature: 0.4 });
const savingSettings = ref(false);

const providerOptions = [
  { label: 'Grok', value: 'grok' },
  { label: 'OpenAI', value: 'openai' },
  { label: 'DeepSeek', value: 'deepseek' },
];

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function formatMs(value?: number | null): string {
  if (value == null) return '—';
  return `${Math.round(value)} ms`;
}

function formatRating(value?: number | null): string {
  if (value == null) return '—';
  return `${value.toFixed(1)}/5`;
}

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const [routingRes, usageRes, settingsRes] = await Promise.all([
      apiFetch('/admin/ai/routing', { method: 'GET' }),
      apiFetch('/admin/ai/usage?days=30', { method: 'GET' }),
      apiFetch('/admin/ai/settings', { method: 'GET' }),
    ]);
    if (!routingRes.success) throw new Error(routingRes.error ?? 'Routing indisponible');
    if (!usageRes.success) throw new Error(usageRes.error ?? 'Usage indisponible');
    if (!settingsRes.success) throw new Error(settingsRes.error ?? 'Paramètres indisponibles');

    routing.value = (routingRes.data ?? []).map((r: Record<string, unknown>) => ({
      ...r,
      enabled: Boolean(r.enabled),
    }));
    usage.value = usageRes.data ?? null;
    const settingsData = settingsRes.data ?? {};
    settings.disclaimer_fr = settingsData.disclaimer_fr ?? '';
    settings.temperature = settingsData.temperature ?? 0.4;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Chargement impossible';
  } finally {
    loading.value = false;
  }
}

async function saveRouting(row: Record<string, unknown>) {
  const res = await apiFetch('/admin/ai/routing', {
    method: 'PATCH',
    body: {
      task_type: row.task_type,
      provider: row.provider,
      model: row.model,
      enabled: row.enabled,
    },
  });
  if (!res.success) throw new Error(res.error ?? 'Enregistrement impossible');
}

async function saveSettings() {
  savingSettings.value = true;
  try {
    const res = await apiFetch('/admin/ai/settings', {
      method: 'PUT',
      body: { disclaimer_fr: settings.disclaimer_fr, temperature: settings.temperature },
    });
    if (!res.success) throw new Error(res.error ?? 'Enregistrement impossible');
  } finally {
    savingSettings.value = false;
  }
}

async function exportAudits() {
  exportingAudits.value = true;
  try {
    const { blob, filenameHint } = await apiFetchBlob('/admin/ai/audits/export?days=30');
    triggerBlobDownload(blob, filenameHint ?? `ai_audits_${new Date().toISOString().slice(0, 10)}.csv`);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Export impossible';
  } finally {
    exportingAudits.value = false;
  }
}

onMounted(() => void load());
</script>

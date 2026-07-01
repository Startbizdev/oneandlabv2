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
              :href="exportAuditsUrl"
              target="_blank"
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
definePageMeta({ layout: 'dashboard', middleware: ['auth', 'role'], role: 'super_admin' });

const config = useRuntimeConfig();
const apiBase = computed(() => config.public.apiBase as string);

const loading = ref(true);
const error = ref<string | null>(null);
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

const exportAuditsUrl = computed(() => `${apiBase.value}/admin/ai/audits/export?days=30`);

function formatMs(value?: number | null): string {
  if (value == null) return '—';
  return `${Math.round(value)} ms`;
}

function formatRating(value?: number | null): string {
  if (value == null) return '—';
  return `${value.toFixed(1)}/5`;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await $fetch<{ success: boolean; data: T; error?: string }>(`${apiBase.value}${path}`, {
    credentials: 'include',
    ...init,
  });
  if (!res.success) throw new Error(res.error ?? 'Erreur API');
  return res.data;
}

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const [routingData, usageData, settingsData] = await Promise.all([
      apiFetch<typeof routing.value>('/admin/ai/routing'),
      apiFetch<typeof usage.value>('/admin/ai/usage?days=30'),
      apiFetch<{ disclaimer_fr?: string; temperature?: number }>('/admin/ai/settings'),
    ]);
    routing.value = routingData.map((r) => ({
      ...r,
      enabled: Boolean(r.enabled),
    }));
    usage.value = usageData;
    settings.disclaimer_fr = settingsData.disclaimer_fr ?? '';
    settings.temperature = settingsData.temperature ?? 0.4;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Chargement impossible';
  } finally {
    loading.value = false;
  }
}

async function saveRouting(row: Record<string, unknown>) {
  await apiFetch('/admin/ai/routing', {
    method: 'PATCH',
    body: {
      task_type: row.task_type,
      provider: row.provider,
      model: row.model,
      enabled: row.enabled,
    },
  });
}

async function saveSettings() {
  savingSettings.value = true;
  try {
    await apiFetch('/admin/ai/settings', {
      method: 'PUT',
      body: { disclaimer_fr: settings.disclaimer_fr, temperature: settings.temperature },
    });
  } finally {
    savingSettings.value = false;
  }
}

onMounted(() => void load());
</script>

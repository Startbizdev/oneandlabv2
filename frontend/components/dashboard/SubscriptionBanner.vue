<template>
  <aside v-if="visible" aria-label="Votre offre" class="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
    <p>{{ role === 'nurse' ? `${used}/${max} rendez-vous acceptés ce mois-ci. Pro permet de recevoir des rendez-vous sans limite.` : 'Besoin de renforcer votre équipe ? Starter inclut 2 préleveurs ; Pro inclut aussi les sous-comptes.' }}</p>
    <NuxtLink :to="role === 'nurse' ? '/nurse/abonnement' : '/lab/abonnement'" class="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 font-medium text-primary-800 hover:bg-primary-50 dark:text-primary-200 dark:hover:bg-primary-950">
      Comparer les offres <UIcon name="i-lucide-arrow-right" class="size-4" aria-hidden="true" />
    </NuxtLink>
  </aside>
</template>

<script setup lang="ts">
import { apiFetch } from '~/utils/api';
const { user } = useAuth();
const role = computed(() => user.value?.role ?? null);
const route = useRoute();
const limits = ref<{ plan_slug?: string; appointments_count_this_month?: number; max_appointments_per_month?: number | null } | null>(null);
const used = computed(() => Number(limits.value?.appointments_count_this_month));
const max = computed(() => Number(limits.value?.max_appointments_per_month));
const visible = computed(() => {
  if (role.value === 'nurse') {
    return limits.value?.plan_slug === 'discovery' && Number.isFinite(used.value) && Number.isFinite(max.value)
      && max.value > 0 && used.value >= Math.ceil(max.value * 0.8) && route.path !== '/nurse/abonnement';
  }
  return role.value === 'lab' && limits.value?.plan_slug === 'free'
    && /^\/lab\/(preleveurs|subaccounts)(\/|$)/.test(route.path);
});
let requestVersion = 0;
watch(() => [user.value?.id, role.value], async () => {
  const version = ++requestVersion;
  limits.value = null;
  if (!import.meta.client || !['nurse', 'lab'].includes(role.value ?? '')) return;
  try {
    const response = await apiFetch('/plan-limits', { method: 'GET' });
    if (version !== requestVersion || !response?.success) return;
    limits.value = response.data ?? null;
  } catch {
    // An unavailable offer must never prevent access to the workspace.
  }
}, { immediate: true });
onBeforeUnmount(() => { requestVersion++; });
</script>

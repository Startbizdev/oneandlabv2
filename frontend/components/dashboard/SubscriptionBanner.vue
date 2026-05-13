<template>
  <div
    v-if="visible"
    class="w-full flex flex-col items-stretch gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-center sm:gap-3 sm:py-1.5 bg-slate-800 text-white text-xs font-medium shadow-sm"
  >
    <div class="flex items-start justify-center gap-2 text-center sm:max-w-2xl sm:items-center sm:min-w-0">
      <span class="shrink-0 pt-0.5 sm:pt-0" aria-hidden="true">🚀</span>
      <span class="min-w-0 flex-1 text-[11px] leading-snug sm:text-xs">
        {{
          role === 'nurse'
            ? 'Passez en Pro pour étendre votre rayon, débloquer tous les soins et gérer vos rendez-vous sans limite.'
            : 'Passez à un abonnement pour ajouter des préleveurs et sous-comptes.'
        }}
      </span>
    </div>
    <NuxtLink
      :to="role === 'nurse' ? '/nurse/abonnement' : '/lab/abonnement'"
      class="inline-flex shrink-0 items-center justify-center gap-1 rounded bg-white px-2 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100 sm:inline-flex sm:py-1"
    >
      Voir les offres
      <UIcon name="i-lucide-arrow-right" class="h-3.5 w-3.5 shrink-0" />
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
import { apiFetch } from '~/utils/api';

const { user } = useAuth();
const role = computed(() => user.value?.role ?? null);

const visible = ref(false);

const isNurseOrLab = computed(() => role.value === 'nurse' || role.value === 'lab');

async function checkSubscription() {
  console.log('[SubscriptionBanner] checkSubscription', {
    role: role.value,
    isNurseOrLab: isNurseOrLab.value,
  });
  if (!isNurseOrLab.value) {
    visible.value = false;
    console.log('[SubscriptionBanner] skip (not nurse/lab), visible=false');
    return;
  }
  try {
    const res = await apiFetch('/plan-limits', { method: 'GET' });
    console.log('[SubscriptionBanner] plan-limits response', res);
    if (!res?.success || !res?.data) {
      visible.value = false;
      console.log('[SubscriptionBanner] no success/data, visible=false');
      return;
    }
    const planSlug = res.data.plan_slug ?? null;
    if (role.value === 'nurse') {
      visible.value = planSlug === 'discovery';
      console.log('[SubscriptionBanner] nurse, planSlug=', planSlug, 'visible=', visible.value);
    } else if (role.value === 'lab') {
      visible.value = planSlug === 'free';
      console.log('[SubscriptionBanner] lab, planSlug=', planSlug, 'visible=', visible.value);
    } else {
      visible.value = false;
      console.log('[SubscriptionBanner] other role, visible=false');
    }
  } catch (e) {
    visible.value = false;
    console.log('[SubscriptionBanner] error', e);
  }
}

// Réagir quand le rôle change
watch([role, isNurseOrLab], () => {
  console.log('[SubscriptionBanner] watch role/isNurseOrLab', { role: role.value, isNurseOrLab: isNurseOrLab.value });
  if (isNurseOrLab.value) checkSubscription();
  else visible.value = false;
}, { immediate: true });

// Réagir quand user est chargé (auth peut être asynchrone)
watch(() => user.value, (u) => {
  console.log('[SubscriptionBanner] watch user', u ? { id: u.id, role: u.role } : null);
  if (u?.role && (u.role === 'nurse' || u.role === 'lab')) {
    checkSubscription();
  }
}, { immediate: true });

// Relancer une fois au montage côté client (au cas où user arrive après le premier watch)
onMounted(() => {
  console.log('[SubscriptionBanner] onMounted', { client: import.meta.client, isNurseOrLab: isNurseOrLab.value, user: user.value ? { role: user.value.role } : null });
  if (import.meta.client && isNurseOrLab.value) {
    nextTick(() => checkSubscription());
  }
});
</script>

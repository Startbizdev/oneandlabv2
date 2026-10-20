<template>
  <div class="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:pt-12">
    <div v-if="pending" class="flex flex-1 items-center justify-center py-16" aria-live="polite">
      <UIcon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-primary" />
      <span class="sr-only">Chargement de la pharmacie…</span>
    </div>

    <div v-else-if="!pharmacy" class="flex flex-1 flex-col items-center justify-center py-16 text-center">
      <span class="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-900">
        <UIcon name="i-lucide-store" class="h-6 w-6" />
      </span>
      <h1 class="font-heading text-xl font-semibold text-gray-900 dark:text-white">Pharmacie introuvable</h1>
      <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">Ce lien n'est plus valide.</p>
      <UButton to="/" color="neutral" variant="outline" class="mt-6 min-h-11">
        Retour à l'accueil
      </UButton>
    </div>

    <template v-else>
      <header class="text-center">
        <span class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 dark:bg-primary-950/40">
          <UIcon name="i-lucide-store" class="h-7 w-7" />
        </span>
        <h1 class="font-heading text-2xl font-semibold text-gray-900 dark:text-white">{{ pharmacy.name }}</h1>
        <p v-if="pharmacy.city" class="mt-1 text-sm text-gray-600 dark:text-gray-400">{{ pharmacy.city }}</p>
      </header>

      <div class="mt-8 flex flex-col gap-3">
        <component
          :is="orderEnabled ? NuxtLink : 'div'"
          :to="orderEnabled ? orderTarget : undefined"
          :aria-disabled="orderEnabled ? undefined : 'true'"
          class="flex min-h-[72px] items-center gap-4 rounded-2xl px-4 py-4 text-left transition-colors"
          :class="orderEnabled
            ? 'bg-primary-600 text-white hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700'
            : 'cursor-not-allowed border border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-800 dark:bg-gray-900'"
        >
          <UIcon name="i-lucide-pill" class="h-6 w-6 shrink-0" />
          <span class="min-w-0 flex-1">
            <span class="block text-base font-semibold">Commander mes médicaments</span>
            <span class="mt-0.5 block text-sm" :class="orderEnabled ? 'text-white/85' : ''">{{ orderHint }}</span>
          </span>
          <UIcon v-if="orderEnabled" name="i-lucide-chevron-right" class="h-5 w-5 shrink-0" />
        </component>

        <NuxtLink
          :to="bookingTarget"
          class="flex min-h-[72px] items-center gap-4 rounded-2xl border border-gray-200 bg-white px-4 py-4 text-left text-gray-900 transition-colors hover:border-primary-300 hover:bg-primary-50/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
        >
          <UIcon name="i-lucide-calendar-plus" class="h-6 w-6 shrink-0 text-primary-600" />
          <span class="min-w-0 flex-1">
            <span class="block text-base font-semibold">Prendre rendez-vous</span>
            <span class="mt-0.5 block text-sm text-gray-600 dark:text-gray-400">Prélèvement ou soin à domicile</span>
          </span>
          <UIcon name="i-lucide-chevron-right" class="h-5 w-5 shrink-0 text-gray-400" />
        </NuxtLink>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { NuxtLink } from '#components';
import { isPharmacyId } from '~/utils/qr-redirect';
import {
  PHARMACY_ORDER_INTENT,
  normalizePublicPharmacy,
  pharmacyBookingPath,
  pharmacyLoginPath,
  pharmacyOrderPath,
  type PublicPharmacy,
} from '~/utils/pharmacy-landing';

definePageMeta({ layout: 'patient' });

const route = useRoute();
const config = useRuntimeConfig();
const { user, token } = useAuth();

const pharmacyId = computed(() => String(route.params.id ?? '').trim());
const utmQr = computed(() => (typeof route.query.utm_qr === 'string' ? route.query.utm_qr.trim() : '') || null);

const { data, pending } = await useAsyncData(
  () => `public-pharmacy:${pharmacyId.value}`,
  async (): Promise<PublicPharmacy | null> => {
    if (!isPharmacyId(pharmacyId.value)) return null;
    const base = String(config.public.apiBase || '/api').replace(/\/$/, '');
    const apiBase = import.meta.server && base.startsWith('/') ? String(config.apiInternalBase).replace(/\/$/, '') : base;
    try {
      const res = await $fetch<{ success?: boolean; data?: unknown }>(
        `${apiBase}/public/pharmacy?id=${encodeURIComponent(pharmacyId.value)}`,
        { timeout: 10000 },
      );
      return res?.success ? normalizePublicPharmacy(res.data) : null;
    } catch {
      return null;
    }
  },
  { watch: [pharmacyId] },
);

const pharmacy = computed(() => data.value ?? null);

if (import.meta.server && !pharmacy.value) {
  const event = useRequestEvent();
  if (event) setResponseStatus(event, 404);
}

useHead(() => ({
  title: pharmacy.value ? `${pharmacy.value.name} – Cary` : 'Pharmacie – Cary',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
}));

/** L'état de connexion n'existe que côté client (localStorage) : rien avant le montage. */
const mounted = ref(false);
onMounted(() => {
  mounted.value = true;
});

const role = computed(() => (mounted.value && token.value ? (user.value?.role as string | undefined) ?? null : null));
const authResolving = computed(() => mounted.value && !!token.value && !role.value);
const roleOrderPath = computed(() => (pharmacy.value ? pharmacyOrderPath(role.value, pharmacy.value.id, utmQr.value) : null));

const orderEnabled = computed(() => {
  if (!pharmacy.value?.orders_open || !mounted.value || authResolving.value) return false;
  return !role.value || !!roleOrderPath.value;
});

const orderTarget = computed(() => {
  if (!pharmacy.value) return '/';
  return roleOrderPath.value ?? pharmacyLoginPath(pharmacy.value.id, utmQr.value);
});

const orderHint = computed(() => {
  if (!pharmacy.value?.orders_open) return 'Cette pharmacie ne prend pas de commandes en ligne pour le moment.';
  if (role.value && !roleOrderPath.value) return "Disponible dans l'app Cary.";
  if (!role.value && mounted.value && !authResolving.value) return 'Connectez-vous pour envoyer votre ordonnance.';
  return 'Envoyez votre ordonnance à la pharmacie.';
});

const bookingTarget = computed(() => pharmacyBookingPath(pharmacyId.value, utmQr.value));

// Retour de connexion : on enchaîne directement sur le formulaire du rôle.
watch(
  [() => route.query.intent, roleOrderPath, () => pharmacy.value?.orders_open],
  ([intent, path, open]) => {
    if (intent === PHARMACY_ORDER_INTENT && path && open) void navigateTo(path, { replace: true });
  },
  { immediate: true },
);
</script>

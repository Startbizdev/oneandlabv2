<template>
  <div class="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-6 px-4 py-16 text-center">
    <template v-if="!sessionIdParam">
      <UIcon name="i-lucide-circle-alert" class="size-12 text-warning" aria-hidden="true" />
      <div class="space-y-2">
        <h1 class="text-xl font-semibold text-foreground">Lien incomplet</h1>
        <p class="text-sm text-muted">Revenez depuis la page de paiement Stripe ou retrouvez vos rendez-vous dans votre espace.</p>
      </div>
      <UButton color="primary" to="/patient">Mon espace</UButton>
    </template>

    <template v-else-if="fatalError">
      <UIcon name="i-lucide-circle-x" class="size-12 text-error" aria-hidden="true" />
      <div class="space-y-2">
        <h1 class="text-xl font-semibold text-foreground">Paiement enregistré, création RDV impossible</h1>
        <p class="text-sm text-muted">{{ fatalError }}</p>
      </div>
      <UButton color="primary" to="/patient">Mon espace</UButton>
    </template>

    <template v-else-if="pollStatus === 'completed'">
      <UIcon name="i-lucide-circle-check" class="size-12 text-success" aria-hidden="true" />
      <div class="space-y-2">
        <h1 class="text-xl font-semibold text-foreground">Merci&nbsp;!</h1>
        <p class="text-sm text-muted">Votre rendez-vous est confirmé avec l’option Horaire VIP.</p>
      </div>
      <p class="text-xs text-muted">Redirection automatique vers votre liste de rendez-vous…</p>
    </template>

    <template v-else>
      <div class="relative">
        <UIcon name="i-lucide-loader-circle" class="size-14 animate-spin text-primary" aria-hidden="true" />
      </div>
      <div class="space-y-2">
        <h1 class="text-xl font-semibold text-foreground">Finalisation de votre réservation…</h1>
        <p class="text-sm text-muted">
          Nous vérifions le paiement et créons votre rendez-vous (quelques secondes).
        </p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { apiFetch } from '~/utils/api';

definePageMeta({
  layout: 'patient',
  middleware: ['auth'],
});

const route = useRoute();
const router = useRouter();

const sessionIdParam = computed(() => {
  const q = route.query.session_id;
  return typeof q === 'string' && q.trim() !== '' ? q.trim() : '';
});

const pollStatus = ref<'idle' | 'pending' | 'completed' | 'failed'>('idle');
const fatalError = ref('');

let pollTimer: ReturnType<typeof setInterval> | null = null;
let attempts = 0;
const maxAttempts = 50;

async function pollOnce() {
  if (!sessionIdParam.value) return;
  attempts += 1;
  if (attempts > maxAttempts) {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
    fatalError.value =
      'La confirmation prend plus de temps que prévu. Vos rendez-vous peuvent être disponibles sous peu : vérifiez votre espace patient.';
    pollStatus.value = 'failed';
    return;
  }
  try {
    const res = (await apiFetch(
      `/patient/booking-draft/status?session_id=${encodeURIComponent(sessionIdParam.value)}`,
      { method: 'GET' },
    )) as { success?: boolean; data?: { status?: string; error_message?: string } };
    if (!res?.success) {
      return;
    }
    const st = String(res.data?.status ?? '');
    if (st === 'completed') {
      pollStatus.value = 'completed';
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = null;
      setTimeout(() => {
        try {
          void router.replace('/patient');
        } catch {
          if (typeof window !== 'undefined') window.location.assign('/patient');
        }
      }, 1200);
      return;
    }
    if (st === 'failed') {
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = null;
      fatalError.value = String(res.data?.error_message ?? 'Une erreur est survenue après le paiement.');
      pollStatus.value = 'failed';
    }
    if (st === 'expired') {
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = null;
      fatalError.value = 'Le brouillon a expiré. Reprenez la réservation si besoin.';
      pollStatus.value = 'failed';
    }
  } catch {
    /* continue polling */
  }
}

onMounted(() => {
  if (!sessionIdParam.value) return;
  pollStatus.value = 'pending';
  void pollOnce();
  pollTimer = setInterval(() => {
    void pollOnce();
  }, 1500);
});

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer);
});
</script>

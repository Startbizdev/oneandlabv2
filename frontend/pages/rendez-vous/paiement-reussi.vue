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
        <h1 class="text-xl font-semibold text-foreground">{{ errorTitle }}</h1>
        <p class="text-sm text-muted">{{ fatalError }}</p>
      </div>
      <div class="flex flex-wrap justify-center gap-3">
        <UButton color="primary" @click="startPolling">Vérifier à nouveau</UButton>
        <UButton color="neutral" variant="outline" to="/patient">Mes rendez-vous</UButton>
      </div>
    </template>

    <template v-else-if="pollStatus === 'completed'">
      <UIcon name="i-lucide-circle-check" class="size-12 text-success" aria-hidden="true" />
      <div class="space-y-2">
        <h1 class="text-xl font-semibold text-foreground">Demande enregistrée</h1>
        <p class="text-sm text-muted">Retrouvez vos rendez-vous et suivez leur prise en charge dans votre espace patient.</p>
      </div>
      <p class="text-xs text-muted">Redirection automatique vers votre liste de rendez-vous…</p>
      <UButton color="primary" to="/patient">Mes rendez-vous</UButton>
    </template>

    <template v-else>
      <div class="relative" role="status" aria-label="Vérification de la réservation">
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
  middleware: ['auth', 'role'],
  role: 'patient',
});

const route = useRoute();
const router = useRouter();

const sessionIdParam = computed(() => {
  const q = route.query.session_id;
  return typeof q === 'string' && q.trim() !== '' ? q.trim() : '';
});

const pollStatus = ref<'idle' | 'pending' | 'completed' | 'failed'>('idle');
const fatalError = ref('');
const errorTitle = ref('Vérification indisponible');
useHead({ title: 'Suivi de votre réservation | Cary', meta: [{ name: 'robots', content: 'noindex, nofollow' }] });

let pollTimer: ReturnType<typeof setTimeout> | null = null;
let redirectTimer: ReturnType<typeof setTimeout> | null = null;
let generation = 0;
let attempts = 0;
const maxAttempts = 50;

function stopTimers() {
  if (pollTimer) clearTimeout(pollTimer);
  if (redirectTimer) clearTimeout(redirectTimer);
  pollTimer = null;
  redirectTimer = null;
}

function startPolling() {
  stopTimers();
  const version = ++generation;
  fatalError.value = '';
  attempts = 0;
  if (!sessionIdParam.value) { pollStatus.value = 'idle'; return; }
  pollStatus.value = 'pending';
  void pollOnce(version, sessionIdParam.value);
}

async function pollOnce(version: number, sessionId: string) {
  if (version !== generation) return;
  attempts += 1;
  if (attempts > maxAttempts) {
    errorTitle.value = 'Confirmation en attente';
    fatalError.value =
      'La confirmation prend plus de temps que prévu. Vérifiez vos rendez-vous avant de recommencer un paiement.';
    pollStatus.value = 'failed';
    return;
  }
  try {
    const res = (await apiFetch(
      `/patient/booking-draft/status?session_id=${encodeURIComponent(sessionId)}`,
      { method: 'GET' },
    )) as { success?: boolean; data?: { status?: string; error_message?: string } };
    if (version !== generation) return;
    if (!res?.success) throw new Error('Vérification indisponible');
    const st = String(res.data?.status ?? '');
    if (st === 'completed') {
      pollStatus.value = 'completed';
      redirectTimer = setTimeout(() => {
        if (version === generation) void router.replace('/patient').catch(() => { /* The visible link remains available. */ });
      }, 1200);
      return;
    }
    if (st === 'failed') {
      errorTitle.value = 'Réservation à vérifier';
      fatalError.value = 'Votre demande n’a pas pu être finalisée. Consultez votre espace patient ou contactez-nous avant de recommencer un paiement.';
      pollStatus.value = 'failed';
      return;
    }
    if (st === 'expired') {
      errorTitle.value = 'Session expirée';
      fatalError.value = 'Cette session a expiré. Vérifiez votre espace patient pour connaître les rendez-vous déjà enregistrés.';
      pollStatus.value = 'failed';
      return;
    }
    pollTimer = setTimeout(() => { void pollOnce(version, sessionId); }, 1500);
  } catch {
    if (version !== generation) return;
    errorTitle.value = 'Vérification indisponible';
    fatalError.value = 'Nous ne pouvons pas vérifier votre réservation pour le moment. Réessayez la vérification ou consultez vos rendez-vous.';
    pollStatus.value = 'failed';
  }
}

onMounted(startPolling);
watch(sessionIdParam, startPolling);

onBeforeUnmount(() => {
  generation++;
  stopTimers();
});
</script>

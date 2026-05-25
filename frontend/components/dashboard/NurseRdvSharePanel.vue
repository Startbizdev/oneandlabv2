<template>
  <div class="flex min-w-0 w-full flex-col gap-1.5">
    <div v-if="previewCareItems.length > 1" class="text-[11px] text-muted leading-snug space-y-0.5 w-full">
      <p class="font-medium text-gray-800 dark:text-gray-100">
        Lot multisoins ({{ previewCareItems.length }})
      </p>
      <ul class="space-y-0.5">
        <li v-for="(it, i) in previewCareItems" :key="it.appointmentId || i" class="flex justify-between gap-2">
          <span class="min-w-0 truncate">{{ i + 1 }}. {{ it.categoryName }}</span>
          <span v-if="it.dateShort" class="shrink-0 tabular-nums text-gray-500">{{ it.dateShort }}</span>
        </li>
      </ul>
    </div>

    <UDropdownMenu
      :items="shareMenuItems"
      :popper="{ placement: splitRow ? 'bottom-end' : 'bottom', offsetDistance: 6 }"
      :ui="{ width: 'w-56' }"
    >
      <UButton
        variant="outline"
        color="neutral"
        size="md"
        leading-icon="i-lucide-share-2"
        block
        class="min-w-0 w-full justify-center font-medium [&_span.iconify]:size-4"
        :loading="loading"
        :disabled="!appointmentId || loading"
      >
        Partager
      </UButton>
    </UDropdownMenu>
  </div>
</template>

<script setup lang="ts">
import { apiFetch } from '~/utils/api';

const props = withDefaults(
  defineProps<{
    appointmentId: string;
    /** Ligne 50/50 avec Redispatcher : ancrage du menu ; sinon une seule colonne (ex. RDV en cours, admin). */
    splitRow?: boolean;
  }>(),
  { splitRow: false },
);

const emit = defineEmits<{
  released: [];
}>();

const toast = useAppToast();
const loading = ref(false);
const cachedMessage = ref<string | null>(null);
const cachedShareUrl = ref<string | null>(null);
const previewCareItems = ref<{ appointmentId?: string; categoryName: string; dateShort: string }[]>([]);

/** Délai avant de recharger la fiche quand le serveur a republié le RDV : laisse le temps d’ouvrir WhatsApp / le partage sans mise à jour brutale immédiate. */
const RELEASE_REFRESH_DELAY_MS = 750;

/** Évite l’ouverture de la modal « confrère » quand l’infirmier ouvre le lien public juste après l’avoir généré (ex. aperçu WhatsApp, même session). */
const NURSE_SHARE_JUST_SENT_KEY = 'nurse_share_just_sent';

function markNurseShareJustSent(appointmentId: string) {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(
      NURSE_SHARE_JUST_SENT_KEY,
      JSON.stringify({ appointmentId: String(appointmentId), at: Date.now() }),
    );
  } catch {
    /* ignore */
  }
}

function scheduleReleasedIfNeeded(repended: boolean) {
  if (!repended || typeof window === 'undefined') return;
  window.setTimeout(() => emit('released'), RELEASE_REFRESH_DELAY_MS);
}

async function buildSharePayload(): Promise<{ text: string; url: string; repended: boolean } | null> {
  if (cachedMessage.value != null && cachedShareUrl.value != null) {
    return { text: cachedMessage.value, url: cachedShareUrl.value, repended: false };
  }
  const res = await apiFetch(`/appointments/${props.appointmentId}/share-for-nurse`, { method: 'POST' });
  if (!res?.success || !res?.data) {
    toast.add({
      title: 'Erreur',
      description: (res as any)?.error ?? 'Impossible de préparer le partage.',
      color: 'error',
    });
    return null;
  }
  const { shareText, sharePath, shareTextAfterUrl, repended, careItems } = res.data;
  previewCareItems.value = Array.isArray(careItems) ? careItems : [];
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const shareUrl = origin + sharePath;
  const text = shareText + shareUrl + (shareTextAfterUrl ?? '');
  cachedMessage.value = text;
  cachedShareUrl.value = shareUrl;
  return { text, url: shareUrl, repended: !!repended };
}

/**
 * Mobile (Safari / WebKit surtout) : `window.open(url)` après un `await` n’est plus lié au tap —
 * la fenêtre est bloquée sans message. On ouvre donc `about:blank` tout de suite (même tour event),
 * puis on assigne l’URL après l’API ; si aucun onglet n’a pu s’ouvrir, navigation même onglet.
 */
function openPreparedWhatsAppTab(payload: { text: string; repended: boolean }, placeholder: Window | null) {
  const url = `https://wa.me/?text=${encodeURIComponent(payload.text)}`;
  try {
    if (placeholder && !placeholder.closed) {
      placeholder.location.replace(url);
      return;
    }
  } catch {
    /* ignore */
  }
  const second = typeof window !== 'undefined' ? window.open(url, '_blank', 'noopener,noreferrer') : null;
  if (!second || second.closed) {
    window.location.href = url;
  }
}

async function openWhatsApp() {
  loading.value = true;
  let placeholder: Window | null = null;
  if (typeof window !== 'undefined') {
    placeholder = window.open('about:blank', '_blank');
  }
  try {
    const payload = await buildSharePayload();
    if (!payload) {
      try {
        placeholder?.close();
      } catch {
        /* ignore */
      }
      return;
    }
    markNurseShareJustSent(props.appointmentId);
    openPreparedWhatsAppTab(payload, placeholder);
    toast.add({
      title: 'WhatsApp',
      description: payload.repended
        ? 'Choisissez le contact dans WhatsApp. La fiche se met à jour dans un instant (le rendez-vous repasse en attente).'
        : 'Si rien ne s’ouvre, vérifiez le bloqueur de pop-ups.',
      color: 'success',
    });
    scheduleReleasedIfNeeded(payload.repended);
  } finally {
    loading.value = false;
  }
}

async function nativeShare() {
  loading.value = true;
  let rependedFlag = false;
  try {
    const payload = await buildSharePayload();
    if (!payload) return;
    rependedFlag = payload.repended;
    markNurseShareJustSent(props.appointmentId);
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ text: payload.text });
        toast.add({ title: 'Partage', description: 'Choisissez l’application cible.', color: 'success' });
      } else {
        await navigator.clipboard?.writeText(payload.text);
        toast.add({
          title: 'Presse-papiers',
          description: 'Partage système indisponible : le message a été copié.',
          color: 'success',
        });
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        toast.add({ title: 'Erreur', description: e?.message ?? 'Partage impossible.', color: 'error' });
      }
    } finally {
      scheduleReleasedIfNeeded(rependedFlag);
    }
  } finally {
    loading.value = false;
  }
}

async function copyShareLink() {
  loading.value = true;
  try {
    const payload = await buildSharePayload();
    if (!payload) return;
    markNurseShareJustSent(props.appointmentId);
    await navigator.clipboard?.writeText(payload.url);
    toast.add({
      title: 'Lien copié',
      description: 'Vous pouvez le coller où vous voulez.',
      color: 'success',
    });
    if (payload.repended) {
      emit('released');
    }
  } catch (e: any) {
    toast.add({ title: 'Erreur', description: e?.message ?? 'Copie impossible.', color: 'error' });
  } finally {
    loading.value = false;
  }
}

const shareMenuItems = computed(() => [
  [
    {
      label: 'Partager sur WhatsApp',
      icon: 'i-simple-icons-whatsapp',
      onSelect: () => {
        void openWhatsApp();
      },
    },
    {
      label: 'Partager le lien',
      icon: 'i-lucide-share-2',
      onSelect: () => {
        void nativeShare();
      },
    },
    {
      label: 'Copier le lien',
      icon: 'i-lucide-link',
      onSelect: () => {
        void copyShareLink();
      },
    },
  ],
]);

watch(
  () => props.appointmentId,
  () => {
    cachedMessage.value = null;
    cachedShareUrl.value = null;
    previewCareItems.value = [];
  },
);
</script>

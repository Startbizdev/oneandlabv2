<template>
  <div
    class="rounded-xl border border-emerald-200/70 bg-emerald-50/40 p-3 dark:border-emerald-900/45 dark:bg-emerald-950/25"
  >
    <div class="mb-2.5 flex items-center gap-2">
      <UIcon name="i-lucide-share-2" class="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
      <h3 class="text-sm font-semibold text-gray-900 dark:text-white">
        Partager le RDV
      </h3>
    </div>

    <div
      v-if="previewCareItems.length > 1"
      class="mb-2 rounded-lg border border-emerald-200/60 bg-white/60 dark:bg-gray-900/30 px-2.5 py-2 text-[11px] dark:border-emerald-900/40"
    >
      <p class="font-medium text-gray-800 dark:text-gray-100 mb-1">Lot multisoins ({{ previewCareItems.length }})</p>
      <ul class="space-y-0.5 text-gray-600 dark:text-gray-400">
        <li v-for="(it, i) in previewCareItems" :key="it.appointmentId || i" class="flex justify-between gap-2">
          <span class="min-w-0 truncate">{{ i + 1 }}. {{ it.categoryName }}</span>
          <span v-if="it.dateShort" class="shrink-0 tabular-nums text-gray-500">{{ it.dateShort }}</span>
        </li>
      </ul>
    </div>

    <div class="flex flex-col gap-2">
      <UButton
        block
        size="lg"
        :loading="loading && pendingAction === 'whatsapp'"
        :disabled="!appointmentId || loading"
        class="justify-center font-medium"
        :ui="{
          base: 'bg-[#25D366] hover:bg-[#20BD5A] active:bg-[#1DA851] text-white ring-0 focus-visible:ring-2 focus-visible:ring-[#25D366]/50',
        }"
        leading-icon="i-simple-icons-whatsapp"
        @click="openWhatsApp"
      >
        WhatsApp
      </UButton>

      <div class="grid grid-cols-2 gap-1.5">
        <UButton
          variant="outline"
          color="neutral"
          size="lg"
          block
          class="justify-center"
          leading-icon="i-lucide-share"
          :loading="loading && pendingAction === 'share'"
          :disabled="!appointmentId || loading"
          @click="nativeShare"
        >
          Partager
        </UButton>
        <UButton
          variant="outline"
          color="neutral"
          size="lg"
          block
          class="justify-center"
          leading-icon="i-lucide-copy"
          :loading="loading && pendingAction === 'copy'"
          :disabled="!appointmentId || loading"
          @click="copyMessage"
        >
          Copier
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { apiFetch } from '~/utils/api';

const props = defineProps<{
  appointmentId: string;
}>();

const emit = defineEmits<{
  released: [];
}>();

const toast = useAppToast();
const loading = ref(false);
const pendingAction = ref<'whatsapp' | 'share' | 'copy' | null>(null);
const cachedMessage = ref<string | null>(null);
const previewCareItems = ref<{ appointmentId?: string; categoryName: string; dateShort: string }[]>([]);

async function buildShareMessage(): Promise<string | null> {
  if (cachedMessage.value) return cachedMessage.value;
  const res = await apiFetch(`/appointments/${props.appointmentId}/share-for-nurse`, { method: 'GET' });
  if (!res?.success || !res?.data) {
    toast.add({
      title: 'Erreur',
      description: (res as any)?.error ?? 'Impossible de préparer le message.',
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
  if (repended) {
    emit('released');
  }
  return text;
}

async function openWhatsApp() {
  loading.value = true;
  pendingAction.value = 'whatsapp';
  try {
    const text = await buildShareMessage();
    if (!text) return;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    toast.add({
      title: 'WhatsApp',
      description: 'Si rien ne s’ouvre, vérifiez le bloqueur de pop-ups.',
      color: 'success',
    });
  } finally {
    loading.value = false;
    pendingAction.value = null;
  }
}

async function nativeShare() {
  loading.value = true;
  pendingAction.value = 'share';
  try {
    const text = await buildShareMessage();
    if (!text) return;
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ text });
      toast.add({ title: 'Partage', description: 'Choisissez l’application cible.', color: 'success' });
    } else {
      await navigator.clipboard?.writeText(text);
      toast.add({
        title: 'Presse-papiers',
        description: 'Partage système indisponible : le message a été copié.',
        color: 'success',
      });
    }
  } catch (e: any) {
    if (e?.name === 'AbortError') return;
    toast.add({ title: 'Erreur', description: e?.message ?? 'Partage impossible.', color: 'error' });
  } finally {
    loading.value = false;
    pendingAction.value = null;
  }
}

async function copyMessage() {
  loading.value = true;
  pendingAction.value = 'copy';
  try {
    const text = await buildShareMessage();
    if (!text) return;
    await navigator.clipboard?.writeText(text);
    toast.add({
      title: 'Message copié',
      description: 'Collez-le où vous voulez (WhatsApp, SMS, mail…).',
      color: 'success',
    });
  } catch (e: any) {
    toast.add({ title: 'Erreur', description: e?.message ?? 'Copie impossible.', color: 'error' });
  } finally {
    loading.value = false;
    pendingAction.value = null;
  }
}

watch(
  () => props.appointmentId,
  () => {
    cachedMessage.value = null;
    previewCareItems.value = [];
  },
);
</script>

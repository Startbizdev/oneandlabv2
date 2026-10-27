<template>
  <UCard
    v-if="appointmentId"
    id="appointment-conversation"
    class="scroll-mt-28"
    :ui="{ body: 'p-0 sm:p-0' }"
  >
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <div class="flex min-w-0 items-center gap-3">
          <span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300">
            <UIcon name="i-lucide-message-circle" class="size-5" />
          </span>
          <div class="min-w-0">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">{{ title }}</h3>
            <p class="text-xs text-gray-500">Échanges liés à ce rendez-vous</p>
          </div>
        </div>
        <UButton
          size="sm"
          color="neutral"
          variant="ghost"
          icon="i-lucide-refresh-cw"
          :loading="loading"
          aria-label="Actualiser les messages"
          @click="loadMessages"
        />
      </div>
    </template>

    <div
      ref="scrollEl"
      class="flex max-h-[28rem] min-h-56 flex-col gap-3 overflow-y-auto bg-gray-50/70 px-4 py-5 dark:bg-gray-900/40"
    >
      <UAlert v-if="loadError" color="error" variant="subtle" title="Messages indisponibles" :description="loadError" />
      <UAlert v-if="actionError" color="error" variant="subtle" title="Action impossible" :description="actionError" />

      <div
        v-if="!loading && !loadError && messages.length === 0"
        class="m-auto flex max-w-xs flex-col items-center gap-2 py-6 text-center"
      >
        <span class="flex size-11 items-center justify-center rounded-full bg-white text-gray-400 shadow-sm dark:bg-gray-800">
          <UIcon name="i-lucide-messages-square" class="size-5" />
        </span>
        <p class="text-sm font-medium text-gray-700 dark:text-gray-200">Aucun message pour l’instant</p>
        <p v-if="canPost" class="text-xs text-gray-500">Écrivez ci-dessous : la réponse arrivera ici.</p>
      </div>

      <div
        v-for="msg in messages"
        :key="msg.id"
        :id="`conversation-message-${msg.id}`"
        class="flex flex-col"
        :class="isMine(msg) ? 'items-end' : 'items-start'"
      >
        <p v-if="!isMine(msg)" class="mb-1 px-1 text-xs font-medium text-gray-500">{{ msg.author_name || 'Utilisateur' }}</p>
        <div
          class="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm sm:max-w-[70%]"
          :class="[
            isMine(msg)
              ? 'rounded-br-md bg-primary-500 text-primary-950'
              : 'rounded-bl-md border border-gray-200 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100',
            highlightedMessageId === msg.id ? 'ring-2 ring-primary-400 ring-offset-2' : '',
          ]"
        >
          <p v-if="msg.body && msg.body !== '[Pièce jointe]'" class="whitespace-pre-wrap break-words leading-relaxed">{{ msg.body }}</p>
          <ConversationMessageAttachment
            v-if="msg.attachment?.id || msg.medical_document_id"
            :document-id="String(msg.attachment?.id || msg.medical_document_id)"
            :file-name="msg.attachment?.file_name"
            :mime-type="msg.attachment?.mime_type"
          />
        </div>
        <p class="mt-1 px-1 text-[11px] text-gray-400">{{ formatDate(msg.created_at) }}</p>
      </div>
    </div>

    <form
      v-if="canPost"
      class="border-t border-gray-100 p-3 dark:border-gray-800"
      @submit.prevent="sendMessage"
    >
      <div
        v-if="pendingFile"
        class="mb-2 inline-flex max-w-full items-center gap-2 rounded-full bg-gray-100 py-1 pl-3 pr-1 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-200"
      >
        <UIcon name="i-lucide-paperclip" class="size-3.5 shrink-0" />
        <span class="truncate">{{ pendingFile.name }}</span>
        <UButton
          type="button"
          size="xs"
          color="neutral"
          variant="ghost"
          icon="i-lucide-x"
          aria-label="Retirer la pièce jointe"
          @click="clearFile"
        />
      </div>
      <div class="flex items-end gap-2 rounded-2xl border border-gray-200 bg-white p-1.5 transition focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-100 dark:border-gray-700 dark:bg-gray-900 dark:focus-within:ring-primary-900/40">
        <input ref="fileInputRef" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" class="hidden" @change="onFileChange" />
        <UButton
          type="button"
          color="neutral"
          variant="ghost"
          icon="i-lucide-paperclip"
          class="shrink-0 rounded-full"
          aria-label="Joindre une photo ou un PDF"
          @click="fileInputRef?.click()"
        />
        <UTextarea
          v-model="draft"
          :rows="1"
          :maxrows="6"
          autoresize
          variant="none"
          placeholder="Écrire un message…"
          class="min-w-0 flex-1"
          :ui="{ base: 'px-1 py-2 text-sm' }"
          @keydown.enter.exact.prevent="sendMessage"
        />
        <UButton
          type="submit"
          icon="i-lucide-send-horizontal"
          class="shrink-0 rounded-full"
          :loading="sending"
          :disabled="!draft.trim() && !pendingFile"
          aria-label="Envoyer"
        />
      </div>
      <p class="mt-1.5 px-2 text-[11px] text-gray-400">Entrée pour envoyer · Maj + Entrée pour aller à la ligne</p>
    </form>
  </UCard>
</template>

<script setup lang="ts">
import type { AppointmentConversationMessage } from '@oneandlab/shared-types';
import { apiFetch } from '~/utils/api';
import ConversationMessageAttachment from '~/components/dashboard/ConversationMessageAttachment.vue';

const props = withDefaults(defineProps<{ appointmentId: string; title?: string }>(), {
  title: 'Messages',
});
const { user } = useAuth();
const route = useRoute();

const messages = ref<AppointmentConversationMessage[]>([]);
const canPost = ref(false);
const loading = ref(false);
const sending = ref(false);
const draft = ref('');
const pendingFile = ref<File | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const scrollEl = ref<HTMLElement | null>(null);
const loadError = ref('');
const actionError = ref('');

const currentUserId = computed(() => String(user.value?.id ?? ''));
const highlightedMessageId = computed(() =>
  typeof route.query.message === 'string' ? route.query.message.trim() : '',
);

function formatDate(raw?: string) {
  if (!raw) return '';
  try {
    return new Date(raw).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch {
    return raw;
  }
}

async function loadMessages() {
  if (!props.appointmentId) return;
  loading.value = true;
  loadError.value = '';
  try {
    const res = (await apiFetch(`/appointments/${props.appointmentId}/conversation`, { method: 'GET' })) as {
      success?: boolean;
      error?: string;
      data?: { messages?: AppointmentConversationMessage[]; can_post?: boolean };
    };
    if (res?.success === false) {
      throw new Error(res.error || 'Accès refusé à ces échanges.');
    }
    messages.value = res?.data?.messages ?? [];
    canPost.value = Boolean(res?.data?.can_post);
    await nextTick();
    const target = highlightedMessageId.value
      ? document.getElementById(`conversation-message-${highlightedMessageId.value}`)
      : null;
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    else scrollEl.value?.scrollTo({ top: scrollEl.value.scrollHeight, behavior: 'smooth' });
  } catch (error: unknown) {
    loadError.value = error instanceof Error
      ? error.message
      : 'Impossible de charger les échanges. Réessayez.';
  } finally {
    loading.value = false;
  }
}

async function sendMessage() {
  if (!props.appointmentId || sending.value) return;
  if (!draft.value.trim() && !pendingFile.value) return;
  sending.value = true;
  actionError.value = '';
  try {
    let response: { success?: boolean; error?: string } | undefined;
    if (pendingFile.value) {
      const fd = new FormData();
      fd.append('file', pendingFile.value);
      if (draft.value.trim()) fd.append('body', draft.value.trim());
      response = await apiFetch(`/appointments/${props.appointmentId}/conversation`, { method: 'POST', body: fd });
    } else {
      response = await apiFetch(`/appointments/${props.appointmentId}/conversation`, {
        method: 'POST',
        body: { body: draft.value.trim() },
      });
    }
    if (!response?.success) {
      throw new Error(response?.error || 'Le message n’a pas été envoyé.');
    }
    draft.value = '';
    pendingFile.value = null;
    if (fileInputRef.value) fileInputRef.value.value = '';
    await loadMessages();
  } catch (error: unknown) {
    actionError.value = error instanceof Error
      ? error.message
      : 'Le message n’a pas été envoyé.';
  } finally {
    sending.value = false;
  }
}

function isMine(msg: AppointmentConversationMessage) {
  return String(msg.author_id ?? '') === currentUserId.value;
}

function clearFile() {
  pendingFile.value = null;
  if (fileInputRef.value) fileInputRef.value.value = '';
}

function onFileChange(ev: Event) {
  const file = (ev.target as HTMLInputElement).files?.[0] ?? null;
  pendingFile.value = file;
}

onMounted(() => void loadMessages());
watch(() => props.appointmentId, () => void loadMessages());
function scrollConversationIntoView() {
  const el = document.getElementById('appointment-conversation');
  if (!el) return;
  const scroller =
    el.closest('.dashboard-main-scroll') ??
    el.closest('.patient-layout-root') ??
    document.getElementById('workspace-content');
  if (!(scroller instanceof HTMLElement)) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  const headerOffset = 88;
  const top =
    el.getBoundingClientRect().top -
    scroller.getBoundingClientRect().top +
    scroller.scrollTop -
    headerOffset;
  scroller.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
}

watch(
  () => [route.query.conversation, route.query.message] as const,
  async ([conversation]) => {
    if (conversation !== '1') return;
    await nextTick();
    scrollConversationIntoView();
  },
  { immediate: true },
);
</script>

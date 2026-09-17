<template>
  <UCard v-if="appointmentId" id="appointment-conversation" class="scroll-mt-28">
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">{{ title }}</h3>
        <UButton size="xs" variant="ghost" :loading="loading" @click="loadMessages">Actualiser</UButton>
      </div>
    </template>

    <div ref="scrollEl" class="max-h-80 space-y-3 overflow-y-auto pr-1">
      <UAlert
        v-if="loadError"
        color="error"
        variant="subtle"
        title="Messages indisponibles"
        :description="loadError"
      />
      <UAlert
        v-if="actionError"
        color="error"
        variant="subtle"
        title="Action impossible"
        :description="actionError"
      />
      <p v-if="!loading && !loadError && messages.length === 0" class="text-sm text-gray-500">Aucun message pour ce rendez-vous.</p>
      <div
        v-for="msg in messages"
        :key="msg.id"
        :id="`conversation-message-${msg.id}`"
        class="rounded-lg border border-gray-200/80 px-3 py-2 dark:border-gray-800"
        :class="[
          msg.author_id === currentUserId ? 'ms-8 bg-primary-50/60 dark:bg-primary-950/20' : 'me-8',
          highlightedMessageId === msg.id ? 'ring-2 ring-primary-400' : '',
        ]"
      >
        <p class="text-[11px] font-medium text-gray-500">{{ msg.author_name || 'Utilisateur' }}</p>
        <p
          v-if="msg.body && msg.body !== '[Pièce jointe]'"
          class="mt-1 whitespace-pre-wrap text-sm text-gray-900 dark:text-gray-100"
        >
          {{ msg.body }}
        </p>
        <ConversationMessageAttachment
          v-if="msg.attachment?.id || msg.medical_document_id"
          :document-id="String(msg.attachment?.id || msg.medical_document_id)"
          :file-name="msg.attachment?.file_name"
          :mime-type="msg.attachment?.mime_type"
        />
        <p class="mt-1 text-[10px] text-gray-400">{{ formatDate(msg.created_at) }}</p>
      </div>
    </div>

    <form v-if="canPost" class="mt-4 space-y-2 border-t border-gray-100 pt-4 dark:border-gray-800" @submit.prevent="sendMessage">
      <UTextarea v-model="draft" :rows="3" placeholder="Votre message…" class="w-full" />
      <div class="flex flex-wrap items-center gap-2">
        <input ref="fileInputRef" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" class="hidden" @change="onFileChange" />
        <UButton type="button" size="sm" variant="outline" @click="fileInputRef?.click()">Pièce jointe</UButton>
        <span v-if="pendingFile" class="truncate text-xs text-gray-500">{{ pendingFile.name }}</span>
        <UButton type="submit" size="sm" :loading="sending" :disabled="!draft.trim() && !pendingFile">Envoyer</UButton>
      </div>
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

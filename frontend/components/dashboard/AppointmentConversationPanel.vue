<template>
  <UCard v-if="appointmentId">
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Messages</h3>
        <UButton size="xs" variant="ghost" :loading="loading" @click="loadMessages">Actualiser</UButton>
      </div>
    </template>

    <div ref="scrollEl" class="max-h-80 space-y-3 overflow-y-auto pr-1">
      <p v-if="!loading && messages.length === 0" class="text-sm text-gray-500">Aucun message pour ce rendez-vous.</p>
      <div
        v-for="msg in messages"
        :key="msg.id"
        class="rounded-lg border border-gray-200/80 px-3 py-2 dark:border-gray-800"
        :class="msg.author_id === currentUserId ? 'ms-8 bg-primary-50/60 dark:bg-primary-950/20' : 'me-8'"
      >
        <p class="text-[11px] font-medium text-gray-500">{{ msg.author_name || 'Utilisateur' }}</p>
        <p class="mt-1 whitespace-pre-wrap text-sm text-gray-900 dark:text-gray-100">{{ msg.body }}</p>
        <button
          v-if="msg.attachment?.id"
          type="button"
          class="mt-2 text-xs font-medium text-primary-600 underline"
          @click="downloadAttachment(msg.attachment!.id!, msg.attachment?.file_name || undefined)"
        >
          {{ msg.attachment?.file_name || 'Pièce jointe' }}
        </button>
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
import { downloadMedicalDocument } from '~/utils/download-medical-document';

const props = defineProps<{ appointmentId: string }>();
const { user } = useAuth();

const messages = ref<AppointmentConversationMessage[]>([]);
const canPost = ref(false);
const loading = ref(false);
const sending = ref(false);
const draft = ref('');
const pendingFile = ref<File | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const scrollEl = ref<HTMLElement | null>(null);

const currentUserId = computed(() => String(user.value?.id ?? ''));

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
  try {
    const res = (await apiFetch(`/appointments/${props.appointmentId}/conversation`, { method: 'GET' })) as {
      success?: boolean;
      data?: { messages?: AppointmentConversationMessage[]; can_post?: boolean };
    };
    messages.value = res?.data?.messages ?? [];
    canPost.value = Boolean(res?.data?.can_post);
    await nextTick();
    scrollEl.value?.scrollTo({ top: scrollEl.value.scrollHeight, behavior: 'smooth' });
  } finally {
    loading.value = false;
  }
}

async function sendMessage() {
  if (!props.appointmentId || sending.value) return;
  if (!draft.value.trim() && !pendingFile.value) return;
  sending.value = true;
  try {
    if (pendingFile.value) {
      const fd = new FormData();
      fd.append('file', pendingFile.value);
      if (draft.value.trim()) fd.append('body', draft.value.trim());
      await apiFetch(`/appointments/${props.appointmentId}/conversation`, { method: 'POST', body: fd });
    } else {
      await apiFetch(`/appointments/${props.appointmentId}/conversation`, {
        method: 'POST',
        body: { body: draft.value.trim() },
      });
    }
    draft.value = '';
    pendingFile.value = null;
    if (fileInputRef.value) fileInputRef.value.value = '';
    await loadMessages();
  } finally {
    sending.value = false;
  }
}

function onFileChange(ev: Event) {
  const file = (ev.target as HTMLInputElement).files?.[0] ?? null;
  pendingFile.value = file;
}

async function downloadAttachment(docId: string, fileName?: string) {
  await downloadMedicalDocument(docId, fileName);
}

onMounted(() => void loadMessages());
watch(() => props.appointmentId, () => void loadMessages());
</script>

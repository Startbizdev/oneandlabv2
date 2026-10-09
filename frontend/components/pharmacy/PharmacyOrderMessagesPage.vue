<template>
  <AppPageShell max-width="5xl" class="space-y-6">
    <template #pageHeader>
      <AppPageHeader :edge-bleed="false" title="Messages">
        <template #actions>
          <UButton variant="ghost" color="neutral" icon="i-lucide-arrow-left" :to="detailPath">
            Commande
          </UButton>
        </template>
      </AppPageHeader>
    </template>

    <div v-if="loading" class="flex justify-center py-16">
      <UIcon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-primary" />
    </div>

    <div v-else-if="loadError" class="space-y-3">
      <UAlert color="error" variant="soft" title="Messages indisponibles" :description="loadError" />
      <UButton color="neutral" variant="outline" @click="loadMessages">Réessayer</UButton>
    </div>

    <UCard v-else class="ring-1 ring-default/60">
      <UEmpty
        v-if="messages.length === 0"
        icon="i-lucide-message-square"
        title="Aucun message pour le moment"
        variant="naked"
        class="py-6"
      />
      <div v-else class="flex w-full flex-col gap-2">
        <div
          v-for="msg in messages"
          :id="messageAnchor(msg.id)"
          :key="msg.id"
          class="max-w-[85%] scroll-mt-24 rounded-lg border px-3 py-2 text-sm break-words"
          :class="[
            msg.author_id === user?.id ? 'self-end bg-primary/10' : 'self-start',
            msg.id === focusedMessageId ? 'border-primary' : 'border-default/60',
          ]"
        >
          <div class="flex items-center justify-between gap-3 text-xs text-muted">
            <span class="truncate">{{ msg.author_name || 'Utilisateur' }}</span>
            <span class="shrink-0">{{ formatDate(msg.created_at) }}</span>
          </div>
          <p class="mt-1 whitespace-pre-wrap break-words">{{ msg.body }}</p>
        </div>
      </div>

      <template v-if="mode !== 'admin'" #footer>
        <form v-if="canPost" class="flex gap-2" @submit.prevent="sendMessage">
          <UInput v-model="newMessage" placeholder="Votre message…" class="flex-1" />
          <UButton
            type="submit"
            color="primary"
            icon="i-lucide-send"
            aria-label="Envoyer"
            :loading="sendingMessage"
            :disabled="!newMessage.trim()"
          />
        </form>
        <p v-else class="text-sm text-muted">Conversation fermée pour cette commande.</p>
      </template>
    </UCard>
  </AppPageShell>
</template>

<script setup lang="ts">
import type { PharmacyOrderMessage } from '@oneandlab/shared-types';
import { parseAppointmentDateFrance } from '@oneandlab/shared-utils';

const props = defineProps<{
  orderId: string;
  listPath: string;
  /** `admin` : lecture seule. */
  mode: 'requester' | 'receiver' | 'patient' | 'admin';
}>();

const route = useRoute();
const toast = useAppToast();
const { user } = useAuth();
const { fetchMessages, postMessage } = usePharmacyModule();

const loading = ref(true);
const loadError = ref('');
const messages = ref<PharmacyOrderMessage[]>([]);
const canPost = ref(false);
const newMessage = ref('');
const sendingMessage = ref(false);

const detailPath = computed(() => `${props.listPath}/${props.orderId}`);
const focusedMessageId = computed(() => (typeof route.query.message === 'string' ? route.query.message : ''));

function messageAnchor(id: string): string {
  return `pharmacy-message-${id}`;
}

function formatDate(value: string): string {
  const date = parseAppointmentDateFrance(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('fr-FR', {
    timeZone: 'Europe/Paris',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function loadMessages() {
  loading.value = true;
  loadError.value = '';
  try {
    const data = await fetchMessages(props.orderId);
    messages.value = data.messages;
    canPost.value = data.can_post;
  } catch (e: unknown) {
    loadError.value = e instanceof Error && e.message ? e.message : 'Chargement impossible';
  } finally {
    loading.value = false;
  }
}

async function sendMessage() {
  const body = newMessage.value.trim();
  if (!body) return;
  sendingMessage.value = true;
  try {
    const msg = await postMessage(props.orderId, body);
    const authorName = user.value?.first_name ? `${user.value.first_name} ${user.value.last_name ?? ''}`.trim() : 'Moi';
    messages.value = [...messages.value, { ...msg, author_name: authorName }];
    newMessage.value = '';
  } catch (e: unknown) {
    toast.add({
      title: 'Erreur',
      description: e instanceof Error ? e.message : 'Envoi impossible',
      color: 'error',
    });
  } finally {
    sendingMessage.value = false;
  }
}

onMounted(async () => {
  await loadMessages();
  if (!focusedMessageId.value) return;
  await nextTick();
  document.getElementById(messageAnchor(focusedMessageId.value))?.scrollIntoView({ block: 'center' });
});
</script>

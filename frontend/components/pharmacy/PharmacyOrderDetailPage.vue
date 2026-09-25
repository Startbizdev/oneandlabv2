<template>
  <AppPageShell max-width="5xl" class="space-y-6">
    <template #pageHeader>
      <AppPageHeader :edge-bleed="false" :title="pageTitle" :description="pageDescription">
        <template #actions>
          <UButton
            v-if="mode === 'requester'"
            color="primary"
            icon="i-lucide-plus"
            :to="`${listPath}/new`"
          >
            Nouvelle commande
          </UButton>
          <UButton variant="ghost" color="neutral" icon="i-lucide-arrow-left" :to="listPath">
            Retour
          </UButton>
        </template>
      </AppPageHeader>
    </template>

    <div v-if="loading" class="flex justify-center py-16">
      <UIcon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-primary" />
    </div>

    <template v-else-if="order">
      <div class="grid gap-6 lg:grid-cols-3">
        <div class="space-y-6 lg:col-span-2">
          <UCard class="ring-1 ring-default/60">
            <div class="flex flex-wrap items-center gap-2">
              <UBadge :color="statusColor(order.status)" variant="subtle">
                {{ statusLabel(order.status) }}
              </UBadge>
              <span class="text-sm text-muted">{{ fulfillmentLabel(order.fulfillment_mode) }}</span>
            </div>
            <dl class="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt class="text-muted">Patient</dt>
                <dd class="font-medium">
                  <NuxtLink
                    v-if="mode === 'admin' || mode === 'receiver'"
                    :to="profileLink(order.patient_id)"
                    class="text-primary hover:underline"
                  >
                    {{ order.relative_display_name || order.patient_display_name || 'Patient' }}
                  </NuxtLink>
                  <span v-else>{{ order.relative_display_name || order.patient_display_name || 'Patient' }}</span>
                </dd>
              </div>
              <div>
                <dt class="text-muted">Pharmacie</dt>
                <dd class="font-medium">
                  <NuxtLink
                    v-if="mode === 'admin'"
                    :to="profileLink(order.pharmacy_id)"
                    class="text-primary hover:underline"
                  >
                    {{ order.pharmacy_display_name || 'Pharmacie' }}
                  </NuxtLink>
                  <span v-else>{{ order.pharmacy_display_name || 'Pharmacie' }}</span>
                </dd>
              </div>
              <div v-if="order.desired_fulfillment_date">
                <dt class="text-muted">Date souhaitée</dt>
                <dd class="font-medium">{{ formatDesiredDate(order.desired_fulfillment_date) }}</dd>
              </div>
              <div v-if="order.delivery_postal_code">
                <dt class="text-muted">Code postal livraison</dt>
                <dd>{{ order.delivery_postal_code }}</dd>
              </div>
              <div
                v-if="order.delivery_address?.formatted_address || order.delivery_address?.label"
                class="sm:col-span-2"
              >
                <dt class="text-muted">Adresse de livraison</dt>
                <dd>{{ order.delivery_address.formatted_address || order.delivery_address.label }}</dd>
              </div>
              <div v-if="orderedByLabel || showRequesterFiche" class="sm:col-span-2">
                <dt class="text-muted">{{ mode === 'receiver' ? 'Professionnel de santé' : 'Commande passée par' }}</dt>
                <dd class="space-y-1">
                  <NuxtLink
                    v-if="showRequesterFiche"
                    :to="requesterFicheLink"
                    class="font-medium text-primary hover:underline"
                  >
                    {{ orderedByLabel || order.requester_display_name || 'Voir la fiche' }}
                  </NuxtLink>
                  <p v-else class="font-medium text-primary">{{ orderedByLabel }}</p>
                  <p v-if="mode === 'receiver' && order.requester_emploi" class="text-muted">{{ order.requester_emploi }}</p>
                  <p v-if="mode === 'receiver' && order.requester_phone">
                    <a :href="`tel:${order.requester_phone}`" class="text-primary hover:underline">{{ order.requester_phone }}</a>
                  </p>
                  <p v-if="mode === 'receiver' && order.requester_email">
                    <a :href="`mailto:${order.requester_email}`" class="text-primary hover:underline">{{ order.requester_email }}</a>
                  </p>
                  <NuxtLink
                    v-if="showRequesterFiche"
                    :to="requesterFicheLink"
                    class="inline-flex text-sm text-primary hover:underline"
                  >
                    Voir la fiche du professionnel
                  </NuxtLink>
                </dd>
              </div>
              <div v-if="order.requester_comment" class="sm:col-span-2">
                <dt class="text-muted">Commentaire demandeur</dt>
                <dd class="whitespace-pre-wrap">{{ order.requester_comment }}</dd>
              </div>
              <div v-if="order.pharmacy_note" class="sm:col-span-2">
                <dt class="text-muted">Note pharmacie</dt>
                <dd class="whitespace-pre-wrap">{{ order.pharmacy_note }}</dd>
              </div>
              <div v-if="order.rejection_reason" class="sm:col-span-2">
                <dt class="text-muted">Motif de refus</dt>
                <dd class="text-error whitespace-pre-wrap">{{ order.rejection_reason }}</dd>
              </div>
            </dl>
          </UCard>

          <UCard class="ring-1 ring-default/60">
            <template #header>
              <h2 class="text-base font-medium">Ordonnances</h2>
            </template>
            <div v-if="order.prescription_document_ids.length" class="space-y-3">
              <p class="text-sm text-muted">
                {{
                  order.prescription_document_ids.length === 1
                    ? '1 ordonnance jointe à cette commande.'
                    : `${order.prescription_document_ids.length} ordonnances jointes à cette commande.`
                }}
              </p>
              <UButton
                variant="outline"
                icon="i-lucide-file-text"
                :to="`${listPath}/${orderId}/ordonnances`"
              >
                Voir et télécharger les ordonnances
              </UButton>
            </div>
            <p v-else class="text-sm text-muted">Aucune ordonnance jointe.</p>
          </UCard>

          <UCard class="ring-1 ring-default/60">
            <template #header>
              <h2 class="text-base font-medium">Conversation</h2>
            </template>
            <div v-if="messagesLoading" class="flex justify-center py-8">
              <UIcon name="i-lucide-loader-2" class="h-6 w-6 animate-spin text-primary" />
            </div>
            <div v-else class="space-y-3">
              <UEmpty
                v-if="messages.length === 0"
                icon="i-lucide-message-square"
                title="Aucun message"
                :description="mode === 'admin' ? 'Historique des échanges entre les parties.' : 'Échangez avec l\'autre partie si besoin.'"
                variant="naked"
                class="py-6"
              />
              <div class="flex w-full flex-col gap-2">
                <div
                  v-for="msg in messages"
                  :key="msg.id"
                  class="max-w-[85%] rounded-lg border border-default/60 px-3 py-2 text-sm break-words"
                  :class="msg.author_id === user?.id ? 'self-end bg-primary/10' : 'self-start'"
                >
                  <div class="flex items-center justify-between gap-3 text-xs text-muted">
                    <span class="truncate">{{ msg.author_name || 'Utilisateur' }}</span>
                    <span class="shrink-0">{{ formatDate(msg.created_at) }}</span>
                  </div>
                  <p class="mt-1 whitespace-pre-wrap break-words">{{ msg.body }}</p>
                </div>
              </div>
              <form v-if="canPost && mode !== 'admin'" class="flex gap-2 pt-2" @submit.prevent="sendMessage">
                <UInput v-model="newMessage" placeholder="Votre message…" class="flex-1" />
                <UButton type="submit" color="primary" icon="i-lucide-send" :loading="sendingMessage" :disabled="!newMessage.trim()" />
              </form>
            </div>
          </UCard>
        </div>

        <aside class="space-y-6">
          <UCard class="ring-1 ring-default/60">
            <template #header>
              <h2 class="text-base font-medium">Informations</h2>
            </template>
            <dl class="space-y-3 text-sm">
              <div>
                <dt class="text-muted">Créée le</dt>
                <dd class="font-medium">{{ formatDate(order.created_at) }}</dd>
              </div>
              <div>
                <dt class="text-muted">Dernière mise à jour</dt>
                <dd class="font-medium">{{ formatDate(order.updated_at) }}</dd>
              </div>
              <div>
                <dt class="text-muted">Référence</dt>
                <dd class="font-mono text-xs break-all">{{ order.id }}</dd>
              </div>
            </dl>
          </UCard>

          <UCard v-if="mode === 'admin'" class="ring-1 ring-default/60">
            <template #header>
              <h2 class="text-base font-medium">Suivi administration</h2>
            </template>
            <dl class="space-y-3 text-sm">
              <div>
                <dt class="text-muted">Demandeur</dt>
                <dd>
                  <NuxtLink :to="profileLink(order.requester_id)" class="font-medium text-primary hover:underline">
                    {{ requesterRoleLabel(order.requester_role) }}
                  </NuxtLink>
                  <p class="mt-0.5 font-mono text-xs text-muted break-all">{{ order.requester_id }}</p>
                </dd>
              </div>
              <div v-if="order.relative_id">
                <dt class="text-muted">Proche (ID)</dt>
                <dd class="font-mono text-xs break-all">{{ order.relative_id }}</dd>
              </div>
              <div v-if="order.created_by_admin_id">
                <dt class="text-muted">Créée par admin</dt>
                <dd>
                  <NuxtLink :to="profileLink(order.created_by_admin_id)" class="text-primary hover:underline font-mono text-xs break-all">
                    {{ order.created_by_admin_id }}
                  </NuxtLink>
                </dd>
              </div>
            </dl>
          </UCard>
        </aside>
      </div>

      <UCard v-if="showPharmacyActions" class="ring-1 ring-default/60">
        <template #header>
          <h2 class="text-base font-medium">Actions pharmacie</h2>
        </template>
        <div class="flex flex-wrap gap-2">
          <UButton color="success" icon="i-lucide-check" :loading="actionLoading" @click="accept">
            Accepter
          </UButton>
          <UButton color="error" variant="outline" icon="i-lucide-x" @click="() => { showRefuseModal = true }">
            Refuser
          </UButton>
          <UButton
            v-if="order.status === 'acceptee'"
            color="primary"
            variant="outline"
            icon="i-lucide-truck"
            :loading="actionLoading"
            @click="setStatus('en_cours')"
          >
            Marquer en cours
          </UButton>
          <UButton
            v-if="order.status === 'en_cours'"
            color="primary"
            icon="i-lucide-check-circle"
            :loading="actionLoading"
            @click="setStatus('terminee')"
          >
            Terminer
          </UButton>
        </div>
      </UCard>

      <UCard v-if="mode === 'requester' || canCancelOrder" class="ring-1 ring-default/60">
        <template #header>
          <h2 class="text-base font-medium">Actions</h2>
        </template>
        <div class="flex flex-wrap gap-2">
          <UButton v-if="mode === 'requester'" color="primary" icon="i-lucide-plus" :to="`${listPath}/new`">
            Nouvelle commande
          </UButton>
          <UButton
            v-if="canCancelOrder"
            color="error"
            variant="outline"
            icon="i-lucide-ban"
            :loading="actionLoading"
            @click="cancelOrder"
          >
            Annuler la commande
          </UButton>
        </div>
      </UCard>

    </template>

    <ClientOnly>
      <Teleport to="body">
        <div
          v-if="showRefuseModal"
          class="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div class="absolute inset-0 bg-black/50" @click="() => { showRefuseModal = false }" />
          <div class="relative z-10 w-full max-w-md rounded-xl border border-default bg-default p-5 shadow-xl">
            <h3 class="text-lg font-medium">Refuser la commande</h3>
            <UFormField label="Motif de refus" name="reason" class="mt-4">
              <UTextarea v-model="refusalReason" :rows="3" placeholder="Obligatoire…" />
            </UFormField>
            <div class="mt-4 flex justify-end gap-2">
              <UButton variant="ghost" color="neutral" @click="() => { showRefuseModal = false }">Annuler</UButton>
              <UButton color="error" :loading="actionLoading" @click="refuse">Confirmer</UButton>
            </div>
          </div>
        </div>
      </Teleport>
    </ClientOnly>
  </AppPageShell>
</template>

<script setup lang="ts">
import type { PharmacyOrder, PharmacyOrderMessage, PharmacyOrderStatus } from '@oneandlab/shared-types';
import { PHARMACY_FULFILLMENT_LABELS, PHARMACY_ORDER_STATUS_LABELS } from '@oneandlab/shared-constants';
import { parseAppointmentDateFrance } from '@oneandlab/shared-utils';
import { downloadMedicalDocument } from '~/utils/download-medical-document';

const props = defineProps<{
  orderId: string;
  listPath: string;
  mode: 'requester' | 'receiver' | 'patient' | 'admin';
  pageTitle?: string;
  pageDescription?: string;
}>();

const toast = useAppToast();
const { user } = useAuth();
const { fetchOrder, updateOrderStatus, fetchMessages, postMessage } = usePharmacyModule();

const loading = ref(true);
const order = ref<PharmacyOrder | null>(null);
const actionLoading = ref(false);

const messages = ref<PharmacyOrderMessage[]>([]);
const messagesLoading = ref(false);
const canPost = ref(false);
const newMessage = ref('');
const sendingMessage = ref(false);

const showRefuseModal = ref(false);
const refusalReason = ref('');

const pageTitle = computed(() => props.pageTitle ?? 'Détail commande');
const pageDescription = computed(() => {
  if (props.pageDescription) return props.pageDescription;
  return order.value ? `Statut : ${statusLabel(order.value.status)}` : '';
});

function profileLink(userId: string): string {
  return `/profile?userId=${encodeURIComponent(userId)}`;
}

function requesterRoleLabel(role: string): string {
  const map: Record<string, string> = {
    nurse: 'Infirmier·ère',
    pro: 'Professionnel de santé',
    super_admin: 'Administration',
  };
  return map[role] ?? role;
}

const showPharmacyActions = computed(() => {
  if (props.mode !== 'receiver' || !order.value) return false;
  return ['en_attente', 'acceptee', 'en_cours', 'complement_demande'].includes(order.value.status);
});

const orderedByLabel = computed(() => {
  const current = order.value;
  if (!current) return null;
  const name = current.requester_display_name?.trim();
  if (!name || current.requester_id === user.value?.id) return null;
  if (current.requester_id === current.patient_id) return null;
  if (props.mode === 'receiver') {
    if (current.requester_role === 'nurse') return `Infirmier · ${name}`;
    if (current.requester_emploi?.trim()) return `${current.requester_emploi.trim()} · ${name}`;
    if (current.requester_role === 'pro') return `Professionnel de santé · ${name}`;
    return name;
  }
  if (current.requester_role === 'nurse') return `Votre infirmier · ${name}`;
  if (current.requester_role === 'pro') return `Votre professionnel · ${name}`;
  return name;
});

const showRequesterFiche = computed(() => {
  const current = order.value;
  if (!current) return false;
  if (current.requester_id === user.value?.id) return false;
  if (current.requester_id === current.patient_id) return false;
  if (current.requester_id === current.pharmacy_id) return false;
  return current.requester_role === 'nurse' || current.requester_role === 'pro';
});

const requesterFicheLink = computed(() => {
  const current = order.value;
  if (!current) return '/profile';
  const slug = current.requester_public_slug?.trim();
  if (slug && current.requester_role === 'nurse') return `/infirmier/${encodeURIComponent(slug)}`;
  if (slug && current.requester_role === 'pro') return `/professionnel/${encodeURIComponent(slug)}`;
  return profileLink(current.requester_id);
});

const canCancelOrder = computed(() => {
  const current = order.value;
  const uid = user.value?.id;
  if (!current || !uid) return false;
  if (['terminee', 'refusee', 'annulee'].includes(current.status)) return false;
  return (
    uid === current.requester_id
    || uid === current.patient_id
    || uid === current.pharmacy_id
    || user.value?.role === 'super_admin'
  );
});

function statusLabel(status: PharmacyOrderStatus): string {
  return PHARMACY_ORDER_STATUS_LABELS[status] ?? status;
}

function fulfillmentLabel(mode: string): string {
  return PHARMACY_FULFILLMENT_LABELS[mode as keyof typeof PHARMACY_FULFILLMENT_LABELS] ?? mode;
}

function statusColor(status: PharmacyOrderStatus): 'warning' | 'success' | 'info' | 'error' | 'neutral' {
  const map: Record<PharmacyOrderStatus, 'warning' | 'success' | 'info' | 'error' | 'neutral'> = {
    en_attente: 'warning',
    acceptee: 'success',
    en_cours: 'info',
    terminee: 'success',
    refusee: 'error',
    complement_demande: 'warning',
    annulee: 'neutral',
  };
  return map[status] ?? 'neutral';
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

function formatDesiredDate(value: string): string {
  return new Date(`${value}T12:00:00`).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

async function openPrescription(documentId: string, index: number) {
  try {
    await downloadMedicalDocument(documentId, `ordonnance-${index + 1}`);
  } catch (e: unknown) {
    toast.add({
      title: 'Ordonnance indisponible',
      description: e instanceof Error ? e.message : 'Téléchargement impossible',
      color: 'error',
    });
  }
}

async function loadOrder() {
  loading.value = true;
  try {
    order.value = await fetchOrder(props.orderId);
  } catch (e: unknown) {
    toast.add({
      title: 'Erreur',
      description: e instanceof Error ? e.message : 'Commande introuvable',
      color: 'error',
    });
  } finally {
    loading.value = false;
  }
}

async function loadMessages() {
  messagesLoading.value = true;
  try {
    const data = await fetchMessages(props.orderId);
    messages.value = data.messages;
    canPost.value = data.can_post;
  } catch {
    messages.value = [];
    canPost.value = false;
  } finally {
    messagesLoading.value = false;
  }
}

async function setStatus(status: PharmacyOrderStatus, patch: { rejection_reason?: string } = {}) {
  actionLoading.value = true;
  try {
    order.value = await updateOrderStatus(props.orderId, status, patch);
    toast.add({ title: 'Statut mis à jour', color: 'success' });
    await loadMessages();
  } catch (e: unknown) {
    toast.add({
      title: 'Erreur',
      description: e instanceof Error ? e.message : 'Action impossible',
      color: 'error',
    });
  } finally {
    actionLoading.value = false;
  }
}

async function accept() {
  await setStatus('acceptee');
}

async function refuse() {
  if (!refusalReason.value.trim()) {
    toast.add({ title: 'Motif requis', color: 'warning' });
    return;
  }
  showRefuseModal.value = false;
  await setStatus('refusee', { rejection_reason: refusalReason.value.trim() });
  refusalReason.value = '';
}

async function cancelOrder() {
  await setStatus('annulee');
}

async function sendMessage() {
  const body = newMessage.value.trim();
  if (!body) return;
  sendingMessage.value = true;
  try {
    const msg = await postMessage(props.orderId, body);
    messages.value = [...messages.value, { ...msg, author_name: user.value?.first_name ? `${user.value.first_name} ${user.value.last_name ?? ''}`.trim() : 'Moi' }];
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
  await loadOrder();
  await loadMessages();
});
</script>

<template>
  <ClientOnly>
    <Teleport to="body">
      <UModal v-model:open="isOpen" :ui="{ content: 'max-w-lg w-full' }">
        <template #content="{ close: closeSlot }">
          <UCard class="w-full border-0">
            <template #header>
              <DialogTitle class="sr-only">Annuler le rendez-vous</DialogTitle>
              <DialogDescription class="sr-only">
                Renseignez la raison et le commentaire obligatoires (min. 10 caractères).
              </DialogDescription>
              <div class="flex items-start justify-between gap-4">
                <h2 class="text-lg font-normal text-foreground">Annuler le rendez-vous</h2>
                <UButton variant="ghost" color="neutral" icon="i-lucide-x" size="sm" aria-label="Fermer" @click="closeSlot()" />
              </div>
            </template>
            <div class="space-y-4">
              <UFormField label="Raison d'annulation" required>
                <USelect
                  v-model="reason"
                  :items="CANCELLATION_REASON_OPTIONS"
                  value-key="value"
                  placeholder="Choisir une raison"
                  size="md"
                  class="w-full"
                />
              </UFormField>
              <UFormField label="Précisez la situation (obligatoire, min. 10 caractères)" required>
                <UTextarea
                  v-model="comment"
                  :rows="3"
                  placeholder="Décrivez brièvement la situation..."
                  :maxlength="500"
                  class="w-full"
                />
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ comment.length }} / 500</p>
              </UFormField>
              <div v-if="showPhotoUpload" class="space-y-2">
                <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Photo (optionnelle)</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">Vous pouvez joindre une photo du lieu ou de l'accès si pertinent.</p>
                <input
                  ref="fileInputRef"
                  type="file"
                  accept="image/*,.pdf"
                  class="hidden"
                  @change="onFileChange"
                >
                <UButton
                  type="button"
                  variant="outline"
                  size="sm"
                  leading-icon="i-lucide-camera"
                  @click="fileInputRef?.click()"
                >
                  {{ photoFile ? photoFile.name : 'Choisir une photo' }}
                </UButton>
                <UButton
                  v-if="photoFile"
                  type="button"
                  variant="ghost"
                  size="xs"
                  color="error"
                  @click="photoFile = null"
                >
                  Retirer
                </UButton>
              </div>
            </div>
            <template #footer>
              <div class="flex justify-end gap-2">
                <UButton type="button" variant="ghost" color="neutral" @click="closeSlot()">Retour</UButton>
                <UButton
                  type="button"
                  color="error"
                  :loading="loading"
                  :disabled="!canSubmit"
                  @click="handleConfirm"
                >
                  Confirmer l'annulation
                </UButton>
              </div>
            </template>
          </UCard>
        </template>
      </UModal>
    </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
import { DialogTitle, DialogDescription } from 'reka-ui';
import { CANCELLATION_REASON_OPTIONS, CANCELLATION_REASONS_WITH_PHOTO } from '~/config/cancellation-reasons';

const props = withDefaults(
  defineProps<{
    open: boolean;
    loading?: boolean;
    onConfirm?: (payload: { reason: string; comment: string; photoFile: File | null }) => void;
  }>(),
  { onConfirm: undefined }
);

const emit = defineEmits<{
  'update:open': [value: boolean];
  confirm: [payload: { reason: string; comment: string; photoFile: File | null }];
}>();

const isOpen = computed({
  get: () => props.open,
  set: (v) => emit('update:open', v),
});

const reason = ref('');
const comment = ref('');
const photoFile = ref<File | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

const showPhotoUpload = computed(() =>
  reason.value && CANCELLATION_REASONS_WITH_PHOTO.includes(reason.value),
);

const canSubmit = computed(() => {
  if (!reason.value || !comment.value.trim()) return false;
  return comment.value.trim().length >= 10;
});

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  if (input.files?.length) {
    photoFile.value = input.files[0];
  }
}

function handleConfirm() {
  console.log('[CancelAppointmentModal] handleConfirm called', { canSubmit: canSubmit.value, reason: reason.value, commentLen: comment.value?.length });
  if (!canSubmit.value) {
    console.log('[CancelAppointmentModal] handleConfirm early return: canSubmit false');
    return;
  }
  const payload = {
    reason: reason.value,
    comment: comment.value.trim(),
    photoFile: photoFile.value,
  };
  console.log('[CancelAppointmentModal] emit confirm + onConfirm', payload);
  emit('confirm', payload);
  props.onConfirm?.(payload);
}

watch(() => props.open, (open) => {
  if (!open) {
    reason.value = '';
    comment.value = '';
    photoFile.value = null;
  }
});
</script>

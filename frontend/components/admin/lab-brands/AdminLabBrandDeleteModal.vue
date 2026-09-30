<template>
  <UModal v-model:open="open">
    <template #content>
      <UCard v-if="brand">
        <template #header>
          <h3 class="text-lg font-medium">Supprimer « {{ brand.name }} » ?</h3>
        </template>
        <div class="space-y-3 text-sm">
          <p v-if="appointmentCount > 0">
            {{ appointmentCount === 1 ? '1 rendez-vous a choisi ce réseau : il perdra' : `${appointmentCount} rendez-vous ont choisi ce réseau : ils perdront` }}
            cette information.
          </p>
          <p>Les rattachements aux comptes labo seront supprimés. Cette action est irréversible.</p>
          <p v-if="brand.is_active" class="text-muted">Pour ne plus proposer ce réseau aux patients sans rien perdre, masquez-le plutôt.</p>
          <UAlert v-if="error" color="error" variant="soft" :title="error" />
        </div>
        <template #footer>
          <div class="flex flex-wrap justify-end gap-2">
            <UButton variant="outline" color="neutral" @click="close">Annuler</UButton>
            <UButton v-if="brand.is_active" variant="soft" color="neutral" :disabled="deleting" @click="emit('hide', brand)">Masquer plutôt</UButton>
            <UButton color="error" :loading="deleting" @click="confirmDelete">Supprimer</UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { LabBrandAdmin } from '@oneandlab/shared-types';
import { apiFetch } from '~/utils/api';

const props = defineProps<{ brand: LabBrandAdmin | null }>();
const emit = defineEmits<{ deleted: []; hide: [brand: LabBrandAdmin] }>();
const open = defineModel<boolean>('open', { required: true });

const deleting = ref(false);
const error = ref('');
const appointmentCount = computed(() => props.brand?.appointment_count ?? 0);

watch(open, isOpen => {
  if (isOpen) error.value = '';
});

function close() {
  open.value = false;
}

async function confirmDelete() {
  if (!props.brand || deleting.value) return;
  deleting.value = true;
  error.value = '';
  try {
    const res = (await apiFetch(`/admin/lab-brands/${props.brand.id}`, { method: 'DELETE' })) as { success?: boolean; error?: string };
    if (!res?.success) throw new Error(res?.error || 'Suppression impossible. La marque est conservée.');
    open.value = false;
    emit('deleted');
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Suppression impossible. La marque est conservée.';
  } finally {
    deleting.value = false;
  }
}
</script>

<template>
  <UCard v-if="items.length" class="ring-1 ring-default/60">
    <template #header>
      <div>
        <h2 class="font-medium">Mes donneurs de soins</h2>
        <p class="text-sm text-muted">Origines enregistrées après une prise de rendez-vous via QR.</p>
      </div>
    </template>
    <div class="space-y-3">
      <div v-for="item in items" :key="item.id" class="flex items-center justify-between gap-4">
        <div>
          <p class="font-medium">{{ item.display_name }}</p>
          <p class="text-sm text-muted">{{ item.emploi || 'Professionnel de santé' }}</p>
        </div>
        <USwitch
          :model-value="!item.hidden_by_patient"
          aria-label="Afficher comme donneur de soins"
          @update:model-value="(visible) => updateVisibility(item, visible)"
        />
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { apiFetch } from '~/utils/api';

type CareOrigin = {
  id: string;
  display_name: string;
  emploi?: string | null;
  hidden_by_patient: boolean;
};

const items = ref<CareOrigin[]>([]);
const toast = useAppToast();

async function load() {
  const response = await apiFetch('/patient/professional-access', { method: 'GET' }) as {
    success?: boolean;
    data?: CareOrigin[];
  };
  items.value = response.data ?? [];
}

async function updateVisibility(item: CareOrigin, visible: boolean) {
  const previous = item.hidden_by_patient;
  item.hidden_by_patient = !visible;
  try {
    await apiFetch('/patient/professional-access', {
      method: 'PATCH',
      body: { id: item.id, hidden: !visible },
    });
  } catch (error) {
    item.hidden_by_patient = previous;
    toast.add({
      title: 'Modification impossible',
      description: error instanceof Error ? error.message : undefined,
      color: 'error',
    });
  }
}

onMounted(() => void load());
</script>

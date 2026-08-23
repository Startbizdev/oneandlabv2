<template>
  <div class="space-y-4 w-full">
    <UFormField :label="label" :name="name" :required="required" class="w-full">
      <USelectMenu
        v-model="selectValue"
        :items="proEmploiItems"
        value-key="value"
        :placeholder="placeholder"
        size="xl"
        class="w-full"
        searchable
        by="value"
      >
        <template #label>
          <span v-if="selectValue">{{ selectLabel }}</span>
          <span v-else class="text-gray-400">{{ placeholder }}</span>
        </template>
      </USelectMenu>
    </UFormField>

    <UFormField
      v-if="selectValue === PRO_EMPLOI_OTHER"
      :label="customLabel"
      :name="`${name}_custom`"
      :required="required"
      class="w-full"
    >
      <UInput
        v-model="customValue"
        :placeholder="customPlaceholder"
        size="xl"
        class="w-full"
        maxlength="120"
      />
    </UFormField>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  PRO_EMPLOI_OTHER,
  PRO_SANTE_EMPLOIS,
  proEmploiCustomValue,
  proEmploiSelectValue,
  resolveProEmploiForSave,
} from '~/constants/proEmploi';

const model = defineModel<string>({ default: '' });

withDefaults(
  defineProps<{
    label?: string;
    name?: string;
    required?: boolean;
    placeholder?: string;
    customLabel?: string;
    customPlaceholder?: string;
  }>(),
  {
    label: 'Profession (emploi)',
    name: 'emploi',
    required: false,
    placeholder: 'Rechercher votre profession…',
    customLabel: 'Précisez votre profession',
    customPlaceholder: 'Ex. : Podologue, Orthophoniste…',
  },
);

const proEmploiItems = [...PRO_SANTE_EMPLOIS];
const selectValue = ref('');
const customValue = ref('');
const syncing = ref(false);

watch(
  () => model.value,
  (stored) => {
    syncing.value = true;
    selectValue.value = proEmploiSelectValue(stored);
    customValue.value = proEmploiCustomValue(stored);
    syncing.value = false;
  },
  { immediate: true },
);

watch([selectValue, customValue], () => {
  if (syncing.value) return;
  const next = resolveProEmploiForSave(selectValue.value, customValue.value);
  if (next !== model.value) {
    model.value = next;
  }
});

const selectLabel = computed(() => {
  if (selectValue.value === PRO_EMPLOI_OTHER && customValue.value.trim()) {
    return customValue.value.trim();
  }
  return selectValue.value;
});
</script>

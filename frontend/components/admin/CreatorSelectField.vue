<template>
  <UFormField :label="label" :name="name">
    <USelectMenu
      v-model="selectedValue"
      :items="selectItems"
      value-key="value"
      :loading="loading"
      placeholder="Moi (administration Cary)"
      class="w-full min-w-0"
      clearable
      :filter-fields="['label', 'description', 'searchText', 'group']"
      :search-input="{ placeholder: 'Rechercher un pro ou infirmier…' }"
    >
      <template #label>
        <span v-if="!selectedValue" class="text-muted">{{ emptyLabel }}</span>
        <span v-else>{{ selectedLabel }}</span>
      </template>
      <template #item-label="{ item }">
        <div class="min-w-0 py-0.5">
          <p class="truncate font-medium">{{ item.label }}</p>
          <p v-if="item.description" class="truncate text-xs text-muted">{{ item.description }}</p>
        </div>
      </template>
    </USelectMenu>
    <p v-if="help" class="mt-1.5 text-xs text-muted leading-relaxed">{{ help }}</p>
  </UFormField>
</template>

<script setup lang="ts">
import { fetchAllUsers, sortUsersByLabel, userDisplayLabel } from '~/utils/fetch-all-users';

const props = withDefaults(
  defineProps<{
    modelValue?: string | null;
    label?: string;
    name?: string;
    help?: string;
    emptyLabel?: string;
  }>(),
  {
    modelValue: null,
    label: 'Créateur du rendez-vous',
    name: 'on_behalf_of_user_id',
    help: 'Optionnel — le pro ou l\'infirmier sélectionné apparaîtra comme créateur du RDV (audit HDS).',
    emptyLabel: 'Moi (administration Cary)',
  },
);

const emit = defineEmits<{ 'update:modelValue': [value: string | null] }>();

const loading = ref(false);
const users = ref<any[]>([]);

const selectedValue = computed({
  get: () => props.modelValue ?? undefined,
  set: (v: string | undefined) => emit('update:modelValue', v?.trim() ? v : null),
});

const roleLabel: Record<string, string> = {
  pro: 'Professionnel',
  nurse: 'Infirmier(ère)',
};

function userCity(u: Record<string, unknown>): string {
  const addr = u.address as { label?: string } | string | null | undefined;
  if (!addr) return '';
  if (typeof addr === 'string') return addr.split(',')[0]?.trim() ?? '';
  return String(addr.label ?? '').split(',')[0]?.trim() ?? '';
}

const selectItems = computed(() =>
  users.value.map((u) => {
    const role = String(u.role ?? '');
    const city = userCity(u);
    const emploi = u.emploi ? String(u.emploi).trim() : '';
    const descParts = [roleLabel[role] ?? role, emploi, city].filter(Boolean);
    const label = userDisplayLabel(u);
    return {
      value: String(u.id),
      label,
      description: descParts.join(' · '),
      group: roleLabel[role] ?? role,
      searchText: [label, u.email, emploi, city].filter(Boolean).join(' '),
    };
  }),
);

const selectedLabel = computed(() => {
  const hit = selectItems.value.find((i) => i.value === selectedValue.value);
  return hit?.label ?? props.emptyLabel;
});

onMounted(async () => {
  loading.value = true;
  try {
    const [pros, nurses] = await Promise.all([
      fetchAllUsers({ role: 'pro', status: 'active' }),
      fetchAllUsers({ role: 'nurse', status: 'active' }),
    ]);
    users.value = sortUsersByLabel([...pros, ...nurses]);
  } finally {
    loading.value = false;
  }
});
</script>

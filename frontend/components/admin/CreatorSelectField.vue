<template>
  <UFormField :label="label" :name="name">
    <USelectMenu
      v-model="selectedValue"
      v-model:search-term="staffSearchTerm"
      :items="selectItems"
      value-key="value"
      :loading="loading"
      placeholder="Moi (administration Cary)"
      class="w-full min-w-0"
      clearable
      :filter-fields="['label', 'description', 'searchText', 'group']"
      :search-input="{ placeholder: 'Tapez au moins 2 caractères (nom, email…)' }"
    >
      <template #default>
        <span v-if="!selectedValue" class="text-muted">{{ emptyLabel }}</span>
        <span v-else>{{ selectedLabel }}</span>
      </template>
      <template #item-label="{ item }">
        <div class="min-w-0 py-0.5">
          <p class="truncate font-medium">{{ item.label }}</p>
          <p v-if="item.description" class="truncate text-xs text-muted">{{ item.description }}</p>
        </div>
      </template>
      <template #empty="{ searchTerm }">
        <div class="px-3 py-4 text-center text-sm text-muted">
          <p v-if="(searchTerm ?? staffSearchTerm).trim().length < 2">
            Saisissez au moins 2 caractères pour rechercher un professionnel.
          </p>
          <p v-else-if="loadError">{{ loadError }}</p>
          <p v-else>Aucun professionnel actif ne correspond.</p>
        </div>
      </template>
    </USelectMenu>
    <div v-if="loadError" role="alert" class="mt-2 space-y-2">
      <p class="text-sm text-error">{{ loadError }}</p>
      <UButton color="neutral" variant="outline" size="sm" :loading="loading" @click="runStaffSearch(staffSearchTerm)">
        Réessayer
      </UButton>
    </div>
    <p v-if="help" class="mt-1.5 text-xs text-muted leading-relaxed">{{ help }}</p>
  </UFormField>
</template>

<script setup lang="ts">
import { apiFetch } from '~/utils/api';
import {
  searchStaffCreatorsPicker,
  sortUsersByLabel,
  userDisplayLabel,
} from '~/utils/fetch-all-users';

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
    help: 'Le professionnel choisi apparaîtra comme créateur du rendez-vous et aura accès au dossier patient.',
    emptyLabel: 'Moi (administration Cary)',
  },
);

const emit = defineEmits<{ 'update:modelValue': [value: string | null] }>();

const loading = ref(false);
const loadError = ref('');
const users = ref<any[]>([]);
const staffSearchTerm = ref('');
const selectedUserCache = ref<any | null>(null);
let searchTimer: ReturnType<typeof setTimeout> | null = null;

const selectedValue = computed({
  get: () => props.modelValue ?? undefined,
  set: (v: string | undefined) => emit('update:modelValue', v?.trim() ? v : null),
});

const roleLabel: Record<string, string> = {
  pro: 'Professionnel',
  nurse: 'Infirmier(ère)',
  lab: 'Laboratoire',
  subaccount: 'Sous-compte labo',
};

function userCity(u: Record<string, unknown>): string {
  const addr = u.address as { label?: string } | string | null | undefined;
  if (!addr) return '';
  if (typeof addr === 'string') return addr.split(',')[0]?.trim() ?? '';
  return String(addr.label ?? '').split(',')[0]?.trim() ?? '';
}

const selectItems = computed(() => {
  const merged = [...users.value];
  const selId = selectedValue.value;
  if (selId && selectedUserCache.value && String(selectedUserCache.value.id) === String(selId)) {
    if (!merged.some((u) => String(u.id) === String(selId))) {
      merged.push(selectedUserCache.value);
    }
  }
  return sortUsersByLabel(merged).map((u) => {
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
  });
});

const selectedLabel = computed(() => {
  const hit = selectItems.value.find((i) => i.value === selectedValue.value);
  return hit?.label ?? (selectedValue.value ? 'Professionnel sélectionné' : props.emptyLabel);
});

async function runStaffSearch(term: string) {
  const q = term.trim();
  if (q.length < 2) {
    users.value = [];
    loadError.value = '';
    return;
  }
  if (loading.value) return;
  loading.value = true;
  loadError.value = '';
  try {
    users.value = await searchStaffCreatorsPicker(q, 25);
  } catch {
    users.value = [];
    loadError.value = 'Impossible de charger les professionnels. Votre sélection est conservée.';
  } finally {
    loading.value = false;
  }
}

watch(staffSearchTerm, (term) => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    void runStaffSearch(term);
  }, 280);
});

async function ensureSelectedUserLoaded() {
  const id = selectedValue.value;
  if (!id || selectedUserCache.value?.id === id) return;
  try {
    const res = await apiFetch(`/users/${encodeURIComponent(id)}`, { method: 'GET' });
    if (res?.success && res.data) {
      selectedUserCache.value = res.data;
    }
  } catch {
    // label de repli dans selectedLabel
  }
}

watch(selectedValue, () => {
  void ensureSelectedUserLoaded();
});

onMounted(() => {
  void ensureSelectedUserLoaded();
});

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer);
});
</script>

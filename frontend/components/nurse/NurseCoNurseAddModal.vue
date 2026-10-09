<template>
  <UModal
    :open="open"
    title="Ajouter un confrère"
    :dismissible="!saving"
    @update:open="(value: boolean) => { if (!value && !saving) close() }"
  >
    <template #body>
      <div v-if="selected" class="space-y-4">
        <div class="flex items-center gap-3">
          <UAvatar :alt="nursePickerDisplayName(selected)" size="md" />
          <div class="min-w-0 flex-1">
            <p class="truncate font-medium">{{ nursePickerDisplayName(selected) }}</p>
            <p class="text-sm text-muted">Il sera prévenu et pourra gérer les passages.</p>
          </div>
          <UButton color="neutral" variant="ghost" size="sm" :disabled="saving" @click="() => { selected = null }">
            Changer
          </UButton>
        </div>

        <div
          v-if="scopes.length > 1"
          role="radiogroup"
          aria-label="Portée"
          class="grid gap-2"
          :style="{ gridTemplateColumns: `repeat(${scopes.length}, minmax(0, 1fr))` }"
        >
          <UButton
            v-for="id in scopes"
            :key="id"
            role="radio"
            :aria-checked="scope === id"
            block
            :color="scope === id ? 'primary' : 'neutral'"
            :variant="scope === id ? 'solid' : 'outline'"
            @click="() => { scopeChoice = id }"
          >
            {{ NURSE_COLLABORATION_SCOPE_LABELS[id] }}
          </UButton>
        </div>

        <div v-if="scope === 'range'" class="grid gap-3 sm:grid-cols-2">
          <UFormField label="Du">
            <UInput v-model="startDate" type="date" :min="today" class="w-full" />
          </UFormField>
          <UFormField label="Au">
            <UInput v-model="endDate" type="date" :min="startDate" :max="maxEndDate" class="w-full" />
          </UFormField>
        </div>
      </div>

      <div v-else class="space-y-3">
        <UInput
          v-model="search"
          icon="i-lucide-search"
          placeholder="Nom ou e-mail du confrère"
          autocomplete="off"
          class="w-full"
        />
        <div v-if="searching" class="flex justify-center py-6">
          <UIcon name="i-lucide-loader-2" class="h-6 w-6 animate-spin text-primary-500" />
        </div>
        <UAlert v-else-if="searchError" color="error" variant="soft" :title="searchError" />
        <p v-else-if="searched && results.length === 0" class="py-6 text-center text-sm text-muted">
          Aucun infirmier
        </p>
        <ul v-else class="divide-y divide-gray-100 dark:divide-gray-800">
          <li v-for="user in results" :key="user.id">
            <button
              type="button"
              class="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/60"
              @click="selected = user"
            >
              <UAvatar :alt="nursePickerDisplayName(user)" size="sm" />
              <span class="min-w-0 flex-1">
                <span class="block truncate font-medium">{{ nursePickerDisplayName(user) }}</span>
                <span v-if="user.email" class="block truncate text-xs text-muted">{{ user.email }}</span>
              </span>
            </button>
          </li>
        </ul>
      </div>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-3">
        <UButton color="neutral" variant="outline" :disabled="saving" @click="close">Annuler</UButton>
        <UButton :loading="saving" :disabled="!selected" @click="submit">Ajouter</UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { NurseCollaboration, NurseCollaborationScope } from '@oneandlab/shared-types';
import {
  NURSE_COLLABORATION_RANGE_MAX_DAYS,
  NURSE_COLLABORATION_SCOPE_LABELS,
  buildNurseCollaborationBody,
  nurseCollaborationScopeOptions,
  nursePickerDisplayName,
  type NursePickerUser,
} from '@oneandlab/shared-utils';

const MIN_SEARCH_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 300;

const props = withDefaults(
  defineProps<{
    open: boolean;
    appointmentId?: string | null;
    passageSeriesId?: string | null;
    /** `false` depuis une fiche RDV / passage ; la tournée propose la période. */
    allowRange?: boolean;
    /** Premier jour proposé pour une période (`YYYY-MM-DD`). */
    defaultDate?: string;
    excludeIds?: string[];
  }>(),
  { appointmentId: null, passageSeriesId: null, allowRange: true, defaultDate: undefined, excludeIds: () => [] },
);

const emit = defineEmits<{
  close: [];
  added: [item: NurseCollaboration];
}>();

const { saving, create, searchNurses } = useNurseCollaborations();
const toast = useAppToast();

function isoDay(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const today = isoDay(new Date());
const firstDay = computed(() => (props.defaultDate && props.defaultDate > today ? props.defaultDate : today));

const search = ref('');
const selected = ref<NursePickerUser | null>(null);
const scopeChoice = ref<NurseCollaborationScope | null>(null);
const startDate = ref(firstDay.value);
const endDate = ref(firstDay.value);
const results = ref<NursePickerUser[]>([]);
const searching = ref(false);
const searched = ref(false);
const searchError = ref('');

const scopes = computed(() =>
  nurseCollaborationScopeOptions({
    appointmentId: props.appointmentId,
    passageSeriesId: props.passageSeriesId,
    allowRange: props.allowRange,
  }),
);
const scope = computed(() =>
  scopeChoice.value && scopes.value.includes(scopeChoice.value) ? scopeChoice.value : scopes.value[0],
);
const maxEndDate = computed(() => {
  const start = new Date(`${startDate.value}T12:00:00`);
  if (Number.isNaN(start.getTime())) return undefined;
  start.setDate(start.getDate() + NURSE_COLLABORATION_RANGE_MAX_DAYS - 1);
  return isoDay(start);
});

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    startDate.value = firstDay.value;
    endDate.value = firstDay.value;
  },
);

watch(startDate, (start) => {
  if (endDate.value < start) endDate.value = start;
});

let searchTimer: ReturnType<typeof setTimeout> | null = null;
watch(search, (value) => {
  if (searchTimer) clearTimeout(searchTimer);
  const term = value.trim();
  if (term.length < MIN_SEARCH_LENGTH) {
    results.value = [];
    searched.value = false;
    searchError.value = '';
    return;
  }
  searchTimer = setTimeout(() => void runSearch(term), SEARCH_DEBOUNCE_MS);
});

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer);
});

async function runSearch(term: string) {
  searching.value = true;
  searchError.value = '';
  try {
    const users = await searchNurses(term);
    if (search.value.trim() !== term) return;
    results.value = users.filter((user) => !props.excludeIds.includes(user.id));
    searched.value = true;
  } catch (e) {
    searchError.value = e instanceof Error && e.message ? e.message : 'Recherche indisponible';
  } finally {
    searching.value = false;
  }
}

function close() {
  search.value = '';
  selected.value = null;
  scopeChoice.value = null;
  emit('close');
}

async function submit() {
  if (!selected.value || !scope.value) return;
  const built = buildNurseCollaborationBody({
    coNurseId: selected.value.id,
    scope: scope.value,
    appointmentId: props.appointmentId,
    passageSeriesId: props.passageSeriesId,
    startDate: startDate.value,
    endDate: endDate.value,
  });
  if (!built.ok) {
    toast.add({ title: built.error, color: 'error' });
    return;
  }
  const item = await create(built.body);
  if (!item) return;
  emit('added', item);
  close();
}
</script>

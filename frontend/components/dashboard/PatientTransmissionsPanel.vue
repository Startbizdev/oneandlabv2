<template>
  <UCard id="patient-transmissions" class="overflow-hidden ring-1 ring-default/60">
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <h2 class="flex items-center gap-2 text-lg font-normal">
          <UIcon name="i-lucide-notebook-pen" class="size-5 shrink-0 text-primary" />
          Transmissions
        </h2>
        <UButton v-if="groups.length" size="sm" icon="i-lucide-plus" @click="openEntry(null)">Nouvelle</UButton>
      </div>
    </template>

    <div v-if="loading && !items.length" class="flex justify-center py-10">
      <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-primary" />
    </div>

    <UAlert v-else-if="error && !items.length" color="error" variant="soft" title="Transmissions indisponibles" :description="error">
      <template #actions><UButton variant="outline" color="neutral" @click="reload">Réessayer</UButton></template>
    </UAlert>

    <UEmpty
      v-else-if="!items.length"
      icon="i-lucide-notebook-pen"
      title="Aucune transmission"
      description="Notez l'évolution et les soins réalisés pour toute l'équipe soignante."
    >
      <template #actions>
        <UButton icon="i-lucide-plus" @click="openEntry(null)">Nouvelle transmission</UButton>
      </template>
    </UEmpty>

    <div v-else class="space-y-5">
      <section v-for="group in groups" :key="group.day" class="space-y-2">
        <h3 class="text-sm font-semibold text-muted">{{ dayLabel(group.day) }}</h3>
        <article
          v-for="t in group.items"
          :key="t.id"
          class="space-y-2 rounded-xl border border-default/50 p-3"
        >
          <div class="flex items-start justify-between gap-2">
            <p class="min-w-0 text-sm font-semibold text-default">{{ transmissionAuthorLine(t.author) }}</p>
            <span class="shrink-0 text-xs text-muted">{{ transmissionTimeLabel(t) }}</span>
          </div>
          <UBadge v-if="t.for_doctor" color="warning" variant="subtle" size="sm">Pour le médecin</UBadge>
          <p class="whitespace-pre-line text-sm text-default">{{ t.body }}</p>
          <div v-if="t.care_items.length" class="flex flex-wrap gap-1.5">
            <UBadge v-for="item in t.care_items" :key="careItemKey(item)" color="neutral" variant="subtle" size="sm">
              {{ item.label }}
            </UBadge>
          </div>
          <div v-if="t.edited_at || t.can_edit" class="flex items-center justify-between gap-2">
            <span class="text-xs text-muted">{{ t.edited_at ? 'Modifiée' : '' }}</span>
            <UButton v-if="t.can_edit" size="xs" variant="ghost" @click="openEntry(t)">Modifier</UButton>
          </div>
        </article>
      </section>
      <p v-if="error" class="text-sm text-error" role="alert">{{ error }}</p>
      <div v-if="nextBefore" class="flex justify-center">
        <UButton variant="outline" color="neutral" :loading="loading" @click="loadMore">Transmissions plus anciennes</UButton>
      </div>
    </div>

    <PatientTransmissionModal
      v-model:open="entryOpen"
      :patient-id="patientId"
      :transmission="editing"
      @saved="reload"
    />
  </UCard>
</template>

<script setup lang="ts">
import type { PatientTransmission, PatientTransmissionsPage } from '@oneandlab/shared-types';
import {
  appointmentDayFrance,
  careItemKey,
  groupTransmissionsByDay,
  transmissionAuthorLine,
  transmissionTimeLabel,
} from '@oneandlab/shared-utils';
import PatientTransmissionModal from '~/components/dashboard/PatientTransmissionModal.vue';
import { apiFetch } from '~/utils/api';

const props = defineProps<{ patientId: string }>();

const items = ref<PatientTransmission[]>([]);
const nextBefore = ref<string | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const entryOpen = ref(false);
const editing = ref<PatientTransmission | null>(null);

const groups = computed(() => groupTransmissionsByDay(items.value));

function shiftDay(day: string, days: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, (d ?? 1) + days)).toISOString().slice(0, 10);
}

function dayLabel(day: string): string {
  const today = appointmentDayFrance(new Date());
  if (day === today) return "Aujourd'hui";
  if (day === shiftDay(today, -1)) return 'Hier';
  const label = new Date(`${day}T12:00:00Z`).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(day.slice(0, 4) === today.slice(0, 4) ? {} : { year: 'numeric' }),
    timeZone: 'UTC',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

async function fetchPage(before: string | null): Promise<PatientTransmissionsPage> {
  const query = before ? `?before=${encodeURIComponent(before)}` : '';
  const res = await apiFetch<{ success: boolean; data?: PatientTransmissionsPage; error?: string }>(
    `/patients/${encodeURIComponent(props.patientId)}/transmissions${query}`,
  );
  if (!res.success || !res.data) throw new Error(res.error ?? 'Transmissions indisponibles');
  return res.data;
}

async function load(before: string | null) {
  if (!props.patientId) return;
  loading.value = true;
  error.value = null;
  try {
    const page = await fetchPage(before);
    items.value = before ? [...items.value, ...page.items] : page.items;
    nextBefore.value = page.next_before;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Transmissions indisponibles';
  } finally {
    loading.value = false;
  }
}

function reload() {
  void load(null);
}

function loadMore() {
  if (nextBefore.value && !loading.value) void load(nextBefore.value);
}

function openEntry(transmission: PatientTransmission | null) {
  editing.value = transmission;
  entryOpen.value = true;
}

watch(() => props.patientId, reload, { immediate: true });
</script>

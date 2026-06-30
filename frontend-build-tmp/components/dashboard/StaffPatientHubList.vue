<template>
  <ul class="divide-y divide-gray-100 dark:divide-gray-800" role="list">
    <li v-for="item in items" :key="item.id">
      <button
        type="button"
        class="flex w-full min-w-0 items-center gap-3 px-1 py-3.5 text-left transition-colors hover:bg-gray-50/80 dark:hover:bg-white/[0.03]"
        @click="emit('select', item)"
      >
        <div class="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-50 ring-1 ring-primary-100 dark:bg-primary-950/40 dark:ring-primary-900/50">
          <img
            v-if="item.kind === 'patient' && item.profile_image_url"
            :src="item.profile_image_url"
            alt=""
            class="h-full w-full object-cover"
          />
          <UIcon
            v-else
            :name="iconFor(item)"
            class="h-5 w-5 text-primary-600 dark:text-primary-400"
            aria-hidden="true"
          />
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate text-[15px] font-semibold text-gray-900 dark:text-white">
            {{ titleFor(item) }}
            <span
              v-if="item.kind === 'patient' && ageLabel(item)"
              class="font-medium text-gray-500 dark:text-gray-400"
            >
              · {{ ageLabel(item) }}
            </span>
          </p>
          <p class="mt-0.5 line-clamp-2 text-[13px] leading-snug text-gray-500 dark:text-gray-400">
            {{ subtitleFor(item) }}
          </p>
        </div>
        <UIcon name="i-lucide-chevron-right" class="h-4 w-4 shrink-0 text-gray-300 dark:text-gray-600" aria-hidden="true" />
      </button>
    </li>
  </ul>
</template>

<script setup lang="ts">
import type { StaffHubSearchItem } from '@oneandlab/shared-types';
import { ageFromBirthDate } from '@oneandlab/shared-utils';

defineProps<{
  items: StaffHubSearchItem[];
}>();

const emit = defineEmits<{
  select: [item: StaffHubSearchItem];
}>();

function iconFor(item: StaffHubSearchItem): string {
  if (item.kind === 'document') return 'i-lucide-file-text';
  if (item.kind === 'exchange') return 'i-lucide-message-circle';
  return 'i-lucide-user';
}

function titleFor(item: StaffHubSearchItem): string {
  if (item.kind === 'patient') {
    const name = [item.first_name, item.last_name].filter(Boolean).join(' ').trim();
    return name || 'Patient';
  }
  if (item.kind === 'document') return item.title;
  return item.patient_name;
}

function subtitleFor(item: StaffHubSearchItem): string {
  if (item.kind === 'patient') return item.subtitle?.trim() || 'Patient';
  if (item.kind === 'document') return item.subtitle?.trim() || item.patient_name;
  const msg = item.last_message?.trim();
  return msg ? `${item.counterpart_name} · ${msg}` : item.counterpart_name;
}

function ageLabel(item: StaffHubSearchItem): string | null {
  if (item.kind !== 'patient' || !item.birth_date) return null;
  const age = ageFromBirthDate(item.birth_date);
  return age != null ? `${age} ans` : null;
}
</script>

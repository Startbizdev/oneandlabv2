<template>
  <ul class="divide-y divide-gray-100 dark:divide-gray-800">
    <li v-for="item in items" :key="item.id" class="flex items-center gap-3 py-2.5">
      <UAvatar
        :src="rowCopy(item).guest ? undefined : item.co_nurse_profile_image_url ?? undefined"
        :alt="rowCopy(item).guest ? item.owner_name : item.co_nurse_name"
        size="md"
      />
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-medium">{{ rowCopy(item).title }}</p>
        <p class="truncate text-xs text-muted">{{ nurseCollaborationScopeSummary(item) }}</p>
      </div>
      <UButton
        v-if="item.can_remove"
        color="neutral"
        variant="soft"
        size="sm"
        :loading="removingId === item.id"
        @click="confirmRemove(item)"
      >
        {{ rowCopy(item).removeLabel }}
      </UButton>
    </li>
  </ul>
</template>

<script setup lang="ts">
import type { NurseCollaboration } from '@oneandlab/shared-types';
import { nurseCollaborationRowCopy, nurseCollaborationScopeSummary } from '@oneandlab/shared-utils';

const props = defineProps<{
  items: NurseCollaboration[];
  viewerId: string | null | undefined;
}>();

const emit = defineEmits<{
  /** `self` : le confrère s'est retiré lui-même. */
  removed: [self: boolean];
}>();

const { removingId, remove } = useNurseCollaborations();

function rowCopy(item: NurseCollaboration) {
  return nurseCollaborationRowCopy(item, props.viewerId);
}

async function confirmRemove(item: NurseCollaboration) {
  const copy = rowCopy(item);
  if (!window.confirm(`${copy.confirmTitle}\n${copy.confirmMessage}`)) return;
  if (await remove(item.id)) emit('removed', copy.guest);
}
</script>

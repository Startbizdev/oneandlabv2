<template>
  <div
    v-if="summary"
    class="mt-0.5 flex flex-wrap items-center gap-1"
    :aria-label="`Note ${summary.averageRating.toFixed(1)} sur 5, ${formatReviewsCount(summary.reviewsCount)}`"
  >
    <div class="flex items-center gap-px" aria-hidden="true">
      <UIcon
        v-for="star in 5"
        :key="star"
        :name="star <= filledStars ? 'i-heroicons-star-solid' : 'i-heroicons-star'"
        class="h-2.5 w-2.5"
        :class="star <= filledStars ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'"
      />
    </div>
    <span class="text-xs font-semibold tabular-nums text-gray-900 dark:text-white">
      {{ summary.averageRating.toFixed(1) }}
    </span>
    <span class="text-xs text-gray-400 dark:text-gray-500">·</span>
    <span class="text-xs font-medium text-gray-500 dark:text-gray-400">
      {{ formatReviewsCount(summary.reviewsCount) }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  formatReviewsCount,
  type AssigneeReviewSummary,
} from '~/utils/assignee-review-display';

const props = defineProps<{
  summary: AssigneeReviewSummary | null | undefined;
}>();

const filledStars = computed(() =>
  Math.min(5, Math.max(0, Math.round(props.summary?.averageRating ?? 0))),
);
</script>

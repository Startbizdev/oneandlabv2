<template>
  <UCard
    :id="`review-card-${review.id}`"
    :class="[
      'shadow-sm border-0 ring-1 ring-gray-200 dark:ring-gray-800 hover:shadow-md transition-shadow duration-200',
      highlighted ? 'ring-2 ring-primary-500 dark:ring-primary-400' : '',
    ]"
    :ui="{ body: { padding: 'p-5 sm:p-6' } }"
  >
    <div class="space-y-4">
      <div class="flex justify-between items-start gap-4">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 mb-2">
            <div class="flex gap-0.5">
              <UIcon
                v-for="i in 5"
                :key="i"
                :name="i <= review.rating ? 'i-heroicons-star-solid' : 'i-heroicons-star'"
                class="text-yellow-400 w-5 h-5 flex-shrink-0"
              />
            </div>
            <span class="text-sm font-medium text-gray-600 dark:text-gray-400">{{ review.rating }}/5</span>
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">
            Par {{ review.reviewer_name || 'Patient' }}
          </p>

          <div
            v-if="review.appointment_type || review.category_name || review.appointment_scheduled_at || review.appointment_id"
            class="text-sm text-gray-600 dark:text-gray-400 space-y-1 mb-2"
          >
            <p v-if="review.appointment_type || review.category_name">
              <span class="font-medium text-gray-800 dark:text-gray-200">{{ appointmentTypeLabel(review.appointment_type) }}</span>
              <span v-if="review.category_name"> · {{ review.category_name }}</span>
            </p>
            <p v-if="review.appointment_scheduled_at" class="text-xs text-gray-500 dark:text-gray-500">
              Rendez-vous du {{ formatAppointmentDate(review.appointment_scheduled_at) }}
            </p>
            <NuxtLink
              v-if="review.appointment_id && appointmentDetailBase"
              :to="`${appointmentDetailBase}/${review.appointment_id}`"
              class="text-xs text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1"
            >
              <UIcon name="i-lucide-external-link" class="w-3.5 h-3.5" />
              Voir le rendez-vous
            </NuxtLink>
          </div>

          <p v-if="review.comment" class="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
            {{ review.comment }}
          </p>
        </div>
        <span class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap flex-shrink-0">
          {{ formatDate(review.created_at) }}
        </span>
      </div>

      <div v-if="review.response" class="pt-3 border-t border-gray-200 dark:border-gray-700">
        <p class="text-xs font-medium uppercase tracking-wider text-primary-600 dark:text-primary-400 mb-1">
          Votre réponse
        </p>
        <p
          class="text-sm text-gray-700 dark:text-gray-300 p-3 rounded-lg bg-primary-50 dark:bg-primary-900/20 border-l-4 border-primary-500 dark:border-primary-400"
        >
          {{ review.response }}
        </p>
      </div>
      <div v-else class="pt-3 border-t border-gray-200 dark:border-gray-700">
        <UButton
          size="sm"
          variant="outline"
          color="primary"
          icon="i-lucide-message-square"
          @click="$emit('reply', review)"
        >
          Répondre
        </UButton>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
defineProps<{
  review: Record<string, any>
  /** Ex. `/nurse/appointments` (sans slash final) */
  appointmentDetailBase: string
  highlighted?: boolean
}>()

defineEmits<{
  reply: [review: Record<string, any>]
}>()

function appointmentTypeLabel(type: string | null | undefined) {
  if (type === 'blood_test') return 'Prélèvement'
  if (type === 'nursing' || type === 'nurse') return 'Soins infirmiers'
  return type ? String(type) : 'Rendez-vous'
}

function formatAppointmentDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
</script>

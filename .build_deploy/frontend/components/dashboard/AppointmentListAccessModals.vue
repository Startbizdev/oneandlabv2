<script setup lang="ts">
import {
  unavailableNoticeMessage,
  unavailableNoticeTitle,
  type AppointmentUnavailableReason,
} from '~/utils/appointment-access-response'

const props = withDefaults(
  defineProps<{
    listPath: string
  }>(),
  {},
)

const route = useRoute()

const showColleagueModal = ref(false)
const showUnavailableModal = ref(false)
const unavailableReason = ref<AppointmentUnavailableReason>('canceled')

function stripAccessQuery() {
  const q = { ...route.query } as Record<string, string | string[] | undefined>
  delete q.alreadyAccepted
  delete q.appointmentUnavailable
  navigateTo({ path: route.path, query: q }, { replace: true })
}

function closeColleagueModal() {
  showColleagueModal.value = false
  stripAccessQuery()
  navigateTo(props.listPath)
}

function closeUnavailableModal() {
  showUnavailableModal.value = false
  stripAccessQuery()
  navigateTo(props.listPath)
}

watch(
  () => [route.query.alreadyAccepted, route.query.appointmentUnavailable] as const,
  ([alreadyAccepted, unavailable]) => {
    showColleagueModal.value = alreadyAccepted === '1' || alreadyAccepted === 'true'
    if (unavailable != null && String(unavailable).trim() !== '') {
      unavailableReason.value = String(unavailable) as AppointmentUnavailableReason
      showUnavailableModal.value = true
    } else {
      showUnavailableModal.value = false
    }
  },
  { immediate: true },
)
</script>

<template>
  <ClientOnly>
    <Teleport to="body">
      <UModal v-model:open="showColleagueModal" :ui="{ content: 'max-w-md w-full' }">
        <template #content>
          <UCard class="w-full border-0">
            <div class="space-y-4 p-4 text-center">
              <p class="text-lg text-gray-700 dark:text-gray-300">
                Ce RDV a déjà été accepté par un confrère 😢 D'autres arrivent !
              </p>
              <UButton color="primary" block :on-click="closeColleagueModal">
                Voir mes rendez-vous
              </UButton>
            </div>
          </UCard>
        </template>
      </UModal>

      <UModal v-model:open="showUnavailableModal" :ui="{ content: 'max-w-md w-full' }">
        <template #content>
          <UCard class="w-full border-0">
            <div class="space-y-4 p-4 text-center">
              <p class="text-base font-semibold text-gray-900 dark:text-gray-100">
                {{ unavailableNoticeTitle(unavailableReason) }}
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-300">
                {{ unavailableNoticeMessage(unavailableReason) }}
              </p>
              <UButton color="primary" block :on-click="closeUnavailableModal">
                Voir mes rendez-vous
              </UButton>
            </div>
          </UCard>
        </template>
      </UModal>
    </Teleport>
  </ClientOnly>
</template>

<template>
  <UCard
    v-if="visible"
    class="overflow-hidden"
  >
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-user-cog" class="w-5 h-5 text-primary" />
        <span class="font-semibold text-gray-900 dark:text-white">Assignation</span>
      </div>
    </template>
    <div class="space-y-4">
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Laboratoire en charge (vous ou un sous-compte) puis optionnellement un préleveur.
        <span v-if="batchCount > 1" class="block mt-1 text-primary-600 dark:text-primary-400">
          Lot de {{ batchCount }} prélèvements : l’assignation s’applique à tout le lot.
        </span>
      </p>
      <div class="space-y-2">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Laboratoire assigné</label>
        <USelectMenu
          v-model="selectedLabIdModel"
          :items="labItems"
          value-key="value"
          placeholder="Laboratoire (moi)"
          size="md"
          color="primary"
          variant="soft"
          class="w-full min-w-0"
          :loading="optionsLoading"
          :search-input="{ placeholder: 'Rechercher...' }"
          :filter-fields="['label']"
        >
          <template #label>
            <span>{{ selectedLabLabel || 'Laboratoire (moi)' }}</span>
          </template>
          <template #empty>
            <div class="py-6 px-4 text-center">
              <UEmpty
                icon="i-lucide-building-2"
                title="Aucun autre laboratoire"
                description="Vous êtes le seul laboratoire. Ajoutez des sous-comptes dans Paramètres."
                variant="naked"
                size="sm"
              />
            </div>
          </template>
        </USelectMenu>
      </div>
      <div class="space-y-2">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Préleveur assigné</label>
        <USelectMenu
          v-model="selectedPreleveurIdModel"
          :items="preleveurItems"
          value-key="value"
          placeholder="Aucun"
          size="md"
          color="primary"
          variant="soft"
          class="w-full min-w-0"
          :loading="optionsLoading"
          :search-input="{ placeholder: 'Rechercher...' }"
          :filter-fields="['label']"
        >
          <template #label>
            <span>{{ selectedPreleveurLabel }}</span>
          </template>
          <template #empty>
            <div class="py-6 px-4 text-center">
              <UEmpty
                icon="i-lucide-user-check"
                title="Aucun préleveur"
                description="Ajoutez des préleveurs dans Paramètres pour les assigner aux RDV."
                variant="naked"
                size="sm"
              />
            </div>
          </template>
        </USelectMenu>
        <p class="text-xs text-gray-500 dark:text-gray-400">
          Préleveurs du laboratoire sélectionné ci-dessus.
        </p>
      </div>
      <UButton
        type="button"
        color="primary"
        variant="soft"
        size="md"
        leading-icon="i-lucide-check"
        :loading="reassigning"
          :disabled="!appointment || !assignment.hasChange(appointment)"
        block
        :on-click="onApply"
      >
        Appliquer l’assignation
      </UButton>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { PRELEVEUR_NONE_VALUE, useLabAssignment } from '~/composables/useLabAssignment'

const props = defineProps<{
  /** RDV courant (blood_test, pending/confirmed/inProgress). */
  appointment: any
  /** Callback après succès de la réassignation (recharger le RDV). */
  loadAppointment: () => Promise<void>
  /** Tous les IDs du lot (RDV courant + fratries), pour propagation assignation. */
  batchAppointmentIds?: string[]
}>()

const batchCount = computed(() => {
  const ids = props.batchAppointmentIds?.filter(Boolean) ?? []
  return ids.length > 0 ? ids.length : 1
})

const assignment = useLabAssignment()

const optionsLoading = computed(() => !!assignment.optionsLoading?.value)
const reassigning = computed(() => !!assignment.reassigning?.value)

const labItems = computed(() => assignment.labSelectItems?.value ?? [])
const preleveurItems = computed(() => assignment.preleveurSelectItems?.value ?? [])

const selectedLabIdModel = computed({
  get: () => assignment.selectedLabId?.value ?? '',
  set: (v: string) => { assignment.selectedLabId && (assignment.selectedLabId.value = v ?? '') },
})
const selectedPreleveurIdModel = computed({
  get: () => assignment.selectedPreleveurId?.value ?? PRELEVEUR_NONE_VALUE,
  set: (v: string) => { assignment.selectedPreleveurId && (assignment.selectedPreleveurId.value = (v && v !== PRELEVEUR_NONE_VALUE ? v : PRELEVEUR_NONE_VALUE)) },
})

const selectedLabLabel = computed(() => {
  const id = selectedLabIdModel.value
  const item = labItems.value.find((i: { value: string; label: string }) => String(i.value) === String(id))
  return item?.label ?? (id ? 'Laboratoire' : '')
})
const selectedPreleveurLabel = computed(() => {
  const id = selectedPreleveurIdModel.value
  if (!id || id === PRELEVEUR_NONE_VALUE) return 'Aucun'
  const item = preleveurItems.value.find((i: { value: string; label: string }) => String(i.value) === String(id))
  return item?.label ?? id
})

const visible = computed(() => {
  const a = props.appointment
  return (
    a &&
    a.type === 'blood_test' &&
    ['pending', 'confirmed', 'inProgress'].includes(a?.status)
  )
})

onMounted(() => {
  if (assignment.myId.value) {
    assignment.fetchOptions().then(() => {
      assignment.syncFromAppointment(props.appointment)
    })
  }
})

watch(
  () => props.appointment,
  (app) => {
    if (app) assignment.syncFromAppointment(app)
  },
  { immediate: true, deep: true },
)

async function onApply() {
  if (!props.appointment?.id || !props.loadAppointment) return
  const ids =
    props.batchAppointmentIds?.length
      ? props.batchAppointmentIds
      : [String(props.appointment.id)]
  await assignment.apply(String(props.appointment.id), props.loadAppointment, ids)
}
</script>

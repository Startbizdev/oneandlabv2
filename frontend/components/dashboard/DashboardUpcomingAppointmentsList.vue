<template>
  <UEmpty
    v-if="groupedUpcoming.length === 0"
    icon="i-lucide-calendar-x"
    title="Aucun rendez-vous à venir"
    description="Les rendez-vous passés ou terminés n'apparaissent pas dans cette liste."
    class="py-10"
  />
  <ul v-else class="divide-y divide-gray-100 dark:divide-gray-800">
    <li v-for="group in groupedUpcoming" :key="group.key">
      <div
        class="flex flex-col gap-2.5 p-2.5 sm:flex-row sm:items-start sm:gap-3 sm:p-3"
      >
        <div
          class="mx-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset sm:mx-0"
          :class="groupAvatarClass(group)"
        >
          <UIcon :name="groupAvatarIcon(group)" class="h-5 w-5" />
        </div>

        <div class="min-w-0 flex-1">
          <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p class="text-sm font-medium text-gray-900 dark:text-white sm:text-[16px]">
              {{ group.patientName }}
            </p>
            <UBadge
              v-if="group.appointments.length > 1"
              color="neutral"
              variant="subtle"
              size="xs"
            >
              {{ group.appointments.length }} RDV
            </UBadge>
          </div>

          <ul class="space-y-0.5">
            <li v-for="rdv in group.appointments" :key="rdv.id">
              <NuxtLink
                :to="`${appointmentsBasePath}/appointments/${rdv.id}`"
                class="group/line flex flex-wrap items-start justify-between gap-x-3 gap-y-2 rounded-lg px-2 py-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <div class="min-w-0 flex-1 space-y-1.5">
                  <div class="flex flex-wrap items-center gap-1.5">
                    <UBadge
                      :color="typeBadgeColor(rdv)"
                      variant="subtle"
                      size="xs"
                      class="shrink-0"
                      :leading-icon="rdv.type === 'blood_test' ? 'i-lucide-droplet' : 'i-lucide-stethoscope'"
                    >
                      {{ typeLabel(rdv) }}
                    </UBadge>
                    <UBadge
                      :color="getStatusColor(rdv.status)"
                      variant="subtle"
                      size="xs"
                      class="shrink-0"
                    >
                      {{ getStatusLabel(rdv.status) }}
                    </UBadge>
                  </div>
                  <p class="text-[13px] font-medium leading-snug text-gray-600 dark:text-gray-400 sm:text-[14px]">
                    <span class="capitalize">{{ formatDateRdv(rdv.scheduled_at) }}</span>
                    <span class="text-gray-400 dark:text-gray-500"> · </span>
                    <span>{{ getCreneauHoraireLabel(rdv) }}</span>
                  </p>
                </div>
                <div class="flex shrink-0 items-center gap-1 self-center sm:self-start">
                  <span class="text-xs font-medium text-primary-600 dark:text-primary-400">Détail</span>
                  <UIcon
                    name="i-lucide-chevron-right"
                    class="h-4 w-4 text-gray-300 transition-colors group-hover/line:text-primary-500 dark:text-gray-500"
                  />
                </div>
              </NuxtLink>
            </li>
          </ul>

          <div v-if="group.categoryHint" class="mt-2 flex items-start gap-1.5 text-[13px] text-gray-500">
            <UIcon name="i-lucide-info" class="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
            <span class="min-w-0 truncate">{{ group.categoryHint }}</span>
          </div>
          <p
            v-if="addressLabel(group.primary)"
            class="mt-1 flex items-start gap-1.5 text-[13px] text-gray-500"
          >
            <UIcon name="i-lucide-map-pin" class="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
            <span class="min-w-0 truncate">{{ addressLabel(group.primary) }}</span>
          </p>
          <p
            v-if="variant === 'pro' && getAssigneeLabel(group.primary)"
            class="mt-1 flex items-start gap-1.5 text-[13px] text-gray-500"
          >
            <UIcon name="i-lucide-user-check" class="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
            <span class="min-w-0 truncate">{{ getAssigneeLabel(group.primary) }}</span>
          </p>
        </div>
      </div>
    </li>
  </ul>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    appointments: any[]
    /** Ex. `/pro` ou `/nurse` (sans slash final) */
    appointmentsBasePath: string
    /** Affiche lab / préleveur sous l’adresse (tableau de bord pro) */
    variant?: 'pro' | 'nurse'
}>(),
  { variant: 'pro' },
)

const TERMINAL_STATUSES = ['completed', 'cancelled', 'canceled', 'refused', 'expired']

function isBloodTest(apt: any): boolean {
  return apt?.type === 'blood_test'
}

function isUpcomingAppointment(apt: any): boolean {
  if (!apt || TERMINAL_STATUSES.includes(apt.status)) return false
  if (!apt.scheduled_at) return true
  const d = new Date(apt.scheduled_at)
  if (isNaN(d.getTime())) return true
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  return d >= start
}

function patientGroupKey(apt: any): string {
  if (apt.patient_id) return `pid:${apt.patient_id}`
  const fn = String(apt.form_data?.first_name ?? '')
    .trim()
    .toLowerCase()
  const ln = String(apt.form_data?.last_name ?? '')
    .trim()
    .toLowerCase()
  if (fn || ln) return `name:${fn}|${ln}`
  return `id:${apt.id}`
}

function patientNameFromApt(apt: any): string {
  const fn = String(apt.form_data?.first_name ?? '').trim()
  const ln = String(apt.form_data?.last_name ?? '').trim()
  const n = `${fn} ${ln}`.trim()
  return n || 'Patient'
}

function compareScheduled(a: any, b: any): number {
  const ta = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0
  const tb = b.scheduled_at ? new Date(b.scheduled_at).getTime() : 0
  if (ta !== tb) return ta - tb
  return String(a.id).localeCompare(String(b.id))
}

const groupedUpcoming = computed(() => {
  const upcoming = props.appointments.filter(isUpcomingAppointment)
  const sorted = [...upcoming].sort(compareScheduled)

  const map = new Map<string, any[]>()
  for (const apt of sorted) {
    const key = patientGroupKey(apt)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(apt)
  }

  const groups = Array.from(map.entries()).map(([key, apts]) => {
    const appointments = [...apts].sort(compareScheduled)
    const primary = appointments[0]
    const cats = appointments
      .map((a) => a.category_name)
      .filter(Boolean)
      .filter((c, i, arr) => arr.indexOf(c) === i)
    return {
      key,
      patientName: patientNameFromApt(primary),
      appointments,
      primary,
      categoryHint: cats.length ? cats.join(' · ') : '',
    }
  })

  groups.sort((a, b) => compareScheduled(a.primary, b.primary))
  return groups.slice(0, 6)
})

function groupAvatarIcon(group: { appointments: any[] }): string {
  const blood = group.appointments.some((a) => isBloodTest(a))
  const care = group.appointments.some((a) => !isBloodTest(a))
  if (blood && care) return 'i-lucide-layers'
  if (blood) return 'i-lucide-droplet'
  return 'i-lucide-stethoscope'
}

function groupAvatarClass(group: { appointments: any[] }): string {
  const blood = group.appointments.some((a) => isBloodTest(a))
  const care = group.appointments.some((a) => !isBloodTest(a))
  if (blood && care) {
    return 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400'
  }
  if (blood) return 'bg-red-50 text-red-500 dark:bg-red-500/10'
  return 'bg-blue-50 text-blue-500 dark:bg-blue-500/10'
}

function typeLabel(apt: any): string {
  return isBloodTest(apt) ? 'Prise de sang' : 'Soins infirmiers'
}

function typeBadgeColor(apt: any): 'error' | 'info' {
  return isBloodTest(apt) ? 'error' : 'info'
}

const formatDateRdv = (date: string | undefined) => {
  if (!date) return 'Date non fixée'
  const d = new Date(date)
  return isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('fr-FR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
}

const getCreneauHoraireLabel = (rdv: any): string => {
  let avail = rdv.form_data?.availability
  if (typeof avail === 'string') {
    try {
      avail = JSON.parse(avail || 'null')
    } catch {
      avail = null
    }
  }
  if (avail?.type === 'all_day') return 'Toute la journée'
  if (avail?.type === 'custom' && avail.range?.length >= 2) {
    return `${Math.floor(avail.range[0])}h00 - ${Math.floor(avail.range[1])}h00`
  }
  if (rdv.scheduled_at) {
    const d = new Date(rdv.scheduled_at)
    if (!isNaN(d.getTime())) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }
  return 'Heure non précisée'
}

const addressLabel = (rdv: any): string => {
  if (!rdv?.address) return ''
  return typeof rdv.address === 'object' ? rdv.address.label : rdv.address
}

const getAssigneeLabel = (rdv: any): string => {
  if (rdv.type !== 'blood_test') return ''
  const parts: string[] = []
  if (rdv.assigned_lab_display_name) {
    parts.push(`${rdv.assigned_lab_role === 'subaccount' ? 'Sous-compte' : 'Labo'} ${rdv.assigned_lab_display_name}`)
  }
  if (rdv.assigned_to_display_name) {
    parts.push(`Préleveur ${rdv.assigned_to_display_name}`)
  }
  return parts.join(' · ')
}

const getStatusColor = (
  status: string,
): 'error' | 'primary' | 'success' | 'info' | 'warning' | 'neutral' => {
  const colors: Record<string, 'error' | 'primary' | 'success' | 'info' | 'warning' | 'neutral'> = {
    pending: 'warning',
    confirmed: 'info',
    planned: 'info',
    inProgress: 'primary',
    completed: 'success',
    canceled: 'error',
    cancelled: 'error',
    refused: 'error',
    expired: 'neutral',
  }
  return colors[status] || 'neutral'
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: 'En attente',
    confirmed: 'Confirmé',
    planned: 'Planifié',
    inProgress: 'En cours',
    completed: 'Terminé',
    canceled: 'Annulé',
    refused: 'Refusé',
    expired: 'Expiré',
  }
  return labels[status] || status
}
</script>

<template>
  <UCard class="overflow-hidden ring-1 ring-default/60">
    <template #header>
      <h2 class="text-lg font-normal flex items-center gap-2">
        <UIcon name="i-lucide-heart-pulse" class="w-5 h-5 text-primary shrink-0" />
        Carnet de santé
      </h2>
    </template>

    <div v-if="loading" class="flex justify-center py-10">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary" />
    </div>

    <UAlert
      v-else-if="error"
      color="error"
      variant="soft"
      title="Carnet inaccessible"
      :description="error"
    />

    <template v-else-if="recap">
      <UAlert
        color="warning"
        variant="soft"
        class="mb-4"
        title="Données déclarées par le patient"
        description="À confirmer en consultation — lecture seule."
      />

      <div class="flex items-center gap-4 mb-4">
        <div
          class="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-primary/30"
        >
          <span class="text-sm font-semibold text-primary">{{ recap.completion?.percent ?? 0 }}%</span>
        </div>
        <p class="text-sm text-muted">
          Complétion du carnet déclaratif
        </p>
      </div>

      <div v-if="(recap.open_gaps ?? []).length" class="mb-4 space-y-2">
        <p class="text-xs font-medium uppercase tracking-wide text-muted">Écarts de suivi</p>
        <p
          v-for="gap in recap.open_gaps"
          :key="gap.gap_key"
          class="text-sm text-default"
        >
          · {{ gap.label_fr }}
        </p>
      </div>

      <div class="space-y-4">
        <div
          v-for="section in recap.sections ?? []"
          :key="section.id"
          class="rounded-xl border border-default/50 p-4 space-y-3"
        >
          <div class="space-y-2">
            <p class="text-sm font-semibold text-default flex items-center gap-2">
              <span aria-hidden="true">{{ sectionEmoji(section.id) }}</span>
              {{ section.label_fr }}
            </p>
            <div class="flex items-center gap-2">
              <div
                class="h-1.5 flex-1 overflow-hidden rounded-full bg-default/10"
                role="progressbar"
                :aria-valuenow="sectionFilled(section)"
                :aria-valuemin="0"
                :aria-valuemax="section.items.length"
                :aria-label="`${sectionFilled(section)} sur ${section.items.length} renseignées`"
              >
                <div
                  class="h-full rounded-full bg-success transition-all"
                  :style="{ width: `${sectionProgress(section)}%` }"
                />
              </div>
              <UBadge
                :color="sectionFilled(section) >= section.items.length ? 'success' : 'warning'"
                variant="subtle"
                size="sm"
              >
                {{
                  sectionFilled(section) >= section.items.length
                    ? 'Complet'
                    : `${sectionFilled(section)}/${section.items.length}`
                }}
              </UBadge>
            </div>
          </div>

          <ul class="space-y-3">
            <li
              v-for="item in section.items"
              :key="item.key"
              class="space-y-1"
            >
              <p class="text-xs font-medium text-muted">{{ item.label_fr }}</p>
              <div
                v-if="!isEmptyDisplay(item.display)"
                class="flex items-start gap-2 rounded-lg border border-success/25 bg-success/10 px-3 py-2.5"
                :aria-label="`${item.label_fr} : ${formatItemDisplay(item.display)}`"
              >
                <UIcon name="i-lucide-circle-check" class="mt-0.5 size-4 shrink-0 text-success" />
                <span class="text-sm font-semibold text-default">{{ formatItemDisplay(item.display) }}</span>
              </div>
              <div
                v-else
                class="flex items-center justify-between gap-2 rounded-lg border border-dashed border-default/40 bg-elevated/40 px-3 py-2.5"
                :aria-label="`${item.label_fr} : non renseigné, à compléter`"
              >
                <div class="flex min-w-0 items-center gap-2">
                  <UIcon name="i-lucide-circle-dashed" class="size-4 shrink-0 text-muted" />
                  <span class="text-sm text-muted">{{ HEALTH_RECORD_EMPTY_LABEL }}</span>
                </div>
                <UBadge color="neutral" variant="subtle" size="sm">
                  Optionnel
                </UBadge>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <p v-if="recap.disclaimer_fr" class="mt-4 text-xs text-muted">
        {{ recap.disclaimer_fr }}
      </p>
    </template>
  </UCard>
</template>

<script setup lang="ts">
const props = defineProps<{
  patientId: string
}>()

interface HealthRecordRecap {
  completion?: { percent?: number }
  sections?: Array<{
    id: string
    label_fr: string
    items: Array<{ key: string; label_fr: string; display: string }>
  }>
  open_gaps?: Array<{ gap_key: string; label_fr: string }>
  disclaimer_fr?: string
}

const config = useRuntimeConfig()
const apiBase = config.public.apiBase || 'http://localhost:8888/api'

const loading = ref(true)
const error = ref<string | null>(null)
const recap = ref<HealthRecordRecap | null>(null)

const HEALTH_RECORD_EMPTY_LABEL = 'Non renseigné'

const SECTION_EMOJI: Record<string, string> = {
  general: '📏',
  cardio: '💓',
  metabolic: '🍎',
  allergies: '🤧',
  treatments: '💊',
  lifestyle: '🌿',
  surgical: '🩹',
  family: '🧬',
  gynecology: '🤰',
}

function sectionEmoji(sectionId: string): string {
  return SECTION_EMOJI[sectionId] ?? '📋'
}

function isEmptyDisplay(display: string | undefined): boolean {
  if (!display?.trim()) return true
  return display === HEALTH_RECORD_EMPTY_LABEL || display === '—'
}

function formatItemDisplay(display: string | undefined): string {
  if (!display?.trim() || display === '—') return HEALTH_RECORD_EMPTY_LABEL
  return display
}

function sectionFilled(section: { items: Array<{ display: string }> }): number {
  return section.items.filter((item) => !isEmptyDisplay(item.display)).length
}

function sectionProgress(section: { items: Array<{ display: string }> }): number {
  if (!section.items.length) return 0
  return Math.round((sectionFilled(section) / section.items.length) * 100)
}

async function load() {
  if (!props.patientId) return
  loading.value = true
  error.value = null
  try {
    const res = await $fetch<{ success: boolean; data?: HealthRecordRecap; error?: string }>(
      `${apiBase}/patients/${encodeURIComponent(props.patientId)}/health-record`,
      { credentials: 'include' },
    )
    if (!res.success || !res.data) {
      throw new Error(res.error ?? 'Carnet indisponible')
    }
    recap.value = res.data
  } catch (e) {
    recap.value = null
    error.value = e instanceof Error ? e.message : 'Erreur de chargement'
  } finally {
    loading.value = false
  }
}

watch(
  () => props.patientId,
  () => {
    void load()
  },
  { immediate: true },
)
</script>

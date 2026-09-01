<template>
  <UCard class="overflow-hidden">
    <template #header>
      <CardHeader
        icon="i-lucide-map-pin"
        title="Zone de couverture"
        description="Carré d'intervention autour de votre adresse professionnelle"
      />
    </template>

    <template v-if="!hasValidAddress">
      <UAlert
        color="amber"
        variant="soft"
        icon="i-lucide-alert-circle"
        title="Adresse requise"
        description="Définissez d'abord votre adresse dans la section Coordonnées pour configurer votre zone."
        class="rounded-lg"
      />
    </template>

    <template v-else>
      <div class="space-y-4">
        <ClientOnly>
          <ProfileCoverageSquareMap
            v-if="lat != null && lng != null"
            :lat="lat"
            :lng="lng"
            :half-side-km="halfSideKm"
            :max-half-side-km="maxHalfSideKm"
            read-only
            :show-footer="false"
            map-min-height="min-h-[280px] sm:min-h-[360px] lg:min-h-[400px]"
            class="rounded-xl overflow-hidden border border-default/40 shadow-sm"
          />
          <template #fallback>
            <div
              class="w-full min-h-[280px] rounded-xl bg-muted/30 border border-default/40 flex items-center justify-center"
            >
              <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary" />
            </div>
          </template>
        </ClientOnly>

        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div class="space-y-0.5">
            <p class="text-sm text-foreground">
              <span class="font-semibold text-primary tabular-nums">{{ displayHalfSide }} km</span>
              <span class="text-muted"> du centre au bord</span>
              <span class="text-muted hidden sm:inline"> · ~{{ displayArea }} km²</span>
            </p>
            <p class="text-xs text-muted">
              Les patients dans ce carré peuvent vous contacter via Cary.
            </p>
          </div>
          <UButton
            color="primary"
            icon="i-lucide-maximize-2"
            class="shrink-0 self-start sm:self-center"
            :disabled="saving"
            @click="editorOpen = true"
          >
            Modifier mon secteur
          </UButton>
        </div>

        <p v-if="discoveryHint" class="text-sm text-amber-600 dark:text-amber-400">
          <UIcon name="i-lucide-info" class="w-4 h-4 inline-block align-middle mr-1.5 shrink-0" aria-hidden="true" />
          {{ discoveryHint }}
          <NuxtLink v-if="discoveryLink" :to="discoveryLink" class="underline font-medium">Passez en Pro</NuxtLink>
          <template v-if="discoveryLink"> pour étendre jusqu'à 100 km.</template>
        </p>

        <p v-if="saving" class="text-xs text-muted flex items-center gap-1.5">
          <UIcon name="i-lucide-loader-2" class="w-3.5 h-3.5 animate-spin" />
          Enregistrement de la zone…
        </p>
      </div>
    </template>
  </UCard>

  <CoverageZoneEditorModal
    v-model:open="editorOpen"
    :lat="lat"
    :lng="lng"
    :half-side-km="halfSideKm"
    :max-half-side-km="maxHalfSideKm"
    title="Modifier mon secteur"
    subtitle="Glissez un coin du carré pour agrandir ou réduire votre zone"
    @update:half-side-km="emit('update:halfSideKm', $event)"
    @update:bounds="emit('update:bounds', $event)"
    @drag-end="emit('dragEnd')"
  />
</template>

<script setup lang="ts">
import { squareAreaKm2, type CoverageBounds } from '@oneandlab/shared-utils';

const props = withDefaults(
  defineProps<{
    lat: number | null;
    lng: number | null;
    halfSideKm: number;
    maxHalfSideKm?: number;
    saving?: boolean;
    discoveryHint?: string | null;
    discoveryLink?: string | null;
  }>(),
  {
    maxHalfSideKm: 100,
    saving: false,
    discoveryHint: null,
    discoveryLink: null,
  },
);

const emit = defineEmits<{
  'update:halfSideKm': [number];
  'update:bounds': [CoverageBounds];
  dragEnd: [];
}>();

const editorOpen = ref(false);

const hasValidAddress = computed(() => props.lat != null && props.lng != null);
const displayHalfSide = computed(() => Math.round(props.halfSideKm));
const displayArea = computed(() => Math.round(squareAreaKm2(props.halfSideKm)));
</script>

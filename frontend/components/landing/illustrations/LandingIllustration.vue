<template>
  <div
    class="relative h-full w-full overflow-hidden"
    :class="rootClass"
    role="img"
    :aria-label="ariaLabel"
  >
    <!-- Confirmation : RDV accepté → SMS + email -->
    <template v-if="variant === 'confirmation'">
      <div
        class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_20%,rgb(28_199_181/0.14),transparent)]"
        aria-hidden="true"
      />

      <div class="flex h-full min-h-[220px] items-center justify-center p-5 sm:p-6">
        <div class="relative w-full max-w-[300px]">
          <!-- Demande → acceptée -->
          <div class="mb-3 flex items-center justify-center gap-2">
            <div
              class="flex items-center gap-2 rounded-full border border-[#E8E8F0] bg-white/90 px-3 py-1.5 shadow-sm dark:border-gray-700 dark:bg-gray-800/90"
            >
              <UIcon name="i-lucide-calendar-clock" class="h-3.5 w-3.5 text-primary-500" />
              <span class="text-[10px] font-semibold text-[#3D3D52] dark:text-gray-300">RDV demandé</span>
            </div>
            <UIcon name="i-lucide-arrow-right" class="h-4 w-4 text-primary-400" />
            <div
              class="flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1.5 text-white shadow-md shadow-emerald-500/25"
            >
              <UIcon name="i-lucide-check" class="h-3.5 w-3.5" />
              <span class="text-[10px] font-bold">Accepté</span>
            </div>
          </div>

          <!-- Téléphone patient -->
          <div
            class="mx-auto w-[min(100%,248px)] rounded-[1.75rem] bg-[#1a1f2e] p-2 shadow-xl shadow-primary-500/15 ring-1 ring-black/10"
          >
            <div class="rounded-[1.35rem] bg-gradient-to-b from-[#f8fafc] to-white p-3 dark:from-gray-900 dark:to-gray-950">
              <div class="mb-3 flex items-center justify-between px-0.5">
                <span class="text-[9px] font-medium text-[#64748b]">09:41</span>
                <span class="text-[9px] font-bold tracking-wide text-[#0A0A0F] dark:text-white">Cary</span>
              </div>

              <!-- Notification principale -->
              <div
                class="mb-2 overflow-hidden rounded-2xl border border-primary-200/80 bg-white shadow-sm dark:border-primary-500/25 dark:bg-gray-900"
              >
                <div class="bg-gradient-to-r from-primary-500 to-primary-600 px-3 py-2">
                  <div class="flex items-center gap-2">
                    <div
                      class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 text-white"
                    >
                      <UIcon name="i-lucide-calendar-check" class="h-4 w-4" />
                    </div>
                    <div class="min-w-0">
                      <p class="text-[10px] font-bold leading-tight text-white">Rendez-vous confirmé</p>
                      <p class="text-[9px] text-white/80">Demain · 9h – 11h</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Canaux -->
              <div class="grid grid-cols-2 gap-2">
                <div
                  class="flex items-center gap-2 rounded-xl border border-[#E8E8F0] bg-white px-2.5 py-2 dark:border-gray-700 dark:bg-gray-800"
                >
                  <div
                    class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15"
                  >
                    <UIcon name="i-lucide-smartphone" class="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p class="text-[8px] font-bold uppercase tracking-wide text-[#64748b]">SMS</p>
                    <p class="text-[9px] font-semibold text-[#0A0A0F] dark:text-white">Envoyé</p>
                  </div>
                </div>
                <div
                  class="flex items-center gap-2 rounded-xl border border-[#E8E8F0] bg-white px-2.5 py-2 dark:border-gray-700 dark:bg-gray-800"
                >
                  <div
                    class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/15"
                  >
                    <UIcon name="i-lucide-mail" class="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p class="text-[8px] font-bold uppercase tracking-wide text-[#64748b]">Email</p>
                    <p class="text-[9px] font-semibold text-[#0A0A0F] dark:text-white">Envoyé</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Pro qui accepte (discret) -->
          <div
            class="absolute -left-1 top-[38%] hidden w-[88px] rounded-xl border border-[#E8E8F0] bg-white/95 p-2 shadow-md sm:block dark:border-gray-700 dark:bg-gray-800/95"
          >
            <div class="mb-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-500/20">
              <UIcon name="i-lucide-user-round" class="h-4 w-4 text-primary-600" />
            </div>
            <p class="text-[8px] font-bold text-[#0A0A0F] dark:text-white">Pro qualifié</p>
            <p class="text-[8px] text-emerald-600 dark:text-emerald-400">Disponible</p>
          </div>
        </div>
      </div>
    </template>

    <!-- Soins à domicile : écran RDV dans l'app -->
    <template v-else-if="variant === 'home-care'">
      <div
        class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_30%_75%,rgb(28_199_181/0.14),transparent)]"
        aria-hidden="true"
      />

      <div class="flex h-full min-h-[220px] items-center justify-center p-5 sm:p-6">
        <div class="relative w-full max-w-[300px]">
          <!-- Téléphone : intervention à domicile -->
          <div
            class="mx-auto w-[min(100%,248px)] rounded-[1.75rem] bg-[#1a1f2e] p-2 shadow-xl shadow-primary-500/15 ring-1 ring-black/10"
          >
            <div class="rounded-[1.35rem] bg-gradient-to-b from-[#f8fafc] to-white p-3 dark:from-gray-900 dark:to-gray-950">
              <div class="mb-3 flex items-center justify-between px-0.5">
                <span class="text-[9px] font-medium text-[#64748b]">09:41</span>
                <span class="text-[9px] font-bold tracking-wide text-[#0A0A0F] dark:text-white">Cary</span>
              </div>

              <div
                class="mb-2 overflow-hidden rounded-2xl border border-primary-200/80 bg-white shadow-sm dark:border-primary-500/25 dark:bg-gray-900"
              >
                <div class="bg-gradient-to-r from-primary-500 to-primary-600 px-3 py-2">
                  <div class="flex items-center gap-2">
                    <div
                      class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 text-white"
                    >
                      <UIcon name="i-lucide-house" class="h-4 w-4" />
                    </div>
                    <div class="min-w-0">
                      <p class="text-[10px] font-bold leading-tight text-white">Intervention à domicile</p>
                      <p class="text-[9px] text-white/80">Aujourd'hui · 9h – 11h</p>
                    </div>
                  </div>
                </div>

                <div class="space-y-2 px-3 py-2.5">
                  <div class="flex items-center gap-2">
                    <div
                      class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-500/20"
                    >
                      <UIcon name="i-lucide-user-round" class="h-3.5 w-3.5 text-primary-600" />
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="text-[9px] font-bold text-[#0A0A0F] dark:text-white">Pro assigné</p>
                      <p class="text-[8px] text-[#64748b]">9h – 11h</p>
                    </div>
                    <UIcon name="i-lucide-navigation" class="h-3.5 w-3.5 text-primary-500" />
                  </div>

                  <div class="flex items-center gap-2 rounded-xl bg-[#F7F7FB] px-2.5 py-2 dark:bg-gray-800">
                    <UIcon name="i-lucide-briefcase-medical" class="h-3.5 w-3.5 shrink-0 text-sky-600" />
                    <UIcon name="i-lucide-shield-check" class="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    <div class="h-3 w-px bg-[#E8E8F0] dark:bg-gray-600" aria-hidden="true" />
                    <div class="flex gap-1">
                      <span class="h-1.5 w-1.5 rounded-full bg-primary-400" />
                      <span class="h-1.5 w-6 rounded-full bg-primary-300/80" />
                      <span class="h-1.5 w-4 rounded-full bg-primary-200/80" />
                    </div>
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-3 gap-1.5">
                <div
                  class="flex flex-col items-center gap-1 rounded-xl border border-[#E8E8F0] bg-white px-1.5 py-2 dark:border-gray-700 dark:bg-gray-800"
                >
                  <UIcon name="i-lucide-clock" class="h-3.5 w-3.5 text-primary-500" />
                  <span class="text-[7px] font-bold text-[#0A0A0F] dark:text-white">9h–11h</span>
                </div>
                <div
                  class="flex flex-col items-center gap-1 rounded-xl border border-[#E8E8F0] bg-white px-1.5 py-2 dark:border-gray-700 dark:bg-gray-800"
                >
                  <UIcon name="i-lucide-map-pin" class="h-3.5 w-3.5 text-primary-500" />
                  <span class="text-[7px] font-bold text-[#0A0A0F] dark:text-white">Chez vous</span>
                </div>
                <div
                  class="flex flex-col items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-1.5 py-2 dark:border-emerald-500/30 dark:bg-emerald-500/10"
                >
                  <UIcon name="i-lucide-check" class="h-3.5 w-3.5 text-emerald-600" />
                  <span class="text-[7px] font-bold text-emerald-700 dark:text-emerald-300">Confirmé</span>
                </div>
              </div>
            </div>
          </div>

          <div
            class="absolute -right-1 top-[40%] hidden w-[84px] rounded-xl border border-[#E8E8F0] bg-white/95 p-2 shadow-md sm:block dark:border-gray-700 dark:bg-gray-800/95"
          >
            <div class="mb-1 flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 dark:bg-sky-500/15">
              <UIcon name="i-lucide-briefcase-medical" class="h-3.5 w-3.5 text-sky-600" />
            </div>
            <p class="text-[8px] font-bold text-[#0A0A0F] dark:text-white">Matériel</p>
            <p class="text-[8px] text-sky-600 dark:text-sky-400">prêt</p>
          </div>
        </div>
      </div>
    </template>

    <!-- Réseau plateforme -->
    <template v-else-if="variant === 'platform-network'">
      <div
        class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgb(28_199_181/0.12),transparent_65%)]"
        aria-hidden="true"
      />

      <div
        class="absolute left-1/2 top-1/2 z-10 flex h-[4.5rem] w-[4.5rem] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-cyan-500 shadow-lg shadow-primary-500/30 ring-4 ring-white dark:ring-gray-900"
      >
        <span class="text-sm font-extrabold tracking-tight text-white">Cary</span>
      </div>

      <div
        v-for="node in networkNodes"
        :key="node.label"
        class="absolute flex flex-col items-center gap-1.5"
        :class="node.position"
      >
        <div
          class="absolute left-1/2 top-1/2 z-0 h-px w-[min(28vw,110px)] origin-left -translate-y-1/2 bg-gradient-to-r from-primary-400/70 to-primary-400/10"
          :class="node.line"
          aria-hidden="true"
        />
        <div
          class="relative z-[1] flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-md ring-2 dark:bg-gray-800"
          :class="node.ring"
        >
          <UIcon :name="node.icon" class="h-6 w-6" :class="node.iconClass" />
        </div>
        <span
          class="relative z-[1] rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-[#3D3D52] shadow-sm dark:bg-gray-900/90 dark:text-gray-200"
        >
          {{ node.label }}
        </span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
type Variant = 'confirmation' | 'home-care' | 'platform-network';

const props = withDefaults(
  defineProps<{
    variant: Variant;
    ariaLabel?: string;
  }>(),
  {
    ariaLabel: '',
  },
);

const rootClass = computed(() => {
  if (props.variant === 'platform-network') {
    return 'min-h-[220px] bg-gradient-to-b from-primary-50 to-[#F4FAFA] dark:from-gray-900 dark:to-gray-950';
  }
  return 'min-h-[200px] bg-gradient-to-br from-primary-50 via-white to-[#F4FAFA] dark:from-gray-900 dark:via-gray-900 dark:to-gray-950';
});

const ariaLabel = computed(() => {
  if (props.ariaLabel) return props.ariaLabel;
  const labels: Record<Variant, string> = {
    confirmation: 'Confirmation de rendez-vous par SMS et email',
    'home-care': 'Soins infirmiers à domicile par un professionnel Cary',
    'platform-network': 'Réseau Cary : infirmiers, laboratoires, médecins et patients',
  };
  return labels[props.variant];
});

const networkNodes = [
  {
    label: 'Infirmiers',
    icon: 'i-lucide-syringe',
    iconClass: 'text-primary-600',
    ring: 'ring-primary-400',
    position: 'left-[8%] top-[12%]',
    line: 'rotate-[35deg]',
  },
  {
    label: 'Laboratoires',
    icon: 'i-lucide-flask-conical',
    iconClass: 'text-sky-600',
    ring: 'ring-sky-400',
    position: 'right-[8%] top-[12%]',
    line: 'rotate-[145deg]',
  },
  {
    label: 'Patients',
    icon: 'i-lucide-heart-pulse',
    iconClass: 'text-emerald-600',
    ring: 'ring-emerald-400',
    position: 'left-[8%] bottom-[10%]',
    line: '-rotate-[35deg]',
  },
  {
    label: 'Médecins',
    icon: 'i-lucide-stethoscope',
    iconClass: 'text-indigo-600',
    ring: 'ring-indigo-400',
    position: 'right-[8%] bottom-[10%]',
    line: '-rotate-[145deg]',
  },
] as const;
</script>

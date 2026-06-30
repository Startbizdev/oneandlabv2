<template>
  <div class="relative flex min-h-0 flex-1 flex-col overflow-hidden">
    <div
      class="flex h-full min-h-[200px] w-[200%] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none"
      :class="activeGroup ? '-translate-x-1/2' : 'translate-x-0'"
    >
      <!-- Panneau racine -->
      <div
        class="flex h-full w-1/2 shrink-0 flex-col gap-0.5 overflow-y-auto px-2 pb-4 pt-1"
        aria-label="Navigation"
      >
        <button
          v-for="g in groups"
          :key="g.id"
          type="button"
          class="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3.5 text-left text-[15px] font-semibold tracking-[-0.01em] text-[#0A0A0F] transition-colors hover:bg-[#F2F4FA] active:bg-[#E8ECF6] dark:text-white dark:hover:bg-gray-800 dark:active:bg-gray-800/90"
          @click="openGroup(g.id)"
        >
          <span>{{ g.label }}</span>
          <UIcon name="i-lucide-chevron-right" class="size-5 shrink-0 text-[#9090A8]" aria-hidden="true" />
        </button>

        <div class="my-2 h-px bg-[#E8E8F0] dark:bg-gray-800" />

        <NuxtLink
          to="/pour-les-professionnels"
          class="rounded-xl px-3 py-3.5 text-[15px] font-semibold tracking-[-0.01em] text-[#0A0A0F] transition-colors hover:bg-[#F2F4FA] dark:text-white dark:hover:bg-gray-800"
          @click="emit('navigate')"
        >
          Professionnel
        </NuxtLink>
        <NuxtLink
          to="/contact"
          class="rounded-xl px-3 py-3.5 text-[15px] font-semibold tracking-[-0.01em] text-[#0A0A0F] transition-colors hover:bg-[#F2F4FA] dark:text-white dark:hover:bg-gray-800"
          @click="emit('navigate')"
        >
          Contact
        </NuxtLink>

        <div class="my-2 h-px bg-[#E8E8F0] dark:bg-gray-800" />

        <UButton
          :to="appointmentUrl"
          color="primary"
          icon="i-lucide-calendar-plus"
          size="lg"
          block
          class="font-semibold"
          @click="emit('navigate')"
        >
          Prendre rendez-vous
        </UButton>

        <NuxtLink
          v-if="showLogin"
          :to="loginHref"
          class="mt-1 rounded-xl px-3 py-3 text-center text-[15px] font-medium text-[#3D3D52] transition-colors hover:bg-[#F2F4FA] dark:text-gray-300 dark:hover:bg-gray-800"
          @click="emit('navigate')"
        >
          Se connecter
        </NuxtLink>
      </div>

      <!-- Sous-menu -->
      <div
        class="flex h-full w-1/2 shrink-0 flex-col overflow-hidden border-l border-[#E8E8F0] bg-[#FAFBFD] dark:border-gray-800 dark:bg-gray-950/80"
      >
        <div class="shrink-0 border-b border-[#E8E8F0] px-2 py-2 dark:border-gray-800">
          <button
            type="button"
            class="flex w-full items-center gap-2 rounded-xl px-2 py-2.5 text-left text-[15px] font-semibold text-[#0A0A0F] transition-colors hover:bg-white/80 dark:text-white dark:hover:bg-gray-800/80"
            @click="activeGroup = null"
          >
            <UIcon name="i-lucide-chevron-left" class="size-5 shrink-0 text-primary-500" aria-hidden="true" />
            Retour
          </button>
          <p v-if="activeGroupLabel" class="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#9090A8] dark:text-gray-500">
            {{ activeGroupLabel }}
          </p>
        </div>
        <nav class="min-h-0 flex-1 overflow-y-auto px-2 pb-4 pt-1" :aria-label="activeGroupLabel || 'Sous-menu'">
          <NuxtLink
            v-for="item in activeLinks"
            :key="item.to"
            :to="item.to"
            class="block rounded-xl px-3 py-3.5 text-[15px] font-medium text-[#0A0A0F] transition-colors hover:bg-white dark:text-gray-100 dark:hover:bg-gray-800"
            :class="
              route.path === item.to
                ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300'
                : ''
            "
            @click="emit('navigate')"
          >
            {{ item.label }}
          </NuxtLink>
        </nav>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface MarketingMobileDrillLink {
  label: string;
  to: string;
}

const props = defineProps<{
  patientLinks: MarketingMobileDrillLink[];
  nurseLinks: MarketingMobileDrillLink[];
  labLinks: MarketingMobileDrillLink[];
  appointmentUrl: string;
  loginHref: string;
  showLogin: boolean;
}>();

const emit = defineEmits<{
  navigate: [];
}>();

const route = useRoute();

const groups = [
  { id: 'patient' as const, label: 'Patient' },
  { id: 'nurse' as const, label: 'Infirmiers' },
  { id: 'lab' as const, label: 'Laboratoire' },
];

const activeGroup = ref<null | 'patient' | 'nurse' | 'lab'>(null);

const activeGroupLabel = computed(() => {
  if (activeGroup.value === 'patient') return 'Patient';
  if (activeGroup.value === 'nurse') return 'Infirmiers';
  if (activeGroup.value === 'lab') return 'Laboratoire';
  return '';
});

const activeLinks = computed(() => {
  if (activeGroup.value === 'patient') return props.patientLinks;
  if (activeGroup.value === 'nurse') return props.nurseLinks;
  if (activeGroup.value === 'lab') return props.labLinks;
  return [];
});

function openGroup(id: 'patient' | 'nurse' | 'lab') {
  activeGroup.value = id;
}
</script>

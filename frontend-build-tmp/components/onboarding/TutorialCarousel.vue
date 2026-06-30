<script setup lang="ts">
import { getTutorialConfig, type TutorialRole } from '@oneandlab/onboarding'
import { ROLE_HOME_PATHS } from '~/utils/postLoginRedirect'
import { setOnboardingCompleted } from '~/utils/onboarding-storage'

const props = defineProps<{
  role: TutorialRole
}>()

const route = useRoute()
const router = useRouter()

const isReplay = computed(() => route.query.replay === '1' || route.query.replay === 'true')
const config = computed(() => getTutorialConfig(props.role, { showPrescriptions: true }))
const slides = computed(() => config.value?.slides ?? [])
const index = ref(0)
const lastIndex = computed(() => Math.max(0, slides.value.length - 1))
const isLast = computed(() => index.value >= lastIndex.value)

function finish() {
  if (!isReplay.value) {
    setOnboardingCompleted(props.role, true)
  }
  router.replace(ROLE_HOME_PATHS[props.role] || '/patient')
}

function goNext() {
  if (isLast.value) {
    finish()
    return
  }
  index.value = Math.min(index.value + 1, lastIndex.value)
}

function goPrev() {
  if (index.value <= 0) return
  index.value -= 1
}

const currentSlide = computed(() => slides.value[index.value])
</script>

<template>
  <div
    v-if="config && slides.length"
    class="relative flex min-h-screen flex-col bg-gradient-to-b from-primary-50 via-app-canvas to-app-canvas"
  >
    <div class="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
      <header class="flex shrink-0 items-center justify-between py-3">
        <span class="text-sm font-bold tracking-wide text-primary-800">{{ config.welcomeTitle }}</span>
        <button
          type="button"
          class="text-sm font-semibold text-slate-500 transition-colors hover:text-slate-800"
          @click="finish"
        >
          Passer
        </button>
      </header>

      <div class="flex min-h-0 flex-1 flex-col items-center justify-center py-4">
        <Transition name="fade-slide" mode="out-in">
          <div
            v-if="currentSlide"
            :key="currentSlide.id"
            class="flex w-full max-w-md flex-col items-center justify-center gap-5"
          >
            <OnboardingTutorialIllustration :illustration="currentSlide.illustration" />
            <div class="w-full space-y-2 px-1 text-center">
              <h2 class="text-xl font-bold tracking-tight text-slate-900">{{ currentSlide.title }}</h2>
              <p class="text-base leading-relaxed text-slate-500">{{ currentSlide.body }}</p>
            </div>
          </div>
        </Transition>
      </div>

      <footer class="shrink-0 space-y-4 pb-2">
        <div class="flex items-center justify-center gap-1.5">
          <span
            v-for="(slide, dotIndex) in slides"
            :key="slide.id"
            class="h-2 rounded-full transition-all duration-300"
            :class="dotIndex === index ? 'w-6 bg-primary-600' : 'w-2 bg-slate-300'"
          />
        </div>

        <div class="flex gap-3">
          <UButton
            v-if="index > 0"
            label="Précédent"
            color="neutral"
            variant="outline"
            block
            class="flex-1"
            @click="goPrev"
          />
          <UButton
            :label="isLast ? 'Commencer' : 'Suivant'"
            color="primary"
            block
            size="lg"
            class="flex-1"
            @click="goNext"
          />
        </div>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}
.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(12px);
}
.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-12px);
}
</style>

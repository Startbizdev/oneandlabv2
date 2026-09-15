<script setup lang="ts">
import { getTutorialConfig, type TutorialRole } from '@oneandlab/onboarding'
import { ROLE_HOME_PATHS } from '~/utils/postLoginRedirect'
import { setOnboardingCompleted } from '~/utils/onboarding-storage'
import {
  clearPendingNurseShareLink,
  pendingNurseShareDemandesPath,
} from '~/utils/nurse-share-pending'

const props = defineProps<{
  role: TutorialRole
}>()

const route = useRoute()
const router = useRouter()
useSeoMeta({ title: 'Bienvenue · Cary', robots: 'noindex, nofollow' })

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
  const pendingShare = props.role === 'nurse' ? pendingNurseShareDemandesPath() : null
  if (pendingShare) {
    clearPendingNurseShareLink()
    router.replace(pendingShare)
    return
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
    class="relative flex min-h-dvh flex-col bg-app-canvas"
  >
    <div class="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
      <header class="flex shrink-0 items-center justify-between py-3">
        <img src="/images/logo-cary.png" alt="Cary" class="h-9 w-auto max-w-28 object-contain" />
        <button
          type="button"
          class="min-h-11 rounded-xl px-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-white hover:text-slate-900"
          @click="finish"
        >
          Passer
        </button>
      </header>

      <main aria-label="Découvrir votre espace" class="flex min-h-0 flex-1 flex-col items-center justify-center py-4">
          <div
            v-if="currentSlide"
            class="flex w-full max-w-md flex-col items-center justify-center gap-5"
          >
            <TutorialIllustration aria-hidden="true" :illustration="currentSlide.illustration" />
            <div aria-live="polite" aria-atomic="true" class="w-full space-y-2 px-1 text-center">
              <h1 class="text-2xl font-bold tracking-tight text-slate-900">{{ currentSlide.title }}</h1>
              <p class="text-base leading-relaxed text-slate-500">{{ currentSlide.body }}</p>
            </div>
          </div>
      </main>

      <footer class="shrink-0 space-y-4 pb-2">
        <p class="text-center text-sm text-slate-500" role="status">Étape {{ index + 1 }} sur {{ slides.length }}</p>
        <div aria-hidden="true" class="flex items-center justify-center gap-1.5">
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
  <div
    v-else
    class="flex min-h-screen flex-col items-center justify-center gap-4 bg-app-canvas px-6 text-center"
  >
    <p class="text-sm text-slate-600">Impossible d’afficher le tutoriel.</p>
    <UButton label="Continuer" color="primary" @click="finish" />
  </div>
</template>

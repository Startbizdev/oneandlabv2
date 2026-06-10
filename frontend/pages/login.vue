<template>
  <div
    class="flex min-h-screen flex-col bg-app-canvas dark:bg-gray-950 px-4 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-6 sm:pb-12 sm:pt-10"
  >
    <div class="mx-auto flex w-full max-w-[380px] flex-1 flex-col justify-center">
      <!-- Logo + lien discret -->
      <div class="mb-8 flex flex-col items-center gap-4">
        <NuxtLink to="/" class="transition-opacity hover:opacity-90" aria-label="Cary — Accueil">
          <img
            src="/images/logo-cary.png"
            alt="Cary"
            class="h-7 w-auto max-w-[120px] object-contain sm:h-8 sm:max-w-[132px] dark:opacity-95"
            loading="eager"
          />
        </NuxtLink>
        <NuxtLink
          to="/"
          class="text-[11px] font-medium text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
        >
          ← Retour au site
        </NuxtLink>
      </div>

      <!-- Carte -->
      <div
        class="rounded-xl border border-gray-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-gray-800 dark:bg-gray-950 dark:shadow-none"
      >
        <!-- En-tête compact -->
        <div class="border-b border-gray-100 px-5 pb-4 pt-5 dark:border-gray-800">
          <Transition name="fade-slide" mode="out-in">
            <div :key="step">
              <h1 class="text-[15px] font-semibold tracking-tight text-gray-900 dark:text-gray-100">
                {{ stepHeaderConfig.title }}
              </h1>
              <p
                v-if="stepHeaderConfig.subtitle"
                class="mt-1 text-[13px] leading-snug text-gray-500 dark:text-gray-400"
              >
                {{ stepHeaderConfig.subtitle }}
              </p>
            </div>
          </Transition>
        </div>

        <div class="px-5 py-5">
          <div
            v-if="step === 'email' || step === 'otp'"
            class="mb-4 flex rounded-lg border border-gray-200/90 bg-gray-50 p-0.5 dark:border-gray-800 dark:bg-gray-900/50"
            role="tablist"
          >
            <button
              type="button"
              role="tab"
              :aria-selected="loginMode === 'code'"
              class="flex-1 rounded-md px-2 py-2 text-[12px] font-medium transition-colors"
              :class="
                loginMode === 'code'
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-950 dark:text-gray-100'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'
              "
              @click="loginMode = 'code'"
            >
              Code par email
            </button>
            <button
              type="button"
              role="tab"
              :aria-selected="loginMode === 'password'"
              class="flex-1 rounded-md px-2 py-2 text-[12px] font-medium transition-colors"
              :class="
                loginMode === 'password'
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-950 dark:text-gray-100'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'
              "
              @click="loginMode = 'password'"
            >
              Mot de passe
            </button>
          </div>

          <Transition name="fade-slide" mode="out-in">
            <!-- Email (code) ou login password -->
            <form
              v-if="step === 'email' && loginMode === 'password'"
              key="password-login"
              class="space-y-4"
              @submit.prevent="onPasswordLogin"
            >
              <UFormField label="Email" name="email">
                <UInput v-model="email" type="email" autocomplete="email" class="w-full" :disabled="loading" />
              </UFormField>
              <UFormField label="Mot de passe" name="password">
                <UInput
                  v-model="password"
                  type="password"
                  autocomplete="current-password"
                  class="w-full"
                  :disabled="loading"
                />
              </UFormField>
              <div
                v-if="noPasswordHint"
                class="rounded-lg border border-primary-200/80 bg-primary-50/80 px-3 py-2.5 text-[12px] leading-snug text-primary-900 dark:border-primary-900/40 dark:bg-primary-950/30 dark:text-primary-100"
              >
                Aucun mot de passe sur ce compte.
                <button type="button" class="font-semibold underline" @click="loginMode = 'code'">
                  Utiliser le code par email
                </button>
                ou créez-en un depuis Mon profil après connexion.
              </div>
              <UButton type="submit" block :loading="loading" :disabled="!email.trim() || !password">
                Se connecter
              </UButton>
              <NuxtLink
                to="/forgot-password"
                class="block text-center text-[12px] font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
              >
                Mot de passe oublié ?
              </NuxtLink>
            </form>

            <form v-else-if="step === 'email'" key="email" class="space-y-4" @submit.prevent="onCheckEmail">
              <UFormField label="Email" name="email" class="[&_[data-slot=label]]:text-xs [&_[data-slot=label]]:font-medium [&_[data-slot=label]]:text-gray-600 dark:[&_[data-slot=label]]:text-gray-400">
                <UInput
                  v-model="email"
                  type="email"
                  placeholder="vous@exemple.fr"
                  size="md"
                  class="w-full"
                  :disabled="loading"
                  autofocus
                  autocomplete="email"
                  variant="outline"
                />
              </UFormField>

              <UButton
                type="submit"
                block
                size="md"
                :loading="loading"
                :disabled="!email.trim()"
                class="font-medium"
              >
                Continuer
              </UButton>
            </form>

            <!-- Choix rôle -->
            <div v-else-if="step === 'role-select'" key="role-select" class="space-y-2">
              <p class="sr-only">Choix du type de compte pour l'inscription</p>
              <button
                v-for="option in roleOptions"
                :key="option.role"
                type="button"
                :title="option.description"
                :disabled="loading"
                class="flex w-full items-center gap-3 rounded-lg border border-gray-200/90 bg-white px-3 py-2.5 text-left transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-800 dark:bg-gray-950 dark:hover:border-gray-700 dark:hover:bg-gray-900/50"
                @click="onRoleSelect(option.role)"
              >
                <span
                  class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                  aria-hidden="true"
                >
                  <UIcon :name="option.icon" class="h-4 w-4" />
                </span>
                <span class="min-w-0 flex-1 text-[13px] font-medium text-gray-900 dark:text-gray-100">{{
                  option.label
                }}</span>
                <UIcon name="i-lucide-chevron-right" class="h-4 w-4 shrink-0 text-gray-400" />
              </button>

              <button
                type="button"
                class="mt-4 w-full py-2 text-center text-[12px] font-medium text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                @click="goBackToEmail"
              >
                Modifier l’email
              </button>
            </div>

            <!-- OTP -->
            <form v-else-if="step === 'otp'" key="otp" class="space-y-5" @submit.prevent="onVerifyOTP">
              <p class="text-center text-[12px] text-gray-500 dark:text-gray-400">
                Envoyé à
                <span class="font-medium text-gray-800 dark:text-gray-200">{{ email }}</span>
              </p>
              <div
                v-if="devOtp"
                class="rounded-md border border-dashed border-emerald-200 bg-emerald-50/80 px-3 py-2 text-center font-mono text-sm font-medium text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200"
              >
                Dev · {{ devOtp }}
              </div>

              <UFormField name="otp" class="[&_[data-slot=label]]:sr-only" label="Code">
                <div class="flex justify-center">
                  <UPinInput
                    v-model="otpDigits"
                    type="number"
                    :length="6"
                    :disabled="otpLoading"
                    otp
                    size="lg"
                  />
                </div>
              </UFormField>

              <UButton
                type="submit"
                block
                size="md"
                :loading="otpLoading"
                :disabled="otpString.length !== 6"
                class="font-medium"
              >
                Valider
              </UButton>

              <div class="flex items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  :disabled="loading || otpLoading"
                  class="text-[12px] font-medium text-gray-500 transition-colors hover:text-gray-800 disabled:opacity-50 dark:text-gray-400 dark:hover:text-gray-200"
                  @click="goBackToEmail"
                >
                  Autre email
                </button>
                <button
                  type="button"
                  :disabled="countdown > 0 || resending"
                  class="text-[12px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                  :class="
                    countdown > 0
                      ? 'text-gray-400 dark:text-gray-500'
                      : 'text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300'
                  "
                  @click="resendOTP"
                >
                  {{
                    resending ? 'Envoi…' : countdown > 0 ? `Renvoyer (${formatCountdown})` : 'Renvoyer le code'
                  }}
                </button>
              </div>
            </form>
          </Transition>
        </div>
      </div>

      <p class="mt-8 text-center text-[11px] text-gray-400 dark:text-gray-500">
        © {{ new Date().getFullYear() }} Cary
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { apiFetch } from '~/utils/api'
import { resolvePostLoginPath } from '~/utils/postLoginRedirect'

definePageMeta({
  layout: false,
})

const { login, loginWithPassword, verifyOTP, isAuthenticated, user } = useAuth()
const router = useRouter()
const route = useRoute()
const toast = useAppToast()

function redirectIfAuthenticated() {
  if (!isAuthenticated.value || !user.value) return
  const target = resolvePostLoginPath(route.query.returnTo, user.value.role)
  router.replace(target)
}

watch(
  [isAuthenticated, () => user.value],
  () => {
    if (isAuthenticated.value && user.value) redirectIfAuthenticated()
  },
  { immediate: true },
)

// -- State --
type LoginMode = 'code' | 'password'
const loginMode = ref<LoginMode>((route.query.mode as LoginMode) || 'code')
const password = ref('')
const noPasswordHint = ref(false)
type Step = 'email' | 'role-select' | 'otp'
const step = ref<Step>('email')
const email = ref('')
const loading = ref(false)
const otpLoading = ref(false)
const resending = ref(false)
const userId = ref('')
const sessionId = ref('')
const otpDigits = ref<string[]>([])
const devOtp = ref('') // OTP affiché en dev (fourni par le backend)
const countdown = ref(0)

const otpString = computed(() => {
  if (!otpDigits.value || !Array.isArray(otpDigits.value)) return ''
  return otpDigits.value.map((x) => (x === undefined || x === null ? '' : String(x))).join('')
})

const formatCountdown = computed(() => {
  const minutes = Math.floor(countdown.value / 60)
  const seconds = countdown.value % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
})

// -- Role options --
const roleOptions = [
  {
    role: 'patient',
    label: 'Patient',
    description: 'Prendre rendez-vous pour des soins à domicile',
    icon: 'i-lucide-user',
  },
  {
    role: 'nurse',
    label: 'Infirmier · Infirmière',
    description: 'Professionnel de santé infirmier',
    icon: 'i-lucide-heart-pulse',
  },
  {
    role: 'lab',
    label: 'Laboratoire',
    description: 'Laboratoire d’analyses médicales',
    icon: 'i-lucide-building-2',
  },
  {
    role: 'pro',
    label: 'Autre professionnel de santé',
    description: 'Médecin, kinésithérapeute, etc.',
    icon: 'i-lucide-stethoscope',
  },
]

// -- Header config par step --
const stepHeaderConfig = computed(() => {
  switch (step.value) {
    case 'email':
      return {
        title: 'Connexion',
        subtitle:
          loginMode.value === 'password'
            ? 'Entrez votre mot de passe Cary'
            : 'Recevez un code sécurisé par email',
      }
    case 'role-select':
      return {
        title: 'Créer un compte',
        subtitle: 'Choisissez votre espace.',
      }
    case 'otp':
      return {
        title: 'Vérification',
        subtitle: '',
      }
    default:
      return {
        title: 'Connexion',
        subtitle: '',
      }
  }
})

// -- Countdown --
let countdownInterval: ReturnType<typeof setInterval> | null = null

function startCountdown(seconds: number = 300) {
  if (countdownInterval) clearInterval(countdownInterval)
  countdown.value = seconds
  countdownInterval = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(countdownInterval!)
      countdownInterval = null
    }
  }, 1000)
}

onUnmounted(() => {
  if (countdownInterval) clearInterval(countdownInterval)
})

function redirectAfterLogin(mustChangePassword?: boolean) {
  if (mustChangePassword) {
    router.replace('/profile?changePassword=1')
    return
  }
  const target = resolvePostLoginPath(route.query.returnTo, user.value?.role)
  router.replace(target)
}

async function onPasswordLogin() {
  const trimmed = email.value.trim()
  if (!trimmed || !password.value) return
  loading.value = true
  noPasswordHint.value = false
  try {
    const check = await apiFetch('/auth/check-email', { method: 'POST', body: { email: trimmed } })
    if (check.success && check.exists && check.has_password === false) {
      noPasswordHint.value = true
      return
    }
    const result = await loginWithPassword(trimmed, password.value)
    if (result.success) {
      await nextTick()
      redirectAfterLogin(result.mustChangePassword)
    } else {
      toast.add({ title: 'Connexion impossible', description: result.error, color: 'red' })
    }
  } catch (err: any) {
    toast.add({ title: 'Erreur', description: err.message, color: 'red' })
  } finally {
    loading.value = false
  }
}

// -- Step 1: Check email --
async function onCheckEmail() {
  const trimmed = email.value.trim()
  if (!trimmed) return

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(trimmed)) {
    toast.add({ title: 'Email invalide', description: 'Veuillez entrer une adresse email valide', color: 'red' })
    return
  }

  loading.value = true
  email.value = trimmed

  try {
    const result = await apiFetch('/auth/check-email', {
      method: 'POST',
      body: { email: trimmed },
    })

    // OTP uniquement si le backend confirme explicitement que le compte existe
    if (result.success && result.exists === true) {
      await sendOTP()
    } else {
      // Compte introuvable ou réponse ambiguë → proposer inscription (patient / labo / infirmier / pro)
      step.value = 'role-select'
    }
  } catch (err: any) {
    toast.add({ title: 'Erreur', description: err.message || 'Erreur lors de la vérification', color: 'red' })
  } finally {
    loading.value = false
  }
}

// -- Envoyer OTP (pour utilisateurs existants) --
async function sendOTP() {
  try {
    const result = await login(email.value)
    if (result.success && result.userId) {
      userId.value = result.userId
      sessionId.value = result.sessionId || ''
      devOtp.value = result.otp || ''
      otpDigits.value = []
      step.value = 'otp'
      startCountdown()
      toast.add({ title: 'Code envoyé', description: result.otp ? `Code: ${result.otp}` : 'Vérifiez votre boîte de réception', color: 'green' })
    } else {
      toast.add({ title: 'Erreur', description: result.error || "Impossible d'envoyer le code", color: 'red' })
    }
  } catch (err: any) {
    toast.add({ title: 'Erreur', description: err.message || "Erreur lors de l'envoi du code", color: 'red' })
  }
}

// -- Role selection --
async function onRoleSelect(role: string) {
  if (role === 'patient') {
    // Rediriger vers la page d'inscription patient (email, date de naissance, etc.) puis OTP
    await navigateTo({ path: '/patient/register', query: { email: email.value } })
  } else {
    // Rediriger vers la page d'inscription du rôle
    const registerRoutes: Record<string, string> = {
      nurse: '/nurse/register',
      lab: '/lab/register',
      pro: '/pro/register',
    }
    await navigateTo({ path: registerRoutes[role] || '/login', query: { email: email.value } })
  }
}

// -- Verify OTP --
async function onVerifyOTP() {
  const cleaned = otpString.value.replace(/[^0-9]/g, '').trim()
  if (cleaned.length !== 6) {
    toast.add({ title: 'Code incomplet', description: 'Veuillez entrer les 6 chiffres', color: 'red' })
    return
  }

  otpLoading.value = true
  try {
    const result = await verifyOTP(userId.value, cleaned, sessionId.value)
    if (result.success) {
      await nextTick()
      redirectAfterLogin(user.value?.must_change_password)
    } else {
      toast.add({ title: 'Code invalide', description: result.error || 'Le code saisi est incorrect', color: 'red' })
      otpDigits.value = []
    }
  } catch (err: any) {
    toast.add({ title: 'Erreur', description: err.message || 'Erreur lors de la vérification', color: 'red' })
    otpDigits.value = []
  } finally {
    otpLoading.value = false
  }
}

// -- Resend OTP --
async function resendOTP() {
  if (countdown.value > 0 || resending.value) return
  resending.value = true
  try {
    const result = await login(email.value)
    if (result.success && result.userId) {
      userId.value = result.userId
      sessionId.value = result.sessionId || ''
      devOtp.value = result.otp || ''
      otpDigits.value = []
      startCountdown()
      toast.add({ title: 'Code renvoyé', description: result.otp ? `Code: ${result.otp}` : 'Un nouveau code a été envoyé', color: 'green' })
    } else {
      toast.add({ title: 'Erreur', description: result.error || "Erreur lors de l'envoi", color: 'red' })
    }
  } catch (err: any) {
    toast.add({ title: 'Erreur', description: err.message || "Erreur lors de l'envoi", color: 'red' })
  } finally {
    resending.value = false
  }
}

// -- Navigation --
function goBackToEmail() {
  step.value = 'email'
  otpDigits.value = []
  devOtp.value = ''
  countdown.value = 0
  if (countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }
}
</script>

<style scoped>
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50/60 via-white to-blue-50/40 p-4">
    <!-- Background decorative elements -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-40 -right-40 w-80 h-80 bg-primary-100/30 rounded-full blur-3xl" />
      <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-100/30 rounded-full blur-3xl" />
    </div>

    <div class="w-full max-w-md relative z-10">
      <!-- Logo -->
      <div class="flex justify-center mb-8">
        <NuxtLink to="/" class="inline-block">
          <img
            src="/images/onelogo.png"
            alt="OneAndLab"
            class="h-10 object-contain"
            loading="eager"
          />
        </NuxtLink>
      </div>

      <!-- Card principale -->
      <div class="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
        <!-- Header -->
        <div class="px-8 pt-8 pb-4 text-center">
          <div
            class="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5 transition-all duration-500"
            :class="stepHeaderConfig.bgClass"
          >
            <Transition name="icon-swap" mode="out-in">
              <UIcon
                :key="stepHeaderConfig.icon"
                :name="stepHeaderConfig.icon"
                class="w-7 h-7 text-white"
              />
            </Transition>
          </div>
          <Transition name="fade-slide" mode="out-in">
            <div :key="step">
              <h1 class="text-2xl font-normal text-gray-900">
                {{ stepHeaderConfig.title }}
              </h1>
              <p class="text-sm text-gray-500 mt-2 leading-relaxed">
                {{ stepHeaderConfig.subtitle }}
              </p>
            </div>
          </Transition>
        </div>

        <!-- Body -->
        <div class="px-8 pb-8">
          <Transition name="fade-slide" mode="out-in">
            <!-- STEP 1: Email -->
            <form v-if="step === 'email'" key="email" @submit.prevent="onCheckEmail" class="space-y-5">
              <UFormField label="Adresse email" name="email">
                <UInput
                  v-model="email"
                  type="email"
                  placeholder="votre@email.com"
                  size="xl"
                  class="w-full"
                  :disabled="loading"
                  autofocus
                  autocomplete="email"
                >
                  <template #leading>
                    <UIcon name="i-lucide-mail" class="w-5 h-5 text-gray-400" />
                  </template>
                </UInput>
              </UFormField>

              <UButton
                type="submit"
                block
                size="xl"
                :loading="loading"
                :disabled="!email.trim()"
                class="w-full font-medium"
              >
                Continuer
                <template #trailing>
                  <UIcon name="i-lucide-arrow-right" class="w-4 h-4" />
                </template>
              </UButton>
            </form>

            <!-- STEP 2: Choix du rôle (compte introuvable) -->
            <div v-else-if="step === 'role-select'" key="role-select" class="space-y-5">
              <p class="text-sm font-medium text-gray-700">Je m'inscris en tant que :</p>

              <div class="grid grid-cols-1 gap-3">
                <button
                  v-for="option in roleOptions"
                  :key="option.role"
                  type="button"
                  @click="onRoleSelect(option.role)"
                  :disabled="loading"
                  class="group relative flex items-center gap-4 p-4 rounded-xl border-2 border-gray-100 bg-white hover:border-primary-300 hover:bg-primary-50/30 transition-all duration-200 text-left focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 active:scale-[0.98]"
                >
                  <div
                    class="flex items-center justify-center w-12 h-12 rounded-xl transition-colors duration-200"
                    :class="option.bgClass"
                  >
                    <UIcon :name="option.icon" class="w-6 h-6 text-white" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-normal text-gray-900 text-sm">{{ option.label }}</p>
                    <p class="text-xs text-gray-500 mt-0.5">{{ option.description }}</p>
                  </div>
                  <UIcon
                    name="i-lucide-chevron-right"
                    class="w-5 h-5 text-gray-300 group-hover:text-primary-500 transition-colors shrink-0"
                  />
                </button>
              </div>

              <button
                type="button"
                @click="goBackToEmail"
                class="w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors py-2"
              >
                <UIcon name="i-lucide-arrow-left" class="w-4 h-4" />
                Modifier l'email
              </button>
            </div>

            <!-- STEP 3: Création patient (auto-create + OTP envoyé) -->
            <!-- On redirige directement vers l'OTP step après création -->

            <!-- STEP OTP: Code de vérification -->
            <form v-else-if="step === 'otp'" key="otp" @submit.prevent="onVerifyOTP" class="space-y-5">
              <div class="bg-primary-50/50 border border-primary-100 rounded-xl p-4 text-center">
                <p class="text-sm text-primary-700">Code envoyé à</p>
                <p class="font-normal text-primary-900 mt-1">{{ email }}</p>
              </div>

              <UFormField name="otp">
                <div class="flex justify-center">
                  <UPinInput
                    v-model="otpDigits"
                    :length="6"
                    :disabled="otpLoading"
                    otp
                    size="xl"
                  />
                </div>
              </UFormField>

              <UButton
                type="submit"
                block
                size="xl"
                :loading="otpLoading"
                :disabled="otpString.length !== 6"
                class="w-full font-medium"
              >
                <UIcon name="i-lucide-shield-check" class="w-5 h-5 mr-2" />
                Valider le code
              </UButton>

              <!-- Actions secondaires -->
              <div class="flex items-center justify-between pt-1">
                <button
                  type="button"
                  :disabled="loading || otpLoading"
                  @click="goBackToEmail"
                  class="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <UIcon name="i-lucide-arrow-left" class="w-4 h-4" />
                  Modifier l'email
                </button>

                <button
                  type="button"
                  :disabled="countdown > 0 || resending"
                  @click="resendOTP"
                  class="flex items-center gap-1.5 text-sm transition-colors"
                  :class="countdown > 0 ? 'text-gray-400 cursor-not-allowed' : 'text-primary-600 hover:text-primary-700'"
                >
                  <UIcon
                    name="i-lucide-refresh-cw"
                    class="w-4 h-4"
                    :class="{ 'animate-spin': resending }"
                  />
                  {{ resending ? 'Envoi...' : countdown > 0 ? `Renvoyer (${formatCountdown})` : 'Renvoyer le code' }}
                </button>
              </div>
            </form>
          </Transition>
        </div>
      </div>

      <!-- Footer -->
      <p class="text-center text-xs text-gray-400 mt-6">
        &copy; {{ new Date().getFullYear() }} OneAndLab. Tous droits réservés.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { apiFetch } from '~/utils/api'

definePageMeta({
  layout: false,
})

const { login, verifyOTP, isAuthenticated, user } = useAuth()
const router = useRouter()
const route = useRoute()
const toast = useAppToast()

// -- Redirect si déjà connecté --
const roleRoutes: Record<string, string> = {
  super_admin: '/admin',
  admin: '/admin',
  lab: '/lab',
  subaccount: '/subaccount',
  nurse: '/nurse/appointments',
  preleveur: '/preleveur',
  pro: '/pro',
  patient: '/patient',
}

watch(isAuthenticated, (auth) => {
  if (auth && user.value) {
    router.push(roleRoutes[user.value.role] || '/patient')
  }
}, { immediate: true })

onMounted(() => {
  if (isAuthenticated.value && user.value) {
    router.push(roleRoutes[user.value.role] || '/patient')
  }
})

// -- State --
type Step = 'email' | 'role-select' | 'otp'
const step = ref<Step>('email')
const email = ref('')
const loading = ref(false)
const otpLoading = ref(false)
const resending = ref(false)
const userId = ref('')
const sessionId = ref('')
const otpDigits = ref<string[]>([])
const countdown = ref(0)

const otpString = computed(() => {
  if (!otpDigits.value || !Array.isArray(otpDigits.value)) return ''
  return otpDigits.value.join('')
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
    description: 'Je souhaite prendre rendez-vous pour des soins',
    icon: 'i-lucide-user',
    bgClass: 'bg-primary-500',
  },
  {
    role: 'nurse',
    label: 'Infirmier / Infirmière',
    description: 'Je suis professionnel de santé infirmier',
    icon: 'i-lucide-heart-pulse',
    bgClass: 'bg-emerald-500',
  },
  {
    role: 'lab',
    label: 'Laboratoire',
    description: 'Je représente un laboratoire d\'analyses',
    icon: 'i-lucide-building-2',
    bgClass: 'bg-blue-500',
  },
  {
    role: 'pro',
    label: 'Professionnel de santé',
    description: 'Médecin, kinésithérapeute, autre professionnel',
    icon: 'i-lucide-stethoscope',
    bgClass: 'bg-amber-500',
  },
]

// -- Header config par step --
const stepHeaderConfig = computed(() => {
  switch (step.value) {
    case 'email':
      return {
        icon: 'i-lucide-log-in',
        title: 'Connexion ou inscription',
        subtitle: 'Entrez votre email. Si un compte existe, vous recevrez un code. Sinon, vous pourrez créer un compte.',
        bgClass: 'bg-primary-500',
      }
    case 'role-select':
      return {
        icon: 'i-lucide-user-plus',
        title: 'Aucun compte avec cet email',
        subtitle: 'Choisissez votre profil pour accéder au formulaire d’inscription adapté.',
        bgClass: 'bg-amber-500',
      }
    case 'otp':
      return {
        icon: 'i-lucide-shield-check',
        title: 'Code de vérification',
        subtitle: 'Saisissez le code à 6 chiffres envoyé à votre adresse pour finaliser la connexion.',
        bgClass: 'bg-emerald-500',
      }
    default:
      return {
        icon: 'i-lucide-log-in',
        title: 'Connexion ou inscription',
        subtitle: '',
        bgClass: 'bg-primary-500',
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
      otpDigits.value = []
      step.value = 'otp'
      startCountdown()
      toast.add({ title: 'Code envoyé', description: 'Vérifiez votre boîte de réception', color: 'green' })
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
      toast.add({ title: 'Connexion réussie', description: 'Redirection en cours...', color: 'green' })
      const returnTo = route.query.returnTo as string
      setTimeout(() => {
        if (returnTo) {
          router.push(returnTo)
        } else {
          const userRole = result.user?.role || 'patient'
          router.push(roleRoutes[userRole] || '/patient')
        }
      }, 500)
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
      otpDigits.value = []
      startCountdown()
      toast.add({ title: 'Code renvoyé', description: 'Un nouveau code a été envoyé', color: 'green' })
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
  transition: all 0.3s ease;
}
.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(12px);
}
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}

.icon-swap-enter-active,
.icon-swap-leave-active {
  transition: all 0.25s ease;
}
.icon-swap-enter-from {
  opacity: 0;
  transform: scale(0.8);
}
.icon-swap-leave-to {
  opacity: 0;
  transform: scale(0.8);
}
</style>

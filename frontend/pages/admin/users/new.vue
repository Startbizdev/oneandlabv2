<template>
  <div class="max-w-4xl mx-auto py-10 px-4 sm:px-6">
    <!-- Header -->
    <div class="mb-8 flex items-center justify-between">
      <div>
        <div class="flex items-center gap-2 text-sm text-zinc-500 mb-2">
          <NuxtLink to="/admin/users" class="hover:text-zinc-800 transition-colors">Utilisateurs</NuxtLink>
          <span>/</span>
          <span class="text-zinc-800 font-medium">Créer un utilisateur</span>
        </div>
        <h1 class="text-3xl font-semibold text-zinc-900 tracking-tight">Nouvel utilisateur</h1>
        <p class="text-zinc-500 mt-1">Configurez les accès et le profil du collaborateur ou client.</p>
      </div>
      <NuxtLink
        to="/admin/users"
        class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
      >
        <UIcon name="i-lucide-arrow-left" class="w-4 h-4" />
        Retour
      </NuxtLink>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <!-- Sidebar info -->
      <div class="space-y-4">
        <div class="p-4 bg-zinc-50 rounded-xl border border-zinc-200/60">
          <h3 class="text-sm font-medium text-zinc-900 flex items-center gap-2">
            <UIcon name="i-lucide-info" class="w-4 h-4 text-zinc-500 shrink-0" />
            Rôles & Permissions
          </h3>
          <p class="text-xs text-zinc-500 mt-2 leading-relaxed">
            Le rôle définit les accès aux menus. Les infirmiers et laboratoires peuvent configurer leurs types de soins.
          </p>
        </div>
      </div>

      <!-- Formulaire -->
      <div class="md:col-span-2">
        <div class="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
          <form @submit.prevent="submit" class="p-6 sm:p-8 space-y-8">
            <!-- Informations générales -->
            <div class="space-y-4">
              <h2 class="text-sm font-bold uppercase tracking-wider text-zinc-400">Informations générales</h2>

              <div>
                <label class="block text-sm font-medium text-zinc-700 mb-1.5">
                  Rôle de l'utilisateur <span class="text-red-500">*</span>
                </label>
                <select
                  v-model="form.role"
                  required
                  class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                >
                  <option value="" disabled>Sélectionner un rôle...</option>
                  <option v-for="opt in roleOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
              </div>

              <div v-if="isEntityRole" class="animate-in fade-in duration-300">
                <label class="block text-sm font-medium text-zinc-700 mb-1.5">
                  Nom de l'entité (Laboratoire / Société) <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="form.company_name"
                  type="text"
                  required
                  placeholder="ex: Laboratoire Central"
                  class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                />
              </div>

              <div v-else class="grid grid-cols-2 gap-4 animate-in fade-in duration-300">
                <div>
                  <label class="block text-sm font-medium text-zinc-700 mb-1.5">
                    Prénom <span class="text-red-500">*</span>
                  </label>
                  <input
                    v-model="form.first_name"
                    type="text"
                    required
                    placeholder="Jean"
                    class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-zinc-700 mb-1.5">
                    Nom <span class="text-red-500">*</span>
                  </label>
                  <input
                    v-model="form.last_name"
                    type="text"
                    required
                    placeholder="Dupont"
                    class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                  />
                </div>
              </div>
            </div>

            <!-- Contact & Accès -->
            <div class="space-y-4 pt-4 border-t border-zinc-100">
              <h2 class="text-sm font-bold uppercase tracking-wider text-zinc-400">Contact & Accès</h2>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-zinc-700 mb-1.5">
                    Email professionnel <span class="text-red-500">*</span>
                  </label>
                  <div class="relative">
                    <UIcon name="i-lucide-mail" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                    <input
                      v-model="form.email"
                      type="email"
                      required
                      placeholder="email@exemple.fr"
                      class="w-full rounded-lg border border-zinc-300 bg-white pl-10 pr-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                    />
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-zinc-700 mb-1.5">Téléphone</label>
                  <div class="relative">
                    <UIcon name="i-lucide-phone" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                    <input
                      v-model="form.phone"
                      type="tel"
                      placeholder="+33 6..."
                      class="w-full rounded-lg border border-zinc-300 bg-white pl-10 pr-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Adresse (patient, pro, infirmier) + complément pour patient -->
            <div v-if="showAddressBlock" class="space-y-4 pt-4 border-t border-zinc-100">
              <h2 class="text-sm font-bold uppercase tracking-wider text-zinc-400">Adresse</h2>
              <AddressSelector
                v-model="form.address"
                label="Adresse"
                :show-complement="roleStr === 'patient'"
                :complement-value="form.address_complement"
                @update:complement="form.address_complement = $event"
              />
            </div>

            <!-- Professionnel santé : profession + Adeli -->
            <div v-if="roleStr === 'pro'" class="space-y-4 pt-4 border-t border-zinc-100">
              <h2 class="text-sm font-bold uppercase tracking-wider text-zinc-400">Profession</h2>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-zinc-700 mb-1.5">Profession (emploi)</label>
                  <select
                    v-model="form.emploi"
                    class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Sélectionner une profession...</option>
                    <option v-for="item in proEmploiOptions" :key="item.value" :value="item.value">
                      {{ item.label }}
                    </option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-zinc-700 mb-1.5">Numéro ADELI</label>
                  <div class="relative">
                    <UIcon name="i-lucide-id-card" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                    <input
                      v-model="form.adeli"
                      type="text"
                      placeholder="123456789"
                      class="w-full rounded-lg border border-zinc-300 bg-white pl-10 pr-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Laboratoire rattachement -->
            <div v-if="roleStr === 'subaccount' || roleStr === 'preleveur'" class="space-y-4 pt-4 border-t border-zinc-100">
              <div>
                <label class="block text-sm font-medium text-zinc-700 mb-1.5">Laboratoire de rattachement</label>
                <div class="relative">
                  <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                  <input
                    v-model="labSearchQuery"
                    type="text"
                    placeholder="Chercher un laboratoire parent..."
                    autocomplete="off"
                    class="w-full rounded-lg border border-zinc-300 bg-white pl-10 pr-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                  />
                  <div
                    v-if="labSearchQuery.length >= 1"
                    class="absolute z-20 w-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-xl max-h-48 overflow-y-auto"
                  >
                    <button
                      v-for="lab in filteredLabs"
                      :key="lab.id"
                      type="button"
                      class="w-full px-4 py-2.5 text-left hover:bg-zinc-50 flex items-center justify-between border-b border-zinc-50 last:border-0 text-sm font-medium text-zinc-700"
                      @click="selectLab(lab)"
                    >
                      <span class="truncate">{{ lab.company_name || lab.email }}</span>
                      <UIcon v-if="form.lab_id === lab.id" name="i-lucide-check" class="w-4 h-4 text-zinc-600 shrink-0" />
                    </button>
                    <p v-if="filteredLabs.length === 0" class="px-4 py-3 text-xs text-zinc-400 italic text-center">
                      Aucun laboratoire trouvé
                    </p>
                  </div>
                </div>
                <div
                  v-if="form.lab_id && selectedLabLabel"
                  class="mt-2 flex items-center gap-2 px-2 py-1 bg-zinc-100 rounded text-xs text-zinc-600 w-fit"
                >
                  <UIcon name="i-lucide-building" class="w-3 h-3 shrink-0" />
                  Sélectionné : {{ selectedLabLabel }}
                </div>
              </div>
            </div>

            <!-- Expertise & Soins -->
            <div v-if="roleStr === 'nurse' || roleStr === 'lab'" class="space-y-4 pt-4 border-t border-zinc-100">
              <h2 class="text-sm font-bold uppercase tracking-wider text-zinc-400">Expertise & Soins</h2>

              <div v-if="roleStr === 'nurse'">
                <label class="block text-sm font-medium text-zinc-700 mb-1.5">Numéro ADELI</label>
                <div class="relative">
                  <UIcon name="i-lucide-id-card" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                  <input
                    v-model="form.adeli"
                    type="text"
                    placeholder="139012345"
                    class="w-full rounded-lg border border-zinc-300 bg-white pl-10 pr-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                  />
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-zinc-700 mb-1.5">Types de soins proposés</label>
                <div class="border border-zinc-200 rounded-xl overflow-hidden bg-zinc-50/30 shadow-inner">
                  <div class="relative border-b border-zinc-200 bg-white p-1">
                    <UIcon name="i-lucide-filter" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                    <input
                      v-model="careTypesSearch"
                      type="text"
                      placeholder="Filtrer les soins..."
                      class="w-full pl-10 pr-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 border-0 focus:ring-0 focus:outline-none bg-transparent"
                    />
                  </div>
                  <div class="max-h-56 overflow-y-auto p-1 divide-y divide-zinc-100">
                    <label
                      v-for="cat in filteredCareCategories"
                      :key="cat.id"
                      class="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-white rounded-md transition-colors cursor-pointer group"
                    >
                      <span class="text-sm text-zinc-600 group-hover:text-zinc-900">{{ cat.name }}</span>
                      <button
                        type="button"
                        role="switch"
                        :aria-checked="!!(carePreferencesMap[cat.id] ?? false)"
                        :class="[
                          'relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                          carePreferencesMap[cat.id] ?? false ? 'bg-primary' : 'bg-zinc-200',
                        ]"
                        @click="carePreferencesMap[cat.id] = !(carePreferencesMap[cat.id] ?? false)"
                      >
                        <span
                          :class="[
                            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition',
                            carePreferencesMap[cat.id] ?? false ? 'translate-x-5' : 'translate-x-1',
                          ]"
                        />
                      </button>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center justify-end gap-3 pt-6 border-t border-zinc-100">
              <NuxtLink
                to="/admin/users"
                class="inline-flex items-center px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                Annuler
              </NuxtLink>
              <button
                type="submit"
                :disabled="!canSubmit || saving"
                class="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-primary rounded-lg shadow-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none transition-colors"
              >
                <UIcon v-if="saving" name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
                {{ saving ? 'Création...' : 'Finaliser la création' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { apiFetch } from '~/utils/api'
import { PRO_SANTE_EMPLOIS } from '~/constants/proEmploi'

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: ['super_admin'],
})

const toast = useAppToast()

const proEmploiOptions = [...PRO_SANTE_EMPLOIS]

const form = reactive({
  role: 'patient',
  email: '',
  first_name: '',
  last_name: '',
  company_name: '',
  phone: '',
  adeli: '',
  emploi: '' as string,
  lab_id: '',
  address: null as { label: string; lat?: number; lng?: number; street?: string; city?: string; postcode?: string } | null,
  address_complement: '' as string,
})

const saving = ref(false)
const labSearchQuery = ref('')
const labs = ref<any[]>([])
const careCategories = ref<any[]>([])
const carePreferencesMap = ref<Record<string, boolean>>({})
const careTypesSearch = ref('')

const roleOptions = [
  { label: 'Patient', value: 'patient' },
  { label: 'Professionnel Santé', value: 'pro' },
  { label: 'Infirmier', value: 'nurse' },
  { label: 'Laboratoire', value: 'lab' },
  { label: 'Sous-compte Laboratoire', value: 'subaccount' },
  { label: 'Préleveur', value: 'preleveur' },
  { label: 'Super Admin', value: 'super_admin' },
]

const roleStr = computed(() => {
  if (!form.role) return ''
  return typeof form.role === 'string' ? form.role : (form.role as any).value
})

const isEntityRole = computed(() => roleStr.value === 'lab' || roleStr.value === 'subaccount')

const showAddressBlock = computed(() =>
  ['patient', 'pro', 'nurse'].includes(roleStr.value)
)

const canSubmit = computed(() => {
  const hasEmail = !!form.email?.trim()
  const hasRole = !!roleStr.value
  if (!hasEmail || !hasRole) return false
  if (isEntityRole.value) return !!form.company_name?.trim()
  return !!form.first_name?.trim() && !!form.last_name?.trim()
})

const filteredLabs = computed(() => {
  const q = labSearchQuery.value.toLowerCase().trim()
  if (!q) return labs.value.slice(0, 20)
  return labs.value
    .filter(
      (l) =>
        l.company_name?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q)
    )
    .slice(0, 20)
})

const selectedLabLabel = computed(() => {
  if (!form.lab_id) return ''
  const lab = labs.value.find((l) => l.id === form.lab_id)
  return lab ? (lab.company_name || lab.email) : ''
})

const filteredCareCategories = computed(() => {
  const q = careTypesSearch.value.toLowerCase().trim()
  if (!q) return careCategories.value
  return careCategories.value.filter((c) => c.name?.toLowerCase().includes(q))
})

function selectLab(lab: any) {
  form.lab_id = lab.id
  labSearchQuery.value = lab.company_name || lab.email || ''
}

async function loadDependencies() {
  try {
    const [labsRes, catsRes] = await Promise.all([
      apiFetch('/users?role=lab&limit=200', { method: 'GET' }),
      apiFetch('/categories?include_inactive=true', { method: 'GET' }),
    ])
    if (labsRes?.success && Array.isArray(labsRes.data)) labs.value = labsRes.data
    if (catsRes?.success && Array.isArray(catsRes.data)) {
      careCategories.value = catsRes.data
      const initialMap: Record<string, boolean> = {}
      catsRes.data.forEach((c: any) => {
        if (c?.id) initialMap[c.id] = true
      })
      carePreferencesMap.value = initialMap
    }
  } catch (e) {
    console.error('Erreur chargement:', e)
  }
}

async function submit() {
  if (!canSubmit.value) return
  saving.value = true
  try {
    const currentRole = roleStr.value
    const isEntity = isEntityRole.value
    const body: any = {
      email: form.email.trim(),
      first_name: isEntity ? '' : form.first_name.trim(),
      last_name: isEntity ? form.company_name.trim() : form.last_name.trim(),
      role: currentRole,
      phone: form.phone?.trim() || undefined,
    }
    if (isEntity) body.company_name = form.company_name.trim()
    if ((currentRole === 'subaccount' || currentRole === 'preleveur') && form.lab_id) body.lab_id = form.lab_id

    const response = await apiFetch('/users', { method: 'POST', body })
    if (!response?.success) {
      throw new Error((response as any)?.error || 'Erreur lors de la création')
    }

    const newUserId = (response as any)?.data?.id
    if (newUserId) {
      const updates = []
      const updateBody: Record<string, unknown> = {}
      if (currentRole === 'nurse' && form.adeli?.trim()) updateBody.adeli = form.adeli.trim()
      if (currentRole === 'pro') {
        if (form.adeli?.trim()) updateBody.adeli = form.adeli.trim()
        if (form.emploi?.trim()) updateBody.emploi = form.emploi.trim()
      }
      if (form.address && typeof form.address === 'object' && form.address.label?.trim()) {
        const addressPayload = {
          label: form.address.label.trim(),
          lat: form.address.lat,
          lng: form.address.lng,
        }
        if (currentRole === 'patient' && form.address_complement?.trim()) {
          (addressPayload as Record<string, unknown>).complement = form.address_complement.trim()
        }
        updateBody.address = addressPayload
      }
      if (Object.keys(updateBody).length > 0) {
        updates.push(apiFetch(`/users/${newUserId}`, { method: 'PUT', body: updateBody }))
      }
      const carePrefs = carePreferencesMap.value != null && typeof carePreferencesMap.value === 'object' ? carePreferencesMap.value : {}
      const hasPrefs = Object.keys(carePrefs).length > 0
      if ((currentRole === 'lab' || currentRole === 'nurse') && hasPrefs) {
        const prefs = Object.entries(carePrefs)
          .filter(([id]) => id !== 'undefined')
          .map(([category_id, is_enabled]) => ({ category_id, is_enabled }))
        const endpoint = currentRole === 'lab' ? 'lab-category-preferences' : 'nurse-category-preferences'
        updates.push(
          apiFetch(`/users/${newUserId}/${endpoint}`, { method: 'PUT', body: { preferences: prefs } })
        )
      }
      if (updates.length > 0) await Promise.all(updates)
    }

    toast.add({ title: 'Utilisateur créé avec succès', color: 'green', icon: 'i-lucide-check-circle' })
    await navigateTo('/admin/users')
  } catch (err: any) {
    toast.add({
      title: 'Erreur',
      description: err?.message || 'Une erreur est survenue.',
      color: 'red',
    })
  } finally {
    saving.value = false
  }
}

onMounted(loadDependencies)
</script>

<style scoped>
::-webkit-scrollbar {
  width: 4px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #e4e4e7;
  border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
  background: #d4d4d8;
}
</style>

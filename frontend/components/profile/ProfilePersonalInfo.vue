<template>
  <UCard>
    <template #header>
      <CardHeader
        icon="i-lucide-user"
        title="Informations personnelles"
        description="Vos coordonnées et informations de contact"
      />
    </template>

    <UForm
      :state="form"
      @submit="handleSubmit"
      class="space-y-6"
    >
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormInput
          v-if="isLabOrSubaccount"
          v-model="form.name"
          label="Nom du laboratoire / Raison sociale"
          name="name"
          placeholder="Laboratoire Dupont"
          :required="true"
        />

        <FormInput
          v-model="form.first_name"
          label="Prénom"
          name="first_name"
          placeholder="Votre prénom"
          :required="true"
        />

        <FormInput
          v-model="form.last_name"
          label="Nom"
          name="last_name"
          placeholder="Votre nom"
          :required="true"
        />

        <UFormField label="Email" name="email" :required="!emailReadonly">
          <UInput
            v-model="form.email"
            type="email"
            size="xl"
            class="w-full"
            :class="emailReadonly ? 'bg-gray-50 dark:bg-gray-900' : ''"
            :readonly="emailReadonly"
            :placeholder="emailReadonly ? undefined : 'email@exemple.fr'"
          >
            <template v-if="emailReadonly" #trailing>
              <UIcon name="i-lucide-lock" class="w-5 h-5 text-gray-400" />
            </template>
          </UInput>
          <template v-if="emailReadonly" #hint>
            <span class="text-xs text-gray-500 dark:text-gray-400">
              L'email ne peut pas être modifié
            </span>
          </template>
        </UFormField>

        <FormInput
          v-model="form.phone"
          label="Téléphone"
          name="phone"
          type="tel"
          placeholder="+33 6 XX XX XX XX"
        />

        <FormInput
          v-if="isNurse"
          v-model="form.rpps"
          label="RPPS"
          name="rpps"
          placeholder="Numéro RPPS"
        />

        <UFormField v-if="isPro" label="Profession (emploi)" name="emploi" class="w-full">
          <USelectMenu
            v-model="form.emploi"
            :items="proEmploiItems"
            value-key="value"
            placeholder="Rechercher votre profession..."
            size="xl"
            class="w-full"
            searchable
            by="value"
          >
            <template #label>
              <span v-if="form.emploi">{{ form.emploi }}</span>
              <span v-else class="text-gray-400">Rechercher votre profession...</span>
            </template>
          </USelectMenu>
        </UFormField>

        <FormInput
          v-if="isPro"
          v-model="form.adeli"
          label="Numéro Adeli"
          name="adeli"
          placeholder="123456789"
        />

        <FormInput
          v-if="isLabOrSubaccount"
          v-model="form.siret"
          label="SIRET"
          name="siret"
          placeholder="123 456 789 00012"
        />
      </div>

      <UFormField
        v-if="isPatient"
        label="Date de naissance"
        name="birth_date"
      >
        <BirthdayPicker v-model="form.birth_date" />
      </UFormField>

      <UFormField
        v-if="isPatient"
        label="Genre"
        name="gender"
      >
        <USelect
          v-model="form.gender"
          :items="GENDER_OPTIONS"
          placeholder="Sélectionner votre genre (optionnel)"
          size="xl"
          class="w-full"
        />
      </UFormField>

      <AddressSelector
        v-model="form.address"
        label="Adresse"
        placeholder="Commencez à taper votre adresse..."
        :show-complement="isPatient"
        :complement-value="form.address_complement"
        @update:complement="form.address_complement = $event"
      />

      <div
        v-if="!noActions"
        class="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800"
      >
        <UButton
          variant="outline"
          color="neutral"
          size="lg"
          @click="$emit('reset')"
          :disabled="isSaving"
        >
          Annuler
        </UButton>
        <UButton
          type="submit"
          size="lg"
          :loading="isSaving"
          icon="i-lucide-check"
        >
          Enregistrer
        </UButton>
      </div>
    </UForm>
  </UCard>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import type { ProfileForm } from '~/types/profile'
import { GENDER_OPTIONS } from '~/types/profile'
import { PRO_SANTE_EMPLOIS } from '~/constants/proEmploi'

const proEmploiItems = [...PRO_SANTE_EMPLOIS]

interface Props {
  modelValue: ProfileForm
  role: string
  /** Si false, l'email est éditable (ex. création d'un préleveur par le lab). */
  emailReadonly?: boolean
  isSaving?: boolean
  /** Masquer les boutons Annuler / Enregistrer (sauvegarde globale en bas de page) */
  noActions?: boolean
}

interface Emits {
  (e: 'save', form: ProfileForm): void
  (e: 'reset'): void
}

const props = withDefaults(defineProps<Props>(), { emailReadonly: true })
const emit = defineEmits<Emits>()

const defaultForm = (): ProfileForm => ({
  first_name: '',
  last_name: '',
  email: '',
  phone: null,
  name: '',
  rpps: '',
  siret: '',
  adeli: '',
  emploi: null,
  birth_date: null,
  gender: null,
  address: null,
  address_complement: null,
})

const form = ref<ProfileForm>({
  ...defaultForm(),
  ...(props.modelValue && typeof props.modelValue === 'object' ? props.modelValue : {}),
})

watch(() => props.modelValue, (val) => {
  if (!val || typeof val !== 'object') return
  Object.assign(form.value, val)
}, { deep: true })

// Synchroniser les saisies vers le parent (v-model) pour que les computed côté parent soient à jour (ex. proCanSubmitCreatePatient)
watch(() => form.value, (val) => {
  if (!val || typeof val !== 'object') return
  emit('update:modelValue', { ...val })
}, { deep: true })

const isPatient = computed(() => props.role === 'patient')
const isNurse = computed(() => props.role === 'nurse')
const isPro = computed(() => props.role === 'pro')
const isLab = computed(() => props.role === 'lab')
const isLabOrSubaccount = computed(() => props.role === 'lab' || props.role === 'subaccount')

function handleSubmit() {
  emit('save', { ...form.value })
}

function getFormData(): ProfileForm {
  return { ...form.value }
}

defineExpose({ getFormData })
</script>

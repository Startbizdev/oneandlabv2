<script setup lang="ts">
const props = defineProps<{
  modelValue?: string | null
  placeholder?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

// Variables internes pour les selects
const birthDay = ref<number | null>(null)
const birthMonth = ref<number | null>(null)
const birthYear = ref<number | null>(null)

// Options pour la date de naissance
const currentYear = new Date().getFullYear()
const dayOptions = Array.from({length: 31}, (_, i) => ({ label: i + 1, value: i + 1 }))
const monthOptions = [
  { label: 'Janvier', value: 1 },
  { label: 'Février', value: 2 },
  { label: 'Mars', value: 3 },
  { label: 'Avril', value: 4 },
  { label: 'Mai', value: 5 },
  { label: 'Juin', value: 6 },
  { label: 'Juillet', value: 7 },
  { label: 'Août', value: 8 },
  { label: 'Septembre', value: 9 },
  { label: 'Octobre', value: 10 },
  { label: 'Novembre', value: 11 },
  { label: 'Décembre', value: 12 }
]
const yearOptions = Array.from({length: currentYear - 1950 + 1}, (_, i) => {
  const year = 1950 + i
  return { label: year, value: year }
})

// Initialiser depuis modelValue au montage
onMounted(() => {
  parseModelValue(props.modelValue)
})

// Parser la valeur initiale
const parseModelValue = (value: string | null | undefined) => {
  if (value) {
    const [year, month, day] = value.split('-')
    if (year && month && day) {
      birthYear.value = parseInt(year)
      birthMonth.value = parseInt(month)
      birthDay.value = parseInt(day)
    }
  }
}

// Mettre à jour modelValue quand les selects changent
const updateModelValue = () => {
  if (birthYear.value && birthMonth.value && birthDay.value) {
    const formattedDate = `${birthYear.value}-${String(birthMonth.value).padStart(2, '0')}-${String(birthDay.value).padStart(2, '0')}`
    emit('update:modelValue', formattedDate)
  } else {
    emit('update:modelValue', null)
  }
}

// Re-parser si modelValue change de l'extérieur (reset, etc.)
watch(() => props.modelValue, (newValue, oldValue) => {
  // Ne parser que si c'est un changement externe (ex: reset du formulaire)
  if (newValue !== oldValue && newValue !== getCurrentFormattedValue()) {
    parseModelValue(newValue)
  }
})

// Obtenir la valeur actuelle formatée pour comparaison
const getCurrentFormattedValue = () => {
  if (birthYear.value && birthMonth.value && birthDay.value) {
    return `${birthYear.value}-${String(birthMonth.value).padStart(2, '0')}-${String(birthDay.value).padStart(2, '0')}`
  }
  return null
}
</script>

<template>
  <div class="flex space-x-2">
    <USelect 
      v-model="birthDay" 
      :items="dayOptions" 
      placeholder="Jour"
      size="xl" 
      class="flex-1" 
      :disabled="disabled"
      @update:model-value="updateModelValue"
    />
    <USelect 
      v-model="birthMonth" 
      :items="monthOptions" 
      placeholder="Mois"
      size="xl" 
      class="flex-1" 
      :disabled="disabled"
      @update:model-value="updateModelValue"
    />
    <USelect 
      v-model="birthYear" 
      :items="yearOptions" 
      placeholder="Année"
      size="xl" 
      class="flex-1" 
      :disabled="disabled"
      @update:model-value="updateModelValue"
    />
  </div>
</template>

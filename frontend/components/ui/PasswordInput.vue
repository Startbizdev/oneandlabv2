<template>
  <div class="relative w-full">
    <UInput
      v-model="model"
      :type="visible ? 'text' : 'password'"
      :autocomplete="autocomplete"
      :placeholder="placeholder"
      :disabled="disabled"
      class="w-full"
      :ui="{ trailing: 'pe-10' }"
    />
    <button
      type="button"
      class="absolute inset-y-0 end-2 flex items-center text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
      :aria-label="visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
      tabindex="-1"
      @click="visible = !visible"
    >
      <UIcon :name="visible ? 'i-lucide-eye-off' : 'i-lucide-eye'" class="h-4 w-4" />
    </button>
  </div>
</template>

<script setup lang="ts">
const model = defineModel<string>({ default: '' });

withDefaults(
  defineProps<{
    autocomplete?: string;
    placeholder?: string;
    disabled?: boolean;
  }>(),
  {
    autocomplete: 'current-password',
    placeholder: '',
    disabled: false,
  },
);

const visible = ref(false);
</script>

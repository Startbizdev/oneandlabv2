<template>
  <UFormField
    :label="label"
    :name="name"
    :required="required"
  >
    <UInput
      :model-value="modelValue"
      @update:model-value="$emit('update:modelValue', $event)"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      size="xl"
      class="w-full"
    >
      <template v-if="$slots.trailing" #trailing>
        <slot name="trailing" />
      </template>
      <template v-if="$slots.leading" #leading>
        <slot name="leading" />
      </template>
    </UInput>
    <template v-if="hint" #hint>
      <span class="text-xs text-gray-500 dark:text-gray-400">
        {{ hint }}
      </span>
    </template>
    <template v-if="error" #error>
      <span class="text-xs text-red-600">
        {{ error }}
      </span>
    </template>
  </UFormField>
</template>

<script setup lang="ts">
interface Props {
  modelValue: string | null
  label: string
  name: string
  type?: string
  placeholder?: string
  hint?: string
  error?: string
  required?: boolean
  disabled?: boolean
  readonly?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: string): void
}

withDefaults(defineProps<Props>(), {
  type: 'text',
  placeholder: '',
  required: false,
  disabled: false,
  readonly: false,
})

defineEmits<Emits>()
</script>
